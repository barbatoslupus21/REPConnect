from django import forms
from django.core.exceptions import ValidationError
from userlogin.models import EmployeeLogin
from .models import Payslip, Loan, Allowance, LoanDeduction, LoanType, Savings, OJTRate
import os

class PayslipUploadForm(forms.Form):
    EMPLOYEE_TYPE_CHOICES = [
        ('regular', 'Regular/Probationary'),
        ('ojt', 'OJT'),
    ]

    employee_type = forms.ChoiceField(
        choices=EMPLOYEE_TYPE_CHOICES,
        widget=forms.Select(attrs={
            'class': 'form-input',
            'id': 'employee-type-select'
        })
    )
    employee = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Enter Employee ID'
        })
    )
    cutoff_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input',
            'required': True
        })
    )
    file = forms.FileField(
        widget=forms.ClearableFileInput(attrs={
            'class': 'form-input',
            'accept': '.pdf,.jpg,.jpeg,.png,.xlsx',
            'id': 'payslip-file'
        }),
        required=True
    )

    def clean_employee(self):
        emp_id = self.cleaned_data.get('employee')
        from userlogin.models import EmployeeLogin
        if not EmployeeLogin.objects.filter(idnumber=emp_id).exists():
            raise forms.ValidationError("Employee ID does not exist.")
        return emp_id

class EmployeeSearchForm(forms.Form):
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Search by name, ID number, or department...',
            'id': 'employee-search'
        })
    )
    department = forms.CharField(
        max_length=50,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Filter by department...',
            'id': 'department-filter'
        })
    )
    employment_type = forms.ChoiceField(
        choices=[
            ('', 'All Types'),
            ('regular', 'Regular'),
            ('probationary', 'Probationary'),
            ('ojt', 'OJT')
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-input',
            'id': 'employment-type-filter'
        })
    )


class EmailSelectionForm(forms.Form):
    EMAIL_CHOICES = [
        ('personal', 'Personal Email'),
        ('work', 'Work Email'),
    ]
    
    email_type = forms.ChoiceField(
        choices=EMAIL_CHOICES,
        widget=forms.RadioSelect(attrs={
            'class': 'form-radio'
        }),
        required=True
    )
    
    def __init__(self, user=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if user:
            personal_email = getattr(user, 'email', '')
            work_email = getattr(user, 'work_email', '') if hasattr(user, 'work_email') else ''
            
            choices = []
            if personal_email:
                choices.append(('personal', f'Personal Email ({personal_email})'))
            if work_email:
                choices.append(('work', f'Work Email ({work_email})'))
            
            if not choices:
                choices = [('personal', 'Personal Email (No email found)')]
            
            self.fields['email_type'].choices = choices


class AllowanceForm(forms.ModelForm):
    class Meta:
        model = Allowance
        fields = ['employee', 'allowance_type', 'amount', 'deposit_date']
        widgets = {
            'employee': forms.Select(attrs={'class': 'form-input'}),
            'allowance_type': forms.Select(attrs={'class': 'form-input'}),
            'amount': forms.NumberInput(attrs={'class': 'form-input', 'step': '0.01'}),
            'deposit_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-input'}),
        }

class LoanForm(forms.ModelForm):
    class Meta:
        model = Loan
        fields = ['employee', 'loan_type', 'principal_amount', 'monthly_deduction']
        widgets = {
            'employee': forms.Select(attrs={
                'class': 'form-select',
                'placeholder': 'Select Employee'
            }),
            'loan_type': forms.Select(attrs={
                'class': 'form-select',
                'placeholder': 'Select Loan Type'
            }),
            'principal_amount': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0'
            }),
            'monthly_deduction': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0'
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['employee'].queryset = EmployeeLogin.objects.filter(is_active=True).order_by('firstname', 'lastname')
        self.fields['employee'].empty_label = "Select Employee"
        self.fields['loan_type'].empty_label = "Select Loan Type"

    def save(self, commit=True):
        loan = super().save(commit=False)
        
        if not loan.pk:  # New loan
            loan.current_balance = loan.principal_amount
            
            # Check if employee has existing active loan of same type
            existing_loan = Loan.objects.filter(
                employee=loan.employee,
                loan_type=loan.loan_type,
                is_active=True
            ).first()
            
            if existing_loan and loan.loan_type.is_stackable:
                # Stack with existing loan
                existing_loan.add_principal(loan.principal_amount)
                if loan.monthly_deduction > 0:
                    existing_loan.monthly_deduction = loan.monthly_deduction
                    existing_loan.save()
                return existing_loan
        
        if commit:
            loan.save()
        return loan

class LoanTypeForm(forms.ModelForm):
    class Meta:
        model = LoanType
        fields = ['loan_type', 'description', 'is_stackable']
        widgets = {
            'loan_type': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter loan type name'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Enter description',
                'rows': 3
            }),
            'is_stackable': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            })
        }

