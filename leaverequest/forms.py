from django import forms
from .models import LeaveApprovalAction

class LeaveApprovalActionForm(forms.ModelForm):
    class Meta:
        model = LeaveApprovalAction
        fields = ['leave_request', 'approver', 'sequence', 'status', 'action', 'comments', 'action_at']
        widgets = {
            'leave_request': forms.Select(attrs={'class': 'form-control'}),
            'approver': forms.Select(attrs={'class': 'form-control'}),
            'sequence': forms.NumberInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-control'}),
            'action': forms.Select(attrs={'class': 'form-control'}),
            'comments': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'action_at': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
        }
from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import LeaveRequest, LeaveType, LeaveBalance, LeaveReason

class LeaveRequestForm(forms.ModelForm):
    leave_reason = forms.ModelChoiceField(
        queryset=LeaveReason.objects.none(),
        required=False,  # We'll validate this conditionally
        widget=forms.Select(attrs={
            'class': 'form-control',
            'placeholder': 'Select a reason...'
        })
    )

    class Meta:
        model = LeaveRequest
        fields = ['leave_type', 'date_from', 'date_to', 'leave_reason', 'reason', 'hrs_requested']
        widgets = {
            'leave_type': forms.Select(attrs={
                'class': 'form-control',
                'required': True
            }),
            'date_from': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-control',
                'required': True
            }),
            'date_to': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-control',
                'required': True
            }),
            'reason': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 4,
                'placeholder': 'Please provide the reason for your leave request...'
            }),
            'hrs_requested': forms.HiddenInput(),
        }
    
    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        self.fields['leave_type'].queryset = LeaveType.objects.filter(is_active=True)
        if 'leave_type' in self.data:
            try:
                leave_type_id = int(self.data.get('leave_type'))
                self.fields['leave_reason'].queryset = LeaveReason.objects.filter(leave_type_id=leave_type_id, is_active=True)
            except (ValueError, TypeError):
                self.fields['leave_reason'].queryset = LeaveReason.objects.none()
        elif self.instance.pk and self.instance.leave_type:
            self.fields['leave_reason'].queryset = LeaveReason.objects.filter(leave_type=self.instance.leave_type, is_active=True)
        else:
            self.fields['leave_reason'].queryset = LeaveReason.objects.none()
    
    def clean(self):
        cleaned_data = super().clean()
        date_from = cleaned_data.get('date_from')
        date_to = cleaned_data.get('date_to')
        leave_type = cleaned_data.get('leave_type')
        leave_reason = cleaned_data.get('leave_reason')
        
        if leave_type:
            available_reasons = LeaveReason.objects.filter(leave_type=leave_type, is_active=True)
            if available_reasons.exists() and not leave_reason:
                raise ValidationError("Please select a leave reason category.")
        
        if date_from and date_to:
            if date_to < date_from:
                raise ValidationError("End date cannot be before start date.")
            days_requested = self.calculate_working_days_for_validation(date_from, date_to)
            
            if self.user:
                overlapping = LeaveRequest.objects.filter(
                    employee=self.user,
                    status__in=['routing', 'approved'],
                    date_from__lte=date_to,
                    date_to__gte=date_from
                )
                
                if self.instance.pk:
                    overlapping = overlapping.exclude(pk=self.instance.pk)
                
                if overlapping.exists():
                    raise ValidationError("You have overlapping leave requests for the selected dates.")
                
                if (hasattr(self.user, 'employment_info') and 
                    getattr(self.user.employment_info, 'employment_status', None) == 'Regular' and
                    leave_type):
                    
                    today = timezone.now().date()
                    active_balance = LeaveBalance.objects.filter(
                        employee=self.user,
                        leave_type=leave_type,
                        valid_from__lte=today,
                        valid_to__gte=today,
                        validity_status='active'
                    ).first()
                    
                    if active_balance and active_balance.remaining < days_requested:
                        raise ValidationError(
                            f"Insufficient leave balance. You have {active_balance.remaining} days remaining "
                            f"for {leave_type.name}, but requested {days_requested} days."
                        )
        
        return cleaned_data
    
    def calculate_working_days_for_validation(self, start_date, end_date):
        """Calculate working days for validation purposes"""
        from usercalendar.models import Holiday
        from .models import SundayException
        from datetime import timedelta
        
        working_days = 0
        current_date = start_date
        
        # Get holidays and Sunday exceptions
        holidays = set(Holiday.objects.filter(
            date__range=[start_date, end_date]
        ).values_list('date', flat=True))
        
        sunday_exceptions = set(SundayException.objects.filter(
            date__range=[start_date, end_date]
        ).values_list('date', flat=True))
        
        while current_date <= end_date:
            # Check if it's a holiday
            is_holiday = current_date in holidays
            
            # Check if it's Sunday and if it's exempted
            is_sunday = current_date.weekday() == 6  # Monday=0, Sunday=6
            is_sunday_exempted = current_date in sunday_exceptions
            
            # Count the day if it's not a holiday and either not Sunday or is an exempted Sunday
            if not is_holiday and (not is_sunday or is_sunday_exempted):
                working_days += 1
            
            # Move to next day
            current_date += timedelta(days=1)
        
        return working_days  # Allow 0 working days

class LeaveApprovalForm(forms.Form):
    ACTION_CHOICES = [
        ('approve', 'Approve'),
        ('disapprove', 'Disapprove'),
    ]
    
    action = forms.ChoiceField(
        choices=ACTION_CHOICES,
        widget=forms.RadioSelect(attrs={'class': 'approval-radio'})
    )
    comments = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': 'Optional comments...'
        })
    )

class LeaveSearchForm(forms.Form):
    STATUS_CHOICES = [
        ('', 'All Status'),
        ('routing', 'Routing'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
        ('cancelled', 'Cancelled'),
    ]
    
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Search by control number, employee name...'
        })
    )
    
    status = forms.ChoiceField(
        choices=STATUS_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    leave_type = forms.ModelChoiceField(
        queryset=LeaveType.objects.filter(is_active=True),
        required=False,
        empty_label="All Leave Types",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    date_from = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-control'
        })
    )
    
    date_to = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-control'
        })
    )

class LeaveBalanceForm(forms.ModelForm):
    class Meta:
        model = LeaveBalance
        fields = ['employee', 'leave_type', 'entitled', 'valid_from', 'valid_to']
        widgets = {
            'employee': forms.Select(attrs={'class': 'form-control'}),
            'leave_type': forms.Select(attrs={'class': 'form-control'}),
            'entitled': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '0',
                'step': '0.5'
            }),
            'valid_from': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-control'
            }),
            'valid_to': forms.DateInput(attrs={
                'type': 'date',
                'class': 'form-control'
            })
        }
    
    def clean(self):
        cleaned_data = super().clean()
        valid_from = cleaned_data.get('valid_from')
        valid_to = cleaned_data.get('valid_to')
        
        if valid_from and valid_to and valid_to < valid_from:
            raise ValidationError("Valid to date cannot be before valid from date.")
        
        return cleaned_data