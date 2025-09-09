from django import forms
from django.contrib.auth import get_user_model
from .models import Training, TrainingEvaluation, EvaluationRouting
from userlogin.models import EmployeeLogin

User = get_user_model()

class TrainingForm(forms.ModelForm):
    participants = forms.ModelMultipleChoiceField(
        queryset=EmployeeLogin.objects.filter(
            is_active=True, 
            hr_admin=False, 
            accounting_admin=False,
            wire_admin=False,
            clinic_admin=False,
            iad_admin=False,
            mis_admin=False
        ),
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    
    class Meta:
        model = Training
        fields = ['title', 'objective', 'speaker', 'training_date', 'participants']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter training title'
            }),
            'objective': forms.Textarea(attrs={
                'class': 'form-input',
                'placeholder': 'Enter training objective',
                'rows': 4
            }),
            'speaker': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter speaker name'
            }),
            'training_date': forms.DateInput(attrs={
                'class': 'form-input',
                'type': 'date'
            }),
        }

class TrainingEvaluationForm(forms.ModelForm):
    class Meta:
        model = TrainingEvaluation
        fields = [
            # Content Evaluation
            'content_related_to_job', 'content_explained_clearly', 'content_suitable_for_topic',
            # Program Organization
            'program_clear_goals', 'program_met_goals', 'program_easy_to_follow', 'program_easy_to_understand',
            # Speaker Effectiveness
            'speaker_knowledge', 'speaker_clear_communication', 'speaker_answered_questions',
            # Training Environment & Resources
            'training_organization', 'suitable_facilities', 'helpful_materials',
            # Open-ended Feedback
            'most_interesting_topic', 'feedback_recommendations', 'future_training_topics',
            # Application to Work
            'new_things_learned_work', 'how_apply_at_work', 'target_implementation_date', 'actual_implementation_date',
            # Application to Self
            'new_things_learned_personal', 'how_apply_daily_life'
        ]
        
        widgets = {
            # Rating fields (1-5 scale)
            'content_related_to_job': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'content_explained_clearly': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'content_suitable_for_topic': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'program_clear_goals': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'program_met_goals': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'program_easy_to_follow': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'program_easy_to_understand': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'speaker_knowledge': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'speaker_clear_communication': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'speaker_answered_questions': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'training_organization': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'suitable_facilities': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            'helpful_materials': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
            
            # Text areas
            'most_interesting_topic': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Which topic captured your interest the most? Why?'
            }),
            'feedback_recommendations': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Feedback or recommendations for future training'
            }),
            'future_training_topics': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Topics you want in upcoming training'
            }),
            'new_things_learned_work': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'What new things did you learn that can help at work?'
            }),
            'how_apply_at_work': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'How will you apply them at work?'
            }),
            'new_things_learned_personal': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'What new things did you learn for outside work?'
            }),
            'how_apply_daily_life': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'How will you apply them in daily life?'
            }),
            
            # Date fields
            'target_implementation_date': forms.DateInput(attrs={
                'class': 'form-input',
                'type': 'date'
            }),
            'actual_implementation_date': forms.DateInput(attrs={
                'class': 'form-input',
                'type': 'date'
            }),
        }

class SupervisorAssessmentForm(forms.ModelForm):
    """
    Form for supervisors to assess training evaluations.
    Now uses the fields directly from TrainingEvaluation model.
    """
    class Meta:
        model = TrainingEvaluation
        fields = ['result_and_impact', 'recommendations', 'overall_assessment']
        widgets = {
            'result_and_impact': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Describe the result and impact of this training on the employee'
            }),
            'recommendations': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Provide recommendations for the employee'
            }),
            'overall_assessment': forms.RadioSelect(choices=[(i, str(i)) for i in range(1, 6)]),
        }

class EvaluationRoutingForm(forms.ModelForm):
    """
    Form for managing evaluation routing steps.
    """
    class Meta:
        model = EvaluationRouting
        fields = ['approver', 'sequence', 'comments']
        widgets = {
            'approver': forms.Select(attrs={'class': 'form-input'}),
            'sequence': forms.NumberInput(attrs={'class': 'form-input', 'min': 1}),
            'comments': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 3,
                'placeholder': 'Optional comments'
            }),
        }