from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from userlogin.models import EmployeeLogin

class LeaveType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField(blank=True)
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
    date_from = models.DateField()
    date_to = models.DateField()
    days_requested = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0.5)])
    reason = models.TextField()
    attachment = models.FileField(upload_to='leave_attachments/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='routing')
    date_prepared = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    
    def save(self, *args, **kwargs):
        if not self.control_number:
            year = timezone.now().year
            count = LeaveRequest.objects.filter(date_prepared__year=year).count() + 1
            self.control_number = f"LV-{year}-{count:03d}"
        
        if self.date_from and self.date_to:
            delta = self.date_to - self.date_from
            self.days_requested = delta.days + 1
            
        super().save(*args, **kwargs)
    
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