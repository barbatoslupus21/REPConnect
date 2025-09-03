document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializeCharts();
    initializeProgressCircle();
    initializeTableFunctionality();
    
    // Initialize Chart.js charts
    function initializeCharts() {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkTheme ? '#e2e8f0' : '#374151';
        const gridColor = isDarkTheme ? '#374151' : '#e5e7eb';
        
        // Status Distribution Chart (Doughnut)
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            const statusLabels = Object.keys(statusData);
            const statusValues = Object.values(statusData);
            
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        data: statusValues,
                        backgroundColor: [
                            '#6366f1', // primary - submitted
                            '#22c55e', // green - approved  
                            '#3b82f6', // blue - supervisor reviewed
                            '#8b5cf6', // purple - manager reviewed
                            '#ef4444', // red - disapproved
                            '#6b7280', // gray - not started
                        ],
                        borderWidth: 2,
                        borderColor: isDarkTheme ? '#1e293b' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                color: textColor,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: gridColor,
                            borderWidth: 1
                        }
                    }
                }
            });
        }
        
        // Department Response Chart (Bar)
        const departmentCtx = document.getElementById('departmentChart');
        if (departmentCtx) {
            const departmentLabels = Object.keys(departmentData);
            const departmentValues = Object.values(departmentData);
            
            new Chart(departmentCtx, {
                type: 'bar',
                data: {
                    labels: departmentLabels,
                    datasets: [{
                        label: 'Responses',
                        data: departmentValues,
                        backgroundColor: '#6366f1',
                        borderColor: '#4f46e5',
                        borderWidth: 1,
                        borderRadius: 4
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
                            backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: gridColor,
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                color: textColor
                            },
                            grid: {
                                color: gridColor
                            }
                        },
                        x: {
                            ticks: {
                                color: textColor,
                                maxRotation: 45
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
        
        // Progress Over Time Chart (Line)
        const progressCtx = document.getElementById('progressChart');
        if (progressCtx) {
            const progressLabels = progressData.map(item => item.date);
            const progressValues = progressData.map(item => item.submissions);
            
            new Chart(progressCtx, {
                type: 'line',
                data: {
                    labels: progressLabels,
                    datasets: [{
                        label: 'Daily Submissions',
                        data: progressValues,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#22c55e',
                        pointBorderColor: '#16a34a',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
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
                            backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: gridColor,
                            borderWidth: 1
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                color: textColor
                            },
                            grid: {
                                color: gridColor
                            }
                        },
                        x: {
                            ticks: {
                                color: textColor
                            },
                            grid: {
                                color: gridColor
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
    }
    
    // Initialize progress circle animation
    function initializeProgressCircle() {
        const progressCircle = document.querySelector('.progress-circle');
        if (progressCircle) {
            const percentage = progressCircle.getAttribute('data-percentage');
            
            // Set CSS custom property for the conic gradient
            progressCircle.style.setProperty('--percentage', percentage);
            
            // Animate the circle
            setTimeout(() => {
                progressCircle.style.background = `conic-gradient(
                    var(--primary-color) 0deg,
                    var(--primary-color) ${percentage * 3.6}deg,
                    var(--bg-secondary) ${percentage * 3.6}deg,
                    var(--bg-secondary) 360deg
                )`;
            }, 500);
        }
    }
    
    // Initialize table functionality
    function initializeTableFunctionality() {
        const searchInput = document.getElementById('participantSearch');
        const filterButtons = document.querySelectorAll('.btn-group .btn-action');
        const participantRows = document.querySelectorAll('.participant-row');
        
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                filterTable(searchTerm, getCurrentFilter());
            });
        }
        
        // Filter buttons functionality
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const filterStatus = this.getAttribute('data-status');
                const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
                filterTable(searchTerm, filterStatus);
            });
        });
        
        // View evaluation functionality
        document.querySelectorAll('.view-evaluation-btn').forEach(button => {
            button.addEventListener('click', function() {
                const participantId = this.getAttribute('data-participant-id');
                viewParticipantEvaluation(participantId);
            });
        });
        
        function getCurrentFilter() {
            const activeButton = document.querySelector('.btn-group .btn-action.active');
            return activeButton ? activeButton.getAttribute('data-status') : 'all';
        }
        
        function filterTable(searchTerm, filterStatus) {
            let visibleCount = 0;
            
            participantRows.forEach(row => {
                const name = row.getAttribute('data-name') || '';
                const username = row.getAttribute('data-username') || '';
                const department = row.getAttribute('data-department') || '';
                const position = row.getAttribute('data-position') || '';
                const status = row.getAttribute('data-status') || '';
                
                // Check search criteria
                const matchesSearch = !searchTerm || 
                    name.includes(searchTerm) || 
                    username.includes(searchTerm) || 
                    department.includes(searchTerm) || 
                    position.includes(searchTerm);
                
                // Check filter criteria
                const matchesFilter = filterStatus === 'all' || status === filterStatus;
                
                if (matchesSearch && matchesFilter) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Show/hide no results message
            updateNoResultsMessage(visibleCount);
        }
        
        function updateNoResultsMessage(visibleCount) {
            const tbody = document.querySelector('#participantsTable tbody');
            let noResultsRow = tbody.querySelector('.no-results-row');
            
            if (visibleCount === 0 && participantRows.length > 0) {
                if (!noResultsRow) {
                    noResultsRow = document.createElement('tr');
                    noResultsRow.className = 'no-results-row';
                    noResultsRow.innerHTML = `
                        <td colspan="7" class="table-no-data">
                            <div class="empty-icon">
                                <i class="fas fa-search"></i>
                            </div>
                            <div class="table-no-data-title">No Results Found</div>
                            <div class="table-no-data-desc">Try adjusting your search or filter criteria</div>
                        </td>
                    `;
                    tbody.appendChild(noResultsRow);
                }
                noResultsRow.style.display = '';
            } else if (noResultsRow) {
                noResultsRow.style.display = 'none';
            }
        }
    }
    
    // View participant evaluation (placeholder - you can implement this)
    function viewParticipantEvaluation(participantId) {
        // This could open a modal or redirect to evaluation details
        // For now, we'll show a notification
        showNotification(`Viewing evaluation for participant ID: ${participantId}`, 'info');
        
        // You could implement this to:
        // 1. Open a modal with evaluation details
        // 2. Redirect to a detailed evaluation page
        // 3. Fetch and display evaluation data via AJAX
    }
    
    // Utility function for notifications
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
    
    // Handle theme changes and update charts
    function handleThemeChange() {
        // Re-initialize charts when theme changes
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // Small delay to allow CSS variables to update
                    setTimeout(initializeCharts, 100);
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }
    
    // Initialize theme change handler
    handleThemeChange();
    
    // Export statistics (optional feature)
    function exportStatistics() {
        const statsData = {
            training: trainingId,
            totalParticipants: document.querySelector('[data-stat="total"]')?.textContent || 0,
            submitted: document.querySelector('[data-stat="submitted"]')?.textContent || 0,
            inProgress: document.querySelector('[data-stat="progress"]')?.textContent || 0,
            notStarted: document.querySelector('[data-stat="notstarted"]')?.textContent || 0,
            progressPercentage: document.querySelector('.progress-percentage')?.textContent || '0%',
            statusBreakdown: statusData,
            departmentBreakdown: departmentData,
            progressOverTime: progressData
        };
        
        // Convert to CSV or JSON and download
        const dataStr = JSON.stringify(statsData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `training-${trainingId}-statistics.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    // Make export function available globally (if you want to add an export button)
    window.exportStatistics = exportStatistics;
});