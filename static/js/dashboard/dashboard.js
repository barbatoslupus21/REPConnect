// Dashboard Overview JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    initializeGreetingIconTransition();
});

// Guard to ensure reactions are initialized only once
if (typeof window.__reactionsInitialized === 'undefined') {
    window.__reactionsInitialized = false;
}

function initializeGreetingIconTransition() {
    const wavingIcon = document.getElementById('wavingIcon');
    const timeIcon = document.getElementById('timeIcon');
    
    if (!wavingIcon || !timeIcon) return;
    
    // Determine time icon type and add appropriate class
    const timeType = timeIcon.dataset.time; // morning | afternoon | evening
    if (timeType === 'morning' || timeType === 'afternoon') {
        timeIcon.classList.add('sun-active');
    } else {
        timeIcon.classList.add('moon-active');
    }
    
    // Ensure initial state: waving visible, time-icon hidden
    wavingIcon.classList.remove('hidden');
    timeIcon.classList.add('hidden');
    
    // After 15 seconds, hide waving and show time icon
    setTimeout(() => {
        // Hide waving icon completely
        wavingIcon.classList.remove('active');
        wavingIcon.classList.add('hidden');
        
        // Show time icon with active class
        timeIcon.classList.remove('hidden');
        timeIcon.classList.add('active');
        
    }, 15000); // 15 seconds delay
}

function initializeDashboard() {
    initializeMiniCalendar();
    initializeCreatePost();
    initializeReactions();
    initializeProfileCompletion();
}

// Mini Calendar
function initializeMiniCalendar() {
    const calendarContainer = document.getElementById('miniCalendar');
    if (!calendarContainer) return;
    
    const today = new Date();
    renderMiniCalendar(today.getFullYear(), today.getMonth());
    
    // Load holidays for current month
    loadHolidays(today.getFullYear(), today.getMonth());
}

function renderMiniCalendar(year, month) {
    const calendarContainer = document.getElementById('miniCalendar');
    const today = new Date();
    const currentDate = new Date(year, month, 1);
    const firstDay = currentDate.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let calendarHTML = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" onclick="navigateCalendar(-1)">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="calendar-month-year">${monthNames[month]} ${year}</div>
            <button class="calendar-nav-btn" onclick="navigateCalendar(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="calendar-grid">
    `;
    
    // Day headers
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        let classes = 'calendar-day';
        
        // Check if it's today
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            classes += ' today';
        }
        
        calendarHTML += `<div class="${classes}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}</div>`;
    }
    
    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        calendarHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    calendarHTML += '</div>';
    calendarContainer.innerHTML = calendarHTML;
}

let currentCalendarDate = new Date();

function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderMiniCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    loadHolidays(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
}

function loadHolidays(year, month) {
    fetch(`/calendar/api/holidays/?year=${year}&month=${month + 1}`)
        .then(response => response.json())
        .then(holidaysDict => {
            highlightHolidays(holidaysDict);
        })
        .catch(error => {
            console.error('Error loading holidays:', error);
        });
}

function highlightHolidays(holidaysDict) {
    Object.keys(holidaysDict).forEach(dateStr => {
        const holidays = holidaysDict[dateStr];
        const dateElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (dateElement && holidays.length > 0) {
            dateElement.classList.add('holiday');
            // Use the first holiday's type for styling
            dateElement.classList.add(`${holidays[0].type}-holiday`);
            // Combine all holiday names for the title
            const holidayNames = holidays.map(h => h.name).join(', ');
            dateElement.title = holidayNames;
        }
    });
}

// Create Post Functionality
function initializeCreatePost() {
    const newPostBtn = document.getElementById('newPostBtn');
    const photoVideoBtn = document.getElementById('photoVideoBtn');
    const feelingActivityBtn = document.getElementById('feelingActivityBtn');
    
    if (newPostBtn) {
        newPostBtn.addEventListener('click', openCreatePostModal);
    }
    
    if (photoVideoBtn) {
        photoVideoBtn.addEventListener('click', openCreatePostModal);
    }
    
    if (feelingActivityBtn) {
        feelingActivityBtn.addEventListener('click', openCreatePostModal);
    }
}

function openCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('createPostForm').reset();
    }, 300);
}

function submitPost() {
    const form = document.getElementById('createPostForm');
    const formData = new FormData(form);
    
    const content = document.getElementById('postContent').value.trim();
    if (!content) {
        showToast('Please enter some content for your post', 'error');
        return;
    }
    
    fetch('/announcement/api/create/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('Post created successfully!', 'success');
            closeCreatePostModal();
            // Reload the page to show the new post
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast(result.error || 'Failed to create post', 'error');
        }
    })
    .catch(error => {
        console.error('Error creating post:', error);
        showToast('Error creating post', 'error');
    });
}

// Reaction Functionality
function initializeReactions() {
    // Prevent double-binding of event listeners
    if (window.__reactionsInitialized) return;
    window.__reactionsInitialized = true;

    let currentPopover = null;
    
    // Initialize reactors display for all announcements on page load
    initializeReactorsDisplay();
    
    // Main reaction button click and hover handlers
    document.addEventListener('click', function(e) {
        if (e.target.closest('.main-reaction-btn')) {
            const btn = e.target.closest('.main-reaction-btn');
            const announcementId = btn.dataset.announcement;
            const popover = document.getElementById(`popover-${announcementId}`);
            
            // Hide other popovers
            document.querySelectorAll('.reactions-popover').forEach(p => {
                if (p !== popover) {
                    p.classList.remove('show');
                }
            });
            
            // Toggle current popover
            if (currentPopover === popover && popover.classList.contains('show')) {
                popover.classList.remove('show');
                currentPopover = null;
            } else {
                // Position the popover above the button (centered horizontally, above vertically)
                const rect = btn.getBoundingClientRect();
                const popoverHeight = popover.offsetHeight || 48; // fallback height
                const scrollY = window.scrollY || window.pageYOffset;
                const scrollX = window.scrollX || window.pageXOffset;
                popover.style.left = `${rect.left + rect.width / 2 + scrollX}px`;
                popover.style.top = `${rect.top - popoverHeight - 12 + scrollY}px`;
                popover.classList.add('show');
                currentPopover = popover;
            }
            e.stopPropagation();
        }
        // Hide popovers when clicking outside
        else if (!e.target.closest('.reactions-popover')) {
            document.querySelectorAll('.reactions-popover').forEach(p => {
                p.classList.remove('show');
            });
            currentPopover = null;
        }
    });

    // Popover reaction button clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.popover-reaction-btn')) {
            const btn = e.target.closest('.popover-reaction-btn');
            const emoji = btn.dataset.emoji;
            const announcementId = btn.dataset.announcement;
            console.log('Popover reaction button clicked:', { emoji, announcementId, btn });
            handleReaction(emoji, announcementId);
        }
    });
}

async function handleReaction(emoji, announcementId) {
    console.log('handleReaction called with:', { emoji, announcementId });
    try {
        const csrfToken = getCookie('csrftoken');
        console.log('CSRF Token found:', csrfToken ? 'Yes' : 'No');
        
        if (!csrfToken) {
            throw new Error('CSRF token not found');
        }

        const url = `/announcement/react/${announcementId}/`;
        const body = `emoji=${encodeURIComponent(emoji)}`;
        console.log('Making request to:', url);
        console.log('Request body:', body);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            console.log('Reaction successful, updating UI...');
            updateReactionUI(announcementId, data);
            // Hide popover after selection
            const popover = document.getElementById(`popover-${announcementId}`);
            if (popover) {
                popover.classList.remove('show');
                currentPopover = null;
            }
            console.log('UI updated successfully');
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Reaction error details:', error);
        showToast('Failed to update reaction. Please try again.', 'error');
    }
}

