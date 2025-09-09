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
    start_year = models.IntegerField(default=2025, help_text="Fiscal year start (e.g., 2025 for FY2025-26)")
    end_year = models.IntegerField(default=2026, help_text="Fiscal year end (e.g., 2026 for FY2025-26)")
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
        """Return formatted fiscal year label like 'FY2025-26'"""
        return f"FY{self.start_year}-{str(self.end_year)[2:]}"

    @property
    def fiscal_year_start_date(self):
        """Return the actual start date of the fiscal year (May 1st)"""
        return dt.datetime(self.start_year, 5, 1, tzinfo=dt.timezone.utc)

    @property
    def fiscal_year_end_date(self):
        """Return the actual end date of the fiscal year (April 30th)"""
        return dt.datetime(self.end_year, 4, 30, 23, 59, 59, tzinfo=dt.timezone.utc)

    def is_active_in_fiscal_year(self):
        """Check if evaluation is currently active within its fiscal year"""
        now = timezone.now()
        return self.fiscal_year_start_date <= now <= self.fiscal_year_end_date

    def clean(self):
        """Validate that end_year is exactly start_year + 1 for fiscal year"""
        from django.core.exceptions import ValidationError
        if self.end_year != self.start_year + 1:
            raise ValidationError({
                'end_year': f'End year must be {self.start_year + 1} for fiscal year {self.start_year}-{self.start_year + 1}'
            })

    def get_next_evaluation_date(self, employee):
        """Calculate next due date based on duration."""
        last_submission = EmployeeEvaluation.objects.filter(
            evaluation=self,
            employee=employee
        ).order_by('-created_at').first()

        base_date = last_submission.created_at if last_submission else self.start_date

        if self.duration == 'daily':
            return base_date + timedelta(days=1)

        elif self.duration == 'monthly':
            next_month = (base_date.replace(day=1) + timedelta(days=32)).replace(day=1)
            return next_month

        elif self.duration == 'quarterly':
            month = ((base_date.month - 1) // 3 + 1) * 3 + 1
            year = base_date.year
            if month > 12:
                month = 1
                year += 1
            return dt.datetime(year, month, 1, tzinfo=dt.timezone.utc)

        elif self.duration == 'yearly':
            return base_date.replace(year=base_date.year + 1)

    def is_due_for_employee(self, employee):
        next_date = self.get_next_evaluation_date(employee)
        return timezone.now() >= next_date

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


class EmployeeEvaluation(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='employee_evaluations')
    supervisor = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='supervised_evaluations', null=True, blank=True)
    manager = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='managed_evaluations', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Evaluation.STATUS_CHOICES, default='pending')

    self_completed_at = models.DateTimeField(null=True, blank=True)

    supervisor_completed_at = models.DateTimeField(null=True, blank=True)
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
        unique_together = ('evaluation', 'employee')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.username} - {self.evaluation.title} ({self.get_status_display()})"

    @property
    def average_rating(self):
        ratings = self.task_ratings.all()
        if ratings.exists():
            return sum(r.rating for r in ratings) / ratings.count()
        return 0

    @property
    def completion_percentage(self):
        """Calculate completion percentage based on evaluation stages."""
        percentage = 0
        
        # Self-evaluation completed
        if self.self_completed_at:
            percentage += 25
        
        # Supervisor review completed
        if self.supervisor_completed_at:
            percentage += 25
        
        # Manager review completed
        if self.manager_completed_at:
            percentage += 25
        
        # Final approval
        if self.status in ['approved', 'disapproved']:
            percentage += 25
        
        return percentage


class TaskRating(models.Model):
    employee_evaluation = models.ForeignKey(EmployeeEvaluation, on_delete=models.CASCADE, related_name='task_ratings')
    task = models.ForeignKey(TaskList, on_delete=models.CASCADE)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comments = models.TextField(blank=True)

    class Meta:
        unique_together = ('employee_evaluation', 'task')

    def __str__(self):
        return f"{self.task.tasklist} - {self.rating}/5"


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
