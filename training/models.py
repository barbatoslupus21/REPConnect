from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from userlogin.models import EmployeeLogin

class Training(models.Model):
    title = models.CharField(max_length=200)
    objective = models.TextField()
    speaker = models.CharField(max_length=100)
    training_date = models.DateField()
    participants = models.ManyToManyField(EmployeeLogin, related_name='trainings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    @property
    def progress_percentage(self):
        total_participants = self.participants.count()
        if total_participants == 0:
            return 0
        completed_evaluations = TrainingEvaluation.objects.filter(
            training=self,
            is_submitted=True
        ).count()
        return round((completed_evaluations / total_participants) * 100, 1)
    
    @property
    def is_active(self):
        return self.progress_percentage < 100

class TrainingEvaluation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('supervisor_reviewed', 'Supervisor Reviewed'),
        ('manager_reviewed', 'Manager Reviewed'),
        ('participant_reviewed', 'Participant Reviewed'),
        ('hr_review', 'HR Review'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]
    
    training = models.ForeignKey(Training, on_delete=models.CASCADE, related_name='evaluations')
    participant = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='training_evaluations')
    
    # Content Evaluation (1-5 scale)
    content_related_to_job = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    content_explained_clearly = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    content_suitable_for_topic = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    
    # Program Organization (1-5 scale)
    program_clear_goals = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    program_met_goals = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    program_easy_to_follow = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    program_easy_to_understand = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    
    # Speaker Effectiveness (1-5 scale)
    speaker_knowledge = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    speaker_clear_communication = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    speaker_answered_questions = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    
    # Training Environment & Resources (1-5 scale)
    training_organization = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    suitable_facilities = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    helpful_materials = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    
    # Open-ended Feedback
    most_interesting_topic = models.TextField(blank=True)
    feedback_recommendations = models.TextField(blank=True)
    future_training_topics = models.TextField(blank=True)
    
    # Application to Work
    new_things_learned_work = models.TextField(blank=True)
    how_apply_at_work = models.TextField(blank=True)
    target_implementation_date = models.DateField(null=True, blank=True)
    actual_implementation_date = models.DateField(null=True, blank=True)
    
    # Application to Self
    new_things_learned_personal = models.TextField(blank=True)
    how_apply_daily_life = models.TextField(blank=True)
    
    # Supervisor-only fields (not visible to regular users)
    result_and_impact = models.TextField(blank=True, help_text="Supervisor assessment of results and impact")
    recommendations = models.TextField(blank=True, help_text="Supervisor recommendations")
    overall_assessment = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True,
        help_text="Overall assessment rating (1-5)"
    )
    approver_by_manager = models.BooleanField(default=False, help_text="Whether this evaluation has been approved by manager")
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('training', 'participant')
    
    def __str__(self):
        return f"{self.participant.username} - {self.training.title}"

class EvaluationRouting(models.Model):
    evaluation = models.ForeignKey(
        TrainingEvaluation, 
        on_delete=models.CASCADE, 
        related_name='routing_steps'
    )
    approver = models.ForeignKey(
        EmployeeLogin, 
        on_delete=models.CASCADE, 
        related_name='evaluation_approvals'
    )
    sequence = models.PositiveIntegerField(help_text="Order of approval in the routing chain")
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('evaluation', 'approver')
        ordering = ['sequence']
    
    def __str__(self):
        return f"Routing Step {self.sequence}: {self.approver.username} for {self.evaluation}"