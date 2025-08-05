from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveApprovalAction, LeaveReason, SundayException
@admin.register(LeaveReason)
class LeaveReasonAdmin(admin.ModelAdmin):
    list_display = ['leave_type', 'reason_text', 'is_active', 'created_at']
    list_filter = ['leave_type', 'is_active']
    search_fields = ['reason_text', 'leave_type__name']

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code']
    prepopulated_fields = {'code': ('name',)}

@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'entitled', 'used', 'remaining', 'valid_from', 'valid_to', 'validity_status']
    list_filter = ['leave_type', 'validity_status', 'valid_from', 'valid_to']
    search_fields = ['employee__firstname', 'employee__lastname', 'employee__username']
    readonly_fields = ['remaining', 'validity_status']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'leave_type')

@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['control_number', 'employee', 'leave_type', 'date_from', 'date_to', 'days_requested', 'current_approver', 'status', 'date_prepared']
    list_filter = ['status', 'leave_type', 'date_prepared', 'date_from']
    search_fields = ['control_number', 'employee__firstname', 'employee__lastname', 'employee__username']
    readonly_fields = ['control_number', 'days_requested', 'date_prepared', 'updated_at']
    date_hierarchy = 'date_prepared'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('control_number', 'employee', 'leave_type', 'leave_reason', 'date_from', 'date_to', 'days_requested', 'hrs_requested')
        }),
        ('Request Details', {
            'fields': ('reason', 'current_approver', 'status')
        }),
        ('Timestamps', {
            'fields': ('date_prepared', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'leave_type')


@admin.register(LeaveApprovalAction)
class LeaveApprovalActionAdmin(admin.ModelAdmin):
    list_display = ['leave_request', 'approver', 'sequence', 'status', 'action', 'action_at', 'created_at']
    list_filter = ['status', 'action', 'action_at', 'created_at']
    search_fields = ['leave_request__control_number', 'approver__firstname', 'approver__lastname']
    readonly_fields = ['created_at', 'action_at']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('leave_request', 'approver')

admin.site.register(SundayException)