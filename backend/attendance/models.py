from django.db import models
from accounts.models import User


class Attendance(models.Model):
    user           = models.ForeignKey(User, on_delete=models.CASCADE)
    date           = models.DateField()
    check_in_time  = models.TimeField(null=True, blank=True)   # first check-in of the day
    check_out_time = models.TimeField(null=True, blank=True)   # last check-out of the day
    status         = models.CharField(
        max_length=20,
        choices=[('Present', 'Present'), ('Absent', 'Absent'), ('On Leave', 'On Leave')],
        default='Absent',
    )


class AttendanceLog(models.Model):
    ACTION_CHOICES = [('check_in', 'Check In'), ('check_out', 'Check Out')]
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_logs')
    date       = models.DateField()
    time       = models.TimeField()
    action     = models.CharField(max_length=10, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'time']

    def __str__(self):
        return f"{self.user.username} {self.action} {self.date} {self.time}"


class AttendanceClaim(models.Model):
    STATUS_CHOICES = [('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')]
    user           = models.ForeignKey(User, on_delete=models.CASCADE)
    date           = models.DateField()
    check_in_time  = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    reason         = models.TextField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    submitted_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.date} - {self.status}"
