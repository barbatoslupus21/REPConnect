from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Device, Ticket, DeviceType, TicketCategory
from .forms import DeviceForm, TicketForm, TicketUpdateForm, TicketReviewForm, DeviceUpdateForm
import json


@login_required
def mis_user_dashboard(request):
    from django.core.paginator import Paginator
    from django.db.models import Q
    
    now = timezone.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_of_last_month = start_of_month - timedelta(seconds=1)
    
    current_month_tickets = Ticket.objects.filter(
        requestor=request.user,
        created_at__gte=start_of_month
    )
    
    last_month_tickets = Ticket.objects.filter(
        requestor=request.user,
        created_at__gte=start_of_last_month,
        created_at__lte=end_of_last_month
    )
    
    total_current = current_month_tickets.count()
    total_last = last_month_tickets.count()
    
    if total_last > 0:
        percentage_change = ((total_current - total_last) / total_last) * 100
    else:
        percentage_change = 100 if total_current > 0 else 0
    
    # Calculate individual status percentages
    approved_current = current_month_tickets.filter(status='Approved').count()
    approved_last = last_month_tickets.filter(status='Approved').count()
    approved_percentage = ((approved_current - approved_last) / approved_last * 100) if approved_last > 0 else (100 if approved_current > 0 else 0)
    
    disapproved_current = current_month_tickets.filter(status='Disapproved').count()
    disapproved_last = last_month_tickets.filter(status='Disapproved').count()
    disapproved_percentage = ((disapproved_current - disapproved_last) / disapproved_last * 100) if disapproved_last > 0 else (100 if disapproved_current > 0 else 0)
    
    processing_current = current_month_tickets.filter(status='Processing').count()
    processing_last = last_month_tickets.filter(status='Processing').count()
    processing_percentage = ((processing_current - processing_last) / processing_last * 100) if processing_last > 0 else (100 if processing_current > 0 else 0)
    
    stats = {
        'total_requests': total_current,
        'approved': approved_current,
        'disapproved': disapproved_current,
        'processing': processing_current,
        'percentage_change': round(percentage_change, 1),
        'is_increase': percentage_change >= 0,
        'approved_percentage': round(approved_percentage, 1),
        'approved_is_increase': approved_percentage >= 0,
        'disapproved_percentage': round(disapproved_percentage, 1),
        'disapproved_is_increase': disapproved_percentage >= 0,
        'processing_percentage': round(processing_percentage, 1),
        'processing_is_increase': processing_percentage >= 0,
    }
    
    # Handle AJAX requests for search and pagination
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        search_query = request.GET.get('search', '').strip()
        tab = request.GET.get('tab', 'requests')
        
        if tab == 'requests':
            tickets_qs = Ticket.objects.filter(requestor=request.user)
            if search_query:
                tickets_qs = tickets_qs.filter(
                    Q(ticket_number__icontains=search_query) |
                    Q(device__device_name__icontains=search_query) |
                    Q(category__name__icontains=search_query) |
                    Q(priority_level__icontains=search_query) |
                    Q(status__icontains=search_query)
                )
            tickets_qs = tickets_qs.order_by('-created_at')
            
            # Pagination
            page = request.GET.get('page', 1)
            paginator = Paginator(tickets_qs, 10)
            tickets = paginator.get_page(page)
            
            return JsonResponse({
                'success': True,
                'html': render(request, 'ticketing/partials/tickets_table.html', {'tickets': tickets}).content.decode(),
                'pagination': {
                    'has_previous': tickets.has_previous(),
                    'has_next': tickets.has_next(),
                    'number': tickets.number,
                    'num_pages': tickets.paginator.num_pages,
                    'start_index': tickets.start_index(),
                    'end_index': tickets.end_index(),
                    'count': tickets.paginator.count,
                }
            })
        elif tab == 'devices':
            devices_qs = Device.objects.filter(user=request.user, is_active=True)
            if search_query:
                devices_qs = devices_qs.filter(
                    Q(device_name__icontains=search_query) |
                    Q(device_code__icontains=search_query) |
                    Q(device_type__name__icontains=search_query) |
                    Q(device_location__icontains=search_query)
                )
            devices_qs = devices_qs.order_by('-created_at')
            
            # Pagination
            page = request.GET.get('page', 1)
            paginator = Paginator(devices_qs, 10)
            devices = paginator.get_page(page)
            
            return JsonResponse({
                'success': True,
                'html': render(request, 'ticketing/partials/devices_table.html', {'devices': devices}).content.decode(),
                'pagination': {
                    'has_previous': devices.has_previous(),
                    'has_next': devices.has_next(),
                    'number': devices.number,
                    'num_pages': devices.paginator.num_pages,
                    'start_index': devices.start_index(),
                    'end_index': devices.end_index(),
                    'count': devices.paginator.count,
                }
            })
    
    # Regular page load
    tickets_qs = Ticket.objects.filter(requestor=request.user).order_by('-created_at')
    devices_qs = Device.objects.filter(user=request.user, is_active=True).order_by('-created_at')
    
    # Pagination for initial load
    tickets_paginator = Paginator(tickets_qs, 10)
    devices_paginator = Paginator(devices_qs, 10)
    tickets_page = request.GET.get('tickets_page', 1)
    devices_page = request.GET.get('devices_page', 1)
    tickets = tickets_paginator.get_page(tickets_page)
    devices = devices_paginator.get_page(devices_page)
    device_types = DeviceType.objects.all()
    categories = TicketCategory.objects.all()
    
    device_form = DeviceForm()
    ticket_form = TicketForm(user=request.user)
    
    context = {
        'stats': stats,
        'tickets': tickets,
        'device_types': device_types,
        'devices': devices,
        'categories': categories,
        'device_form': device_form,
        'ticket_form': ticket_form,
    }
    
    return render(request, 'ticketing/user-ticket.html', context)