function updateReactionUI(announcementId, data) {
    console.log('updateReactionUI called with:', { announcementId, data });
    const card = document.querySelector(`.post-card[data-id="${announcementId}"]`);
    if (!card) {
        console.error('Post card not found for announcement:', announcementId);
        return;
    }
    
    const mainBtn = card.querySelector('.main-reaction-btn');
    const reactorDisplay = card.querySelector(`#reactors-${announcementId}`);
    
    console.log('Found elements:', { mainBtn: !!mainBtn, reactorDisplay: !!reactorDisplay });
    
    // Update main reaction button icon
    const reactionIcon = mainBtn.querySelector('.reaction-icon');
    console.log('Current reaction icon:', reactionIcon);
    if (data.user_reaction) {
        // Find emoji for user's reaction - must match AnnouncementReaction.EMOJI_CHOICES
        const emojiMap = {
            'like': '👍',
            'love': '❤️', 
            'haha': '😄',
            'wow': '😮',
            'sad': '😢',
            'angry': '😠'
        };
        const newIcon = `<span class="reaction-icon active">${emojiMap[data.user_reaction] || '👍'}</span>`;
        console.log('Setting reaction icon to:', newIcon);
        reactionIcon.outerHTML = newIcon;
    } else {
        console.log('Removing reaction icon');
        reactionIcon.outerHTML = `<i class="fas fa-thumbs-up reaction-icon"></i>`;
    }
    
    // Update reactors display
    console.log('Updating reactors display with:', { total_reactions: data.total_reactions, reactors_count: data.reactors?.length });
    if (data.total_reactions > 0 && data.reactors && data.reactors.length > 0) {
        // Ensure the reactors display container exists
        if (!reactorDisplay.querySelector('.reactor-avatars')) {
            reactorDisplay.innerHTML = `
                <div class="reactor-avatars"></div>
                <div class="reactor-text">
                    <span class="latest-reactor"></span>
                    <span class="remaining-count" data-tooltip-id="tooltip-${announcementId}"></span>
                </div>
                
                <!-- Tooltip for reactor list -->
                <div class="reactors-tooltip" id="tooltip-${announcementId}">
                    <div class="tooltip-content">
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>
            `;
        }
        updateReactorsDisplay(announcementId, data.reactors, data.total_reactions);
        reactorDisplay.style.display = 'flex';
    } else if (reactorDisplay) {
        reactorDisplay.style.display = 'none';
    }
}

function updateReactorsDisplay(announcementId, reactors, totalReactions) {
    const reactorDisplay = document.querySelector(`#reactors-${announcementId}`);
    
    if (totalReactions === 0) {
        if (reactorDisplay) {
            reactorDisplay.innerHTML = '';
        }
        return;
    }
    
    if (reactorDisplay) {
        // Create the structure if it doesn't exist
        if (!reactorDisplay.querySelector('.reactor-avatars')) {
            reactorDisplay.innerHTML = `
                <div class="reactor-avatars">
                    <!-- Avatars will be populated by JavaScript -->
                </div>
                <div class="reactor-text">
                    <span class="latest-reactor"></span>
                    <span class="remaining-count" data-tooltip-id="tooltip-${announcementId}"></span>
                </div>
                
                <!-- Tooltip for reactor list -->
                <div class="reactors-tooltip" id="tooltip-${announcementId}">
                    <div class="tooltip-content">
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>
            `;
        }
        
        // Show first 5 reactor avatars
        const avatarsContainer = reactorDisplay.querySelector('.reactor-avatars');
        if (avatarsContainer) {
            avatarsContainer.innerHTML = '';
            
            const displayReactors = reactors.slice(0, 5);
            displayReactors.forEach(reactor => {
                const avatar = document.createElement('div');
                avatar.className = 'reactor-avatar';
                
                if (reactor.avatar) {
                    avatar.innerHTML = `<img src="${reactor.avatar}" alt="${reactor.name}">`;
                } else {
                    const initials = reactor.name.split(' ').map(n => n[0]).join('').toUpperCase();
                    avatar.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
                }
                
                avatarsContainer.appendChild(avatar);
            });
        }
        
        // Update text
        const latestReactor = reactorDisplay.querySelector('.latest-reactor');
        const remainingCount = reactorDisplay.querySelector('.remaining-count');
        
        if (reactors.length > 0) {
            if (latestReactor) {
                latestReactor.textContent = reactors[0].name;
            }
            
            if (remainingCount) {
                if (totalReactions > 1) {
                    const remaining = totalReactions - 1;
                    remainingCount.textContent = `and ${remaining} ${remaining === 1 ? 'person' : 'people'} reacted to this announcement`;
                    remainingCount.style.display = 'inline';
                } else {
                    remainingCount.textContent = 'reacted to this announcement';
                    remainingCount.style.display = 'inline';
                }
            }
            
            // Always update tooltip when there are reactors
            updateReactorsTooltip(announcementId, reactors);
        }
    }
}

