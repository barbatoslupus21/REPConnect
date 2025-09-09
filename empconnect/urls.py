from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls import handler404, handler500

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('userlogin.urls')),
    path('overview/', include('dashboard.urls')),
    path('calendar/', include('usercalendar.urls')),
    path('prf/',include('prf.urls')),
    path('notification/',include('notification.urls')),
    path('certificate/', include('certificate.urls')),
    path('profile/', include('userprofile.urls')),
    path('general-settings/', include('generalsettings.urls')),
    path('api/', include('generalsettings.urls')),
    path('finance/', include('finance.urls')),
    path('leave/', include('leaverequest.urls')),
    path('ticket/', include('ticketing.urls')),
    path('announcement/', include('announcement.urls')),
    path('feedback/', include('feedback.urls')), 
    path('survey/', include('survey.urls')),
    path('training/', include('training.urls')),
    path('evaluation/', include('evaluation.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # handler404 = 'userlogin.views.error_404_view'
    # handler500 = 'userlogin.views.error_500_view