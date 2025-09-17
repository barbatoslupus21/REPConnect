from django import forms
from .models import Device, Ticket, DeviceType, TicketCategory


class DeviceForm(forms.ModelForm):
    class Meta:
        model = Device
        fields = ['device_name', 'device_code', 'device_brand', 'device_model', 'device_location', 'device_type']
        widgets = {
            'device_name': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter device name'
            }),
            'device_code': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter device code'
            }),
            'device_brand': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter device brand'
            }),
            'device_model': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter device model'
            }),
            'device_location': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter device location'
            }),
            'device_type': forms.Select(attrs={
                'class': 'form-input'
            })
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['device_type'].queryset = DeviceType.objects.all()
        self.fields['device_type'].empty_label = "Select Device Type"


class TicketForm(forms.ModelForm):
    class Meta:
        model = Ticket
        fields = ['requestor_name', 'device', 'priority_level', 'category', 'problem_details']
        widgets = {
            'requestor_name': forms.TextInput(attrs={
                'class': 'form-input',
                'readonly': 'readonly'
            }),
            'device': forms.Select(attrs={
                'class': 'form-input'
            }),
            'priority_level': forms.Select(attrs={
                'class': 'form-input'
            }),
            'category': forms.Select(attrs={
                'class': 'form-input'
            }),
            'problem_details': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Describe the problem in detail'
            })
        }

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        if user:
            self.fields['device'].queryset = Device.objects.filter(user=user, is_active=True)
            self.fields['device'].empty_label = "Select Device"
            if not self.instance.pk:
                self.fields['requestor_name'].initial = user.full_name
        self.fields['category'].queryset = TicketCategory.objects.all()
        self.fields['category'].empty_label = "Select Category"


class TicketUpdateForm(forms.ModelForm):
    class Meta:
        model = Ticket
        fields = ['device', 'priority_level', 'category', 'problem_details']
        widgets = {
            'device': forms.Select(attrs={
                'class': 'form-input'
            }),
            'priority_level': forms.Select(attrs={
                'class': 'form-input'
            }),
            'category': forms.Select(attrs={
                'class': 'form-input'
            }),
            'problem_details': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4
            })
        }


class TicketReviewForm(forms.ModelForm):
    class Meta:
        model = Ticket
        fields = ['status', 'technician_name', 'diagnosis', 'action_taken', 'possible_reason', 'recommendation']
        widgets = {
            'status': forms.Select(attrs={
                'class': 'form-input'
            }),
            'technician_name': forms.TextInput(attrs={
                'class': 'form-input',
                'readonly': 'readonly'
            }),
            'diagnosis': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'required': 'required'
            }),
            'action_taken': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'required': 'required'
            }),
            'possible_reason': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'required': 'required'
            }),
            'recommendation': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3
            })
        }

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        if user and not self.instance.technician_name:
            self.fields['technician_name'].initial = user.full_name
        self.fields['status'].choices = [
            ('', 'Select Status'),
            ('Approved', 'Approved'),
            ('Disapproved', 'Disapproved')
        ]


class DeviceUpdateForm(forms.ModelForm):
    class Meta:
        model = Device
        fields = ['device_name', 'device_code', 'device_location', 'device_type']
        widgets = {
            'device_name': forms.TextInput(attrs={
                'class': 'form-input'
            }),
            'device_code': forms.TextInput(attrs={
                'class': 'form-input'
            }),
            'device_location': forms.TextInput(attrs={
                'class': 'form-input'
            }),
            'device_type': forms.Select(attrs={
                'class': 'form-input'
            })
        }