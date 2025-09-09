document.addEventListener('DOMContentLoaded', function() {
    console.log('Training JS loaded successfully');
    
    window.expandedTraining = null; // Track currently expanded training item globally
    
    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Status filter functionality for training evaluations
    const statusFilter = document.getElementById('statusFilter');
    const trainingItems = document.querySelectorAll('#trainingsList .training-item');

    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const filter = this.value;
            filterTrainingItems(trainingItems, filter);
        });
    }

    // Status filter functionality for approvals
    const approvalsStatusFilter = document.getElementById('approvalsStatusFilter');
    const approvalItems = document.querySelectorAll('#approvalsList .training-item');

    if (approvalsStatusFilter) {
        approvalsStatusFilter.addEventListener('change', function() {
            const filter = this.value;
            filterTrainingItems(approvalItems, filter);
        });
    }

    // Training card expand/collapse functionality
    setupTrainingExpansion();
    
    function setupTrainingExpansion() {
        const trainingItems = document.querySelectorAll('.training-item');
        
        trainingItems.forEach(item => {
            // Only setup hover behavior on devices that support hover (desktop)
            if (window.matchMedia('(hover: hover)').matches && window.innerWidth > 992) {
                item.addEventListener('mouseenter', function() {
                    if (window.expandedTraining && window.expandedTraining !== this) {
                        collapseTraining(window.expandedTraining);
                    }
                    expandTraining(this);
                });
                
                // Collapse on unhover only on desktop
                item.addEventListener('mouseleave', function() {
                    if (item.classList.contains('expanded')) {
                        collapseTraining(item);
                    }
                });
            }
            
            // Click or keyboard toggle on header to expand/collapse
            const header = item.querySelector('.training-header');
            const brief = item.querySelector('.training-brief');
            
            if (header) {
                header.addEventListener('click', function(e) {
                    // Avoid toggling when clicking on a control inside the header
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    e.preventDefault(); // Prevent any default behavior
                    e.stopPropagation(); // Stop event bubbling
                    toggleTrainingExpansion(item);
                });
                
                // Add touch support for mobile devices
                header.addEventListener('touchend', function(e) {
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTrainingExpansion(item);
                });
                
                header.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.click();
                    }
                });
            }
            
            // Also allow clicking on the brief description to expand
            if (brief) {
                brief.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTrainingExpansion(item);
                });
                
                // Add touch support for brief description
                brief.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTrainingExpansion(item);
                });
            }
        });
    }
    
    function expandTraining(trainingItem) {
        if (window.expandedTraining === trainingItem) return;

        // Collapse previously expanded training
        if (window.expandedTraining) {
            collapseTraining(window.expandedTraining);
        }

        // Expand current training
        trainingItem.classList.add('expanded');
        window.expandedTraining = trainingItem;
    }
    
    function collapseTraining(trainingItem) {
        if (!trainingItem) return;
        
        trainingItem.classList.remove('expanded');
        if (window.expandedTraining === trainingItem) {
            window.expandedTraining = null;
        }
    }
    
    function toggleTrainingExpansion(item) {
        if (item.classList.contains('expanded')) {
            collapseTraining(item);
        } else {
            // On mobile, collapse any previously expanded training before expanding new one
            if (isMobileView() && window.expandedTraining && window.expandedTraining !== item) {
                collapseTraining(window.expandedTraining);
            }
            expandTraining(item);
        }
    }
    
    function isMobileView() {
        // Check both screen width and if the device has hover capability
        return window.innerWidth <= 992 || !window.matchMedia('(hover: hover)').matches;
    }

    // Action button handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('start-evaluation-btn')) {
            const trainingId = e.target.getAttribute('data-training-id');
            handleStartEvaluation(trainingId, e.target);
        }
        
        if (e.target.classList.contains('view-evaluation-btn')) {
            const trainingId = e.target.getAttribute('data-training-id');
            handleViewSubmittedEvaluation(trainingId, e.target);
        }
        
        if (e.target.classList.contains('review-evaluation-participant-btn')) {
            const trainingId = e.target.getAttribute('data-training-id');
            handleParticipantReviewEvaluation(trainingId, e.target);
        }
        
        if (e.target.classList.contains('confirm-evaluation-btn')) {
            const trainingId = e.target.getAttribute('data-training-id');
            if (trainingId) {
                handleConfirmEvaluation(trainingId);
            }
        }
        
        if (e.target.classList.contains('check-evaluation-btn')) {
            const trainingId = e.target.getAttribute('data-training-id');
            handleCheckEvaluation(trainingId, e.target);
        }
        
        if (e.target.classList.contains('evaluate-subordinate-btn')) {
            const evaluationId = e.target.getAttribute('data-evaluation-id');
            const routingId = e.target.getAttribute('data-routing-id');
            if (routingId) {
                // This is a manager review
                handleReviewEvaluation(evaluationId, routingId);
            } else {
                // This is a supervisor evaluation
                handleEvaluateSubordinate(evaluationId, e.target);
            }
        }
        
        if (e.target.id === 'reviewEvaluationBtn' || e.target.closest('#reviewEvaluationBtn')) {
            const evaluationId = e.target.getAttribute('data-evaluation-id') || e.target.closest('#reviewEvaluationBtn').getAttribute('data-evaluation-id');
            if (evaluationId) {
                handleReviewEvaluation(evaluationId);
            }
        }
    });

    // Initialize
    updateStats();
});

