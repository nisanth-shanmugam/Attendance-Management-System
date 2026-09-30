from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Leave, LeaveBalance, LeavePolicy, LEAVE_TYPES, LEAVE_ENTITLEMENT
from accounts.models import User
from notifications.utils import notify, push_refresh, push_refresh_role
import datetime

MANAGE_ROLES = {'super_admin', 'hr', 'manager'}


# ── helpers ──────────────────────────────────────────────────────────────────

def get_policy_entitlement(leave_type):
    """Return entitled days from LeavePolicy if set, else fall back to LEAVE_ENTITLEMENT."""
    try:
        return LeavePolicy.objects.get(leave_type=leave_type).entitled
    except LeavePolicy.DoesNotExist:
        return LEAVE_ENTITLEMENT.get(leave_type, 0)


def get_or_create_balance(user, leave_type):
    bal, created = LeaveBalance.objects.get_or_create(
        user=user, leave_type=leave_type,
        defaults={'entitled': get_policy_entitlement(leave_type), 'used': 0},
    )
    if not created:
        # Sync entitled with current policy
        policy_entitled = get_policy_entitlement(leave_type)
        if bal.entitled != policy_entitled:
            bal.entitled = policy_entitled
            bal.save(update_fields=['entitled'])
    return bal


def seed_balances(user):
    for code, _ in LEAVE_TYPES:
        get_or_create_balance(user, code)


def department_managers(department):
    return User.objects.filter(role='manager', department=department)


def balance_payload(bal):
    return {
        'leave_type':         bal.leave_type,
        'leave_type_display': bal.get_leave_type_display(),
        'entitled':           bal.entitled,
        'used':               bal.used,
        'remaining':          bal.remaining,  # None = unlimited
    }


def auto_reject_pending_leaves():
    now = datetime.datetime.now()
    if now.hour < 12:
        return 0
    deadline = now.date() + datetime.timedelta(days=1)
    pending = Leave.objects.filter(status='Pending', start_date__lte=deadline)
    count = pending.count()
    pending.update(status='Rejected')
    return count


def serialize_leave(l):
    return {
        'id':                 l.id,
        'employee':           f"{l.user.first_name} {l.user.last_name}".strip() or l.user.username,
        'email':              l.user.email,
        'department':         l.user.department,
        'leave_type':         l.leave_type,
        'leave_type_display': l.get_leave_type_display(),
        'start_date':         str(l.start_date),
        'end_date':           str(l.end_date),
        'days':               l.days,
        'reason':             l.reason,
        'status':             l.status,
    }


