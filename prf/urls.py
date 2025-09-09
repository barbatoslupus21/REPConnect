from django.urls import path
from . import views

urlpatterns = [
    path('', views.employee_prf_view, name='user_prf'),
    path('hradmin/', views.admin_dashboard, name='admin_prf'),
    path('submit/', views.submit_prf_request, name='submit_request'),
    path('get-types/', views.get_prf_types, name='get_types'),
    path('detail/<int:prf_id>/', views.get_prf_detail, name='get_detail'),
    path('hradmin/detail/<int:prf_id>/', views.get_admin_prf_detail, name='get_admin_detail'),
    path('hradmin/export/', views.export_prfs, name='export_prfs'),
    path('hradmin/bulk-delete/', views.bulk_delete_prfs, name='bulk_delete'),
    path('hradmin/chart-data/', views.get_chart_data_ajax, name='chart_data_ajax'),
    path('hradmin/table-data/', views.get_table_data_ajax, name='table_data_ajax'),
    path('admin/detail/<int:pk>/', views.admin_prf_detail, name='admin_prf_detail'),
    path('admin/process-action/', views.process_prf_action, name='process_prf_action'),
    path('cancel-prf/', views.cancel_prf_request, name='cancel_prf_request'),
    
    # Emergency Loan URLs
    path('emergency-loan/cutoff-choices/', views.get_cutoff_choices, name='get_cutoff_choices'),
    path('emergency-loan/check-existing/', views.check_existing_emergency_loan, name='check_existing_emergency_loan'),
    path('emergency-loan/submit/', views.submit_emergency_loan, name='submit_emergency_loan'),
    path('emergency-loan/details/<int:prf_id>/', views.get_emergency_loan_details, name='get_emergency_loan_details'),
]