@login_required
def mis_admin_dashboard(request):
    if not request.user.mis_admin:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('mis_user_dashboard')
    
    # Get current month and last month dates
    now = timezone.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_of_last_month = start_of_month - timedelta(seconds=1)
    
    # Current month statistics for all users
    current_month_tickets = Ticket.objects.filter(created_at__gte=start_of_month)
    
    # Last month statistics for all users
    last_month_tickets = Ticket.objects.filter(
        created_at__gte=start_of_last_month,
        created_at__lte=end_of_last_month
    )
    
    # Calculate statistics
    total_current = current_month_tickets.count()
    total_last = last_month_tickets.count()
    
    # Calculate percentage change
    if total_last > 0:
        percentage_change = ((total_current - total_last) / total_last) * 100
    else:
        percentage_change = 100 if total_current > 0 else 0
    
    stats = {
        'total_requests': total_current,
        'approved': current_month_tickets.filter(status='Approved').count(),
        'disapproved': current_month_tickets.filter(status='Disapproved').count(),
        'processing': current_month_tickets.filter(status='Processing').count(),
        'percentage_change': round(percentage_change, 1),
        'is_increase': percentage_change >= 0
    }
    
    # Get all tickets and devices
    tickets = Ticket.objects.all().order_by('-created_at')
    devices = Device.objects.all().order_by('-created_at')
    
    context = {
        'stats': stats,
        'tickets': tickets,
        'devices': devices,
    }
    
    return render(request, 'ticketing/admin-ticket.html', context)


@login_required
@require_http_methods(["POST"])
def add_device(request):
    try:
        form = DeviceForm(request.POST)
        if form.is_valid():
            device = form.save(commit=False)
            device.user = request.user
            device.save()
            return JsonResponse({
                'status': 'success',
                'message': 'Device added successfully',
                'device': {
                    'id': device.id,
                    'device_name': device.device_name,
                    'device_code': device.device_code,
                    'device_location': device.device_location,
                    'device_type': device.device_type.name if device.device_type else ''
                }
            })
        return JsonResponse({
            'status': 'error',
            'errors': form.errors
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST"])
def create_ticket(request):
    form = TicketForm(request.POST, user=request.user)
    if form.is_valid():
        ticket = form.save(commit=False)
        ticket.requestor = request.user
        ticket.save()
        return JsonResponse({
            'status': 'success',
            'message': 'Ticket created successfully',
            'ticket_number': ticket.ticket_number
        })
    return JsonResponse({
        'status': 'error',
        'errors': form.errors
    }, status=400)


@login_required
def get_ticket_details(request, ticket_id):
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    # Check permission
    is_owner = ticket.requestor == request.user
    is_admin = request.user.mis_admin
    
    if not (is_owner or is_admin):
        return JsonResponse({'status': 'error', 'message': 'Permission denied'}, status=403)
    
    data = {
        'id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'requestor_name': ticket.requestor_name,
        'device': ticket.device.device_name if ticket.device else '',
        'device_id': ticket.device.id if ticket.device else '',
        'priority_level': ticket.priority_level,
        'category': ticket.category.name if ticket.category else '',
        'category_id': ticket.category.id if ticket.category else '',
        'problem_details': ticket.problem_details,
        'status': ticket.status,
        'technician_name': ticket.technician_name,
        'diagnosis': ticket.diagnosis,
        'action_taken': ticket.action_taken,
        'possible_reason': ticket.possible_reason,
        'recommendation': ticket.recommendation,
        'created_at': ticket.created_at.strftime('%Y-%m-%d %H:%M'),
        'is_owner': is_owner,
        'is_admin': is_admin,
        'can_edit': is_owner and ticket.status == 'Processing',
        'can_review': is_admin and ticket.status == 'Processing'
    }
    
    return JsonResponse(data)


@login_required
@require_http_methods(["POST"])
def update_ticket(request, ticket_id):
    ticket = get_object_or_404(Ticket, id=ticket_id, requestor=request.user)
    
    if ticket.status != 'Processing':
        return JsonResponse({'status': 'error', 'message': 'Cannot edit this ticket'}, status=400)
    
    form = TicketUpdateForm(request.POST, instance=ticket)
    if form.is_valid():
        form.save()
        return JsonResponse({
            'status': 'success',
            'message': 'Ticket updated successfully'
        })
    return JsonResponse({
        'status': 'error',
        'errors': form.errors
    }, status=400)


@login_required
@require_http_methods(["POST"])
def cancel_ticket(request, ticket_id):
    ticket = get_object_or_404(Ticket, id=ticket_id, requestor=request.user)
    
    if ticket.status != 'Processing':
        return JsonResponse({'status': 'error', 'message': 'Cannot cancel this ticket'}, status=400)
    
    ticket.status = 'Cancelled'
    ticket.save()
    
    return JsonResponse({
        'status': 'success',
        'message': 'Ticket cancelled successfully'
    })


@login_required
@require_http_methods(["POST"])
def review_ticket(request, ticket_id):
    if not request.user.mis_admin:
        return JsonResponse({'status': 'error', 'message': 'Permission denied'}, status=403)
    
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    if ticket.status != 'Processing':
        return JsonResponse({'status': 'error', 'message': 'This ticket has already been reviewed'}, status=400)
    
    form = TicketReviewForm(request.POST, instance=ticket, user=request.user)
    if form.is_valid():
        ticket = form.save(commit=False)
        ticket.reviewed_by = request.user
        ticket.reviewed_at = timezone.now()
        ticket.save()
        return JsonResponse({
            'status': 'success',
            'message': 'Ticket reviewed successfully'
        })
    return JsonResponse({
        'status': 'error',
        'errors': form.errors
    }, status=400)


@login_required
def get_device_details(request, device_id):
    device = get_object_or_404(Device, id=device_id)
    
    # Check permission
    is_owner = device.user == request.user
    is_admin = request.user.mis_admin
    
    if not (is_owner or is_admin):
        return JsonResponse({'status': 'error', 'message': 'Permission denied'}, status=403)
    
    data = {
        'id': device.id,
        'device_name': device.device_name,
        'device_code': device.device_code,
        'device_location': device.device_location,
        'device_type': device.device_type.name if device.device_type else '',
        'device_type_id': device.device_type.id if device.device_type else '',
        'user': device.user.full_name,
        'created_at': device.created_at.strftime('%Y-%m-%d %H:%M'),
        'is_owner': is_owner,
        'can_edit': is_owner
    }
    
    return JsonResponse(data)


@login_required
@require_http_methods(["POST"])
def update_device(request, device_id):
    device = get_object_or_404(Device, id=device_id, user=request.user)
    
    form = DeviceUpdateForm(request.POST, instance=device)
    if form.is_valid():
        form.save()
        return JsonResponse({
            'status': 'success',
            'message': 'Device updated successfully'
        })
    return JsonResponse({
        'status': 'error',
        'errors': form.errors
    }, status=400)


@login_required
@require_http_methods(["POST"])
def delete_device(request, device_id):
    device = get_object_or_404(Device, id=device_id, user=request.user)
    device.delete()
    
    return JsonResponse({
        'status': 'success',
        'message': 'Device deleted successfully'
    })


@login_required
def get_form_options(request):
    # Get device types and categories for forms
    device_types = list(DeviceType.objects.values('id', 'name'))
    categories = list(TicketCategory.objects.values('id', 'name'))
    
    # Get user's devices if user is authenticated
    devices = []
    if request.user.is_authenticated:
        devices = list(Device.objects.filter(user=request.user, is_active=True).values('id', 'device_name'))
    
    return JsonResponse({
        'device_types': device_types,
        'categories': categories,
        'devices': devices
    })