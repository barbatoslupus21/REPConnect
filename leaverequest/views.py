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
from .models import LeaveRequest, LeaveType, LeaveBalance, LeaveApprovalAction
from .forms import LeaveRequestForm, LeaveApprovalForm, LeaveSearchForm

@login_required
def leave_dashboard(request):
    """Main leave dashboard for employees and approvers"""
    user = request.user
    context = {}
    
    # Get user's leave requests
    leave_requests = LeaveRequest.objects.filter(employee=user).order_by('-date_prepared')[:5]
    context['recent_leaves'] = leave_requests

    # Get user's leave balances (all periods)
    leave_balances = LeaveBalance.objects.filter(
        employee=user
    ).select_related('leave_type').order_by('valid_from', 'leave_type__name')

    # Group leave balances by (valid_from, valid_to)
    from collections import defaultdict
    balance_sets = defaultdict(list)
    for balance in leave_balances:
        key = (balance.valid_from, balance.valid_to)
        balance_sets[key].append(balance)

    # Convert to list of dicts for template with totals
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
    
    # Sort by valid_from descending
    grouped_balances.sort(key=lambda x: x['valid_from'], reverse=True)
    context['leave_balance_sets'] = grouped_balances

    # Check if user is an approver (using LeaveApprovalAction)
    approval_actions = LeaveApprovalAction.objects.filter(
        approver=user,
        status='routing'
    ).select_related('leave_request').order_by('-created_at')
    pending_approvals = [action.leave_request for action in approval_actions]
    context['pending_approvals'] = pending_approvals
    context['is_approver'] = bool(pending_approvals)

    # Check admin privileges
    context['is_admin'] = (
        user.hr_admin or user.hr_manager or 
        user.is_superuser or user.is_staff
    )

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
    """Apply for leave request"""
    if request.method == 'POST':
        form = LeaveRequestForm(request.POST, request.FILES, user=request.user)
        if form.is_valid():
            leave_request = form.save(commit=False)
            leave_request.employee = request.user
            
            # Set up approval flow (simplified - assign to HR manager)
            hr_managers = EmployeeLogin.objects.filter(hr_manager=True, is_active=True).first()
            if hr_managers:
                leave_request.current_approver = hr_managers
                leave_request.final_approver = hr_managers
            
            leave_request.save()
            
            # Create approval flow entry
            if hr_managers:
                LeaveApprovalAction.objects.create(
                    leave_request=leave_request,
                    approver=hr_managers,
                    sequence=1,
                    status='routing',
                    action='submitted',
                    comments=f"Leave request submitted for {leave_request.leave_type.name}",
                    action_at=timezone.now()
                )
            
            messages.success(request, f'Leave request {leave_request.control_number} submitted successfully!')
            return redirect('leave:dashboard')
    else:
        form = LeaveRequestForm(user=request.user)
    
    context = {
        'form': form,
        'page_title': 'Apply for Leave'
    }
    
    return render(request, 'leaverequest/apply.html', context)

@login_required
def leave_detail(request, control_number):
    """View leave request details"""
    leave_request = get_object_or_404(LeaveRequest, control_number=control_number)
    
    # Check permissions
    if (leave_request.employee != request.user and 
        leave_request.current_approver != request.user and
        not (request.user.hr_admin or request.user.hr_manager or 
             request.user.is_superuser or request.user.is_staff)):
        messages.error(request, 'You do not have permission to view this leave request.')
        return redirect('leave:dashboard')
    
    # Get timeline
    timeline = leave_request.timeline.all().order_by('timestamp')
    
    # Get approval flow
    approval_flow = leave_request.approval_flow.all().order_by('sequence')
    
    context = {
        'leave_request': leave_request,
        'timeline': timeline,
        'approval_flow': approval_flow,
        'can_edit': (leave_request.employee == request.user and 
                    leave_request.status == 'routing'),
        'can_cancel': (leave_request.employee == request.user and 
                      leave_request.status in ['routing']),
        'can_approve': (leave_request.current_approver == request.user and 
                       leave_request.status == 'routing')
    }
    
    return render(request, 'leaverequest/detail.html', context)

@login_required
def edit_leave(request, control_number):
    """Edit leave request (only if routing status)"""
    leave_request = get_object_or_404(LeaveRequest, control_number=control_number)
    
    # Check permissions
    if (leave_request.employee != request.user or 
        leave_request.status != 'routing'):
        messages.error(request, 'You cannot edit this leave request.')
        return redirect('leave:detail', control_number=control_number)
    
    if request.method == 'POST':
        form = LeaveRequestForm(request.POST, request.FILES, 
                               instance=leave_request, user=request.user)
        if form.is_valid():
            form.save()
            
            LeaveApprovalAction.objects.create(
                leave_request=leave_request,
                approver=request.user,
                sequence=1,
                status=leave_request.status,
                action='submitted',
                comments="Leave request updated",
                action_at=timezone.now()
            )
            
            messages.success(request, 'Leave request updated successfully!')
            return redirect('leave:detail', control_number=control_number)
    else:
        form = LeaveRequestForm(instance=leave_request, user=request.user)
    
    context = {
        'form': form,
        'leave_request': leave_request,
        'page_title': f'Edit Leave Request - {control_number}'
    }
    
    return render(request, 'leaverequest/edit.html', context)

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
    """Admin dashboard for leave management"""
    # Check admin permissions
    if not (request.user.hr_admin or request.user.hr_manager or 
            request.user.is_superuser or request.user.is_staff):
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('leave:dashboard')
    
    # Get all leave requests
    leave_requests = LeaveRequest.objects.all().select_related('employee', 'leave_type')
    
    # Apply search filters
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
    
    # Pagination
    paginator = Paginator(leave_requests.order_by('-date_prepared'), 15)
    page = request.GET.get('page')
    leave_requests = paginator.get_page(page)
    
    # Statistics
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