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
                            <p>Current Image:</p>
                            <img src="${announcement.image}" alt="Current image">
                        `;
                        currentImageContainer.classList.add('show');
                    } else {
                        currentImageContainer.classList.remove('show');
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
            const card = this.closest('.announcement-card');
            const title = card.querySelector('.announcement-title').textContent;
            
            document.getElementById('deleteDetails').textContent = `"${title}"`;
            
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

    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const emoji = this.dataset.emoji;
            const announcementId = this.dataset.announcement;
            
            try {
                const response = await fetch(`/announcement/react/${announcementId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `emoji=${emoji}`
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const card = document.querySelector(`.announcement-card[data-id="${announcementId}"]`);
                    const buttons = card.querySelectorAll('.reaction-btn');
                    
                    buttons.forEach(b => {
                        if (b.dataset.emoji === emoji) {
                            if (data.removed) {
                                b.classList.remove('active');
                            } else {
                                b.classList.add('active');
                            }
                        } else {
                            b.classList.remove('active');
                        }
                    });
                    
                    const summaryContainer = card.querySelector('.reactions-summary');
                    if (data.total_reactions > 0) {
                        summaryContainer.innerHTML = `
                            <span class="total-reactions">${data.total_reactions} reaction${data.total_reactions > 1 ? 's' : ''}</span>
                        `;
                    } else {
                        summaryContainer.innerHTML = '';
                    }
                }
            } catch (error) {
                showToast('Failed to update reaction.', 'error');
            }
        });
    });


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
        if (e.target.classList.contains('remove-image-btn')) {
            const modal = e.target.closest('.modal');
            const input = modal.querySelector('.announcement-file-input');
            const preview = e.target.closest('.image-preview-container');
            
            if (input) input.value = '';
            if (preview) {
                preview.classList.remove('show');
                preview.style.display = 'none';
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
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB.', 'error');
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