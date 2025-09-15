from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.db.models import Q, Count
from django.views.decorators.http import require_http_methods
from datetime import datetime, date, timedelta
import calendar
import json
import pandas as pd
import openpyxl
from io import BytesIO
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from .models import Holiday, Timelogs, TodoItem
from .forms import HolidayForm
from django.utils import timezone
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from userlogin.models import EmployeeLogin
from .forms import TimelogForm, TimelogImportForm

# Helper function to format datetime in MM/DD/YYYY h:mmam/pm format
def format_timelog_datetime(dt):
    """Format datetime for timelog export in MM/DD/YYYY h:mmam/pm format"""
    if not dt:
        return ''
    return dt.strftime('%m/%d/%Y %I:%M%p').lower()
import pytz

@login_required
def calendar_view(request):
    current_date = timezone.localdate()
    year_raw = request.GET.get('year', '')
    month_raw = request.GET.get('month', '')
    try:
        year = int(year_raw) if year_raw else current_date.year
    except ValueError:
        year = current_date.year
    try:
        month = int(month_raw) if month_raw else current_date.month
    except ValueError:
        month = current_date.month
    cal = calendar.Calendar(firstweekday=6)
    month_days = cal.monthdayscalendar(year, month)

    holidays = Holiday.objects.all()
    holidays_dict = {}
    for holiday in holidays:
        base_date = holiday.date
        rep = getattr(holiday, 'repetition', 'none')
        for week in month_days:
            for day in week:
                if day == 0:
                    continue
                this_date = date(year, month, day)
                add = False
                if rep == 'none' and this_date == base_date:
                    add = True
                elif rep == 'yearly' and this_date.month == base_date.month and this_date.day == base_date.day:
                    add = True
                elif rep == 'monthly' and this_date.day == base_date.day:
                    add = True
                elif rep == 'weekly' and this_date.weekday() == base_date.weekday():
                    add = True
                elif rep == 'daily':
                    add = True
                if add:
                    date_str = this_date.strftime('%Y-%m-%d')
                    if date_str not in holidays_dict:
                        holidays_dict[date_str] = []
                    holidays_dict[date_str].append({
                        'id': holiday.id,
                        'name': holiday.name,
                        'type': holiday.holiday_type,
                        'description': holiday.description or '',
                        'repetition': getattr(holiday, 'repetition', 'none')
                    })
    user = request.user
    timelog_status = {}
    days_in_month = [date(year, month, day) for week in month_days for day in week if day != 0]
    user_timelogs = Timelogs.objects.filter(employee=user, time__year=year, time__month=month)
    logs_by_date = {}
    for log in user_timelogs:
        # Only count entries that have valid time values (matching client-side logic)
        # Check both that time exists and is not empty/whitespace (like client-side)
        if log.time and str(log.time).strip():
            d = log.time.date()
            d_str = d.strftime('%Y-%m-%d')
            if d_str not in logs_by_date:
                logs_by_date[d_str] = set()
            logs_by_date[d_str].add(log.entry)
    for d in days_in_month:
        d_str = d.strftime('%Y-%m-%d')
        entries = logs_by_date.get(d_str, set())

        # Only show warning icons for incomplete dates (missing timein OR timeout)
        # Complete dates and empty dates both show no icon
        if entries and not ('timein' in entries and 'timeout' in entries):
            timelog_status[d_str] = 'incomplete'
        else:
            timelog_status[d_str] = 'none'
    calendar_timelogs = {}
    for log in user_timelogs:
        # Apply the same filtering logic as logs_by_date
        if log.time and str(log.time).strip():
            d_str = log.time.date().strftime('%Y-%m-%d')
            if d_str not in calendar_timelogs:
                calendar_timelogs[d_str] = []
            calendar_timelogs[d_str].append({
                'entry': log.entry,
                'time': log.time.isoformat(),
            })

    today_date = timezone.localdate()
    context = {
        'year': year,
        'month': month,
        'month_name': calendar.month_name[month],
        'month_days': month_days,
        'holidays': json.dumps(holidays_dict),
        'timelog_status': json.dumps(timelog_status),
        'calendar_timelogs': json.dumps(calendar_timelogs),
        'today': today_date.strftime('%Y-%m-%d'),
        'today_date': today_date,
        'hr_admin': request.user.hr_admin,
        'holiday_form': HolidayForm() if request.user.hr_admin else None,
    }
    return render(request, 'usercalendar/calendar.html', context)

