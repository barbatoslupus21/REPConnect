from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.urls import reverse
from django.core.paginator import Paginator
from django.db.models import Q, Count, F, Case, When, Max
from django.db import models
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
import json
import csv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime, timedelta
from userlogin.models import EmployeeLogin
from .models import (
    Survey, Question, SurveyResponse, Answer, 
    SurveyTemplate, SurveyCategory, SurveyDraft, SurveyAnalytics
)
from .forms import SurveyForm, QuestionForm, SurveyTemplateForm, SurveyCategoryForm
from django.template.loader import render_to_string

@login_required
def survey_dashboard(request):
    if request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin:
        return redirect('admin_dashboard')
    else:
        return redirect('user_dashboard')

@login_required
def admin_dashboard(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return redirect('user_dashboard')
    
    # Statistics
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_last_month = (first_of_this_month - timedelta(days=1)).replace(day=1)

    # Totals
    total_surveys = Survey.objects.count()
    active_surveys = Survey.objects.filter(status='active').count()
    total_responses = SurveyResponse.objects.filter(is_complete=True).count()

    # Month vs last month comparisons
    # Surveys created this month vs last month
    surveys_this_month = Survey.objects.filter(created_at__gte=first_of_this_month).count()
    surveys_last_month = Survey.objects.filter(created_at__gte=first_of_last_month, created_at__lt=first_of_this_month).count()
    employees_percent = 0
    employees_positive = True
    if surveys_last_month:
        employees_percent = round(((surveys_this_month - surveys_last_month) / surveys_last_month) * 100, 1)
        employees_positive = surveys_this_month >= surveys_last_month

    # Active surveys this month vs last month (based on created_at of active surveys)
    active_this_month = Survey.objects.filter(status='active', created_at__gte=first_of_this_month).count()
    active_last_month = Survey.objects.filter(status='active', created_at__gte=first_of_last_month, created_at__lt=first_of_this_month).count()
    payslips_percent = 0
    payslips_positive = True
    if active_last_month:
        payslips_percent = round(((active_this_month - active_last_month) / active_last_month) * 100, 1)
        payslips_positive = active_this_month >= active_last_month

    # Responses this month vs last month
    responses_this_month = SurveyResponse.objects.filter(is_complete=True, submitted_at__gte=first_of_this_month).count()
    responses_last_month = SurveyResponse.objects.filter(is_complete=True, submitted_at__gte=first_of_last_month, submitted_at__lt=first_of_this_month).count()
    loans_percent = 0
    loans_positive = True
    if responses_last_month:
        loans_percent = round(((responses_this_month - responses_last_month) / responses_last_month) * 100, 1)
        loans_positive = responses_this_month >= responses_last_month
    
    # Recent surveys
    recent_surveys = Survey.objects.select_related('created_by', 'category').order_by('-created_at').filter(created_by=request.user)
    
    # Survey categories
    categories = SurveyCategory.objects.annotate(
        survey_count=Count('survey')
    ).order_by('name')
    
    context = {
        'total_surveys': total_surveys,
        'active_surveys': active_surveys,
        'total_responses': total_responses,
        'recent_surveys': recent_surveys,
        'categories': categories,
        'employees_percent': employees_percent,
        'employees_positive': employees_positive,
        'payslips_percent': payslips_percent,
        'payslips_positive': payslips_positive,
        'loans_percent': loans_percent,
        'loans_positive': loans_positive,
    }
    
    return render(request, 'survey/admin_dashboard.html', context)

@login_required
def user_dashboard(request):
    # Get surveys assigned to user
    if request.user.is_admin:
        assigned_surveys = Survey.objects.filter(
            Q(visibility='all') | Q(selected_users=request.user),
            status='active'
        ).distinct().order_by('-created_at')
    else:
        assigned_surveys = Survey.objects.filter(
            Q(visibility='all') | Q(selected_users=request.user),
            status='active'
        ).distinct().order_by('-created_at')
    
    # Get user's responses
    user_responses = SurveyResponse.objects.filter(
        user=request.user,
        is_complete=True
    ).values_list('survey_id', flat=True)
    
    # Categorize surveys
    pending_surveys = []
    completed_surveys = []
    
    for survey in assigned_surveys:
        if survey.id in user_responses:
            completed_surveys.append(survey)
        else:
            pending_surveys.append(survey)
    
    context = {
        'pending_surveys': pending_surveys,
        'completed_surveys': completed_surveys,
        'total_assigned': len(assigned_surveys),
        'total_completed': len(completed_surveys),
        'completion_rate': (len(completed_surveys) / len(assigned_surveys) * 100) if assigned_surveys else 0,
    }
    
    return render(request, 'survey/user_dashboard.html', context)

@login_required
def survey_list(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return redirect('user_dashboard')
    
    surveys = Survey.objects.select_related('created_by', 'category').order_by('-created_at')
    
    # Search functionality
    search = request.GET.get('search', '')
    if search:
        surveys = surveys.filter(
            Q(title__icontains=search) |
            Q(description__icontains=search) |
            Q(category__name__icontains=search)
        )
    
    # Filter by status
    status = request.GET.get('status', '')
    if status:
        surveys = surveys.filter(status=status)
    
    # Filter by category
    category = request.GET.get('category', '')
    if category:
        surveys = surveys.filter(category_id=category)
    
    # Pagination
    paginator = Paginator(surveys, 10)
    page_number = request.GET.get('page')
    surveys = paginator.get_page(page_number)
    
    categories = SurveyCategory.objects.all()
    
    context = {
        'surveys': surveys,
        'categories': categories,
        'search': search,
        'status_filter': status,
        'category_filter': category,
    }
    
    return render(request, 'survey/survey_list.html', context)


@login_required
def admin_table(request):
    """AJAX endpoint returning the admin survey table rows and pagination HTML."""
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'success': False, 'message': 'permission denied'}, status=403)

    search = request.GET.get('search', '').strip()
    page = int(request.GET.get('page', 1))

    surveys = Survey.objects.select_related('created_by', 'category').order_by('-created_at')
    if search:
        surveys = surveys.filter(
            Q(title__icontains=search) |
            Q(description__icontains=search) |
            Q(category__name__icontains=search)
        )

    paginator = Paginator(surveys, 10)
    page_obj = paginator.get_page(page)

    table_html = render_to_string('survey/partials/admin_survey_table.html', {'recent_surveys': page_obj})

    # Build pagination HTML directly (not using a partial)
    p = page_obj
    parts = []
    parts.append(f'<div class="pagination" id="ticketsPaginationContainer">')
    parts.append('<div class="pagination-info">')
    try:
        start = p.start_index()
    except Exception:
        start = 0
    try:
        end = p.end_index()
    except Exception:
        end = 0
    total = p.paginator.count if getattr(p, 'paginator', None) is not None else 0
    parts.append(f'Showing <span id="ticketsStartRecord">{start}</span> to <span id="ticketsEndRecord">{end}</span> of <span id="ticketsTotalRecords">{total}</span> entries')
    parts.append('</div>')

    parts.append('<div class="pagination-controls" id="ticketsPaginationControls">')
    if p.has_previous():
        parts.append(f'<button class="pagination-btn" data-page="{p.previous_page_number()}"><i class="fas fa-chevron-left"></i></button>')
    else:
        parts.append('<span class="pagination-btn disabled"><i class="fas fa-chevron-left"></i></span>')

    parts.append('<div id="ticketsPageNumbers">')
    if hasattr(p.paginator, 'page_range'):
        for num in p.paginator.page_range:
            try:
                current = p.number
            except Exception:
                current = 1
            if current == num:
                parts.append(f'<span class="pagination-btn active">{num}</span>')
            elif abs(current - num) < 3:
                parts.append(f'<button class="pagination-btn" data-page="{num}">{num}</button>')
    else:
        parts.append('<span class="pagination-btn active">1</span>')
    parts.append('</div>')

    if p.has_next():
        parts.append(f'<button class="pagination-btn" data-page="{p.next_page_number()}"><i class="fas fa-chevron-right"></i></button>')
    else:
        parts.append('<span class="pagination-btn disabled"><i class="fas fa-chevron-right"></i></span>')

    parts.append('</div>')
    parts.append('</div>')

    pagination_html = ''.join(parts)

    return JsonResponse({'success': True, 'table_html': table_html, 'pagination_html': pagination_html})

