from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import timedelta
from userlogin.models import EmployeeLogin
from usercalendar.models import Holiday

class SundayException(models.Model):
    date = models.DateField(unique=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sunday Exception on {self.date} - {self.description}"

    class Meta:
        ordering = ['date']

class LeaveType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True)
    go_to_clinic = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    is_deducted = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']

class LeaveReason(models.Model):
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='reasons')
    reason_text = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.leave_type.name}: {self.reason_text}"

    class Meta:
        ordering = ['leave_type', 'reason_text']

class LeaveBalance(models.Model):
    VALIDITY_STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('for_conversion', 'For Conversion'),
    ]
    
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    entitled = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    used = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    remaining = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    valid_from = models.DateField()
    valid_to = models.DateField()
    validity_status = models.CharField(max_length=20, choices=VALIDITY_STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        self.remaining = self.entitled - self.used
        
        now = timezone.now().date()
        if now > self.valid_to:
            self.validity_status = 'for_conversion'
        elif now >= self.valid_from and now <= self.valid_to:
            self.validity_status = 'active'
        else:
            self.validity_status = 'expired'
            
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type.name} ({self.valid_from} to {self.valid_to})"
    
    class Meta:
        ordering = ['-valid_from']
        unique_together = ['employee', 'leave_type', 'valid_from', 'valid_to']

class LeaveRequest(models.Model):
    STATUS_CHOICES = [
        ('routing', 'Routing'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
        ('cancelled', 'Cancelled'),
    ]
    
    control_number = models.CharField(max_length=20, unique=True, editable=False)
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    leave_reason = models.ForeignKey(LeaveReason, on_delete=models.CASCADE, null=True, blank=True)
    date_from = models.DateField()
    date_to = models.DateField()
    days_requested = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)])
    hrs_requested = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0)], default=0.0)
    reason = models.TextField()
    current_approver = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='current_approvals', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='routing')
    date_prepared = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.control_number:
            last_request = LeaveRequest.objects.order_by('-control_number').first()
            if last_request and last_request.control_number.isdigit():
                self.control_number = str(int(last_request.control_number) + 1)
            else:
                self.control_number = "1000"

        if self.date_from and self.date_to:
            working_days = self.calculate_working_days(self.date_from, self.date_to)
            self.days_requested = working_days

        super().save(*args, **kwargs)

    def calculate_working_days(self, start_date, end_date):
        working_days = 0
        current_date = start_date
        
        holidays = set(Holiday.objects.filter(
            date__range=[start_date, end_date]
        ).values_list('date', flat=True))
        
        sunday_exceptions = set(SundayException.objects.filter(
            date__range=[start_date, end_date]
        ).values_list('date', flat=True))
        
        while current_date <= end_date:
            is_holiday = current_date in holidays
            
            is_sunday = current_date.weekday() == 6
            is_sunday_exempted = current_date in sunday_exceptions
            
            if not is_holiday and (not is_sunday or is_sunday_exempted):
                working_days += 1
            
            current_date += timedelta(days=1)
        
        return working_days
    
    def __str__(self):
        return f"{self.control_number} - {self.employee.full_name}"
    
    @property
    def duration_display(self):
        if self.date_from == self.date_to:
            return self.date_from.strftime('%b %d, %Y')
        return f"{self.date_from.strftime('%b %d, %Y')} - {self.date_to.strftime('%b %d, %Y')}"
    
    class Meta:
        ordering = ['-date_prepared']


class LeaveApprovalAction(models.Model):
    ACTION_CHOICES = [
        ('updated', 'Updated'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
        ('cancelled', 'Cancelled'),
        ('forwarded', 'Forwarded'),
    ]

    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name='approval_actions')
    approver = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='approval_actions')
    sequence = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=LeaveRequest.STATUS_CHOICES, default='routing')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    comments = models.TextField(blank=True)
    action_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.leave_request.control_number} - {self.action} by {self.approver.full_name} (Seq: {self.sequence})"

    class Meta:
        ordering = ['sequence', 'created_at']
        unique_together = ['leave_request', 'approver', 'sequence', 'action']