// Handle supervisor evaluation of subordinate
function handleEvaluateSubordinate(evaluationId, buttonElement) {
    console.log('Loading supervisor evaluation for evaluation ID:', evaluationId);
    
    // Show loading state
    const contentArea = document.getElementById('approvalsContentArea');
    if (!contentArea) {
        console.error('Content area not found');
        return;
    }
    
    contentArea.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading supervisor assessment...</p>
        </div>
    `;
    
    // Fetch the supervisor assessment form
    fetch(`/training/supervisor/evaluation/${evaluationId}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            contentArea.innerHTML = data.html;
            
            // Add mobile back button for approvals content
            addMobileBackButtonForApprovals(contentArea);
            showContentArea();
            
            // Handle form submission
            const form = document.getElementById('supervisorAssessmentForm');
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    handleSupervisorAssessmentSubmit(form);
                });
            }
        } else {
            throw new Error(data.error || 'Failed to load supervisor assessment');
        }
    })
    .catch(error => {
        console.error('Error loading supervisor assessment:', error);
        contentArea.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Assessment</h3>
                <p>Failed to load the supervisor assessment form. Please try again.</p>
                <button class="btn btn-primary" onclick="handleEvaluateSubordinate('${evaluationId}', this)">
                    <i class="fas fa-retry"></i>
                    Retry
                </button>
            </div>
        `;
        
        showToast('Failed to load supervisor assessment. Please try again.', 'error');
    });
}

// Handle supervisor assessment form submission
function handleSupervisorAssessmentSubmit(form) {
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Supervisor assessment submitted successfully!', 'success');
            
            // Go back to the approvals list
            goBackToApprovals();
            
            // Refresh the page to update counts
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(data.error || 'Failed to submit assessment');
        }
    })
    .catch(error => {
        console.error('Error submitting supervisor assessment:', error);
        showToast('Failed to submit assessment. Please try again.', 'error');
        
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    });
}

// Go back to approvals list
function goBackToApprovals() {
    // Clear the content area and show the welcome state
    const contentArea = document.getElementById('approvalsContentArea');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="welcome-state">
                <div class="welcome-icon">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <h3>For Evaluation Dashboard</h3>
                <p>Select a training evaluation from the left panel to begin your review process.</p>
                <div class="welcome-stats">
                    <div class="stat-item">
                        <div class="stat-value">${document.querySelectorAll('#approvalsList .training-item').length}</div>
                        <div class="stat-label">Pending Reviews</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // On mobile/tablet, hide the content column to show the trainings list
    const container = document.querySelector('.dashboard-container');
    if (container && isMobileView()) {
        container.classList.remove('show-content');
    }
}

// Go back to trainings list
function goBackToTrainingsList() {
    const container = document.querySelector('.dashboard-container');
    if (container && isMobileView()) {
        // On mobile/tablet, remove show-content to reveal trainings-column
        container.classList.remove('show-content');
        // Scroll to trainings-column
        const trainingsColumn = document.querySelector('.trainings-column');
        if (trainingsColumn) {
            trainingsColumn.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // On desktop, show the welcome state in content area
        showDashboard();
    }
}

// Update statistics
function updateStats() {
    // Use backend-provided statistics instead of counting DOM elements
    // since DOM doesn't reflect the true submitted vs pending state
    const totalTrainings = typeof TRAINING_STATS !== 'undefined' ? TRAINING_STATS.total : 
                          document.querySelectorAll('#trainingsList .training-item').length;
    const completedTrainings = typeof TRAINING_STATS !== 'undefined' ? TRAINING_STATS.completed : 
                              document.querySelectorAll('#trainingsList .training-item[data-status="submitted"], #trainingsList .training-item[data-status="completed"]').length;
    const pendingTrainings = typeof TRAINING_STATS !== 'undefined' ? TRAINING_STATS.pending : 
                            document.querySelectorAll('#trainingsList .training-item[data-status="pending"]').length;

    // Update the stats in the welcome state
    const totalElement = document.getElementById('totalTrainings');
    const completedElement = document.getElementById('completedTrainings');
    const pendingElement = document.getElementById('pendingTrainings');

    if (totalElement) totalElement.textContent = totalTrainings;
    if (completedElement) completedElement.textContent = completedTrainings;
    if (pendingElement) pendingElement.textContent = pendingTrainings;
}

// Handle starting a training evaluation
function handleStartEvaluation(trainingId, btn) {
    console.log('handleStartEvaluation: starting for trainingId=', trainingId);
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Load training evaluation
    fetch(`/training/evaluation/${trainingId}/`)
        .then(response => {
            const ct = response.headers.get('content-type') || '';
            console.log(`evaluation response: status=${response.status}, content-type=${ct}`);
            if (!response.ok) {
                return response.text().then(t => { throw new Error('Network error: ' + response.status + ' - ' + t); });
            }
            if (!ct.includes('application/json')) {
                return response.text().then(t => { throw new Error('Non-JSON response: ' + t); });
            }
            return response.json();
        })
        .then(data => {
            console.log('evaluation payload:', data);
            try {
                displayTrainingEvaluation(data, btn);
            } catch (err) {
                console.error('Error rendering evaluation:', err);
                showErrorMessage('Failed to render training evaluation. See console for details.');
            }
        })
        .catch(error => {
            console.error('Error loading evaluation:', error);
            showErrorMessage('Failed to load training evaluation. Please try again.');
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

// Display training evaluation in content area
function displayTrainingEvaluation(data, originBtn) {
    const training = data.training;
    const evaluationId = data.evaluation_id;
    const formHtml = data.form_html;
    
    // Render into content area
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="training-evaluation-content show">
            <div class="training-content-header">
                <h2 class="training-content-title">${training.title}</h2>
                <p class="training-content-description">${training.objective || ''}</p>
                <div class="training-meta-info">
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>Speaker: ${training.speaker}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>Date: ${new Date(training.training_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div class="training-content-body">
                <form id="trainingEvaluationForm" method="post" action="/training/evaluation/submit/${evaluationId}/">
                    ${formHtml}
                </form>
            </div>
            <div class="training-content-actions">
                <button class="btn btn-outline close-evaluation-btn">Close</button>
                <button class="btn btn-primary submit-evaluation-btn" type="submit" form="trainingEvaluationForm">
                    <i class="fas fa-paper-plane"></i>
                    Submit Evaluation
                </button>
            </div>
        </div>
    `;
    
    // Setup form submission
    setupEvaluationForm();
    
    // Add mobile back button and show content area on mobile
    addMobileBackButton(contentArea);
    showContentArea();
}

// Setup evaluation form submission
function setupEvaluationForm() {
    const form = document.getElementById('trainingEvaluationForm');
    if (!form) return;
    
    // Setup star rating functionality
    setupStarRatings(form);
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const submitBtn = document.querySelector('.submit-evaluation-btn');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage(data.message || 'Training evaluation submitted successfully!');
                // Reload the page to update the training list
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showErrorMessage(data.message || 'Failed to submit evaluation.');
            }
        })
        .catch(error => {
            console.error('Error submitting evaluation:', error);
            showErrorMessage('Failed to submit evaluation. Please try again.');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    });
}

