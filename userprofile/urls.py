from django.urls import path
from . import views
from .views import api_export_filters, export_employees, api_lines

urlpatterns = [
    path('', views.profile_view, name='user_profile'),
    path('admin/employees/', views.admin_employees, name='admin_employees'),
    path('update-personal/', views.update_personal_info, name='update_personal_info'),
    path('update-employment/', views.update_employment_info, name='update_employment_info'),
    path('add-education/', views.add_education, name='add_education'),
    path('update-education/<int:education_id>/', views.update_education, name='update_education'),
    path('delete-education/<int:education_id>/', views.delete_education, name='delete_education'),
    path('admin/employee/<int:employee_id>/', views.admin_view_employee, name='admin_view_employee'),
    path('admin/employee/<int:employee_id>/update/', views.admin_update_employee, name='admin_update_employee'),
    path('admin/create-employee/', views.admin_create_employee, name='admin_create_employee'),
    path('admin/employee/<int:employee_id>/deactivate/', views.admin_deactivate_employee, name='admin_deactivate_employee'),
    path('admin/employee/<int:employee_id>/activate/', views.admin_activate_employee, name='admin_activate_employee'),
    path('admin/employee/<int:employee_id>/lock/', views.admin_lock_employee, name='admin_lock_employee'),
    path('admin/employee/<int:employee_id>/unlock/', views.admin_unlock_employee, name='admin_unlock_employee'),
    path('admin/employee/<int:employee_id>/delete/', views.admin_delete_employee, name='admin_delete_employee'),
    path('admin/employee/<int:employee_id>/reset-password/', views.admin_reset_password, name='admin_reset_password'),
    path('update-profile-section/', views.update_profile_section, name='update_profile_section'),
    path('api/provinces/', views.api_provinces, name='api_provinces'),
    path('api/cities/', views.api_cities, name='api_cities'),
    path('api/approvers/', views.api_approvers, name='api_approvers'),
    path('api/line-leaders/', views.api_line_leaders, name='api_line_leaders'),
    path('download-employee-template/', views.download_employee_template, name='download_employee_template'),
    path('import-employees/', views.import_employees, name='import_employees'),
    path('import-progress/<str:import_id>/', views.import_progress, name='import_progress'),
    path('admin/employee/<int:employee_id>/approve/', views.admin_approve_employee, name='admin_approve_employee'),
    path('admin/employee/<int:employee_id>/disapprove/', views.admin_disapprove_employee, name='admin_disapprove_employee'),
    path('change-password', views.change_password, name='change_password'),
    path('api/change-password/', views.api_change_password, name='api_change_password'),
]

urlpatterns += [
    path('api/export-filters/', api_export_filters, name='api_export_filters'),
    path('api/lines/', api_lines, name='api_lines'),
    path('export-employees/', export_employees, name='export_employees'),
]