@login_required
@require_http_methods(["POST"])
def add_holiday(request):
    if not request.user.hr_admin:
        messages.error(request, 'You do not have permission to add holidays.')
        return redirect('calendar_view')
    
    form = HolidayForm(request.POST, request.FILES)
    
    if form.is_valid():
        holiday = form.save(commit=False)
        holiday.created_by = request.user
        holiday.save()
        messages.success(request, f'Holiday "{holiday.name}" added successfully.')
        
        # Extract year and month from the holiday date to redirect to the correct month
        if holiday.date:
            year = holiday.date.year
            month = holiday.date.month
            url = reverse('calendar_view') + f'?year={year}&month={month}'
            return redirect(url)
    
    # If form is invalid or no date, show errors and redirect to current month
    for field, errors in form.errors.items():
        for error in errors:
            messages.error(request, f'{field.title()}: {error}')
    
    # Get current year/month from request or use today's date
    current_date = timezone.localdate()
    year = request.GET.get('year', current_date.year)
    month = request.GET.get('month', current_date.month)
    
    url = reverse('calendar_view') + f'?year={year}&month={month}'
    return redirect(url)

@login_required
def get_holidays_api(request):
    year = int(request.GET.get('year'))
    month = int(request.GET.get('month'))
    
    holidays = Holiday.objects.filter(
        date__year=year,
        date__month=month
    ).values('id', 'date', 'name', 'holiday_type', 'description')
    
    holidays_dict = {}
    for holiday in holidays:
        date_str = holiday['date'].strftime('%Y-%m-%d')
        if date_str not in holidays_dict:
            holidays_dict[date_str] = []
        holidays_dict[date_str].append({
            'id': holiday['id'],
            'name': holiday['name'],
            'type': holiday['holiday_type'],
            'description': holiday['description'] or ''
        })
    
    return JsonResponse(holidays_dict)

@login_required
@require_http_methods(["POST"])
def edit_holiday(request, pk):
    if not request.user.hr_admin:
        messages.error(request, 'You do not have permission to edit holidays.')
        return redirect('calendar_view')
    holiday = get_object_or_404(Holiday, pk=pk)
    form = HolidayForm(request.POST, request.FILES, instance=holiday)
    if form.is_valid():
        form.save()
        messages.success(request, f'Holiday "{holiday.name}" updated successfully.')
        
        # Redirect to the month where the holiday is located
        if holiday.date:
            year = holiday.date.year
            month = holiday.date.month
            url = reverse('calendar_view') + f'?year={year}&month={month}'
            return redirect(url)
    
    # If form is invalid, show errors and redirect to current month
    for field, errors in form.errors.items():
        for error in errors:
            messages.error(request, f'{field.title()}: {error}')
    
    # Get current year/month from request or use today's date
    current_date = timezone.localdate()
    year = request.GET.get('year', current_date.year)
    month = request.GET.get('month', current_date.month)
    
    url = reverse('calendar_view') + f'?year={year}&month={month}'
    return redirect(url)

