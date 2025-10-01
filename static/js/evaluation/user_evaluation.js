// Helper function to close modal with animation
function closeModalWithAnimation(modal) {
    if (!modal) return;

    // Add closing class to trigger animation
    modal.classList.add('closing');

    // Wait for animation to complete (200ms), then remove classes
    setTimeout(() => {
        modal.classList.remove('show', 'closing');
    }, 200);
}

// Mobile navigation functions (Global scope)
function showEvaluationContent() {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.classList.add('show-content');
    }
}

function hideEvaluationContent() {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.classList.remove('show-content');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Evaluation User View Loaded');
    console.log('Statistics:', EVALUATION_STATS);
    
    window.expandedTraining = null; // Track currently expanded training item globally
    
    // Initialize training item states
    const trainingItems = document.querySelectorAll('.training-item');
    trainingItems.forEach(item => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
    });
    
    // Handle evaluation filter
    const statusFilter = document.getElementById('evaluationStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterEvaluations(this.value);
        });
    }

    // Action button handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('start-evaluation-btn')) {
            const instanceId = e.target.getAttribute('data-instance-id');
            handleStartEvaluation(instanceId, e.target);
        }
        
        if (e.target.classList.contains('view-evaluation-btn')) {
            const instanceId = e.target.getAttribute('data-instance-id');
            handleViewEvaluation(instanceId, e.target);
        }
        
        if (e.target.classList.contains('close-evaluation-btn')) {
            handleCloseEvaluation();
        }
        
        if (e.target.classList.contains('submit-evaluation-btn')) {
            console.log('submit-evaluation-btn clicked');
            e.preventDefault(); // Prevent any default form submission
            const form = document.getElementById('evaluationForm');
            if (form) {
                console.log('Form found, calling handleSubmitEvaluation');
                handleSubmitEvaluation(form);
            } else {
                console.error('Form not found!');
            }
        }
        
        if (e.target.classList.contains('evaluate-subordinate-btn')) {
            const evaluationId = e.target.getAttribute('data-evaluation-id');
            const buttonText = e.target.textContent.trim();
            
            // Check if this is a view-only request or an evaluation request
            if (buttonText.includes('View Assessment')) {
                handleViewSubordinateEvaluation(evaluationId, e.target);
            } else if (buttonText.includes('Approve Evaluation')) {
                // Manager approval workflow
                handleManagerEvaluation(evaluationId, e.target);
            } else {
                // Supervisor evaluation workflow
                handleEvaluateSubordinate(evaluationId, e.target);
            }
        }
        
        if (e.target.classList.contains('manager-review-btn')) {
            const evaluationId = e.target.getAttribute('data-evaluation-id');
            handleManagerApprovalModal(evaluationId);
        }
        
        // Modal close functionality
        if (e.target.classList.contains('modal-close') ||
            e.target.getAttribute('data-action') === 'close-modal' ||
            e.target.closest('.modal-close') ||
            e.target.closest('[data-action="close-modal"]')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModalWithAnimation(modal);
            }
        }
        
        // Close modal when clicking overlay
        if (e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModalWithAnimation(modal);
            }
        }
    });
    
    // Training card expand/collapse functionality
    setupTrainingExpansion();
    
    // Initialize tab functionality
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            switchTab(target);
        });
    });
    
    // Check if we need to return to manager evaluation after page refresh
    const returnToManagerEvaluation = sessionStorage.getItem('returnToManagerEvaluation');
    if (returnToManagerEvaluation) {
        // Clear the session storage
        sessionStorage.removeItem('returnToManagerEvaluation');
        
        // Switch to approvals tab first
        switchTab('approvals');
        
        // Wait a bit for tab switch, then load manager evaluation
        setTimeout(() => {
            loadManagerEvaluationAfterRevise(returnToManagerEvaluation);
        }, 100);
    }
});

