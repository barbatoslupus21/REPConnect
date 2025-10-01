from django.db import models
from userlogin.models import EmployeeLogin
from generalsettings.models import Line, Department, Position

class PersonalInformation(models.Model):
    GENDER_CHOICES = [
    ('Male', 'Male'),
    ('Female', 'Female'),
    ('Other', 'Other'),
    ]
    user = models.OneToOneField(EmployeeLogin, on_delete=models.CASCADE, related_name='personal_info')
    middle_name = models.CharField(max_length=50, blank=True, null=True)
    nickname = models.CharField(max_length=50, blank=True, null=True)
    work_email = models.EmailField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True)
    birth_date = models.DateField(null=True)
    birth_place = models.CharField(max_length=200, null=True)
    contact_number = models.CharField(max_length=20, null=True)
    contact_country_code = models.CharField(max_length=5, default='+63', null=True)

    present_block_lot = models.CharField(max_length=50, blank=True, null=True)
    present_street = models.CharField(max_length=100, blank=True, null=True)
    present_barangay = models.CharField(max_length=100, null=True)
    present_city = models.CharField(max_length=100, null=True)
    present_province = models.CharField(max_length=100, null=True)
    present_country = models.CharField(max_length=100, default='Philippines')

    provincial_block_lot = models.CharField(max_length=50, blank=True, null=True)
    provincial_street = models.CharField(max_length=100, blank=True, null=True)
    provincial_barangay = models.CharField(max_length=100, null=True)
    provincial_city = models.CharField(max_length=100, null=True)
    provincial_province = models.CharField(max_length=100, null=True)
    provincial_country = models.CharField(max_length=100, default='Philippines')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ContactPerson(models.Model):
    RELATIONSHIP_CHOICES = [
    ('Father', 'Father'),
    ('Mother', 'Mother'),
    ('Spouse', 'Spouse'),
    ('Sibling', 'Sibling'),
    ('Child', 'Child'),
    ('Friend', 'Friend'),
    ('Other', 'Other'),
    ]
    user = models.OneToOneField(EmployeeLogin, on_delete=models.CASCADE, related_name='contact_person')
    name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=20, choices=RELATIONSHIP_CHOICES)
    contact_number = models.CharField(max_length=20)
    contact_country_code = models.CharField(max_length=5, default='+63', null=True)
    address = models.TextField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class EducationalBackground(models.Model):
    EDUCATION_LEVEL_CHOICES = [
    ('Primary', 'Primary'),
    ('Secondary', 'Secondary'),
    ('Tertiary', 'Tertiary'),
    ('Vocational', 'Vocational'),
    ]
    user = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='education')
    level = models.CharField(max_length=20, choices=EDUCATION_LEVEL_CHOICES)
    school_name = models.CharField(max_length=200)
    degree_course = models.CharField(max_length=200, blank=True, null=True)
    year_graduated = models.IntegerField(blank=True, null=True)
    honors_awards = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'level']
        ordering = ['year_graduated', '-year_graduated', '-created_at']

class FamilyBackground(models.Model):
    user = models.OneToOneField(EmployeeLogin, on_delete=models.CASCADE, related_name='family_background')
    mother_name = models.CharField(max_length=100, blank=True, null=True)
    father_name = models.CharField(max_length=100, blank=True, null=True)
    spouse_name = models.CharField(max_length=100, blank=True, null=True)
    children_names = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class EmploymentInformation(models.Model):
    EMPLOYMENT_TYPE_CHOICES = [
    ('Regular', 'Regular'),
    ('Probationary', 'Probationary'),
    ('OJT', 'OJT'),
    ]
    LINE_CHOICES = [
        ('Welding 1', 'Welding 1'),
        ('Welding 2', 'Welding 2'),
        ('Assembly 1', 'Assembly 1'),
        ('Assembly 2', 'Assembly 2'),
        ('Quality Control', 'Quality Control'),
        ('Maintenance', 'Maintenance'),
        ('Office', 'Office'),
    ]

    user = models.OneToOneField(EmployeeLogin, on_delete=models.CASCADE, related_name='employment_info')
    approver = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, blank=True, null=True, related_name='supervised_employees')
    # innovator = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, blank=True, null=True, related_name='innovator_employees')
    line_leader = models.ForeignKey(EmployeeLogin, on_delete=models.SET_NULL, blank=True, null=True, related_name='line_leader_employees')
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True)
    line = models.ForeignKey(Line, on_delete=models.SET_NULL, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, blank=True, null=True)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES)
    date_hired = models.DateField(blank=True, null=True)

    tin_number = models.CharField(max_length=15, null=True)
    sss_number = models.CharField(max_length=15, null=True)
    hdmf_number = models.CharField(max_length=15, null=True)
    philhealth_number = models.CharField(max_length=15, null=True)
    bank_account = models.CharField(max_length=20, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
