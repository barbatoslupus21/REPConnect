from django.urls import path
from . import views

urlpatterns = [
    # User views
    path('', views.training_dashboard, name='training_dashboard'),
    path('users/', views.training_user_view, name='user_training_evaluation'),
    
    # Training evaluation endpoints
    path('evaluation/<int:training_id>/', views.get_training_evaluation, name='get_evaluation'),
    path('evaluation/view/<int:training_id>/', views.view_submitted_evaluation, name='view_submitted_evaluation'),
    path('evaluation/submit/<int:evaluation_id>/', views.submit_training_evaluation, name='submit_evaluation'),
    path('evaluation/confirm/<int:training_id>/', views.confirm_evaluation, name='confirm_evaluation'),
    
    # Supervisor assessment endpoints
    path('supervisor/evaluation/<int:evaluation_id>/', views.get_subordinate_evaluation, name='get_subordinate_evaluation'),
    path('supervisor/assessment/submit/<int:assessment_id>/', views.submit_supervisor_assessment, name='submit_supervisor_assessment'),
    
    # Manager review endpoints
    path('manager/evaluation/<int:evaluation_id>/', views.get_manager_review_evaluation, name='get_manager_review_evaluation'),
    path('manager/review/submit/<int:routing_id>/', views.submit_manager_review, name='submit_manager_review'),
    
    # Admin views
    path('admin/', views.training_admin_view, name='admin_training_evaluation'),
    path('admin/search/', views.ajax_search_trainings, name='ajax_search_trainings'),
    path('admin/participants/', views.get_participants, name='get_participants'),
    path('admin/training/create/', views.create_training, name='create_training'),
    path('admin/training/<int:training_id>/', views.get_training_details, name='get_training_details'),
    path('admin/training/<int:training_id>/delete/', views.delete_training, name='delete_training'),
    path('admin/evaluation/<int:evaluation_id>/', views.get_evaluation_details, name='get_evaluation_details'),
    path('admin/training/<int:training_id>/details/', views.training_details_page, name='training_details_page'),
    path('admin/training/<int:training_id>/export/', views.export_training_report, name='export_training_report'),
]