from django.urls import path
from . import views

urlpatterns = [
    path('', views.notification_list, name='notification_view'),
    path('api/mark-read/<int:notification_id>/', views.api_mark_notification_read, name='api_mark_notification_read'),

]
