from django import forms
from .models import PRFRequest

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