from channels.layers import get_channel_layer
from notifications.models import Notification
import asyncio


def _send(group, payload):
    channel_layer = get_channel_layer()
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(channel_layer.group_send(group, payload))
    except RuntimeError:
        from asgiref.sync import async_to_sync
        async_to_sync(channel_layer.group_send)(group, payload)


def notify(user, message):
    n = Notification.objects.create(user=user, message=message)
    _send(f'notifications_{user.id}', {
        'type': 'send_notification',
        'notification': {
            'id': n.id,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': str(n.created_at),
        },
    })


def push_refresh(user, resource):
    """Send a refresh signal for a specific resource to a user's WebSocket."""
    _send(f'notifications_{user.id}', {
        'type': 'send_refresh',
        'resource': resource,
    })


def push_refresh_role(role, resource):
    """Broadcast a refresh signal to all users of a given role."""
    from accounts.models import User
    for user in User.objects.filter(role=role, is_active=True):
        push_refresh(user, resource)


def push_refresh_all(resource):
    """Broadcast a refresh signal to every active user."""
    from accounts.models import User
    for user in User.objects.filter(is_active=True):
        push_refresh(user, resource)
