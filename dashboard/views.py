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
from userlogin.models import EmployeeLogin

@login_required(login_url="user-login")
def overview(request):
    return render(request, 'dashboard/dashboard.html')
