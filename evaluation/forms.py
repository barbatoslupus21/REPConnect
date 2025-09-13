from django import forms
from userlogin.models import EmployeeLogin
from .models import Evaluation, EmployeeEvaluation, TaskRating, TrainingRequest, TaskList
import openpyxl
from io import BytesIO

class TaskListImportForm(forms.Form):
    excel_file = forms.FileField(
        label="Excel File",
        help_text="Upload an Excel file (.xlsx or .xls) with columns: employee_username, tasklist, description"
    )

    def clean_excel_file(self):
        file = self.cleaned_data['excel_file']
        if not file.name.lower().endswith(('.xlsx', '.xls')):
            raise forms.ValidationError("Please upload an Excel file (.xlsx or .xls).")
        return file

    def save(self):
        file = self.cleaned_data['excel_file']
        
        try:
            # Load the workbook
            workbook = openpyxl.load_workbook(file, data_only=True)
            worksheet = workbook.active
            
            created_tasks = []
            errors = []
            
            # Get header row to find column indices
            headers = {}
            for col_num, cell in enumerate(worksheet[1], 1):
                if cell.value:
                    headers[cell.value.lower().strip()] = col_num
            
            # Check if required headers exist
            required_headers = ['employee_username', 'tasklist']
            missing_headers = [h for h in required_headers if h not in headers]
            if missing_headers:
                errors.append(f"Missing required columns: {', '.join(missing_headers)}")
                return created_tasks, errors
            
            # Process data rows (skip header row)
            for row_num, row in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not any(row):  # Skip empty rows
                        continue
                    
                    # Get values based on header positions
                    username = str(row[headers['employee_username'] - 1]).strip() if row[headers['employee_username'] - 1] else ''
                    tasklist = str(row[headers['tasklist'] - 1]).strip() if row[headers['tasklist'] - 1] else ''
                    description = str(row[headers.get('description', len(row)) - 1]).strip() if headers.get('description') and len(row) >= headers['description'] and row[headers['description'] - 1] else ''
                    
                    if not username or not tasklist:
                        errors.append(f"Row {row_num}: Missing username or task name")
                        continue
                    
                    try:
                        employee = EmployeeLogin.objects.get(username=username)
                    except EmployeeLogin.DoesNotExist:
                        errors.append(f"Row {row_num}: Employee '{username}' not found")
                        continue
                    
                    task, created = TaskList.objects.get_or_create(
                        employee=employee,
                        tasklist=tasklist,
                        defaults={'description': description}
                    )
                    
                    if created:
                        created_tasks.append(task)
                        
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
            
        except Exception as e:
            errors.append(f"Error reading Excel file: {str(e)}")
        
        return created_tasks, errors

class EvaluationCreateForm(forms.ModelForm):
    class Meta:
        model = Evaluation
        # Include title, description, start_year, end_year, and duration fields
        fields = ['title', 'description', 'start_year', 'end_year', 'duration']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter evaluation title'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Enter evaluation description',
                'rows': 3,
                'required': 'required'
            }),
            'start_year': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '2025',
                'min': '2020',
                'max': '2040'
            }),
            'end_year': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '2026',
                'min': '2021',
                'max': '2041'
            }),
            'duration': forms.Select(attrs={'class': 'form-input'})
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        import datetime
        current_year = datetime.datetime.now().year
        current_month = datetime.datetime.now().month
        
        # Determine current fiscal year
        if current_month >= 5:  # May onwards
            fiscal_start = current_year
        else:  # January to April
            fiscal_start = current_year - 1
            
        # Set default values for current fiscal year
        self.fields['start_year'].initial = fiscal_start
        self.fields['end_year'].initial = fiscal_start + 1

    def clean_description(self):
        description = self.cleaned_data.get('description')
        if not description or description.strip() == '':
            raise forms.ValidationError('Description is required.')
        return description

    def clean(self):
        cleaned_data = super().clean()
        start_year = cleaned_data.get('start_year')
        end_year = cleaned_data.get('end_year')
        
        if start_year and end_year:
            if end_year != start_year + 1:
                raise forms.ValidationError({
                    'end_year': f'End year must be {start_year + 1} for fiscal year {start_year}-{start_year + 1}'
                })
        
        return cleaned_data

class TaskRatingForm(forms.ModelForm):
    class Meta:
        model = TaskRating
        fields = ['rating', 'comments']
        widgets = {
            'rating': forms.RadioSelect(choices=[(i, i) for i in range(1, 6)]),
            'comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Optional comments about this task'
            })
        }

