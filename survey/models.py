from django.db import models
from django.utils import timezone
import json
from userlogin.models import EmployeeLogin

class SurveyTemplate(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='survey_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    template_data = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name

class SurveyCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#6366f1')
    icon = models.CharField(max_length=50, default='fas fa-folder')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Survey Categories'
        ordering = ['name']
        
    def __str__(self):
        return self.name

class Survey(models.Model):
    VISIBILITY_CHOICES = [
        ('all', 'All Users'),
        ('selected', 'Selected Users'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(SurveyCategory, on_delete=models.SET_NULL, null=True, blank=True)
    template = models.ForeignKey(SurveyTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='created_surveys')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='all')
    selected_users = models.ManyToManyField(EmployeeLogin, related_name='assigned_surveys', blank=True)
    deadline = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    allow_multiple_responses = models.BooleanField(default=False)
    anonymous_responses = models.BooleanField(default=True)
    randomize_questions = models.BooleanField(default=False)
    show_progress = models.BooleanField(default=True)
    auto_save = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.title
    
    def is_expired(self):
        if self.deadline:
            return timezone.now() > self.deadline
        return False
    
    def get_assigned_users(self):
        if self.visibility == 'all':
            return EmployeeLogin.objects.filter(is_active=True)
        return self.selected_users.all()
    
    def get_response_count(self):
        return self.responses.filter(is_complete=True).count()
    
    def get_completion_rate(self):
        total_users = self.get_assigned_users().count()
        if total_users == 0:
            return 0
        completed = self.responses.filter(is_complete=True).values('user').distinct().count()
        return (completed / total_users) * 100

class Question(models.Model):
    QUESTION_TYPES = [
        ('single_choice', 'Single Choice'),
        ('multiple_choice', 'Multiple Choice'),
        ('rating_scale', 'Rating Scale'),
        ('dropdown', 'Dropdown'),
        ('short_answer', 'Short Answer'),
        ('paragraph', 'Paragraph'),
        ('yes_no', 'Yes/No'),
        ('date', 'Date Picker'),
        ('file_upload', 'File Upload'),
    ]
    
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    
    options = models.JSONField(default=list, blank=True)
    
    min_value = models.IntegerField(null=True, blank=True)
    max_value = models.IntegerField(null=True, blank=True)
    
    max_file_size = models.IntegerField(default=5242880)
    allowed_file_types = models.JSONField(default=list, blank=True)
    
    validation_rules = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['order', 'id']
        
    def __str__(self):
        return f"{self.survey.title} - {self.question_text[:50]}"

class SurveyResponse(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='responses')
    user = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='survey_responses')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_complete = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.user.username} - {self.survey.title}"
    
    def get_completion_percentage(self):
        total_questions = self.survey.questions.count()
        if total_questions == 0:
            return 100
        answered = self.answers.count()
        return (answered / total_questions) * 100

class Answer(models.Model):
    response = models.ForeignKey(SurveyResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    
    text_answer = models.TextField(blank=True)
    
    selected_options = models.JSONField(default=list, blank=True)
    
    rating_value = models.IntegerField(null=True, blank=True)
    
    boolean_answer = models.BooleanField(null=True, blank=True)
    
    date_answer = models.DateField(null=True, blank=True)
    
    file_upload = models.FileField(upload_to='static/images/survey/file-upload/%Y/%m/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['response', 'question']
        ordering = ['question__order']
        
    def __str__(self):
        return f"Answer to {self.question.question_text[:30]}"

class SurveyDraft(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='drafts')
    user = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE)
    draft_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['survey', 'user']
        ordering = ['-updated_at']
        
    def __str__(self):
        return f"Draft: {self.user.username} - {self.survey.title}"

class SurveyAnalytics(models.Model):
    survey = models.OneToOneField(Survey, on_delete=models.CASCADE, related_name='analytics')
    total_views = models.PositiveIntegerField(default=0)
    total_starts = models.PositiveIntegerField(default=0)
    total_completions = models.PositiveIntegerField(default=0)
    average_completion_time = models.DurationField(null=True, blank=True)
    last_response_at = models.DateTimeField(null=True, blank=True)
    response_data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Analytics for {self.survey.title}"