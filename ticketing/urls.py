from django.urls import path
from . import views

urlpatterns = [
    # Dashboard views
    path('', views.mis_user_dashboard, name='user_ticket'),
    path('admin/', views.mis_admin_dashboard, name='admin_ticket'),
    
    # Device endpoints
    path('device/add/', views.add_device, name='add_device'),
    path('device/<int:device_id>/details/', views.get_device_details, name='get_device_details'),
    path('device/<int:device_id>/update/', views.update_device, name='update_device'),
    path('device/<int:device_id>/delete/', views.delete_device, name='delete_device'),
    path('device/<int:device_id>/history/', views.device_ticket_history, name='device_ticket_history'),
    path('device/<int:device_id>/export-history/', views.export_device_history, name='export_device_history'),
    
    # Ticket endpoints
    path('ticket/create/', views.create_ticket, name='create_ticket'),
    path('ticket/<int:ticket_id>/details/', views.get_ticket_details, name='get_ticket_details'),
    path('ticket/<int:ticket_id>/update/', views.update_ticket, name='update_ticket'),
    path('ticket/<int:ticket_id>/cancel/', views.cancel_ticket, name='cancel_ticket'),
    path('ticket/<int:ticket_id>/review/', views.review_ticket, name='review_ticket'),
    path('ticket/<int:ticket_id>/print/', views.print_ticket_pdf, name='print_ticket_pdf'),
    
    # Export endpoints
    path('export/tickets/', views.export_tickets_report, name='export_tickets_report'),
    
    # Utility endpoints
    path('form-options/', views.get_form_options, name='get_form_options'),
]