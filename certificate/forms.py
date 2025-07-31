from django import forms
from django.core.exceptions import ValidationError
import os

class BulkCertificateUploadForm(forms.Form):
    title = forms.CharField(
        max_length=200,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Enter certificate title'
        }),
        help_text='Required: Enter the certificate title.'
    )
    
    certificates = forms.FileField(
        widget=forms.ClearableFileInput(attrs={
            'class': 'file-input',
            'accept': '.jpg,.jpeg,.png'
        }),
        help_text='Select multiple certificate files (JPG, JPEG, PNG). Filename should be employee ID number.'
    )

    def clean_certificates(self):
        files = self.files.getlist('certificates')
        
        if not files:
            raise ValidationError('Please select at least one file.')
        
        allowed_types = ['image/jpeg', 'image/png']
        max_file_size = 10 * 1024 * 1024  # 10MB
        
        for file in files:
            if file.content_type not in allowed_types:
                raise ValidationError('Only JPG, JPEG, and PNG files are allowed.')
            
            if file.size > max_file_size:
                raise ValidationError(
                    f'File "{file.name}" is too large. Maximum size is 10MB.'
                )
            
            filename_without_ext = os.path.splitext(file.name)[0]
            if not filename_without_ext.strip():
                raise ValidationError(
                    f'File "{file.name}" must have a valid filename (employee ID).'
                )
        
        return files