from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Attendance, AttendanceLog, AttendanceClaim
from accounts.models import User
from notifications.utils import notify, push_refresh, push_refresh_role
import datetime

CHECKIN_DEADLINE_HOUR = 10
PAGE_SIZE = 10
MANAGE_ROLES = {'super_admin', 'hr', 'manager'}


def mark_absent_if_missed(today=None):
    if today is None:
        today = datetime.date.today()
    if datetime.datetime.now().time() < datetime.time(CHECKIN_DEADLINE_HOUR):
        return 0
    all_users = User.objects.all()
    marked = 0
    for user in all_users:
        record, created = Attendance.objects.get_or_create(
            user=user, date=today, defaults={'status': 'Absent'}
        )
        if not created and record.check_in_time is None and record.status != 'Absent':
            record.status = 'Absent'
            record.save()
            marked += 1
        elif created:
            marked += 1
    return marked


def logs_for_record(record):
    logs = AttendanceLog.objects.filter(user=record.user, date=record.date)
    return [{'action': l.action, 'time': str(l.time)} for l in logs]


def serialize(r):
    return {
        'id':        r.id,
        'date':      str(r.date),
        'check_in':  str(r.check_in_time) if r.check_in_time else None,
        'check_out': str(r.check_out_time) if r.check_out_time else None,
        'status':    r.status,
        'logs':      logs_for_record(r),
    }


