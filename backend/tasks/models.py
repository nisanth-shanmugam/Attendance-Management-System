from django.db import models
from accounts.models import User

#tasks
class Task(models.Model):
    title=models.CharField(max_length=200)
    description=models.TextField()

    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('In Progress', 'In Progress'), ('Completed', 'Completed')], default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    