import os
import pandas as pd
from decimal import Decimal
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from userlogin.models import EmployeeLogin
from io import BytesIO
from reportlab.pdfgen import canvas
from django.utils import timezone
from . import models
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import logging

logger = logging.getLogger(__name__)

class PayslipEmailService:
    """Service for handling payslip email operations"""
    
    @staticmethod
    def send_payslip_email(payslip, email_address, email_type):
        """
        Send payslip email to specified address
        
        Args:
            payslip: Payslip model instance
            email_address: Email address to send to
            email_type: 'personal' or 'work'
        
        Returns:
            tuple: (success: bool, message: str)
        """
        try:
            subject = f"Payslip for {payslip.cutoff_from.strftime('%B %d')} - {payslip.cutoff_to.strftime('%B %d, %Y')}"
            
            # Render email template
            context = {
                'employee': payslip.employee,
                'payslip': payslip,
                'email_type': email_type
            }
            
            html_content = render_to_string('finance/emails/payslip_email.html', context)
            text_content = render_to_string('finance/emails/payslip_email.txt', context)
            
            email = EmailMessage(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email_address],
                headers={'Content-Type': 'text/html'}
            )
            
            # Attach payslip file if available
            if payslip.file_path and os.path.exists(payslip.file_path.path):
                email.attach_file(payslip.file_path.path)
            
            email.send()
            
            logger.info(f"Payslip email sent successfully to {email_address} for employee {payslip.employee.idnumber}")
            return True, f"Payslip sent successfully to {email_address}"
            
        except Exception as e:
            logger.error(f"Failed to send payslip email: {str(e)}")
            return False, f"Failed to send email: {str(e)}"

