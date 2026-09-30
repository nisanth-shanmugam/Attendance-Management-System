from django.db import models
from accounts.models import User

LEAVE_TYPES = [
    ('CL',  'Casual Leave (CL)'),
    ('SL',  'Sick Leave (SL)'),
    ('EL',  'Earned Leave (EL)'),
    ('LOP', 'Loss of Pay (LOP)'),
    ('ML',  'Maternity Leave'),
    ('PL',  'Paternity Leave'),
    ('CO',  'Compensatory Off (Comp-Off)'),
    ('BL',  'Bereavement Leave'),
    ('MAL', 'Marriage Leave'),
    ('WFH', 'Work From Home (WFH)'),
]

# Default annual entitlement per leave type (0 = unlimited / on-request)
LEAVE_ENTITLEMENT = {
    'CL':  10,
    'SL':  8,
    'EL':  18,   # 1.5 days/month
    'LOP': 0,    # no limit — deducted from salary
    'ML':  180,  # ~6 months
    'PL':  5,
    'CO':  0,    # granted on request
    'BL':  3,
    'MAL': 3,
    'WFH': 0,    # no fixed limit
}


class Leave(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    leave_type = models.CharField(max_length=10, choices=LEAVE_TYPES, default='CL')
    start_date = models.DateField()
    end_date   = models.DateField()
    reason     = models.TextField()
    status     = models.CharField(
        max_length=20,
        choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')],
        default='Pending',
    )

    @property
    def days(self):
        return (self.end_date - self.start_date).days + 1


class LeaveBalance(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.CharField(max_length=10, choices=LEAVE_TYPES)
    entitled   = models.IntegerField(default=0)   # annual entitlement
    used       = models.IntegerField(default=0)    # approved days consumed

    class Meta:
        unique_together = ('user', 'leave_type')

    @property
    def remaining(self):
        if self.entitled == 0:
            return None   # unlimited
        return max(self.entitled - self.used, 0)


class LeavePolicy(models.Model):
    """Global leave entitlement set by super admin. One row per leave type."""
    leave_type = models.CharField(max_length=10, choices=LEAVE_TYPES, unique=True)
    entitled   = models.IntegerField(default=0)  # 0 = unlimited

    def __str__(self):
        return f"{self.get_leave_type_display()} — {self.entitled} days"
