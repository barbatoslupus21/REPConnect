
from .views import ajax_employee_payslips
from django.urls import path
from . import views

urlpatterns = [
    path('loan/delete/<int:loan_id>/', views.delete_loan, name='delete_loan'),
    path('export/', views.export_finance_report, name='export_finance_report'),
    path('export/employee-total-loans/', views.export_employee_total_loans, name='export_employee_total_loans'),
    path('export/employee-savings/', views.export_employee_savings_report, name='export_employee_savings_report'),
    path('export/total-ojt-allowances/', views.export_total_ojt_allowances_report, name='export_total_ojt_allowances_report'),
    path('allowance/delete/<int:allowance_id>/', views.delete_allowance, name='delete_allowance'),
    path('employee/<int:employee_id>/ajax-payslips/', ajax_employee_payslips, name='ajax_employee_payslips'),
    path('', views.user_finance, name='user_finance'),
    
    path('admin/', views.finance_dashboard, name='admin_finance'),
    path('payslips/ojt/upload/', views.ojt_payslip_upload, name='ojt_payslip_upload'),
    path('ojt-payslip/<int:payslip_id>/details/', views.ojt_payslip_details, name='ajax_ojt_payslip_details'),
    path('ajax/ojt-payslip-details/<int:payslip_id>/', views.ajax_ojt_payslip_details, name='ajax_ojt_payslip_details_new'),
    path('ojt-payslip/send/<int:payslip_id>/', views.send_ojt_payslip_email, name='send_ojt_payslip_email'),
    path('payslips/upload/', views.regular_payslip_upload, name='upload_payslip'),
    path('payslip/send/<int:payslip_id>/', views.send_payslip, name='send_payslip'),
    path('payslip/delete/<int:payslip_id>/', views.delete_payslip, name='delete_payslip'),

    path('loans/export/principal-template/', views.export_loan_principal_template, name='export_loan_principal_template'),
    path('loans/export/deduction-template/', views.export_loan_deduction_template, name='export_loan_deduction_template'),
    path('loans/upload/principal/', views.loan_principal_upload, name='loan_principal_upload'),
    path('loans/upload/deduction/', views.loan_deduction_upload, name='loan_deduction_upload'),

    path('allowances/upload/', views.allowances_upload, name='allowances_upload'),
    path('allowances/export/template/', views.export_allowance_template, name='export_allowance_template'),

    path('savings/upload/', views.savings_upload, name='savings_upload'),
    path('savings/export/template/', views.export_savings_template, name='export_savings_template'),
    path('savings/withdraw/<int:savings_id>/', views.withdraw_savings, name='withdraw_savings'),


    path('employees/', views.employees_list, name='employees_list'),
    path('employee/<int:employee_id>/allowances/', views.employee_allowances, name='employee_allowances'),
    path('employee/<int:employee_id>/details/', views.employee_finance_details, name='employee_finance_details'),
    path('chart-data/', views.chart_data, name='chart_data'),
    path('filter-options/', views.filter_options, name='filter_options'),
    path('employee-table/', views.employee_table_partial, name='employee_table_partial'),
    path('employee-details/<int:employee_id>/', views.employee_details, name='employee_details'),
    path('template/ojt_payslip/', views.ojt_payslip_template, name='ojt_payslip_template'),
    path('loan/<int:loan_id>/deductions/', views.loan_deductions_list, name='loan_deductions_list'),
    path('payslips/failed-uploads/download/', views.download_failed_payslips, name='download_failed_payslips'),
]