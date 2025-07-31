from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.calendar_view, name='calendar_view'),
    path('add-holiday/', views.add_holiday, name='add_holiday'),
    path('api/holidays/', views.get_holidays_api, name='get_holidays_api'),
    path('edit-holiday/<int:pk>/', views.edit_holiday, name='edit_holiday'),
    path('delete-holiday/<int:pk>/', views.delete_holiday, name='delete_holiday'),
    path('api/todos/', views.get_todos_api, name='get_todos_api'),
    path('api/todos/add/', views.add_todo_api, name='add_todo_api'),
    path('api/todos/toggle/', views.toggle_todo_api, name='toggle_todo_api'),
    path('api/timelogs/', views.get_timelogs_api, name='get_timelogs_api'),

    # TIME LOGS
    path('timelogs/', views.timelogs_page, name='timelogs_page'),
    
    path('timelogs/employees/', views.get_employees_with_timelogs, name='get_employees_with_timelogs'),
    path('timelogs/import/', views.import_timelogs, name='import_timelogs'),
    path('timelogs/export-template/', views.export_template, name='export_template'),
    
    path('timelogs/add/', views.add_timelog, name='add_timelog'),
    path('timelogs/user/<int:timelog_id>/', views.get_timelog, name='get_timelog'),
    path('timelogs/user/<int:timelog_id>/update/', views.update_timelog, name='update_timelog'),
    path('timelogs/user/<int:timelog_id>/delete/', views.delete_timelog, name='delete_timelog'),
]
