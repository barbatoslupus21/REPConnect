from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError
from django.utils.decorators import method_decorator
from django.views import View
from django.conf import settings
import json
import re
from .models import EmployeeLogin

@login_required(login_url="user-login")
def homepage(request):
    if request.user.is_authenticated:
        return redirect('overview')
    return render(request, 'userlogin/frontpage.html')

def userlogin(request):
    if request.user.is_authenticated:
        return redirect('overview')

    context = {}

    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        try:
            user = EmployeeLogin.objects.get(username=username)
            if user.status != 'approved':
                messages.error(request, 'Your account is not yet approved and is still in the reviewing process.')
                context['login_modal'] = True
                return render(request, 'userlogin/frontpage.html', context)
        except EmployeeLogin.DoesNotExist:
            messages.error(request, 'User does not exist.')
            context['login_modal'] = True

        userLogin = authenticate(request, username=username, password=password)

        if userLogin is not None:
            login(request, userLogin)
            return redirect('overview')
        else:
            messages.error(request, "Login credentials are incorrect.")
            context['login_modal'] = True

    return render(request, 'userlogin/frontpage.html', context)

def userlogout(request):
    logout(request)
    return redirect('homepage')

def user_register(request):
    context = {}
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        idnumber = request.POST.get('idnumber')
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')

        password_errors = []
        if password:
            if len(password) < 6:
                password_errors.append('At least 6 characters')
            if not any(c.isupper() for c in password):
                password_errors.append('At least one uppercase letter')
            if not any(c.islower() for c in password):
                password_errors.append('At least one lowercase letter')
            if not any(c.isdigit() for c in password):
                password_errors.append('At least one number')
            if not any(not c.isalnum() for c in password):
                password_errors.append('At least one special character')

        # Basic validation
        if not all([first_name, last_name, idnumber, username, email, password, confirm_password]):
            context['register_error'] = 'All fields are required.'
        elif password != confirm_password:
            context['register_error'] = 'Passwords do not match.'
        elif password_errors:
            context['register_error_list'] = password_errors
        elif EmployeeLogin.objects.filter(firstname=first_name, lastname=last_name).exists():
            context['register_error'] = 'User already has an existing account.'
        elif EmployeeLogin.objects.filter(email=email).exists():
            context['register_error'] = 'Email has already been used in an account.'
        elif EmployeeLogin.objects.filter(idnumber=idnumber).exists():
            context['register_error'] = 'ID number has already exist.'
        else:
            try:
                validate_email(email)
                user = EmployeeLogin.objects.create_user(username=username, email=email, password=password)
                user.first_name = first_name
                user.last_name = last_name
                user.idnumber = idnumber
                user.save()
                context['confirmation_modal'] = True
                return render(request, 'userlogin/frontpage.html', context)
            except ValidationError:
                context['register_error'] = 'Invalid email address.'
            except IntegrityError:
                context['register_error'] = 'Username or email already exists.'
            except Exception as e:
                context['register_error'] = 'Registration failed. Please try again.'
        context['register_modal'] = True
        return render(request, 'userlogin/frontpage.html', context)
    else:
        context['register_modal'] = True
        return render(request, 'userlogin/frontpage.html', context)

# def error_404_view(request, exception):
#     return render(request, '404.html', status=404)


# def error_500_view(request):
#     return render(request, '500.html', status=500)