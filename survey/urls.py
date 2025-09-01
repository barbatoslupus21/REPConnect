from django.urls import path
from . import views

urlpatterns = [
    # Dashboard URLs
    path('', views.survey_dashboard, name='survey_dashboard'),
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/table/', views.admin_table, name='admin_table'),
    path('user/', views.user_dashboard, name='user_dashboard'),
    
    # Survey Management URLs
    path('surveys/', views.survey_list, name='survey_list'),
    path('surveys/create/', views.create_survey, name='create_survey'),
    path('surveys/<int:survey_id>/edit/', views.edit_survey, name='edit_survey'),
    path('surveys/<int:survey_id>/json/', views.survey_json, name='survey_json'),
    path('surveys/<int:survey_id>/detail/', views.survey_detail, name='survey_detail'),
    path('surveys/<int:survey_id>/stats/', views.survey_stats, name='survey_stats'),
    path('surveys/<int:survey_id>/chart-data/status/', views.survey_chart_status, name='survey_chart_status'),
    path('surveys/<int:survey_id>/chart-data/timeline/', views.survey_chart_timeline, name='survey_chart_timeline'),
    path('surveys/<int:survey_id>/question-analysis/', views.survey_question_analysis, name='survey_question_analysis'),
    path('surveys/<int:survey_id>/responses-data/', views.survey_responses_data, name='survey_responses_data'),
    path('surveys/<int:survey_id>/details/json/', views.survey_details_json, name='survey_details_json'),
    path('surveys/<int:survey_id>/respondents/json/', views.survey_respondents_json, name='survey_respondents_json'),
    path('surveys/<int:survey_id>/duplicate/', views.duplicate_survey, name='duplicate_survey'),
    path('surveys/<int:survey_id>/delete/', views.delete_survey, name='delete_survey'),

    # API endpoints for AJAX requests
    path('surveys/<int:survey_id>/stats/', views.survey_stats, name='survey_stats'),
    path('surveys/<int:survey_id>/chart-data/<str:chart_type>/', views.survey_chart_data, name='survey_chart_data'),
    path('surveys/<int:survey_id>/question-analysis/', views.survey_question_analysis, name='survey_question_analysis'),
    path('surveys/<int:survey_id>/responses-data/', views.survey_responses_data, name='survey_responses_data'),
    path('surveys/<int:survey_id>/response/<int:user_id>/', views.survey_response_detail, name='survey_response_detail'),
    path('surveys/<int:survey_id>/export/', views.export_survey_report, name='export_survey_report'),
    
    # Survey Taking URLs
    path('surveys/<int:survey_id>/take/', views.take_survey, name='take_survey'),
    path('responses/<int:response_id>/view/', views.view_response, name='view_response'),
    
    # Question Management URLs
    path('surveys/<int:survey_id>/questions/add/', views.add_question, name='add_question'),
    path('questions/<int:question_id>/update/', views.update_question, name='update_question'),
    path('questions/<int:question_id>/delete/', views.delete_question, name='delete_question'),
    path('surveys/<int:survey_id>/questions/reorder/', views.reorder_questions, name='reorder_questions'),
    
    # Export and Analytics URLs
    path('surveys/<int:survey_id>/export/', views.export_survey_responses, name='export_survey_responses'),
    path('surveys/<int:survey_id>/export-excel/', views.export_survey_excel_detailed, name='export_survey_excel_detailed'),
    path('surveys/<int:survey_id>/analytics/', views.survey_analytics, name='survey_analytics'),
    
    # Draft Management URLs
    path('surveys/<int:survey_id>/draft/save/', views.save_draft, name='save_draft'),
    path('surveys/<int:survey_id>/draft/load/', views.load_draft, name='load_draft'),
    
    # Template Management URLs
    path('templates/', views.template_list, name='template_list'),
    path('templates/create/', views.create_template, name='create_template'),
    path('templates/<int:template_id>/edit/', views.create_template, name='edit_template'),
    path('templates/<int:template_id>/delete/', views.delete_template, name='delete_template'),
    
    # Category Management URLs
    path('categories/', views.category_list, name='category_list'),
    path('categories/create/', views.create_category, name='create_category'),
    
    # Survey preview and details for users
    path('surveys/<int:survey_id>/preview/', views.survey_preview, name='survey_preview'),
    path('surveys/<int:survey_id>/preview/json/', views.survey_preview_json, name='survey_preview_json'),
    path('surveys/<int:survey_id>/details/', views.survey_details, name='survey_details'),
    path('surveys/<int:survey_id>/my-response/', views.user_survey_response, name='user_survey_response'),
    path('surveys/<int:survey_id>/take/', views.take_survey, name='take_survey'),
]




