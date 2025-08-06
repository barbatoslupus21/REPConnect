from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.http import require_POST
import json
from userlogin.models import EmployeeLogin
from .models import LeaveRequest, LeaveType, LeaveBalance, LeaveApprovalAction, LeaveReason
from .forms import LeaveRequestForm, LeaveApprovalForm, LeaveSearchForm

@login_required
def leave_dashboard(request):
    user = request.user

    recent_leaves = LeaveRequest.objects.filter(employee=user).order_by('-date_prepared')[:4]
    leave_balances = LeaveBalance.objects.filter(employee=user).select_related('leave_type').order_by('valid_from', 'leave_type__name')
    leave_types = LeaveType.objects.filter(is_active=True).order_by('name')
    leave_reasons = LeaveReason.objects.filter(is_active=True).select_related('leave_type').order_by('leave_type__name', 'reason_text')

    from collections import defaultdict
    balance_sets = defaultdict(list)
    for balance in leave_balances:
        key = (balance.valid_from, balance.valid_to)
        balance_sets[key].append(balance)

    grouped_balances = []
    for k, v in balance_sets.items():
        total_entitled = sum(balance.entitled for balance in v)
        total_used = sum(balance.used for balance in v)
        total_remaining = sum(balance.remaining for balance in v)
        
        grouped_balances.append({
            'valid_from': k[0],
            'valid_to': k[1],
            'balances': v,
            'total_entitled': total_entitled,
            'total_used': total_used,
            'total_remaining': total_remaining
        })
    
    grouped_balances.sort(key=lambda x: x['valid_from'], reverse=True)
    approval_actions = LeaveApprovalAction.objects.filter(approver=user, status='routing').select_related('leave_request').order_by('-created_at')
    pending_approvals = [action.leave_request for action in approval_actions]

    all_requests = LeaveRequest.objects.filter(employee=user).order_by('-date_prepared')
    paginator = Paginator(all_requests, 10)
    page = request.GET.get('page')
    my_requests_page_obj = paginator.get_page(page)

    context={
        'leave_types': leave_types,
        'leave_reasons': leave_reasons,
        'leave_balance_sets': grouped_balances,
        'pending_approvals': pending_approvals,
        'is_approver': bool(pending_approvals),
        'recent_leaves': recent_leaves,
        'my_requests_page_obj': my_requests_page_obj,
        'today': timezone.now().date(),
    }

    return render(request, 'leaverequest/user-leave.html', context)

@login_required
def leave_requests_list(request):
    """List all leave requests for the current user"""
    search_form = LeaveSearchForm(request.GET)
    leave_requests = LeaveRequest.objects.filter(employee=request.user)
    
    # Apply filters
    if search_form.is_valid():
        if search_form.cleaned_data['search']:
            search_term = search_form.cleaned_data['search']
            leave_requests = leave_requests.filter(
                Q(control_number__icontains=search_term) |
                Q(reason__icontains=search_term)
            )
        
        if search_form.cleaned_data['status']:
            leave_requests = leave_requests.filter(status=search_form.cleaned_data['status'])
        
        if search_form.cleaned_data['leave_type']:
            leave_requests = leave_requests.filter(leave_type=search_form.cleaned_data['leave_type'])
        
        if search_form.cleaned_data['date_from']:
            leave_requests = leave_requests.filter(date_from__gte=search_form.cleaned_data['date_from'])
        
        if search_form.cleaned_data['date_to']:
            leave_requests = leave_requests.filter(date_to__lte=search_form.cleaned_data['date_to'])
    
    # Pagination
    paginator = Paginator(leave_requests.order_by('-date_prepared'), 10)
    page = request.GET.get('page')
    leave_requests = paginator.get_page(page)
    
    context = {
        'leave_requests': leave_requests,
        'search_form': search_form,
        'page_title': 'My Leave Requests'
    }
    
    return render(request, 'leaverequest/requests_list.html', context)

