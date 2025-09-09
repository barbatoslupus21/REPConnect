from django.contrib import admin
from .models import Training, TrainingEvaluation, EvaluationRouting

@admin.register(Training)
class TrainingAdmin(admin.ModelAdmin):
    list_display = ['title', 'speaker', 'training_date', 'progress_percentage', 'is_active']
    list_filter = ['training_date']
    search_fields = ['title', 'speaker']
    filter_horizontal = ['participants']
    readonly_fields = ['progress_percentage', 'is_active']

@admin.register(TrainingEvaluation)
class TrainingEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        'participant', 'training', 'status', 'is_submitted', 
        'submitted_at', 'created_at'
    ]
    list_filter = ['status', 'is_submitted', 'training', 'submitted_at']
    search_fields = [
        'participant__username', 'participant__first_name', 
        'participant__last_name', 'training__title'
    ]
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['training', 'participant']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('training', 'participant', 'status', 'is_submitted', 'submitted_at')
        }),
        ('Content Evaluation', {
            'fields': (
                'content_related_to_job', 'content_explained_clearly', 
                'content_suitable_for_topic'
            )
        }),
        ('Program Organization', {
            'fields': (
                'program_clear_goals', 'program_met_goals', 
                'program_easy_to_follow', 'program_easy_to_understand'
            )
        }),
        ('Speaker Effectiveness', {
            'fields': (
                'speaker_knowledge', 'speaker_clear_communication', 
                'speaker_answered_questions'
            )
        }),
        ('Training Environment & Resources', {
            'fields': (
                'training_organization', 'suitable_facilities', 
                'helpful_materials'
            )
        }),
        ('Open-ended Feedback', {
            'fields': (
                'most_interesting_topic', 'feedback_recommendations', 
                'future_training_topics'
            )
        }),
        ('Application to Work', {
            'fields': (
                'new_things_learned_work', 'how_apply_at_work',
                'target_implementation_date', 'actual_implementation_date'
            )
        }),
        ('Application to Self', {
            'fields': (
                'new_things_learned_personal', 'how_apply_daily_life'
            )
        }),
        ('Supervisor Assessment (Internal Only)', {
            'fields': (
                'result_and_impact', 'recommendations', 'overall_assessment', 'approver_by_manager'
            ),
            'classes': ['collapse']
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['collapse']
        })
    )

@admin.register(EvaluationRouting)
class EvaluationRoutingAdmin(admin.ModelAdmin):
    list_display = [
        'evaluation', 'approver', 'sequence', 'is_completed', 'completed_at', 'created_at'
    ]
    list_filter = ['is_completed', 'sequence', 'created_at', 'completed_at']
    search_fields = [
        'evaluation__participant__username', 'approver__username',
        'evaluation__training__title'
    ]
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['evaluation', 'approver']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('evaluation', 'approver', 'sequence')
        }),
        ('Status', {
            'fields': ('is_completed', 'completed_at', 'comments')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['collapse']
        })
    )