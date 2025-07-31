import os
import zipfile
from io import BytesIO
from django.utils import timezone
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, FileResponse
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.views.decorators.http import require_POST
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PIL import Image
import tempfile
from django.views.decorators.clickjacking import xframe_options_sameorigin
from datetime import datetime, timedelta
from calendar import monthrange
from django.core.paginator import Paginator

from .models import Certificate
from .forms import BulkCertificateUploadForm
from userlogin.models import EmployeeLogin

@login_required
def employee_dashboard(request):
    certificates = Certificate.objects.filter(employee=request.user).order_by('-created_at')
    unseen_certificates = certificates.filter(is_seen=False)
    
    context = {
        'certificates': certificates,
        'unseen_count': unseen_certificates.count(),
        'unseen_certificates': unseen_certificates,
    }
    return render(request, 'certificate/user-cert.html', context)

@login_required
def admin_cert(request):
    if not (request.user.hr_admin):
        messages.error(request, 'Access denied. HR permissions required.')
        return redirect('user_cert')
    
    search = request.GET.get('search', '').strip()
    
    employees_with_certificates = EmployeeLogin.objects.filter(
        certificates__isnull=False
    ).annotate(
        certificate_count=Count('certificates')
    ).distinct()
    
    if search:
        employees_with_certificates = employees_with_certificates.filter(
            Q(firstname__icontains=search) |
            Q(lastname__icontains=search) |
            Q(idnumber__icontains=search) |
            Q(email__icontains=search)
        )
    
    employees_with_certificates = employees_with_certificates.order_by('firstname', 'lastname')
    
    paginator = Paginator(employees_with_certificates, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    form = BulkCertificateUploadForm()
    
    # Exclude all admin types
    admin_filter = (
        Q(wire_admin=True) |
        Q(clinic_admin=True) |
        Q(iad_admin=True) |
        Q(accounting_admin=True) |
        Q(hr_admin=True) |
        Q(hr_manager=True) |
        Q(mis_admin=True)
    )
    total_employees = EmployeeLogin.objects.filter(~admin_filter).count()
    total_certificates = Certificate.objects.count()
    now = timezone.now()
    certificates_this_month = Certificate.objects.filter(
        created_at__year=now.year,
        created_at__month=now.month
    ).count()
    unseen_certificates = Certificate.objects.filter(is_seen=False).count()

    last_month_end = now.replace(day=1) - timedelta(days=1)
    employees_prev = EmployeeLogin.objects.filter(date_joined__lte=last_month_end).count()
    employees_now = total_employees
    certificates_prev = Certificate.objects.filter(
        created_at__year=last_month_end.year,
        created_at__month=last_month_end.month
    ).count()
    certificates_this_month_prev = Certificate.objects.filter(
        created_at__year=last_month_end.year,
        created_at__month=last_month_end.month
    ).count()
    unseen_prev = Certificate.objects.filter(is_seen=False, created_at__year=last_month_end.year, created_at__month=last_month_end.month).count()

    def percent_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100)

    employees_percent = percent_change(employees_now, employees_prev)
    employees_positive = employees_now >= employees_prev
    certificates_percent = percent_change(total_certificates, certificates_prev)
    certificates_positive = total_certificates >= certificates_prev
    certs_month_percent = percent_change(certificates_this_month, certificates_this_month_prev)
    certs_month_positive = certificates_this_month >= certificates_this_month_prev
    unseen_percent = percent_change(unseen_certificates, unseen_prev)
    unseen_positive = unseen_certificates <= unseen_prev
    
    context = {
        'employees_with_certificates': page_obj.object_list,
        'page_obj': page_obj,
        'form': form,
        'search': search,
        'stat_total_employees': total_employees,
        'stat_total_certificates': total_certificates,
        'stat_certificates_this_month': certificates_this_month,
        'stat_unseen_certificates': unseen_certificates,
        'employees_percent': abs(employees_percent),
        'employees_positive': employees_now >= employees_prev,
        'certificates_percent': abs(certificates_percent),
        'certificates_positive': total_certificates >= certificates_prev,
        'certs_month_percent': abs(certs_month_percent),
        'certs_month_positive': certificates_this_month >= certificates_this_month_prev,
        'unseen_percent': abs(unseen_percent),
        'unseen_positive': unseen_certificates <= unseen_prev,
    }
    return render(request, 'certificate/admin-cert.html', context)