class LoanDeductionForm(forms.ModelForm):
    class Meta:
        model = LoanDeduction
        fields = ['loan', 'amount', 'cut_off']
        widgets = {
            'loan': forms.Select(attrs={
                'class': 'form-select'
            }),
            'amount': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0'
            }),
            'cut_off': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'e.g., January 2025'
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['loan'].queryset = Loan.objects.filter(is_active=True, current_balance__gt=0).order_by('employee__firstname', 'loan_type__loan_type')
        self.fields['loan'].empty_label = "Select Active Loan"

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        loan = self.cleaned_data.get('loan')
        
        if amount and loan:
            if amount > loan.current_balance:
                raise forms.ValidationError(f'Deduction amount cannot exceed current balance of ₱{loan.current_balance}')
        
        return amount

    def save(self, commit=True):
        deduction = super().save(commit=False)
        
        if commit and deduction.loan:
            # Apply deduction to loan
            deduction.balance_before = deduction.loan.current_balance
            actual_deduction = deduction.loan.apply_deduction(deduction.amount, deduction.cut_off)
            deduction.balance_after = deduction.loan.current_balance
            # The loan.apply_deduction already creates the LoanDeduction record
            return LoanDeduction.objects.get(loan=deduction.loan, cut_off=deduction.cut_off)
        
        return deduction

class LoanPrincipalUploadForm(forms.Form):
    file = forms.FileField(
        label='Excel File',
        widget=forms.FileInput(attrs={
            'class': 'form-input',
            'accept': '.xlsx'
        }),
        help_text='Upload Excel file with columns: Employee_ID, Loan_Type, Amount, Monthly_Deduction'
    )

    def clean_file(self):
        file = self.cleaned_data.get('file')
        if file and not file.name.lower().endswith('.xlsx'):
            raise forms.ValidationError('Only Excel (.xlsx) files are allowed.')
        return file

class LoanDeductionUploadForm(forms.Form):
    file = forms.FileField(
        label='Excel File',
        widget=forms.FileInput(attrs={
            'class': 'form-input',
            'accept': '.xlsx'
        }),
        help_text='Upload Excel file with columns: Employee_ID, Loan_Type, Deduction_Amount'
    )
    
    cut_off = forms.CharField(
        label='Cut-off Period',
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'e.g., January 2025'
        }),
        help_text='Enter the cut-off period for these deductions'
    )

    def clean_file(self):
        file = self.cleaned_data.get('file')
        if file and not file.name.lower().endswith('.xlsx'):
            raise forms.ValidationError('Only Excel (.xlsx) files are allowed.')
        return file


class SavingsForm(forms.ModelForm):
    class Meta:
        model = Savings
        fields = ['employee', 'amount', 'deposit_date']
        widgets = {
            'employee': forms.Select(attrs={'class': 'form-input'}),
            'amount': forms.NumberInput(attrs={
                'class': 'form-input', 
                'step': '0.01',
                'min': '0',
                'placeholder': '0.00'
            }),
            'deposit_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-input'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['employee'].queryset = EmployeeLogin.objects.filter(is_active=True).order_by('firstname', 'lastname')
        self.fields['employee'].empty_label = "Select Employee"

    def save(self, commit=True):
        savings = super().save(commit=False)
        
        if not savings.pk:  # New savings entry
            # Check if employee has existing non-withdrawn savings
            existing_savings = Savings.objects.filter(
                employee=savings.employee,
                is_withdrawn=False
            ).first()
            
            if existing_savings:
                # Add to existing savings
                existing_savings.add_amount(savings.amount)
                return existing_savings
        
        if commit:
            savings.save()
        return savings


class SavingsWithdrawalForm(forms.Form):
    employee = forms.ModelChoiceField(
        queryset=EmployeeLogin.objects.none(),
        widget=forms.Select(attrs={'class': 'form-input'}),
        empty_label="Select Employee"
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only show employees who have available savings
        employees_with_savings = EmployeeLogin.objects.filter(
            savings__is_withdrawn=False,
            savings__amount__gt=0
        ).distinct().order_by('firstname', 'lastname')
        self.fields['employee'].queryset = employees_with_savings

    def clean_employee(self):
        employee = self.cleaned_data.get('employee')
        if employee:
            savings = Savings.objects.filter(employee=employee, is_withdrawn=False, amount__gt=0).first()
            if not savings:
                raise forms.ValidationError("This employee has no available savings to withdraw.")
        return employee


class SavingsUploadForm(forms.Form):
    file = forms.FileField(
        label='Excel File',
        widget=forms.FileInput(attrs={
            'class': 'form-input',
            'accept': '.xlsx'
        }),
        help_text='Upload Excel file with columns: Employee_ID, Amount, Deposit_Date'
    )

    def clean_file(self):
        file = self.cleaned_data.get('file')
        if file and not file.name.lower().endswith('.xlsx'):
            raise forms.ValidationError('Only Excel (.xlsx) files are allowed.')
        return file

class OJTRateForm(forms.ModelForm):
    class Meta:
        model = OJTRate
        fields = [
            'site',
            'reg_nd_rate',
            'reg_nd_ot_rate',
            'reg_ot_rate',
            'rest_ot_rate',
            'legal_rate',
            'sat_off_rate',
        ]
        widgets = {
            'site': forms.TextInput(attrs={'class': 'form-control'}),
            'reg_nd_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'reg_nd_ot_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'reg_ot_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'rest_ot_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'legal_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'sat_off_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }
