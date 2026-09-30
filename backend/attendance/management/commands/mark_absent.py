from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import Attendance
from accounts.models import User
import datetime

# Deadline: employees must check in within 1 hour of this time
CHECKIN_DEADLINE = datetime.time(10, 0, 0)  # 10:00 AM

class Command(BaseCommand):
    help = 'Mark all users as Absent if they have not checked in by the deadline'

    def handle(self, *args, **kwargs):
        now = datetime.datetime.now()
        today = now.date()
        current_time = now.time()

        # Only run after the deadline has passed
        if current_time < CHECKIN_DEADLINE:
            self.stdout.write(f'Deadline not reached yet. Current time: {current_time}, Deadline: {CHECKIN_DEADLINE}')
            return

        all_users = User.objects.all()
        marked = 0

        for user in all_users:
            record, created = Attendance.objects.get_or_create(
                user=user,
                date=today,
                defaults={'status': 'Absent'}
            )
            if not created and record.check_in_time is None:
                record.status = 'Absent'
                record.save()
                marked += 1
            elif created:
                marked += 1

        self.stdout.write(self.style.SUCCESS(f'Marked {marked} users as Absent for {today}'))