// Setup star rating interactivity
function setupStarRatings(container) {
    // Handle both old .rating-stars and new .rating-stars-row structures
    const ratingContainers = container.querySelectorAll('.rating-stars, .rating-stars-row');
    
    ratingContainers.forEach(starsEl => {
        const questionName = starsEl.dataset.questionName;
        const hiddenInput = container.querySelector(`input[type="hidden"][name="${questionName}"]`);
        
        if (!hiddenInput) {
            console.warn(`Hidden input not found for question: ${questionName}`);
            return;
        }
        
        const starEls = Array.from(starsEl.querySelectorAll('.rating-star'));

        function setVisual(value) {
            starEls.forEach(star => {
                const starValue = parseInt(star.dataset.value, 10);
                if (starValue <= value) {
                    star.classList.remove('empty');
                    star.classList.add('filled');
                } else {
                    star.classList.remove('filled');
                    star.classList.add('empty');
                }
            });
        }

        // Initialize from hidden input value
        const initialValue = parseInt(hiddenInput.value, 10) || 0;
        if (initialValue > 0) {
            setVisual(initialValue);
        }

        // Hover preview
        starEls.forEach(star => {
            star.addEventListener('mouseenter', function() {
                const value = parseInt(this.dataset.value, 10) || 0;
                setVisual(value);
            });
            
            star.addEventListener('mouseleave', function() {
                // Restore from hidden input value
                const currentValue = parseInt(hiddenInput.value, 10) || 0;
                setVisual(currentValue);
            });
            
            // Click to set rating
            star.addEventListener('click', function() {
                const value = parseInt(this.dataset.value, 10) || 0;
                hiddenInput.value = value;
                setVisual(value);
                
                // Add a brief highlight effect
                this.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });

        // Make star cells clickable for better UX (new table structure)
        starsEl.querySelectorAll('.rating-star-cell').forEach(cell => {
            cell.addEventListener('click', function() {
                const star = this.querySelector('.rating-star');
                if (star) {
                    star.click();
                }
            });
        });

        // Also make star wrapper clickable for better UX (old structure)
        starsEl.querySelectorAll('.rating-star-wrapper').forEach(wrapper => {
            wrapper.addEventListener('click', function() {
                const star = this.querySelector('.rating-star');
                if (star) {
                    star.click();
                }
            });
        });
    });
}

// Handle viewing submitted evaluation
function handleViewSubmittedEvaluation(trainingId) {
    console.log('Viewing submitted evaluation for training:', trainingId);
    
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) {
        console.error('Content area not found');
        showErrorMessage('Unable to display evaluation');
        return;
    }
    
    const loadingHtml = `
        <div class="loading-content">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                <p>Loading evaluation...</p>
            </div>
        </div>
    `;
    
    contentArea.innerHTML = loadingHtml;
    showContentArea();
    
    fetch(`/training/evaluation/view/${trainingId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                contentArea.innerHTML = data.html;
                
                // Add mobile back button and show content area on mobile
                addMobileBackButton(contentArea);
                showContentArea();
                
            } else {
                console.error('Failed to load evaluation:', data.message);
                showErrorMessage(data.message || 'Failed to load evaluation');
            }
        })
        .catch(error => {
            console.error('Error loading submitted evaluation:', error);
            showErrorMessage('Failed to load evaluation. Please try again.');
        });
}

// Handle checking evaluation (for participant_reviewed status)
function handleCheckEvaluation(trainingId, buttonElement) {
    console.log('Checking evaluation for training:', trainingId);
    
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) {
        console.error('Content area not found');
        showErrorMessage('Unable to display evaluation');
        return;
    }
    
    const loadingHtml = `
        <div class="loading-content">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                <p>Loading evaluation details...</p>
            </div>
        </div>
    `;
    
    contentArea.innerHTML = loadingHtml;
    showContentArea();
    
    fetch(`/training/evaluation/view/${trainingId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                contentArea.innerHTML = data.html;
                
                // Add mobile back button and show content area on mobile
                addMobileBackButton(contentArea);
                showContentArea();
                
            } else {
                console.error('Failed to load evaluation:', data.message);
                showErrorMessage(data.message || 'Failed to load evaluation');
            }
        })
        .catch(error => {
            console.error('Error loading evaluation:', error);
            showErrorMessage('Failed to load evaluation. Please try again.');
        });
}

