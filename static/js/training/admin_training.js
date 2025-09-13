document.addEventListener('DOMContentLoaded', function() {
    // Check for duplicate IDs
    const allIds = [];
    const elements = document.querySelectorAll('[id]');
    elements.forEach(el => {
        if (allIds.includes(el.id)) {
            console.error('Duplicate ID found:', el.id, el);
        } else {
            allIds.push(el.id);
        }
    });
    console.log('All IDs found:', allIds);
    
    // Initialize charts
    initializeCharts();
    
    // Initialize search functionality
    initializeSearch();
    
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Chart type filter functionality with slider effect
    const chartTypeButtons = document.querySelectorAll('.chart-type-btn');
    const chartTypeFilters = document.querySelector('.chart-type-filters');
    
    function updateTypeSlider(activeButton) {
        if (!chartTypeFilters) return;
        
        // Remove existing slide classes
        chartTypeFilters.classList.remove('slide-0', 'slide-1');
        
        // Get active button index
        const buttonIndex = Array.from(chartTypeButtons).indexOf(activeButton);
        
        // Add appropriate slide class
        chartTypeFilters.classList.add(`slide-${buttonIndex}`);
        
        // Update has-active class
        if (!chartTypeFilters.classList.contains('has-active')) {
            chartTypeFilters.classList.add('has-active');
        }
    }
    
    if (chartTypeButtons.length > 0 && chartTypeFilters) {
        chartTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all chart type buttons
                chartTypeButtons.forEach(btn => btn.classList.remove('active'));
            
                // Add active class to clicked button
                button.classList.add('active');
                
                // Update slider position
                updateTypeSlider(button);
                
                // Get chart type
                const chartType = button.getAttribute('data-type');
                
                // Update timeline chart
                updateTimelineChart(chartType);
            });
        });
    }
    
    // Initialize slider position
    const activeButton = document.querySelector('.chart-type-btn.active');
    if (activeButton) {
        updateTypeSlider(activeButton);
    }
    
    // Action dropdown functionality
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.action-dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Close other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                    otherMenu.closest('.action-dropdown').classList.remove('open');
                }
            });
            
            // Toggle current dropdown
            menu.classList.toggle('show');
            dropdown.classList.toggle('open');
        });
    });
    
    // Close dropdowns when clicking outside (with null checks)
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            if (menu) {
                menu.classList.remove('show');
                const actionDropdown = menu.closest('.action-dropdown');
                if (actionDropdown) {
                    actionDropdown.classList.remove('open');
                }
            }
        });
    });
    
    // Create training functionality
    let participantsData = [];
    
    function openCreateTrainingModal() {
        // Reset form
        const form = document.getElementById('createTrainingForm');
        if (form) {
            form.reset();
        }
        
        // Clear participant selections
        const checkboxes = document.querySelectorAll('input[name="participants"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
        
        loadParticipants();
        showModal('createTrainingModal');
    }
    
    // Make function globally available
    window.openCreateTrainingModal = openCreateTrainingModal;
    
    function loadParticipants() {
        const tableBody = document.getElementById('participantsTableBody');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading participants...</td></tr>';
        
        // Fetch participants from API
        fetch('/training/admin/participants/')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    participantsData = data.participants;
                    renderParticipantsTable(participantsData);
                } else {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading participants</td></tr>';
                    console.error('Error loading participants:', data.error);
                }
            })
            .catch(error => {
                console.error('Error fetching participants:', error);
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Error loading participants</td></tr>';
            });
    }
    
    function renderParticipantsTable(participants) {
        const tableBody = document.getElementById('participantsTableBody');
        
        if (participants.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No participants found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = participants.map(participant => `
            <tr>
                <td>
                    <label class="standard-checkbox">
                        <input type="checkbox" name="participants" value="${participant.id}" onchange="updateSelectAllState()">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td>${participant.idnumber}</td>
                <td>${participant.name}</td>
                <td>${participant.department}</td>
            </tr>
        `).join('');
    }
    
    // Function to update select all checkbox state
    window.updateSelectAllState = function() {
        const allCheckboxes = document.querySelectorAll('input[name="participants"]');
        const checkedCheckboxes = document.querySelectorAll('input[name="participants"]:checked');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = allCheckboxes.length > 0 && checkedCheckboxes.length === allCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
        }
    };
    
    // Participant search functionality
    const participantSearch = document.getElementById('participantSearch');
    if (participantSearch) {
        participantSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredParticipants = participantsData.filter(participant =>
                participant.name.toLowerCase().includes(searchTerm) ||
                participant.idnumber.toLowerCase().includes(searchTerm) ||
                participant.department.toLowerCase().includes(searchTerm)
            );
            renderParticipantsTable(filteredParticipants);
        });
    }
    
    // Select all participants functionality
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('input[name="participants"]');
            checkboxes.forEach(checkbox => checkbox.checked = this.checked);
        });
    }
    
    // Create training form submission
    const createTrainingForm = document.getElementById('createTrainingForm');
    if (createTrainingForm) {
        createTrainingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            // Get selected participants
            const selectedParticipants = [];
            const participantCheckboxes = document.querySelectorAll('input[name="participants"]:checked');
            participantCheckboxes.forEach(checkbox => {
                selectedParticipants.push(checkbox.value);
            });
            
            // Validate that at least one participant is selected
            if (selectedParticipants.length === 0) {
                showNotification('Please select at least one participant for the training.', 'warning');
                return;
            }
            
            // Add participants to form data
            selectedParticipants.forEach(participantId => {
                formData.append('participants', participantId);
            });
            
            const submitBtn = document.querySelector('button[type="submit"][form="createTrainingForm"]');
            if (!submitBtn) {
                console.error('Submit button not found');
                showNotification('Error: Submit button not found', 'error');
                return;
            }
            
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;
            
            fetch('/training/admin/training/create/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message, 'success');
                    closeModal('createTrainingModal');
                    // Reload page to show new training
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    if (data.errors) {
                        // Show specific field errors
                        const errorMessages = [];
                        for (const field in data.errors) {
                            const errors = data.errors[field];
                            if (Array.isArray(errors)) {
                                errorMessages.push(...errors);
                            } else {
                                errorMessages.push(errors);
                            }
                        }
                        showNotification(`Error creating training: ${errorMessages.join(', ')}`, 'error');
                    } else {
                        showNotification('Error creating training', 'error');
                    }
                    console.error('Form errors:', data.errors);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error creating training', 'error');
            })
            .finally(() => {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        });
    }
    
    // View training details
    document.querySelectorAll('.view-training-btn').forEach(button => {
        button.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-training-id');
            viewTrainingDetails(trainingId);
        });
    });
    
    function viewTrainingDetails(trainingId) {
        const modal = document.getElementById('trainingDetailsModal');
        const title = document.getElementById('trainingDetailsTitle');
        const content = document.getElementById('trainingDetailsContent');
        
        content.innerHTML = '<div class="loading-content"><i class="fas fa-spinner fa-spin"></i>Loading training details...</div>';
        showModal('trainingDetailsModal');
        
        fetch(`/training/admin/training/${trainingId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    title.textContent = `Training: ${data.training.title}`;
                    content.innerHTML = `
                        <div class="training-details-header">
                            <div class="training-details-info">
                                <h4>${data.training.title}</h4>
                                <p><strong>Objective:</strong> ${data.training.objective}</p>
                            </div>
                            <div class="training-details-meta">
                                <div><strong>Speaker:</strong> ${data.training.speaker}</div>
                                <div><strong>Date:</strong> ${data.training.training_date}</div>
                            </div>
                        </div>
                        
                        <div class="training-stats">
                            <div class="training-stat">
                                <div class="training-stat-value">${data.training.total_participants}</div>
                                <div class="training-stat-label">Total Participants</div>
                            </div>
                            <div class="training-stat">
                                <div class="training-stat-value">${data.responses.length}</div>
                                <div class="training-stat-label">Responses Received</div>
                            </div>
                            <div class="training-stat">
                                <div class="training-stat-value">${data.training.progress_percentage}%</div>
                                <div class="training-stat-label">Progress</div>
                            </div>
                        </div>
                        
                        <div class="responses-table">
                            <h5>Participant Responses</h5>
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Participant</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.responses.length > 0 ? data.responses.map(response => `
                                            <tr>
                                                <td>${response.participant_name}</td>
                                                <td>${response.submitted_at}</td>
                                                <td>
                                                    <span class="status-pill status-${getStatusColor(response.status)}">
                                                        ${response.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button class="btn btn-icon view-response-details-btn" data-evaluation-id="${response.id}">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="4" class="table-no-data">
                                                    <div class="empty-icon">
                                                        <i class="fas fa-comments"></i>
                                                    </div>
                                                    <div class="table-no-data-title">No Responses Yet</div>
                                                    <div class="table-no-data-desc">Participants haven't submitted their evaluations</div>
                                                </td>
                                            </tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                    
                    // Attach view response handlers
                    content.querySelectorAll('.view-response-details-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const evaluationId = this.getAttribute('data-evaluation-id');
                            viewResponseDetails(evaluationId);
                        });
                    });
                } else {
                    content.innerHTML = '<div class="error-message">Error loading training details</div>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                content.innerHTML = '<div class="error-message">Error loading training details</div>';
            });
    }
    
    // Delete training
    document.querySelectorAll('.delete-training-btn').forEach(button => {
        button.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-training-id');
            const trainingTitle = this.getAttribute('data-training-title');
            
            document.getElementById('deleteTrainingName').textContent = trainingTitle;
            document.getElementById('confirmDeleteBtn').setAttribute('data-training-id', trainingId);
            
            showModal('deleteConfirmModal');
        });
    });
    
    // Confirm delete training
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-training-id');
            const originalText = this.innerHTML;
            
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            this.disabled = true;
            
            fetch(`/training/admin/training/${trainingId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message, 'success');
                    closeModal('deleteConfirmModal');
                    // Reload page to show updated list
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showNotification('Error deleting training', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error deleting training', 'error');
            })
            .finally(() => {
                this.innerHTML = originalText;
                this.disabled = false;
            });
        });
    }
    
    // View response details from responses tab
    document.querySelectorAll('.view-response-btn').forEach(button => {
        button.addEventListener('click', function() {
            const evaluationId = this.getAttribute('data-evaluation-id');
            viewResponseDetails(evaluationId);
        });
    });
    
    function viewResponseDetails(evaluationId) {
        const content = document.getElementById('responseDetailsContent');
        
        content.innerHTML = '<div class="loading-content"><i class="fas fa-spinner fa-spin"></i>Loading response details...</div>';
        showModal('responseDetailsModal');
        
        fetch(`/training/admin/evaluation/${evaluationId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    content.innerHTML = `
                        <div class="response-header">
                            <div class="response-info">
                                <h4>${data.evaluation.participant_name}</h4>
                                <p><strong>Training:</strong> ${data.evaluation.training_title}</p>
                            </div>
                            <div class="response-meta">
                                <div><strong>Status:</strong> 
                                    <span class="status-pill status-${getStatusColor(data.evaluation.status)}">
                                        ${data.evaluation.status}
                                    </span>
                                </div>
                                <div><strong>Submitted:</strong> ${data.evaluation.submitted_at}</div>
                            </div>
                        </div>
                        
                        <div class="evaluation-display">
                            <h4 class="evaluation-display-title">Training Evaluation</h4>
                            ${renderEvaluationDisplay(data.evaluation)}
                        </div>
                        
                        ${data.supervisor_assessment ? `
                        <div class="supervisor-assessment">
                            <h4 class="supervisor-assessment-title">Supervisor Assessment</h4>
                            ${renderSupervisorAssessment(data.supervisor_assessment)}
                        </div>
                        ` : ''}
                        
                        ${data.manager_review ? `
                        <div class="manager-review">
                            <h4 class="manager-review-title">Manager Review</h4>
                            ${renderManagerReview(data.manager_review)}
                        </div>
                        ` : ''}
                    `;
                } else {
                    content.innerHTML = '<div class="error-message">Error loading response details</div>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                content.innerHTML = '<div class="error-message">Error loading response details</div>';
            });
    }
    
    // Helper functions
    function getStatusColor(status) {
        switch(status.toLowerCase()) {
            case 'submitted': return 'yellow';
            case 'supervisor reviewed': return 'blue';
            case 'approved': return 'green';
            case 'disapproved': return 'red';
            default: return 'gray';
        }
    }
    
    function renderEvaluationDisplay(evaluation) {
        return `
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Content Evaluation</h5>
                <div class="evaluation-grid">
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Related to Job:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.content_related_to_job)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Explained Clearly:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.content_explained_clearly)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Suitable for Topic:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.content_suitable_for_topic)}</span>
                    </div>
                </div>
            </div>
            
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Program Organization</h5>
                <div class="evaluation-grid">
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Clear Goals:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.program_clear_goals)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Met Goals:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.program_met_goals)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Easy to Follow:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.program_easy_to_follow)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Easy to Understand:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.program_easy_to_understand)}</span>
                    </div>
                </div>
            </div>
            
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Speaker Effectiveness</h5>
                <div class="evaluation-grid">
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Speaker Knowledge:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.speaker_knowledge)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Clear Communication:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.speaker_clear_communication)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Answered Questions:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.speaker_answered_questions)}</span>
                    </div>
                </div>
            </div>
            
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Training Environment</h5>
                <div class="evaluation-grid">
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Training Organization:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.training_organization)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Suitable Facilities:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.suitable_facilities)}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Helpful Materials:</span>
                        <span class="evaluation-item-value">${renderRating(evaluation.helpful_materials)}</span>
                    </div>
                </div>
            </div>
            
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Open-ended Feedback</h5>
                <div class="text-display">
                    <div class="text-display-label">Most Interesting Topic:</div>
                    <div class="text-display-content">${evaluation.most_interesting_topic || 'Not provided'}</div>
                </div>
                <div class="text-display">
                    <div class="text-display-label">Feedback & Recommendations:</div>
                    <div class="text-display-content">${evaluation.feedback_recommendations || 'Not provided'}</div>
                </div>
                <div class="text-display">
                    <div class="text-display-label">Future Training Topics:</div>
                    <div class="text-display-content">${evaluation.future_training_topics || 'Not provided'}</div>
                </div>
            </div>
            
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Application to Work</h5>
                <div class="text-display">
                    <div class="text-display-label">New Things Learned:</div>
                    <div class="text-display-content">${evaluation.new_things_learned_work || 'Not provided'}</div>
                </div>
                <div class="text-display">
                    <div class="text-display-label">How to Apply at Work:</div>
                    <div class="text-display-content">${evaluation.how_apply_at_work || 'Not provided'}</div>
                </div>
                <div class="evaluation-grid">
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Target Implementation Date:</span>
                        <span class="evaluation-item-value">${evaluation.target_implementation_date || 'Not set'}</span>
                    </div>
                    <div class="evaluation-item">
                        <span class="evaluation-item-label">Actual Implementation Date:</span>
                        <span class="evaluation-item-value">${evaluation.actual_implementation_date || 'Not set'}</span>
                    </div>
                </div>
            </div>
            
            <div class="evaluation-section">
                <h5 class="evaluation-section-title">Application to Self</h5>
                <div class="text-display">
                    <div class="text-display-label">Personal Learning:</div>
                    <div class="text-display-content">${evaluation.new_things_learned_personal || 'Not provided'}</div>
                </div>
                <div class="text-display">
                    <div class="text-display-label">Daily Life Application:</div>
                    <div class="text-display-content">${evaluation.how_apply_daily_life || 'Not provided'}</div>
                </div>
            </div>
        `;
    }
    
    function renderSupervisorAssessment(assessment) {
        return `
            <div class="text-display">
                <div class="text-display-label">Supervisor Name:</div>
                <div class="text-display-content">${assessment.supervisor_name}</div>
            </div>
            <div class="text-display">
                <div class="text-display-label">Result and Impact:</div>
                <div class="text-display-content">${assessment.result_and_impact}</div>
            </div>
            <div class="text-display">
                <div class="text-display-label">Recommendations:</div>
                <div class="text-display-content">${assessment.recommendations}</div>
            </div>
            <div class="evaluation-item">
                <span class="evaluation-item-label">Overall Assessment:</span>
                <span class="evaluation-item-value">${renderRating(assessment.overall_assessment)}</span>
            </div>
        `;
    }
    
    function renderManagerReview(review) {
        return `
            <div class="text-display">
                <div class="text-display-label">Manager Name:</div>
                <div class="text-display-content">${review.manager_name}</div>
            </div>
            <div class="evaluation-item">
                <span class="evaluation-item-label">Decision:</span>
                <span class="evaluation-item-value">
                    <span class="status-pill status-${review.decision.toLowerCase() === 'approved' ? 'green' : 'red'}">
                        ${review.decision}
                    </span>
                </span>
            </div>
            ${review.comments ? `
            <div class="text-display">
                <div class="text-display-label">Comments:</div>
                <div class="text-display-content">${review.comments}</div>
            </div>
            ` : ''}
        `;
    }
    
    function renderRating(value) {
        if (!value) return 'Not rated';
        return `<span class="rating-number">${value}</span>`;
    }
    
    // Utility functions
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `toast toast-${type}`;
        notification.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        }
    });
    
    // Close modal with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
    
    // Make functions globally available
    window.closeModal = closeModal;
});

// Chart variables
let responseStatusChart = null;
let responseTimelineChart = null;

// Initialize charts
function initializeCharts() {
    initializeResponseStatusChart();
    initializeTimelineChart();
}

// Initialize response status pie chart
function initializeResponseStatusChart() {
    const ctx = document.getElementById('responseStatusChart');
    console.log('Initializing pie chart...', { ctx });
    
    if (!ctx) {
        console.error('Pie chart canvas not found!');
        return;
    }
    
    // Get data from global variables (set in template)
    console.log('Chart data:', window.trainingChartData);
    const statusData = window.trainingChartData ? window.trainingChartData.statusData : {};
    console.log('Status data:', statusData);
    
    const labels = Object.keys(statusData);
    const data = Object.values(statusData);
    console.log('Chart labels:', labels);
    console.log('Chart data values:', data);
    
    // Check if we have any data
    const totalData = data.reduce((sum, value) => sum + value, 0);
    console.log('Total data points:', totalData);
    
    // If no data, show a placeholder
    if (totalData === 0) {
        labels.push('No Data Available');
        data.push(1);
    }
    
    // Theme-aware colors matching the CSS design system
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    
    // Use consistent color palette from CSS variables
    const colors = [
        '#6366f1', // Primary - for Submitted
        '#06b6d4', // Accent - for Supervisor Reviewed  
        '#9b59b6', // Purple - for Manager Reviewed
        '#10b981', // Success - for Approved
        '#ef4444', // Error - for Disapproved
        '#6b7280'  // Gray - for Unanswered
    ];
    
    try {
        responseStatusChart = new Chart(ctx, {
            type: 'doughnut', // Use doughnut instead of pie for modern look
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: totalData === 0 ? ['#e5e7eb'] : colors.slice(0, labels.length),
                    borderColor: totalData === 0 ? ['#e5e7eb'] : colors.slice(0, labels.length).map(color => color),
                    borderWidth: 0,
                    hoverOffset: totalData === 0 ? 0 : 10, // No hover effect for empty chart
                    hoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%', // Creates the doughnut hole
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                if (totalData === 0) {
                                    return 'No training evaluations yet';
                                }
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                },
                interaction: {
                    intersect: false
                }
            }
        });
        console.log('Pie chart created successfully!', responseStatusChart);
    } catch (error) {
        console.error('Error creating pie chart:', error);
    }
}

// Initialize timeline chart
function initializeTimelineChart() {
    const ctx = document.getElementById('responseTimelineChart');
    if (!ctx) return;
    
    // Theme-aware colors
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    // Get data from global variables (set in template)
    const monthLabels = window.trainingChartData ? window.trainingChartData.monthLabels : [];
    const monthData = window.trainingChartData ? window.trainingChartData.monthData : [];
    
    responseTimelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Trainings Created',
                data: monthData,
                borderColor: '#6366f1', // Primary color from CSS
                backgroundColor: 'rgba(99, 102, 241, 0.1)', // Light primary with transparency
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    cornerRadius: 8,
                    caretPadding: 10,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} trainings`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, system-ui, sans-serif'
                        },
                        padding: 8
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        display: false
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12,
                            family: 'Inter, system-ui, sans-serif'
                        },
                        padding: 8
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                bar: {
                    borderRadius: 8,
                    borderSkipped: false
                }
            }
        }
    });
}

