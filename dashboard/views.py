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
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
import json
import re
from userlogin.models import EmployeeLogin
from announcement.models import Announcement, AnnouncementReaction
from notification.models import Notification
from usercalendar.models import Holiday
from leaverequest.models import LeaveRequest
from ticketing.models import Ticket
from userprofile.models import PersonalInformation

@login_required(login_url="user-login")
def overview(request):
    # Get recent announcements (last 10)
    announcements = Announcement.objects.filter(is_active=True).order_by('-created_at')[:10]
    
    # Add user reaction information to each announcement
    for announcement in announcements:
        announcement.user_reaction = None
        try:
            reaction = announcement.reactions.filter(user=request.user).first()
            if reaction:
                announcement.user_reaction = reaction.emoji
        except:
            pass
    
    # Get recent notifications for the user (last 10)
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by('-created_at')[:10]
    
    # Get current month holidays
    today = timezone.now().date()
    start_of_month = today.replace(day=1)
    if today.month == 12:
        end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    
    holidays = Holiday.objects.filter(
        date__range=[start_of_month, end_of_month]
    ).order_by('date')
    
    # Calculate statistics
    total_employees = EmployeeLogin.objects.filter(is_active=True).count()
    
    # Present today (assuming timelogs exist)
    present_today = 0  # This would need timelog implementation
    
    # Open tickets
    open_tickets = Ticket.objects.filter(
        status__in=['New', 'In Progress', 'Pending']
    ).count() if hasattr(Ticket, 'status') else 0
    
    # Pending leaves
    pending_leaves = LeaveRequest.objects.filter(
        status='routing'
    ).count()
    
    # Get upcoming leaves for current user (next 30 days)
    upcoming_leaves = LeaveRequest.objects.filter(
        employee=request.user,
        status='approved',
        date_from__gte=today,
        date_from__lte=today + timedelta(days=30)
    ).order_by('date_from')[:5]
    
    # Calculate profile completion percentage
    profile_completion = calculate_profile_completion(request.user)
    
    # Get time-based greeting and user birthday info
    current_hour = timezone.now().hour
    if 0 <= current_hour < 12:
        time_greeting = "morning"
        time_icon = "sun"
    elif 12 <= current_hour <= 18:
        time_greeting = "afternoon"
        time_icon = "sun"
    else:
        time_greeting = "evening"
        time_icon = "moon"
    
    # Check if today is user's birthday
    is_birthday = False
    try:
        if hasattr(request.user, 'personal_info') and request.user.personal_info.birth_date:
            user_birthday = request.user.personal_info.birth_date
            today_date = timezone.now().date()
            if (user_birthday.month == today_date.month and 
                user_birthday.day == today_date.day):
                is_birthday = True
    except:
        pass
    
    context = {
        'announcements': announcements,
        'notifications': notifications,
        'holidays': holidays,
        'total_employees': total_employees,
        'present_today': present_today,
        'open_tickets': open_tickets,
        'pending_leaves': pending_leaves,
        'upcoming_leaves': upcoming_leaves,
        'profile_completion': profile_completion,
        'emoji_choices': AnnouncementReaction.EMOJI_CHOICES,
        'time_greeting': time_greeting,
        'time_icon': time_icon,
        'is_birthday': is_birthday,
    }
    
    return render(request, 'dashboard/dashboard.html', context)

def calculate_profile_completion(user):
    """Calculate profile completion percentage"""
    total_fields = 0
    completed_fields = 0
    
    # Basic required fields
    fields_to_check = [
        'firstname', 'lastname', 'email', 'idnumber'
    ]
    
    for field in fields_to_check:
        total_fields += 1
        value = getattr(user, field, None)
        if value and str(value).strip():
            completed_fields += 1
    
    # Avatar check
    total_fields += 1
    if user.avatar and user.avatar.name != 'profile/avatar.svg':
        completed_fields += 1
    
    # Calculate percentage
    if total_fields == 0:
        return 0
    
    percentage = (completed_fields / total_fields) * 100
    return round(percentage)
