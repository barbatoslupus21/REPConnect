from django.contrib import admin
from .models import Announcement, AnnouncementReaction


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['get_title_or_content', 'author', 'created_at', 'updated_at', 'is_active', 'total_reactions']
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['title', 'content', 'author__username', 'author__firstname', 'author__lastname']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'total_reactions', 'reaction_summary']
    
    def get_title_or_content(self, obj):
        return obj.title if obj.title else (obj.content[:50] + '...' if len(obj.content) > 50 else obj.content)
    get_title_or_content.short_description = 'Title/Content'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('author', 'title', 'content', 'image')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Engagement', {
            'fields': ('total_reactions', 'reaction_summary'),
            'classes': ('collapse',)
        }),
    )
    
    def total_reactions(self, obj):
        return obj.total_reactions
    total_reactions.short_description = 'Total Reactions'
    
    def reaction_summary(self, obj):
        summary = obj.reaction_summary
        if summary:
            return ', '.join([f"{emoji}: {count}" for emoji, count in summary.items()])
        return 'No reactions yet'
    reaction_summary.short_description = 'Reaction Summary'


@admin.register(AnnouncementReaction)
class AnnouncementReactionAdmin(admin.ModelAdmin):
    list_display = ['announcement', 'user', 'emoji', 'created_at']
    list_filter = ['emoji', 'created_at']
    search_fields = ['announcement__title', 'user__username', 'user__firstname', 'user__lastname']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Reaction Details', {
            'fields': ('announcement', 'user', 'emoji')
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )