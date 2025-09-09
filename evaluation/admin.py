from django.contrib import admin
from .models import TaskList, Evaluation, EmployeeEvaluation, TaskRating, TrainingRequest
from .models import EvaluationInstance

@admin.register(TaskList)
class TaskListAdmin(admin.ModelAdmin):
    list_display = ['employee', 'tasklist', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['employee__username', 'employee__firstname', 'employee__lastname', 'employee__email', 'tasklist']
    ordering = ['employee__username', 'tasklist']
    autocomplete_fields = ['employee']

@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ['title', 'duration', 'created_by', 'is_active', 'created_at', 'completion_percentage']
    list_filter = ['duration', 'is_active', 'created_at']
    search_fields = ['title', 'created_by__username']
    ordering = ['-created_at']
    autocomplete_fields = ['created_by']
    
    def completion_percentage(self, obj):
        # Calculate average completion percentage across EmployeeEvaluation records
        ev_qs = EmployeeEvaluation.objects.filter(evaluation=obj)
        total = ev_qs.count()
        if total == 0:
            return "0%"
        avg = sum(ev.completion_percentage for ev in ev_qs) / total
        return f"{round(avg, 1)}%"
    completion_percentage.short_description = "Completion %"

class TaskRatingInline(admin.TabularInline):
    model = TaskRating
    extra = 0
    readonly_fields = ['task', 'rating', 'comments']

@admin.register(EmployeeEvaluation)
class EmployeeEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'evaluation', 'status', 'average_rating', 
        'self_completed_at', 'supervisor_completed_at', 'manager_completed_at'
    ]
    list_filter = ['status', 'evaluation', 'created_at']
    search_fields = [
        'employee__username', 'employee__firstname', 'employee__lastname',
        'evaluation__title'
    ]
    ordering = ['-created_at']
    inlines = [TaskRatingInline]
    autocomplete_fields = ['employee', 'supervisor', 'manager', 'evaluation']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('evaluation', 'employee', 'supervisor', 'manager', 'status')
        }),
        ('Self-Evaluation', {
            'fields': ('self_completed_at',)
        }),
        ('Supervisor Evaluation', {
            'fields': (
                'supervisor_completed_at', 'strengths', 'weaknesses',
                'training_required', 'supervisor_comments', 'employee_comments'
            )
        }),
        ('Manager Approval', {
            'fields': ('manager_completed_at', 'manager_comments')
        }),
    )
    
    def average_rating(self, obj):
        avg = obj.average_rating
        return f"{avg:.1f}" if avg else "N/A"
    average_rating.short_description = "Avg Rating"

@admin.register(TaskRating)
class TaskRatingAdmin(admin.ModelAdmin):
    list_display = ['employee_evaluation', 'task', 'rating', 'get_employee']
    list_filter = ['rating', 'employee_evaluation__evaluation']
    search_fields = [
        'employee_evaluation__employee__username',
        'task__task_name'
    ]
    ordering = ['-employee_evaluation__created_at']
    autocomplete_fields = ['employee_evaluation', 'task']
    
    def get_employee(self, obj):
        return obj.employee_evaluation.employee.username
    get_employee.short_description = "Employee"

@admin.register(TrainingRequest)
class TrainingRequestAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'training_topic', 'status', 'approved_by', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = [
        'employee__username', 'employee__firstname', 'employee__lastname',
        'training_topic'
    ]
    ordering = ['-created_at']
    autocomplete_fields = ['employee', 'approved_by', 'employee_evaluation']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('employee', 'employee_evaluation', 'training_topic', 'justification')
        }),
        ('Approval Information', {
            'fields': ('status', 'approved_by', 'approved_at')
        }),
    )
    
    readonly_fields = ['created_at']


@admin.register(EvaluationInstance)
class EvaluationInstanceAdmin(admin.ModelAdmin):
    list_display = ['evaluation', 'employee', 'period_start', 'period_end', 'due_date', 'status']
    list_filter = ['status', 'evaluation', 'due_date', 'created_at']
    search_fields = ['employee__username', 'employee__firstname', 'employee__lastname', 'evaluation__title']
    ordering = ['-due_date', '-created_at']
    date_hierarchy = 'due_date'
    autocomplete_fields = ['evaluation', 'employee']

    fieldsets = (
        ('Basic', {
            'fields': ('evaluation', 'employee', 'status')
        }),
        ('Period', {
            'fields': ('period_start', 'period_end', 'due_date')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    readonly_fields = ['created_at', 'updated_at']