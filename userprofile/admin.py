from django.contrib import admin
from .models import PersonalInformation, ContactPerson, EducationalBackground, FamilyBackground, EmploymentInformation

@admin.register(PersonalInformation)
class PersonalInformationAdmin(admin.ModelAdmin):
    list_display = ['user', 'gender', 'birth_date', 'contact_number']
    list_filter = ['gender', 'created_at']
    search_fields = ['user__firstname', 'user__lastname', 'user__email']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(ContactPerson)
class ContactPersonAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'relationship', 'contact_number']
    list_filter = ['relationship', 'created_at']
    search_fields = ['user__firstname', 'user__lastname', 'name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(EducationalBackground)
class EducationalBackgroundAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'school_name', 'year_graduated']
    list_filter = ['level', 'year_graduated', 'created_at']
    search_fields = ['user__firstname', 'user__lastname', 'school_name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(FamilyBackground)
class FamilyBackgroundAdmin(admin.ModelAdmin):
    list_display = ['user', 'mother_name', 'father_name', 'spouse_name']
    search_fields = ['user__firstname', 'user__lastname', 'mother_name', 'father_name']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(EmploymentInformation)
class EmploymentInformationAdmin(admin.ModelAdmin):
    list_display = ['user', 'position', 'department', 'line', 'approver', 'line_leader', 'employment_type', 'date_hired']
    list_filter = ['employment_type', 'department', 'line', 'date_hired', 'created_at']
    search_fields = ['user__firstname', 'user__lastname']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user', 'approver', 'line_leader']
    
    fieldsets = (
        ('Employee', {
            'fields': ('user',)
        }),
        ('Position & Department', {
            'fields': ('position', 'department', 'line')
        }),
        ('Management', {
            'fields': ('approver', 'line_leader')
        }),
        ('Employment Details', {
            'fields': ('employment_type', 'date_hired')
        }),
        ('Government IDs', {
            'fields': ('tin_number', 'sss_number', 'hdmf_number', 'philhealth_number')
        }),
        ('Banking', {
            'fields': ('bank_account',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'position', 'department', 'line', 'approver', 'line_leader'
        )