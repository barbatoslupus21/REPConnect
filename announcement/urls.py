from django.urls import path
from . import views

urlpatterns = [
    path('', views.announcement_list, name='announcement_page'),
    path('create/', views.create_announcement, name='create'),
    path('update/<int:pk>/', views.update_announcement, name='update'),
    path('delete/<int:pk>/', views.delete_announcement, name='delete'),
    path('react/<int:pk>/', views.toggle_reaction, name='react'),
    path('reactors/<int:pk>/', views.get_announcement_reactors, name='reactors'),
    path('detail/<int:pk>/', views.get_announcement_detail, name='detail'),
]