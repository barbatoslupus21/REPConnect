from django.db import models
from django.core.files.storage import default_storage
from userlogin.models import EmployeeLogin

class Certificate(models.Model):
    employee = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='certificates')
    title = models.CharField(max_length=200, blank=True)
    certificate_file = models.FileField(upload_to='certificates/')
    uploaded_by = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='uploaded_certificates')
    is_seen = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.username} - {self.title or 'Certificate'}"

    def delete(self, *args, **kwargs):
        """
        Delete the certificate and its associated file from storage.
        This ensures that when a certificate is deleted from the database,
        the physical file is also removed from the file system.
        """
        if self.certificate_file:
            if default_storage.exists(self.certificate_file.name):
                default_storage.delete(self.certificate_file.name)
        super().delete(*args, **kwargs)

    @property
    def file_extension(self):
        return self.certificate_file.name.split('.')[-1].lower()

    @property
    def is_image(self):
        return self.file_extension in ['jpg', 'jpeg', 'png']

    @property
    def is_pdf(self):
        return self.file_extension == 'pdf'