@login_required
def create_survey(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        messages.error(request, 'You do not have permission to create surveys.')
        return redirect('user_dashboard')
    
    if request.method == 'POST':
        form = SurveyForm(request.POST)
        if form.is_valid():
            survey = form.save(commit=False)
            survey.created_by = request.user
            survey.save()
            
            if survey.visibility == 'selected':
                selected_users = request.POST.getlist('selected_users')
                survey.selected_users.set(selected_users)
            
            messages.success(request, 'Survey created successfully!')
            return redirect('edit_survey', survey_id=survey.id)
    else:
        form = SurveyForm()
    
    users = EmployeeLogin.objects.filter(is_active=True).order_by('firstname', 'lastname')
    categories = SurveyCategory.objects.all()
    templates = SurveyTemplate.objects.filter(is_active=True).order_by('name')
    
    context = {
        'form': form,
        'users': users,
        'categories': categories,
        'templates': templates,
    }
    
    return render(request, 'survey/create_survey.html', context)

@login_required
def edit_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to edit this survey.')
        return redirect('survey_list')
    
    if request.method == 'POST':
        form = SurveyForm(request.POST, instance=survey)
        if form.is_valid():
            survey = form.save()
            
            if survey.visibility == 'selected':
                selected_users = request.POST.getlist('selected_users')
                survey.selected_users.set(selected_users)
            else:
                survey.selected_users.clear()
            
            messages.success(request, 'Survey updated successfully!')
            return redirect('survey_detail', survey_id=survey.id)
    else:
        form = SurveyForm(instance=survey)
    
    questions = survey.questions.order_by('order')
    users = EmployeeLogin.objects.filter(is_active=True).order_by('firstname', 'lastname')
    categories = SurveyCategory.objects.all()
    
    context = {
        'form': form,
        'survey': survey,
        'questions': questions,
        'users': users,
        'categories': categories,
    }
    
    return render(request, 'survey/edit_survey.html', context)

@login_required
def survey_detail(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to view this survey.')
        return redirect('survey_list')
    
    questions = survey.questions.order_by('order')
    responses = SurveyResponse.objects.filter(survey=survey, is_complete=True)
    
    # Analytics
    total_assigned = survey.get_assigned_users().count()
    total_responses = responses.count()
    completion_rate = (total_responses / total_assigned * 100) if total_assigned > 0 else 0
    
    # Recent responses
    recent_responses = responses.select_related('user').order_by('-submitted_at')[:5]
    
    context = {
        'survey': survey,
        'questions': questions,
        'total_assigned': total_assigned,
        'total_responses': total_responses,
        'completion_rate': completion_rate,
        'recent_responses': recent_responses,
    }
    
    return render(request, 'survey/survey_detail.html', context)

@login_required
def take_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id, status='active')
    
    # Check if user is assigned to this survey
    if survey.visibility == 'selected' and not survey.selected_users.filter(id=request.user.id).exists():
        if not request.user.is_admin:
            messages.error(request, 'You are not assigned to this survey.')
            return redirect('user_dashboard')
    
    # Check if survey is expired
    if survey.is_expired():
        messages.error(request, 'This survey has expired.')
        return redirect('user_dashboard')
    
    # Check if user already completed the survey
    existing_response = SurveyResponse.objects.filter(
        survey=survey, 
        user=request.user, 
        is_complete=True
    ).first()
    
    if existing_response and not survey.allow_multiple_responses:
        messages.info(request, 'You have already completed this survey.')
        return redirect('view_response', response_id=existing_response.id)
    
    # Get or create incomplete response
    response, created = SurveyResponse.objects.get_or_create(
        survey=survey,
        user=request.user,
        is_complete=False,
        defaults={
            'ip_address': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }
    )
    
    if request.method == 'POST':
        questions = survey.questions.order_by('order')
        all_answered = True
        
        for question in questions:
            answer_key = f'question_{question.id}'
            
            # Get or create answer
            answer, created = Answer.objects.get_or_create(
                response=response,
                question=question
            )
            
            # Process answer based on question type
            if question.question_type == 'single_choice':
                selected = request.POST.get(answer_key)
                if selected:
                    answer.selected_options = [selected]
                elif question.required:
                    all_answered = False
                    
            elif question.question_type == 'multiple_choice':
                selected = request.POST.getlist(answer_key)
                if selected:
                    answer.selected_options = selected
                elif question.required:
                    all_answered = False
                    
            elif question.question_type == 'rating_scale':
                rating = request.POST.get(answer_key)
                if rating:
                    answer.rating_value = int(rating)
                elif question.required:
                    all_answered = False
                    
            elif question.question_type == 'dropdown':
                selected = request.POST.get(answer_key)
                if selected:
                    answer.text_answer = selected
                elif question.required:
                    all_answered = False
                    
            elif question.question_type in ['short_answer', 'paragraph']:
                text = request.POST.get(answer_key, '').strip()
                if text:
                    answer.text_answer = text
                elif question.required:
                    all_answered = False
                    
            elif question.question_type == 'yes_no':
                value = request.POST.get(answer_key)
                if value is not None:
                    answer.boolean_answer = value == 'true'
                elif question.required:
                    all_answered = False
                    
            elif question.question_type == 'date':
                date_value = request.POST.get(answer_key)
                if date_value:
                    answer.date_answer = datetime.strptime(date_value, '%Y-%m-%d').date()
                elif question.required:
                    all_answered = False
            
            answer.save()
        
        # Check if submitting final response
        if 'submit_survey' in request.POST:
            if all_answered:
                response.is_complete = True
                response.submitted_at = timezone.now()
                response.save()
                
                messages.success(request, 'Survey submitted successfully!')
                return redirect('view_response', response_id=response.id)
            else:
                messages.error(request, 'Please answer all required questions.')
        else:
            messages.success(request, 'Progress saved successfully!')
    
    questions = survey.questions.order_by('order')
    answers = {answer.question_id: answer for answer in response.answers.all()}
    
    # Calculate progress
    total_questions = questions.count()
    answered_questions = response.answers.count()
    progress = (answered_questions / total_questions * 100) if total_questions > 0 else 0
    
    context = {
        'survey': survey,
        'questions': questions,
        'answers': answers,
        'response': response,
        'progress': progress,
    }
    
    return render(request, 'survey/take_survey.html', context)

@login_required
def view_response(request, response_id):
    response = get_object_or_404(SurveyResponse, id=response_id)
    
    # Check permissions
    if not (request.user == response.user or request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        messages.error(request, 'You do not have permission to view this response.')
        return redirect('user_dashboard')
    
    questions = response.survey.questions.order_by('order')
    answers = {answer.question_id: answer for answer in response.answers.all()}
    
    context = {
        'response': response,
        'questions': questions,
        'answers': answers,
    }
    
    return render(request, 'survey/view_response.html', context)

@login_required
@require_POST
def add_question(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        # Get the next order number
        last_order = survey.questions.aggregate(models.Max('order'))['order__max'] or 0
        
        question = Question.objects.create(
            survey=survey,
            question_text=data.get('question_text', ''),
            question_type=data.get('question_type', 'short_answer'),
            required=data.get('required', True),
            order=last_order + 1,
            description=data.get('description', ''),
            options=data.get('options', []),
            min_value=data.get('min_value'),
            max_value=data.get('max_value'),
            validation_rules=data.get('validation_rules', {})
        )
        
        return JsonResponse({
            'success': True,
            'question': {
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'required': question.required,
                'order': question.order,
                'options': question.options,
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def update_question(request, question_id):
    question = get_object_or_404(Question, id=question_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or question.survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        question.question_text = data.get('question_text', question.question_text)
        question.question_type = data.get('question_type', question.question_type)
        question.required = data.get('required', question.required)
        question.description = data.get('description', question.description)
        question.options = data.get('options', question.options)
        question.min_value = data.get('min_value', question.min_value)
        question.max_value = data.get('max_value', question.max_value)
        question.validation_rules = data.get('validation_rules', question.validation_rules)
        
        question.save()
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def delete_question(request, question_id):
    question = get_object_or_404(Question, id=question_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or question.survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    question.delete()
    return JsonResponse({'success': True})

@login_required
@require_POST
def reorder_questions(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        question_ids = data.get('question_ids', [])
        
        for index, question_id in enumerate(question_ids):
            Question.objects.filter(id=question_id, survey=survey).update(order=index + 1)
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def export_survey_responses(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to export this survey.')
        return redirect('survey_list')
    
    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Survey Responses - {survey.title[:20]}"
    
    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    
    # Create headers
    headers = ['Response ID', 'User', 'Email', 'Submitted At', 'Completion Status']
    questions = survey.questions.order_by('order')
    
    for question in questions:
        headers.append(f"Q{question.order}: {question.question_text[:50]}")
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
    
    # Write data
    responses = SurveyResponse.objects.filter(survey=survey).select_related('user').order_by('-submitted_at')
    
    for row, response in enumerate(responses, 2):
        ws.cell(row=row, column=1, value=response.id)
        ws.cell(row=row, column=2, value=f"{response.user.firstname} {response.user.lastname}")
        ws.cell(row=row, column=3, value=response.user.email)
        ws.cell(row=row, column=4, value=response.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if response.submitted_at else 'Not submitted')
        ws.cell(row=row, column=5, value='Complete' if response.is_complete else 'Incomplete')
        
        # Get answers for this response
        answers = {answer.question_id: answer for answer in response.answers.all()}
        
        for col, question in enumerate(questions, 6):
            answer = answers.get(question.id)
            if answer:
                if question.question_type in ['single_choice', 'multiple_choice']:
                    value = ', '.join(answer.selected_options) if answer.selected_options else ''
                elif question.question_type == 'rating_scale':
                    value = answer.rating_value or ''
                elif question.question_type == 'yes_no':
                    value = 'Yes' if answer.boolean_answer else 'No' if answer.boolean_answer is not None else ''
                elif question.question_type == 'date':
                    value = answer.date_answer.strftime('%Y-%m-%d') if answer.date_answer else ''
                else:
                    value = answer.text_answer or ''
                
                ws.cell(row=row, column=col, value=value)
    
    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column_letter].width = min(max_length + 2, 50)
    
    # Create HTTP response
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="Survey_{survey.id}_{survey.title[:20]}_responses.xlsx"'
    
    wb.save(response)
    return response

@login_required
@require_POST
def update_template(request, template_id):
    template = get_object_or_404(SurveyTemplate, id=template_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or template.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        template.name = data.get('name', template.name)
        template.description = data.get('description', template.description)
        template.template_data = data.get('template_data', template.template_data)
        template.save()
        
        return JsonResponse({'success': True, 'message': 'Template updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def delete_template(request, template_id):
    template = get_object_or_404(SurveyTemplate, id=template_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or template.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        template.is_active = False
        template.save()
        return JsonResponse({'success': True, 'message': 'Template deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def update_category(request, category_id):
    category = get_object_or_404(SurveyCategory, id=category_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        category.name = data.get('name', category.name)
        category.color = data.get('color', category.color)
        category.icon = data.get('icon', category.icon)
        category.save()
        
        return JsonResponse({'success': True, 'message': 'Category updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def delete_category(request, category_id):
    category = get_object_or_404(SurveyCategory, id=category_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Check if category is in use
        surveys_using_category = Survey.objects.filter(category=category).count()
        if surveys_using_category > 0:
            return JsonResponse({
                'error': f'Cannot delete category. {surveys_using_category} surveys are using this category.'
            }, status=400)
        
        category.delete()
        return JsonResponse({'success': True, 'message': 'Category deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def create_survey_from_template(request, template_id):
    template = get_object_or_404(SurveyTemplate, id=template_id, is_active=True)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        messages.error(request, 'You do not have permission to create surveys from templates.')
        return redirect('template_list')
    
    try:
        # Create new survey from template
        survey = Survey.objects.create(
            title=f"{template.name} - Survey",
            description=template.description,
            created_by=request.user,
            template=template,
            status='draft'
        )
        
        # Create questions from template data
        if template.template_data.get('questions'):
            for q_data in template.template_data['questions']:
                Question.objects.create(
                    survey=survey,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'short_answer'),
                    required=q_data.get('required', True),
                    order=q_data.get('order', 0),
                    description=q_data.get('description', ''),
                    options=q_data.get('options', []),
                    min_value=q_data.get('min_value'),
                    max_value=q_data.get('max_value'),
                    validation_rules=q_data.get('validation_rules', {})
                )
        
        messages.success(request, 'Survey created from template successfully!')
        return redirect('edit_survey', survey_id=survey.id)
        
    except Exception as e:
        messages.error(request, f'Error creating survey from template: {str(e)}')
        return redirect('template_list')

@login_required
def save_as_template(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            template_name = data.get('name', f"{survey.title} Template")
            template_description = data.get('description', survey.description)
            
            # Build template data from survey questions
            questions_data = []
            for question in survey.questions.order_by('order'):
                questions_data.append({
                    'question_text': question.question_text,
                    'question_type': question.question_type,
                    'required': question.required,
                    'order': question.order,
                    'description': question.description,
                    'options': question.options,
                    'min_value': question.min_value,
                    'max_value': question.max_value,
                    'validation_rules': question.validation_rules,
                })
            
            template = SurveyTemplate.objects.create(
                name=template_name,
                description=template_description,
                created_by=request.user,
                template_data={'questions': questions_data}
            )
            
            return JsonResponse({
                'success': True, 
                'message': 'Survey saved as template successfully!',
                'template_id': template.id
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def survey_analytics_data(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        analytics_data = {}
        questions = survey.questions.order_by('order')
        
        for question in questions:
            answers = Answer.objects.filter(
                question=question, 
                response__is_complete=True
            )
            
            question_analytics = {
                'question_text': question.question_text,
                'question_type': question.question_type,
                'total_responses': answers.count(),
            }
            
            if question.question_type in ['single_choice', 'multiple_choice']:
                # Count options
                option_counts = {}
                total_selections = 0
                
                for answer in answers:
                    for option in answer.selected_options:
                        option_counts[option] = option_counts.get(option, 0) + 1
                        total_selections += 1
                
                # Calculate percentages
                option_percentages = {}
                if total_selections > 0:
                    for option, count in option_counts.items():
                        option_percentages[option] = {
                            'count': count,
                            'percentage': round((count / answers.count()) * 100, 1)
                        }
                
                question_analytics.update({
                    'chart_type': 'pie' if question.question_type == 'single_choice' else 'bar',
                    'options_data': option_percentages
                })
                
            elif question.question_type == 'rating_scale':
                # Rating distribution and average
                ratings = [answer.rating_value for answer in answers if answer.rating_value]
                
                if ratings:
                    rating_counts = {}
                    for rating in ratings:
                        rating_counts[rating] = rating_counts.get(rating, 0) + 1
                    
                    avg_rating = sum(ratings) / len(ratings)
                    
                    question_analytics.update({
                        'chart_type': 'bar',
                        'average_rating': round(avg_rating, 2),
                        'rating_distribution': rating_counts,
                        'total_ratings': len(ratings)
                    })
                
            elif question.question_type == 'yes_no':
                # Yes/No counts
                yes_count = answers.filter(boolean_answer=True).count()
                no_count = answers.filter(boolean_answer=False).count()
                
                question_analytics.update({
                    'chart_type': 'pie',
                    'yes_no_data': {
                        'Yes': {
                            'count': yes_count,
                            'percentage': round((yes_count / answers.count()) * 100, 1) if answers.count() > 0 else 0
                        },
                        'No': {
                            'count': no_count,
                            'percentage': round((no_count / answers.count()) * 100, 1) if answers.count() > 0 else 0
                        }
                    }
                })
                
            elif question.question_type in ['short_answer', 'paragraph']:
                # Text response analysis
                text_responses = [answer.text_answer for answer in answers if answer.text_answer]
                
                question_analytics.update({
                    'chart_type': 'text',
                    'text_responses': text_responses[:10],  # Show first 10 responses
                    'total_text_responses': len(text_responses)
                })
            
            analytics_data[f'question_{question.id}'] = question_analytics
        
        return JsonResponse({'success': True, 'analytics': analytics_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def export_csv_responses(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to export this survey.')
        return redirect('survey_list')
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="Survey_{survey.id}_{survey.title[:20]}_responses.csv"'
    
    writer = csv.writer(response)
    
    # Create headers
    headers = ['Response ID', 'User', 'Email', 'Submitted At', 'Completion Status']
    questions = survey.questions.order_by('order')
    
    for question in questions:
        headers.append(f"Q{question.order}: {question.question_text[:50]}")
    
    writer.writerow(headers)
    
    # Write data
    responses = SurveyResponse.objects.filter(survey=survey).select_related('user').order_by('-submitted_at')
    
    for survey_response in responses:
        row = [
            survey_response.id,
            f"{survey_response.user.firstname} {survey_response.user.lastname}",
            survey_response.user.email,
            survey_response.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if survey_response.submitted_at else 'Not submitted',
            'Complete' if survey_response.is_complete else 'Incomplete'
        ]
        
        # Get answers for this response
        answers = {answer.question_id: answer for answer in survey_response.answers.all()}
        
        for question in questions:
            answer = answers.get(question.id)
            if answer:
                if question.question_type in ['single_choice', 'multiple_choice']:
                    value = ', '.join(answer.selected_options) if answer.selected_options else ''
                elif question.question_type == 'rating_scale':
                    value = answer.rating_value or ''
                elif question.question_type == 'yes_no':
                    value = 'Yes' if answer.boolean_answer else 'No' if answer.boolean_answer is not None else ''
                elif question.question_type == 'date':
                    value = answer.date_answer.strftime('%Y-%m-%d') if answer.date_answer else ''
                else:
                    value = answer.text_answer or ''
            else:
                value = ''
            
            row.append(value)
        
        writer.writerow(row)
    
    return response

@login_required
@require_POST
def delete_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        survey_title = survey.title
        survey.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Survey "{survey_title}" deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def survey_participants(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to view participants for this survey.')
        return redirect('survey_list')
    
    # Get assigned users
    assigned_users = survey.get_assigned_users()
    
    # Get completion status for each user
    completed_user_ids = set(
        survey.responses.filter(is_complete=True).values_list('user_id', flat=True)
    )
    
    participants_data = []
    for user in assigned_users:
        participants_data.append({
            'user': user,
            'completed': user.id in completed_user_ids,
            'response': survey.responses.filter(user=user).first()
        })
    
    context = {
        'survey': survey,
        'participants': participants_data,
        'total_assigned': len(participants_data),
        'total_completed': len(completed_user_ids),
        'completion_rate': (len(completed_user_ids) / len(participants_data) * 100) if participants_data else 0
    }
    
    return render(request, 'survey/survey_participants.html', context)

@login_required
def get_survey_progress(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    # Check if user has access to this survey
    if survey.visibility == 'selected' and not survey.selected_users.filter(id=request.user.id).exists():
        if not request.user.is_admin:
            return JsonResponse({'error': 'Access denied'}, status=403)
    
    try:
        # Get user's response
        response = SurveyResponse.objects.filter(
            survey=survey, 
            user=request.user
        ).first()
        
        if not response:
            return JsonResponse({
                'success': True,
                'progress': 0,
                'completed_questions': 0,
                'total_questions': survey.questions.count(),
                'has_response': False
            })
        
        total_questions = survey.questions.count()
        completed_questions = response.answers.count()
        progress = (completed_questions / total_questions * 100) if total_questions > 0 else 0
        
        return JsonResponse({
            'success': True,
            'progress': round(progress, 1),
            'completed_questions': completed_questions,
            'total_questions': total_questions,
            'has_response': True,
            'is_complete': response.is_complete,
            'submitted_at': response.submitted_at.isoformat() if response.submitted_at else None
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def survey_analytics(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to view analytics for this survey.')
        return redirect('survey_list')
    
    responses = SurveyResponse.objects.filter(survey=survey, is_complete=True)
    questions = survey.questions.order_by('order')
    
    analytics_data = {}
    
    for question in questions:
        answers = Answer.objects.filter(question=question, response__is_complete=True)
        
        if question.question_type in ['single_choice', 'multiple_choice']:
            # Count options
            option_counts = {}
            for answer in answers:
                for option in answer.selected_options:
                    option_counts[option] = option_counts.get(option, 0) + 1
            analytics_data[question.id] = {
                'type': 'chart',
                'chart_type': 'pie' if question.question_type == 'single_choice' else 'bar',
                'data': option_counts
            }
            
        elif question.question_type == 'rating_scale':
            # Average rating and distribution
            ratings = [answer.rating_value for answer in answers if answer.rating_value]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                rating_counts = {}
                for rating in ratings:
                    rating_counts[rating] = rating_counts.get(rating, 0) + 1
                analytics_data[question.id] = {
                    'type': 'rating',
                    'average': avg_rating,
                    'distribution': rating_counts
                }
                
        elif question.question_type == 'yes_no':
            # Yes/No counts
            yes_count = answers.filter(boolean_answer=True).count()
            no_count = answers.filter(boolean_answer=False).count()
            analytics_data[question.id] = {
                'type': 'chart',
                'chart_type': 'pie',
                'data': {'Yes': yes_count, 'No': no_count}
            }
    
    context = {
        'survey': survey,
        'questions': questions,
        'total_responses': responses.count(),
        'analytics_data': json.dumps(analytics_data),
    }
    
    return render(request, 'survey/survey_analytics.html', context)

@login_required
@csrf_exempt
def save_draft(request, survey_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    survey = get_object_or_404(Survey, id=survey_id, status='active')
    
    try:
        data = json.loads(request.body)
        
        draft, created = SurveyDraft.objects.update_or_create(
            survey=survey,
            user=request.user,
            defaults={'draft_data': data}
        )
        
        return JsonResponse({'success': True, 'message': 'Draft saved successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def load_draft(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    try:
        draft = SurveyDraft.objects.get(survey=survey, user=request.user)
        return JsonResponse({'success': True, 'data': draft.draft_data})
    except SurveyDraft.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No draft found'})

# Template Management Views
@login_required
def template_list(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return redirect('user_dashboard')
    
    templates = SurveyTemplate.objects.filter(is_active=True).order_by('-created_at')
    
    context = {
        'templates': templates,
    }
    
    return render(request, 'survey/template_list.html', context)

@login_required
def create_template(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        messages.error(request, 'You do not have permission to create templates.')
        return redirect('user_dashboard')
    
    if request.method == 'POST':
        form = SurveyTemplateForm(request.POST)
        if form.is_valid():
            template = form.save(commit=False)
            template.created_by = request.user
            template.save()
            
            messages.success(request, 'Template created successfully!')
            return redirect('template_list')
    else:
        form = SurveyTemplateForm()
    
    context = {
        'form': form,
    }
    
    return render(request, 'survey/create_template.html', context)

# Category Management Views
@login_required
def category_list(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return redirect('user_dashboard')
    
    categories = SurveyCategory.objects.annotate(
        survey_count=Count('survey')
    ).order_by('name')
    
    context = {
        'categories': categories,
    }
    
    return render(request, 'survey/category_list.html', context)

@login_required
@require_POST
def create_category(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        category = SurveyCategory.objects.create(
            name=data.get('name'),
            color=data.get('color', '#6366f1'),
            icon=data.get('icon', 'fas fa-folder')
        )
        
        return JsonResponse({
            'success': True,
            'category': {
                'id': category.id,
                'name': category.name,
                'color': category.color,
                'icon': category.icon,
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def duplicate_survey(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Create duplicate survey
        new_survey = Survey.objects.create(
            title=f"{survey.title} (Copy)",
            description=survey.description,
            category=survey.category,
            created_by=request.user,
            visibility=survey.visibility,
            deadline=survey.deadline,
            status='draft',
            allow_multiple_responses=survey.allow_multiple_responses,
            anonymous_responses=survey.anonymous_responses,
            randomize_questions=survey.randomize_questions,
            show_progress=survey.show_progress,
            auto_save=survey.auto_save,
        )
        
        # Copy questions
        for question in survey.questions.order_by('order'):
            Question.objects.create(
                survey=new_survey,
                question_text=question.question_text,
                question_type=question.question_type,
                required=question.required,
                order=question.order,
                description=question.description,
                options=question.options,
                min_value=question.min_value,
                max_value=question.max_value,
                max_file_size=question.max_file_size,
                allowed_file_types=question.allowed_file_types,
                validation_rules=question.validation_rules,
            )
        
        return JsonResponse({
            'success': True,
            'survey_id': new_survey.id,
            'message': 'Survey duplicated successfully!'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def update_survey_status(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        new_status = data.get('status')
        
        if new_status in dict(Survey.STATUS_CHOICES):
            survey.status = new_status
            survey.save()
            return JsonResponse({'success': True, 'message': f'Survey status updated to {survey.get_status_display()}'})
        else:
            return JsonResponse({'error': 'Invalid status'}, status=400)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def survey_preview(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to preview this survey.')
        return redirect('survey_list')
    
    questions = survey.questions.order_by('order')
    
    context = {
        'survey': survey,
        'questions': questions,
        'preview_mode': True,
    }
    
    return render(request, 'survey/survey_preview.html', context)

@login_required
def get_question_data(request, question_id):
    question = get_object_or_404(Question, id=question_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or question.survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    data = {
        'id': question.id,
        'question_text': question.question_text,
        'question_type': question.question_type,
        'required': question.required,
        'description': question.description,
        'options': question.options,
        'min_value': question.min_value,
        'max_value': question.max_value,
        'max_file_size': question.max_file_size,
        'allowed_file_types': question.allowed_file_types,
        'validation_rules': question.validation_rules,
    }
    
    return JsonResponse({'success': True, 'question': data})

@login_required
def survey_responses_list(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to view responses for this survey.')
        return redirect('survey_list')
    
    responses = SurveyResponse.objects.filter(
        survey=survey,
        is_complete=True
    ).select_related('user').order_by('-submitted_at')
    
    # Search functionality
    search = request.GET.get('search', '')
    if search:
        responses = responses.filter(
            Q(user__firstname__icontains=search) |
            Q(user__lastname__icontains=search) |
            Q(user__email__icontains=search)
        )
    
    # Date filtering
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    if date_from:
        try:
            date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            responses = responses.filter(submitted_at__date__gte=date_from)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            responses = responses.filter(submitted_at__date__lte=date_to)
        except ValueError:
            pass
    
    # Pagination
    paginator = Paginator(responses, 20)
    page_number = request.GET.get('page')
    responses = paginator.get_page(page_number)
    
    context = {
        'survey': survey,
        'responses': responses,
        'search': search,
        'date_from': request.GET.get('date_from', ''),
        'date_to': request.GET.get('date_to', ''),
    }
    
    return render(request, 'survey/survey_responses.html', context)

@login_required
def bulk_export_surveys(request):
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            survey_ids = data.get('survey_ids', [])
            export_format = data.get('format', 'excel')
            
            if not survey_ids:
                return JsonResponse({'error': 'No surveys selected'}, status=400)
            
            surveys = Survey.objects.filter(id__in=survey_ids)
            
            if export_format == 'excel':
                return create_bulk_excel_export(surveys)
            else:
                return JsonResponse({'error': 'Unsupported format'}, status=400)
                
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

def create_bulk_excel_export(surveys):
    wb = openpyxl.Workbook()
    
    # Remove default sheet
    wb.remove(wb.active)
    
    for survey in surveys:
        # Create sheet for each survey
        sheet_name = survey.title[:31]  # Excel sheet name limit
        ws = wb.create_sheet(title=sheet_name)
        
        # Header styling
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        
        # Create headers
        headers = ['Response ID', 'User', 'Email', 'Submitted At']
        questions = survey.questions.order_by('order')
        
        for question in questions:
            headers.append(f"Q{question.order}: {question.question_text[:50]}")
        
        # Write headers
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
        
        # Write data
        responses = SurveyResponse.objects.filter(
            survey=survey, 
            is_complete=True
        ).select_related('user').order_by('-submitted_at')
        
        for row, response in enumerate(responses, 2):
            ws.cell(row=row, column=1, value=response.id)
            ws.cell(row=row, column=2, value=f"{response.user.firstname} {response.user.lastname}")
            ws.cell(row=row, column=3, value=response.user.email)
            ws.cell(row=row, column=4, value=response.submitted_at.strftime('%Y-%m-%d %H:%M:%S'))
            
            # Get answers for this response
            answers = {answer.question_id: answer for answer in response.answers.all()}
            
            for col, question in enumerate(questions, 5):
                answer = answers.get(question.id)
                if answer:
                    if question.question_type in ['single_choice', 'multiple_choice']:
                        value = ', '.join(answer.selected_options) if answer.selected_options else ''
                    elif question.question_type == 'rating_scale':
                        value = answer.rating_value or ''
                    elif question.question_type == 'yes_no':
                        value = 'Yes' if answer.boolean_answer else 'No' if answer.boolean_answer is not None else ''
                    elif question.question_type == 'date':
                        value = answer.date_answer.strftime('%Y-%m-%d') if answer.date_answer else ''
                    else:
                        value = answer.text_answer or ''
                    
                    ws.cell(row=row, column=col, value=value)
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))
            ws.column_dimensions[column_letter].width = min(max_length + 2, 50)
    
    # Create HTTP response
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="Bulk_Survey_Export.xlsx"'
    
    wb.save(response)
    return response

@login_required
def clear_survey_responses(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            response_count = survey.responses.count()
            survey.responses.all().delete()
            
            return JsonResponse({
                'success': True,
                'message': f'Cleared {response_count} responses'
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def get_survey_stats(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    total_assigned = survey.get_assigned_users().count()
    total_responses = survey.responses.filter(is_complete=True).count()
    completion_rate = (total_responses / total_assigned * 100) if total_assigned > 0 else 0
    
    # Response rate over time (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    daily_responses = survey.responses.filter(
        submitted_at__gte=thirty_days_ago,
        is_complete=True
    ).extra(
        {'day': 'date(submitted_at)'}
    ).values('day').annotate(count=Count('id')).order_by('day')
    
    stats = {
        'total_assigned': total_assigned,
        'total_responses': total_responses,
        'completion_rate': round(completion_rate, 1),
        'daily_responses': list(daily_responses),
        'avg_completion_time': None,  # Could calculate average time to complete
    }
    
    return JsonResponse({'success': True, 'stats': stats})

@login_required
@require_POST
def send_survey_reminders(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Get users who haven't completed the survey
        assigned_users = survey.get_assigned_users()
        completed_user_ids = survey.responses.filter(is_complete=True).values_list('user_id', flat=True)
        pending_users = assigned_users.exclude(id__in=completed_user_ids)
        
        # Here you would integrate with your email system
        # For now, just return success with count
        reminder_count = pending_users.count()
        
        return JsonResponse({
            'success': True,
            'message': f'Reminders sent to {reminder_count} users'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def export_survey_summary(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to export this survey summary.')
        return redirect('survey_list')
    
    # Create workbook for summary
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Survey Summary"
    
    # Header styling
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    
    # Survey Info
    ws['A1'] = 'Survey Summary Report'
    ws['A1'].font = Font(bold=True, size=16)
    
    ws['A3'] = 'Survey Title:'
    ws['B3'] = survey.title
    ws['A4'] = 'Description:'
    ws['B4'] = survey.description
    ws['A5'] = 'Created By:'
    ws['B5'] = f"{survey.created_by.firstname} {survey.created_by.lastname}"
    ws['A6'] = 'Created Date:'
    ws['B6'] = survey.created_at.strftime('%Y-%m-%d')
    ws['A7'] = 'Status:'
    ws['B7'] = survey.get_status_display()
    
    # Statistics
    ws['A9'] = 'Response Statistics'
    ws['A9'].font = Font(bold=True, size=14)
    
    total_assigned = survey.get_assigned_users().count()
    total_responses = survey.get_response_count()
    completion_rate = survey.get_completion_rate()
    
    ws['A11'] = 'Total Assigned:'
    ws['B11'] = total_assigned
    ws['A12'] = 'Total Responses:'
    ws['B12'] = total_responses
    ws['A13'] = 'Completion Rate:'
    ws['B13'] = f"{completion_rate:.1f}%"
    
    # Question Summary
    current_row = 16
    ws[f'A{current_row}'] = 'Question Analysis'
    ws[f'A{current_row}'].font = Font(bold=True, size=14)
    current_row += 2
    
    questions = survey.questions.order_by('order')
    
    for question in questions:
        ws[f'A{current_row}'] = f"Q{question.order}: {question.question_text}"
        ws[f'A{current_row}'].font = Font(bold=True)
        current_row += 1
        
        ws[f'A{current_row}'] = 'Type:'
        ws[f'B{current_row}'] = question.get_question_type_display()
        current_row += 1
        
        # Get answer statistics
        answers = Answer.objects.filter(question=question, response__is_complete=True)
        answer_count = answers.count()
        
        ws[f'A{current_row}'] = 'Responses:'
        ws[f'B{current_row}'] = answer_count
        current_row += 1
        
        if question.question_type in ['single_choice', 'multiple_choice']:
            # Count each option
            option_counts = {}
            for answer in answers:
                for option in answer.selected_options:
                    option_counts[option] = option_counts.get(option, 0) + 1
            
            for option, count in option_counts.items():
                ws[f'B{current_row}'] = f"{option}: {count} ({count/answer_count*100:.1f}%)" if answer_count > 0 else f"{option}: 0"
                current_row += 1
                
        elif question.question_type == 'rating_scale':
            # Calculate average rating
            ratings = [answer.rating_value for answer in answers if answer.rating_value]
            if ratings:
                avg_rating = sum(ratings) / len(ratings)
                ws[f'B{current_row}'] = f"Average Rating: {avg_rating:.1f}/5"
                current_row += 1
        
        current_row += 1  # Add spacing between questions
    
    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column_letter].width = min(max_length + 2, 50)
    
    # Create HTTP response
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="Survey_{survey.id}_Summary.xlsx"'
    
    wb.save(response)
    return response

@login_required
@require_POST
def update_template(request, template_id):
    template = get_object_or_404(SurveyTemplate, id=template_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or template.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        template.name = data.get('name', template.name)
        template.description = data.get('description', template.description)
        template.template_data = data.get('template_data', template.template_data)
        template.save()
        
        return JsonResponse({'success': True, 'message': 'Template updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def delete_template(request, template_id):
    template = get_object_or_404(SurveyTemplate, id=template_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or template.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        template.is_active = False
        template.save()
        return JsonResponse({'success': True, 'message': 'Template deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def update_category(request, category_id):
    category = get_object_or_404(SurveyCategory, id=category_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        category.name = data.get('name', category.name)
        category.color = data.get('color', category.color)
        category.icon = data.get('icon', category.icon)
        category.save()
        
        return JsonResponse({'success': True, 'message': 'Category updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_POST
def delete_category(request, category_id):
    category = get_object_or_404(SurveyCategory, id=category_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        # Check if category is in use
        surveys_using_category = Survey.objects.filter(category=category).count()
        if surveys_using_category > 0:
            return JsonResponse({
                'error': f'Cannot delete category. {surveys_using_category} surveys are using this category.'
            }, status=400)
        
        category.delete()
        return JsonResponse({'success': True, 'message': 'Category deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def create_survey_from_template(request, template_id):
    template = get_object_or_404(SurveyTemplate, id=template_id, is_active=True)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin):
        messages.error(request, 'You do not have permission to create surveys from templates.')
        return redirect('template_list')
    
    try:
        # Create new survey from template
        survey = Survey.objects.create(
            title=f"{template.name} - Survey",
            description=template.description,
            created_by=request.user,
            template=template,
            status='draft'
        )
        
        # Create questions from template data
        if template.template_data.get('questions'):
            for q_data in template.template_data['questions']:
                Question.objects.create(
                    survey=survey,
                    question_text=q_data.get('question_text', ''),
                    question_type=q_data.get('question_type', 'short_answer'),
                    required=q_data.get('required', True),
                    order=q_data.get('order', 0),
                    description=q_data.get('description', ''),
                    options=q_data.get('options', []),
                    min_value=q_data.get('min_value'),
                    max_value=q_data.get('max_value'),
                    validation_rules=q_data.get('validation_rules', {})
                )
        
        messages.success(request, 'Survey created from template successfully!')
        return redirect('edit_survey', survey_id=survey.id)
        
    except Exception as e:
        messages.error(request, f'Error creating survey from template: {str(e)}')
        return redirect('template_list')

@login_required
def save_as_template(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            template_name = data.get('name', f"{survey.title} Template")
            template_description = data.get('description', survey.description)
            
            # Build template data from survey questions
            questions_data = []
            for question in survey.questions.order_by('order'):
                questions_data.append({
                    'question_text': question.question_text,
                    'question_type': question.question_type,
                    'required': question.required,
                    'order': question.order,
                    'description': question.description,
                    'options': question.options,
                    'min_value': question.min_value,
                    'max_value': question.max_value,
                    'validation_rules': question.validation_rules,
                })
            
            template = SurveyTemplate.objects.create(
                name=template_name,
                description=template_description,
                created_by=request.user,
                template_data={'questions': questions_data}
            )
            
            return JsonResponse({
                'success': True, 
                'message': 'Survey saved as template successfully!',
                'template_id': template.id
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def survey_analytics_data(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        return JsonResponse({'error': 'Permission denied'}, status=403)
    
    try:
        analytics_data = {}
        questions = survey.questions.order_by('order')
        
        for question in questions:
            answers = Answer.objects.filter(
                question=question, 
                response__is_complete=True
            )
            
            question_analytics = {
                'question_text': question.question_text,
                'question_type': question.question_type,
                'total_responses': answers.count(),
            }
            
            if question.question_type in ['single_choice', 'multiple_choice']:
                # Count options
                option_counts = {}
                total_selections = 0
                
                for answer in answers:
                    for option in answer.selected_options:
                        option_counts[option] = option_counts.get(option, 0) + 1
                        total_selections += 1
                
                # Calculate percentages
                option_percentages = {}
                if total_selections > 0:
                    for option, count in option_counts.items():
                        option_percentages[option] = {
                            'count': count,
                            'percentage': round((count / answers.count()) * 100, 1)
                        }
                
                question_analytics.update({
                    'chart_type': 'pie' if question.question_type == 'single_choice' else 'bar',
                    'options_data': option_percentages
                })
                
            elif question.question_type == 'rating_scale':
                # Rating distribution and average
                ratings = [answer.rating_value for answer in answers if answer.rating_value]
                
                if ratings:
                    rating_counts = {}
                    for rating in ratings:
                        rating_counts[rating] = rating_counts.get(rating, 0) + 1
                    
                    avg_rating = sum(ratings) / len(ratings)
                    
                    question_analytics.update({
                        'chart_type': 'bar',
                        'average_rating': round(avg_rating, 2),
                        'rating_distribution': rating_counts,
                        'total_ratings': len(ratings)
                    })
                
            elif question.question_type == 'yes_no':
                # Yes/No counts
                yes_count = answers.filter(boolean_answer=True).count()
                no_count = answers.filter(boolean_answer=False).count()
                
                question_analytics.update({
                    'chart_type': 'pie',
                    'yes_no_data': {
                        'Yes': {
                            'count': yes_count,
                            'percentage': round((yes_count / answers.count()) * 100, 1) if answers.count() > 0 else 0
                        },
                        'No': {
                            'count': no_count,
                            'percentage': round((no_count / answers.count()) * 100, 1) if answers.count() > 0 else 0
                        }
                    }
                })
                
            elif question.question_type in ['short_answer', 'paragraph']:
                # Text response analysis
                text_responses = [answer.text_answer for answer in answers if answer.text_answer]
                
                question_analytics.update({
                    'chart_type': 'text',
                    'text_responses': text_responses[:10],  # Show first 10 responses
                    'total_text_responses': len(text_responses)
                })
            
            analytics_data[f'question_{question.id}'] = question_analytics
        
        return JsonResponse({'success': True, 'analytics': analytics_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def export_csv_responses(request, survey_id):
    survey = get_object_or_404(Survey, id=survey_id)
    
    if not (request.user.hr_admin or request.user.iad_admin or request.user.accounting_admin or survey.created_by == request.user):
        messages.error(request, 'You do not have permission to export this survey.')
        return redirect('survey_list')
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="Survey_{survey.id}_{survey.title[:20]}_responses.csv"'
    
    writer = csv.writer(response)
    
    # Create headers
    headers = ['Response ID', 'User', 'Email', 'Submitted At', 'Completion Status']
    questions = survey.questions.order_by('order')
    
    for question in questions:
        headers.append(f"Q{question.order}: {question.question_text[:50]}")
    
    writer.writerow(headers)
    
    # Write data
    responses = SurveyResponse.objects.filter(survey=survey).select_related('user').order_by('-submitted_at')