function updateReactorsTooltip(announcementId, reactors) {
    const tooltip = document.getElementById(`tooltip-${announcementId}`);
    if (!tooltip) {
        console.error('Tooltip not found for announcement:', announcementId);
        return;
    }
    
    const tooltipContent = tooltip.querySelector('.tooltip-content');
    if (!tooltipContent) {
        console.error('Tooltip content not found for announcement:', announcementId);
        return;
    }
    
    tooltipContent.innerHTML = '';
    
    if (reactors && reactors.length > 0) {
        reactors.forEach(reactor => {
            const reactorDiv = document.createElement('div');
            reactorDiv.className = 'tooltip-reactor';
            
            const emojiMap = {
                'like': '👍',
                'love': '❤️', 
                'haha': '😄',
                'wow': '😮',
                'sad': '😢',
                'angry': '😠'
            };
            
            reactorDiv.innerHTML = `
                <span class="emoji">${emojiMap[reactor.reaction] || '👍'}</span>
                <span>${reactor.name}</span>
            `;
            
            tooltipContent.appendChild(reactorDiv);
        });
    } else {
        tooltipContent.innerHTML = '<div class="tooltip-reactor">No reactions yet</div>';
    }
}

// Tooltip behavior: only show when hovering reactor-text, hide otherwise
let tooltipHoverTimeout = null;

document.addEventListener('mouseenter', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('reactor-text')) {
        const remainingCount = e.target.querySelector('.remaining-count');
        if (remainingCount) {
            const tooltipId = remainingCount.dataset.tooltipId;
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                if (tooltipHoverTimeout) clearTimeout(tooltipHoverTimeout);
                tooltipHoverTimeout = setTimeout(() => {
                    tooltip.classList.add('show');
                }, 100);
            }
        }
    }
}, true);

document.addEventListener('mouseleave', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('reactor-text')) {
        const remainingCount = e.target.querySelector('.remaining-count');
        if (remainingCount) {
            const tooltipId = remainingCount.dataset.tooltipId;
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                if (tooltipHoverTimeout) {
                    clearTimeout(tooltipHoverTimeout);
                    tooltipHoverTimeout = null;
                }
                tooltip.classList.remove('show');
            }
        }
    }
}, true);

// Utility Functions
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function getCsrfToken() {
    return getCookie('csrftoken');
}

// Initialize reactors display for all announcements on page load
function initializeReactorsDisplay() {
    const announcements = document.querySelectorAll('.post-card');
    announcements.forEach(announcement => {
        const announcementId = announcement.dataset.id;
        const reactorDisplay = announcement.querySelector(`#reactors-${announcementId}`);
        
        if (reactorDisplay) {
            // Check if there are already reactors displayed (from server-side rendering)
            const hasReactors = reactorDisplay.querySelector('.reactor-avatars img, .reactor-avatars .avatar-placeholder');
            if (!hasReactors) {
                // If no reactors displayed, hide the container
                reactorDisplay.style.display = 'none';
            }
        }
    });
}