@login_required
@require_POST
def bulk_upload_certificates(request):
    if not (request.user.hr_admin):
        return JsonResponse({'success': False, 'error': 'Access denied'})
    
    form = BulkCertificateUploadForm(request.POST, request.FILES)
    if form.is_valid():
        uploaded_files = request.FILES.getlist('certificates')
        successful_uploads = 0
        errors = []
        
        for file in uploaded_files:
            try:
                filename = file.name
                id_number = os.path.splitext(filename)[0]
                
                try:
                    employee = EmployeeLogin.objects.get(idnumber=id_number)
                except EmployeeLogin.DoesNotExist:
                    errors.append(f"Employee with ID {id_number} not found")
                    continue
                
                certificate = Certificate.objects.create(
                    employee=employee,
                    title=form.cleaned_data['title'] or f"Certificate - {filename}",
                    certificate_file=file,
                    uploaded_by=request.user
                )
                successful_uploads += 1
                
            except Exception as e:
                errors.append(f"Error uploading {filename}: {str(e)}")
        
        return JsonResponse({
            'success': True,
            'uploaded_count': successful_uploads,
            'errors': errors
        })
    
    return JsonResponse({
        'success': False,
        'error': 'Invalid form data'
    })

@login_required
def get_employee_certificates(request, employee_id):
    if not (request.user.hr_admin):
        return JsonResponse({'success': False, 'error': 'Access denied'})
    employee = get_object_or_404(EmployeeLogin, id=employee_id)
    certificates = Certificate.objects.filter(employee=employee).select_related('uploaded_by').order_by('-created_at')
    cert_list = []
    for cert in certificates:
        cert_list.append({
            'id': cert.id,
            'title': cert.title,
            'file_url': cert.certificate_file.url,
            'created_at': cert.created_at.strftime('%b %d, %Y'),
            'is_image': cert.is_image,
            'is_pdf': cert.is_pdf,
            'is_seen': cert.is_seen,
            'uploaded_by': f"{cert.uploaded_by.firstname} {cert.uploaded_by.lastname}" if cert.uploaded_by else 'Unknown',
        })
    return JsonResponse({'success': True, 'certificates': cert_list})

@login_required
def mark_certificate_seen(request, certificate_id):
    certificate = get_object_or_404(Certificate, id=certificate_id, employee=request.user)
    certificate.is_seen = True
    certificate.save()
    
    return JsonResponse({'success': True})

@login_required
@require_POST
def delete_certificate(request, certificate_id):
    if not (request.user.hr_admin):
        return JsonResponse({'success': False, 'error': 'Access denied'})
    
    certificate = get_object_or_404(Certificate, id=certificate_id)
    certificate.delete()
    
    return JsonResponse({'success': True})

@login_required
@require_POST
def replace_certificate(request, certificate_id):
    if not (request.user.hr_admin):
        return JsonResponse({'success': False, 'error': 'Access denied'})
    
    certificate = get_object_or_404(Certificate, id=certificate_id)
    
    if 'certificate_file' not in request.FILES:
        return JsonResponse({'success': False, 'error': 'No file provided'})
    
    new_file = request.FILES['certificate_file']
    
    old_file_path = certificate.certificate_file.name if certificate.certificate_file else None
    
    certificate.certificate_file = new_file
    certificate.updated_at = timezone.now()
    certificate.save()
    
    if old_file_path and default_storage.exists(old_file_path):
        default_storage.delete(old_file_path)
    
    return JsonResponse({
        'success': True,
        'new_file_url': certificate.certificate_file.url,
        'file_extension': certificate.file_extension,
        'is_image': certificate.is_image,
        'is_pdf': certificate.is_pdf
    })

@login_required
def email_certificate(request, certificate_id):
    certificate = get_object_or_404(Certificate, id=certificate_id, employee=request.user)
    
    if not request.user.email:
        return JsonResponse({'success': False, 'error': 'No email address found in your profile'})
    
    try:
        if certificate.is_pdf:
            attachment_path = certificate.certificate_file.path
            filename = f"{certificate.title}.pdf"
        else:
            pdf_buffer = BytesIO()
            p = canvas.Canvas(pdf_buffer, pagesize=letter)
            width, height = letter
            
            img = Image.open(certificate.certificate_file.path)
            img_width, img_height = img.size
            
            aspect_ratio = img_height / img_width
            new_width = width - 100
            new_height = new_width * aspect_ratio
            
            if new_height > height - 100:
                new_height = height - 100
                new_width = new_height / aspect_ratio
            
            x = (width - new_width) / 2
            y = (height - new_height) / 2
            
            p.drawImage(certificate.certificate_file.path, x, y, new_width, new_height)
            p.showPage()
            p.save()
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(pdf_buffer.getvalue())
                attachment_path = temp_file.name
                filename = f"{certificate.title}.pdf"
        
        subject = f'Your Certificate: {certificate.title}'
        message = f'''
Dear {request.user.firstname or request.user.username},

Please find attached your certificate: {certificate.title}

Best regards,
HR Department
        '''
        
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[request.user.email]
        )
        
        email.attach_file(attachment_path, mimetype='application/pdf')
        email.send()
        
        if not certificate.is_pdf and 'temp_file' in locals():
            os.unlink(attachment_path)
        
        return JsonResponse({'success': True, 'message': 'Certificate sent to your email successfully!'})
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Failed to send email: {str(e)}'})

