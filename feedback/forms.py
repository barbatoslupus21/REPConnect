from django import forms
from .models import Feedback

class FeedbackForm(forms.ModelForm):
    is_anonymous = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'checkbox-input',
            'id': 'anonymous-checkbox'
        })
    )

    class Meta:
        model = Feedback
        fields = ['subject', 'message', 'is_anonymous']
        widgets = {
            'subject': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Brief subject of your feedback',
                'required': True
            }),
            'message': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Please provide detailed feedback...',
                'rows': 6,
                'required': True
            }),
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

class ExportDateRangeForm(forms.Form):
    start_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-input',
            'type': 'date',
            'required': True
        }),
        label="Start Date"
    )
    
    end_date = forms.DateField(
        widget=forms.DateInput(attrs={
            'class': 'form-input',
            'type': 'date',
            'required': True
        }),
        label="End Date"
    )
    
    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date:
            if start_date > end_date:
                raise forms.ValidationError("Start date must be before end date.")
        
        return cleaned_data

class AdminNotesForm(forms.ModelForm):
    class Meta:
        model = Feedback
        fields = ['admin_notes']
        widgets = {
            'admin_notes': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Add administrative notes...',
                'rows': 4
            })
        }