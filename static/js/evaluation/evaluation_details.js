document.addEventListener('DOMContentLoaded', function() {
    console.log('Evaluation Details page loaded');

    // Period tab switching functionality
    const periodTabs = document.querySelectorAll('.tab[data-period]');
    periodTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent any default behavior
            
            const period = this.dataset.period;
            
            // Update active tab
            periodTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Load period data via AJAX
            loadPeriodData(period);
        });
    });

    // Function to load period data via AJAX
    function loadPeriodData(period) {
        const currentUrl = new URL(window.location);
        const evaluationId = currentUrl.pathname.split('/').pop();
        
        // Show loading state
        const contentArea = document.getElementById('evaluation-content');
        if (contentArea) {
            contentArea.style.opacity = '0.6';
        }
        
        // Prepare AJAX request
        const formData = new FormData();
        formData.append('period', period);
        
        // Preserve search if it exists
        const searchInput = document.getElementById('trainingSearchInput');
        if (searchInput && searchInput.value) {
            formData.append('search', searchInput.value);
        }
        
        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update statistics cards
                updateStatistics(data);
                
                // Update page header
                updatePageHeader(data);
                
                // Update participants table
                updateParticipantsTable(data);
                
                // Update period info
                updatePeriodInfo(data, period);
                
                // Update URL without page reload
                const url = new URL(window.location);
                url.searchParams.set('period', period);
                if (searchInput && searchInput.value) {
                    url.searchParams.set('search', searchInput.value);
                }
                window.history.pushState({}, '', url.toString());
            } else {
                console.error('Error loading period data:', data.error);
                alert('Error loading period data. Please try again.');
            }
        })
        .catch(error => {
            console.error('AJAX error:', error);
            alert('Error loading period data. Please try again.');
        })
        .finally(() => {
            // Remove loading state
            if (contentArea) {
                contentArea.style.opacity = '1';
            }
        });
    }

    // Function to update page header
    function updatePageHeader(data) {
        // Update participants count in header
        const participantsMeta = document.querySelector('.meta-item i.fa-users');
        if (participantsMeta) {
            const span = participantsMeta.nextElementSibling;
            if (span) {
                span.textContent = `${data.total_participants} Participants`;
            }
        }
        
        // Update progress percentage in header
        const progressMeta = document.querySelector('.meta-item i.fa-percentage');
        if (progressMeta) {
            const span = progressMeta.nextElementSibling;
            if (span) {
                span.textContent = `${data.progress_percentage}% Complete`;
            }
        }
    }

    // Function to update statistics cards
    function updateStatistics(data) {
        // Update total participants
        const statCards = document.querySelectorAll('.modern-stat-card');
        statCards.forEach(card => {
            const label = card.querySelector('.modern-stat-label');
            const value = card.querySelector('.modern-stat-value');
            const changeDiv = card.querySelector('.modern-stat-change');
            
            if (label && value) {
                if (label.textContent.includes('Assigned')) {
                    value.textContent = data.total_participants;
                    if (changeDiv) {
                        updateChangeIndicator(changeDiv, data.participants_change);
                    }
                } else if (label.textContent.includes('Completed')) {
                    value.textContent = data.submitted_count;
                    if (changeDiv) {
                        updateChangeIndicator(changeDiv, data.submitted_change);
                    }
                } else if (label.textContent.includes('In Progress')) {
                    value.textContent = data.in_progress_count;
                    if (changeDiv) {
                        updateChangeIndicator(changeDiv, data.in_progress_change);
                    }
                } else if (label.textContent.includes('Pending')) {
                    value.textContent = data.pending_count;
                    if (changeDiv) {
                        updateChangeIndicator(changeDiv, data.pending_change);
                    }
                }
            }
        });
    }

    // Function to update change indicator
    function updateChangeIndicator(changeDiv, changeValue) {
        // Remove existing classes
        changeDiv.classList.remove('positive', 'negative');
        
        // Add appropriate class
        if (changeValue >= 0) {
            changeDiv.classList.add('positive');
        } else {
            changeDiv.classList.add('negative');
        }
        
        // Update the icon
        const icon = changeDiv.querySelector('.modern-stat-change-icon i');
        if (icon) {
            icon.classList.remove('fa-arrow-up', 'fa-arrow-down');
            icon.classList.add(changeValue >= 0 ? 'fa-arrow-up' : 'fa-arrow-down');
        }
        
        // Update the percentage text
        const percentageText = changeDiv.querySelector('.modern-stat-change-icon').nextSibling;
        if (percentageText && percentageText.nodeType === Node.TEXT_NODE) {
            percentageText.textContent = ` ${Math.abs(changeValue).toFixed(1)}%`;
        }
    }

    // Function to update participants table
    function updateParticipantsTable(data) {
        const tableBody = document.querySelector('#participantsTable tbody');
        if (!tableBody || !data.participants_data) return;
        
        tableBody.innerHTML = '';
        
        if (data.participants_data.length === 0) {
            // Check if there's an active search
            const searchInput = document.getElementById('trainingSearchInput');
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            ${searchTerm ? 
                                '<i class="fa fa-search"></i><h5>No Results Found</h5><p>No participants found matching "' + searchTerm + '". Try adjusting your search terms.</p>' :
                                '<i class="fa fa-users"></i><h5>No Participants</h5><p>No participants assigned to this period</p>'
                            }
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        data.participants_data.forEach(participant => {
            const row = document.createElement('tr');
            row.className = 'participant-row';
            row.setAttribute('data-status', participant.is_submitted ? 'submitted' : 'pending');
            row.setAttribute('data-name', participant.name.toLowerCase());
            row.setAttribute('data-username', participant.username.toLowerCase());
            row.setAttribute('data-department', participant.department.toLowerCase());
            row.setAttribute('data-position', participant.position.toLowerCase());
            
            row.innerHTML = `
                <td>${participant.idnumber}</td>
                <td>${participant.name}</td>
                <td class="hide-column">${participant.department}</td>
                <td class="hide-column">${participant.position}</td>
                <td class="hide-column">
                    ${participant.submitted_at ? new Date(participant.submitted_at).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}) : '<span class="text-muted">-</span>'}
                </td>
                <td style="text-align:center;">
                    <span class="status-pill 
                        ${participant.status === 'Submitted' ? 'status-yellow' :
                          participant.status === 'Supervisor Reviewed' ? 'status-blue' :
                          participant.status === 'Manager Reviewed' ? 'status-purple' :
                          participant.status === 'Approved' ? 'status-green' :
                          participant.status === 'Disapproved' ? 'status-red' :
                          participant.status === 'Not Started' ? 'status-gray' : 'status-orange'}">
                        ${participant.status}
                    </span>
                </td>
                <td style="text-align:center;">
                    ${participant.is_submitted && participant.evaluation_id ? 
                        `<button class="btn btn-sm btn-primary view-evaluation-btn" data-evaluation-id="${participant.evaluation_id}">
                            <i class="fas fa-eye"></i>
                            View
                        </button>` : ''}
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    // Function to update period info
    function updatePeriodInfo(data, period) {
        const periodInfoEl = document.querySelector('.period-info');
        if (periodInfoEl && data.period_tabs) {
            const selectedTab = data.period_tabs.find(tab => tab.value === period);
            if (selectedTab) {
                periodInfoEl.querySelector('span').textContent = `Showing data for: ${selectedTab.label}`;
            }
        }
    }

    // Search functionality
    const searchInput = document.getElementById('trainingSearchInput');
    const searchClear = document.querySelector('.search-clear');
    const participantRows = document.querySelectorAll('.participant-row');
    const tableBody = document.querySelector('#participantsTable tbody');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            // Show/hide clear button
            if (searchClear) {
                searchClear.style.display = searchTerm ? 'block' : 'none';
            }

            // Filter participant rows
            let visibleCount = 0;
            participantRows.forEach(row => {
                const name = row.dataset.name || '';
                const username = row.dataset.username || '';
                const department = row.dataset.department || '';
                const position = row.dataset.position || '';
                
                const shouldShow = !searchTerm || 
                    name.includes(searchTerm) ||
                    username.includes(searchTerm) ||
                    department.includes(searchTerm) ||
                    position.includes(searchTerm);
                
                row.style.display = shouldShow ? '' : 'none';
                if (shouldShow) visibleCount++;
            });

            // Handle empty state for search results
            updateSearchEmptyState(searchTerm, visibleCount);
        });
    }

    // Function to update empty state for search results
    function updateSearchEmptyState(searchTerm, visibleCount) {
        // Remove existing empty state row if it exists
        const existingEmptyRow = tableBody.querySelector('.empty-search-row');
        if (existingEmptyRow) {
            existingEmptyRow.remove();
        }

        // If no results found and there's a search term, show empty state
        if (visibleCount === 0 && searchTerm) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-search-row';
            emptyRow.innerHTML = `
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fa fa-search"></i>
                        <h5>No Results Found</h5>
                        <p>No participants found matching "${searchTerm}". Try adjusting your search terms.</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(emptyRow);
        }
    }

    // Clear search
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            
            // Show all rows
            participantRows.forEach(row => {
                row.style.display = '';
            });
            
            // Remove empty state if it exists
            const existingEmptyRow = tableBody.querySelector('.empty-search-row');
            if (existingEmptyRow) {
                existingEmptyRow.remove();
            }
            
            searchInput.focus();
        });
    }

    // View evaluation button handler
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-evaluation-btn')) {
            const btn = e.target.closest('.view-evaluation-btn');
            const evaluationId = btn.dataset.evaluationId;
            
            if (evaluationId) {
                loadEvaluationAssessmentDetails(evaluationId);
            }
        }
    });

    // Function to load evaluation assessment details
    function loadEvaluationAssessmentDetails(evaluationId) {
        const offcanvas = document.getElementById('evaluationDetailsOffcanvas');
        const offcanvasContent = document.getElementById('evaluationDetailsContent');
        const offcanvasTitle = document.getElementById('evaluationDetailsOffcanvasLabel');
        
        if (!offcanvas || !offcanvasContent) return;
        
        // Update title
        if (offcanvasTitle) {
            offcanvasTitle.textContent = 'Evaluation Assessment Details';
        }
        
        // Show loading state
        offcanvasContent.innerHTML = `
            <div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        // Show the offcanvas using app's lightweight offcanvas helpers (no Bootstrap)
        function openOffcanvas(el) {
            if (!el) return;
            // remove any existing open offcanvas
            const open = document.querySelector('.offcanvas.show');
            if (open && open !== el) {
                closeOffcanvas(open);
            }
            // show this offcanvas
            el.classList.add('show');
            // add backdrop if not present
            let backdrop = document.querySelector('.offcanvas-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.className = 'offcanvas-backdrop';
                document.body.appendChild(backdrop);
            }
            backdrop.classList.add('show');
            // mark body as offcanvas-open to prevent scroll/shift
            document.body.classList.add('offcanvas-open');
        }

        function closeOffcanvas(el) {
            if (!el) return;
            el.classList.remove('show');
            const backdrop = document.querySelector('.offcanvas-backdrop');
            if (backdrop) backdrop.classList.remove('show');
            document.body.classList.remove('offcanvas-open');
        }

        openOffcanvas(offcanvas);

        // Close handlers: close button, backdrop click, Escape key
        document.addEventListener('click', function(ev) {
            const closeBtn = ev.target.closest && ev.target.closest('.offcanvas-close');
            if (closeBtn) {
                const oc = closeBtn.closest('.offcanvas');
                closeOffcanvas(oc);
            }

            // backdrop click
            if (ev.target.classList && ev.target.classList.contains('offcanvas-backdrop')) {
                const oc = document.querySelector('.offcanvas.show');
                if (oc) closeOffcanvas(oc);
            }
        });

        document.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape') {
                const oc = document.querySelector('.offcanvas.show');
                if (oc) closeOffcanvas(oc);
            }
        });
        
        // Load assessment details via AJAX
        fetch(`/evaluation/assessment/${evaluationId}/details/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                offcanvasContent.innerHTML = data.html;
            } else {
                offcanvasContent.innerHTML = `
                    <div class="text-center">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h5>Error Loading Details</h5>
                            <p class="mb-0">${data.error || 'Failed to load evaluation details. Please try again.'}</p>
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading evaluation details:', error);
            offcanvasContent.innerHTML = `
                <div class="text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h5>Connection Error</h5>
                        <p class="mb-0">Failed to load evaluation details. Please check your connection and try again.</p>
                    </div>
                </div>
            `;
        });
    }

    // Export report functionality
    window.exportTrainingReport = function() {
        // For now, just show an alert - this can be expanded later
        alert('Export report functionality will be implemented to generate Excel/PDF reports of evaluation data.');
    };

    // Status filter functionality (if needed)
    const statusButtons = document.querySelectorAll('[data-status-filter]');
    statusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const status = this.dataset.statusFilter;
            
            // Remove active class from all buttons
            statusButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter rows by status
            participantRows.forEach(row => {
                const rowStatus = row.dataset.status;
                const shouldShow = status === 'all' || rowStatus === status;
                row.style.display = shouldShow ? '' : 'none';
            });
        });
    });
});
