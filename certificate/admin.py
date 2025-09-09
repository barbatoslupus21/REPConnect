from django.contrib import admin
from .models import Certificate

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['employee', 'title', 'uploaded_by', 'is_seen', 'created_at']
    list_filter = ['is_seen', 'created_at', 'uploaded_by']
    search_fields = ['employee__username', 'employee__firstname', 'employee__lastname', 'title']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['employee', 'uploaded_by']
    
    fieldsets = (
        (None, {
            'fields': ('employee', 'title', 'certificate_file', 'uploaded_by')
        }),
        ('Status', {
            'fields': ('is_seen',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('employee', 'uploaded_by')