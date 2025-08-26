console.log('feedback.js loaded');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready - initializing feedback admin');
    initializeFeedbackAdmin();
});

function initializeFeedbackAdmin() {
    initializeSearch();
    initializeDropdowns();
    initializeExportModal();
    initializeFeedbackDetailModal();
    initializePagination();
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function() {
                searchForm.submit();
            }, 500);
        });
    }
}

function initializeDropdowns() {
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            const isOpen = dropdown.classList.contains('open');
            
            closeAllDropdowns();
            
            if (!isOpen) {
                dropdown.classList.add('open');
                
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu) {
                    menu.classList.add('show');
                }
            }
        });
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });
}

function closeAllDropdowns() {
    const openDropdowns = document.querySelectorAll('.dropdown.open');
    openDropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (menu) {
            menu.classList.remove('show');
        }
    });
}

function initializeExportModal() {
    const exportBtn = document.getElementById('exportBtn');
    const exportModal = document.getElementById('exportModal');
    const exportForm = document.getElementById('exportForm');
    console.log('initializeExportModal: exportBtn=', exportBtn, 'exportModal=', exportModal, 'exportForm=', exportForm);
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            openExportModal();
        });
    }
    
    if (exportForm) {
        exportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            // submit button may live outside the form (uses form="exportForm"), so try both
            let submitBtn = this.querySelector('button[type="submit"]');
            if (!submitBtn && this.id) {
                submitBtn = document.querySelector(`button[form="${this.id}"][type="submit"]`);
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            }
            
            fetch(this.action, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                const contentType = response.headers.get('content-type') || '';
                // If backend returned JSON (error or message), parse and show it
                if (contentType.indexOf('application/json') !== -1) {
                    return response.json().then(json => { throw json; });
                }

                if (response.ok) {
                    return response.blob();
                }

                throw new Error('Export failed');
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `feedback_report_${formData.get('start_date')}_to_${formData.get('end_date')}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showNotification('Export completed successfully!', 'success');
                closeExportModal();
            })
            .catch(error => {
                console.error('Export error:', error);
                // If backend returned JSON with message, surface it
                if (error && typeof error === 'object' && error.error) {
                    showNotification(error.error, 'error');
                } else if (error && typeof error === 'object' && error.message) {
                    showNotification(error.message, 'error');
                } else {
                    showNotification('Export failed. Please try again.', 'error');
                }
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-download"></i> Export Excel';
                }
            });
        });
    }
}

function initializeFeedbackDetailModal() {
    window.currentFeedbackId = null;
}

function viewFeedbackDetail(feedbackId) {
    const modal = document.getElementById('feedbackDetailModal');
    const modalBody = document.getElementById('feedbackDetailBody');
    if (!modal || !modalBody) return;

    window.currentFeedbackId = feedbackId;

    // Insert server-rendered HTML block into modal body
    const serverBlock = document.getElementById(`feedback-detail-${feedbackId}`);
    if (serverBlock) {
        modalBody.innerHTML = serverBlock.innerHTML;
        modal.classList.add('show');
        document.body.classList.add('modal-open');

        // Wire admin notes form submit handler for this instance
        const adminForm = modalBody.querySelector('.admin-notes-form');
        if (adminForm) {
            const feedbackIdAttr = adminForm.querySelector('.admin-notes-save-btn')?.getAttribute('data-feedback-id') || feedbackId;
            adminForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveAdminNotes(feedbackIdAttr, adminForm);
            });
        }
    } else {
        showNotification('Feedback detail not available', 'error');
    }
}

function renderFeedbackDetail(feedback) {
    const modalBody = document.getElementById('feedbackDetailBody');
    
    const statusBadge = feedback.is_read ? 
        '<span class="badge badge-green">Read</span>' : 
        '<span class="badge badge-routing">Unread</span>';
    
    const anonymousBadge = feedback.is_anonymous ? 
        '<span class="badge badge-routing">Anonymous</span>' : '';
    
    modalBody.innerHTML = `
        <div class="details-header">
            <div>
                <h3 class="details-id">${feedback.subject}</h3>
                <p class="details-date">Submitted on ${feedback.created_at}</p>
            </div>
            <div>
                ${anonymousBadge}
                ${statusBadge}
            </div>
        </div>

        <div class="details-section">
            <h4 class="details-section-title">Submitter Information</h4>
            <div class="details-grid">
                <div>
                    <div class="details-label">Name</div>
                    <div class="details-value">${feedback.display_name}</div>
                </div>
                <div>
                    <div class="details-label">Email</div>
                    <div class="details-value">${feedback.display_email}</div>
                </div>
                <div>
                    <div class="details-label">Submission Type</div>
                    <div class="details-value">
                        ${feedback.is_anonymous ? 'Anonymous Feedback' : 'Named Feedback'}
                    </div>
                </div>
                <div>
                    <div class="details-label">Status</div>
                    <div class="details-value">
                        ${feedback.is_read ? '<span class="status-pill status-gray">Read</span>' : '<span class="status-pill status-green">Unread</span>'}
                    </div>
                </div>
            </div>
        </div>

        <div class="details-section details-details">
            <h4 class="details-section-title">Feedback Content</h4>
            <div class="details-grid">
                <div>
                    <div class="details-label">Subject</div>
                    <div class="details-value">${feedback.subject}</div>
                </div>
                <div>
                    <div class="details-label">Date Submitted</div>
                    <div class="details-value">${feedback.created_at}</div>
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <div class="details-label">Message</div>
                <div class="details-value" style="white-space: pre-wrap; background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); margin-top: 0.5rem;">${feedback.message}</div>
            </div>
        </div>

        <div class="details-section">
            <h4 class="details-section-title">Administrative Notes</h4>
            <form id="adminNotesForm">
                <div class="form-group">
                    <textarea name="admin_notes" class="form-input" placeholder="Add administrative notes..." rows="4">${feedback.admin_notes}</textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i>
                        Save Notes
                    </button>
                </div>
            </form>
        </div>

        <div class="details-section">
            <h4 class="details-section-title">Timeline</h4>
            <div class="timeline">
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h5>Feedback Submitted</h5>
                        <p>${feedback.created_at}</p>
                    </div>
                </div>
                ${feedback.is_read ? `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h5>Feedback Reviewed</h5>
                        <p>${feedback.updated_at}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    const adminNotesForm = document.getElementById('adminNotesForm');
    if (adminNotesForm) {
        adminNotesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAdminNotes(feedback.id);
        });
    }
}

function saveAdminNotes(feedbackId, formElement) {
    const form = formElement || document.getElementById('adminNotesForm');
    if (!form) return;
    const textarea = form.querySelector('textarea[name="admin_notes"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    const formData = new FormData();
    formData.append('admin_notes', textarea ? textarea.value : '');
    formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

    fetch(`/feedback/detail/${feedbackId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Admin notes updated successfully', 'success');
        } else {
            showNotification('Failed to update admin notes', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving notes:', error);
        showNotification('Error saving admin notes', 'error');
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Notes';
        }
    });
}

function closeFeedbackDetailModal() {
    const modal = document.getElementById('feedbackDetailModal');
    if (!modal) {
        window.currentFeedbackId = null;
        return;
    }

    // If modal isn't visible, just ensure state reset
    if (!modal.classList.contains('show')) {
        window.currentFeedbackId = null;
        return;
    }

    // Add closing class to play zoom-out animation, then remove modal after animation ends
    modal.classList.add('closing');

    const cleanup = () => {
        modal.classList.remove('show');
        modal.classList.remove('closing');
        document.body.classList.remove('modal-open');
        window.currentFeedbackId = null;
        modal.removeEventListener('animationend', onAnimEnd);
    };

    const onAnimEnd = (e) => {
        // Ensure we only react to modal-content animation
        cleanup();
    };

    modal.addEventListener('animationend', onAnimEnd);
}

function openExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        const startDateInput = modal.querySelector('input[name="start_date"]');
        const endDateInput = modal.querySelector('input[name="end_date"]');
        
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        if (startDateInput) {
            startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        if (endDateInput) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (!modal) return;

    if (!modal.classList.contains('show')) return;

    modal.classList.add('closing');

    const onAnimEnd = () => {
        modal.classList.remove('show');
        modal.classList.remove('closing');
        document.body.classList.remove('modal-open');
        modal.removeEventListener('animationend', onAnimEnd);
    };

    modal.addEventListener('animationend', onAnimEnd);
}

function initializePagination() {
    const paginationLinks = document.querySelectorAll('.pagination-btn');
    
    paginationLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!this.classList.contains('active')) {
                const currentUrl = new URL(window.location.href);
                const targetUrl = new URL(this.href);
                
                const searchQuery = currentUrl.searchParams.get('search');
                if (searchQuery) {
                    targetUrl.searchParams.set('search', searchQuery);
                    this.href = targetUrl.toString();
                }
            }
        });
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast toast-${type}`;
    notification.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="message-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

window.viewFeedbackDetail = viewFeedbackDetail;
window.closeFeedbackDetailModal = closeFeedbackDetailModal;
window.closeExportModal = closeExportModal;
            