// Close evaluation and return to dashboard
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('close-evaluation-btn')) {
        showDashboard();
    }
});

// Show dashboard (welcome state)
function showDashboard() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <h3>Welcome to Your Training Dashboard</h3>
            <p>Select a training evaluation from the left panel to get started. Click "Start Evaluation" to begin completing your assigned training evaluations.</p>
            <div class="welcome-stats">
                <div class="stat-item">
                    <div class="stat-value" id="totalTrainings">${TRAINING_STATS.total}</div>
                    <div class="stat-label">Total Trainings</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="completedTrainings">${TRAINING_STATS.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="pendingTrainings">${TRAINING_STATS.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
            </div>
        </div>
    `;
}

// Mobile navigation functions
function addMobileBackButton(contentArea) {
    if (!isMobileView()) return;
    
    // Check if back button already exists
    let backButton = contentArea.querySelector('.mobile-back-btn');
    
    if (backButton) {
        // If button exists, just add the event listener
        backButton.addEventListener('click', function() {
            goBackToTrainingsList();
        });
        backButton.style.display = 'block'; // Ensure it's visible
        return;
    }
    
    // Create new button if it doesn't exist
    backButton = document.createElement('button');
    backButton.className = 'btn btn-outline mobile-back-btn';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Dashboard';
    backButton.style.display = 'block'; // Explicitly show on mobile
    backButton.addEventListener('click', function() {
        goBackToTrainingsList();
    });
    
    // Find the actions container and add the button there
    const actionsContainer = contentArea.querySelector('.training-content-actions');
    if (actionsContainer) {
        // Insert before the submit button
        const submitButton = actionsContainer.querySelector('.submit-evaluation-btn');
        if (submitButton) {
            actionsContainer.insertBefore(backButton, submitButton);
        } else {
            actionsContainer.appendChild(backButton);
        }
    } else {
        // Fallback: Insert at the beginning of content
        contentArea.insertBefore(backButton, contentArea.firstChild);
    }
}

// Mobile back button for approvals content area
function addMobileBackButtonForApprovals(contentArea) {
    if (!isMobileView()) return;
    
    // Check if back button already exists
    let backButton = contentArea.querySelector('.mobile-back-btn');
    
    if (backButton) {
        // If button exists, just add the event listener
        backButton.addEventListener('click', function() {
            goBackToApprovals();
        });
        backButton.style.display = 'block'; // Ensure it's visible
        return;
    }
    
    // Create new button if it doesn't exist
    backButton = document.createElement('button');
    backButton.className = 'btn btn-outline mobile-back-btn';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
    backButton.style.display = 'block'; // Explicitly show on mobile
    backButton.addEventListener('click', function() {
        goBackToApprovals();
    });
    
    // Find the actions container and add the button there
    const actionsContainer = contentArea.querySelector('.evaluation-form-actions');
    if (actionsContainer) {
        // Insert before the submit button
        const submitButton = actionsContainer.querySelector('.confirm-evaluation-btn, .btn-primary');
        if (submitButton) {
            actionsContainer.insertBefore(backButton, submitButton);
        } else {
            actionsContainer.appendChild(backButton);
        }
    } else {
        // Fallback: Insert at the beginning of content
        contentArea.insertBefore(backButton, contentArea.firstChild);
    }
}

function showContentArea() {
    const container = document.querySelector('.dashboard-container');
    if (container && isMobileView()) {
        container.classList.add('show-content');
    }
    // Adjust action buttons inside content for current viewport
    try {
        const contentArea = document.getElementById('contentArea');
        const approvalsArea = document.getElementById('approvalsContentArea');
        if (contentArea) adjustContentActionButtons(contentArea);
        if (approvalsArea) adjustContentActionButtons(approvalsArea);
    } catch (err) {
        console.warn('adjustContentActionButtons error:', err);
    }
}

// Toggle visibility of Back/Back to List/Close buttons inside a content area
function adjustContentActionButtons(contentArea) {
    if (!contentArea) return;
    const isMobile = isMobileView();

    // Mobile 'Back' button (usually inserted by addMobileBackButton)
    const mobileBack = contentArea.querySelector('.mobile-back-btn');

    // 'Back to List' button used on desktop in view_submitted_evaluation.html
    const backToList = contentArea.querySelector('button[onclick*="goBackToTrainingsList"]');

    // 'Close' button used in evaluation form view
    const closeBtn = contentArea.querySelector('.close-evaluation-btn') || contentArea.querySelector('button.close-evaluation-btn');

    // Supervisor/modal close buttons that use data-action="close-modal"
    const modalClose = contentArea.querySelector('button[data-action="close-modal"]');

    // Apply visibility
    if (mobileBack) {
        if (isMobile) {
            // On mobile, ensure it's visible
            mobileBack.style.display = 'block';
        } else {
            // On desktop, hide it
            mobileBack.style.display = 'none';
        }
    }
    if (backToList) backToList.style.display = isMobile ? 'none' : '';

    // For form close button: hide on mobile, show on desktop
    if (closeBtn) closeBtn.style.display = isMobile ? 'none' : '';

    // If there is a generic modal close control, hide on mobile when content is shown (since mobile uses Back)
    if (modalClose) modalClose.style.display = isMobile ? 'none' : '';
}

// Update buttons when window resizes
window.addEventListener('resize', function() {
    const contentArea = document.getElementById('contentArea');
    const approvalsArea = document.getElementById('approvalsContentArea');
    if (contentArea) adjustContentActionButtons(contentArea);
    if (approvalsArea) adjustContentActionButtons(approvalsArea);
});

function isMobileView() {
    return window.innerWidth <= 992 || !window.matchMedia('(hover: hover)').matches;
}

// Utility functions for messages
function showErrorMessage(message) {
    console.log('showErrorMessage called:', message);
    showToast(message, 'error');
}

function showSuccessMessage(message) {
    console.log('showSuccessMessage called:', message);
    showToast(message, 'success');
}

// Create a robust toast function that doesn't depend on portalUI
function showToast(message, type = 'success', duration = 5000) {
    console.log('showToast called:', { message, type, duration });
    console.log('window.portalUI available:', !!window.portalUI);
    
    // Try to use portalUI first if available
    if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
        console.log('Using portalUI.showNotification');
        window.portalUI.showNotification(message, type, duration);
        return;
    }
    
    // Fallback: create our own toast
    console.log('Using custom toast');
    createCustomToast(message, type, duration);
}

function createCustomToast(message, type, duration = 5000) {
    // Get or create toast container
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    // Get icon based on type
    let icon;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            icon = 'fas fa-info-circle';
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; color: inherit;">
            <i class="${icon}" style="margin-right: 8px;"></i>
            <span class="message-text" style="color: inherit; font-weight: 500;">${message}</span>
        </div>
        <button type="button" class="message-close" aria-label="Close">&times;</button>
    `;
    
    // Add close functionality
    const closeBtn = toast.querySelector('.message-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
        toast.style.transition = 'all 0.3s ease-out';
    });
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
    
    return toast;
}

