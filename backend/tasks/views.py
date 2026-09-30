from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Task
from accounts.models import User
from notifications.utils import notify, push_refresh

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def task_list(request):
    if request.method == 'GET':
        tasks = Task.objects.filter(assigned_to=request.user).order_by('-created_at')
        data = [{
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'status': t.status,
            'created_at': str(t.created_at.date()),
        } for t in tasks]
        return Response(data)

    title = request.data.get('title', '').strip()
    description = request.data.get('description', '').strip()
    assigned_to_id = request.data.get('assigned_to')
    if not title:
        return Response({'error': 'Title is required'}, status=status.HTTP_400_BAD_REQUEST)
    if assigned_to_id and request.user.role == 'manager':
        try:
            assignee = User.objects.get(id=assigned_to_id)
        except User.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        assignee = request.user
    task = Task.objects.create(title=title, description=description, assigned_to=assignee)
    notify(assignee, f'New task assigned to you: "{title}"')
    push_refresh(assignee, 'tasks')
    managers = User.objects.filter(role='manager')
    emp_name = f"{assignee.first_name} {assignee.last_name}".strip() or assignee.username
    for mgr in managers:
        if mgr != request.user:
            notify(mgr, f'Task "{title}" assigned to {emp_name}')
        push_refresh(mgr, 'tasks')
    return Response({'id': task.id, 'title': task.title, 'description': task.description, 'status': task.status, 'created_at': str(task.created_at.date())}, status=status.HTTP_201_CREATED)

@api_view(['PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def task_update(request, pk):
    try:
        task = Task.objects.get(id=pk, assigned_to=request.user)
        task.status = request.data.get('status', task.status)
        task.save()
        managers = User.objects.filter(role='manager')
        emp_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        for mgr in managers:
            if task.status == 'Completed':
                notify(mgr, f'{emp_name} completed task: "{task.title}"')
            push_refresh(mgr, 'tasks')
        push_refresh(request.user, 'tasks')
        return Response({'message': 'Task updated', 'status': task.status})
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def task_stats(request):
    total = Task.objects.filter(assigned_to=request.user).count()
    completed = Task.objects.filter(assigned_to=request.user, status='Completed').count()
    return Response({'total': total, 'completed': completed})

# Manager: all tasks across all employees
@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_task_list(request):
    if request.user.role != 'manager':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    tasks = Task.objects.select_related('assigned_to').order_by('-created_at')
    data = [{
        'id': t.id,
        'title': t.title,
        'description': t.description,
        'status': t.status,
        'employee': f"{t.assigned_to.first_name} {t.assigned_to.last_name}".strip() or t.assigned_to.username,
        'email': t.assigned_to.email,
        'created_at': str(t.created_at.date()),
    } for t in tasks]
    return Response(data)

# Manager: update any task status
@api_view(['PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def manager_task_update(request, pk):
    if request.user.role != 'manager':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    try:
        task = Task.objects.get(id=pk)
        task.status = request.data.get('status', task.status)
        task.save()
        return Response({'message': 'Task updated', 'status': task.status})
    except Task.DoesNotExist:
        return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
