document.addEventListener('DOMContentLoaded', function() {
    const newPostBtn = document.getElementById('newPostBtn');
    const newPostModal = document.getElementById('newPostModal');
    const editPostModal = document.getElementById('editPostModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    let deleteAnnouncementId = null;

    if (newPostBtn) {
        newPostBtn.addEventListener('click', openNewPostModal);
    }

    // Photo/Video button functionality
    document.getElementById('photoVideoBtn')?.addEventListener('click', function() {
        openNewPostModal();
        // Focus on the image upload button
        setTimeout(() => {
            document.getElementById('uploadImageBtn')?.click();
        }, 300);
    });

    function openNewPostModal() {
        document.body.classList.add('modal-open');
        newPostModal.classList.add('show');
        newPostModal.querySelector('.modal-content').style.animation = 'modalZoomIn 0.3s ease-out';
    }

    function closeModal(modal) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.animation = 'modalZoomOut 0.3s ease-out';
        
        setTimeout(() => {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            modalContent.style.animation = '';
        }, 280);
    }

    document.querySelectorAll('.modal-overlay, .modal-close, #cancelNewPost, #cancelEditPost, #cancelDelete').forEach(element => {
        element.addEventListener('click', function(e) {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });

    document.getElementById('closeNewPost')?.addEventListener('click', () => closeModal(newPostModal));
    document.getElementById('closeEditPost')?.addEventListener('click', () => closeModal(editPostModal));
    document.getElementById('closeDeleteConfirm')?.addEventListener('click', () => closeModal(deleteConfirmModal));

    const newPostForm = document.getElementById('newPostForm');
    if (newPostForm) {
        newPostForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
            
            try {
                const response = await fetch('/announcement/create/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Announcement posted successfully!', 'success');
                    closeModal(newPostModal);
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showErrors(data.errors, newPostForm);
                    showToast('Please correct the errors and try again.', 'error');
                }
            } catch (error) {
                showToast('An error occurred. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const announcementId = this.dataset.id;
            
            try {
                const response = await fetch(`/announcement/detail/${announcementId}/`);
                const data = await response.json();
                
                if (data.success) {
                    const announcement = data.announcement;
                    document.getElementById('editAnnouncementId').value = announcement.id;
                    document.getElementById('editContent').value = announcement.content;
                    
                    const currentImageContainer = document.getElementById('currentImageContainer');
                    if (announcement.image) {
                        currentImageContainer.innerHTML = `
                            <label class="form-label">Current Image</label>
                            <div class="current-image-preview">
                                <img id="currentImg" src="${announcement.image}" alt="Current image">
                                <p>Current image - upload a new one to replace it</p>
                            </div>
                        `;
                        currentImageContainer.style.display = 'block';
                    } else {
                        currentImageContainer.style.display = 'none';
                    }
                    
                    document.body.classList.add('modal-open');
                    editPostModal.classList.add('show');
                    editPostModal.querySelector('.modal-content').style.animation = 'modalZoomIn 0.3s ease-out';
                }
            } catch (error) {
                showToast('Failed to load announcement details.', 'error');
            }
        });
    });

    const editPostForm = document.getElementById('editPostForm');
    if (editPostForm) {
        editPostForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const announcementId = document.getElementById('editAnnouncementId').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            try {
                const response = await fetch(`/announcement/update/${announcementId}/`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Announcement updated successfully!', 'success');
                    closeModal(editPostModal);
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showErrors(data.errors, editPostForm);
                    showToast('Please correct the errors and try again.', 'error');
                }
            } catch (error) {
                showToast('An error occurred. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAnnouncementId = this.dataset.id;
            const card = this.closest('.post-card');
            const contentElement = card.querySelector('.post-text');
            const content = contentElement ? contentElement.textContent.trim() : 'this announcement';
            
            // Show first 50 characters of content for confirmation
            const displayContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
            document.getElementById('deleteDetails').textContent = `"${displayContent}"`;
            
            document.body.classList.add('modal-open');
            deleteConfirmModal.classList.add('show');
            deleteConfirmModal.querySelector('.modal-content').style.animation = 'modalZoomIn 0.3s ease-out';
        });
    });

    document.getElementById('confirmDelete')?.addEventListener('click', async function() {
        if (!deleteAnnouncementId) return;
        
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        
        try {
            const response = await fetch(`/announcement/delete/${deleteAnnouncementId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Announcement deleted successfully!', 'success');
                closeModal(deleteConfirmModal);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast('Failed to delete announcement.', 'error');
            }
        } catch (error) {
            showToast('An error occurred. Please try again.', 'error');
        } finally {
            this.disabled = false;
            this.innerHTML = originalText;
        }
    });

    // New Reaction System
    let currentPopover = null;
    
    // Main reaction button click and hover handlers
    document.addEventListener('click', function(e) {
        if (e.target.closest('.main-reaction-btn')) {
            const btn = e.target.closest('.main-reaction-btn');
            const announcementId = btn.dataset.announcement;
            const popover = document.getElementById(`popover-${announcementId}`);
            
            if (!popover) {
                console.error('Popover not found for announcement:', announcementId);
                return;
            }
            
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
            handleReaction(emoji, announcementId);
        }
    });

    // Tooltip handlers - improved version
    document.addEventListener('mouseenter', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('remaining-count')) {
            const tooltipId = e.target.dataset.tooltipId;
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                // Small delay to prevent flickering
                setTimeout(() => {
                    tooltip.classList.add('show');
                }, 100);
            }
        }
    }, true);

    document.addEventListener('mouseleave', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('remaining-count')) {
            const tooltipId = e.target.dataset.tooltipId;
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                tooltip.classList.remove('show');
            }
        }
    }, true);

    // Also handle hover on the entire reactor text area
    document.addEventListener('mouseenter', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('reactor-text')) {
            const remainingCount = e.target.querySelector('.remaining-count');
            if (remainingCount) {
                const tooltipId = remainingCount.dataset.tooltipId;
                const tooltip = document.getElementById(tooltipId);
                if (tooltip) {
                    setTimeout(() => {
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
                    tooltip.classList.remove('show');
                }
            }
        }
    }, true);

    async function handleReaction(emoji, announcementId) {
        try {
            const csrfToken = getCookie('csrftoken');
            
            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }
            
            const response = await fetch(`/announcement/react/${announcementId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `emoji=${encodeURIComponent(emoji)}`
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                updateReactionUI(announcementId, data);
                // Hide popover after selection
                const popover = document.getElementById(`popover-${announcementId}`);
                if (popover) {
                    popover.classList.remove('show');
                    currentPopover = null;
                }
                showToast('Reaction updated successfully!', 'success');
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Reaction error details:', error);
            showToast('Failed to update reaction. Please try again.', 'error');
        }
    }

    function updateReactionUI(announcementId, data) {
        const card = document.querySelector(`.post-card[data-id="${announcementId}"]`);
        if (!card) {
            console.error('Post card not found for announcement:', announcementId);
            return;
        }
        
        const mainBtn = card.querySelector('.main-reaction-btn');
        const reactorDisplay = card.querySelector(`#reactors-${announcementId}`);
        
        // Update main reaction button icon
        const reactionIcon = mainBtn.querySelector('.reaction-icon');
        if (data.user_reaction) {
            // Find emoji for user's reaction
            const emojiMap = {
                'like': '👍',
                'love': '❤️', 
                'laugh': '😂',
                'wow': '😮',
                'sad': '😢',
                'angry': '😡'
            };
            reactionIcon.outerHTML = `<span class="reaction-icon active">${emojiMap[data.user_reaction] || '👍'}</span>`;
        } else {
            reactionIcon.outerHTML = `<i class="fas fa-thumbs-up reaction-icon"></i>`;
        }
        
        // Always update reactors display
        if (data.total_reactions > 0 && data.reactors && data.reactors.length > 0) {
            // Ensure the reactors display container exists
            if (!reactorDisplay.querySelector('.reactor-avatars')) {
                reactorDisplay.innerHTML = `
                    <div class="reactor-avatars"></div>
                    <div class="reactor-text">
                        <span class="latest-reactor"></span>
                        <span class="remaining-count" data-tooltip-id="tooltip-${announcementId}"></span>
                    </div>
                `;
            }
            updateReactorsDisplay(announcementId, data.reactors, data.total_reactions);
            reactorDisplay.style.display = 'flex';
        } else {
            reactorDisplay.style.display = 'none';
        }
    }

    function updateReactorsDisplay(announcementId, reactors, totalReactions) {
        const reactorDisplay = document.querySelector(`#reactors-${announcementId}`);
        
        if (!reactorDisplay) {
            console.error('Reactor display not found for announcement:', announcementId);
            return;
        }
        
        if (totalReactions === 0) {
            reactorDisplay.style.display = 'none';
            return;
        }
        
        reactorDisplay.style.display = 'flex';
        
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
        
        if (reactors.length > 0 && latestReactor && remainingCount) {
            latestReactor.textContent = reactors[0].name;
            
            if (totalReactions > 1) {
                const remaining = totalReactions - 1;
                remainingCount.textContent = ` and ${remaining} ${remaining === 1 ? 'other person' : 'other people'} reacted to this announcement`;
                remainingCount.style.display = 'inline';
            } else {
                remainingCount.textContent = ' reacted to this announcement';
                remainingCount.style.display = 'inline';
            }
            
            // Always update tooltip when there are reactors
            updateReactorsTooltip(announcementId, reactors);
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
                    'laugh': '😂',
                    'wow': '😮',
                    'sad': '😢',
                    'angry': '😡'
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

    // Load initial reactor data for each announcement
    document.querySelectorAll('.post-card').forEach(card => {
        const announcementId = card.dataset.id;
        const reactorDisplay = card.querySelector(`#reactors-${announcementId}`);
        
        if (reactorDisplay && reactorDisplay.style.display !== 'none') {
            loadReactorData(announcementId);
        }
    });

    // Initialize reactions after DOM is ready
    initializeReactions();

    async function loadReactorData(announcementId) {
        try {
            const response = await fetch(`/announcement/reactors/${announcementId}/`);
            const data = await response.json();
            
            if (data.success && data.reactors) {
                updateReactorsDisplay(announcementId, data.reactors, data.total_reactions);
            }
        } catch (error) {
            console.error('Failed to load reactor data:', error);
        }
    }

    function initializeReactions() {
        // This function is now automatically called when the page loads
        console.log('Reactions initialized successfully');
    }


    // Handle post menu dropdown toggle
    document.addEventListener('click', function(e) {
        // Toggle dropdown on button click
        if (e.target.closest('.post-menu-btn')) {
            const btn = e.target.closest('.post-menu-btn');
            const postCard = btn.closest('.post-card');
            const dropdown = postCard.querySelector('.post-menu-dropdown');
            // Hide all other dropdowns
            document.querySelectorAll('.post-menu-dropdown').forEach(d => {
                if (d !== dropdown) d.style.display = 'none';
            });
            // Toggle this dropdown
            dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
            e.stopPropagation();
            return;
        }
        // Hide dropdowns if clicking outside
        document.querySelectorAll('.post-menu-dropdown').forEach(d => {
            d.style.display = 'none';
        });
    });

    // Handle upload button clicks
    document.querySelectorAll('.upload-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            const input = modal.querySelector('.announcement-file-input');
            if (input) {
                input.click();
            }
        });
    });

    // Handle file input changes
    ['newPostImage', 'editPostImage'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const previewId = id === 'newPostImage' ? 'newImagePreview' : 'editImagePreview';
                handleImagePreview(file, previewId);
            });
        }
    });

    // Handle image removal
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('remove-image-btn')) {
            // Find the correct preview and input for both Create and Edit modals
            const preview = e.target.closest('.image-preview-container');
            let input = null;
            if (preview) {
                // Try to find the file input in the same modal
                const modal = preview.closest('.modal');
                if (modal) {
                    // If there are multiple file inputs, match by preview id
                    if (preview.id === 'newImagePreview') {
                        input = modal.querySelector('#newPostImage');
                    } else if (preview.id === 'editImagePreview') {
                        input = modal.querySelector('#editPostImage');
                    } else {
                        input = modal.querySelector('.announcement-file-input');
                    }
                }
                if (input) input.value = '';
                preview.classList.remove('show');
                preview.style.display = 'none';
                // Also clear the preview image if present
                const img = preview.querySelector('img');
                if (img) img.src = '';
            }
        }
    });

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            performSearch();
        });
    }

    function performSearch() {
        const searchQuery = searchInput.value.trim();
        const url = new URL(window.location);
        
        if (searchQuery) {
            url.searchParams.set('search', searchQuery);
        } else {
            url.searchParams.delete('search');
        }
        
        url.searchParams.delete('page');
        window.location.href = url.toString();
    }

    function handleImagePreview(file, previewId) {
        const preview = document.getElementById(previewId);
        
        if (!file) {
            preview.classList.remove('show');
            preview.style.display = 'none';
            return;
        }
        // Validate file type (only JPG, JPEG, PNG)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Please select a JPG, JPEG, or PNG image only.', 'error');
            // Clear the input
            const modal = preview.closest('.modal');
            const input = modal.querySelector('.announcement-file-input');
            if (input) input.value = '';
            preview.classList.remove('show');
            preview.style.display = 'none';
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showToast('Image size must be less than 20MB.', 'error');
            // Clear the input
            const modal = preview.closest('.modal');
            const input = modal.querySelector('.announcement-file-input');
            if (input) input.value = '';
            preview.classList.remove('show');
            preview.style.display = 'none';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <div class="image-preview">
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-image-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            preview.classList.add('show');
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function showErrors(errors, form) {
        // Clear all existing errors
        form.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
            el.classList.remove('show');
        });
        
        // Show new errors
        for (const [field, error] of Object.entries(errors)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                const errorEl = input.parentElement.querySelector('.field-error');
                if (errorEl) {
                    errorEl.textContent = Array.isArray(error) ? error[0] : error;
                    errorEl.classList.add('show');
                }
            }
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${icons[type]}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

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

    function updateRelativeTimes() {
        document.querySelectorAll('.post-time').forEach(element => {
            const isoTime = element.dataset.time;
            if (isoTime) {
                const date = new Date(isoTime);
                const now = new Date();
                const diff = now - date;
                const seconds = Math.floor(diff / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                
                let relativeTime;
                if (days > 7) {
                    relativeTime = date.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                } else if (days > 0) {
                    relativeTime = `${days} day${days > 1 ? 's' : ''} ago`;
                } else if (hours > 0) {
                    relativeTime = `${hours} hour${hours > 1 ? 's' : ''} ago`;
                } else if (minutes > 0) {
                    relativeTime = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                } else {
                    relativeTime = 'Just now';
                }
                
                element.textContent = relativeTime;
            }
        });
    }

    updateRelativeTimes();
    setInterval(updateRelativeTimes, 60000);
});