@login_required
def apply_leave(request):
    if request.method == 'POST':
        form = LeaveRequestForm(request.POST, request.FILES, user=request.user)
        if form.is_valid():
            leave_request = form.save(commit=False)
            leave_request.employee = request.user
            
            approver = None
            approval_comments = ""
            
            notice_days = (leave_request.date_from - timezone.now().date()).days
            
            # Rule 1: Urgent leave (< 1 day notice, non-clinic) → IAD Admin
            if not leave_request.leave_type.go_to_clinic and notice_days < 1:
                iad_admin = EmployeeLogin.objects.filter(iad_admin=True, is_active=True).first()
                if iad_admin:
                    approver = iad_admin
                else:
                    hr_manager = EmployeeLogin.objects.filter(hr_manager=True, is_active=True).first()
                    if hr_manager:
                        approver = hr_manager
                    else:
                        hr_admin = EmployeeLogin.objects.filter(hr_admin=True, is_active=True).first()
                        approver = hr_admin
            
            # Rule 2: Regular leave (≥ 1 day notice, non-clinic) → Employee's approver
            elif not leave_request.leave_type.go_to_clinic and notice_days >= 1:
                try:
                    employment_info = request.user.employment_info
                    if employment_info.approver and employment_info.approver.is_active:
                        approver = employment_info.approver
                    else:
                        error_msg = 'You do not have an assigned approver. Please assign an approver before submitting leave requests.'
                        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                            return JsonResponse({'success': False, 'message': error_msg})
                        messages.error(request, error_msg)
                        return redirect('user_leave')
                except:
                    error_msg = 'Your employment information is incomplete. Please contact HR to complete your profile before submitting leave requests.'
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return JsonResponse({'success': False, 'message': error_msg})
                    messages.error(request, error_msg)
                    return redirect('user_leave')
            
            # Rule 3: Clinic leave (go_to_clinic = True) → Clinic Admin
            elif leave_request.leave_type.go_to_clinic:
                clinic_admin = EmployeeLogin.objects.filter(clinic_admin=True, is_active=True).first()
                if clinic_admin:
                    approver = clinic_admin
                else:
                    hr_manager = EmployeeLogin.objects.filter(hr_manager=True, is_active=True).first()
                    if hr_manager:
                        approver = hr_manager
                    else:
                        hr_admin = EmployeeLogin.objects.filter(hr_admin=True, is_active=True).first()
                        approver = hr_admin
            
            # Final fallback to HR manager or HR admin if no approver found
            if not approver:
                hr_manager = EmployeeLogin.objects.filter(hr_manager=True, is_active=True).first()
                if hr_manager:
                    approver = hr_manager
                else:
                    hr_admin = EmployeeLogin.objects.filter(hr_admin=True, is_active=True).first()
                    approver = hr_admin
            
            # If still no approver found, show error
            if not approver:
                messages.error(request, 'No available approver found. Please assign your supervisor as approver.')
                return redirect('user_leave')
            
            leave_request.current_approver = approver
            leave_request.save()
            
            LeaveApprovalAction.objects.create(
                leave_request=leave_request,
                approver=approver,
                sequence=1,
                status='routing',
                action='submitted',
                comments=approval_comments,
                action_at=timezone.now()
            )
            
            messages.success(request, f'Leave request {leave_request.control_number} submitted successfully!')
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Leave request {leave_request.control_number} submitted successfully!',
                    'control_number': leave_request.control_number
                })
            
            return redirect('user_leave')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                error_messages = []
                for field, errors in form.errors.items():
                    if field == '__all__':
                        error_messages.extend(errors)
                    else:
                        field_name = form.fields[field].label or field.replace('_', ' ').title()
                        for error in errors:
                            error_messages.append(f"{field_name}: {error}")
                
                return JsonResponse({
                    'success': False,
                    'message': 'Please correct the following errors:',
                    'errors': form.errors,
                    'error_list': error_messages
                })
    else:
        form = LeaveRequestForm(user=request.user)
    
    context = {
        'form': form,
        'page_title': 'Apply for Leave'
    }
    
    return redirect('user_leave')