class OJTPayslipPDFGenerator:
    """Generate PDF payslips for OJT employees from Excel data"""
    
    @staticmethod
    def generate_ojt_payslip_pdf(ojt_payslip_data):
        """
        Generate PDF from OJT payslip data
        
        Args:
            ojt_payslip_data: OJTPayslipData model instance
            
        Returns:
            BytesIO: PDF file buffer
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Company header
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        story.append(Paragraph("RYONAN ELECTRIC PHILIPPINES", title_style))
        story.append(Paragraph("OJT PAYSLIP", title_style))
        story.append(Spacer(1, 20))
        
        # Employee information
        employee_info = [
            ['Employee Name:', ojt_payslip_data.employee.full_name],
            ['ID Number:', ojt_payslip_data.employee.idnumber],
            ['Cut-off Period:', ojt_payslip_data.cut_off],
        ]
        
        employee_table = Table(employee_info, colWidths=[2*inch, 3*inch])
        employee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(employee_table)
        story.append(Spacer(1, 20))
        
        # Earnings section
        earnings_data = [
            ['EARNINGS', '', ''],
            ['Regular Days', str(ojt_payslip_data.regular_day), ''],
            ['Allowance Days', str(ojt_payslip_data.allowance_day), ''],
            ['Rice Allowance', str(ojt_payslip_data.rice_allowance), ''],
            ['Special Holiday', str(ojt_payslip_data.special_holiday), ''],
            ['Legal Holiday', str(ojt_payslip_data.legal_holiday), ''],
            ['Perfect Attendance', str(ojt_payslip_data.perfect_attendance), ''],
            ['', '', ''],
            ['GROSS TOTAL', ojt_payslip_data.grand_total or '0', ''],
        ]
        
        earnings_table = Table(earnings_data, colWidths=[2.5*inch, 1.5*inch, 1*inch])
        earnings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(earnings_table)
        story.append(Spacer(1, 20))
        
        # Deductions section
        deductions_data = [
            ['DEDUCTIONS', '', ''],
            ['Deduction 1', str(ojt_payslip_data.deduction), ''],
            ['Deduction 2', str(ojt_payslip_data.deduction_2), ''],
            ['', '', ''],
            ['TOTAL DEDUCTIONS', str(float(ojt_payslip_data.deduction) + float(ojt_payslip_data.deduction_2)), ''],
        ]
        
        deductions_table = Table(deductions_data, colWidths=[2.5*inch, 1.5*inch, 1*inch])
        deductions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkred),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightcoral),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(deductions_table)
        story.append(Spacer(1, 20))
        
        # Net pay section
        net_pay_data = [
            ['NET OJT SHARE', ojt_payslip_data.net_ojt_share or '0'],
        ]
        
        net_pay_table = Table(net_pay_data, colWidths=[3*inch, 2*inch])
        net_pay_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 2, colors.black)
        ]))
        
        story.append(net_pay_table)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

class ExcelPayslipProcessor:
    """Process Excel files for OJT payslips"""
    
    @staticmethod
    def validate_excel_format(file_path):
        """
        Validate Excel file format and structure
        
        Args:
            file_path: Path to Excel file
            
        Returns:
            tuple: (is_valid: bool, errors: list)
        """
        try:
            df = pd.read_excel(file_path)
            required_columns = [
                'ID_NO', 'Cut_Off', 'Regular_Day', 'ALLOWANCE_DAY',
                'DEDUCTION', 'NET_OJT_SHARE', 'RICE_ALLOWANCE'
            ]
            
            errors = []
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                errors.append(f"Missing required columns: {', '.join(missing_columns)}")
            
            if df.empty:
                errors.append("Excel file is empty")
            
            # Check for duplicate ID numbers in the file
            if df['ID_NO'].duplicated().any():
                errors.append("Duplicate ID numbers found in the file")
            
            return len(errors) == 0, errors
            
        except Exception as e:
            return False, [f"Error reading Excel file: {str(e)}"]
    
    @staticmethod
    def clean_numeric_value(value):
        """Clean and convert value to float, handling various formats"""
        if pd.isna(value) or value == '' or value is None:
            return 0.0
        
        # Convert to string and clean
        str_value = str(value).strip()
        
        # Remove common currency symbols and separators
        str_value = str_value.replace('₱', '').replace(',', '').replace('$', '')
        
        try:
            return float(str_value)
        except (ValueError, TypeError):
            return 0.0

class FinanceReportGenerator:
    """Generate various financial reports"""
    
    @staticmethod
    def generate_payroll_summary(start_date, end_date, employee_type=None):
        """
        Generate payroll summary report
        
        Args:
            start_date: Start date for the report
            end_date: End date for the report
            employee_type: Filter by employee type (optional)
            
        Returns:
            dict: Report data
        """
        from .models import Payslip, OJTPayslipData
        
        # Query payslips within date range
        payslips = Payslip.objects.filter(
            cutoff_from__gte=start_date,
            cutoff_to__lte=end_date
        )
        
        if employee_type:
            payslips = payslips.filter(employee_type=employee_type)
        
        # Calculate totals
        total_payslips = payslips.count()
        total_amount = payslips.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Group by employee type
        by_type = payslips.values('employee_type').annotate(
            count=models.Count('id'),
            total_amount=models.Sum('amount')
        )
        
        return {
            'period': f"{start_date} to {end_date}",
            'total_payslips': total_payslips,
            'total_amount': total_amount,
            'by_employee_type': list(by_type),
            'generated_at': timezone.now()
        }
    
    @staticmethod
    def generate_loans_report(status=None):
        """
        Generate loans summary report
        
        Args:
            status: Filter by loan status (optional)
            
        Returns:
            dict: Report data
        """
        from .models import Loan
        
        loans = Loan.objects.all()
        
        if status:
            loans = loans.filter(status=status)
        
        # Calculate totals
        total_loans = loans.count()
        total_amount = loans.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_balance = loans.aggregate(
            total=models.Sum('balance')
        )['total'] or Decimal('0.00')
        
        # Group by loan type
        by_type = loans.values('loan_type').annotate(
            count=models.Count('id'),
            total_amount=models.Sum('amount'),
            total_balance=models.Sum('balance')
        )
        
        # Group by status
        by_status = loans.values('status').annotate(
            count=models.Count('id'),
            total_amount=models.Sum('amount'),
            total_balance=models.Sum('balance')
        )
        
        return {
            'total_loans': total_loans,
            'total_amount': total_amount,
            'total_balance': total_balance,
            'by_loan_type': list(by_type),
            'by_status': list(by_status),
            'generated_at': timezone.now()
        }

def format_currency(amount):
    """Format amount as currency string"""
    if amount is None:
        return "₱0.00"
    return f"₱{amount:,.2f}"

def validate_file_extension(filename, allowed_extensions):
    """Validate file extension"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed_extensions

def get_employee_emails(employee):
    """Get available email addresses for an employee"""
    emails = {}
    
    if hasattr(employee, 'email') and employee.email:
        emails['personal'] = employee.email
    
    if hasattr(employee, 'personalinformation') and hasattr(employee.personalinformation, 'work_email'):
        work_email = employee.personalinformation.work_email
        if work_email:
            emails['work'] = work_email
    
    return emails