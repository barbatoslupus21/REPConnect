from django.urls import path
from . import views

urlpatterns = [
    path('departments/', views.api_departments, name='api_departments'),
    path('lines/', views.api_lines, name='api_lines'),
    path('positions/', views.api_positions, name='api_positions'),
]