@login_required
def leave_detail(request, control_number):
    leave_request = get_object_or_404(LeaveRequest, control_number=control_number)
    
    # Check permissions
    if (leave_request.employee != request.user and 
        leave_request.current_approver != request.user and
        not (request.user.hr_admin or request.user.hr_manager or 
             request.user.is_superuser or request.user.is_staff)):
        return JsonResponse({'success': False, 'message': 'You do not have permission to view this leave request.'})

    approval_actions = leave_request.approval_actions.all().order_by('action_at')
    
    from .models import LeaveReason
    leave_reasons = LeaveReason.objects.filter(leave_type=leave_request.leave_type, is_active=True)
    
    context = {
        'leave_request': leave_request,
        'approval_actions': approval_actions,
        'leave_reasons': leave_reasons,
        'can_edit': (leave_request.employee == request.user and 
                    leave_request.status == 'routing'),
        'can_cancel': (leave_request.employee == request.user and 
                      leave_request.status in ['routing']),
        'can_approve': (leave_request.current_approver == request.user and 
                       leave_request.status == 'routing')
    }
    
    return JsonResponse({
        'success': True,
        'html': render(request, 'leaverequest/detail_content.html', context).content.decode('utf-8')
    })

@login_required
@login_required
def edit_leave(request, control_number):
    leave_request = get_object_or_404(LeaveRequest, control_number=control_number)

    if leave_request.employee != request.user or leave_request.status != 'routing':
        return JsonResponse({'success': False, 'message': 'You cannot edit this leave request.'})
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method.'})

    from datetime import datetime
    date_from_str = request.POST.get('date_from')
    date_to_str = request.POST.get('date_to')
    try:
        date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
        date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
    except Exception:
        return JsonResponse({'success': False, 'message': 'Invalid date format.'})
    reason_text = request.POST.get('reason', '').strip()
    leave_reason_id = request.POST.get('leave_reason')

    if not (date_from and date_to and leave_reason_id and reason_text):
        return JsonResponse({'success': False, 'message': 'All fields are required.'})

    from .models import LeaveReason
    try:
        leave_request.date_from = date_from
        leave_request.date_to = date_to
        leave_request.reason = reason_text
        leave_request.leave_reason = LeaveReason.objects.get(pk=leave_reason_id)
        leave_request.save()

        LeaveApprovalAction.objects.create(
            leave_request=leave_request,
            approver=request.user,
            sequence=leave_request.approval_actions.count() + 1,
            status='approved',
            action='approved',
            comments='Updated my leave request',
            action_at=timezone.now()
        )
        return JsonResponse({'success': True, 'message': 'Leave request updated successfully!'})
    except LeaveReason.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Invalid leave reason selected.'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@login_required
@require_POST
def cancel_leave(request, control_number):
    """Cancel leave request"""
    leave_request = get_object_or_404(LeaveRequest, control_number=control_number)
    
    # Check permissions
    if (leave_request.employee != request.user or 
        leave_request.status not in ['routing']):
        return JsonResponse({'success': False, 'message': 'Cannot cancel this leave request.'})
    
    leave_request.status = 'cancelled'
    leave_request.cancelled_at = timezone.now()
    leave_request.current_approver = None
    leave_request.save()
    
    LeaveApprovalAction.objects.create(
        leave_request=leave_request,
        approver=request.user,
        sequence=1,
        status=leave_request.status,
        action='cancelled',
        comments="Leave request cancelled by employee",
        action_at=timezone.now()
    )
    
    return JsonResponse({'success': True, 'message': 'Leave request cancelled successfully.'})

