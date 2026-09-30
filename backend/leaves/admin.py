from django.contrib import admin
from .models import Leave, LeaveBalance


@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ('user', 'leave_type', 'start_date', 'end_date', 'days', 'status')
    list_filter = ('status', 'leave_type')
    search_fields = ('user__email', 'user__username')
    ordering = ('-start_date',)

    def days(self, obj):
        return obj.days
    days.short_description = 'Days'


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'leave_type', 'entitled', 'used', 'remaining')
    list_filter = ('leave_type',)
    search_fields = ('user__email', 'user__username')

    def remaining(self, obj):
        r = obj.remaining
        return r if r is not None else '∞'
    remaining.short_description = 'Remaining'
