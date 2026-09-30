from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework import status
from .models import User
from notifications.utils import push_refresh, push_refresh_role, push_refresh_all

ADMIN_ROLES = {'super_admin', 'hr'}
MANAGE_ROLES = {'super_admin', 'hr', 'manager'}


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    full_name  = request.data.get('full_name', '').strip()
    username   = request.data.get('username', '').strip()
    email      = request.data.get('email', '').strip().lower()
    password   = request.data.get('password', '').strip()
    phone      = request.data.get('phone', '').strip()
    role       = request.data.get('role', 'employee')
    department = request.data.get('department', '').strip()

    if not full_name or not username or not email or not password:
        return Response({'error': 'Full name, username, email and password are required'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already taken'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=400)

    if role not in ('super_admin', 'hr', 'employee', 'manager'):
        role = 'employee'

    name_parts = full_name.split(' ', 1)
    user = User.objects.create_user(username=username, email=email, password=password)
    user.first_name = name_parts[0]
    user.last_name  = name_parts[1] if len(name_parts) > 1 else ''
    user.phone      = phone
    user.role       = role
    user.department = department
    user.is_active  = False   # blocked until super_admin approves
    user.is_approved = False
    user.save()

    return Response({'message': 'Registration submitted. Awaiting Super Admin approval before you can log in.'}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email    = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    user = authenticate(username=email, password=password)
    if not user:
        try:
            u = User.objects.get(email=email)
            user = authenticate(username=u.username, password=password)
        except User.DoesNotExist:
            pass
    if user:
        if not user.is_approved:
            return Response({'error': 'Your account is pending approval by the Super Admin. Please wait.'}, status=403)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token':     token.key,
            'role':      user.role,
            'full_name': f'{user.first_name} {user.last_name}'.strip() or user.username,
            'username':  user.username,
            'email':     user.email,
            'phone':     user.phone,
            'department': user.department,
        })
    return Response({'error': 'Invalid email or password'}, status=401)


@api_view(['GET', 'PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    if request.method == 'GET':
        return Response({
            'full_name':  f'{user.first_name} {user.last_name}'.strip() or user.username,
            'username':   user.username,
            'email':      user.email,
            'phone':      user.phone,
            'role':       user.role,
            'department': user.department,
        })
    full_name    = request.data.get('full_name', '').strip()
    new_username = request.data.get('username', '').strip()
    if full_name:
        parts = full_name.split(' ', 1)
        user.first_name = parts[0]
        user.last_name  = parts[1] if len(parts) > 1 else ''
    if new_username and new_username != user.username:
        if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
            return Response({'error': 'Username already taken'}, status=400)
        user.username = new_username
    user.phone = request.data.get('phone', user.phone)
    user.email = request.data.get('email', user.email)
    if request.data.get('department') is not None:
        user.department = request.data.get('department', '').strip()
    user.save()
    push_refresh_role('super_admin', 'users')
    push_refresh_role('hr', 'users')
    return Response({
        'message':    'Profile updated successfully',
        'username':   user.username,
        'full_name':  f'{user.first_name} {user.last_name}'.strip() or user.username,
        'email':      user.email,
        'phone':      user.phone,
        'role':       user.role,
        'department': user.department,
    })


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def employees_list(request):
    if request.user.role not in MANAGE_ROLES:
        return Response({'error': 'Forbidden'}, status=403)

    role_filter = request.query_params.get('role', '')
    qs = User.objects.exclude(is_superuser=True).order_by('first_name', 'last_name', 'username')

    if request.user.role == 'super_admin':
        # Super admin sees everyone; optional role filter
        if role_filter:
            qs = qs.filter(role=role_filter)
    elif request.user.role == 'manager':
        # Manager sees only employees in their own department
        qs = qs.filter(role='employee', department=request.user.department)
    elif request.user.role == 'hr':
        # HR sees all users in their own department
        qs = qs.filter(department=request.user.department)
        if role_filter:
            qs = qs.filter(role=role_filter)

    data = [{
        'id':          u.id,
        'full_name':   f'{u.first_name} {u.last_name}'.strip() or u.username,
        'username':    u.username,
        'email':       u.email,
        'phone':       u.phone,
        'role':        u.role,
        'department':  u.department,
        'date_joined': str(u.date_joined.date()),
    } for u in qs]
    return Response(data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_user(request):
    """HR and Super Admin can create any user."""
    if request.user.role not in ADMIN_ROLES:
        return Response({'error': 'Forbidden'}, status=403)

    full_name = request.data.get('full_name', '').strip()
    username  = request.data.get('username', '').strip()
    email     = request.data.get('email', '').strip().lower()
    password  = request.data.get('password', '').strip()
    phone     = request.data.get('phone', '').strip()
    role      = request.data.get('role', 'employee')
    department = request.data.get('department', '').strip()

    if not full_name or not username or not email or not password:
        return Response({'error': 'All fields are required'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already taken'}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already registered'}, status=400)

    # HR cannot create super_admin
    if request.user.role == 'hr' and role == 'super_admin':
        return Response({'error': 'HR cannot create Super Admin accounts'}, status=403)

    # HR can only create users in their own department
    if request.user.role == 'hr':
        department = request.user.department

    name_parts = full_name.split(' ', 1)
    user = User.objects.create_user(username=username, email=email, password=password)
    user.first_name = name_parts[0]
    user.last_name  = name_parts[1] if len(name_parts) > 1 else ''
    user.phone = phone
    user.role  = role
    user.department = department
    user.save()

    return Response({
        'message':  'User created successfully',
        'id':       user.id,
        'username': user.username,
        'role':     user.role,
    }, status=201)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """Super Admin: counts by role + today's active users."""
    if request.user.role != 'super_admin':
        return Response({'error': 'Forbidden'}, status=403)
    import datetime
    today = datetime.date.today()
    from attendance.models import Attendance
    active_today = Attendance.objects.filter(date=today, status='Present').values('user').distinct().count()
    qs = User.objects.exclude(is_superuser=True)
    return Response({
        'employees':    qs.filter(role='employee').count(),
        'managers':     qs.filter(role='manager').count(),
        'hrs':          qs.filter(role='hr').count(),
        'super_admins': qs.filter(role='super_admin').count(),
        'total':        qs.count(),
        'active_today': active_today,
    })

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def pending_users(request):
    """Super Admin: list all users awaiting approval."""
    if request.user.role != 'super_admin':
        return Response({'error': 'Forbidden'}, status=403)
    qs = User.objects.filter(is_approved=False, is_superuser=False).order_by('-date_joined')
    data = [{
        'id':          u.id,
        'full_name':   f'{u.first_name} {u.last_name}'.strip() or u.username,
        'username':    u.username,
        'email':       u.email,
        'phone':       u.phone,
        'role':        u.role,
        'department':  u.department,
        'date_joined': str(u.date_joined.date()),
    } for u in qs]
    return Response(data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def approve_user(request, pk):
    """Super Admin: approve a pending user."""
    if request.user.role != 'super_admin':
        return Response({'error': 'Forbidden'}, status=403)
    try:
        user = User.objects.get(pk=pk, is_approved=False)
    except User.DoesNotExist:
        return Response({'error': 'User not found or already approved'}, status=404)
    user.is_approved = True
    user.is_active   = True
    user.save()
    push_refresh_role('super_admin', 'users')
    push_refresh_role('hr', 'users')
    push_refresh_role('manager', 'users')
    return Response({'message': f'{user.username} approved successfully'})


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def reject_user(request, pk):
    """Super Admin: reject and delete a pending user."""
    if request.user.role != 'super_admin':
        return Response({'error': 'Forbidden'}, status=403)
    try:
        user = User.objects.get(pk=pk, is_approved=False)
    except User.DoesNotExist:
        return Response({'error': 'User not found or already approved'}, status=404)
    user.delete()
    push_refresh_role('super_admin', 'users')
    push_refresh_role('hr', 'users')
    push_refresh_role('manager', 'users')
    return Response({'message': 'User rejected and removed'})


@api_view(['PATCH'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def update_role_dept(request, pk):
    """Super Admin only: change a user's role and/or department."""
    if request.user.role != 'super_admin' and not request.user.is_superuser:
        return Response({'error': 'Forbidden'}, status=403)
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    if request.data.get('role'):
        user.role = request.data['role']
    if request.data.get('department') is not None:
        user.department = request.data['department'].strip()
    user.save()
    push_refresh_role('super_admin', 'users')
    push_refresh_role('hr', 'users')
    push_refresh_role('manager', 'users')
    return Response({'message': 'Updated successfully', 'role': user.role, 'department': user.department})


@api_view(['PUT', 'DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manage_user(request, pk):
    """HR and Super Admin can edit or delete users."""
    if request.user.role not in ADMIN_ROLES:
        return Response({'error': 'Forbidden'}, status=403)
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    if request.method == 'DELETE':
        if user == request.user:
            return Response({'error': 'Cannot delete yourself'}, status=400)
        user.delete()
        return Response({'message': 'User deleted'})

    # PUT — update fields
    full_name = request.data.get('full_name', '').strip()
    if full_name:
        parts = full_name.split(' ', 1)
        user.first_name = parts[0]
        user.last_name  = parts[1] if len(parts) > 1 else ''
    new_username = request.data.get('username', '').strip()
    if new_username and new_username != user.username:
        if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
            return Response({'error': 'Username already taken'}, status=400)
        user.username = new_username
    if request.data.get('email'):
        user.email = request.data['email'].strip().lower()
    if request.data.get('phone') is not None:
        user.phone = request.data['phone']
    if request.data.get('department') is not None:
        user.department = request.data['department'].strip()
    if request.data.get('role'):
        if request.user.role == 'hr' and request.data['role'] == 'super_admin':
            return Response({'error': 'HR cannot assign Super Admin role'}, status=403)
        user.role = request.data['role']
    if request.data.get('department') is not None:
        if request.user.role == 'hr':
            user.department = request.user.department
        else:
            user.department = request.data['department'].strip()
    if request.data.get('password'):
        user.set_password(request.data['password'])
    user.save()
    push_refresh_role('super_admin', 'users')
    push_refresh_role('hr', 'users')
    push_refresh_role('manager', 'users')
    return Response({'message': 'User updated successfully'})