@login_required
def approver_dashboard(request):
    """Dashboard for approvers"""
    pending_approvals = LeaveRequest.objects.filter(
        current_approver=request.user,
        status='routing'
    ).order_by('-date_prepared')

    search_form = LeaveSearchForm(request.GET)
    if search_form.is_valid():
        if search_form.cleaned_data['search']:
            search_term = search_form.cleaned_data['search']
            pending_approvals = pending_approvals.filter(
                Q(control_number__icontains=search_term) |
                Q(employee__firstname__icontains=search_term) |
                Q(employee__lastname__icontains=search_term)
            )
    
    paginator = Paginator(pending_approvals, 10)
    page = request.GET.get('page')
    pending_approvals = paginator.get_page(page)
    
    context = {
        'pending_approvals': pending_approvals,
        'search_form': search_form,
        'page_title': 'Pending Approvals'
    }
    
    return render(request, 'leaverequest/approver_dashboard.html', context)

@login_required
@require_POST
def process_approval(request, control_number):
    """Process leave approval/disapproval"""
    leave_request = get_object_or_404(LeaveRequest, control_number=control_number)
    
    # Check permissions
    if (leave_request.current_approver != request.user or 
        leave_request.status != 'routing'):
        return JsonResponse({'success': False, 'message': 'You cannot process this request.'})
    
    try:
        data = json.loads(request.body)
        action = data.get('action')
        comments = data.get('comments', '')
        
        if action == 'approve':
            leave_request.status = 'approved'
            leave_request.approved_at = timezone.now()
            leave_request.current_approver = None
            
            # Update leave balance if applicable
            if (hasattr(leave_request.employee, 'employment_info') and 
                getattr(leave_request.employee.employment_info, 'employment_status', None) == 'Regular'):
                
                today = timezone.now().date()
                balance = LeaveBalance.objects.filter(
                    employee=leave_request.employee,
                    leave_type=leave_request.leave_type,
                    valid_from__lte=today,
                    valid_to__gte=today,
                    validity_status='active'
                ).first()
                
                if balance:
                    balance.used += leave_request.days_requested
                    balance.save()
            
            # Add approval action entry
            LeaveApprovalAction.objects.create(
                leave_request=leave_request,
                approver=request.user,
                sequence=1,
                status='approved',
                action='approved',
                comments=comments or "Leave request approved",
                action_at=timezone.now()
            )
            
            message = 'Leave request approved successfully!'
            
        elif action == 'disapprove':
            leave_request.status = 'disapproved'
            leave_request.disapproved_at = timezone.now()
            leave_request.current_approver = None
            
            # Add approval action entry
            LeaveApprovalAction.objects.create(
                leave_request=leave_request,
                approver=request.user,
                sequence=1,
                status='disapproved',
                action='disapproved',
                comments=comments or "Leave request disapproved",
                action_at=timezone.now()
            )
            
            message = 'Leave request disapproved.'
        
        else:
            return JsonResponse({'success': False, 'message': 'Invalid action.'})
        
        leave_request.save()
        
        return JsonResponse({'success': True, 'message': message})
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

