from django.core.management.base import BaseCommand
from leaves.models import Leave
import datetime

class Command(BaseCommand):
    help = 'Auto-reject pending leave requests not approved by the afternoon before start date'

    def handle(self, *args, **kwargs):
        rejected = auto_reject_pending_leaves()
        self.stdout.write(self.style.SUCCESS(f'Auto-rejected {rejected} leave request(s)'))


def auto_reject_pending_leaves():
    """
    Reject all Pending leaves where start_date <= tomorrow
    (i.e. the afternoon before the leave starts, manager has not acted).
    Run this daily at 12:00 PM (noon).
    """
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    pending = Leave.objects.filter(status='Pending', start_date__lte=tomorrow)
    count = pending.count()
    pending.update(status='Rejected')
    return count