# ── employee endpoints ────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def attendance_list(request):
    records = Attendance.objects.filter(user=request.user).order_by('-date')
    return Response([serialize(r) for r in records])


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def check_in(request):
    local_date = request.data.get('date')
    local_time = request.data.get('time')
    if not local_date or not local_time:
        return Response({'error': 'date and time are required'}, status=status.HTTP_400_BAD_REQUEST)

    record, _ = Attendance.objects.get_or_create(user=request.user, date=local_date)
    # Always update first check-in
    if record.check_in_time is None:
        record.check_in_time = local_time
    record.status = 'Present'
    record.save()

    # Log every check-in event
    AttendanceLog.objects.create(user=request.user, date=local_date, time=local_time, action='check_in')
    push_refresh_role('manager', 'attendance')
    push_refresh_role('hr', 'attendance')
    push_refresh_role('super_admin', 'attendance')
    return Response({'message': 'Checked in', 'time': local_time, 'date': local_date})


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def check_out(request):
    local_date = request.data.get('date')
    local_time = request.data.get('time')
    if not local_date or not local_time:
        return Response({'error': 'date and time are required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        record = Attendance.objects.get(user=request.user, date=local_date)
        # Always update to latest check-out
        record.check_out_time = local_time
        record.save()

        # Log every check-out event
        AttendanceLog.objects.create(user=request.user, date=local_date, time=local_time, action='check_out')
        push_refresh_role('manager', 'attendance')
        push_refresh_role('hr', 'attendance')
        push_refresh_role('super_admin', 'attendance')
        return Response({'message': 'Checked out', 'time': local_time})
    except Attendance.DoesNotExist:
        return Response({'error': 'Not checked in today'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def attendance_stats(request):
    mark_absent_if_missed()
    total_present = Attendance.objects.filter(user=request.user, status='Present').count()
    return Response({'present_days': total_present})


# ── manager endpoints ─────────────────────────────────────────────────────────

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def mark_absent(request):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    today = datetime.date.today()
    if request.user.role == 'super_admin':
        employees = User.objects.all()
    elif request.user.role == 'manager':
        employees = User.objects.filter(role='employee', department=request.user.department)
    else:  # hr
        employees = User.objects.filter(department=request.user.department)
    marked = []
    for emp in employees:
        record, created = Attendance.objects.get_or_create(
            user=emp, date=today, defaults={'status': 'Absent'}
        )
        if not created and record.check_in_time is None:
            record.status = 'Absent'
            record.save()
        if record.status == 'Absent':
            marked.append(f"{emp.first_name} {emp.last_name}".strip() or emp.username)
    return Response({'marked_absent': marked, 'count': len(marked), 'date': str(today)})


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_attendance(request):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    date_filter = request.query_params.get('date')
    records = Attendance.objects.select_related('user').order_by('-date', 'user__first_name')
    if date_filter:
        records = records.filter(date=date_filter)
    # Restrict manager/HR to their own department
    if request.user.role == 'manager':
        records = records.filter(user__department=request.user.department, user__role='employee')
    elif request.user.role == 'hr':
        records = records.filter(user__department=request.user.department)
    data = [{
        'id':        r.id,
        'employee':  f"{r.user.first_name} {r.user.last_name}".strip() or r.user.username,
        'email':     r.user.email,
        'department': r.user.department,
        'date':      str(r.date),
        'check_in':  str(r.check_in_time) if r.check_in_time else None,
        'check_out': str(r.check_out_time) if r.check_out_time else None,
        'status':    r.status,
        'logs':      logs_for_record(r),
    } for r in records]
    return Response(data)


# ── attendance claim ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def attendance_claim(request):
    if request.method == 'GET':
        claims = AttendanceClaim.objects.filter(user=request.user).order_by('-submitted_at')
        data = [{
            'id':             c.id,
            'date':           str(c.date),
            'check_in_time':  str(c.check_in_time) if c.check_in_time else None,
            'check_out_time': str(c.check_out_time) if c.check_out_time else None,
            'reason':         c.reason,
            'status':         c.status,
            'submitted_at':   str(c.submitted_at.date()),
        } for c in claims]
        return Response(data)

    date          = request.data.get('date', '').strip()
    check_in_time = request.data.get('check_in_time', '').strip()
    check_out_time = request.data.get('check_out_time', '').strip()
    reason        = request.data.get('reason', '').strip()

    if not date or not check_in_time or not reason:
        return Response({'error': 'Date, check-in time and reason are required'}, status=status.HTTP_400_BAD_REQUEST)
    if AttendanceClaim.objects.filter(user=request.user, date=date, status='Pending').exists():
        return Response({'error': 'A pending claim already exists for this date'}, status=status.HTTP_400_BAD_REQUEST)

    claim = AttendanceClaim.objects.create(
        user=request.user, date=date,
        check_in_time=check_in_time or None,
        check_out_time=check_out_time or None,
        reason=reason,
    )
    emp_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
    for mgr in User.objects.filter(role='manager'):
        notify(mgr, f'{emp_name} submitted an attendance claim for {date}')
        push_refresh(mgr, 'claims')
    push_refresh(request.user, 'claims')
    return Response({'message': 'Claim submitted', 'id': claim.id, 'status': claim.status}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_claims(request):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    claims = AttendanceClaim.objects.select_related('user').order_by('-submitted_at')
    if request.user.role == 'manager':
        claims = claims.filter(user__department=request.user.department, user__role='employee')
    elif request.user.role == 'hr':
        claims = claims.filter(user__department=request.user.department)
    data = [{
        'id':             c.id,
        'employee':       f"{c.user.first_name} {c.user.last_name}".strip() or c.user.username,
        'email':          c.user.email,
        'department':     c.user.department,
        'date':           str(c.date),
        'check_in_time':  str(c.check_in_time) if c.check_in_time else None,
        'check_out_time': str(c.check_out_time) if c.check_out_time else None,
        'reason':         c.reason,
        'status':         c.status,
        'submitted_at':   str(c.submitted_at.date()),
    } for c in claims]
    return Response(data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_claim_action(request, pk, action):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        claim = AttendanceClaim.objects.select_related('user').get(id=pk)
        if action == 'approve':
            claim.status = 'Approved'
            claim.save()
            record, _ = Attendance.objects.get_or_create(user=claim.user, date=claim.date)
            record.status = 'Present'
            if claim.check_in_time:
                record.check_in_time = claim.check_in_time
            if claim.check_out_time:
                record.check_out_time = claim.check_out_time
            record.save()
        elif action == 'reject':
            claim.status = 'Rejected'
            claim.save()
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        notify(claim.user, f'Your attendance claim for {claim.date} has been {claim.status.lower()}')
        push_refresh(claim.user, 'claims')
        for mgr in User.objects.filter(role='manager'):
            push_refresh(mgr, 'claims')
        return Response({'message': f'Claim {claim.status}', 'status': claim.status})
    except AttendanceClaim.DoesNotExist:
        return Response({'error': 'Claim not found'}, status=status.HTTP_404_NOT_FOUND)


# ── paginated transaction logs ────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def attendance_logs(request):
    """Employee: paginated list of their own attendance records + logs."""
    page = max(int(request.query_params.get('page', 1)), 1)
    date_from = request.query_params.get('date_from', '')
    date_to   = request.query_params.get('date_to', '')

    qs = Attendance.objects.filter(user=request.user).order_by('-date')
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    total   = qs.count()
    records = qs[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    data = [serialize(r) for r in records]
    return Response({'total': total, 'page': page, 'page_size': PAGE_SIZE, 'results': data})


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_attendance_logs(request):
    """Manager/HR/SuperAdmin: paginated attendance records for all or a specific employee."""
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    page       = max(int(request.query_params.get('page', 1)), 1)
    emp_id     = request.query_params.get('employee', '')
    date_from  = request.query_params.get('date_from', '')
    date_to    = request.query_params.get('date_to', '')
    status_f   = request.query_params.get('status', '')

    qs = Attendance.objects.select_related('user').order_by('-date', 'user__first_name')
    if request.user.role == 'manager':
        qs = qs.filter(user__department=request.user.department, user__role='employee')
    elif request.user.role == 'hr':
        qs = qs.filter(user__department=request.user.department)
    if emp_id:
        qs = qs.filter(user__id=emp_id)
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    if status_f:
        qs = qs.filter(status=status_f)

    total   = qs.count()
    records = qs[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    data = [{
        'id':        r.id,
        'employee':  f"{r.user.first_name} {r.user.last_name}".strip() or r.user.username,
        'email':     r.user.email,
        'department': r.user.department,
        'date':      str(r.date),
        'check_in':  str(r.check_in_time) if r.check_in_time else None,
        'check_out': str(r.check_out_time) if r.check_out_time else None,
        'status':    r.status,
        'logs':      logs_for_record(r),
    } for r in records]
    return Response({'total': total, 'page': page, 'page_size': PAGE_SIZE, 'results': data})
