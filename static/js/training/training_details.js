document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializeCharts();
    initializeProgressCircle();
    initializeTableFunctionality();
    
    // Global off-canvas body scroll prevention
    document.addEventListener('show.bs.offcanvas', function() {
        document.body.classList.add('offcanvas-open');
    });
    
    document.addEventListener('hidden.bs.offcanvas', function() {
        document.body.classList.remove('offcanvas-open');
    });
    
    // Add slide-out animation for off-canvas hide
    document.addEventListener('hide.bs.offcanvas', function(event) {
        const offcanvas = event.target;
        offcanvas.classList.add('hiding');
        
        // Remove hiding class after animation completes
        setTimeout(() => {
            offcanvas.classList.remove('hiding');
        }, 300);
    });
    
    // Enhanced off-canvas accessibility
    document.addEventListener('shown.bs.offcanvas', function(event) {
        const offcanvas = event.target;
        const closeBtn = offcanvas.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.focus();
        }
    });
    
    // Clear off-canvas content when hidden
    document.addEventListener('hidden.bs.offcanvas', function(event) {
        const offcanvas = event.target;
        const content = offcanvas.querySelector('#evaluationDetailsContent');
        if (content) {
            content.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }
    });
    
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
        const searchInput = document.getElementById('trainingSearchInput');
        const searchClear = document.querySelector('.search-clear');
        let searchTimeout;
        
        // Search functionality with auto-submit
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.trim();
                
                // Show/hide clear button
                if (searchClear) {
                    searchClear.style.display = searchTerm ? 'block' : 'none';
                }
                
                // Clear previous timeout
                clearTimeout(searchTimeout);
                
                // Set new timeout for search
                searchTimeout = setTimeout(() => {
                    performSearch(searchTerm);
                }, 500); // 500ms delay for better UX
            });
            
            // Handle Enter key
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimeout);
                    performSearch(this.value.trim());
                }
            });
        }
        
        // Clear search functionality
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                searchInput.value = '';
                this.style.display = 'none';
                performSearch('');
            });
        }
        
        // Pagination functionality
        document.querySelectorAll('.ajax-page-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                const currentSearch = searchInput ? searchInput.value.trim() : '';
                loadPage(page, currentSearch);
            });
        });
        
        function performSearch(searchTerm) {
            loadPage(1, searchTerm); // Always go to page 1 when searching
        }
        
        function loadPage(page, searchTerm = '') {
            const url = new URL(window.location.href);
            url.searchParams.set('page', page);
            
            if (searchTerm) {
                url.searchParams.set('search', searchTerm);
            } else {
                url.searchParams.delete('search');
            }
            
            // Show loading state
            const tableContainer = document.querySelector('.common-table-container');
            if (tableContainer) {
                tableContainer.style.opacity = '0.6';
                tableContainer.style.pointerEvents = 'none';
            }
            
            // Fetch new data
            fetch(url.toString(), {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Check if the response indicates an error
                if (data.success === false) {
                    throw new Error(data.error || 'An error occurred while loading data');
                }
                
                // Update table content and pagination
                const tableContainer = document.querySelector('.common-table-container');
                const paginationContainer = document.querySelector('.pagination');
                
                if (data.html && tableContainer) {
                    // Parse the HTML response
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data.html, 'text/html');
                    
                    // Update table content
                    const newTable = doc.querySelector('.common-table-container');
                    const newPagination = doc.querySelector('.pagination');
                    
                    if (newTable && tableContainer) {
                        tableContainer.innerHTML = newTable.innerHTML;
                    }
                    
                    // Update pagination
                    if (newPagination && paginationContainer) {
                        paginationContainer.innerHTML = newPagination.innerHTML;
                    }
                    
                    // Re-initialize table functionality for new content
                    initializeTableFunctionality();
                    
                    // Update URL without page reload
                    window.history.pushState(null, '', url.toString());
                    
                    // Restore normal state
                    if (tableContainer) {
                        tableContainer.style.opacity = '1';
                        tableContainer.style.pointerEvents = 'auto';
                    }
                }
            })
            .catch(error => {
                console.error('Error loading page:', error);
                
                // Show error message to user
                showNotification(`Error loading data: ${error.message}`, 'error');
                
                // Restore normal state
                const tableContainer = document.querySelector('.common-table-container');
                if (tableContainer) {
                    tableContainer.style.opacity = '1';
                    tableContainer.style.pointerEvents = 'auto';
                }
            });
        }
        
        // View evaluation functionality
        document.querySelectorAll('.view-evaluation-btn').forEach(button => {
            button.addEventListener('click', function() {
                const evaluationId = this.getAttribute('data-evaluation-id');
                if (evaluationId && evaluationId !== 'None') {
                    viewParticipantEvaluation(evaluationId);
                } else {
                    showNotification('Evaluation ID not found', 'error');
                }
            });
        });
    }
    
    // View participant evaluation
    function viewParticipantEvaluation(evaluationId) {
        if (!evaluationId || evaluationId === 'None') {
            showNotification('Invalid evaluation ID', 'error');
            return;
        }
        
        // Find the evaluation ID for this participant
        fetch(`/training/admin/evaluation/${evaluationId}/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Load content into off-canvas
                document.getElementById('evaluationDetailsContent').innerHTML = data.html;
                
                // Show the off-canvas
                const offcanvas = new bootstrap.Offcanvas(document.getElementById('evaluationDetailsOffcanvas'));
                offcanvas.show();
            } else {
                showNotification(data.error || 'Failed to load evaluation details', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading evaluation:', error);
            showNotification('Error loading evaluation details', 'error');
        });
    }
    
    // Clear search function
    window.clearSearch = function() {
        const searchInput = document.getElementById('trainingSearchInput');
        const searchClear = document.querySelector('.search-clear');
        
        if (searchInput) {
            searchInput.value = '';
        }
        if (searchClear) {
            searchClear.style.display = 'none';
        }
        
        // Perform empty search to show all results
        performSearch('');
    };
    
    // Export training report function
    window.exportTrainingReport = function() {
        const trainingId = window.trainingId;
        if (trainingId) {
            // Show loading notification
            showNotification('Generating Excel report...', 'info');
            
            // Create a temporary link to download the file
            const link = document.createElement('a');
            link.href = `/training/admin/training/${trainingId}/export/`;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success notification after a delay
            setTimeout(() => {
                showNotification('Excel report downloaded successfully!', 'success');
            }, 1000);
        } else {
            showNotification('Training ID not found', 'error');
        }
    };
    
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