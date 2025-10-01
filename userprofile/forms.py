from django import forms
from userlogin.models import EmployeeLogin
from .models import PersonalInformation, ContactPerson, EducationalBackground, FamilyBackground, EmploymentInformation, Department, Line, Position

class PersonalInformationForm(forms.ModelForm):
    first_name = forms.CharField(max_length=20, required=False)
    last_name = forms.CharField(max_length=20, required=False)
    email = forms.EmailField(required=False)
    class Meta:
        model = PersonalInformation
        fields = [
            'middle_name', 'nickname', 'work_email', 'gender', 'birth_date', 'birth_place',
            'contact_number', 'present_block_lot', 'present_street', 'present_barangay',
            'present_city', 'present_province', 'present_country',
            'provincial_block_lot', 'provincial_street', 'provincial_barangay',
            'provincial_city', 'provincial_province', 'provincial_country'
        ]
        widgets = {
            'birth_date': forms.DateInput(attrs={'type': 'date'}),
            'gender': forms.Select(attrs={'class': 'form-input'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-input'}),
            'nickname': forms.TextInput(attrs={'class': 'form-input'}),
            'work_email': forms.EmailInput(attrs={'class': 'form-input'}),
            'birth_place': forms.TextInput(attrs={'class': 'form-input'}),
            'contact_number': forms.TextInput(attrs={'class': 'form-input'}),
            'present_block_lot': forms.TextInput(attrs={'class': 'form-input'}),
            'present_street': forms.TextInput(attrs={'class': 'form-input'}),
            'present_barangay': forms.TextInput(attrs={'class': 'form-input'}),
            'present_city': forms.TextInput(attrs={'class': 'form-input'}),
            'present_province': forms.TextInput(attrs={'class': 'form-input'}),
            'present_country': forms.TextInput(attrs={'class': 'form-input'}),
            'provincial_block_lot': forms.TextInput(attrs={'class': 'form-input'}),
            'provincial_street': forms.TextInput(attrs={'class': 'form-input'}),
            'provincial_barangay': forms.TextInput(attrs={'class': 'form-input'}),
            'provincial_city': forms.TextInput(attrs={'class': 'form-input'}),
            'provincial_province': forms.TextInput(attrs={'class': 'form-input'}),
            'provincial_country': forms.TextInput(attrs={'class': 'form-input'}),
        }

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if user:
            self.fields['first_name'].initial = user.firstname
            self.fields['last_name'].initial = user.lastname
            self.fields['email'].initial = user.email
        
        for field_name, field in self.fields.items():
            if field_name not in ['first_name', 'last_name', 'email']:
                field.widget.attrs.update({'class': 'form-input'})

class ContactPersonForm(forms.ModelForm):
    class Meta:
        model = ContactPerson
        fields = [
        'name', 'relationship', 'contact_number', 'contact_country_code', 'address'
        ]
        widgets = {
        'name': forms.TextInput(attrs={'class': 'form-input'}),
        'relationship': forms.Select(attrs={'class': 'form-input'}),
        'contact_number': forms.TextInput(attrs={'class': 'form-input'}),
        'contact_country_code': forms.TextInput(attrs={'class': 'form-input'}),
        'address': forms.Textarea(attrs={'class': 'form-input', 'rows': 3}),
        }

class EducationalBackgroundForm(forms.ModelForm):
    class Meta:
        model = EducationalBackground
        fields = ['level', 'school_name', 'degree_course', 'year_graduated', 'honors_awards']
        widgets = {
        'level': forms.Select(attrs={'class': 'form-input'}),
        'school_name': forms.TextInput(attrs={'class': 'form-input'}),
        'degree_course': forms.TextInput(attrs={'class': 'form-input'}),
        'year_graduated': forms.NumberInput(attrs={'class': 'form-input'}),
        'honors_awards': forms.Textarea(attrs={'class': 'form-input', 'rows': 3}),
        }

class FamilyBackgroundForm(forms.ModelForm):
    class Meta:
        model = FamilyBackground
        fields = ['mother_name', 'father_name', 'spouse_name', 'children_names']
        widgets = {
        'mother_name': forms.TextInput(attrs={'class': 'form-input'}),
        'father_name': forms.TextInput(attrs={'class': 'form-input'}),
        'spouse_name': forms.TextInput(attrs={'class': 'form-input'}),
        'children_names': forms.Textarea(attrs={'class': 'form-input', 'rows': 3, 'placeholder': 'Enter children names, separated by commas'}),
        }

class EmploymentInformationForm(forms.ModelForm):
    class Meta:
        model = EmploymentInformation
        fields = [
        'approver', 'line_leader', 'position', 'line', 'department', 'employment_type',
        'date_hired', 'tin_number', 'sss_number', 'hdmf_number',
        'philhealth_number', 'bank_account'
        ]
        widgets = {
        'approver': forms.Select(attrs={'class': 'form-input'}),
        'line_leader': forms.Select(attrs={'class': 'form-input'}),
        'position': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        'line': forms.Select(attrs={'class': 'form-input'}),
        'department': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        'employment_type': forms.Select(attrs={'class': 'form-input', 'readonly': True}),
        'date_hired': forms.DateInput(attrs={'type': 'date', 'class': 'form-input', 'readonly': True}),
        'tin_number': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        'sss_number': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        'hdmf_number': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        'philhealth_number': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        'bank_account': forms.TextInput(attrs={'class': 'form-input', 'readonly': True}),
        }

    def __init__(self, *args, **kwargs):
        user_role = kwargs.pop('user_role', 'employee')
        super().__init__(*args, **kwargs)

        self.fields['approver'].queryset = EmployeeLogin.objects.filter(hr_admin=True)
        
        # Set line_leader queryset to all employees that can be line leaders
        # Will be filtered by JavaScript based on position.is_line_leader
        self.fields['line_leader'].queryset = EmployeeLogin.objects.all()
        self.fields['line_leader'].required = False

        if user_role == 'employee':
            readonly_fields = ['position', 'department', 'employment_type', 'date_hired',
                            'tin_number', 'sss_number', 'hdmf_number', 'philhealth_number', 'bank_account']
            for field in readonly_fields:
                self.fields[field].widget.attrs['readonly'] = True
        elif user_role == 'admin':
            for field_name, field in self.fields.items():
                if 'readonly' in field.widget.attrs:
                    del field.widget.attrs['readonly']
                    
    def clean_line_leader(self):
        line_leader = self.cleaned_data.get('line_leader')
        # Allow empty line leader
        if not line_leader:
            return None
        return line_leader

class CreateEmployeeForm(forms.ModelForm):
    department = forms.ModelChoiceField(queryset=Department.objects.all().order_by('department_name'), widget=forms.Select(attrs={'class': 'form-input'}), required=True)
    line = forms.ModelChoiceField(queryset=Line.objects.none(), widget=forms.Select(attrs={'class': 'form-input'}), required=False)
    position = forms.ModelChoiceField(queryset=Position.objects.all().order_by('position'), widget=forms.Select(attrs={'class': 'form-input'}), required=True)
    employment_type = forms.ChoiceField(
        choices=EmploymentInformation.EMPLOYMENT_TYPE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-input'})
    )
    date_hired = forms.DateField(widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-input'}))
    tin_number = forms.CharField(max_length=15, required=False, widget=forms.TextInput(attrs={'class': 'form-input'}))
    sss_number = forms.CharField(max_length=15, required=False, widget=forms.TextInput(attrs={'class': 'form-input'}))
    hdmf_number = forms.CharField(max_length=15, required=False, widget=forms.TextInput(attrs={'class': 'form-input'}))
    philhealth_number = forms.CharField(max_length=15, required=False, widget=forms.TextInput(attrs={'class': 'form-input'}))
    bank_account = forms.CharField(max_length=20, required=False, widget=forms.TextInput(attrs={'class': 'form-input'}))

    class Meta:
        model = EmployeeLogin
        fields = ['idnumber', 'firstname', 'lastname', 'email']
        widgets = {
            'idnumber': forms.TextInput(attrs={'class': 'form-input'}),
            'firstname': forms.TextInput(attrs={'class': 'form-input'}),
            'lastname': forms.TextInput(attrs={'class': 'form-input'}),
            'email': forms.EmailInput(attrs={'class': 'form-input'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'department' in self.data:
            try:
                department_id = int(self.data.get('department'))
                self.fields['line'].queryset = Department.objects.get(id=department_id).lines.all().order_by('line_name')
            except (ValueError, TypeError, Department.DoesNotExist):
                self.fields['line'].queryset = Line.objects.none()
        elif self.instance.pk and self.instance.employment_info.department:
            self.fields['line'].queryset = self.instance.employment_info.department.lines.all().order_by('line_name')
        else:
            self.fields['line'].queryset = Line.objects.none()