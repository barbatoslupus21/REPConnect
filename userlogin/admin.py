from django.contrib import admin
from .models import EmployeeLogin


@admin.register(EmployeeLogin)
class EmployeeLoginAdmin(admin.ModelAdmin):
	list_display = ['username', 'firstname', 'lastname', 'email', 'active']
	search_fields = ['username', 'firstname', 'lastname', 'email', 'idnumber']
	ordering = ['username']