function removeToast(toast) {
    if (toast && toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Filter training items with smooth animation effects
function filterTrainingItems(items, filter) {
    items.forEach(item => {
        const status = item.getAttribute('data-status');

        if (filter === 'all' || status === filter) {
            // Show item with animation
            item.style.display = 'block';
            // Use setTimeout to ensure display:block is applied before animation
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 50);
        } else {
            // Hide item with animation - also collapse if expanded
            if (item.classList.contains('expanded')) {
                item.classList.remove('expanded');
                // Update global tracking if this was the expanded item
                if (window.expandedTraining === item) {
                    window.expandedTraining = null;
                }
            }
            item.style.opacity = '0';
            item.style.transform = 'translateY(-10px)';
            // Hide after animation completes
            setTimeout(() => {
                item.style.display = 'none';
            }, 200);
        }
    });
}

// Handle participant review evaluation (for supervisor_reviewed status)
function handleParticipantReviewEvaluation(trainingId, buttonElement) {
    console.log('Participant reviewing evaluation for training:', trainingId);
    
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) {
        console.error('Content area not found');
        showErrorMessage('Unable to display evaluation');
        return;
    }
    
    const loadingHtml = `
        <div class="loading-content">
            <div class="text-center">
                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                <p>Loading evaluation for review...</p>
            </div>
        </div>
    `;
    
    contentArea.innerHTML = loadingHtml;
    showContentArea();
    
    fetch(`/training/evaluation/view/${trainingId}/?participant_review=true`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                contentArea.innerHTML = data.html;
                
                // Add mobile back button and show content area on mobile
                addMobileBackButton(contentArea);
                showContentArea();
                
                // Add confirm evaluation button click handler
                const confirmBtn = contentArea.querySelector('.confirm-evaluation-btn');
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', function() {
                        handleConfirmEvaluation(trainingId);
                    });
                }
                
            } else {
                console.error('Failed to load evaluation:', data.message);
                showErrorMessage(data.message || 'Failed to load evaluation');
            }
        })
        .catch(error => {
            console.error('Error loading evaluation for review:', error);
            showErrorMessage('Failed to load evaluation. Please try again.');
        });
}