@login_required
@require_http_methods(["POST"])
def delete_holiday(request, pk):
    if not request.user.hr_admin:
        messages.error(request, 'You do not have permission to delete holidays.')
        return redirect('calendar_view')
    holiday = get_object_or_404(Holiday, pk=pk)
    
    # Store the date before deleting to redirect to the correct month
    holiday_date = holiday.date
    holiday.delete()
    messages.success(request, 'Event deleted successfully.')
    
    # Redirect to the month where the holiday was located
    if holiday_date:
        year = holiday_date.year
        month = holiday_date.month
        url = reverse('calendar_view') + f'?year={year}&month={month}'
        return redirect(url)
    
    # If no date, redirect to current month
    current_date = timezone.localdate()
    year = request.GET.get('year', current_date.year)
    month = request.GET.get('month', current_date.month)
    
    url = reverse('calendar_view') + f'?year={year}&month={month}'
    return redirect(url)

@login_required
def get_todos_api(request):
    user = request.user
    date_str = request.GET.get('date')
    if not date_str:
        return JsonResponse({'error': 'Missing date'}, status=400)
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Invalid date'}, status=400)
    todos = TodoItem.objects.filter(user=user, date=date_obj).order_by('time')
    data = [
        {
            'id': todo.id,
            'description': todo.description,
            'time': todo.time.strftime('%H:%M') if todo.time else '',
            'completed': todo.completed,
        }
        for todo in todos
    ]
    return JsonResponse({'todos': data})

@login_required
@require_http_methods(["POST"])
def add_todo_api(request):
    user = request.user
    data = json.loads(request.body.decode('utf-8'))
    description = data.get('description', '').strip()
    time_str = data.get('time', '').strip()
    date_str = data.get('date', '').strip()
    if not description or not date_str:
        return JsonResponse({'error': 'Missing required fields'}, status=400)
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Invalid date'}, status=400)
    time_obj = None
    if time_str:
        try:
            time_obj = datetime.strptime(time_str, '%H:%M').time()
        except ValueError:
            return JsonResponse({'error': 'Invalid time'}, status=400)
    todo = TodoItem.objects.create(user=user, date=date_obj, time=time_obj, description=description)
    return JsonResponse({'success': True, 'id': todo.id})

@login_required
@require_http_methods(["POST"])
def toggle_todo_api(request):
    user = request.user
    data = json.loads(request.body.decode('utf-8'))
    todo_id = data.get('id')
    try:
        todo = TodoItem.objects.get(id=todo_id, user=user)
    except TodoItem.DoesNotExist:
        return JsonResponse({'error': 'To-do not found'}, status=404)
    todo.completed = not todo.completed
    todo.save()
    return JsonResponse({'success': True, 'completed': todo.completed})

@login_required
def get_timelogs_api(request):
    user = request.user
    date_str = request.GET.get('date')
    if not date_str:
        return JsonResponse({'error': 'Missing date'}, status=400)
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return JsonResponse({'error': 'Invalid date'}, status=400)
    
    logs = Timelogs.objects.filter(employee=user, time__date=date_obj).order_by('time')
    # Apply the same filtering logic as the main calendar view
    data = [
        {
            'entry': log.entry,
            'time': log.time.isoformat() if log.time else None,
        }
        for log in logs
        if log.time and str(log.time).strip()  # Only include logs with valid time values
    ]
    return JsonResponse({'timelogs': data})

# TIME LOGS