# ── employee endpoints ────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_list(request):
    auto_reject_pending_leaves()
    seed_balances(request.user)
    leaves = Leave.objects.filter(user=request.user).order_by('-start_date')
    data = [{'id': l.id, 'leave_type': l.leave_type, 'leave_type_display': l.get_leave_type_display(),
             'start_date': str(l.start_date), 'end_date': str(l.end_date),
             'days': l.days, 'reason': l.reason, 'status': l.status} for l in leaves]
    return Response(data)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_balances(request):
    seed_balances(request.user)
    balances = LeaveBalance.objects.filter(user=request.user)
    return Response([balance_payload(b) for b in balances])


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_apply(request):
    start_date  = request.data.get('start_date')
    end_date    = request.data.get('end_date')
    reason      = request.data.get('reason', '').strip()
    leave_type  = request.data.get('leave_type', 'CL').strip()

    if not start_date or not end_date or not reason:
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
    if leave_type not in {code for code, _ in LEAVE_TYPES}:
        return Response({'error': 'Invalid leave type'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sd = datetime.date.fromisoformat(start_date)
        ed = datetime.date.fromisoformat(end_date)
    except ValueError:
        return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

    if ed < sd:
        return Response({'error': 'End date cannot be before start date'}, status=status.HTTP_400_BAD_REQUEST)

    days = (ed - sd).days + 1

    # Overlapping leave check
    overlap = Leave.objects.filter(
        user=request.user, status__in=['Pending', 'Approved'],
        start_date__lte=ed, end_date__gte=sd,
    ).exists()
    if overlap:
        return Response({'error': 'You already have a leave request overlapping these dates'}, status=status.HTTP_400_BAD_REQUEST)

    # Balance check (skip for unlimited types)
    bal = get_or_create_balance(request.user, leave_type)
    if bal.entitled > 0 and (bal.used + days) > bal.entitled:
        remaining = max(bal.entitled - bal.used, 0)
        return Response(
            {'error': f'Insufficient {bal.get_leave_type_display()} balance. Available: {remaining} day(s), Requested: {days} day(s)'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    leave = Leave.objects.create(
        user=request.user, leave_type=leave_type,
        start_date=sd, end_date=ed, reason=reason,
    )

    emp_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
    if request.user.role == 'manager':
        # Manager leaves go to HR of the same department
        for hr_user in User.objects.filter(role='hr', department=request.user.department, is_active=True):
            notify(hr_user, f'Manager {emp_name} applied for {leave.get_leave_type_display()} ({start_date} → {end_date}, {days} day(s))')
            push_refresh(hr_user, 'leaves')
    elif request.user.role == 'hr':
        # HR leaves go to super_admin only
        for sa in User.objects.filter(role='super_admin', is_active=True):
            notify(sa, f'HR {emp_name} applied for {leave.get_leave_type_display()} ({start_date} → {end_date}, {days} day(s))')
            push_refresh(sa, 'leaves')
    else:
        # Employee leaves go to department managers
        for mgr in department_managers(request.user.department):
            notify(mgr, f'{emp_name} applied for {leave.get_leave_type_display()} ({start_date} → {end_date}, {days} day(s))')
            push_refresh(mgr, 'leaves')
    push_refresh_role('super_admin', 'leaves')
    push_refresh(request.user, 'leaves')

    return Response({'message': 'Leave applied', 'id': leave.id, 'status': leave.status, 'days': days}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_stats(request):
    auto_reject_pending_leaves()
    seed_balances(request.user)
    balances = LeaveBalance.objects.filter(user=request.user)
    approved_days = sum(l.days for l in Leave.objects.filter(user=request.user, status='Approved'))
    limited_remaining = sum(max(b.entitled - b.used, 0) for b in balances if b.entitled > 0)
    return Response({'leaves_left': limited_remaining, 'approved': approved_days})


# ── manager endpoints ─────────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_leave_list(request):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    auto_reject_pending_leaves()
    leaves = Leave.objects.select_related('user').order_by('-start_date')
    if request.user.role == 'manager':
        leaves = leaves.filter(user__department=request.user.department, user__role='employee')
    elif request.user.role == 'hr':
        leaves = leaves.filter(user__role='manager', user__department=request.user.department)
    return Response([serialize_leave(l) for l in leaves])


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_leave_action(request, pk, action):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        leave = Leave.objects.select_related('user').get(id=pk)
        if request.user.role == 'manager' and (
            leave.user.role != 'employee' or leave.user.department != request.user.department
        ):
            return Response({'error': 'You can only manage leave requests from employees in your department'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'hr' and (
            leave.user.role != 'manager' or leave.user.department != request.user.department
        ):
            return Response({'error': 'HR can only manage leave requests from managers in their department'}, status=status.HTTP_403_FORBIDDEN)
        prev_status = leave.status

        if action == 'approve':
            leave.status = 'Approved'
            leave.save()
            # Deduct balance only for types with a limit
            bal = get_or_create_balance(leave.user, leave.leave_type)
            if bal.entitled > 0:
                bal.used = min(bal.used + leave.days, bal.entitled)
                bal.save()

        elif action == 'reject':
            leave.status = 'Rejected'
            leave.save()
            # Restore balance if it was previously approved
            if prev_status == 'Approved':
                bal = get_or_create_balance(leave.user, leave.leave_type)
                if bal.entitled > 0:
                    bal.used = max(bal.used - leave.days, 0)
                    bal.save()
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        notify(leave.user, f'Your {leave.get_leave_type_display()} request ({leave.start_date} → {leave.end_date}) has been {leave.status.lower()}')
        push_refresh(leave.user, 'leaves')
        for mgr in department_managers(leave.user.department):
            push_refresh(mgr, 'leaves')
        push_refresh_role('hr', 'leaves')
        push_refresh_role('super_admin', 'leaves')

        return Response({'message': f'Leave {leave.status}', 'status': leave.status})
    except Leave.DoesNotExist:
        return Response({'error': 'Leave not found'}, status=status.HTTP_404_NOT_FOUND)


# ── leave policy endpoints ───────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_policy_list(request):
    policies = {p.leave_type: p.entitled for p in LeavePolicy.objects.all()}
    result = []
    for code, label in LEAVE_TYPES:
        entitled = policies.get(code, LEAVE_ENTITLEMENT.get(code, 0))
        result.append({'leave_type': code, 'leave_type_display': label, 'entitled': entitled})
    return Response(result)


@api_view(['PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def leave_policy_update(request):
    if request.user.role != 'super_admin':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    updates = request.data  # expects [{"leave_type": "CL", "entitled": 12}, ...]
    if not isinstance(updates, list):
        return Response({'error': 'Expected a list'}, status=status.HTTP_400_BAD_REQUEST)
    valid_codes = {code for code, _ in LEAVE_TYPES}
    for item in updates:
        code = item.get('leave_type')
        raw_entitled = item.get('entitled')
        if code not in valid_codes or raw_entitled is None:
            continue
        try:
            entitled = int(raw_entitled)
        except (TypeError, ValueError):
            return Response({'error': 'Entitled days must be a number'}, status=status.HTTP_400_BAD_REQUEST)
        if entitled < 0:
            return Response({'error': 'Entitled days cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)
        LeavePolicy.objects.update_or_create(
            leave_type=code,
            defaults={'entitled': entitled},
        )
        # Sync all existing LeaveBalance rows for this type
        LeaveBalance.objects.filter(leave_type=code).update(entitled=entitled)
    return Response({'message': 'Policies updated successfully'})