// Handle confirm evaluation
function handleConfirmEvaluation(trainingId) {
    console.log('Confirming evaluation for training:', trainingId);
    
    // Show confirmation modal
    showConfirmEvaluationModal(trainingId);
}

// Show confirmation modal
function showConfirmEvaluationModal(trainingId) {
    const modal = document.getElementById('confirmEvaluationModal');
    if (!modal) {
        console.error('Confirm evaluation modal not found');
        return;
    }

    // Store training ID for later use
    modal.setAttribute('data-training-id', trainingId);
    
    // Show modal with animation
    document.body.classList.add('modal-open');
    modal.classList.add('show');
    
    // Setup modal event handlers
    setupConfirmModalHandlers(modal, trainingId);
}

// Setup modal event handlers
function setupConfirmModalHandlers(modal, trainingId) {
    // Remove existing event listeners to prevent duplicates
    modal.removeEventListener('click', handleModalClick);
    modal.addEventListener('click', handleModalClick);
    
    function handleModalClick(e) {
        // Close modal when clicking overlay or close buttons
        if (e.target.classList.contains('modal-overlay') || 
            e.target.getAttribute('data-action') === 'close-modal' ||
            e.target.closest('[data-action="close-modal"]')) {
            closeConfirmModal(modal);
            return;
        }
        
        // Handle confirm button
        if (e.target.id === 'confirmEvaluationSubmit' || 
            e.target.closest('#confirmEvaluationSubmit')) {
            e.preventDefault();
            submitConfirmEvaluation(trainingId, modal);
            return;
        }
    }
    
    // Handle escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeConfirmModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Close confirmation modal
function closeConfirmModal(modal) {
    // Add a 'closing' class so CSS can animate zoom-out while keeping the element mounted
    modal.classList.add('closing');
    document.body.classList.remove('modal-open');

    // After a short delay (matching the CSS transition), remove the classes and cleanup
    const transitionDuration = 200; // ms, matches modalZoomOut 0.2s
    setTimeout(() => {
        modal.classList.remove('show', 'closing');
        // final cleanup
        modal.removeAttribute('data-training-id');
    }, transitionDuration);
}

// Submit evaluation confirmation
function submitConfirmEvaluation(trainingId, modal) {
    const submitBtn = modal.querySelector('#confirmEvaluationSubmit');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
    
    fetch(`/training/evaluation/confirm/${trainingId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success state
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Confirmed!';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-success');
            
            showToast('Evaluation confirmed successfully! Sent to manager for approval.', 'success');
            
            // Close modal and refresh page
            setTimeout(() => {
                closeConfirmModal(modal);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }, 1000);
        } else {
            throw new Error(data.error || 'Failed to confirm evaluation');
        }
    })
    .catch(error => {
        console.error('Error confirming evaluation:', error);
        showToast('Failed to confirm evaluation. Please try again.', 'error');
        
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Handle review evaluation button click
function handleReviewEvaluation(evaluationId, routingId = null) {
    console.log('Reviewing evaluation for evaluation ID:', evaluationId, 'routing ID:', routingId);

    // Show loading state
    const contentArea = document.getElementById('approvalsContentArea');
    if (!contentArea) {
        console.error('Content area not found');
        return;
    }

    contentArea.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading evaluation for review...</p>
        </div>
    `;

    // Fetch the evaluation content for review
    fetch(`/training/supervisor/evaluation/${evaluationId}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            contentArea.innerHTML = data.html;

            // Add mobile back button for approvals content
            addMobileBackButtonForApprovals(contentArea);
            showContentArea();

            // Show the evaluation approval modal
            showEvaluationApprovalModal(evaluationId, routingId);
        } else {
            throw new Error(data.error || 'Failed to load evaluation for review');
        }
    })
    .catch(error => {
        console.error('Error loading evaluation for review:', error);
        contentArea.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Evaluation</h3>
                <p>Failed to load the evaluation for review. Please try again.</p>
                <button class="btn btn-primary" onclick="handleReviewEvaluation('${evaluationId}', '${routingId}')">
                    <i class="fas fa-retry"></i>
                    Retry
                </button>
            </div>
        `;

        showToast('Failed to load evaluation for review. Please try again.', 'error');
    });
}

// Show evaluation approval modal
function showEvaluationApprovalModal(evaluationId, routingId = null) {
    const modal = document.getElementById('evaluationApprovalModal');
    if (!modal) {
        console.error('Evaluation approval modal not found');
        return;
    }

    // Store evaluation ID and routing ID for later use
    modal.setAttribute('data-evaluation-id', evaluationId);
    if (routingId) {
        modal.setAttribute('data-routing-id', routingId);
    }

    // Show modal with animation
    document.body.classList.add('modal-open');
    modal.classList.add('show');

    // Setup modal event handlers
    setupEvaluationApprovalModalHandlers(modal, evaluationId, routingId);
}

// Setup evaluation approval modal event handlers
function setupEvaluationApprovalModalHandlers(modal, evaluationId, routingId = null) {
    // Remove existing event listeners to prevent duplicates
    modal.removeEventListener('click', handleEvaluationApprovalModalClick);
    modal.addEventListener('click', handleEvaluationApprovalModalClick);

    function handleEvaluationApprovalModalClick(e) {
        // Close modal when clicking overlay or close buttons
        if (e.target.classList.contains('modal-overlay') ||
            e.target.getAttribute('data-action') === 'close-modal' ||
            e.target.closest('[data-action="close-modal"]')) {
            closeEvaluationApprovalModal(modal);
            return;
        }

        // Handle approve button
        if (e.target.id === 'approveEvaluation' ||
            e.target.closest('#approveEvaluation')) {
            e.preventDefault();
            submitEvaluationApproval(evaluationId, 'approve', modal, routingId);
            return;
        }

        // Handle disapprove button
        if (e.target.id === 'disapproveEvaluation' ||
            e.target.closest('#disapproveEvaluation')) {
            e.preventDefault();
            submitEvaluationApproval(evaluationId, 'disapprove', modal, routingId);
            return;
        }
    }

    // Handle escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeEvaluationApprovalModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

// Close evaluation approval modal
function closeEvaluationApprovalModal(modal) {
    // Add a 'closing' class so CSS can animate zoom-out while keeping the element mounted
    modal.classList.add('closing');
    document.body.classList.remove('modal-open');

    // After a short delay (matching the CSS transition), remove the classes and cleanup
    const transitionDuration = 200; // ms, matches modalZoomOut 0.2s
    setTimeout(() => {
        modal.classList.remove('show', 'closing');
        // final cleanup
        modal.removeAttribute('data-evaluation-id');
    }, transitionDuration);
}

// Submit evaluation approval/disapproval
function submitEvaluationApproval(evaluationId, action, modal, routingId = null) {
    const submitBtn = modal.querySelector(action === 'approve' ? '#approveEvaluation' : '#disapproveEvaluation');
    const originalText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    // Use routing ID if available, otherwise use evaluation ID
    const urlId = routingId || evaluationId;
    fetch(`/training/manager/review/submit/${urlId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
            decision: action
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success state
            submitBtn.innerHTML = '<i class="fas fa-check"></i> ' + (action === 'approve' ? 'Approved!' : 'Disapproved!');
            submitBtn.classList.remove('btn-success', 'btn-danger');
            submitBtn.classList.add('btn-primary');

            showToast(`Evaluation ${action}d successfully!`, 'success');

            // Close modal and refresh page
            setTimeout(() => {
                closeEvaluationApprovalModal(modal);
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }, 1000);
        } else {
            throw new Error(data.error || `Failed to ${action} evaluation`);
        }
    })
    .catch(error => {
        console.error(`Error ${action}ing evaluation:`, error);
        showToast(`Failed to ${action} evaluation. Please try again.`, 'error');

        // Reset button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}
