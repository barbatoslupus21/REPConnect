from django.db import models
from userlogin.models import EmployeeLogin

class Holiday(models.Model):
    HOLIDAY_TYPES = [
        ('legal', 'Legal Holiday'),
        ('special', 'Special Holiday'),
        ('day_off', 'Day Off'),
        ('company', 'Company Holiday'),
    ]
    
    name = models.CharField(max_length=100)
    date = models.DateField()
    holiday_type = models.CharField(max_length=20, choices=HOLIDAY_TYPES)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    repetition_choices = [
        ('none', 'None'),
        ('yearly', 'Yearly'),
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
        ('daily', 'Daily'),
    ]
    repetition = models.CharField(max_length=10, choices=repetition_choices, default='none')
    
    class Meta:
        ordering = ['date']
        unique_together = ['name', 'date']
    
    def __str__(self):
        return f"{self.name} - {self.date}"

class Timelogs(models.Model):
    ENTRY_CHOICES = [
        ('timein', 'Time In'),
        ('timeout', 'Time Out'),
    ]
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE)
    time = models.DateTimeField()
    entry = models.CharField(max_length=10, choices=ENTRY_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-time']

    def __str__(self):
        return f"Timelog for {self.employee} for {self.time} - {self.entry}"

class TodoItem(models.Model):
    user = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    description = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['time']

    def __str__(self):
        return f"{self.description} ({self.date} {self.time}) - {'Done' if self.completed else 'Pending'}"