from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import datetime as dt
from datetime import timedelta
from userlogin.models import EmployeeLogin

class TaskList(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='task_lists')
    tasklist= models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('employee', 'tasklist')
        ordering = ['tasklist']

    def __str__(self):
        return f"{self.employee.username} - {self.tasklist}"


class Evaluation(models.Model):
    DURATION_CHOICES = [
        ('daily', 'Daily'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('supervisor_review', 'Supervisor Review'),
        ('manager_review', 'Manager Review'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(help_text="Description of the evaluation")
    start_year = models.IntegerField(help_text="Fiscal year start (e.g., 2025 for FY2025-26)")
    end_year = models.IntegerField(help_text="Fiscal year end (e.g., 2026 for FY2025-26)")
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES)
    created_by = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='created_evaluations')
    created_at = models.DateTimeField(auto_now_add=True)
    start_date = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (FY{self.start_year}-{str(self.end_year)[2:]}) - {self.get_duration_display()}"

    @property
    def fiscal_year_label(self):
        return f"FY{self.start_year}-{str(self.end_year)[2:]}"

    @property
    def fiscal_year_start_date(self):
        return dt.datetime(self.start_year, 5, 1, tzinfo=dt.timezone.utc)

    @property
    def fiscal_year_end_date(self):
        return dt.datetime(self.end_year, 4, 30, 23, 59, 59, tzinfo=dt.timezone.utc)

    def is_active_in_fiscal_year(self):
        now = timezone.now()
        return self.fiscal_year_start_date <= now <= self.fiscal_year_end_date

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.end_year != self.start_year + 1:
            raise ValidationError({
                'end_year': f'End year must be {self.start_year + 1} for fiscal year {self.start_year}-{self.start_year + 1}'
            })

    def set_fiscal_year_from_start_date(self):
        start_date = self.start_date or timezone.now()
        
        if start_date.month >= 5:
            self.start_year = start_date.year
            self.end_year = start_date.year + 1
        else:
            self.start_year = start_date.year - 1
            self.end_year = start_date.year

    def save(self, *args, **kwargs):
        if not self.pk or not self.start_year or not self.end_year:
            self.set_fiscal_year_from_start_date()
        
        super().save(*args, **kwargs)
        
        if not kwargs.get('update_fields'):
            self._create_initial_instances()

    def _create_initial_instances(self):
        from .utils import create_evaluation_instances
        try:
            create_evaluation_instances(self)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create initial instances for evaluation {self.title}: {e}")

    def create_instances_for_period(self):
        from .utils import create_evaluation_instances
        create_evaluation_instances(self)

    def generate_recurring_instances(self):
        """Generate recurring evaluation instances up to current date"""
        from .utils import create_evaluation_instances
        return create_evaluation_instances(self)

    def get_next_due_date(self, last_due_date=None):
        base_date = last_due_date or self.start_date
        
        if self.duration == 'daily':
            return base_date + timedelta(days=1)
        elif self.duration == 'monthly':
            if base_date.month == 12:
                return base_date.replace(year=base_date.year + 1, month=1, day=1)
            else:
                return base_date.replace(month=base_date.month + 1, day=1)
        elif self.duration == 'quarterly':
            month = ((base_date.month - 1) // 3 + 1) * 3 + 1
            year = base_date.year
            if month > 12:
                month = 1
                year += 1
            return base_date.replace(year=year, month=month, day=1)
        elif self.duration == 'yearly':
            return base_date.replace(year=base_date.year + 1)
        
        return base_date

    def is_employee_eligible(self, employee):
        excluded_roles = [
            getattr(employee, 'wire_admin', False),
            getattr(employee, 'clinic_admin', False),
            getattr(employee, 'iad_admin', False),
            getattr(employee, 'accounting_admin', False),
            getattr(employee, 'hr_admin', False),
            getattr(employee, 'hr_manager', False),
            getattr(employee, 'mis_admin', False),
        ]
        return getattr(employee, 'active', True) and not any(excluded_roles)

    @property
    def completion_percentage(self):
        """Calculate completion percentage based on EvaluationInstance status"""
        total_instances = self.instances.count()
        if total_instances == 0:
            return 0
        
        # Count instances that are in_progress or completed
        completed_instances = self.instances.filter(
            status__in=['in_progress', 'completed']
        ).count()
        
        return round((completed_instances / total_instances) * 100)


class EvaluationInstance(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ]

    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='instances')
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='evaluation_instances')
    period_start = models.DateTimeField(help_text="Start of the evaluation period")
    period_end = models.DateTimeField(help_text="End of the evaluation period")
    due_date = models.DateTimeField(help_text="When this evaluation is due")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('evaluation', 'employee', 'period_start')
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"{self.employee.username} - {self.evaluation.title} ({self.period_start.strftime('%Y-%m-%d')} to {self.period_end.strftime('%Y-%m-%d')})"

    @property
    def is_overdue(self):
        return timezone.now() > self.due_date and self.status != 'completed'

    def update_status(self):
        if self.is_overdue and self.status not in ['completed']:
            self.status = 'overdue'
            self.save(update_fields=['status'])

    def get_or_create_employee_evaluation(self):
        employee_eval, created = EmployeeEvaluation.objects.get_or_create(
            evaluation_instance=self,
            defaults={
                'evaluation': self.evaluation,
                'employee': self.employee,
            }
        )
        return employee_eval

