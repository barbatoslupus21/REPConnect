from django.db import models
from django.contrib.auth.models import AbstractUser

class EmployeeLogin(AbstractUser):
    STATUS_TYPE = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('disapproved', 'Disapproved'),
    ]
    
    avatar = models.ImageField(upload_to='profile/', null=True, blank=True, default='profile/avatar.svg') 
    idnumber = models.CharField(max_length=10, null=True, unique=True, )
    username = models.CharField(max_length=20, null=True)
    firstname = models.CharField(max_length=20, null=True)
    lastname = models.CharField(max_length=20, null=True)
    email = models.EmailField(blank=True)
    active = models.BooleanField(default=True)
    locked = models.BooleanField(default=False)
    wire_admin = models.BooleanField(default=False)
    clinic_admin = models.BooleanField(default=False)
    iad_admin = models.BooleanField(default=False)
    accounting_admin = models.BooleanField(default=False)
    hr_admin = models.BooleanField(default=False)
    hr_manager = models.BooleanField(default=False)
    mis_admin = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_TYPE, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'idnumber'
    REQUIRED_FIELDS = []

    def save(self, *args, **kwargs):
        if not self.avatar:
            self.avatar = 'profile/avatar.svg'
        self.is_active = self.active and not self.locked
        super().save(*args, **kwargs)
    
    @property
    def full_name(self):
        """Return the full name of the employee, with fallbacks"""
        full_name = f"{self.firstname or ''} {self.lastname or ''}".strip()
        if not full_name:
            return self.username or self.idnumber or f"Employee {self.id}"
        return full_name

