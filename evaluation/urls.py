from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('', views.evaluation_dashboard, name='evaluation_dashboard'),
    
    # Admin/HR Management
    path('admin/', views.evaluation_admin_view, name='admin_evaluation'),
    path('create/', views.create_evaluation, name='create_evaluation'),
    path('export-tasklist-template/', views.export_tasklist_template, name='export_tasklist_template'),
    path('upload-tasklist/', views.upload_tasklist, name='upload_tasklist'),
    path('user/<int:user_id>/tasklists/', views.get_user_tasklists, name='get_user_tasklists'),
    path('user/<int:user_id>/tasklists/create/', views.create_tasklist_item, name='create_tasklist_item'),
    path('tasklist/<int:tasklist_id>/update/', views.update_tasklist_item, name='update_tasklist_item'),
    path('tasklist/<int:tasklist_id>/delete/', views.delete_tasklist_item, name='delete_tasklist_item'),
    # Evaluation detail and update for admin modal edit
    path('<int:evaluation_id>/detail/', views.get_evaluation_detail, name='get_evaluation_detail'),
    path('<int:evaluation_id>/update/', views.update_evaluation, name='update_evaluation'),
    path('<int:evaluation_id>/delete/', views.delete_evaluation, name='delete_evaluation'),
    
    # Employee Self-Evaluations
    path('users/', views.evaluation_user_view, name='user_evaluation'),
    
    # Evaluation Instance Actions
    path('instance/<int:instance_id>/', views.get_evaluation_instance, name='get_evaluation_instance'),
    path('instance/<int:instance_id>/view/', views.view_completed_evaluation, name='view_completed_evaluation'),
    path('submit/<int:employee_evaluation_id>/', views.submit_evaluation_instance, name='submit_evaluation_instance'),
]