// Handle starting an evaluation
function handleStartEvaluation(instanceId, btn) {
    console.log('handleStartEvaluation: starting for instanceId=', instanceId);
    
    // Check if user has an approver set
    if (!USER_HAS_APPROVER) {
        showErrorMessage('Please set first your approver in profile settings to start evaluation.');
        return;
    }
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Load evaluation instance
    fetch(`/evaluation/instance/${instanceId}/`)
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
                displayEvaluation(data, btn);
            } catch (err) {
                console.error('Error rendering evaluation:', err);
                showErrorMessage('Failed to render evaluation. See console for details.');
            }
        })
        .catch(error => {
            console.error('Error loading evaluation:', error);
            
            // Try to parse error response as JSON for specific error messages
            try {
                const errorData = JSON.parse(error.message.split(' - ')[1] || '{}');
                if (errorData.error) {
                    showErrorMessage(errorData.error);
                } else {
                    showErrorMessage('Failed to load evaluation. Please try again.');
                }
            } catch (parseError) {
                showErrorMessage('Failed to load evaluation. Please try again.');
            }
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

// Handle viewing a completed evaluation
function handleViewEvaluation(instanceId, btn) {
    console.log('handleViewEvaluation: viewing instanceId=', instanceId);
    
    const employeeEvalId = btn.getAttribute('data-employee-eval-id');
    
    if (!employeeEvalId) {
        showErrorMessage('Evaluation data not found. Please refresh the page and try again.');
        return;
    }
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Load supervisor evaluation view
    fetch(`/evaluation/supervisor/evaluation/${employeeEvalId}/view/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('view evaluation payload:', data);
            if (data.success) {
                // Display the evaluation in the content area
                const contentArea = document.getElementById('contentArea');
                if (contentArea) {
                    contentArea.innerHTML = data.html;
                }
            } else {
                throw new Error(data.error || 'Failed to load evaluation');
            }
        })
        .catch(error => {
            console.error('Error loading evaluation:', error);
            showErrorMessage('Failed to load evaluation. Please try again.');
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
}

// Display evaluation form in content area
function displayEvaluation(data, originBtn) {
    const evaluation = data.evaluation;
    const instance = data.instance;
    const formHtml = data.form_html;
    const employeeEvaluationId = data.employee_evaluation_id;
    
    // Format period display based on evaluation duration
    let periodDisplay = '';
    if (evaluation.duration === 'Daily') {
        periodDisplay = `${instance.period_start} - ${instance.period_end}`;
    } else if (evaluation.duration === 'Monthly') {
        const date = new Date(instance.period_start);
        periodDisplay = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (evaluation.duration === 'Quarterly') {
        const startDate = new Date(instance.period_start);
        const endDate = new Date(instance.period_end);
        periodDisplay = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else if (evaluation.duration === 'Yearly') {
        const date = new Date(instance.period_start);
        periodDisplay = date.getFullYear().toString();
    } else {
        periodDisplay = `${instance.period_start} - ${instance.period_end}`;
    }
    
    // Render into content area
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="evaluation-content show">
            <div class="evaluation-content-header">
                <h2 class="evaluation-content-title">${evaluation.title}</h2>
                <p class="evaluation-content-description">${evaluation.description || ''}</p>
                <div class="evaluation-meta-info">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>Duration: ${evaluation.duration}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>Period: ${periodDisplay}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>Due: ${new Date(instance.due_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div class="evaluation-content-body">
                <form id="evaluationForm" method="post" action="/evaluation/submit/${employeeEvaluationId}/">
                    ${formHtml}
                </form>
            </div>
            <div class="evaluation-content-actions">
                <button class="btn btn-outline close-evaluation-btn">
                    <i class="fas fa-arrow-left"></i>
                    Back to Dashboard
                </button>
                <button class="btn btn-primary submit-evaluation-btn" type="button">
                    <i class="fas fa-paper-plane"></i>
                    Submit Evaluation
                </button>
            </div>
        </div>
    `;
    
    // Setup evaluation form
    setupEvaluationForm();
    
    // Add mobile back button and show content area on mobile
    addMobileBackButton(contentArea);
    showContentArea();
}

// Display completed evaluation in content area
function displayCompletedEvaluation(data) {
    const evaluation = data.evaluation;
    const instance = data.instance;
    const formHtml = data.form_html;
    
    // Render into content area
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="evaluation-content show">
            <div class="evaluation-content-header">
                <h2 class="evaluation-content-title">${evaluation.title} - Results</h2>
                <p class="evaluation-content-description">${evaluation.description || ''}</p>
            </div>
            <div class="evaluation-content-body">
                ${formHtml}
            </div>
            <div class="evaluation-content-actions">
                <button class="btn btn-outline close-evaluation-btn">
                    <i class="fas fa-arrow-left"></i>
                    Back to Dashboard
                </button>
            </div>
        </div>
    `;
    
    // Add mobile back button and show content area on mobile
    addMobileBackButton(contentArea);
    showContentArea();
}

// Setup evaluation form functionality
function setupEvaluationForm() {
    const form = document.getElementById('evaluationForm');
    if (!form) {
        console.warn('setupEvaluationForm: evaluationForm not found');
        return;
    }
    
    console.log('setupEvaluationForm: Form found, setting up...');
    
    // Setup star rating functionality
    setupStarRatings(form);
    
    // Prevent default form submission to ensure AJAX handling
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submit event prevented - using AJAX instead');
        handleSubmitEvaluation(form);
    });
    
    console.log('setupEvaluationForm: Setup complete');
}

// Helper function to highlight a task row with error styling
function highlightTaskError(taskRow) {
    if (!taskRow) return;
    
    taskRow.style.border = '2px solid #dc3545';
    taskRow.style.borderRadius = '8px';
    taskRow.style.backgroundColor = '#fff5f5';
    taskRow.style.transition = 'all 0.3s ease';
    
    // Add pulsing animation
    taskRow.classList.add('task-error-highlight');
    
    // Also highlight the rating stars container
    const starsContainer = taskRow.querySelector('.rating-stars-display');
    if (starsContainer) {
        starsContainer.style.backgroundColor = '#fee2e2';
        starsContainer.style.borderRadius = '4px';
    }
}

// Helper function to clear all task error highlighting
function clearTaskErrorHighlighting(form) {
    const taskRows = form.querySelectorAll('.rating-row');
    taskRows.forEach(row => {
        row.style.border = '';
        row.style.borderRadius = '';
        row.style.backgroundColor = '';
        row.classList.remove('task-error-highlight');
        
        const starsContainer = row.querySelector('.rating-stars-display');
        if (starsContainer) {
            starsContainer.style.backgroundColor = '';
            starsContainer.style.borderRadius = '';
        }
    });
}

// Handle evaluation submission
function handleSubmitEvaluation(form) {
    console.log('handleSubmitEvaluation: Starting submission process');
    console.log('handleSubmitEvaluation: Form element:', form);
    
    const formData = new FormData(form);
    const submitBtn = document.querySelector('.submit-evaluation-btn');
    const originalText = submitBtn.innerHTML;
    
    console.log('handleSubmitEvaluation: Submit button found:', submitBtn);
    
    // Clear any existing error highlighting
    clearTaskErrorHighlighting(form);
    
    // Check if all required ratings are filled
    const hiddenInputs = form.querySelectorAll('input[type="hidden"][name^="task_rating_"]');
    console.log('handleSubmitEvaluation: Found', hiddenInputs.length, 'rating inputs');
    
    let unratedTasks = [];
    
    hiddenInputs.forEach(input => {
        const value = input.value;
        console.log('handleSubmitEvaluation: Task', input.name, 'has value:', value);
        
        if (!value || value === '0') {
            const taskId = input.name.replace('task_rating_', '');
            const ratingRow = form.querySelector(`.rating-stars-display[data-question-name="${input.name}"]`);
            if (ratingRow) {
                unratedTasks.push({
                    taskId: taskId,
                    element: ratingRow.closest('.rating-row')
                });
                console.log('handleSubmitEvaluation: Task', taskId, 'is unrated');
            }
        }
    });
    
    if (unratedTasks.length > 0) {
        console.log('handleSubmitEvaluation: Found', unratedTasks.length, 'unrated tasks - preventing submission');
        
        // Highlight all unrated tasks with red border
        unratedTasks.forEach(task => {
            highlightTaskError(task.element);
        });
        
        // Scroll to the first unrated task
        const firstUnratedTask = unratedTasks[0].element;
        firstUnratedTask.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        showErrorMessage(`Please rate all tasks before submitting. ${unratedTasks.length} task(s) remaining.`);
        return;
    }
    
    console.log('handleSubmitEvaluation: All tasks rated, proceeding with submission');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage(data.message || 'Evaluation submitted successfully!');
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showErrorMessage(data.error || 'Failed to submit evaluation.');
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
}

// Handle closing evaluation
function handleCloseEvaluation() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon">
                <i class="fa fa-line-chart"></i>
            </div>
            <h3>Welcome to Your Evaluation Dashboard</h3>
            <p>Select a performance evaluation from the left panel to get started. Click "Start Evaluation" to begin completing your assigned performance evaluations.</p>
            <div class="welcome-stats">
                <div class="stat-item">
                    <div class="stat-value" id="totalEvaluations">${EVALUATION_STATS.total}</div>
                    <div class="stat-label">Total Evaluations</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="completedEvaluations">${EVALUATION_STATS.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="pendingEvaluations">${EVALUATION_STATS.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="overdueEvaluations">${EVALUATION_STATS.overdue}</div>
                    <div class="stat-label">Overdue</div>
                </div>
            </div>
        </div>
    `;
    hideContentArea();
}

// Setup star rating interactivity
function setupStarRatings(container) {
    const ratingContainers = container.querySelectorAll('.rating-stars-display');
    
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
                
                // Clear error highlighting when task gets rated
                const taskRow = this.closest('.rating-row');
                if (taskRow && value > 0) {
                    taskRow.style.border = '';
                    taskRow.style.borderRadius = '';
                    taskRow.style.backgroundColor = '';
                    taskRow.classList.remove('task-error-highlight');
                    
                    const starsContainer = taskRow.querySelector('.rating-stars-display');
                    if (starsContainer) {
                        starsContainer.style.backgroundColor = '';
                        starsContainer.style.borderRadius = '';
                    }
                    
                    // Clear question text error styling
                    const questionText = taskRow.querySelector('.rating-question');
                    if (questionText) {
                        questionText.style.color = '';
                        questionText.style.fontWeight = '';
                    }
                }
                
                // Add a brief highlight effect
                this.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });

        // Make star cells clickable for better UX
        starsEl.querySelectorAll('.rating-star-cell').forEach(cell => {
            cell.addEventListener('click', function() {
                const star = this.querySelector('.rating-star');
                if (star) {
                    star.click();
                }
            });
        });
    });
}

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
        
        if (header) {
            header.addEventListener('click', function(e) {
                // Avoid toggling when clicking on a control inside the header
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
    });
}

