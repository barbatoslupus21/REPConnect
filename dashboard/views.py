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
from userprofile.models import PersonalInformation, ContactPerson, EmploymentInformation, EducationalBackground

@login_required(login_url="user-login")
def overview(request):
    # Get recent announcements (last 10)
    announcements = Announcement.objects.filter(is_active=True).order_by('-created_at')[:10]
    
    # Add user reaction information and reactors data to each announcement
    announcement_data = []
    for announcement in announcements:
        user_reaction = None
        total_reactions = 0
        reactors = []
        
        try:
            # Get user's reaction
            reaction = announcement.reactions.filter(user=request.user).first()
            if reaction:
                user_reaction = reaction.emoji
            
            # Get total reactions count
            total_reactions = announcement.reactions.count()
            
            # Get reactors data for display
            if total_reactions > 0:
                reactors = announcement.reactions.select_related('user').order_by('-created_at')[:10]
                reactors = [
                    {
                        'name': f"{r.user.firstname or ''} {r.user.lastname or ''}".strip() or r.user.name or 'Unknown User',
                        'avatar': r.user.avatar.url if r.user.avatar and r.user.avatar.name != 'profile/avatar.svg' else None,
                        'reaction': r.emoji
                    }
                    for r in reactors
                ]
        except Exception as e:
            print(f"Error processing announcement {announcement.id}: {e}")
            pass
        
        # Create a dictionary with all the data
        announcement_data.append({
            'announcement': announcement,
            'user_reaction': user_reaction,
            'total_reactions': total_reactions,
            'reactors': reactors
        })
    
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
        'announcements': announcement_data,
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
    """Calculate profile completion percentage using group-based logic (personal, contact, employment, education).

    Mirrors the client-side logic in `user-profile.js` so dashboard shows the same percentage.
    """
    completed_groups = 0
    total_groups = 4  # personal, contact, employment, education

    # Personal information group
    try:
        p = getattr(user, 'personal_info', None)
        personal_required = [
            'gender', 'birth_date', 'birth_place', 'contact_number',
            'present_barangay', 'present_city', 'present_province', 'present_country',
            'provincial_barangay', 'provincial_city', 'provincial_province'
        ]
        personal_complete = False
        if p:
            missing = 0
            for field in personal_required:
                val = getattr(p, field, None)
                if val is None or (isinstance(val, str) and not val.strip()):
                    missing += 1
            # Consider personal group complete when none of the required fields are missing
            personal_complete = (missing == 0)
        else:
            personal_complete = False
        if personal_complete:
            completed_groups += 1
    except Exception:
        pass

    # Contact person group
    try:
        c = getattr(user, 'contact_person', None)
        contact_complete = False
        if c:
            if (getattr(c, 'name', None) and getattr(c, 'contact_number', None)):
                contact_complete = True
        if contact_complete:
            completed_groups += 1
    except Exception:
        pass

    # Employment information group
    try:
        e = getattr(user, 'employment_info', None)
        employment_complete = False
        if e:
            # require position, department (or line), employment_type, date_hired
            if (getattr(e, 'position', None) and getattr(e, 'employment_type', None) and getattr(e, 'date_hired', None)):
                employment_complete = True
        if employment_complete:
            completed_groups += 1
    except Exception:
        pass

    # Education group
    try:
        educ_qs = user.education.all() if hasattr(user, 'education') else None
        education_complete = bool(educ_qs and educ_qs.exists())
        if education_complete:
            completed_groups += 1
    except Exception:
        pass

    # Compute percentage
    percentage = round((completed_groups / total_groups) * 100) if total_groups > 0 else 0
    return int(percentage)