def hr_admin_required(view_func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        if not (request.user.is_superuser):
            return JsonResponse({'error': 'HR admin access required'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

@login_required
@hr_admin_required
def timelogs_page(request):
    return render(request, 'usercalendar/timelogs.html')

@login_required
@hr_admin_required
@require_http_methods(["GET"])
def get_employees_with_timelogs(request):
    try:
        search = request.GET.get('search', '').strip()
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        department = request.GET.get('department')
        
        # Base queryset
        employees = EmployeeLogin.objects.filter(
            active=True,
            wire_admin=False,
            clinic_admin=False,
            iad_admin=False,
            accounting_admin=False,
            hr_admin=False,
            hr_manager=False,
            mis_admin=False
        )
        
        # Apply search filter
        if search:
            employees = employees.filter(
                Q(firstname__icontains=search) |
                Q(lastname__icontains=search) |
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(idnumber__icontains=search)
            )
        
        # Apply department filter (if implemented in your model)
        if department and department != 'all':
            # Add department filtering logic based on your model structure
            pass
        
        # Get employees with their time logs
        employees_data = []
        for employee in employees:
            timelogs_query = employee.timelogs_set.all()
            
            # Apply date filter to time logs
            if start_date:
                try:
                    start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                    timelogs_query = timelogs_query.filter(time__gte=start_datetime)
                except ValueError:
                    pass
            
            if end_date:
                try:
                    end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                    timelogs_query = timelogs_query.filter(time__lt=end_datetime)
                except ValueError:
                    pass
            
            timelogs = timelogs_query.order_by('-time')
            
            employee_data = {
                'id': employee.id,
                'name': f"{employee.firstname or ''} {employee.lastname or ''}".strip(),
                'email': employee.email,
                'idnumber': employee.idnumber,
                'avatar': employee.avatar.url if employee.avatar else None,
                'timelogs': [
                    {
                        'id': log.id,
                        'time': log.time.isoformat(),
                        'date': log.time.strftime('%Y-%m-%d'),
                        'time_only': log.time.strftime('%H:%M'),
                        'entry': log.entry,
                        'created_at': log.created_at.isoformat() if log.created_at else None,
                    }
                    for log in timelogs
                ]
            }
            employees_data.append(employee_data)
        
        return JsonResponse({
            'success': True,
            'employees': employees_data,
            'total': len(employees_data)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error loading employees: {str(e)}'
        }, status=500)

@login_required
@hr_admin_required
@require_http_methods(["POST"])
def import_timelogs(request):
    """Import time logs from Excel file"""
    try:
        if 'file' not in request.FILES:
            return JsonResponse({
                'success': False,
                'message': 'No file provided'
            }, status=400)
        
        excel_file = request.FILES['file']
        
        # Validate file type
        if not excel_file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({
                'success': False,
                'message': 'Invalid file format. Please upload an Excel file (.xlsx or .xls)'
            }, status=400)
        
        # Read Excel file
        try:
            df = pd.read_excel(excel_file)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Error reading Excel file: {str(e)}'
            }, status=400)
        
        # Validate required columns
        required_columns = ['ID Number', 'Name', 'Date and Time', 'Entry']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return JsonResponse({
                'success': False,
                'message': f'Missing required columns: {", ".join(missing_columns)}'
            }, status=400)
        
        # Process each row
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Get employee by ID number
                id_number = str(row['ID Number']).strip()
                employee = EmployeeLogin.objects.filter(idnumber=id_number).first()
                
                if not employee:
                    errors.append(f"Row {index + 2}: Employee with ID {id_number} not found")
                    error_count += 1
                    continue
                
                # Parse datetime
                datetime_str = str(row['Date and Time']).strip()
                try:
                    if pd.isna(row['Date and Time']):
                        raise ValueError("Empty datetime")
                    
                    # Handle different datetime formats
                    if isinstance(row['Date and Time'], pd.Timestamp):
                        log_datetime = row['Date and Time'].to_pydatetime()
                        # Make timezone aware if not already
                        if log_datetime.tzinfo is None:
                            log_datetime = timezone.make_aware(log_datetime, timezone.get_current_timezone())
                    else:
                        # Try different datetime formats including 12-hour format with am/pm
                        datetime_formats = [
                            '%m/%d/%Y %I:%M%p',        # 08/15/2025 9:00am
                            '%m/%d/%Y %I:%M %p',       # 08/15/2025 9:00 am
                            '%Y-%m-%d %H:%M:%S',       # 2024-01-15 09:00:00 (legacy)
                            '%Y-%m-%d %H:%M',          # 2024-01-15 09:00 (legacy)
                            '%m/%d/%Y %H:%M:%S',       # 08/15/2025 09:00:00
                            '%m/%d/%Y %H:%M',          # 08/15/2025 09:00
                        ]
                        
                        # Clean up the datetime string
                        datetime_str_clean = datetime_str.replace(' ', ' ').strip()
                        
                        for fmt in datetime_formats:
                            try:
                                log_datetime = datetime.strptime(datetime_str_clean, fmt)
                                # Make timezone aware
                                log_datetime = timezone.make_aware(log_datetime, timezone.get_current_timezone())
                                break
                            except ValueError:
                                continue
                        else:
                            raise ValueError(f"Unable to parse datetime: {datetime_str}")
                    
                except (ValueError, AttributeError) as e:
                    errors.append(f"Row {index + 2}: Invalid datetime format: {datetime_str}")
                    error_count += 1
                    continue
                
                # Validate entry type
                entry = str(row['Entry']).strip().lower()
                if entry not in ['timein', 'timeout', 'time in', 'time out']:
                    errors.append(f"Row {index + 2}: Invalid entry type: {row['Entry']}")
                    error_count += 1
                    continue
                
                # Normalize entry type
                entry = 'timein' if entry in ['timein', 'time in'] else 'timeout'
                
                # Create or update time log
                timelog, created = Timelogs.objects.get_or_create(
                    employee=employee,
                    time=log_datetime,
                    defaults={'entry': entry}
                )
                
                if not created:
                    # Update existing entry if different
                    if timelog.entry != entry:
                        timelog.entry = entry
                        timelog.save()
                
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
                error_count += 1
        
        response_data = {
            'success': True,
            'message': f'Import completed. {success_count} records processed successfully.',
            'success_count': success_count,
            'error_count': error_count
        }
        
        if errors:
            response_data['errors'] = errors[:10]  # Limit to first 10 errors
            if len(errors) > 10:
                response_data['errors'].append(f"... and {len(errors) - 10} more errors")
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Import failed: {str(e)}'
        }, status=500)