function expandTraining(item) {
    if (item.classList.contains('expanded')) return;
    
    item.classList.add('expanded');
    window.expandedTraining = item;
    
    const details = item.querySelector('.training-details');
    if (details) {
        details.style.display = 'block';
        details.style.maxHeight = details.scrollHeight + 'px';
    }
}

function collapseTraining(item) {
    if (!item.classList.contains('expanded')) return;
    
    item.classList.remove('expanded');
    if (window.expandedTraining === item) {
        window.expandedTraining = null;
    }
    
    const details = item.querySelector('.training-details');
    if (details) {
        details.style.maxHeight = '0';
        setTimeout(() => {
            if (!item.classList.contains('expanded')) {
                details.style.display = 'none';
            }
        }, 300);
    }
}

function toggleTrainingExpansion(item) {
    if (item.classList.contains('expanded')) {
        collapseTraining(item);
    } else {
        if (window.expandedTraining) {
            collapseTraining(window.expandedTraining);
        }
        expandTraining(item);
    }
}

function filterEvaluations(status) {
    const items = document.querySelectorAll('.training-item');

    items.forEach(item => {
        const itemStatus = item.getAttribute('data-status');

        if (status === 'all' || itemStatus === status) {
            // Show item with animation
            if (item.style.display === 'none' || !item.style.display) {
                item.style.display = 'block';
                // Set initial hidden state for animation
                item.style.opacity = '0';
                item.style.transform = 'translateY(10px)';
                // Use setTimeout to ensure display:block is applied before animation
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 10);
            } else {
                // Item is already visible, just ensure it's in the correct state
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }
        } else {
            // Hide item with animation - also collapse if expanded
            if (item.classList.contains('expanded')) {
                item.classList.remove('expanded');
                if (window.expandedTraining === item) {
                    window.expandedTraining = null;
                }
            }
            item.style.opacity = '0';
            item.style.transform = 'translateY(-10px)';
            // Hide after animation completes
            setTimeout(() => {
                item.style.display = 'none';
            }, 250);
        }
    });
}

