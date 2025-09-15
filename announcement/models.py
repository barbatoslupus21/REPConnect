from django.db import models
from userlogin.models import EmployeeLogin
from django.utils import timezone

class Announcement(models.Model):
    author = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=200, blank=True, null=True)
    content = models.TextField()
    image = models.ImageField(upload_to='announcement/', blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Announcement'
        verbose_name_plural = 'Announcements'
    
    def __str__(self):
        return self.title if self.title else f"Announcement by {self.author.full_name} on {self.created_at.strftime('%Y-%m-%d')}"
    
    @property
    def total_reactions(self):
        return self.reactions.count()
    
    @property
    def reaction_summary(self):
        summary = {}
        reactions = self.reactions.values('emoji').annotate(count=models.Count('emoji'))
        for reaction in reactions:
            summary[reaction['emoji']] = reaction['count']
        return summary
    
    def get_highlighted_content(self):
        import re
        def repl(match):
            return f'<span class="hashtag">{match.group(0)}</span>'
        return re.sub(r'#[\w]+', repl, self.content)


class AnnouncementReaction(models.Model):
    EMOJI_CHOICES = [
        ('like', '👍'),
        ('love', '❤️'),
        ('haha', '😄'),
        ('wow', '😮'),
        ('sad', '😢'),
        ('angry', '😠'),
    ]
    
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(EmployeeLogin, on_delete=models.CASCADE, related_name='announcement_reactions')
    emoji = models.CharField(max_length=10, choices=EMOJI_CHOICES, default='like')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('announcement', 'user')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.emoji} - {self.announcement.title}"