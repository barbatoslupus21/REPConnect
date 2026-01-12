from django.db import models
from decimal import Decimal
from userlogin.models import EmployeeLogin

class Payslip(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='payslips')
    cutoff_date = models.DateField()
    file_path = models.FileField(upload_to='payslips/')
    date_uploaded = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, null=True, related_name='uploaded_payslips')
    is_send_to_mail = models.BooleanField(default=False)

    class Meta:
        unique_together = ('employee', 'cutoff_date')
        ordering = ['-cutoff_date']

    def __str__(self):
        emp = self.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name or display_name == '':
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        return f"Payslip for {display_name} - {self.cutoff_date}"

class LoanType(models.Model):
    loan_type = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_stackable = models.BooleanField(default=True)  # Whether loans of this type can be stacked
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.loan_type

class Loan(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='loans')
    loan_type = models.ForeignKey(LoanType, on_delete=models.CASCADE, related_name='loan_types')
    principal_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Original loan amount
    current_balance = models.DecimalField(max_digits=10, decimal_places=2)   # Current remaining balance
    monthly_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        emp = self.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name or display_name == '':
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        return f"{display_name} - {self.loan_type.loan_type}: ₱{self.current_balance}"

    def add_principal(self, amount):
        """Add amount to both principal and current balance (for stacking loans)"""
        self.principal_amount += Decimal(str(amount))
        self.current_balance += Decimal(str(amount))
        self.save()

    def apply_deduction(self, amount, cut_off):
        """Apply deduction and create deduction record"""
        deduction_amount = min(Decimal(str(amount)), self.current_balance)
        
        if deduction_amount > 0:
            # Create deduction record
            LoanDeduction.objects.create(
                loan=self,
                amount=deduction_amount,
                cut_off=cut_off,
                balance_before=self.current_balance,
                balance_after=self.current_balance - deduction_amount
            )
            
            # Update current balance
            self.current_balance -= deduction_amount
            
            # Mark as inactive if fully paid
            if self.current_balance <= 0:
                self.is_active = False
                self.current_balance = Decimal('0')
            
            self.save()
            return deduction_amount
        return Decimal('0')

class LoanDeduction(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='deductions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cut_off = models.CharField(max_length=50)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['loan', 'cut_off']  # Prevent duplicate deductions for same cutoff

    def __str__(self):
        return f"{self.loan.employee.username} - {self.cut_off}: ₱{self.amount}"


class AllowanceType(models.Model):
    allowance_type = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.allowance_type


class Allowance(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='allowances')
    allowance_type = models.ForeignKey(AllowanceType, on_delete=models.CASCADE, related_name='allowance_types')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Make deposit_date optional so imported allowances can have null dates
    deposit_date = models.DateField(blank=True, null=True)
    # Period covered for allowances without deposit date (e.g., "January 2025", "Q1 2025")
    period_covered = models.CharField(max_length=100, blank=True, null=True)
    # New field: Flag to indicate if amount is a percentage
    is_percentage = models.BooleanField(default=False, help_text="If True, amount represents a percentage (e.g., 10 for 10%). Otherwise, it's a fixed amount.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        emp = self.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name or display_name == '':
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        # Append '%' if it's a percentage
        amount_display = f"{self.amount}%" if self.is_percentage else f"₱{self.amount}"
        return f"{display_name} - {self.allowance_type.allowance_type}: {amount_display}"


class OJTPayslipData(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='ojt_payslips')
    cut_off = models.CharField(max_length=50) # Basic Information
    regular_day = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Basic Information
    allowance_day = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Basic Information
    total_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    nd_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Allowance and benefits
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    basic_school_share = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Shares and deduction
    basic_ojt_share = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Allowance and benefits
    deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Shares and deduction
    net_ojt_share = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Total
    rice_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Allowance and benefits
    ot_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Holidays and Overtime
    nd_ot_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Holidays and Overtime
    special_holiday = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Holidays and Overtime
    legal_holiday = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Holidays and Overtime
    satoff_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Allowance and benefits
    rd_ot = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Holidays and Overtime
    adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Holidays and Overtime
    deduction_2 = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Shares and deduction
    ot_pay_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Total
    total_allow = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Total
    holiday_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Basic Information
    rd_ot_days = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Basic Information
    perfect_attendance = models.DecimalField(max_digits=10, decimal_places=2, default=0) # Allowance and benefits
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        emp = self.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name or display_name == '':
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        return f"OJT {display_name} - {self.cut_off}"

class OJTRate(models.Model):
    site = models.CharField(max_length=50, unique=True)
    allowance_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reg_nd_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reg_nd_ot_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reg_ot_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rest_ot_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    legal_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sat_off_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OJT Rate - {self.site}"


class SavingsType(models.Model):
    savings_type = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, default='fa-piggy-bank', help_text='FontAwesome icon class')
    color = models.CharField(max_length=20, default='green', help_text='Color theme: green, blue, purple, orange')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['savings_type']
        verbose_name = "Savings Type"
        verbose_name_plural = "Savings Types"

    def __str__(self):
        return self.savings_type


class Savings(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='savings')
    savings_type = models.ForeignKey(SavingsType, on_delete=models.SET_NULL, null=True, blank=True, related_name='savings_records')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_withdrawn = models.BooleanField(default=False)
    withdrawal_date = models.DateTimeField(null=True, blank=True)
    deposit_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        emp = self.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name or display_name == '':
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        status = "Withdrawn" if self.is_withdrawn else "Available"
        return f"Savings - {display_name}: ₱{self.amount} ({status})"

    def withdraw(self):
        if not self.is_withdrawn:
            from django.utils import timezone
            self.is_withdrawn = True
            self.withdrawal_date = timezone.now()
            self.save()
            return True
        return False

    def add_amount(self, additional_amount):
        if not self.is_withdrawn:
            self.amount += Decimal(str(additional_amount))
            self.save()
            return True
        return False

    @property
    def current_balance(self):
        return Decimal('0') if self.is_withdrawn else self.amount
