from django import forms
from django.core.exceptions import ValidationError
from .models import Holiday
from django.utils import timezone
from datetime import datetime, timedelta
from .models import EmployeeLogin, Timelogs

class HolidayForm(forms.ModelForm):
    class Meta:
        model = Holiday
        fields = ['name', 'date', 'holiday_type', 'repetition', 'description']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter holiday name'
            }),
            'date': forms.DateInput(attrs={
                'class': 'form-input',
                'type': 'date'
            }),
            'holiday_type': forms.Select(attrs={
                'class': 'form-input'
            }),
            'repetition': forms.Select(attrs={
                'class': 'form-input'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Optional description',
                'rows': 3
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['description'].required = False

class TimelogForm(forms.ModelForm):
    date = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input'
        }),
        help_text='Select the date for this time log entry'
    )
    
    time = forms.TimeField(
        widget=forms.TimeInput(attrs={
            'type': 'time',
            'class': 'form-input'
        }),
        help_text='Select the time for this entry'
    )
    
    class Meta:
        model = Timelogs
        fields = ['employee', 'entry']
        widgets = {
            'employee': forms.Select(attrs={
                'class': 'form-input'
            }),
            'entry': forms.Select(attrs={
                'class': 'form-input'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.fields['employee'].queryset = EmployeeLogin.objects.filter(is_active=True).order_by('firstname', 'lastname')
        
        if not self.instance.pk:
            self.fields['date'].initial = timezone.now().date()
        else:
            self.fields['date'].initial = self.instance.time.date()
            self.fields['time'].initial = self.instance.time.time()
    
    def clean(self):
        cleaned_data = super().clean()
        employee = cleaned_data.get('employee')
        date = cleaned_data.get('date')
        time = cleaned_data.get('time')
        entry = cleaned_data.get('entry')
        
        if employee and date and time:
            datetime_combined = datetime.combine(date, time)
            
            existing_query = Timelogs.objects.filter(
                employee=employee,
                time=datetime_combined
            )
            
            if self.instance.pk:
                existing_query = existing_query.exclude(pk=self.instance.pk)
            
            if existing_query.exists():
                raise ValidationError(
                    'A time log entry already exists for this employee at this date and time.'
                )
            
            if datetime_combined > timezone.now():
                raise ValidationError(
                    'Time log entries cannot be created for future dates and times.'
                )
            
            cleaned_data['datetime_combined'] = datetime_combined
        
        return cleaned_data
    
    def save(self, commit=True):
        instance = super().save(commit=False)
        
        if hasattr(self, 'cleaned_data') and 'datetime_combined' in self.cleaned_data:
            instance.time = self.cleaned_data['datetime_combined']
        
        if commit:
            instance.save()
        
        return instance

class TimelogImportForm(forms.Form):
    file = forms.FileField(
        widget=forms.FileInput(attrs={
            'class': 'file-input',
            'accept': '.xlsx,.xls'
        }),
        help_text='Upload Excel files (.xlsx or .xls) containing time log data'
    )
    
    def clean_file(self):
        file = self.cleaned_data.get('file')
        
        if file:
            if not file.name.lower().endswith(('.xlsx', '.xls')):
                raise ValidationError('Please upload a valid Excel file (.xlsx or .xls)')
            
            if file.size > 10 * 1024 * 1024:
                raise ValidationError('File size cannot exceed 10MB')
        
        return file

class TimelogSearchForm(forms.Form):
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'search-input',
            'placeholder': 'Search employees...'
        })
    )
    
    start_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input'
        })
    )
    
    end_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input'
        })
    )
    
    department = forms.ChoiceField(
        choices=[
            ('all', 'All Departments'),
            ('hr', 'Human Resources'),
            ('it', 'Information Technology'),
            ('finance', 'Finance'),
            ('marketing', 'Marketing'),
            ('sales', 'Sales'),
        ],
        required=False,
        initial='all',
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    entry_type = forms.ChoiceField(
        choices=[
            ('', 'All Entry Types'),
            ('timein', 'Time In'),
            ('timeout', 'Time Out'),
        ],
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date:
            if start_date > end_date:
                raise ValidationError('Start date cannot be later than end date.')
            
            if (end_date - start_date).days > 365:
                raise ValidationError('Date range cannot exceed 1 year.')
        
        return cleaned_data

class BulkTimelogActionForm(forms.Form):
    ACTION_CHOICES = [
        ('delete', 'Delete Selected'),
        ('export', 'Export Selected'),
    ]
    
    action = forms.ChoiceField(
        choices=ACTION_CHOICES,
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    selected_ids = forms.CharField(
        widget=forms.HiddenInput()
    )
    
    def clean_selected_ids(self):
        selected_ids = self.cleaned_data.get('selected_ids', '')
        
        if not selected_ids:
            raise ValidationError('No time logs selected for bulk action.')
        
        try:
            id_list = [int(id.strip()) for id in selected_ids.split(',') if id.strip()]
            
            if not id_list:
                raise ValidationError('No valid time log IDs provided.')
            
            existing_count = Timelogs.objects.filter(id__in=id_list).count()
            if existing_count != len(id_list):
                raise ValidationError('Some selected time logs no longer exist.')
            
            return id_list
            
        except (ValueError, TypeError):
            raise ValidationError('Invalid time log IDs provided.')

class TimelogReportForm(forms.Form):
    REPORT_TYPES = [
        ('summary', 'Employee Summary'),
        ('detailed', 'Detailed Logs'),
        ('attendance', 'Attendance Report'),
        ('discrepancies', 'Discrepancies Report'),
    ]
    
    FORMAT_CHOICES = [
        ('xlsx', 'Excel (.xlsx)'),
        ('pdf', 'PDF'),
        ('csv', 'CSV'),
    ]
    
    report_type = forms.ChoiceField(
        choices=REPORT_TYPES,
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    start_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input'
        })
    )
    
    end_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input'
        })
    )
    
    format = forms.ChoiceField(
        choices=FORMAT_CHOICES,
        initial='xlsx',
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    employees = forms.ModelMultipleChoiceField(
        queryset=EmployeeLogin.objects.filter(is_active=True),
        required=False,
        widget=forms.CheckboxSelectMultiple()
    )
    
    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date:
            if start_date > end_date:
                raise ValidationError('Start date cannot be later than end date.')
            
            if (end_date - start_date).days > 365:
                raise ValidationError('Report date range cannot exceed 1 year.')
        
        return cleaned_data