@login_required
@hr_admin_required
@require_http_methods(["GET"])
def export_template(request):
    """Export Excel template for time logs import"""
    try:
        # Create a new workbook and worksheet
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Time Logs Template"
        
        # Define headers
        headers = ['ID Number', 'Name', 'Date and Time', 'Entry']
        
        # Style definitions
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Write headers
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = border
        
        # Add sample data
        sample_data = [
            ['001', 'John Doe', '08/15/2025 9:00am', 'timein'],
            ['001', 'John Doe', '08/15/2025 5:00pm', 'timeout'],
            ['002', 'Jane Smith', '08/15/2025 8:30am', 'timein'],
            ['002', 'Jane Smith', '08/15/2025 5:30pm', 'timeout'],
        ]

        for row, data in enumerate(sample_data, 2):
            for col, value in enumerate(data, 1):
                cell = ws.cell(row=row, column=col, value=value)
                cell.border = border        # Adjust column widths
        column_widths = [12, 25, 20, 15]
        for col, width in enumerate(column_widths, 1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = width
        
        # Add instructions
        instructions_row = len(sample_data) + 4
        instructions = [
            "Instructions:",
            "1. ID Number: Employee ID number (must match existing employee)",
            "2. Name: Employee full name (for reference only)",
            "3. Date and Time: Format MM/DD/YYYY h:mmam/pm (e.g., 08/15/2025 9:00am or 08/15/2025 5:30pm)",
            "4. Entry: 'timein' or 'timeout' (case insensitive)",
            "",
            "Note: Remove sample data before importing your actual data."
        ]
        
        for i, instruction in enumerate(instructions):
            cell = ws.cell(row=instructions_row + i, column=1, value=instruction)
            if i == 0:  # Instructions header
                cell.font = Font(bold=True)
        
        # Save to BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Create response
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="timelog_template.xlsx"'
        
        return response
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error generating template: {str(e)}'
        }, status=500)

