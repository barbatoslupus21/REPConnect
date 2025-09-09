from django import forms
from .models import Announcement, AnnouncementReaction


class AnnouncementForm(forms.ModelForm):
    class Meta:
        model = Announcement
        fields = ['content', 'image']
        widgets = {
            'content': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Write your announcement here...',
                'rows': 5,
                'required': True
            }),
            'image': forms.FileInput(attrs={
                'class': 'form-input',
                'accept': 'image/*'
            })
        }
        labels = {
            'content': 'Content',
            'image': 'Upload Image (Optional - Max 10MB)'
        }
    
    def clean_content(self):
        content = self.cleaned_data.get('content')
        if content and len(content) < 10:
            raise forms.ValidationError('Content must be at least 10 characters long.')
        return content
    
    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            # Increase file size limit to 10MB
            if image.size > 10 * 1024 * 1024:
                raise forms.ValidationError('Image file size must be less than 10MB.')
            valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            import os
            ext = os.path.splitext(image.name)[1].lower()
            if ext not in valid_extensions:
                raise forms.ValidationError('Invalid image format. Allowed formats: JPG, PNG, GIF, WEBP')
        return image


class ReactionForm(forms.ModelForm):
    class Meta:
        model = AnnouncementReaction
        fields = ['emoji']
        widgets = {
            'emoji': forms.RadioSelect(attrs={
                'class': 'reaction-radio'
            })
        }