from django import template

register = template.Library()

@register.filter
def lookup_emoji(emoji_key):
    """Convert emoji key to actual emoji character"""
    emoji_map = {
        'like': '👍',
        'love': '❤️',
        'haha': '😄',
        'wow': '😮',
        'sad': '😢',
        'angry': '😠',
    }
    return emoji_map.get(emoji_key, emoji_key)
