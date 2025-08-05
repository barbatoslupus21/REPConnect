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
    
    # AJAX endpoints
    path('ajax/balance/', views.get_leave_balance, name='get_leave_balance'),
    path('ajax/chart-data/', views.leave_chart_data, name='leave_chart_data'),

    # API endpoints
    path('api/leave-reasons/<int:leave_type_id>/', views.leave_reasons_api, name='leave_reasons_api'),
    path('api/holidays-and-exceptions/', views.holidays_and_exceptions_api, name='holidays_and_exceptions_api'),
    path('api/check-approver/', views.check_approver_api, name='check_approver_api'),
]