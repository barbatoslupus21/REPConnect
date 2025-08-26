from django.urls import path
from . import views

urlpatterns = [
    path('', views.feedback_list, name='feedback_list'),
    path('submit/', views.submit_feedback, name='submit_feedback'),
    path('detail/<int:feedback_id>/', views.feedback_detail, name='feedback_detail'),
    path('export/', views.export_feedback, name='export_feedback'),
]