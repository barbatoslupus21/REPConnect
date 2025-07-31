from django.contrib import admin
from .models import PRFRequest

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