from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponseRedirect
from .models import Payslip, Loan, Allowance, OJTPayslipData, LoanType, AllowanceType, LoanDeduction, Savings, OJTRate, SavingsType
from .forms import LoanForm, LoanTypeForm, LoanDeductionForm, SavingsForm

@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ['employee', 'cutoff_date', 'date_uploaded', 'uploaded_by']
    list_filter = ['date_uploaded', 'cutoff_date']
    search_fields = ['employee']
    date_hierarchy = 'cutoff_date'
    list_per_page = 25

    fieldsets = (
        ('Employee Information', {
            'fields': ('employee',)
        }),
        ('Payroll Period', {
            'fields': ('cutoff_date',) 
        }),
        ('File', {
            'fields': ('file_path',)
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'date_uploaded'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['date_uploaded']

@admin.register(Allowance)
class AllowanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'allowance_type', 'amount', 'deposit_date', 'period_covered', 'created_at']
    list_filter = ['allowance_type', 'deposit_date']
    search_fields = ['employee']
    date_hierarchy = 'deposit_date'
    list_per_page = 25

    fieldsets = (
        ('Employee Information', {
            'fields': ('employee',)
        }),
        ('Allowance Details', {
            'fields': ('allowance_type', 'amount')
        }),
        ('Deposit Info', {
            'fields': ('deposit_date', 'period_covered'),
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ['created_at']


@admin.register(OJTPayslipData)
class OJTPayslipDataAdmin(admin.ModelAdmin):
    list_display = ['employee', 'cut_off', 'regular_day', 'allowance_day', 'grand_total', 'net_ojt_share', 'created_at']
    list_filter = ['created_at', 'cut_off']
    search_fields = ['employee']
    date_hierarchy = 'created_at'
    list_per_page = 25

    fieldsets = [
        ('Employee & Cutoff Info', {
            'fields': ['employee', 'cut_off']
        }),
        ('Daily Allowances', {
            'fields': [
                'regular_day',
                'allowance_day',
                'total_allowance',
                'nd_allowance'
            ]
        }),
        ('Basic Share Breakdown', {
            'fields': [
                'basic_school_share',
                'basic_ojt_share',
                'deduction',
                'net_ojt_share'
            ]
        }),
        ('Additional Allowances', {
            'fields': [
                'rice_allowance',
                'ot_allowance',
                'nd_ot_allowance',
                'special_holiday',
                'legal_holiday',
                'satoff_allowance',
                'rd_ot',
                'ot_pay_allowance',
                'total_allow'
            ]
        }),
        ('Other Details', {
            'fields': [
                'holiday_hours',
                'rd_ot_days',
                'perfect_attendance',
                'adjustment',
                'deduction_2'
            ]
        }),
        ('Timestamp', {
            'fields': ['created_at']
        }),
    ]

    readonly_fields = ['created_at']

@admin.register(LoanType)
class LoanTypeAdmin(admin.ModelAdmin):
    form = LoanTypeForm
    list_display = ['loan_type', 'is_stackable', 'active_loans_count', 'total_balance', 'created_at']
    list_filter = ['is_stackable', 'created_at']
    search_fields = ['loan_type', 'description']
    ordering = ['loan_type']

    def active_loans_count(self, obj):
        return obj.loan_types.filter(is_active=True).count()
    active_loans_count.short_description = 'Active Loans'

    def total_balance(self, obj):
        total = sum(loan.current_balance for loan in obj.loan_types.filter(is_active=True))
        return f"₱{float(total):,.2f}"

class LoanDeductionInline(admin.TabularInline):
    model = LoanDeduction
    form = LoanDeductionForm
    extra = 0
    readonly_fields = ['balance_before', 'balance_after', 'created_at']
    ordering = ['-created_at']

@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    form = LoanForm
    list_display = ['employee_name', 'loan_type', 'principal_amount', 'current_balance', 'balance_percentage', 'monthly_deduction', 'status', 'created_at']
    list_filter = ['loan_type', 'is_active', 'created_at', 'loan_type__is_stackable']
    search_fields = ['employee__firstname', 'employee__lastname', 'employee__idnumber', 'employee__username']
    readonly_fields = ['current_balance', 'created_at', 'updated_at']
    inlines = [LoanDeductionInline]
    ordering = ['-created_at']

    fieldsets = (
        ('Loan Information', {
            'fields': ('employee', 'loan_type', 'principal_amount', 'current_balance', 'monthly_deduction')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def employee_name(self, obj):
        emp = obj.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name:
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        return display_name
    employee_name.short_description = 'Employee'

    def balance_percentage(self, obj):
        if obj.principal_amount > 0:
            percentage = (obj.current_balance / obj.principal_amount) * 100
            color = 'green' if percentage > 50 else 'orange' if percentage > 25 else 'red'
            formatted_percentage = "{:.1f}%".format(percentage)
            return format_html('<span style="color: {};">{}</span>', color, formatted_percentage)
        return format_html('<span style="color: gray;">0%</span>')

    def status(self, obj):
        if obj.current_balance <= 0:
            return format_html('<span style="color: green; font-weight: bold;">Paid</span>')
        elif obj.is_active:
            return format_html('<span style="color: blue;">Active</span>')
        else:
            return format_html('<span style="color: gray;">Inactive</span>')
    status.short_description = 'Status'

    actions = ['mark_as_paid', 'reactivate_loans']

    def mark_as_paid(self, request, queryset):
        updated = queryset.update(current_balance=0, is_active=False)
        self.message_user(request, f'{updated} loans marked as paid.')
    mark_as_paid.short_description = 'Mark selected loans as paid'

    def reactivate_loans(self, request, queryset):
        updated = queryset.filter(current_balance__gt=0).update(is_active=True)
        self.message_user(request, f'{updated} loans reactivated.')
    reactivate_loans.short_description = 'Reactivate selected loans'

@admin.register(LoanDeduction)
class LoanDeductionAdmin(admin.ModelAdmin):
    form = LoanDeductionForm
    list_display = ['employee_name', 'loan_type', 'cut_off', 'amount', 'balance_before', 'balance_after', 'created_at']
    list_filter = ['cut_off', 'loan__loan_type', 'created_at']
    search_fields = ['loan__employee__firstname', 'loan__employee__lastname', 'loan__employee__idnumber', 'cut_off']
    readonly_fields = ['balance_before', 'balance_after', 'created_at']
    ordering = ['-created_at']

    def employee_name(self, obj):
        emp = obj.loan.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name:
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        return display_name
    employee_name.short_description = 'Employee'

    def loan_type(self, obj):
        return obj.loan.loan_type.loan_type
    loan_type.short_description = 'Loan Type'

    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing existing object
            return self.readonly_fields + ['loan', 'amount', 'cut_off']
        return self.readonly_fields

admin.site.register(AllowanceType)


@admin.register(SavingsType)
class SavingsTypeAdmin(admin.ModelAdmin):
    list_display = ['savings_type', 'description', 'icon', 'color', 'created_at']
    search_fields = ['savings_type', 'description']
    list_per_page = 25


@admin.register(Savings)
class SavingsAdmin(admin.ModelAdmin):
    form = SavingsForm
    list_display = ['employee_name', 'savings_type', 'amount', 'current_balance', 'deposit_date', 'is_withdrawn', 'withdrawal_date', 'created_at']
    list_filter = ['savings_type', 'is_withdrawn', 'deposit_date', 'withdrawal_date', 'created_at']
    search_fields = ['employee__firstname', 'employee__lastname', 'employee__idnumber']
    readonly_fields = ['withdrawal_date', 'created_at', 'updated_at', 'current_balance']
    ordering = ['-created_at']
    actions = ['withdraw_savings', 'bulk_import_savings']

    fieldsets = (
        ('Employee Information', {
            'fields': ('employee',)
        }),
        ('Savings Details', {
            'fields': ('savings_type', 'amount', 'deposit_date')
        }),
        ('Status', {
            'fields': ('is_withdrawn', 'withdrawal_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def employee_name(self, obj):
        emp = obj.employee
        display_name = f"{getattr(emp, 'firstname', '')} {getattr(emp, 'lastname', '')}".strip()
        if not display_name:
            display_name = getattr(emp, 'username', None) or getattr(emp, 'idnumber', None) or str(emp.pk)
        return display_name
    employee_name.short_description = 'Employee'

    def current_balance(self, obj):
        # Get the balance and ensure it's a proper numeric value
        try:
            # Handle various possible types (Decimal, float, int, SafeString, etc.)
            balance = obj.current_balance
            if hasattr(balance, '__str__'):
                # If it's a SafeString or similar, convert to string first, then to float
                balance_float = float(str(balance))
            else:
                balance_float = float(balance)
        except (ValueError, TypeError, AttributeError):
            balance_float = 0.0
        
        # Format the balance as a string first, then use format_html safely
        formatted_amount = f"₱{balance_float:.2f}"
        
        if getattr(obj, 'is_withdrawn', False):
            return format_html('<span style="color: red;">{} (Withdrawn)</span>', formatted_amount)
        else:
            return format_html('<span style="color: green;">{}</span>', formatted_amount)
    current_balance.short_description = 'Current Balance'

    def withdraw_savings(self, request, queryset):
        """Admin action to withdraw selected savings"""
        withdrawn_count = 0
        for savings in queryset:
            if savings.withdraw():
                withdrawn_count += 1
        
        if withdrawn_count:
            self.message_user(request, f"Successfully withdrew {withdrawn_count} savings entries.")
        else:
            self.message_user(request, "No savings were withdrawn (already withdrawn or no balance).", level='warning')
    
    withdraw_savings.short_description = "Withdraw selected savings"

    def get_readonly_fields(self, request, obj=None):
        readonly = list(self.readonly_fields)
        if obj and obj.is_withdrawn:
            # If savings is already withdrawn, make most fields readonly
            readonly.extend(['employee', 'amount', 'deposit_date', 'is_withdrawn'])
        return readonly

    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of withdrawn savings
        if obj and obj.is_withdrawn:
            return False
        return super().has_delete_permission(request, obj)

@admin.register(OJTRate)
class OJTRateAdmin(admin.ModelAdmin):
    list_display = (
        'site',
        'reg_nd_rate',
        'reg_nd_ot_rate',
        'reg_ot_rate',
        'rest_ot_rate',
        'legal_rate',
        'sat_off_rate',
        'created_at',
        'updated_at',
    )
    search_fields = ('site',)
    list_filter = ('site',)
    ordering = ('-created_at',)
