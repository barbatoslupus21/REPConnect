from django.urls import path
from . import views

urlpatterns = [
    path('', views.settings_view, name='settings_view'),
    
    # API endpoints for lines
    path('api/lines/', views.api_lines, name='api_lines'),
    path('api/lines/<int:line_id>/', views.api_line_detail, name='api_line_detail'),
    
    # API endpoints for departments
    path('api/departments/', views.api_departments, name='api_departments'),
    path('api/departments/<int:dept_id>/', views.api_department_detail, name='api_department_detail'),
    path('api/departments/<int:dept_id>/lines/', views.api_department_lines, name='api_department_lines'),
    path('api/departments/<int:dept_id>/lines/<int:line_id>/', views.api_department_line_detail, name='api_department_line_detail'),
    
    # API endpoints for positions
    path('api/positions/', views.api_positions, name='api_positions'),
    path('api/positions/<int:pos_id>/', views.api_position_detail, name='api_position_detail'),
    
    # API endpoints for finance (LoanType, AllowanceType, OJTRate)
    path('api/loantypes/', views.api_loantypes, name='api_loantypes'),
    path('api/loantypes/<int:loantype_id>/', views.api_loantype_detail, name='api_loantype_detail'),
    
    path('api/allowancetypes/', views.api_allowancetypes, name='api_allowancetypes'),
    path('api/allowancetypes/<int:allowancetype_id>/', views.api_allowancetype_detail, name='api_allowancetype_detail'),
    
    path('api/ojtrates/', views.api_ojtrates, name='api_ojtrates'),
    path('api/ojtrates/<int:ojtrate_id>/', views.api_ojtrate_detail, name='api_ojtrate_detail'),
    path('api/ojtrates/<int:ojtrate_id>/rates/', views.api_ojtrate_rates, name='api_ojtrate_rates'),
]
