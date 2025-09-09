from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    Survey, Question, SurveyResponse, Answer, 
    SurveyTemplate, SurveyCategory, SurveyDraft, SurveyAnalytics
)

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ('question_text', 'question_type', 'required', 'order')
    ordering = ['order']

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'category', 'created_by', 'status', 'visibility', 
        'response_count', 'completion_rate', 'created_at', 'deadline'
    ]
    list_filter = ['status', 'visibility', 'category', 'created_at']
    search_fields = ['title', 'description', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['selected_users']
    inlines = [QuestionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'template')
        }),
        ('Settings', {
            'fields': ('status', 'visibility', 'selected_users', 'deadline')
        }),
        ('Options', {
            'fields': (
                'allow_multiple_responses', 'anonymous_responses',
                'randomize_questions', 'show_progress', 'auto_save'
            ),
            'classes': ['collapse']
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ['collapse']
        })
    )
    
    def response_count(self, obj):
        count = obj.responses.filter(is_complete=True).count()
        url = reverse('admin:survey_surveyresponse_changelist')
        return format_html(
            '<a href="{}?survey__id__exact={}">{}</a>',
            url, obj.id, count
        )
    response_count.short_description = 'Responses'
    
    def completion_rate(self, obj):
        rate = obj.get_completion_rate()
        if rate >= 80:
            color = 'green'
        elif rate >= 50:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {};">{}%</span>',
            color, f"{rate:.1f}"
        )
    completion_rate.short_description = 'Completion Rate'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = [
        'question_text_short', 'survey', 'question_type', 'required', 'order'
    ]
    list_filter = ['question_type', 'required', 'survey']
    search_fields = ['question_text', 'survey__title']
    ordering = ['survey', 'order']
    
    def question_text_short(self, obj):
        return obj.question_text[:50] + "..." if len(obj.question_text) > 50 else obj.question_text
    question_text_short.short_description = 'Question Text'

class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ['question', 'created_at', 'updated_at']
    fields = ['question', 'text_answer', 'rating_value', 'boolean_answer']

@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = [
        'survey', 'user', 'is_complete', 'completion_percentage', 
        'started_at', 'submitted_at'
    ]
    list_filter = ['is_complete', 'survey', 'started_at']
    search_fields = ['user__username', 'user__email', 'survey__title']
    readonly_fields = ['started_at', 'ip_address', 'user_agent']
    inlines = [AnswerInline]
    
    def completion_percentage(self, obj):
        percentage = obj.get_completion_percentage()
        if percentage == 100:
            color = 'green'
        elif percentage >= 50:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {};">{}%</span>',
            color, f"{percentage:.1f}"
        )
    completion_percentage.short_description = 'Completion %'

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = [
        'response', 'question_short', 'answer_preview', 'created_at'
    ]
    list_filter = ['question__question_type', 'created_at']
    search_fields = ['response__user__username', 'question__question_text', 'text_answer']
    readonly_fields = ['created_at', 'updated_at']
    
    def question_short(self, obj):
        return obj.question.question_text[:30] + "..." if len(obj.question.question_text) > 30 else obj.question.question_text
    question_short.short_description = 'Question'
    
    def answer_preview(self, obj):
        if obj.text_answer:
            return obj.text_answer[:50] + "..." if len(obj.text_answer) > 50 else obj.text_answer
        elif obj.selected_options:
            return ', '.join(obj.selected_options)
        elif obj.rating_value is not None:
            return f"Rating: {obj.rating_value}"
        elif obj.boolean_answer is not None:
            return "Yes" if obj.boolean_answer else "No"
        elif obj.date_answer:
            return obj.date_answer.strftime('%Y-%m-%d')
        else:
            return "No answer"
    answer_preview.short_description = 'Answer Preview'

@admin.register(SurveyTemplate)
class SurveyTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at']
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(SurveyCategory)
class SurveyCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'color_preview', 'icon_preview', 'survey_count', 'created_at']
    search_fields = ['name']
    
    def color_preview(self, obj):
        return format_html(
            '<div style="width: 20px; height: 20px; background-color: {}; border-radius: 3px; display: inline-block;"></div>',
            obj.color
        )
    color_preview.short_description = 'Color'
    
    def icon_preview(self, obj):
        return format_html('<i class="{}"></i>', obj.icon)
    icon_preview.short_description = 'Icon'
    
    def survey_count(self, obj):
        count = obj.survey_set.count()
        return count
    survey_count.short_description = 'Surveys'

@admin.register(SurveyDraft)
class SurveyDraftAdmin(admin.ModelAdmin):
    list_display = ['survey', 'user', 'updated_at']
    list_filter = ['updated_at', 'survey']
    search_fields = ['user__username', 'survey__title']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(SurveyAnalytics)
class SurveyAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'survey', 'total_views', 'total_starts', 'total_completions', 
        'conversion_rate', 'last_response_at'
    ]
    list_filter = ['last_response_at']
    search_fields = ['survey__title']
    readonly_fields = ['updated_at']
    
    def conversion_rate(self, obj):
        if obj.total_starts > 0:
            rate = (obj.total_completions / obj.total_starts) * 100
            if rate >= 80:
                color = 'green'
            elif rate >= 50:
                color = 'orange'
            else:
                color = 'red'
            return format_html(
                '<span style="color: {};">{:.1f}%</span>',
                color, rate
            )
        return "0%"
    conversion_rate.short_description = 'Conversion Rate'