// Update timeline chart type
function updateTimelineChart(chartType) {
    if (!responseTimelineChart) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    responseTimelineChart.config.type = chartType;
    
    // Update dataset style based on chart type with consistent colors and modern bar styling
    if (chartType === 'bar') {
        responseTimelineChart.data.datasets[0].backgroundColor = function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            
            if (!chartArea) {
                return '#6366f1';
            }
            
            // Create gradient for bars
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.7)');
            gradient.addColorStop(1, '#6366f1');
            return gradient;
        };
        responseTimelineChart.data.datasets[0].borderColor = '#5856eb';
        responseTimelineChart.data.datasets[0].borderWidth = 0;
        responseTimelineChart.data.datasets[0].borderRadius = 8;
        responseTimelineChart.data.datasets[0].borderSkipped = false;
        responseTimelineChart.data.datasets[0].fill = false;
        
        // Update bar chart specific options
        responseTimelineChart.options.scales.x.grid.display = false;
        responseTimelineChart.options.plugins.tooltip.displayColors = false;
        
        // Add hover effects for bars
        responseTimelineChart.data.datasets[0].hoverBackgroundColor = '#5856eb';
        responseTimelineChart.data.datasets[0].hoverBorderColor = '#4338ca';
        responseTimelineChart.data.datasets[0].hoverBorderWidth = 2;
        
    } else {
        responseTimelineChart.data.datasets[0].backgroundColor = 'rgba(99, 102, 241, 0.1)';
        responseTimelineChart.data.datasets[0].borderColor = '#6366f1';
        responseTimelineChart.data.datasets[0].fill = true;
        responseTimelineChart.data.datasets[0].borderWidth = 3;
        responseTimelineChart.data.datasets[0].tension = 0.4;
        
        // Reset grid for line chart
        responseTimelineChart.options.scales.x.grid.display = true;
        responseTimelineChart.options.plugins.tooltip.displayColors = true;
        
        // Line chart specific styling
        responseTimelineChart.data.datasets[0].pointBackgroundColor = '#6366f1';
        responseTimelineChart.data.datasets[0].pointBorderColor = '#ffffff';
        responseTimelineChart.data.datasets[0].pointBorderWidth = 2;
        responseTimelineChart.data.datasets[0].pointRadius = 6;
        responseTimelineChart.data.datasets[0].pointHoverRadius = 8;
    }
    
    responseTimelineChart.update();
}

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('trainingSearchInput');
    const searchClear = document.querySelector('.search-clear');
    let searchTimeout;
    
    console.log('Initializing search...', { searchInput, searchClear });
    
    function toggleSearchClear() {
        if (searchClear) {
            if (searchInput && searchInput.value.trim()) {
                searchClear.style.display = 'block';
            } else {
                searchClear.style.display = 'none';
            }
        }
    }

    // Helper to update table and pagination, with empty-state fallback
    function updateTableFromResponse(data) {
        console.log('Updating table with data:', data);
        const trainingTableBody = document.getElementById('trainingTableBody');
        const paginationContainer = document.getElementById('paginationContainer');

        if (!trainingTableBody) {
            console.error('Training table body not found!');
            return;
        }

        const html = data && data.table_html ? data.table_html.trim() : '';
        console.log('Table HTML length:', html.length);

        if (html) {
            trainingTableBody.innerHTML = data.table_html;
            console.log('Updated table with server HTML');
        } else {
            // Show finance-style empty state when there are no results
            const isSearch = searchInput && searchInput.value && searchInput.value.trim();
            const emptyStateHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h5>No trainings found</h5>
                            <p>${isSearch ? 'Try adjusting your search criteria.' : 'Create your first training to get started.'}</p>
                        </div>
                    </td>
                </tr>
            `;
            trainingTableBody.innerHTML = emptyStateHTML;
            console.log('Updated table with empty state');
        }

        if (paginationContainer) {
            paginationContainer.innerHTML = data && data.pagination_html ? data.pagination_html : '';
            console.log('Updated pagination');
        }

        // Re-attach handlers for newly inserted content
        attachDropdownHandlers();
        attachActionHandlers();
        console.log('Re-attached handlers');
    }
    
    if (searchInput) {
        console.log('Attaching search input listener...');
        searchInput.addEventListener('input', function() {
            console.log('Search input triggered:', this.value);
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const search = encodeURIComponent(this.value);
                const url = `/training/admin/search/?search=${search}`;
                console.log('Making search request:', url);
                fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                })
                .then(response => {
                    console.log('Search response status:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('Search response data:', data);
                    if (data.success) {
                        updateTableFromResponse(data);
                    } else {
                        console.log('Search response not successful, showing empty state');
                        updateTableFromResponse({});
                    }
                })
                .catch(error => {
                    console.error('Search error:', error);
                    updateTableFromResponse({});
                });
            }, 300);
            toggleSearchClear();
        });
    } else {
        console.error('Search input not found!');
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                toggleSearchClear();
            }
            fetch('/training/admin/search/', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateTableFromResponse(data);
                } else {
                    updateTableFromResponse({});
                }
            })
            .catch(error => {
                console.error('Search clear error:', error);
                updateTableFromResponse({});
            });
        });
    }
    
    // Initial state
    toggleSearchClear();
    
    // Handle pagination clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.ajax-page-btn')) {
            e.preventDefault();
            const pageBtn = e.target.closest('.ajax-page-btn');
            const page = pageBtn.getAttribute('data-page');
            const searchTerm = searchInput ? encodeURIComponent(searchInput.value) : '';
            const url = `/training/admin/search/?page=${page}${searchTerm ? '&search=' + searchTerm : ''}`;
            
            fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateTableFromResponse(data);
                } else {
                    updateTableFromResponse({});
                }
            })
            .catch(error => console.error('Pagination error:', error));
        }
    });
}

function attachDropdownHandlers() {
    // Re-attach dropdown functionality for dynamically loaded content
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.action-dropdown');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Close other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                    otherMenu.closest('.action-dropdown').classList.remove('open');
                }
            });
            
            // Toggle current dropdown
            menu.classList.toggle('show');
            dropdown.classList.toggle('open');
        });
    });
}

function attachActionHandlers() {
    // Re-attach view training handlers
    document.querySelectorAll('.view-training-btn').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-training-id');
            viewTrainingDetails(trainingId);
        });
    });
    
    // Re-attach delete training handlers
    document.querySelectorAll('.delete-training-btn').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            const trainingId = this.getAttribute('data-training-id');
            const trainingTitle = this.getAttribute('data-training-title');
            
            document.getElementById('deleteTrainingName').textContent = trainingTitle;
            document.getElementById('confirmDeleteBtn').setAttribute('data-training-id', trainingId);
            
            showModal('deleteConfirmModal');
        });
    });
}