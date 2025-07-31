from django.db import models
from userlogin.models import EmployeeLogin

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
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    admin_remarks = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_prfs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.employee.username} - {self.get_prf_type_display()}"
    
    @property
    def requires_control_number(self):
        loan_types = ['pagibig_loan', 'sss_loan', 'emergency_loan', 'medical_loan', 'educational_loan', 'coop_loan']
        return self.prf_type in loan_types