function switchTab(targetId) {
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding panel
    const targetTab = document.querySelector(`[data-target="${targetId}"]`);
    const targetPanel = document.getElementById(targetId);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');
}

function showContentArea() {
    // For mobile: hide trainings list and show content area
    if (window.innerWidth <= 992) {
        const trainingsColumn = document.querySelector('.trainings-column');
        const contentColumn = document.querySelector('.content-column');
        
        if (trainingsColumn) trainingsColumn.style.display = 'none';
        if (contentColumn) contentColumn.style.display = 'block';
    }
}

function hideContentArea() {
    // For mobile: show trainings list and hide content area
    if (window.innerWidth <= 992) {
        const trainingsColumn = document.querySelector('.trainings-column');
        const contentColumn = document.querySelector('.content-column');
        
        if (trainingsColumn) trainingsColumn.style.display = 'block';
        if (contentColumn) contentColumn.style.display = 'none';
    }
}

function addMobileBackButton(contentArea) {
    // Add mobile back button for better UX
    if (window.innerWidth <= 992) {
        const backButton = document.createElement('button');
        backButton.className = 'btn btn-outline mobile-back-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
        backButton.style.marginBottom = '1rem';
        backButton.addEventListener('click', handleCloseEvaluation);
        
        const content = contentArea.querySelector('.evaluation-content');
        if (content) {
            content.insertBefore(backButton, content.firstChild);
        }
    }
}

// Handle viewing subordinate evaluation (read-only)
function handleViewSubordinateEvaluation(evaluationId, btn) {
    console.log('Viewing subordinate evaluation:', evaluationId);
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Fetch the evaluation content for viewing
    fetch(`/evaluation/supervisor/evaluation/${evaluationId}/view/`, {
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
            const contentArea = document.getElementById('approvalsContentArea');
            if (contentArea) {
                contentArea.innerHTML = data.html;
                
                // Add mobile back button for approvals content
                addMobileBackButtonForApprovals(contentArea);
                showContentArea();
            }
        } else {
            throw new Error(data.error || 'Failed to load evaluation for viewing');
        }
    })
    .catch(error => {
        console.error('Error loading evaluation for viewing:', error);
        showErrorMessage('Failed to load evaluation. Please try again.');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

// Handle evaluating subordinate evaluation
function handleEvaluateSubordinate(evaluationId, btn) {
    console.log('Evaluating subordinate evaluation:', evaluationId);
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Fetch the evaluation content for review
    fetch(`/evaluation/supervisor/evaluation/${evaluationId}/`, {
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
            const contentArea = document.getElementById('approvalsContentArea');
            if (contentArea) {
                contentArea.innerHTML = data.html;
                
                // Add mobile back button for approvals content
                addMobileBackButtonForApprovals(contentArea);
                showContentArea();
                
                // Initialize form submission handler
                initializeSupervisorEvaluationForm();
                // Initialize supervisor rating functionality
                initializeSupervisorRatings();
            }
        } else {
            throw new Error(data.error || 'Failed to load evaluation for review');
        }
    })
    .catch(error => {
        console.error('Error loading evaluation for review:', error);
        showErrorMessage('Failed to load evaluation. Please try again.');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

// Initialize supervisor evaluation form
function initializeSupervisorEvaluationForm() {
    const form = document.getElementById('supervisorEvaluationForm');
    if (form) {
        // Handle regular submit button
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all supervisor ratings before submitting
            if (!validateSupervisorRatings()) {
                return; // Stop submission if validation fails
            }
            
            const submitBtn = document.getElementById('submitSupervisorEvaluation');
            if (submitBtn) {
                handleFormSubmission(form, 'submit', submitBtn);
            }
        });

        // Handle save revise evaluation button
        const saveReviseBtn = document.getElementById('saveReviseEvaluation');
        if (saveReviseBtn) {
            saveReviseBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Don't validate ratings for save revise - allow partial completion
                handleFormSubmission(form, 'revise', saveReviseBtn);
            });
        }
    }
}