@login_required
def admin_dashboard(request):
    if not (request.user.hr_admin or request.user.hr_manager or 
            request.user.is_superuser or request.user.is_staff):
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('admin_leave')
    
    leave_requests = LeaveRequest.objects.all().select_related('employee', 'leave_type')
    
    search_form = LeaveSearchForm(request.GET)
    if search_form.is_valid():
        if search_form.cleaned_data['search']:
            search_term = search_form.cleaned_data['search']
            leave_requests = leave_requests.filter(
                Q(control_number__icontains=search_term) |
                Q(employee__firstname__icontains=search_term) |
                Q(employee__lastname__icontains=search_term) |
                Q(employee__username__icontains=search_term)
            )
        
        if search_form.cleaned_data['status']:
            leave_requests = leave_requests.filter(status=search_form.cleaned_data['status'])
        
        if search_form.cleaned_data['leave_type']:
            leave_requests = leave_requests.filter(leave_type=search_form.cleaned_data['leave_type'])
        
        if search_form.cleaned_data['date_from']:
            leave_requests = leave_requests.filter(date_from__gte=search_form.cleaned_data['date_from'])
        
        if search_form.cleaned_data['date_to']:
            leave_requests = leave_requests.filter(date_to__lte=search_form.cleaned_data['date_to'])

    paginator = Paginator(leave_requests.order_by('-date_prepared'), 15)
    page = request.GET.get('page')
    leave_requests = paginator.get_page(page)
    
    stats = {
        'total_requests': LeaveRequest.objects.count(),
        'pending_requests': LeaveRequest.objects.filter(status='routing').count(),
        'approved_requests': LeaveRequest.objects.filter(status='approved').count(),
        'disapproved_requests': LeaveRequest.objects.filter(status='disapproved').count(),
    }
    
    context = {
        'leave_requests': leave_requests,
        'search_form': search_form,
        'stats': stats,
        'page_title': 'Leave Management - Admin'
    }
    
    return render(request, 'leaverequest/admin-leave.html', context)

@login_required
def get_leave_balance(request):
    """AJAX endpoint to get leave balance for validation"""
    if request.method == 'GET':
        leave_type_id = request.GET.get('leave_type_id')
        
        if not leave_type_id:
            return JsonResponse({'error': 'Leave type ID required'})
        
        # Only for regular employees
        if (hasattr(request.user, 'employment_info') and 
            getattr(request.user.employment_info, 'employment_status', None) == 'Regular'):
            
            today = timezone.now().date()
            balance = LeaveBalance.objects.filter(
                employee=request.user,
                leave_type_id=leave_type_id,
                valid_from__lte=today,
                valid_to__gte=today,
                validity_status='active'
            ).first()
            
            if balance:
                return JsonResponse({
                    'remaining': float(balance.remaining),
                    'entitled': float(balance.entitled),
                    'used': float(balance.used),
                    'valid_period': f"{balance.valid_from.strftime('%b %d, %Y')} - {balance.valid_to.strftime('%b %d, %Y')}"
                })
        
        return JsonResponse({'remaining': None, 'message': 'No active balance found'})
    
    return JsonResponse({'error': 'Invalid request method'})

