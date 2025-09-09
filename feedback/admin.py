from django.contrib import admin
from .models import Feedback

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['subject', 'display_name', 'is_anonymous', 'is_read', 'created_at']
    list_filter = ['is_anonymous', 'is_read', 'created_at']
    search_fields = ['subject', 'message', 'submitter__firstname', 'submitter__lastname']
    readonly_fields = ['created_at', 'updated_at', 'display_name', 'display_email']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Feedback Information', {
            'fields': ('subject', 'message')
        }),
        ('Submitter Information', {
            'fields': ('submitter', 'is_anonymous', 'display_name', 'display_email')
        }),
        ('Status', {
            'fields': ('is_read', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser or (hasattr(request.user, 'hr_manager') and request.user.hr_manager)
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser or (hasattr(request.user, 'hr_manager') and request.user.hr_manager)
    
    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser or (hasattr(request.user, 'hr_manager') and request.user.hr_manager)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        elif hasattr(request.user, 'hr_manager') and request.user.hr_manager:
            return qs
        else:
            return qs.none() or (hasattr(request.user, 'hr_manager') and request.user.hr_manager)
    
    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser or (hasattr(request.user, 'hr_manager') and request.user.hr_manager)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        elif hasattr(request.user, 'hr_manager') and request.user.hr_manager:
            return qs
        else:
            return qs.none()