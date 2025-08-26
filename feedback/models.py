from django.db import models
from userlogin.models import EmployeeLogin

class Feedback(models.Model):
    submitter = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(default=False)
    admin_notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'

    def __str__(self):
        if self.is_anonymous:
            return f"Anonymous - {self.subject} ({self.created_at.strftime('%Y-%m-%d')})"
        elif self.submitter:
            return f"{self.submitter.full_name} - {self.subject} ({self.created_at.strftime('%Y-%m-%d')})"
        else:
            return f"Unknown - {self.subject} ({self.created_at.strftime('%Y-%m-%d')})"

    @property
    def display_name(self):
        if self.is_anonymous:
            return "Anonymous"
        elif self.submitter:
            return self.submitter.full_name
        else:
            return "Unknown"

    @property
    def display_email(self):
        if self.is_anonymous:
            return "N/A"
        elif self.submitter:
            return self.submitter.email
        else:
            return "N/A"