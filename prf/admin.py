from django.contrib import admin
from .models import PRFRequest, EmergencyLoan

@admin.register(PRFRequest)
class PRFRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'prf_type', 'status', 'created_at', 'processed_by']
    list_filter = ['status', 'prf_category', 'prf_type', 'created_at']
    search_fields = ['employee__username', 'purpose', 'control_number']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('employee', 'prf_category', 'prf_type', 'purpose', 'control_number')
        }),
        ('Processing', {
            'fields': ('status', 'admin_remarks', 'processed_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(EmergencyLoan)
class EmergencyLoanAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'employee_full_name',
        'amount',
        'number_of_cutoff',
        'deduction_per_cutoff',
        'formatted_starting_date',
        'created_at',
        'updated_at',
    )
    list_filter = ('amount', 'starting_date', 'created_at')
    search_fields = ('employee_full_name', 'prf_request__employee__username')
    readonly_fields = ('created_at', 'updated_at', 'deduction_per_cutoff', 'formatted_starting_date')

    fieldsets = (
        ("Loan Details", {
            "fields": (
                'prf_request',
                'employee_full_name',
                'amount',
                'number_of_cutoff',
                'starting_date',
            ),
        }),
        ("System Info", {
            "fields": (
                'deduction_per_cutoff',
                'formatted_starting_date',
                'created_at',
                'updated_at',
            ),
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('prf_request', 'prf_request__employee')