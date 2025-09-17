from django.contrib import admin
from .models import DeviceType, TicketCategory, Device, Ticket

# ========================
# DeviceType Admin
# ========================
@admin.register(DeviceType)
class DeviceTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    ordering = ['name']


# ========================
# TicketCategory Admin
# ========================
@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    ordering = ['name']


# ========================
# Device Admin
# ========================
@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('id', 'device_name', 'device_code', 'device_brand', 'device_model', 'device_type', 'is_active', 'user_display')
    list_filter = ['device_type', 'is_active', 'created_at', 'device_brand']
    search_fields = ('device_name', 'device_code', 'device_brand', 'device_model', 'device_type__name')
    # removed autocomplete_fields to avoid needing EmployeeLoginAdmin
    ordering = ['-created_at']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('device_name', 'device_code', 'device_brand', 'device_model', 'device_type', 'device_location')
        }),
        ('User & Status', {
            'fields': ('user', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['created_at', 'updated_at']

    def user_display(self, obj):
        return f"{obj.user.full_name} ({obj.user.id})" if obj.user else "-"
    user_display.short_description = "User"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'device_type')


# ========================
# Ticket Admin
# ========================
@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket_number', 'status', 'priority_level', 'device_display', 'requestor_display', 'created_at', 'updated_at')
    list_filter = ['status', 'priority_level', 'category', 'created_at', 'reviewed_at']
    search_fields = (
        'ticket_number', 'problem_details', 'requestor_name',
        'device__device_name', 'device__device_code'
    )
    readonly_fields = ['ticket_number', 'created_at', 'updated_at', 'reviewed_at']
    # removed autocomplete_fields to avoid needing EmployeeLoginAdmin
    ordering = ['-created_at']

    fieldsets = (
        ('Ticket Information', {
            'fields': ('ticket_number', 'requestor', 'requestor_name', 'device', 'priority_level', 'category', 'problem_details', 'status')
        }),
        ('Review Information', {
            'fields': ('technician_name', 'diagnosis', 'action_taken', 'possible_reason', 'recommendation', 'reviewed_by', 'reviewed_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def device_display(self, obj):
        return f"{obj.device.device_name} ({obj.device.device_code})" if obj.device else "-"
    device_display.short_description = "Device"

    def requestor_display(self, obj):
        return f"{obj.requestor.full_name} ({obj.requestor.id})" if obj.requestor else "-"
    requestor_display.short_description = "Requestor"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('requestor', 'device', 'category', 'reviewed_by')
