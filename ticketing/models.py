from django.db import models
from django.utils import timezone
from userlogin.models import EmployeeLogin
from django.db.models import Max

class DeviceType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

class TicketCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Ticket Categories'

class Device(models.Model):
    user = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='devices')
    device_name = models.CharField(max_length=200)
    device_code = models.CharField(max_length=100, unique=True)
    device_model = models.CharField(max_length=200, null=True)
    device_brand = models.CharField(max_length=200, null=True)
    device_location = models.CharField(max_length=200)
    device_type = models.ForeignKey(DeviceType, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.device_name} ({self.device_code})"

    class Meta:
        ordering = ['-created_at']

class Ticket(models.Model):
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    ]

    STATUS_CHOICES = [
        ('Processing', 'Processing'),
        ('Approved', 'Approved'),
        ('Disapproved', 'Disapproved'),
        ('Cancelled', 'Cancelled'),
    ]

    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    requestor = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='tickets')
    requestor_name = models.CharField(max_length=200)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True)
    priority_level = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    category = models.ForeignKey(TicketCategory, on_delete=models.SET_NULL, null=True, blank=True)
    problem_details = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Processing')
    
    technician_name = models.CharField(max_length=200, blank=True, null=True)
    diagnosis = models.TextField(blank=True, null=True)
    action_taken = models.TextField(blank=True, null=True)
    possible_reason = models.TextField(blank=True, null=True)
    recommendation = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_tickets')
    reviewed_at = models.DateTimeField(null=True, blank=True)  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        super().save(*args, **kwargs)

    def generate_ticket_number(self):
        prefix = 'TKT'
        date_str = timezone.now().strftime('%Y%m%d')
        
        last_ticket = Ticket.objects.filter(ticket_number__startswith=f"{prefix}{date_str}") \
                                    .aggregate(max_seq=Max('ticket_number'))
        
        if last_ticket['max_seq']:
            last_seq = int(last_ticket['max_seq'][-4:])
            new_seq = last_seq + 1
        else:
            new_seq = 1

        return f"{prefix}{date_str}{new_seq:04d}"

    def __str__(self):
        return f"{self.ticket_number} - {self.requestor_name}"

    class Meta:
        ordering = ['-created_at']