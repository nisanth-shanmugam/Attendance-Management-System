from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import Notification, Announcement
from accounts.models import User

ANNOUNCE_ROLES = {'super_admin', 'hr', 'manager'}


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def notification_list(request):
    notifs = Notification.objects.filter(user=request.user).order_by('-created_at')[:50]
    data = [{'id': n.id, 'message': n.message, 'is_read': n.is_read, 'created_at': str(n.created_at)} for n in notifs]
    return Response(data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read'})


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def mark_one_read(request, pk):
    updated = Notification.objects.filter(user=request.user, id=pk).update(is_read=True)
    if not updated:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'message': 'Marked as read'})


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def clear_all(request):
    Notification.objects.filter(user=request.user).delete()
    return Response({'message': 'All notifications cleared'})


@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def announcement_list(request):
    user = request.user

    if request.method == 'GET':
        # Employees/managers/hr see: global + their department
        if user.role == 'super_admin':
            qs = Announcement.objects.all()
        else:
            qs = Announcement.objects.filter(
                Q(department='') | Q(department=user.department)
            )
        data = [{
            'id': a.id,
            'title': a.title,
            'message': a.message,
            'department': a.department or 'All Departments',
            'sender': f"{a.sender.first_name} {a.sender.last_name}".strip() or a.sender.username,
            'sender_role': a.sender.role,
            'created_at': a.created_at.strftime('%b %d, %Y %H:%M'),
        } for a in qs]
        return Response(data)

    # POST — create announcement
    if user.role not in ANNOUNCE_ROLES:
        return Response({'error': 'Forbidden'}, status=403)

    title = request.data.get('title', '').strip()
    message = request.data.get('message', '').strip()
    department = request.data.get('department', '').strip()

    if not title or not message:
        return Response({'error': 'Title and message are required.'}, status=400)

    # HR and Manager can only post to their own department
    if user.role in ('hr', 'manager'):
        department = user.department

    # Super admin: empty string means all departments
    ann = Announcement.objects.create(
        sender=user, title=title, message=message, department=department
    )
    return Response({'id': ann.id, 'message': 'Announcement posted.'}, status=201)


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def announcement_delete(request, pk):
    user = request.user
    if user.role not in ANNOUNCE_ROLES:
        return Response({'error': 'Forbidden'}, status=403)
    try:
        ann = Announcement.objects.get(pk=pk)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    # Only the sender or super_admin can delete
    if ann.sender != user and user.role != 'super_admin':
        return Response({'error': 'Forbidden'}, status=403)
    ann.delete()
    return Response({'message': 'Deleted.'})