@login_required
def leave_chart_data(request):
    """AJAX endpoint to get chart data for leave analytics"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'})
    
    try:
        from datetime import datetime, timedelta
        from django.db.models import Count, Q
        from collections import defaultdict
        import calendar
        
        now = timezone.now()
        current_date = now.date()
        
        # Calculate fiscal year (May to April)
        if current_date.month >= 5:  # May onwards = current fiscal year
            fiscal_start = datetime(current_date.year, 5, 1).date()
            fiscal_end = datetime(current_date.year + 1, 4, 30).date()
            fiscal_year = f"{current_date.year}-{current_date.year + 1}"
        else:  # January to April = previous fiscal year
            fiscal_start = datetime(current_date.year - 1, 5, 1).date()
            fiscal_end = datetime(current_date.year, 4, 30).date()
            fiscal_year = f"{current_date.year - 1}-{current_date.year}"
        
        # Status distribution data (for pie chart)
        leave_requests = LeaveRequest.objects.filter(
            date_prepared__date__gte=fiscal_start,
            date_prepared__date__lte=fiscal_end
        )
        
        status_counts = leave_requests.aggregate(
            approved=Count('id', filter=Q(status='approved')),
            routing=Count('id', filter=Q(status='routing')),
            disapproved=Count('id', filter=Q(status='disapproved')),
            cancelled=Count('id', filter=Q(status='cancelled'))
        )
        
        total_requests = sum(status_counts.values())
        
        # Calculate percentages (keep for reference but use actual counts for chart)
        status_percentages = {}
        if total_requests > 0:
            for status, count in status_counts.items():
                status_percentages[status] = round((count / total_requests) * 100, 1)
        else:
            status_percentages = {'approved': 0, 'routing': 0, 'disapproved': 0, 'cancelled': 0}
        
        # Leave types over time (for line chart)
        leave_types = LeaveType.objects.filter(is_active=True)
        
        # Generate monthly data for fiscal year
        monthly_data = defaultdict(lambda: defaultdict(int))
        
        # Get all months in fiscal year
        months = []
        current_month = fiscal_start.replace(day=1)
        while current_month <= fiscal_end:
            months.append(current_month)
            if current_month.month == 12:
                current_month = current_month.replace(year=current_month.year + 1, month=1)
            else:
                current_month = current_month.replace(month=current_month.month + 1)
        
        # Count leave requests by type and month
        for leave_request in leave_requests.filter(status='approved'):
            month_key = leave_request.date_prepared.date().replace(day=1)
            if month_key in months:
                monthly_data[month_key][leave_request.leave_type.name] += 1
        
        # Prepare line chart data
        line_chart_labels = [month.strftime('%b') for month in months]
        line_chart_datasets = []
        
        colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']
        
        for i, leave_type in enumerate(leave_types):
            data = [monthly_data[month].get(leave_type.name, 0) for month in months]
            color = colors[i % len(colors)]
            
            line_chart_datasets.append({
                'label': leave_type.name,
                'data': data,
                'borderColor': color,
                'backgroundColor': f"{color}20",
                'tension': 0.4,
                'fill': True,
                'pointRadius': 4,
                'pointHoverRadius': 6,
                'pointBackgroundColor': color,
                'pointBorderColor': '#ffffff',
                'pointBorderWidth': 2
            })
        
        return JsonResponse({
            'success': True,
            'fiscal_year': fiscal_year,
            'status_chart': {
                'labels': ['Approved', 'Routing', 'Disapproved', 'Cancelled'],
                'data': [
                    status_counts['approved'],
                    status_counts['routing'], 
                    status_counts['disapproved'],
                    status_counts['cancelled']
                ],
                'backgroundColor': ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
                'total_requests': total_requests
            },
            'line_chart': {
                'labels': line_chart_labels,
                'datasets': line_chart_datasets
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)})

def leave_reasons_api(request, leave_type_id):
    reasons = LeaveReason.objects.filter(leave_type_id=leave_type_id, is_active=True)
    data = [
        {
            'id': reason.id,
            'reason_text': reason.reason_text
        }
        for reason in reasons
    ]
    return JsonResponse(data, safe=False)

@login_required
def holidays_and_exceptions_api(request):
    """API endpoint to get holidays and Sunday exceptions for leave calculation"""
    from usercalendar.models import Holiday
    from .models import SundayException
    
    # Get holidays
    holidays = Holiday.objects.all().values('date', 'name', 'holiday_type')
    holidays_list = [{'date': holiday['date'].strftime('%Y-%m-%d'), 'name': holiday['name'], 'type': holiday['holiday_type']} for holiday in holidays]
    
    # Get Sunday exceptions (Sundays that should be counted as working days)
    sunday_exceptions = SundayException.objects.all().values('date', 'description')
    exceptions_list = [{'date': exception['date'].strftime('%Y-%m-%d'), 'description': exception['description']} for exception in sunday_exceptions]
    
    return JsonResponse({
        'holidays': holidays_list,
        'sunday_exceptions': exceptions_list
    })

@login_required
def check_approver_api(request):
    """API endpoint to check if user has an assigned approver"""
    try:
        employment_info = request.user.employment_info
        has_approver = employment_info.approver is not None and employment_info.approver.is_active
        
        return JsonResponse({
            'has_approver': has_approver,
            'approver_name': f"{employment_info.approver.firstname} {employment_info.approver.lastname}" if has_approver else None
        })
    except:
        return JsonResponse({
            'has_approver': False,
            'approver_name': None,
            'error': 'Employment information not found'
        })