class EmployeeEvaluation(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    evaluation_instance = models.OneToOneField(EvaluationInstance, on_delete=models.CASCADE, null=True, blank=True, related_name='employee_evaluation')
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='employee_evaluations')
    supervisor = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='supervised_evaluations', null=True, blank=True)
    manager = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='managed_evaluations', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Evaluation.STATUS_CHOICES, default='pending')

    self_completed_at = models.DateTimeField(null=True, blank=True)

    supervisor_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Supervisor evaluation criteria
    cost_consciousness_rating = models.IntegerField(null=True, blank=True, help_text="Rating 1-5 for Cost Consciousness")
    cost_consciousness_comments = models.TextField(blank=True, help_text="Comments for Cost Consciousness")
    
    dependability_rating = models.IntegerField(null=True, blank=True, help_text="Rating 1-5 for Dependability")
    dependability_comments = models.TextField(blank=True, help_text="Comments for Dependability")
    
    communication_rating = models.IntegerField(null=True, blank=True, help_text="Rating 1-5 for Communication")
    communication_comments = models.TextField(blank=True, help_text="Comments for Communication")
    
    work_ethics_rating = models.IntegerField(null=True, blank=True, help_text="Rating 1-5 for Work Ethics")
    work_ethics_comments = models.TextField(blank=True, help_text="Comments for Work Ethics")
    
    attendance_rating = models.IntegerField(null=True, blank=True, help_text="Rating 1-5 for Attendance")
    attendance_comments = models.TextField(blank=True, help_text="Comments for Attendance")
    
    # Existing supervisor fields
    strengths = models.TextField(blank=True)
    weaknesses = models.TextField(blank=True)
    training_required = models.TextField(blank=True)
    supervisor_comments = models.TextField(blank=True)
    employee_comments = models.TextField(blank=True)

    manager_completed_at = models.DateTimeField(null=True, blank=True)
    manager_comments = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.username} - {self.evaluation.title} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        # Update status based on completion stages
        if self.self_completed_at and self.status == 'pending':
            self.status = 'supervisor_review'
        elif self.supervisor_completed_at and self.status == 'supervisor_review':
            self.status = 'manager_review'
        
        super().save(*args, **kwargs)
        
        # Update related evaluation instance status
        if self.evaluation_instance:
            if self.status in ['approved', 'disapproved']:
                self.evaluation_instance.status = 'completed'
                self.evaluation_instance.save(update_fields=['status'])
            elif self.status != 'pending':
                self.evaluation_instance.status = 'in_progress'
                self.evaluation_instance.save(update_fields=['status'])

    @property
    def average_rating(self):
        ratings = self.task_ratings.all()
        if ratings.exists():
            return sum(r.rating for r in ratings) / ratings.count()
        return 0

    @property
    def average_supervisor_rating(self):
        """Calculate average supervisor rating from task ratings"""
        ratings = self.task_ratings.filter(supervisor_rating__isnull=False)
        if ratings.exists():
            return sum(r.supervisor_rating for r in ratings) / ratings.count()
        return None

    @property
    def average_supervisor_criteria_rating(self):
        """Calculate average rating from the 5 supervisor evaluation criteria"""
        criteria_ratings = [
            self.cost_consciousness_rating,
            self.dependability_rating,
            self.communication_rating,
            self.work_ethics_rating,
            self.attendance_rating
        ]
        # Filter out None values
        valid_ratings = [r for r in criteria_ratings if r is not None]
        if valid_ratings:
            return sum(valid_ratings) / len(valid_ratings)
        return None

    @property
    def completion_percentage(self):
        """Calculate completion percentage based on evaluation stages."""
        percentage = 0
        
        if self.self_completed_at:
            percentage += 25
        
        if self.supervisor_completed_at:
            percentage += 25
        
        if self.manager_completed_at:
            percentage += 25
        
        if self.status in ['approved', 'disapproved']:
            percentage += 25
        
        return percentage


class TaskRating(models.Model):
    employee_evaluation = models.ForeignKey(EmployeeEvaluation, on_delete=models.CASCADE, related_name='task_ratings')
    task = models.ForeignKey(TaskList, on_delete=models.CASCADE)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    supervisor_rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    comments = models.TextField(blank=True)

    class Meta:
        unique_together = ('employee_evaluation', 'task')

    def __str__(self):
        supervisor_part = f" (Supervisor: {self.supervisor_rating}/5)" if self.supervisor_rating else ""
        return f"{self.task.tasklist} - {self.rating}/5{supervisor_part}"


class TrainingRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='training_requests')
    employee_evaluation = models.OneToOneField(EmployeeEvaluation, on_delete=models.CASCADE, related_name='training_request')
    training_topic = models.CharField(max_length=255)
    justification = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_training_requests')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.username} - {self.training_topic}"

    @classmethod
    def can_request_training(cls, employee):
        now = timezone.now()

        if 5 <= now.month <= 7: 
            q_start, q_end = dt.datetime(now.year, 5, 1, tzinfo=dt.timezone.utc), dt.datetime(now.year, 7, 31, tzinfo=dt.timezone.utc)
        elif 8 <= now.month <= 10:
            q_start, q_end = dt.datetime(now.year, 8, 1, tzinfo=dt.timezone.utc), dt.datetime(now.year, 10, 31, tzinfo=dt.timezone.utc)
        elif 11 <= now.month or now.month == 1:
            year = now.year if now.month != 1 else now.year - 1
            q_start, q_end = dt.datetime(year, 11, 1, tzinfo=dt.timezone.utc), dt.datetime(year + 1, 1, 31, tzinfo=dt.timezone.utc)
        else:
            q_start, q_end = dt.datetime(now.year, 2, 1, tzinfo=dt.timezone.utc), dt.datetime(now.year, 4, 30, tzinfo=dt.timezone.utc)

        existing_request = cls.objects.filter(
            employee=employee,
            created_at__gte=q_start,
            created_at__lte=q_end
        ).exists()

        return not existing_request
