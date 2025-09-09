from django import forms
from django.utils import timezone
from .models import PRFRequest, EmergencyLoan

class PRFRequestForm(forms.ModelForm):
    class Meta:
        model = PRFRequest
        fields = ['prf_category', 'prf_type', 'purpose', 'control_number']
        widgets = {
            'prf_category': forms.Select(attrs={
                'class': 'form-input',
                'id': 'prf_category'
            }),
            'prf_type': forms.Select(attrs={
                'class': 'form-input',
                'id': 'prf_type'
            }),
            'purpose': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Enter purpose of request...'
            }),
            'control_number': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter control number...',
                'id': 'control_number',
                'min': '0',
                'step': '1'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['control_number'].required = False

class PRFFilterForm(forms.Form):
    prf_type = forms.ChoiceField(
        choices=[('', 'All Types')] + PRFRequest.PRF_TYPES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-input'})
    )
    start_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-input', 'type': 'date'})
    )
    end_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-input', 'type': 'date'})
    )

class PRFActionForm(forms.ModelForm):
    class Meta:
        model = PRFRequest
        fields = ['status', 'admin_remarks']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-input'}),
            'admin_remarks': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Add remarks (optional)...'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['status'].choices = [
            ('approved', 'Approved'),
            ('disapproved', 'Disapproved')
        ]
        self.fields['admin_remarks'].required = False


class EmergencyLoanForm(forms.ModelForm):
    employee_full_name = forms.CharField(
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Enter your full name to confirm',
            'id': 'employee_full_name'
        }),
        label='Full Name Confirmation'
    )
    
    class Meta:
        model = EmergencyLoan
        fields = ['amount', 'number_of_cutoff', 'starting_date', 'employee_full_name']
        widgets = {
            'amount': forms.Select(attrs={
                'class': 'form-input',
                'id': 'emergency_amount'
            }),
            'number_of_cutoff': forms.Select(attrs={
                'class': 'form-input',
                'id': 'emergency_cutoff',
                'disabled': True
            }),
            'starting_date': forms.DateInput(attrs={
                'class': 'form-input',
                'type': 'date',
                'id': 'emergency_start_date',
                'min': timezone.now().date().isoformat()
            })
        }
    
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # Set up amount choices
        self.fields['amount'].choices = EmergencyLoan.AMOUNT_CHOICES
        
        # Initially disable number_of_cutoff
        self.fields['number_of_cutoff'].choices = []
        
        # Set minimum date to today
        self.fields['starting_date'].widget.attrs['min'] = timezone.now().date().isoformat()
    
    def clean_employee_full_name(self):
        """Validate that the entered name matches the user's full name"""
        if not self.user:
            raise forms.ValidationError("User information not available.")
        
        entered_name = self.cleaned_data.get('employee_full_name', '').strip()
        expected_name = f"{self.user.firstname} {self.user.lastname}".strip()
        
        if entered_name.lower() != expected_name.lower():
            raise forms.ValidationError(
                f"Please enter your exact full name: {expected_name}"
            )
        
        return entered_name
    
    def clean_starting_date(self):
        """Validate that starting date is not in the past"""
        starting_date = self.cleaned_data.get('starting_date')
        
        if starting_date and starting_date < timezone.now().date():
            raise forms.ValidationError("Starting date cannot be in the past.")
        
        return starting_date