import json
import openpyxl
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.urls import reverse
from django.template.loader import render_to_string
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Avg, Count
from django.utils import timezone
import datetime as dt
from django.core.paginator import Paginator
from django.db import transaction
from .models import Evaluation, EmployeeEvaluation, TaskList, TaskRating, TrainingRequest
from .forms import (
    TaskListImportForm, EvaluationCreateForm, TaskRatingForm, 
    SupervisorEvaluationForm, ManagerApprovalForm, TrainingRequestForm,
    EmployeeFilterForm
)
from userlogin.models import EmployeeLogin
from openpyxl.styles import Font, PatternFill, Alignment

@login_required
def evaluation_dashboard(request):
    if request.user.hr_admin:
        return redirect('admin_evaluation')
    else:
        return redirect('user_evaluation')
    
@login_required
def evaluation_user_view(request):    
    return render(request, 'evaluation/user_evaluation.html')

@login_required
def evaluation_admin_view(request):
    from django.utils import timezone
    from datetime import timedelta
    import calendar
    from django.core.paginator import Paginator
    
    # Get search query
    search_query = request.GET.get('search', '').strip()
    
    # Get current date info
    now = timezone.now()
    first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_last_month = (first_of_this_month - timedelta(days=1)).replace(day=1)
    
    # Get evaluations with search and pagination
    evaluations_query = Evaluation.objects.filter(is_active=True)
    
    if search_query:
        evaluations_query = evaluations_query.filter(
            Q(title__icontains=search_query) |
            Q(created_by__firstname__icontains=search_query) |
            Q(created_by__lastname__icontains=search_query) |
            Q(created_by__username__icontains=search_query)
        )
    
    evaluations_query = evaluations_query.order_by('-created_at')
    
    # Pagination
    paginator = Paginator(evaluations_query, 10)  # 10 items per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Get all users except admins with their employment info
    users_query = EmployeeLogin.objects.filter(
        active=True,
        hr_admin=False,
        is_superuser=False
    ).select_related(
        'employment_info__department',
        'employment_info__line', 
        'employment_info__approver'
    ).prefetch_related('task_lists')
    
    if search_query:
        users_query = users_query.filter(
            Q(firstname__icontains=search_query) |
            Q(lastname__icontains=search_query) |
            Q(username__icontains=search_query) |
            Q(idnumber__icontains=search_query)
        )
    
    users_query = users_query.order_by('firstname', 'lastname')
    
    # Pagination for users
    users_paginator = Paginator(users_query, 10)  # 10 items per page
    users_page_number = request.GET.get('users_page', 1)
    users_page_obj = users_paginator.get_page(users_page_number)
    
    # Get evaluations for current page
    evaluations = page_obj.object_list
    
    # Get users for current page
    users = users_page_obj.object_list

    # If AJAX request for table only, return rendered rows HTML
    if request.headers.get('x-requested-with') == 'XMLHttpRequest' and request.GET.get('partial') == 'table':
        rows_html = render_to_string('evaluation/partials/evaluation_table_rows.html', {'evaluations': evaluations})
        pagination_html = render_to_string('evaluation/partials/evaluation_pagination.html', {'page_obj': page_obj, 'search': search_query})
        return JsonResponse({'rows_html': rows_html, 'pagination_html': pagination_html})
    
    # If AJAX request for tasklist table only
    if request.headers.get('x-requested-with') == 'XMLHttpRequest' and request.GET.get('partial') == 'tasklist_table':
        rows_html = render_to_string('evaluation/partials/tasklist_table_rows.html', {'users': users})
        pagination_html = render_to_string('evaluation/partials/evaluation_pagination.html', {'page_obj': users_page_obj, 'search': search_query})
        return JsonResponse({'rows_html': rows_html, 'pagination_html': pagination_html})
    
    # Total Evaluations (all evaluation records)
    total_evaluations = EmployeeEvaluation.objects.count()
    total_this_month = EmployeeEvaluation.objects.filter(created_at__gte=first_of_this_month).count()
    total_last_month = EmployeeEvaluation.objects.filter(created_at__gte=first_of_last_month, created_at__lt=first_of_this_month).count()
    
    # Calculate percentage for total evaluations
    total_percent = 0
    total_positive = True
    if total_last_month > 0:
        total_percent = round(((total_this_month - total_last_month) / total_last_month) * 100, 1)
        total_positive = total_percent >= 0
    elif total_this_month > 0:
        total_percent = 100.0
        total_positive = True
    
    # Active Evaluations (pending or in progress)
    active_evaluations = EmployeeEvaluation.objects.filter(
        status__in=['pending', 'supervisor_review', 'manager_review']
    ).count()
    active_this_month = EmployeeEvaluation.objects.filter(
        created_at__gte=first_of_this_month,
        status__in=['pending', 'supervisor_review', 'manager_review']
    ).count()
    active_last_month = EmployeeEvaluation.objects.filter(
        created_at__gte=first_of_last_month, 
        created_at__lt=first_of_this_month,
        status__in=['pending', 'supervisor_review', 'manager_review']
    ).count()
    
    # Calculate percentage for active evaluations
    active_percent = 0
    active_positive = True
    if active_last_month > 0:
        active_percent = round(((active_this_month - active_last_month) / active_last_month) * 100, 1)
        active_positive = active_percent >= 0
    elif active_this_month > 0:
        active_percent = 100.0
        active_positive = True
    
    # Completed Evaluations (approved or disapproved)
    completed_evaluations = EmployeeEvaluation.objects.filter(
        status__in=['approved', 'disapproved']
    ).count()
    completed_this_month = EmployeeEvaluation.objects.filter(
        created_at__gte=first_of_this_month,
        status__in=['approved', 'disapproved']
    ).count()
    completed_last_month = EmployeeEvaluation.objects.filter(
        created_at__gte=first_of_last_month, 
        created_at__lt=first_of_this_month,
        status__in=['approved', 'disapproved']
    ).count()
    
    # Calculate percentage for completed evaluations
    completed_percent = 0
    completed_positive = True
    if completed_last_month > 0:
        completed_percent = round(((completed_this_month - completed_last_month) / completed_last_month) * 100, 1)
        completed_positive = completed_percent >= 0
    elif completed_this_month > 0:
        completed_percent = 100.0
        completed_positive = True
    
    # Pending Evaluations (not yet submitted or in early stages)
    pending_evaluations = EmployeeEvaluation.objects.filter(
        status='pending'
    ).count()
    pending_this_month = EmployeeEvaluation.objects.filter(
        created_at__gte=first_of_this_month,
        status='pending'
    ).count()
    pending_last_month = EmployeeEvaluation.objects.filter(
        created_at__gte=first_of_last_month, 
        created_at__lt=first_of_this_month,
        status='pending'
    ).count()
    
    # Calculate percentage for pending evaluations (note: for pending, negative is good)
    pending_percent = 0
    pending_positive = True
    if pending_last_month > 0:
        pending_percent = round(((pending_this_month - pending_last_month) / pending_last_month) * 100, 1)
        pending_positive = pending_percent <= 0  # Negative is good for pending items
    elif pending_this_month > 0:
        pending_percent = 100.0
        pending_positive = False
    
    # Chart data for response status distribution
    response_status_counts = EmployeeEvaluation.objects.values('status').annotate(count=Count('status'))
    status_data = {item['status']: item['count'] for item in response_status_counts}
    
    # Get total non-admin users for Y-axis reference
    total_non_admin_users = EmployeeLogin.objects.filter(
        active=True,
        hr_admin=False,
        is_superuser=False
    ).count()
    
    # Color palette for different evaluations
    color_palette = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]
    
    # Get all evaluations for chart data
    all_evaluations = Evaluation.objects.filter(is_active=True).order_by('created_at')
    
    # Prepare evaluation datasets for different time periods
    evaluation_datasets = []
    month_evaluation_datasets = []
    quarter_evaluation_datasets = []
    year_evaluation_datasets = []
    
    # Monthly labels (last 12 months)
    month_labels = []
    for i in range(11, -1, -1):
        month_start = (now - timedelta(days=30*i)).replace(day=1)
        month_labels.append(month_start.strftime('%b %Y'))
    
    # Quarterly labels (last 4 quarters) aligned to fiscal year May->Apr
    quarter_labels = []
    fiscal_start_month = 5  # May
    # determine current fiscal year start (e.g., if month >= May, fiscal year starts this year)
    current_fy_start = now.year if now.month >= fiscal_start_month else now.year - 1
    # months since fiscal year start (0..11)
    months_since_fy_start = (now.month - fiscal_start_month) % 12
    current_fiscal_quarter = months_since_fy_start // 3 + 1
    for i in range(3, -1, -1):
        q = current_fiscal_quarter - i
        fy = current_fy_start
        if q <= 0:
            q += 4
            fy -= 1
        quarter_labels.append(f'Q{q} FY{fy}')
    
    # Yearly labels (last 3 fiscal years, May->Apr)
    year_labels = []
    for i in range(2, -1, -1):
        fy = current_fy_start - i
        year_labels.append(f'FY{fy}-{(fy+1)%100:02d}')
    
    for idx, evaluation in enumerate(all_evaluations):
        color = color_palette[idx % len(color_palette)]
        
        # Get employee evaluations for this evaluation
        employee_evaluations = EmployeeEvaluation.objects.filter(evaluation=evaluation)
        
        # Monthly data
        monthly_counts = []
        for i in range(11, -1, -1):
            month_start = (now - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
            count = employee_evaluations.filter(created_at__gte=month_start, created_at__lte=month_end).count()
            monthly_counts.append(count)
        
        # Quarterly data (aligned to fiscal year May->Apr)
        quarterly_counts = []
        for i in range(3, -1, -1):
            q = current_fiscal_quarter - i
            fy = current_fy_start
            if q <= 0:
                q += 4
                fy -= 1
            # compute start month for fiscal quarter
            start_month = fiscal_start_month + (q - 1) * 3
            start_year = fy
            if start_month > 12:
                start_month -= 12
                start_year += 1
            quarter_start = dt.datetime(start_year, start_month, 1, tzinfo=dt.timezone.utc)
            # quarter_end is start + 3 months - 1 second
            next_month = start_month + 3
            next_year = start_year
            if next_month > 12:
                next_month -= 12
                next_year += 1
            quarter_end = dt.datetime(next_year, next_month, 1, tzinfo=dt.timezone.utc) - timedelta(seconds=1)
            count = employee_evaluations.filter(created_at__gte=quarter_start, created_at__lte=quarter_end).count()
            quarterly_counts.append(count)
        
        # Yearly (fiscal) data (May->Apr)
        yearly_counts = []
        for i in range(2, -1, -1):
            fy = current_fy_start - i
            year_start = dt.datetime(fy, fiscal_start_month, 1, tzinfo=dt.timezone.utc)
            year_end = dt.datetime(fy + 1, fiscal_start_month - 1, 30 if fiscal_start_month - 1 == 4 else 31, 23, 59, 59, tzinfo=dt.timezone.utc) if False else dt.datetime(fy + 1, 4, 30, 23, 59, 59, tzinfo=dt.timezone.utc)
            # explicit May->Apr end (April 30)
            year_end = dt.datetime(fy + 1, 4, 30, 23, 59, 59, tzinfo=dt.timezone.utc)
            count = employee_evaluations.filter(created_at__gte=year_start, created_at__lte=year_end).count()
            yearly_counts.append(count)
        
        # Add to datasets
        month_evaluation_datasets.append({
            'title': evaluation.title,
            'color': color,
            'monthly_counts': monthly_counts
        })
        
        quarter_evaluation_datasets.append({
            'title': evaluation.title,
            'color': color,
            'quarterly_counts': quarterly_counts
        })
        
        year_evaluation_datasets.append({
            'title': evaluation.title,
            'color': color,
            'yearly_counts': yearly_counts
        })
    
    context = {
        'total_trainings': total_evaluations,
        'active_trainings': active_evaluations,
        'completed_evaluations': completed_evaluations,
        'pending_responses': pending_evaluations,
        'trainings_percent': total_percent,
        'trainings_positive': total_positive,
        'active_percent': active_percent,
        'active_positive': active_positive,
        'completed_percent': completed_percent,
        'completed_positive': completed_positive,
        'pending_percent': pending_percent,
        'pending_positive': pending_positive,
        'response_status_counts': status_data,
        'total_non_admin_users': total_non_admin_users,
        'month_labels': month_labels,
        'quarter_labels': quarter_labels,
        'year_labels': year_labels,
        'month_evaluation_datasets': month_evaluation_datasets,
        'quarter_evaluation_datasets': quarter_evaluation_datasets,
        'year_evaluation_datasets': year_evaluation_datasets,
        'evaluations': evaluations,
        'page_obj': page_obj,
        'search': search_query,
        'users': users,
        'users_page_obj': users_page_obj,
        'fiscal_year_start': now.year if now.month >= 4 else now.year - 1,
        'fiscal_year_end': now.year + 1 if now.month >= 4 else now.year,
    'created_evaluation_message': request.session.pop('created_evaluation_message', None),
    }
    
    return render(request, 'evaluation/admin_evaluation.html', context)


@login_required
@require_http_methods(["POST"])
def create_evaluation(request):
    print("Create evaluation view called")  # Debug print
    print("POST data:", request.POST)  # Debug print

    # Temporarily remove permission check for debugging
    # if not request.user.is_staff and not request.user.hr_admin:
    #     messages.error(request, 'Permission denied')
    #     return redirect('admin_evaluation')

    try:
        form = EvaluationCreateForm(request.POST)
        print("Form is valid:", form.is_valid())
        if form.is_valid():
            evaluation = form.save(commit=False)
            evaluation.created_by = request.user
            evaluation.save()

            request.session['created_evaluation_message'] = 'Evaluation created successfully!'
            return redirect('admin_evaluation')
        else:
            print("Form errors:", form.errors)
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")
            return redirect('admin_evaluation')
    except Exception as e:
        messages.error(request, f'Error creating evaluation: {str(e)}')
        return redirect('admin_evaluation')


@login_required
def get_evaluation_detail(request, evaluation_id):
    """Return evaluation data as JSON for populating the edit modal"""
    evaluation = get_object_or_404(Evaluation, pk=evaluation_id)
    data = {
        'id': evaluation.id,
        'title': evaluation.title,
        'description': evaluation.description,
        'start_year': evaluation.start_year,
        'end_year': evaluation.end_year,
        'duration': evaluation.duration,
        'is_active': evaluation.is_active,
    }
    return JsonResponse({'evaluation': data})


@login_required
@require_http_methods(['POST'])
def update_evaluation(request, evaluation_id):
    """Update evaluation from admin edit modal form POST"""
    evaluation = get_object_or_404(Evaluation, pk=evaluation_id)

    # Reuse EvaluationCreateForm to validate incoming data
    form = EvaluationCreateForm(request.POST, instance=evaluation)
    if form.is_valid():
        form.save()
        # On success, return JSON so frontend can refresh the table
        return JsonResponse({'success': True, 'message': 'Evaluation updated successfully'})
    else:
        # Return validation errors
        errors = {field: [str(e) for e in errs] for field, errs in form.errors.items()}
        return JsonResponse({'success': False, 'errors': errors}, status=400)


@login_required
@require_http_methods(['POST'])
def delete_evaluation(request, evaluation_id):
    """Delete an evaluation (admin action). Returns JSON."""
    evaluation = get_object_or_404(Evaluation, pk=evaluation_id)
    try:
        evaluation.delete()
        return JsonResponse({'success': True, 'message': 'Evaluation deleted successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@login_required
def export_tasklist_template(request):
    """Export Excel template for tasklist import with two sheets: Tasklists and Registered Employee"""
    
    # Create a new workbook
    wb = openpyxl.Workbook()
    
    # Remove default sheet
    wb.remove(wb.active)
    
    # Create Tasklists sheet
    tasklist_sheet = wb.create_sheet("Tasklists")
    
    # Create Registered Employee sheet
    employee_sheet = wb.create_sheet("Registered Employee")
    
    # Define styles
    header_font = Font(bold=True, color="000000")
    header_fill = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")  # Yellow background
    border = openpyxl.styles.Border(
        left=openpyxl.styles.Side(style='thin'),
        right=openpyxl.styles.Side(style='thin'),
        top=openpyxl.styles.Side(style='thin'),
        bottom=openpyxl.styles.Side(style='thin')
    )
    
    # Populate Registered Employee sheet
    employee_sheet['A1'] = "Id Number"
    employee_sheet['B1'] = "Employee Name"
    
    # Apply header styling
    for col in ['A', 'B']:
        cell = employee_sheet[f'{col}1']
        cell.font = header_font
        cell.fill = header_fill
        cell.border = border
    
    # Get non-admin employees
    employees = EmployeeLogin.objects.filter(
        active=True,
        hr_admin=False,
        wire_admin=False,
        clinic_admin=False,
        iad_admin=False,
        accounting_admin=False,
        mis_admin=False
    ).exclude(
        status='disapproved'
    ).order_by('idnumber')
    
    # Add employee data
    for row_num, employee in enumerate(employees, start=2):
        employee_sheet[f'A{row_num}'] = employee.idnumber or ""
        employee_sheet[f'B{row_num}'] = employee.full_name
        
        # Apply border to data cells
        for col in ['A', 'B']:
            employee_sheet[f'{col}{row_num}'].border = border
    
    # Auto-adjust column widths for employee sheet
    for col in ['A', 'B']:
        max_length = 0
        column = employee_sheet.column_dimensions[col]
        for cell in employee_sheet[col]:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        column.width = max_length + 2
    
    # Populate Tasklists sheet
    tasklist_sheet['A1'] = "Id Number"
    tasklist_sheet['B1'] = "Tasklist"
    
    # Apply header styling
    for col in ['A', 'B']:
        cell = tasklist_sheet[f'{col}1']
        cell.font = header_font
        cell.fill = header_fill
        cell.border = border
    
    # Add sample data rows
    sample_data = [
        ("EMP001", "Complete monthly performance review"),
        ("EMP002", "Attend team meeting and provide updates"),
        ("EMP003", "Submit project documentation")
    ]
    
    for row_num, (id_num, task) in enumerate(sample_data, start=2):
        tasklist_sheet[f'A{row_num}'] = id_num
        tasklist_sheet[f'B{row_num}'] = task
        
        # Apply border to data cells
        for col in ['A', 'B']:
            tasklist_sheet[f'{col}{row_num}'].border = border
    
    # Add instructions below the table (starting from row 7)
    instructions_start_row = len(sample_data) + 3  # Start after sample data + 1 empty row
    
    tasklist_sheet[f'A{instructions_start_row}'] = "INSTRUCTIONS:"
    tasklist_sheet[f'A{instructions_start_row}'].font = Font(bold=True, size=12)
    
    instructions = [
        "1. Fill in the table above with employee evaluations:",
        "   - Id Number: Select from the dropdown (must match Registered Employee sheet)",
        "   - Tasklist: Enter the evaluation task or description",
        "",
        "2. Important Notes:",
        "   - Only use Id Numbers from the Registered Employee sheet",
        "   - Files with invalid Id Numbers will not be uploaded",
        "   - You can add multiple rows for different employees/tasks",
        "   - Save the file as .xlsx format before uploading",
        "",
        "3. Upload Process:",
        "   - Click 'Import Tasklist' button in the application",
        "   - Select your completed Excel file",
        "   - Click 'Upload Files' to process"
    ]
    
    for i, instruction in enumerate(instructions, start=instructions_start_row + 1):
        tasklist_sheet[f'A{i}'] = instruction
    
    # Add data validation for Id Number column in Tasklists sheet
    from openpyxl.worksheet.datavalidation import DataValidation
    dv = DataValidation(
        type="list",
        formula1="'Registered Employee'!$A$2:$A$" + str(len(employees) + 1),
        allow_blank=True
    )
    dv.error = 'Please select a valid Id Number from the Registered Employee sheet'
    dv.errorTitle = 'Invalid Id Number'
    dv.prompt = 'Select an Id Number from the Registered Employee sheet'
    dv.promptTitle = 'Id Number Selection'
    
    tasklist_sheet.add_data_validation(dv)
    dv.add('A2:A1000')  # Apply to A2 to A1000
    
    # Auto-adjust column widths for tasklist sheet
    for col in ['A', 'B']:
        max_length = 0
        column = tasklist_sheet.column_dimensions[col]
        for cell in tasklist_sheet[col]:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        column.width = max_length + 2
    
    # Create response
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=tasklist_import_template.xlsx'
    
    # Save workbook to response
    wb.save(response)
    
    return response


@login_required
@require_http_methods(["POST"])
def upload_tasklist(request):
    """Upload and process tasklist Excel file"""
    
    if 'files' not in request.FILES:
        messages.error(request, 'No file uploaded')
        return redirect(reverse('admin_evaluation') + '?tab=tasklist')
    
    uploaded_file = request.FILES['files']
    
    # Validate file extension
    if not uploaded_file.name.lower().endswith(('.xlsx', '.xls')):
        messages.error(request, 'Please upload a valid Excel file (.xlsx or .xls)')
        return redirect(reverse('admin_evaluation') + '?tab=tasklist')
    
    # Validate file size (10MB limit)
    if uploaded_file.size > 10 * 1024 * 1024:
        messages.error(request, 'File size exceeds 10MB limit')
        return redirect(reverse('admin_evaluation') + '?tab=tasklist')
    
    try:
        # Load the workbook
        wb = openpyxl.load_workbook(uploaded_file, data_only=True)
        
        # Check if Tasklists sheet exists
        if 'Tasklists' not in wb.sheetnames:
            messages.error(request, 'Excel file must contain a "Tasklists" sheet')
            return redirect(reverse('admin_evaluation') + '?tab=tasklist')
        
        tasklist_sheet = wb['Tasklists']
        
        # Validate headers
        header_1 = tasklist_sheet.cell(row=1, column=1).value
        header_2 = tasklist_sheet.cell(row=1, column=2).value
        
        if str(header_1).strip().lower() != 'id number' or str(header_2).strip().lower() != 'tasklist':
            messages.error(request, 'Invalid Excel format. Headers must be "Id Number" and "Tasklist"')
            return redirect(reverse('admin_evaluation') + '?tab=tasklist')
        
        # Process the data
        success_count = 0
        error_count = 0
        errors = []
        
        for row_num in range(2, tasklist_sheet.max_row + 1):
            id_number = tasklist_sheet.cell(row=row_num, column=1).value
            task_text = tasklist_sheet.cell(row=row_num, column=2).value
            
            # Skip empty rows
            if not id_number or not task_text:
                continue
            
            # Validate data types
            id_number = str(id_number).strip()
            task_text = str(task_text).strip()
            
            if not id_number or not task_text:
                error_count += 1
                errors.append(f"Row {row_num}: Empty Id Number or Tasklist")
                continue
            
            try:
                # Find employee by idnumber
                employee = EmployeeLogin.objects.get(idnumber=id_number)
                
                # Check if tasklist already exists for this employee
                existing_task = TaskList.objects.filter(
                    employee=employee, 
                    tasklist=task_text
                ).first()
                
                if existing_task:
                    error_count += 1
                    errors.append(f"Row {row_num}: Task already exists for employee {employee.full_name}")
                    continue
                
                # Create new tasklist entry
                TaskList.objects.create(
                    employee=employee,
                    tasklist=task_text
                )
                success_count += 1
                
            except EmployeeLogin.DoesNotExist:
                error_count += 1
                errors.append(f"Row {row_num}: Employee with ID {id_number} not found")
            except Exception as e:
                error_count += 1
                errors.append(f"Row {row_num}: Error processing - {str(e)}")
        
        # Prepare success message
        if success_count > 0:
            messages.success(request, f'Successfully imported {success_count} tasklist entries')
        
        if error_count > 0:
            messages.warning(request, f'{error_count} entries failed to import')
            # Store errors in session for detailed display
            request.session['tasklist_import_errors'] = errors[:10]  # Limit to first 10 errors

        # Redirect back to admin_evaluation with tab query param
        return redirect(reverse('admin_evaluation') + '?tab=tasklist')

    except openpyxl.utils.exceptions.InvalidFileException:
        messages.error(request, 'Invalid Excel file format')
        return redirect(reverse('admin_evaluation') + '?tab=tasklist')
    except Exception as e:
        messages.error(request, f'Error processing file: {str(e)}')
        return redirect(reverse('admin_evaluation') + '?tab=tasklist')


@login_required
@require_http_methods(["GET"])
def get_user_tasklists(request, user_id):
    """Get tasklists for a specific user"""
    try:
        user = get_object_or_404(EmployeeLogin, id=user_id)
        tasklists = TaskList.objects.filter(employee=user).order_by('id')
        
        tasklist_data = [
            {
                'id': task.id,
                'tasklist': task.tasklist
            }
            for task in tasklists
        ]
        
        return JsonResponse({
            'success': True,
            'user_name': user.full_name,
            'user_id': user.id,
            'tasklists': tasklist_data
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def update_tasklist_item(request, tasklist_id):
    """Update a specific tasklist item"""
    try:
        tasklist = get_object_or_404(TaskList, id=tasklist_id)
        
        data = json.loads(request.body)
        new_tasklist_text = data.get('tasklist', '').strip()
        
        if not new_tasklist_text:
            return JsonResponse({
                'success': False,
                'error': 'Tasklist text cannot be empty'
            }, status=400)
        
        tasklist.tasklist = new_tasklist_text
        tasklist.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Tasklist updated successfully',
            'tasklist': {
                'id': tasklist.id,
                'tasklist': tasklist.tasklist
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def create_tasklist_item(request, user_id):
    """Create a new tasklist item for a specific user"""
    try:
        user = get_object_or_404(EmployeeLogin, id=user_id)
        
        data = json.loads(request.body)
        tasklist_text = data.get('tasklist', '').strip()
        
        if not tasklist_text:
            return JsonResponse({
                'success': False,
                'error': 'Tasklist text cannot be empty'
            }, status=400)
        
        # Check if tasklist already exists for this user
        existing_task = TaskList.objects.filter(
            employee=user, 
            tasklist=tasklist_text
        ).first()
        
        if existing_task:
            return JsonResponse({
                'success': False,
                'error': 'This tasklist already exists for this user'
            }, status=400)
        
        # Create new tasklist entry
        new_tasklist = TaskList.objects.create(
            employee=user,
            tasklist=tasklist_text
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Tasklist created successfully',
            'tasklist': {
                'id': new_tasklist.id,
                'tasklist': new_tasklist.tasklist
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def delete_tasklist_item(request, tasklist_id):
    """Delete a tasklist item"""
    try:
        tasklist = get_object_or_404(TaskList, id=tasklist_id)
        
        # Optional: Check if user has permission to delete this tasklist
        # For now, allowing any logged-in user to delete (as per admin context)
        
        tasklist_text = tasklist.tasklist  # Store for response
        tasklist.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Tasklist "{tasklist_text}" deleted successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)