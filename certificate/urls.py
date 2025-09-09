from django.urls import path
from . import views

urlpatterns = [
    path('', views.employee_dashboard, name='user_cert'),
    path('admin-certificate/', views.admin_cert, name='admin_cert'),
    path('admin-certificate/search/', views.admin_cert_search, name='admin_cert_search'),
    path('bulk-upload/', views.bulk_upload_certificates, name='bulk_upload'),
    path('employee-certificates/<int:employee_id>/', views.get_employee_certificates, name='employee_certificates'),
    path('mark-seen/<int:certificate_id>/', views.mark_certificate_seen, name='mark_seen'),
    path('mark_all_seen/', views.mark_all_certificates_seen, name='mark_all_certificates_seen'),
    path('delete/<int:certificate_id>/', views.delete_certificate, name='delete'),
    path('replace/<int:certificate_id>/', views.replace_certificate, name='replace'),
    path('email/<int:certificate_id>/', views.email_certificate, name='email'),
    path('view/<int:certificate_id>/', views.view_certificate, name='view'),
    path('get-certificate-details/<int:certificate_id>/', views.get_certificate_details, name='get_certificate_details'),
]