@login_required
@hr_admin_required
@require_http_methods(["POST"])
def add_timelog(request):
    """Add a new time log entry"""
    try:
        data = json.loads(request.body)
        
        # Get employee
        employee = get_object_or_404(EmployeeLogin, id=data.get('employee_id'))
        
        # Parse datetime
        date_str = data.get('date')
        time_str = data.get('time')
        
        if not date_str or not time_str:
            return JsonResponse({
                'success': False,
                'message': 'Date and time are required'
            }, status=400)
        
        try:
            datetime_str = f"{date_str} {time_str}"
            log_datetime = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
            log_datetime = timezone.make_aware(log_datetime, timezone.get_current_timezone())
        except ValueError:
            return JsonResponse({
                'success': False,
                'message': 'Invalid date or time format'
            }, status=400)
        
        # Validate entry type
        entry = data.get('entry')
        if entry not in ['timein', 'timeout']:
            return JsonResponse({
                'success': False,
                'message': 'Invalid entry type'
            }, status=400)
        
        # Check for duplicate entries
        existing = Timelogs.objects.filter(
            employee=employee,
            time=log_datetime
        ).exists()
        
        if existing:
            return JsonResponse({
                'success': False,
                'message': 'A time log entry already exists for this date and time'
            }, status=400)
        
        # Create time log
        timelog = Timelogs.objects.create(
            employee=employee,
            time=log_datetime,
            entry=entry
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Time log added successfully',
            'timelog': {
                'id': timelog.id,
                'time': timelog.time.isoformat(),
                'entry': timelog.entry
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error adding time log: {str(e)}'
        }, status=500)

@login_required
@hr_admin_required
@require_http_methods(["GET"])
def get_timelog(request, timelog_id):
    """Get a specific time log entry"""
    try:
        timelog = get_object_or_404(Timelogs, id=timelog_id)
        
        return JsonResponse({
            'id': timelog.id,
            'employee_name': f"{timelog.employee.firstname or ''} {timelog.employee.lastname or ''}".strip(),
            'employee_id': timelog.employee.id,
            'date': timelog.time.strftime('%Y-%m-%d'),
            'time': timelog.time.strftime('%H:%M'),
            'entry': timelog.entry,
            'created_at': timelog.created_at.isoformat() if timelog.created_at else None
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error loading time log: {str(e)}'
        }, status=500)

@csrf_exempt
@login_required
@hr_admin_required
@require_http_methods(["PUT"])
def update_timelog(request, timelog_id):
    """Update a time log entry"""
    try:
        timelog = get_object_or_404(Timelogs, id=timelog_id)
        data = json.loads(request.body)
        
        # Parse datetime
        date_str = data.get('date')
        time_str = data.get('time')
        
        if not date_str or not time_str:
            return JsonResponse({
                'success': False,
                'message': 'Date and time are required'
            }, status=400)
        
        try:
            datetime_str = f"{date_str} {time_str}"
            log_datetime = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
            log_datetime = timezone.make_aware(log_datetime, timezone.get_current_timezone())
        except ValueError:
            return JsonResponse({
                'success': False,
                'message': 'Invalid date or time format'
            }, status=400)
        
        # Validate entry type
        entry = data.get('entry')
        if entry not in ['timein', 'timeout']:
            return JsonResponse({
                'success': False,
                'message': 'Invalid entry type'
            }, status=400)
        
        # Check for duplicate entries (excluding current entry)
        existing = Timelogs.objects.filter(
            employee=timelog.employee,
            time=log_datetime
        ).exclude(id=timelog.id).exists()
        
        if existing:
            return JsonResponse({
                'success': False,
                'message': 'A time log entry already exists for this date and time'
            }, status=400)
        
        # Update time log
        timelog.time = log_datetime
        timelog.entry = entry
        timelog.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Time log updated successfully'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error updating time log: {str(e)}'
        }, status=500)

@login_required
@hr_admin_required
@require_http_methods(["DELETE"])
def delete_timelog(request, timelog_id):
    """Delete a time log entry"""
    try:
        timelog = get_object_or_404(Timelogs, id=timelog_id)
        timelog.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Time log deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error deleting time log: {str(e)}'
        }, status=500)