// Handle form submission for both submit and revise actions
function handleFormSubmission(form, actionType, button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    
    if (actionType === 'submit') {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    } else {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    const formData = new FormData(form);
    const evaluationId = form.getAttribute('data-evaluation-id');
    
    // Collect supervisor task ratings
    const supervisorRatingInputs = document.querySelectorAll('input[name^="supervisor_task_rating_"]');
    supervisorRatingInputs.forEach(input => {
        if (input.value) {
            formData.append(input.name, input.value);
        }
    });
    
    // Determine the endpoint based on action type
    const endpoint = actionType === 'submit' 
        ? `/evaluation/supervisor/evaluation/${evaluationId}/submit/`
        : `/evaluation/supervisor/evaluation/${evaluationId}/revise/`;
    
    fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const message = actionType === 'submit' 
                ? 'Evaluation assessment submitted successfully!'
                : data.message || 'Evaluation revised successfully!';
            
            showSuccessMessage(message);
            
            if (actionType === 'submit') {
                // For submit, reload the page
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else if (actionType === 'revise') {
                // For revise, refresh and return to manager evaluation view
                setTimeout(() => {
                    // Store the evaluation ID for after page refresh
                    sessionStorage.setItem('returnToManagerEvaluation', evaluationId);
                    window.location.reload();
                }, 1500);
            }
        } else {
            const errorMessage = actionType === 'submit' 
                ? data.error || 'Failed to submit assessment'
                : data.error || 'Failed to save revision';
            
            showErrorMessage(errorMessage);
        }
    })
    .catch(error => {
        console.error(`Error ${actionType}ing assessment:`, error);
        const errorMessage = actionType === 'submit' 
            ? 'Failed to submit assessment. Please try again.'
            : 'Failed to save revision. Please try again.';
        
        showErrorMessage(errorMessage);
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalText;
    });
}

// Validation function for supervisor ratings
function validateSupervisorRatings() {
    let hasErrors = false;
    const missingRatings = [];
    
    // Clear previous error styles
    document.querySelectorAll('.supervisor-rating-row').forEach(row => {
        row.classList.remove('error');
        row.style.border = '';
        row.style.borderRadius = '';
        row.style.backgroundColor = '';
    });
    
    // Check task list supervisor ratings
    const taskRatingRows = document.querySelectorAll('.subordinate-evaluation-summary .rating-row');
    taskRatingRows.forEach(row => {
        const supervisorRatingRow = row.querySelector('.supervisor-rating-row');
        const hiddenInput = row.querySelector('input[name^="supervisor_task_rating_"]');
        const taskName = row.querySelector('.rating-question')?.textContent?.trim();
        
        if (supervisorRatingRow && hiddenInput && taskName !== 'No tasks evaluated') {
            const rating = hiddenInput.value;
            if (!rating || rating === '') {
                hasErrors = true;
                supervisorRatingRow.classList.add('error');
                missingRatings.push(`Task: ${taskName}`);
            }
        }
    });
    
    // Check behavioral criteria ratings
    const behavioralRatingRows = document.querySelectorAll('.behavioral-rating-row');
    behavioralRatingRows.forEach(row => {
        const supervisorRatingRow = row.querySelector('.supervisor-rating-row');
        const hiddenInput = row.querySelector('input[type="hidden"]');
        const criteriaName = row.querySelector('.behavioral-question')?.textContent?.trim();
        
        if (supervisorRatingRow && hiddenInput && criteriaName) {
            const rating = hiddenInput.value;
            if (!rating || rating === '') {
                hasErrors = true;
                supervisorRatingRow.classList.add('error');
                missingRatings.push(`Behavioral Criteria: ${criteriaName}`);
            }
        }
    });
    
    if (hasErrors) {
        // Show error message
        const errorMessage = `Please provide ratings for all required fields:<br>• ${missingRatings.join('<br>• ')}`;
        showErrorMessage(errorMessage);
        
        // Scroll to first missing rating
        const firstErrorElement = document.querySelector('.supervisor-rating-row.error');
        if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
        
        return false;
    }
    
    return true;
}

// Function to clear error styling when user selects a rating
function clearRatingError(supervisorRatingRow) {
    if (supervisorRatingRow && supervisorRatingRow.classList.contains('error')) {
        supervisorRatingRow.classList.remove('error');
        supervisorRatingRow.classList.add('cleared-error');
        
        // Remove cleared-error class after animation
        setTimeout(() => {
            supervisorRatingRow.classList.remove('cleared-error');
        }, 300);
    }
}

