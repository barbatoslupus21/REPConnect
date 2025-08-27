from django.urls import path
from . import views

urlpatterns = [
    # Dashboard URLs
    path('', views.survey_dashboard, name='survey_dashboard'),
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('user/', views.user_dashboard, name='user_dashboard'),
    
    # Survey Management URLs
    path('surveys/', views.survey_list, name='survey_list'),
    path('surveys/create/', views.create_survey, name='create_survey'),
    path('surveys/<int:survey_id>/edit/', views.edit_survey, name='edit_survey'),
    path('surveys/<int:survey_id>/detail/', views.survey_detail, name='survey_detail'),
    path('surveys/<int:survey_id>/duplicate/', views.duplicate_survey, name='duplicate_survey'),
    
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
    path('surveys/<int:survey_id>/analytics/', views.survey_analytics, name='survey_analytics'),
    
    # Draft Management URLs
    path('surveys/<int:survey_id>/draft/save/', views.save_draft, name='save_draft'),
    path('surveys/<int:survey_id>/draft/load/', views.load_draft, name='load_draft'),
    
    # Template Management URLs
    path('templates/', views.template_list, name='template_list'),
    path('templates/create/', views.create_template, name='create_template'),
    
    # Category Management URLs
    path('categories/', views.category_list, name='category_list'),
    path('categories/create/', views.create_category, name='create_category'),
    # AJAX: admin table refresh
    path('admin/table/', views.admin_table, name='admin_survey_table'),
]