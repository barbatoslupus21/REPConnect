from django.db import models
from django.utils import timezone
from userlogin.models import EmployeeLogin
import datetime

class PRFRequest(models.Model):
    PRF_CATEGORIES = [
        ('government', 'Government Transaction'),
        ('banking', 'Banking and Finance'),
        ('hr_payroll', 'Human Resources and Payroll'),
    ]
    
    PRF_TYPES = [
        ('pagibig_loan', 'PAG-IBIG Loan'),
        ('pagibig_cert_payment', 'PAG-IBIG Certificate of Payment'),
        ('pagibig_cert_contribution', 'PAG-IBIG Certificate of Contribution'),
        ('philhealth_form', 'PHILHEALTH Form'),
        ('sss_loan', 'SSS Loan'),
        ('sss_maternity', 'SSS Maternity Benefits'),
        ('sss_sickness', 'SSS Sickness Benefits'),
        ('bir_form', 'BIR Form (2316/1902)'),
        ('rcbc_maintenance', 'RCBC Maintenance Form'),
        ('bank_deposit', 'Bank Deposit'),
        ('payroll_adjustment', 'Payroll Adjustment'),
        ('id_replacement', 'ID Replacement'),
        ('pcoe_compensation', 'PCOE with Compensation'),
        ('certificate_employment', 'Certificate of Employment'),
        ('clearance_form', 'Clearance Form'),
        ('emergency_loan', 'Emergency Loan'),
        ('medical_loan', 'Medical Assistance Loan'),
        ('educational_loan', 'Educational Assistance Loan'),
        ('coop_loan', 'Coop Loan'),
        ('uniform_ppe', 'Uniform / Caps / PPE / T-shirt'),
        ('others', 'Others'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
        ('cancelled', 'Cancelled'),
    ]
    
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='prf_requests')
    prf_category = models.CharField(max_length=20, choices=PRF_CATEGORIES)
    prf_type = models.CharField(max_length=30, choices=PRF_TYPES)
    purpose = models.TextField()
    control_number = models.CharField(max_length=50, blank=True, null=True)
    prf_control_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    admin_remarks = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_prfs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.employee.username} - {self.get_prf_type_display()}"
    
    @classmethod
    def generate_prf_control_number(cls):
        """Generate PRF control number starting from 1000"""
        latest_prf = cls.objects.filter(
            prf_control_number__isnull=False
        ).exclude(prf_control_number='').order_by('-prf_control_number').first()
        
        if latest_prf and latest_prf.prf_control_number:
            try:
                last_number = int(latest_prf.prf_control_number)
                next_number = last_number + 1
            except (ValueError, TypeError):
                next_number = 1000
        else:
            next_number = 1000
        
        return str(next_number)
    
    def save(self, *args, **kwargs):
        # Auto-generate PRF control number if not set
        if not self.prf_control_number:
            self.prf_control_number = self.generate_prf_control_number()
        super().save(*args, **kwargs)
    
    @property
    def requires_control_number(self):
        loan_types = ['pagibig_loan', 'sss_loan', 'emergency_loan', 'medical_loan', 'educational_loan', 'coop_loan']
        return self.prf_type in loan_types


class EmergencyLoan(models.Model):
    AMOUNT_CHOICES = [
        (2000, '₱2,000'),
        (3000, '₱3,000'),
        (4000, '₱4,000'),
        (5000, '₱5,000'),
    ]
    
    CUTOFF_CHOICES_2000 = [
        (1, '1 Cut-off (0.5 month)'),
        (2, '2 Cut-offs (1 month)'),
        (4, '4 Cut-offs (2 months)'),
    ]
    
    CUTOFF_CHOICES_3000_4000 = [
        (1, '1 Cut-off (0.5 month)'),
        (2, '2 Cut-offs (1 month)'),
        (4, '4 Cut-offs (2 months)'),
        (5, '5 Cut-offs (2.5 months)'),
    ]
    
    CUTOFF_CHOICES_5000 = [
        (1, '1 Cut-off (0.5 month)'),
        (2, '2 Cut-offs (1 month)'),
        (3, '3 Cut-offs (1.5 months)'),
        (4, '4 Cut-offs (2 months)'),
        (5, '5 Cut-offs (2.5 months)'),
        (6, '6 Cut-offs (3 months)'),
    ]
    
    prf_request = models.OneToOneField('PRFRequest', on_delete=models.CASCADE, related_name='emergency_loan')
    amount = models.IntegerField(choices=AMOUNT_CHOICES)
    number_of_cutoff = models.IntegerField()
    starting_date = models.DateField()
    employee_full_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.prf_request.employee.username} - Emergency Loan ₱{self.amount}"
    
    @property
    def deduction_per_cutoff(self):
        """Calculate the deduction amount per cut-off"""
        return self.amount / self.number_of_cutoff
    
    @property
    def formatted_starting_date(self):
        """Format the starting date for display"""
        return self.starting_date.strftime("%B %d, %Y")
    
    @classmethod
    def generate_control_number(cls):
        """Generate Emergency Loan control number in format EL[Year][Incremental Number]"""
        current_year = timezone.now().year
        year_prefix = f"EL{current_year}"
        
        # Find the latest Emergency Loan for the current year
        latest_loan = cls.objects.filter(
            prf_request__control_number__startswith=year_prefix
        ).order_by('-prf_request__control_number').first()
        
        if latest_loan:
            # Extract the incremental number from the control number
            control_number = latest_loan.prf_request.control_number
            try:
                last_number = int(control_number[6:])  # Extract last 4 digits
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1
        
        return f"{year_prefix}{next_number:04d}"
    
    @classmethod
    def get_cutoff_choices(cls, amount):
        if amount == 2000:
            return cls.CUTOFF_CHOICES_2000
        elif amount in [3000, 4000]:
            return cls.CUTOFF_CHOICES_3000_4000
        elif amount == 5000:
            return cls.CUTOFF_CHOICES_5000
        else:
            return []