from django.contrib import admin
from .models import Attendance, AttendanceLog, AttendanceClaim


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'check_in_time', 'check_out_time', 'status')
    list_filter = ('status', 'date')
    search_fields = ('user__email', 'user__username')
    ordering = ('-date',)


@admin.register(AttendanceLog)
class AttendanceLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'time', 'action', 'created_at')
    list_filter = ('action', 'date')
    search_fields = ('user__email', 'user__username')
    ordering = ('-date', '-time')


@admin.register(AttendanceClaim)
class AttendanceClaimAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'check_in_time', 'check_out_time', 'status', 'submitted_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'user__username')
    ordering = ('-submitted_at',)