// Add mobile back button for approvals content
function addMobileBackButtonForApprovals(contentArea) {
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-outline mobile-back-btn';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Evaluations';
    backButton.onclick = goBackToApprovals;
    
    const header = contentArea.querySelector('.assessment-header');
    if (header) {
        header.insertBefore(backButton, header.firstChild);
    }
}

// Go back to approvals list
function goBackToApprovals() {
    const contentArea = document.getElementById('approvalsContentArea');
    const listArea = document.getElementById('approvalsList');

    // Restore welcome/dashboard HTML if we saved it on load
    if (contentArea && window._approvalsWelcomeHTML) {
        contentArea.innerHTML = window._approvalsWelcomeHTML;
    }

    // Ensure approvals list is visible
    if (listArea) {
        listArea.style.display = 'block';
    }

    // For mobile, show trainings/list column and hide content column
    if (window.innerWidth <= 992) {
        const trainingsColumn = document.querySelector('.trainings-column');
        const contentColumn = document.querySelector('.content-column');
        if (trainingsColumn) trainingsColumn.style.display = 'block';
        if (contentColumn) contentColumn.style.display = 'none';
    }
}

// Edit evaluation (switch from view to edit mode)
function editEvaluation(evaluationId) {
    // This will call the regular evaluate subordinate function to switch to edit mode
    const btn = document.createElement('button');
    handleEvaluateSubordinate(evaluationId, btn);
}

