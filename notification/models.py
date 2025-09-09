from django.db import models
from userlogin.models import EmployeeLogin

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
        ('general', 'General'),
        ('announcement', 'Announcement'),
        ('approval', 'For Approval')
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='general')
    sender = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='sent_notifications')
    recipient = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='received_notifications')
    is_read = models.BooleanField(default=False)
    module = models.CharField(max_length=20, default='overview')
    created_at = models.DateTimeField(auto_now_add=True)
    for_all = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.recipient.username}"
