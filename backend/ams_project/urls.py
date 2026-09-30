"""
URL configuration for ams_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from accounts import views as account_views
from attendance import views as attendance_views
from tasks import views as task_views
from leaves import views as leave_views
from notifications import views as notification_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', account_views.register),
    path('api/login/', account_views.login),
    path('api/profile/', account_views.profile),
    path('api/employees/', account_views.employees_list),
    path('api/users/create/', account_views.create_user),
    path('api/users/stats/', account_views.user_stats),
    path('api/users/pending/', account_views.pending_users),
    path('api/users/<int:pk>/update-role-dept/', account_views.update_role_dept),
    path('api/users/<int:pk>/approve/', account_views.approve_user),
    path('api/users/<int:pk>/reject/', account_views.reject_user),
    path('api/users/<int:pk>/', account_views.manage_user),
    # Attendance
    path('api/attendance/', attendance_views.attendance_list),
    path('api/attendance/stats/', attendance_views.attendance_stats),
    path('api/attendance/all/', attendance_views.manager_attendance),
    path('api/attendance/logs/', attendance_views.attendance_logs),
    path('api/attendance/logs/all/', attendance_views.manager_attendance_logs),
    path('api/attendance/mark-absent/', attendance_views.mark_absent),
    path('api/checkin/', attendance_views.check_in),
    path('api/checkout/', attendance_views.check_out),
    path('api/attendance/claim/', attendance_views.attendance_claim),
    path('api/attendance/claims/all/', attendance_views.manager_claims),
    path('api/attendance/claims/<int:pk>/<str:action>/', attendance_views.manager_claim_action),
    # Tasks
    path('api/tasks/', task_views.task_list),
    path('api/tasks/stats/', task_views.task_stats),
    path('api/tasks/all/', task_views.manager_task_list),
    path('api/tasks/<int:pk>/', task_views.task_update),
    path('api/tasks/manager/<int:pk>/', task_views.manager_task_update),
    # Leaves
    path('api/leaves/', leave_views.leave_list),
    path('api/leave/apply/', leave_views.leave_apply),
    path('api/leaves/balances/', leave_views.leave_balances),
    path('api/leaves/stats/', leave_views.leave_stats),
    path('api/leaves/all/', leave_views.manager_leave_list),
    path('api/leaves/<int:pk>/<str:action>/', leave_views.manager_leave_action),
    path('api/leaves/policy/', leave_views.leave_policy_list),
    path('api/leaves/policy/update/', leave_views.leave_policy_update),
    # Notifications
    path('api/notifications/', notification_views.notification_list),
    path('api/notifications/read/', notification_views.mark_all_read),
    path('api/notifications/clear/', notification_views.clear_all),
    path('api/notifications/<int:pk>/read/', notification_views.mark_one_read),
    # Announcements
    path('api/announcements/', notification_views.announcement_list),
    path('api/announcements/<int:pk>/', notification_views.announcement_delete),
]
