from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('', views.leave_dashboard, name='user_leave'),
    
    # Employee views
    path('requests/', views.leave_requests_list, name='requests_list'),
    path('apply/', views.apply_leave, name='apply'),
    path('detail/<str:control_number>/', views.leave_detail, name='detail'),
    path('edit/<str:control_number>/', views.edit_leave, name='edit'),
    path('cancel/<str:control_number>/', views.cancel_leave, name='cancel'),
    
    # Approver views
    path('approvals/', views.approver_dashboard, name='approver_dashboard'),
    path('process/<str:control_number>/', views.process_approval, name='process_approval'),
    
    # Admin views
    path('admin/', views.admin_dashboard, name='admin_leave'),
    path('admin/detail/<str:control_number>/', views.admin_leave_detail, name='admin_leave_detail'),
    path('admin/approve/<str:control_number>/', views.admin_approve_leave, name='admin_approve_leave'),
    path('admin/disapprove/<str:control_number>/', views.admin_disapprove_leave, name='admin_disapprove_leave'),
    
    # HR Admin approval views
    path('admin/approval-detail/<str:control_number>/', views.hr_admin_approval_detail, name='hr_admin_approval_detail'),
    path('admin/process-approval/<str:control_number>/', views.hr_admin_process_approval, name='hr_admin_process_approval'),
    
    # AJAX endpoints
    path('ajax/balance/', views.get_leave_balance, name='get_leave_balance'),
    path('ajax/chart-data/', views.leave_chart_data, name='leave_chart_data'),
    path('ajax/approval-chart-data/', views.approval_chart_data, name='approval_chart_data'),
    path('ajax/admin-chart-data/', views.admin_chart_data, name='admin_chart_data'),
    path('ajax/search-approvals/', views.search_approvals_ajax, name='search_approvals_ajax'),

    # API endpoints
    path('api/leave-reasons/<int:leave_type_id>/', views.leave_reasons_api, name='leave_reasons_api'),
    path('api/holidays-and-exceptions/', views.holidays_and_exceptions_api, name='holidays_and_exceptions_api'),
    path('api/check-approver/', views.check_approver_api, name='check_approver_api'),
    
    # Export endpoints
    path('export-report/', views.export_leave_report, name='export_leave_report'),
    
    # Balance management endpoints
    path('balance/details/<int:balance_id>/', views.get_balance_details, name='get_balance_details'),
    path('balance/update/<int:balance_id>/', views.update_balance, name='update_balance'),
    path('balance/delete/<int:balance_id>/', views.delete_balance, name='delete_balance'),
    path('balance/download-template/', views.download_balance_template, name='download_balance_template'),
    path('balance/import/', views.import_balance, name='import_balance'),
]