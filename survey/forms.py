from django import forms
from django.core.exceptions import ValidationError
from userlogin.models import EmployeeLogin
from .models import Survey, Question, SurveyTemplate, SurveyCategory

class SurveyForm(forms.ModelForm):
    class Meta:
        model = Survey
        fields = [
            'title', 'description', 'category', 'template', 'visibility', 
            'deadline', 'status', 'allow_multiple_responses', 'anonymous_responses',
            'randomize_questions', 'show_progress', 'auto_save'
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter survey title...'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Enter survey description...'
            }),
            'category': forms.Select(attrs={
                'class': 'form-input'
            }),
            'template': forms.Select(attrs={
                'class': 'form-input'
            }),
            'visibility': forms.Select(attrs={
                'class': 'form-input'
            }),
            'deadline': forms.DateTimeInput(attrs={
                'class': 'form-input',
                'type': 'datetime-local'
            }),
            'status': forms.Select(attrs={
                'class': 'form-input'
            }),
            'allow_multiple_responses': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'anonymous_responses': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'randomize_questions': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'show_progress': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'auto_save': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        self.fields['category'].queryset = SurveyCategory.objects.all()
        if user:
            self.fields['template'].queryset = SurveyTemplate.objects.filter(is_active=True, created_by=user)
        else:
            self.fields['template'].queryset = SurveyTemplate.objects.filter(is_active=True)
        self.fields['category'].empty_label = "Select Category (Optional)"
        self.fields['template'].empty_label = "Select Template"        
        # Make template required
        self.fields['template'].required = True
        
        # Remove required attribute from widgets to prevent default red borders
        self.fields['title'].widget.attrs.pop('required', None)
        self.fields['description'].widget.attrs.pop('required', None)
        self.fields['template'].widget.attrs.pop('required', None)
        
        # Set default status to 'active'
        self.fields['status'].initial = 'active'
class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = [
            'question_text', 'question_type', 'required', 'description',
            'options', 'min_value', 'max_value', 'validation_rules'
        ]
        widgets = {
            'question_text': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Enter your question...'
            }),
            'question_type': forms.Select(attrs={
                'class': 'form-input'
            }),
            'required': forms.CheckboxInput(attrs={
                'class': 'form-checkbox'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 2,
                'placeholder': 'Optional description or instructions...'
            }),
            'min_value': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': 'Minimum value'
            }),
            'max_value': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': 'Maximum value'
            }),
        }

class SurveyTemplateForm(forms.ModelForm):
    class Meta:
        model = SurveyTemplate
        fields = ['name', 'description', 'template_data']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter template name...'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 1,
                'placeholder': 'Enter template description...'
            }),
            'template_data': forms.HiddenInput(),
        }

class SurveyCategoryForm(forms.ModelForm):
    class Meta:
        model = SurveyCategory
        fields = ['name', 'color', 'icon']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter category name...'
            }),
            'color': forms.TextInput(attrs={
                'class': 'form-input',
                'type': 'color'
            }),
            'icon': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'e.g., fas fa-chart-bar'
            }),
        }

class SurveyFilterForm(forms.Form):
    search = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Search surveys...'
        })
    )
    
    status = forms.ChoiceField(
        choices=[('', 'All Statuses')] + Survey.STATUS_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    category = forms.ModelChoiceField(
        queryset=SurveyCategory.objects.all(),
        required=False,
        empty_label="All Categories",
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )

class ExportForm(forms.Form):
    EXPORT_FORMATS = [
        ('excel', 'Excel (.xlsx)'),
        ('csv', 'CSV (.csv)'),
    ]
    
    EXPORT_TYPES = [
        ('responses', 'Individual Responses'),
        ('summary', 'Summary Data'),
        ('both', 'Both'),
    ]
    
    format = forms.ChoiceField(
        choices=EXPORT_FORMATS,
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
    )
    
    export_type = forms.ChoiceField(
        choices=EXPORT_TYPES,
        widget=forms.Select(attrs={
            'class': 'form-input'
        })
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
    
    include_incomplete = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-checkbox'
        })
    )