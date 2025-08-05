from django.contrib import admin
from .models import Holiday, Timelogs, TodoItem
from userlogin.models import EmployeeLogin

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'holiday_type', 'created_by', 'created_at']
    list_filter = ['holiday_type', 'date', 'created_at']
    search_fields = ['name', 'description']
    date_hierarchy = 'date'
    ordering = ['-date']
    
    fieldsets = (
        ('Holiday Information', {
            'fields': ('name', 'date', 'holiday_type', 'description')  # Removed 'image'
        }),
        ('System Information', {
            'fields': ('created_by',),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

admin.site.register(Timelogs)
admin.site.register(TodoItem)