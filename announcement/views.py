from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Count, Q, Prefetch
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.conf import settings
import os
from PIL import Image
from .models import Announcement, AnnouncementReaction
from notification.models import Notification
from .forms import AnnouncementForm


@login_required
def announcement_list(request):
    announcements = Announcement.objects.filter(is_active=True).select_related('author').prefetch_related(
        Prefetch('reactions', queryset=AnnouncementReaction.objects.select_related('user'))
    )
    
    search_query = request.GET.get('search', '')
    if search_query:
        announcements = announcements.filter(
            Q(title__icontains=search_query) | 
            Q(content__icontains=search_query) |
            Q(author__firstname__icontains=search_query) |
            Q(author__lastname__icontains=search_query)
        )
    
    paginator = Paginator(announcements, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    for announcement in page_obj:
        announcement.user_reaction = None
        if request.user.is_authenticated:
            try:
                reaction = announcement.reactions.filter(user=request.user).first()
                if reaction:
                    announcement.user_reaction = reaction.emoji
            except:
                pass
    
    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'is_admin': request.user.hr_admin if hasattr(request.user, 'hr_admin') else False,
        'emoji_choices': AnnouncementReaction.EMOJI_CHOICES,
    }
    
    return render(request, 'announcement/announcement.html', context)


@login_required
@require_POST
def create_announcement(request):
    if not hasattr(request.user, 'hr_admin') or not request.user.hr_admin:
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    form = AnnouncementForm(request.POST, request.FILES)
    
    if form.is_valid():
        announcement = form.save(commit=False)
        announcement.author = request.user
        
        if 'image' in request.FILES:
            image_file = request.FILES['image']
            image_path = handle_uploaded_image(image_file)
            if image_path:
                announcement.image = image_path
        
        announcement.save()

        try:
            Notification.objects.create(
                title="New Announcement",
                message=f"New announcement: {announcement.content[:30]}{'...' if len(announcement.content) > 30 else ''}",
                notification_type="announcement",
                sender=request.user,
                recipient=request.user,
                for_all=True,
                module="announcement"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating notification: {e}")

        messages.success(request, 'Announcement posted successfully!')
        return JsonResponse({'success': True, 'message': 'Announcement created successfully'})
    else:
        errors = {}
        for field, error_list in form.errors.items():
            errors[field] = [str(error) for error in error_list]
        
        return JsonResponse({'success': False, 'errors': errors}, status=400)


@login_required
@require_POST
def update_announcement(request, pk):
    if not request.user.hr_admin:
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    announcement = get_object_or_404(Announcement, pk=pk, author=request.user)
    form = AnnouncementForm(request.POST, request.FILES, instance=announcement)
    
    if form.is_valid():
        if 'image' in request.FILES:
            if announcement.image:
                old_image_path = os.path.join(settings.MEDIA_ROOT, str(announcement.image))
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)
            
            image_file = request.FILES['image']
            image_path = handle_uploaded_image(image_file)
            if image_path:
                announcement.image = image_path
        
        form.save()
        messages.success(request, 'Announcement updated successfully!')
        return JsonResponse({'success': True, 'message': 'Announcement updated successfully'})
    else:
        errors = {field: error[0] for field, error in form.errors.items()}
        return JsonResponse({'success': False, 'errors': errors}, status=400)


@login_required
@require_POST
def delete_announcement(request, pk):
    if not request.user.hr_admin:
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    announcement = get_object_or_404(Announcement, pk=pk, author=request.user)
    
    if announcement.image:
        image_path = os.path.join(settings.MEDIA_ROOT, str(announcement.image))
        if os.path.exists(image_path):
            os.remove(image_path)
    
    announcement.delete()
    messages.success(request, 'Announcement deleted successfully!')
    return JsonResponse({'success': True, 'message': 'Announcement deleted successfully'})


@login_required
@require_POST
def toggle_reaction(request, pk):
    announcement = get_object_or_404(Announcement, pk=pk)
    emoji = request.POST.get('emoji')
    
    if not emoji:
        return JsonResponse({'success': False, 'error': 'Emoji is required'}, status=400)
    
    valid_emojis = [choice[0] for choice in AnnouncementReaction.EMOJI_CHOICES]
    if emoji not in valid_emojis:
        return JsonResponse({'success': False, 'error': 'Invalid emoji'}, status=400)
    
    reaction, created = AnnouncementReaction.objects.get_or_create(
        announcement=announcement,
        user=request.user,
        defaults={'emoji': emoji}
    )
    
    if not created:
        if reaction.emoji == emoji:
            reaction.delete()
            removed = True
        else:
            reaction.emoji = emoji
            reaction.save()
            removed = False
    else:
        removed = False
    
    # Get user's current reaction
    user_reaction = None
    if not removed:
        user_reaction = emoji
    
    # Get reactor data
    reactors = []
    reactions = AnnouncementReaction.objects.filter(announcement=announcement).select_related('user').order_by('-created_at')
    
    for reaction_obj in reactions:
        user = reaction_obj.user
        reactors.append({
            'name': f"{user.firstname} {user.lastname}",
            'avatar': user.avatar.url if hasattr(user, 'avatar') and user.avatar else None,
            'reaction': reaction_obj.emoji
        })
    
    return JsonResponse({
        'success': True,
        'removed': removed,
        'user_reaction': user_reaction,
        'reactors': reactors,
        'total_reactions': len(reactors)
    })


@login_required
def get_announcement_reactors(request, pk):
    announcement = get_object_or_404(Announcement, pk=pk, is_active=True)
    
    reactors = []
    reactions = AnnouncementReaction.objects.filter(announcement=announcement).select_related('user').order_by('-created_at')
    
    for reaction_obj in reactions:
        user = reaction_obj.user
        reactors.append({
            'name': f"{user.firstname} {user.lastname}",
            'avatar': user.avatar.url if hasattr(user, 'avatar') and user.avatar else None,
            'reaction': reaction_obj.emoji
        })
    
    return JsonResponse({
        'success': True,
        'reactors': reactors,
        'total_reactions': len(reactors)
    })


@login_required
def get_announcement_detail(request, pk):
    announcement = get_object_or_404(Announcement, pk=pk)
    
    if not request.user.hr_admin or announcement.author != request.user:
        return JsonResponse({'success': False, 'error': 'Unauthorized'}, status=403)
    
    data = {
        'success': True,
        'announcement': {
            'id': announcement.id,
            'content': announcement.content,
            'image': f"/static/{announcement.image}" if announcement.image else None,
            'created_at': announcement.created_at.strftime('%B %d, %Y at %I:%M %p'),
            'updated_at': announcement.updated_at.strftime('%B %d, %Y at %I:%M %p'),
        }
    }
    
    return JsonResponse(data)

def handle_uploaded_image(image_file):
    try:
        upload_dir = os.path.join(settings.BASE_DIR, 'static', 'images', 'announcement')
        os.makedirs(upload_dir, exist_ok=True)
        
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"{timestamp}_{image_file.name}"
        file_path = os.path.join(upload_dir, file_name)
        
        img = Image.open(image_file)
        
        max_size = (1200, 1200)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        if img.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        img.save(file_path, 'JPEG', quality=85, optimize=True)
        
        return f"images/announcement/{file_name}"
    except Exception as e:
        print(f"Error handling image upload: {e}")
        return None