class SupervisorEvaluationForm(forms.ModelForm):
    class Meta:
        model = EmployeeEvaluation
        fields = [
            'strengths', 'weaknesses', 'training_required', 'supervisor_comments', 'employee_comments',
            'cost_consciousness_rating', 'cost_consciousness_comments',
            'dependability_rating', 'dependability_comments',
            'communication_rating', 'communication_comments',
            'work_ethics_rating', 'work_ethics_comments',
            'attendance_rating', 'attendance_comments'
        ]
        widgets = {
            'strengths': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Describe the employee\'s key strengths...',
                'required': True
            }),
            'weaknesses': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Identify areas for improvement...',
                'required': True
            }),
            'training_required': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Recommended training or development activities (optional)'
            }),
            'supervisor_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Additional supervisor comments (optional)'
            }),
            'employee_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Employee feedback or comments (optional)'
            }),
            # Supervisor Criteria Rating Fields
            'cost_consciousness_rating': forms.Select(attrs={
                'class': 'form-input rating-select',
                'required': True
            }),
            'cost_consciousness_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 2,
                'placeholder': 'Comments on cost consciousness...'
            }),
            'dependability_rating': forms.Select(attrs={
                'class': 'form-input rating-select',
                'required': True
            }),
            'dependability_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 2,
                'placeholder': 'Comments on dependability...'
            }),
            'communication_rating': forms.Select(attrs={
                'class': 'form-input rating-select',
                'required': True
            }),
            'communication_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 2,
                'placeholder': 'Comments on communication...'
            }),
            'work_ethics_rating': forms.Select(attrs={
                'class': 'form-input rating-select',
                'required': True
            }),
            'work_ethics_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 2,
                'placeholder': 'Comments on work ethics...'
            }),
            'attendance_rating': forms.Select(attrs={
                'class': 'form-input rating-select',
                'required': True
            }),
            'attendance_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 2,
                'placeholder': 'Comments on attendance...'
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['strengths'].required = True
        self.fields['weaknesses'].required = True
        
        # Make supervisor criteria ratings required
        self.fields['cost_consciousness_rating'].required = True
        self.fields['dependability_rating'].required = True
        self.fields['communication_rating'].required = True
        self.fields['work_ethics_rating'].required = True
        self.fields['attendance_rating'].required = True
        
        # Set choices for rating fields
        RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]
        self.fields['cost_consciousness_rating'].choices = [('', 'Select Rating')] + RATING_CHOICES
        self.fields['dependability_rating'].choices = [('', 'Select Rating')] + RATING_CHOICES
        self.fields['communication_rating'].choices = [('', 'Select Rating')] + RATING_CHOICES
        self.fields['work_ethics_rating'].choices = [('', 'Select Rating')] + RATING_CHOICES
        self.fields['attendance_rating'].choices = [('', 'Select Rating')] + RATING_CHOICES

class ManagerApprovalForm(forms.ModelForm):
    APPROVAL_CHOICES = [
        ('approved', 'Approve'),
        ('disapproved', 'Disapprove')
    ]
    
    approval_decision = forms.ChoiceField(
        choices=APPROVAL_CHOICES,
        widget=forms.RadioSelect(attrs={'class': 'form-radio'})
    )

    class Meta:
        model = EmployeeEvaluation
        fields = ['manager_comments']
        widgets = {
            'manager_comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Manager comments (required if disapproving)'
            })
        }

    def clean(self):
        cleaned_data = super().clean()
        approval_decision = cleaned_data.get('approval_decision')
        manager_comments = cleaned_data.get('manager_comments')
        
        if approval_decision == 'disapproved' and not manager_comments:
            raise forms.ValidationError("Manager comments are required when disapproving an evaluation.")
        
        return cleaned_data

class TrainingRequestForm(forms.ModelForm):
    class Meta:
        model = TrainingRequest
        fields = ['training_topic', 'justification']
        widgets = {
            'training_topic': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter the training topic or skill you want to develop'
            }),
            'justification': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Explain why this training would benefit your performance and the organization'
            })
        }

class EmployeeFilterForm(forms.Form):
    employee = forms.ModelChoiceField(
        queryset=EmployeeLogin.objects.filter(
            active=True,
            employment_info__employment_type__in=['Regular', 'Probationary']
        ).select_related('employment_info'),
        required=False,
        empty_label="All Employees",
        widget=forms.Select(attrs={'class': 'form-input'})
    )
    status = forms.ChoiceField(
        choices=[('', 'All Statuses')] + Evaluation.STATUS_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-input'})
    )
    evaluation = forms.ModelChoiceField(
        queryset=Evaluation.objects.filter(is_active=True),
        required=False,
        empty_label="All Evaluations",
        widget=forms.Select(attrs={'class': 'form-input'})
    )
    date_from = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-input',
            'type': 'date'
        })
    )
    date_to = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-input',
            'type': 'date'
        })
    )