// Load reactors for an announcement
async function loadReactors(announcementId) {
    try {
        const response = await fetch(`/announcement/reactors/${announcementId}/`);
        const data = await response.json();
        
        if (data.success) {
            if (data.reactors && data.reactors.length > 0) {
                updateReactorsDisplay(announcementId, data.reactors, data.total_reactions);
            } else {
                // Ensure reactors display is empty if no reactions
                const reactorDisplay = document.querySelector(`#reactors-${announcementId}`);
                if (reactorDisplay) {
                    reactorDisplay.innerHTML = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading reactors:', error);
    }
}

function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Profile Completion Animation
function initializeProfileCompletion() {
    const progressRing = document.querySelector('.progress-ring-circle');
    if (progressRing) {
        const completionPercentage = document.querySelector('.completion-percentage');
        const completionTitle = document.querySelector('.completion-details h5');
        const completionMessage = document.querySelector('.completion-details p');
        
        if (completionPercentage) {
            const percentage = parseInt(completionPercentage.textContent);
            const circumference = 2 * Math.PI * 32; // radius is 32
            const strokeDasharray = (percentage / 100) * circumference;
            
            // Set CSS custom property for animation
            progressRing.style.setProperty('--progress', strokeDasharray);
            progressRing.style.strokeDasharray = `${strokeDasharray} ${circumference}`;
            
            // Apply color class based on percentage
            progressRing.className = 'progress-ring-circle';
            if (percentage <= 30) {
                progressRing.classList.add('low');
            } else if (percentage <= 50) {
                progressRing.classList.add('medium-low');
            } else if (percentage <= 90) {
                progressRing.classList.add('medium-high');
            } else {
                progressRing.classList.add('high');
            }
            
            // Update messaging based on percentage
            if (completionTitle && completionMessage) {
                if (percentage <= 30) {
                    completionTitle.textContent = "Let's get started!";
                    completionMessage.textContent = "Your profile needs some love. Complete the basic information to help your colleagues connect with you.";
                } else if (percentage <= 50) {
                    completionTitle.textContent = "You're on the right track!";
                    completionMessage.textContent = "Great start! Add a few more details to make your profile more engaging and discoverable.";
                } else if (percentage <= 90) {
                    completionTitle.textContent = "Almost there!";
                    completionMessage.textContent = "Your profile is looking good! Just a few more touches to make it complete and professional.";
                } else {
                    completionTitle.textContent = "Profile complete!";
                    completionMessage.textContent = "Excellent! Your profile is fully optimized and ready to help colleagues connect with you.";
                }
            }
        }
    }
}

// Initialize ancillary UI on DOM ready (without re-initializing reactions twice)
document.addEventListener('DOMContentLoaded', function() {
    // Load reactors for existing announcements
    document.querySelectorAll('.post-card').forEach(card => {
        const announcementId = card.dataset.id;
        if (announcementId) {
            loadReactors(announcementId);
        }
    });

    // Update relative times
    function updateRelativeTimes() {
        document.querySelectorAll('[data-time]').forEach(element => {
            const timeStr = element.getAttribute('data-time');
            const postTime = new Date(timeStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now - postTime) / 1000);

            let relativeTime;
            if (diffInSeconds < 60) {
                relativeTime = 'Just now';
            } else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                relativeTime = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                relativeTime = `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else {
                const days = Math.floor(diffInSeconds / 86400);
                relativeTime = `${days} day${days > 1 ? 's' : ''} ago`;
            }

            element.textContent = relativeTime;
        });
    }

    updateRelativeTimes();
    setInterval(updateRelativeTimes, 60000);
});