@xframe_options_sameorigin
@login_required
def view_certificate(request, certificate_id):
    if request.user.hr_admin:
        certificate = get_object_or_404(Certificate, id=certificate_id)
    else:
        certificate = get_object_or_404(Certificate, id=certificate_id, employee=request.user)
        if not certificate.is_seen:
            certificate.is_seen = True
            certificate.save()
    
    # Set content_type for inline display
    ext = certificate.file_extension
    if ext == 'pdf':
        content_type = 'application/pdf'
    elif ext in ['jpg', 'jpeg']:
        content_type = 'image/jpeg'
    elif ext == 'png':
        content_type = 'image/png'
    else:
        content_type = 'application/octet-stream'

    return FileResponse(
        certificate.certificate_file.open('rb'),
        content_type=content_type,
        as_attachment=False
    )

@login_required
def admin_cert_search(request):
    if not (request.user.hr_admin):
        return JsonResponse({'success': False, 'error': 'Access denied'})
    
    search = request.GET.get('search', '').strip()
    page = request.GET.get('page', 1)
    
    employees_with_certificates = EmployeeLogin.objects.filter(
        certificates__isnull=False
    ).annotate(
        certificate_count=Count('certificates')
    ).distinct()
    
    if search:
        employees_with_certificates = employees_with_certificates.filter(
            Q(firstname__icontains=search) |
            Q(lastname__icontains=search) |
            Q(idnumber__icontains=search) |
            Q(email__icontains=search)
        )
    
    employees_with_certificates = employees_with_certificates.order_by('firstname', 'lastname')
    
    paginator = Paginator(employees_with_certificates, 10)
    page_obj = paginator.get_page(page)
    
    employees_data = []
    for employee in page_obj.object_list:
        employee_data = {
            'id': employee.id,
            'idnumber': employee.idnumber,
            'firstname': employee.firstname,
            'lastname': employee.lastname,
            'email': employee.email,
            'certificate_count': employee.certificate_count,
            'avatar_url': employee.avatar.url if employee.avatar else None,
        }
        employees_data.append(employee_data)
    
    pagination_data = {
        'has_previous': page_obj.has_previous(),
        'has_next': page_obj.has_next(),
        'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
        'number': page_obj.number,
        'num_pages': page_obj.paginator.num_pages,
        'start_index': page_obj.start_index(),
        'end_index': page_obj.end_index(),
        'total_count': page_obj.paginator.count,
    }
    
    page_numbers = []
    for num in page_obj.paginator.page_range:
        if num == page_obj.number:
            page_numbers.append({'number': num, 'is_current': True})
        elif num > page_obj.number - 3 and num < page_obj.number + 3:
            page_numbers.append({'number': num, 'is_current': False})
    
    return JsonResponse({
        'success': True,
        'employees': employees_data,
        'pagination': pagination_data,
        'page_numbers': page_numbers,
        'has_results': len(employees_data) > 0,
        'search_query': search
    })

@login_required
def get_certificate_details(request, certificate_id):
    if request.user.hr_admin:
        certificate = get_object_or_404(Certificate, id=certificate_id)
    else:
        certificate = get_object_or_404(Certificate, id=certificate_id, employee=request.user)
    
    return JsonResponse({
        'success': True,
        'certificate': {
            'id': certificate.id,
            'title': certificate.title,
            'file_url': certificate.certificate_file.url,
            'is_image': certificate.is_image,
            'is_pdf': certificate.is_pdf,
            'file_extension': certificate.file_extension,
        }
    })

@login_required
@require_POST
def mark_all_certificates_seen(request):
    Certificate.objects.filter(employee=request.user, is_seen=False).update(is_seen=True)
    return JsonResponse({'status': 'ok'})