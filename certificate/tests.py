from django.test import TestCase
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
import tempfile
import os

from .models import Certificate
from userlogin.models import EmployeeLogin

class CertificateModelTest(TestCase):
    def setUp(self):
        self.employee = EmployeeLogin.objects.create(
            username='testuser',
            firstname='Test',
            lastname='User',
            email='test@example.com',
            idnumber='12345'
        )
        self.admin_user = EmployeeLogin.objects.create(
            username='admin',
            firstname='Admin',
            lastname='User',
            email='admin@example.com',
            idnumber='67890',
            hr_admin=True
        )

    def test_certificate_creation(self):
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Test Certificate',
            uploaded_by=self.admin_user
        )
        self.assertEqual(certificate.employee, self.employee)
        self.assertEqual(certificate.title, 'Test Certificate')
        self.assertEqual(certificate.uploaded_by, self.admin_user)

    def test_certificate_file_deletion_on_model_delete(self):
        test_content = b'Test certificate content'
        test_file = ContentFile(test_content, name='test_certificate.pdf')
        
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Test Certificate',
            certificate_file=test_file,
            uploaded_by=self.admin_user
        )
        
        file_path = certificate.certificate_file.name
        self.assertTrue(default_storage.exists(file_path))
        
        certificate.delete()
        self.assertFalse(default_storage.exists(file_path))

    def test_certificate_file_deletion_without_file(self):
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Test Certificate',
            uploaded_by=self.admin_user
        )
        
        certificate.delete()
        self.assertFalse(Certificate.objects.filter(id=certificate.id).exists())

    def test_certificate_properties(self):
        pdf_content = b'%PDF-1.4\nTest PDF content'
        pdf_file = ContentFile(pdf_content, name='test.pdf')
        
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='PDF Certificate',
            certificate_file=pdf_file,
            uploaded_by=self.admin_user
        )
        
        self.assertEqual(certificate.file_extension, 'pdf')
        self.assertTrue(certificate.is_pdf)
        self.assertFalse(certificate.is_image)

    def test_image_certificate_properties(self):
        image_content = b'fake image content'
        image_file = ContentFile(image_content, name='test.jpg')
        
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Image Certificate',
            certificate_file=image_file,
            uploaded_by=self.admin_user
        )
        
        self.assertEqual(certificate.file_extension, 'jpg')
        self.assertTrue(certificate.is_image)
        self.assertFalse(certificate.is_pdf)

class CertificateViewsTest(TestCase):
    def setUp(self):
        self.employee = EmployeeLogin.objects.create(
            username='testuser',
            firstname='Test',
            lastname='User',
            email='test@example.com',
            idnumber='12345'
        )
        self.admin_user = EmployeeLogin.objects.create(
            username='admin',
            firstname='Admin',
            lastname='User',
            email='admin@example.com',
            idnumber='67890',
            hr_admin=True
        )
        
        test_content = b'Test certificate content'
        self.test_file = SimpleUploadedFile(
            'test_certificate.pdf',
            test_content,
            content_type='application/pdf'
        )

    def test_delete_certificate_view(self):
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Test Certificate',
            certificate_file=self.test_file,
            uploaded_by=self.admin_user
        )
        
        file_path = certificate.certificate_file.name
        self.assertTrue(default_storage.exists(file_path))
        
        self.client.force_login(self.admin_user)
        response = self.client.post(
            reverse('delete', kwargs={'certificate_id': certificate.id})
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Certificate.objects.filter(id=certificate.id).exists())
        self.assertFalse(default_storage.exists(file_path))

    def test_delete_certificate_unauthorized(self):
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Test Certificate',
            certificate_file=self.test_file,
            uploaded_by=self.admin_user
        )
        
        self.client.force_login(self.employee)
        response = self.client.post(
            reverse('delete', kwargs={'certificate_id': certificate.id})
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Certificate.objects.filter(id=certificate.id).exists())

    def test_replace_certificate_view(self):
        certificate = Certificate.objects.create(
            employee=self.employee,
            title='Test Certificate',
            certificate_file=self.test_file,
            uploaded_by=self.admin_user
        )
        
        old_file_path = certificate.certificate_file.name
        self.assertTrue(default_storage.exists(old_file_path))
        
        new_content = b'New certificate content'
        new_file = SimpleUploadedFile(
            'new_certificate.pdf',
            new_content,
            content_type='application/pdf'
        )
        
        self.client.force_login(self.admin_user)
        response = self.client.post(
            reverse('replace', kwargs={'certificate_id': certificate.id}),
            {'certificate_file': new_file}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertFalse(default_storage.exists(old_file_path))
        
        certificate.refresh_from_db()
        self.assertTrue(default_storage.exists(certificate.certificate_file.name))
