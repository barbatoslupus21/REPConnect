from django.urls import path
from . import views

urlpatterns = [
    path('', views.homepage, name='homepage'),
    path('login', views.userlogin, name='user-login'),
    path('logout', views.userlogout, name='user-logout'),
    path('register/', views.user_register, name='user-register'),
]