// Handle manager evaluation (load manager review content)
function handleManagerEvaluation(evaluationId, btn) {
    console.log('Loading manager evaluation:', evaluationId);
    
    // Show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    // Fetch the manager evaluation content
    fetch(`/evaluation/manager/evaluation/${evaluationId}/`, {
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
            const contentArea = document.getElementById('approvalsContentArea');
            if (contentArea) {
                contentArea.innerHTML = data.html;
                
                // Add mobile back button for approvals content
                addMobileBackButtonForApprovals(contentArea);
                showContentArea();
            }
        } else {
            throw new Error(data.error || 'Failed to load manager evaluation');
        }
    })
    .catch(error => {
        console.error('Error loading manager evaluation:', error);
        showErrorMessage('Failed to load evaluation. Please try again.');
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

// Handle manager approval modal
function handleManagerApprovalModal(evaluationId) {
    const modal = document.getElementById('evaluationApprovalModal');
    const approveBtn = document.getElementById('approveEvaluation');
    
    if (!modal) {
        console.error('Modal not found!');
        return;
    }
    
    // Store evaluation ID for later use
    modal.setAttribute('data-evaluation-id', evaluationId);
    
    // Show modal
    modal.classList.add('show');
    
    // Handle approve button
    if (approveBtn) {
        approveBtn.onclick = function() {
            handleManagerApprovalAction(evaluationId);
        };
    }
}

// Handle manager approval action
function handleManagerApprovalAction(evaluationId) {
    const modal = document.getElementById('evaluationApprovalModal');
    const approveBtn = document.getElementById('approveEvaluation');
    
    // Show loading state
    const originalText = approveBtn.innerHTML;
    approveBtn.disabled = true;
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Prepare form data with CSRF token
    const formData = new FormData();
    formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);
    
    fetch(`/evaluation/manager/evaluation/${evaluationId}/approve/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage(data.message);
            closeModalWithAnimation(modal);
            // Refresh the page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showErrorMessage(data.error || 'Failed to process evaluation');
        }
    })
    .catch(error => {
        console.error('Error processing evaluation:', error);
        showErrorMessage('Failed to process evaluation. Please try again.');
    })
    .finally(() => {
        approveBtn.disabled = false;
        approveBtn.innerHTML = originalText;
    });
}

// Initialize supervisor rating functionality
function initializeSupervisorRatings() {
    console.log('Initializing supervisor ratings...');
    
    // Handle supervisor rating star clicks for both task ratings and behavioral criteria
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('rating-star') && 
            (e.target.closest('.rating-row') || e.target.closest('.behavioral-rating-row'))) {
            
            console.log('Supervisor rating star clicked');
            const star = e.target;
            const value = parseInt(star.getAttribute('data-value'));
            const question = star.getAttribute('data-question');
            const starsRow = star.closest('.rating-stars-display');
            const ratingRow = star.closest('.rating-row') || star.closest('.behavioral-rating-row');
            const hiddenInput = document.querySelector(`input[name="${question}"]`);
            
            console.log('Rating details:', { question, value, hiddenInput });
            
            if (hiddenInput) {
                // Update hidden input value
                hiddenInput.value = value;
                
                // Update star display
                const allStars = starsRow.querySelectorAll('.rating-star');
                allStars.forEach((s, index) => {
                    if (index < value) {
                        s.classList.remove('empty');
                        s.classList.add('filled');
                    } else {
                        s.classList.remove('filled');
                        s.classList.add('empty');
                    }
                });
                
                // Clear error styling if present
                if (typeof clearRatingError === 'function') {
                    clearRatingError(ratingRow);
                }
                
                // Add brief highlight effect
                star.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    star.style.transform = '';
                }, 150);
                
                console.log('Rating updated successfully');
            } else {
                console.warn('Hidden input not found for question:', question);
            }
        }
    });
    
    // Handle star hover effects for supervisor ratings
    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('rating-star') && 
            (e.target.closest('.rating-row') || e.target.closest('.behavioral-rating-row'))) {
            
            const star = e.target;
            const value = parseInt(star.getAttribute('data-value'));
            const starsRow = star.closest('.rating-stars-display');
            const allStars = starsRow.querySelectorAll('.rating-star');
            
            allStars.forEach((s, index) => {
                if (index < value) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        if (e.target.classList.contains('rating-star') && 
            (e.target.closest('.rating-row') || e.target.closest('.behavioral-rating-row'))) {
            
            const starsRow = e.target.closest('.rating-stars-display');
            const allStars = starsRow.querySelectorAll('.rating-star');
            allStars.forEach(s => s.classList.remove('hover'));
        }
    });
    
    // Make star cells clickable for better UX
    const supervisorContent = document.querySelector('.supervisor-assessment-container');
    if (supervisorContent) {
        supervisorContent.querySelectorAll('.rating-star-cell').forEach(cell => {
            cell.addEventListener('click', function() {
                const star = this.querySelector('.rating-star');
                if (star) {
                    star.click();
                }
            });
        });
    }
    
    console.log('Supervisor ratings initialized');
}

function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

// Generic toast helper (uses site's toast styles in style.css)
if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type = 'success', duration = 5000) {
        // Prefer global portalUI if available
        if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
            window.portalUI.showNotification(message, type, duration);
            return;
        }

        // Create toast container if missing
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        if (type === 'error') iconClass = 'fas fa-exclamation-circle';
        if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

        toast.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; color:inherit;">
                <i class="${iconClass}" style="font-size:1.1rem"></i>
                <div style="font-weight:600">${message}</div>
            </div>
            <button type="button" class="message-close" aria-label="Close">&times;</button>
        `;

        // close handler
        toast.querySelector('.message-close').addEventListener('click', () => window.removeToast(toast));

        container.appendChild(toast);

        // animate in (style.css defines slideInRight keyframe)
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        if (duration > 0) {
            setTimeout(() => window.removeToast(toast), duration);
        }
    };
}

if (typeof window.removeToast !== 'function') {
    window.removeToast = function(toast) {
        if (!toast || !toast.parentNode) return;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    };
}

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

function filterEvaluations(status) {
    const evaluationItems = document.querySelectorAll('.training-item');
    
    evaluationItems.forEach(item => {
        const itemStatus = item.getAttribute('data-status');
        
        if (status === 'all' || itemStatus === status) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Note: filterEvaluations is defined earlier with animation behavior. No duplicate implementation here.

function startEvaluation(instanceId) {
    // TODO: Implement evaluation starting logic
    console.log('Starting evaluation instance:', instanceId);
    
    // For now, just show an alert
    alert('Evaluation functionality will be implemented in the next phase.');
}

function viewEvaluation(instanceId) {
    // TODO: Implement evaluation viewing logic
    console.log('Viewing evaluation instance:', instanceId);
    
    // For now, just show an alert
    alert('View evaluation functionality will be implemented in the next phase.');
}

// Tab functionality
function switchTab(targetId) {
    // Hide all tab panels
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show target panel and activate tab
    const targetPanel = document.getElementById(targetId);
    const targetTab = document.querySelector(`.tab[data-target="${targetId}"]`);
    
    if (targetPanel && targetTab) {
        targetPanel.classList.add('active');
        targetTab.classList.add('active');
    }
}

function filterEvaluations(status) {
    const evaluationItems = document.querySelectorAll('.training-item');
    
    evaluationItems.forEach(item => {
        const itemStatus = item.getAttribute('data-status');
        
        if (status === 'all' || itemStatus === status) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function startEvaluation(instanceId) {
    // TODO: Implement evaluation starting logic
    console.log('Starting evaluation instance:', instanceId);
    
    // For now, just show an alert
    alert('Evaluation functionality will be implemented in the next phase.');
}

function viewEvaluation(instanceId) {
    // TODO: Implement evaluation viewing logic
    console.log('Viewing evaluation instance:', instanceId);
    
    // For now, just show an alert
    alert('View evaluation functionality will be implemented in the next phase.');
}

// Tab functionality
function switchTab(targetId) {
    // Hide all tab panels
    const tabPanels = document.querySelectorAll('.tab-panel');
    tabPanels.forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show target panel and activate tab
    const targetPanel = document.getElementById(targetId);
    const targetTab = document.querySelector(`.tab[data-target="${targetId}"]`);
    
    if (targetPanel && targetTab) {
        targetPanel.classList.add('active');
        targetTab.classList.add('active');
    }
}

// Save approvals welcome HTML for restoring later
const approvalsWelcome = document.getElementById('approvalsContentArea');
if (approvalsWelcome) {
    window._approvalsWelcomeHTML = approvalsWelcome.innerHTML;
}

// Mobile navigation functions
function addMobileBackButton(contentArea) {
    // Check if we're on mobile/tablet
    if (window.innerWidth <= 992) {
        // Add mobile back button to content area
        const backButton = document.createElement('button');
        backButton.className = 'mobile-back-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Evaluations';
        backButton.onclick = hideEvaluationContent;
        
        // Insert at the beginning of content area
        contentArea.insertBefore(backButton, contentArea.firstChild);
    }
}

function addMobileBackButtonForApprovals(contentArea) {
    // Check if we're on mobile/tablet
    if (window.innerWidth <= 992) {
        // Add mobile back button to approvals content area
        const backButton = document.createElement('button');
        backButton.className = 'mobile-back-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Approvals';
        backButton.onclick = function() {
            goBackToApprovals();
            hideEvaluationContent();
        };
        
        // Insert at the beginning of content area
        contentArea.insertBefore(backButton, contentArea.firstChild);
    }
}

function showContentArea() {
    // Show content area on mobile/tablet
    if (window.innerWidth <= 992) {
        showEvaluationContent();
    }
}

// Handle handleCloseEvaluation to go back to list on mobile
function handleCloseEvaluation() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="welcome-state">
            <div class="welcome-icon">
                <i class="fa fa-line-chart"></i>
            </div>
            <h3>Welcome to Your Evaluation Dashboard</h3>
            <p>Select a performance evaluation from the left panel to get started. Click "Start Evaluation" to begin completing your assigned performance evaluations.</p>
            <div class="welcome-stats">
                <div class="stat-item">
                    <div class="stat-value" id="totalEvaluations">${EVALUATION_STATS.total}</div>
                    <div class="stat-label">Total Evaluations</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="completedEvaluations">${EVALUATION_STATS.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="pendingEvaluations">${EVALUATION_STATS.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
            </div>
        </div>
    `;
    
    // Hide content area on mobile/tablet (go back to list)
    if (window.innerWidth <= 992) {
        hideEvaluationContent();
    }
}

// Window resize handler to manage mobile/desktop transitions
window.addEventListener('resize', function() {
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (window.innerWidth > 992) {
        // Desktop mode - show both columns
        if (dashboardContainer) {
            dashboardContainer.classList.remove('show-content');
        }
        // Remove mobile back buttons
        const mobileBackBtns = document.querySelectorAll('.mobile-back-btn');
        mobileBackBtns.forEach(btn => btn.remove());
    }
});

// Revise Evaluation function for manager evaluation content
function reviseEvaluation(evaluationId) {
    console.log('Revising evaluation:', evaluationId);
    
    // Get the approvals content area specifically
    const approvalsContentArea = document.querySelector('#approvalsContentArea');
    if (!approvalsContentArea) {
        console.error('Approvals content area not found');
        return;
    }
    
    // Show loading indicator in approvals content area
    approvalsContentArea.innerHTML = `
        <div class="loading-spinner" style="text-align: center; padding: 50px;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 20px;">Loading evaluation for revision...</p>
        </div>
    `;
    
    // Make AJAX call to get supervisor evaluation content (editable form)
    fetch(`/evaluation/supervisor/evaluation/${evaluationId}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Replace approvals content area with editable supervisor evaluation content
            approvalsContentArea.innerHTML = data.html;
            
            // Initialize any JavaScript functionality needed for the form
            if (typeof initializeSupervisorRatings === 'function') {
                initializeSupervisorRatings();
            }
            
            // Initialize form submission handler
            if (typeof initializeSupervisorEvaluationForm === 'function') {
                initializeSupervisorEvaluationForm();
            }
            
            // Show content on mobile if needed
            showEvaluationContent();
            
            console.log('Evaluation loaded for revision successfully');
        } else {
            approvalsContentArea.innerHTML = `
                <div class="error-message" style="padding: 40px; text-align: center;">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error Loading Evaluation</h4>
                        <p>${data.error}</p>
                    </div>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-refresh"></i> Refresh Page
                    </button>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading evaluation for revision:', error);
        approvalsContentArea.innerHTML = `
            <div class="error-message" style="padding: 40px; text-align: center;">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Connection Error</h4>
                    <p>Failed to load evaluation. Please check your connection and try again.</p>
                </div>
                <button onclick="location.reload()" class="btn btn-primary">
                    <i class="fas fa-refresh"></i> Refresh Page
                </button>
            </div>
        `;
    });
}

// Function to load manager evaluation content after revision
function loadManagerEvaluationAfterRevise(evaluationId) {
    $.ajax({
        url: `/evaluation/manager/evaluation/${evaluationId}/`,
        method: 'GET',
        success: function(data) {
            const approvalsContentArea = document.getElementById('approvalsContentArea');
            if (approvalsContentArea) {
                approvalsContentArea.innerHTML = data;
                // Reinitialize any form handlers if needed
                initializeManagerEvaluationForm();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading manager evaluation content:', error);
            showAlert('Error loading evaluation content. Please refresh the page.', 'error');
        }
    });
}
