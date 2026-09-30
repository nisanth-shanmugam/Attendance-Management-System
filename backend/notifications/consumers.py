import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token_key = self.scope['query_string'].decode().split('token=')[-1]
        user = await self.get_user(token_key)
        if user is None:
            await self.close()
            return
        self.group_name = f'notifications_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        await self.send(text_data=json.dumps({'type': 'notification', **event['notification']}))

    async def send_refresh(self, event):
        await self.send(text_data=json.dumps({'type': 'refresh', 'resource': event['resource']}))

    @database_sync_to_async
    def get_user(self, token_key):
        try:
            return Token.objects.select_related('user').get(key=token_key).user
        except Token.DoesNotExist:
            return None
