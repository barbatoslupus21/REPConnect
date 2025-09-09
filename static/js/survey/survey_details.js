document.addEventListener('DOMContentLoaded', function() {
    const surveyId = getSurveyIdFromUrl();
    let currentPage = 1;
    let currentSearchQuery = '';
    let responseStatusChart = null;
    let responseTimelineChart = null;
    
    // Initialize page
    initializePage();
    
    function initializePage() {
        if (!surveyId) {
            console.error('Survey ID not found in URL — cannot load survey details. Expected URL like /surveys/<id>/');
            // Replace loading placeholders with error states where appropriate
            const statsPlaceholders = document.querySelectorAll('.modern-stat-value');
            statsPlaceholders.forEach(el => el.textContent = '-');
            const questionAnalysis = document.getElementById('questionAnalysis');
            if (questionAnalysis) questionAnalysis.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Survey not found</h4><p>Unable to determine survey id from URL.</p></div>';
            const responsesBody = document.getElementById('responsesTableBody');
            if (responsesBody) responsesBody.innerHTML = `<tr><td colspan="6" class="table-no-data"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Survey not found</h4><p>Unable to load responses.</p></div></td></tr>`;
            return;
        }
        setupTabNavigation();
        loadSurveyStats();
        setupSearchFunctionality();
        setupExportButton();
        setupOffcanvas();
        loadResponsesData();
    }
    
    function getSurveyIdFromUrl() {
        // Prefer explicit match for the /surveys/<id>/ pattern used by Django URLs.
        const match = window.location.pathname.match(/\/surveys\/(\d+)/);
        if (match && match[1]) return match[1];

        // Fallback: find the last numeric path segment (defensive)
        const segments = window.location.pathname.split('/').filter(Boolean);
        for (let i = segments.length - 1; i >= 0; i--) {
            if (/^\d+$/.test(segments[i])) return segments[i];
        }

        // If nothing found, return null so callers can handle it.
        return null;
    }
    
    function setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.dataset.tab;
                
                // Remove active class from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding panel
                this.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                // Load specific data based on tab
                if (targetTab === 'summary' && !responseStatusChart) {
                    loadCharts();
                    loadQuestionAnalysis();
                } else if (targetTab === 'responses') {
                    loadResponsesData();
                }
            });
        });
    }
    
    function loadSurveyStats() {
    fetch(`/survey/surveys/${surveyId}/stats/`)
            .then(response => response.json())
            .then(data => {
                updateStatsCards(data);
            })
            .catch(error => {
                console.error('Error loading survey stats:', error);
            });
    }
    
    function updateStatsCards(data) {
        document.getElementById('totalAssignedCount').textContent = data.total_assigned || 0;
        document.getElementById('completedCount').textContent = data.completed || 0;
        document.getElementById('pendingCount').textContent = data.pending || 0;
        
        const completionRate = data.total_assigned > 0 ? 
            Math.round((data.completed / data.total_assigned) * 100) : 0;
        const pendingRate = data.total_assigned > 0 ? 
            Math.round((data.pending / data.total_assigned) * 100) : 0;
        
        // Update completion rate
        const completedChange = document.getElementById('completedChange');
        completedChange.innerHTML = `
            <span class="modern-stat-change-icon">
                <i class="fas fa-arrow-up"></i>
            </span>
            ${completionRate}%
            <span class="modern-stat-change-text">completion rate</span>
        `;
        
        // Update pending rate
        const pendingChange = document.getElementById('pendingChange');
        pendingChange.innerHTML = `
            <span class="modern-stat-change-icon">
                <i class="fas fa-arrow-down"></i>
            </span>
            ${pendingRate}%
            <span class="modern-stat-change-text">remaining</span>
        `;
    }
    
    function loadCharts() {
        loadResponseStatusChart();
        loadResponseTimelineChart();
    }
    
    function loadResponseStatusChart() {
        const ctx = document.getElementById('responseStatusChart').getContext('2d');
        
    fetch(`/survey/surveys/${surveyId}/chart-data/status/`)
            .then(response => response.json())
            .then(data => {
                responseStatusChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            data: data.values,
                            backgroundColor: [
                                'rgba(34, 197, 94, 0.8)',  // Completed - Green
                                'rgba(245, 158, 11, 0.8)', // Pending - Orange
                                'rgba(107, 114, 128, 0.8)' // Not Started - Gray
                            ],
                            borderColor: [
                                'rgba(34, 197, 94, 1)',
                                'rgba(245, 158, 11, 1)',
                                'rgba(107, 114, 128, 1)'
                            ],
                            borderWidth: 2
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
                                    usePointStyle: true
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                                    }
                                }
                            }
                        },
                        animation: {
                            animateRotate: true,
                            duration: 1000
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error loading status chart:', error);
                showChartError('responseStatusChart');
            });
    }
    
    function loadResponseTimelineChart() {
        const ctx = document.getElementById('responseTimelineChart').getContext('2d');
        
    fetch(`/survey/surveys/${surveyId}/chart-data/timeline/?period=7`)
            .then(response => response.json())
            .then(data => {
                responseTimelineChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: 'Responses',
                            data: data.values,
                            borderColor: 'rgba(99, 102, 241, 1)',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                            pointBorderColor: '#fff',
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
                                mode: 'index',
                                intersect: false,
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                titleColor: '#1f2937',
                                bodyColor: '#1f2937',
                                borderColor: 'rgba(99, 102, 241, 1)',
                                borderWidth: 1
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: '#6b7280'
                                }
                            },
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(229, 231, 235, 0.5)'
                                },
                                ticks: {
                                    color: '#6b7280',
                                    precision: 0
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeOutQuart'
                        }
                    }
                });
                
                setupTimelineFilters();
            })
            .catch(error => {
                console.error('Error loading timeline chart:', error);
                showChartError('responseTimelineChart');
            });
    }
    
    function setupTimelineFilters() {
        const filterButtons = document.querySelectorAll('.chart-filters .filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const period = this.dataset.period;
                
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update chart filter indicator
                const filtersContainer = document.querySelector('.chart-filters');
                filtersContainer.className = `chart-filters has-active slide-${Array.from(filterButtons).indexOf(this)}`;
                
                // Reload chart data
                updateTimelineChart(period);
            });
        });
    }
    
    function updateTimelineChart(period) {
    fetch(`/survey/surveys/${surveyId}/chart-data/timeline/?period=${period}`)
            .then(response => response.json())
            .then(data => {
                responseTimelineChart.data.labels = data.labels;
                responseTimelineChart.data.datasets[0].data = data.values;
                responseTimelineChart.update('active');
            })
            .catch(error => {
                console.error('Error updating timeline chart:', error);
            });
    }
    
    function loadQuestionAnalysis() {
        const analysisContainer = document.getElementById('questionAnalysis');
        
    fetch(`/survey/surveys/${surveyId}/question-analysis/`)
            .then(response => response.json())
            .then(data => {
                analysisContainer.innerHTML = '';
                
                if (data.questions && data.questions.length > 0) {
                    data.questions.forEach(question => {
                        const questionElement = createQuestionAnalysisElement(question);
                        analysisContainer.appendChild(questionElement);
                    });
                } else {
                    analysisContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-chart-bar"></i>
                            <h4>No Analysis Available</h4>
                            <p>Question analysis will be available once responses are submitted.</p>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error loading question analysis:', error);
                analysisContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error Loading Analysis</h4>
                        <p>Unable to load question analysis. Please try again later.</p>
                    </div>
                `;
            });
    }
    
    function createQuestionAnalysisElement(question) {
        const section = document.createElement('div');
        section.className = 'question-analysis-section';
        
        let analysisContent = '';
        
        switch (question.question_type) {
            case 'single_choice':
            case 'dropdown':
                analysisContent = createSingleChoiceAnalysis(question);
                break;
            case 'multiple_choice':
                analysisContent = createMultipleChoiceAnalysis(question);
                break;
            case 'rating_scale':
                analysisContent = createRatingScaleAnalysis(question);
                break;
            case 'yes_no':
                analysisContent = createYesNoAnalysis(question);
                break;
            case 'short_answer':
            case 'paragraph':
                analysisContent = createTextAnalysis(question);
                break;
            case 'file_upload':
                analysisContent = createFileUploadAnalysis(question);
                break;
            case 'date':
                analysisContent = createDateAnalysis(question);
                break;
            default:
                analysisContent = createGenericAnalysis(question);
        }
        
        section.innerHTML = `
            <h4>
                <i class="fas ${getQuestionTypeIcon(question.question_type)}"></i>
                Question ${question.order}
            </h4>
            <div class="question-text">${question.question_text}</div>
            ${analysisContent}
        `;
        
        return section;
    }
    
    function getQuestionTypeIcon(type) {
        const icons = {
            'single_choice': 'fa-dot-circle',
            'multiple_choice': 'fa-check-square',
            'rating_scale': 'fa-star',
            'dropdown': 'fa-chevron-down',
            'short_answer': 'fa-align-left',
            'paragraph': 'fa-align-justify',
            'yes_no': 'fa-toggle-on',
            'date': 'fa-calendar-alt',
            'file_upload': 'fa-file-upload'
        };
        return icons[type] || 'fa-question-circle';
    }
    
    function createSingleChoiceAnalysis(question) {
        if (!question.analysis || !question.analysis.options) {
            return '<p class="no-response-message">No responses yet</p>';
        }
        
        const totalResponses = question.analysis.total_responses || 0;
        
        return `
            <div class="answer-options">
                ${question.analysis.options.map(option => {
                    const percentage = totalResponses > 0 ? 
                        Math.round((option.count / totalResponses) * 100) : 0;
                    return `
                        <div class="answer-option">
                            <div class="option-info">
                                <div class="option-text">${option.text}</div>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                            <div class="option-percentage">${percentage}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    function createMultipleChoiceAnalysis(question) {
        if (!question.analysis || !question.analysis.options) {
            return '<p class="no-response-message">No responses yet</p>';
        }
        
        const totalResponses = question.analysis.total_responses || 0;
        
        return `
            <div class="answer-options">
                ${question.analysis.options.map(option => {
                    const percentage = totalResponses > 0 ? 
                        Math.round((option.count / totalResponses) * 100) : 0;
                    return `
                        <div class="answer-option">
                            <div class="option-info">
                                <div class="option-text">${option.text}</div>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                            <div class="option-percentage">${percentage}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    function createRatingScaleAnalysis(question) {
        if (!question.analysis || !question.analysis.ratings) {
            return '<p class="no-response-message">No responses yet</p>';
        }
        
        return `
            <div class="rating-scale-analysis">
                ${question.analysis.ratings.map(rating => `
                    <div class="rating-item">
                        <div class="rating-value">${rating.value}</div>
                        <div class="rating-label">${rating.label || ''}</div>
                        <div class="rating-count">${rating.count}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    function createYesNoAnalysis(question) {
        if (!question.analysis) {
            return '<p class="no-response-message">No responses yet</p>';
        }
        
        const yesCount = question.analysis.yes_count || 0;
        const noCount = question.analysis.no_count || 0;
        const totalResponses = yesCount + noCount;
        
        const yesPercentage = totalResponses > 0 ? Math.round((yesCount / totalResponses) * 100) : 0;
        const noPercentage = totalResponses > 0 ? Math.round((noCount / totalResponses) * 100) : 0;
        
        return `
            <div class="answer-options">
                <div class="answer-option">
                    <div class="option-info">
                        <div class="option-text">Yes</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${yesPercentage}%"></div>
                        </div>
                    </div>
                    <div class="option-percentage">${yesPercentage}%</div>
                </div>
                <div class="answer-option">
                    <div class="option-info">
                        <div class="option-text">No</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${noPercentage}%"></div>
                        </div>
                    </div>
                    <div class="option-percentage">${noPercentage}%</div>
                </div>
            </div>
        `;
    }
    
    function createTextAnalysis(question) {
        if (!question.analysis || !question.analysis.sample_answers) {
            return '<p class="no-response-message">No responses yet</p>';
        }
        
        return `
            <div class="text-answer-analysis">
                <div class="answer-count">
                    <i class="fas fa-users"></i>
                    <span>${question.analysis.total_responses} responses received</span>
                </div>
                <div class="answer-samples">
                    ${question.analysis.sample_answers.slice(0, 3).map(answer => `
                        <div class="answer-sample">"${answer}"</div>
                    `).join('')}
                    ${question.analysis.sample_answers.length > 3 ? 
                        `<div class="answer-sample">... and ${question.analysis.sample_answers.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }
    
    function createFileUploadAnalysis(question) {
        if (!question.analysis) {
            return '<p class="no-response-message">No file uploads yet</p>';
        }
        
        return `
            <div class="file-upload-analysis">
                <div class="upload-stats">
                    <div class="upload-stat">
                        <div class="upload-stat-value">${question.analysis.uploaded_count || 0}</div>
                        <div class="upload-stat-label">Files Uploaded</div>
                    </div>
                    <div class="upload-stat">
                        <div class="upload-stat-value">${question.analysis.no_upload_count || 0}</div>
                        <div class="upload-stat-label">No Upload</div>
                    </div>
                </div>
                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--primary-color);"></i>
            </div>
        `;
    }
    
    function createDateAnalysis(question) {
        if (!question.analysis || !question.analysis.date_distribution) {
            return '<p class="no-response-message">No date responses yet</p>';
        }
        
        return `
            <div class="answer-options">
                ${question.analysis.date_distribution.slice(0, 5).map(item => `
                    <div class="answer-option">
                        <div class="option-info">
                            <div class="option-text">${formatDate(item.date)}</div>
                        </div>
                        <div class="option-count">${item.count}</div>
                    </div>
                `).join('')}
                ${question.analysis.date_distribution.length > 5 ? 
                    `<div class="answer-option">
                        <div class="option-info">
                            <div class="option-text">... and ${question.analysis.date_distribution.length - 5} more dates</div>
                        </div>
                    </div>` : ''}
            </div>
        `;
    }
    
    function createGenericAnalysis(question) {
        return `
            <div class="text-answer-analysis">
                <div class="answer-count">
                    <i class="fas fa-info-circle"></i>
                    <span>Analysis not available for this question type</span>
                </div>
            </div>
        `;
    }
    
    function setupSearchFunctionality() {
        const searchInput = document.getElementById('responseSearchInput');
        const clearSearch = document.getElementById('clearResponseSearch');
        
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query !== currentSearchQuery) {
                searchTimeout = setTimeout(() => {
                    currentSearchQuery = query;
                    currentPage = 1;
                    loadResponsesData();
                }, 300);
            }
            
            // Show/hide clear button
            const clearButton = document.querySelector('.search-clear');
            if (query.length > 0) {
                clearButton.style.display = 'block';
            } else {
                clearButton.style.display = 'none';
            }
        });
        
        clearSearch.addEventListener('click', function(e) {
            e.preventDefault();
            searchInput.value = '';
            currentSearchQuery = '';
            currentPage = 1;
            document.querySelector('.search-clear').style.display = 'none';
            loadResponsesData();
        });
    }
    
    function loadResponsesData() {
        const tableBody = document.getElementById('responsesTableBody');
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-no-data">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading responses...</p>
                    </div>
                </td>
            </tr>
        `;
        
        const params = new URLSearchParams({
            page: currentPage,
            search: currentSearchQuery
        });
        
    fetch(`/survey/surveys/${surveyId}/responses-data/?${params}`)
            .then(response => response.json())
            .then(data => {
                updateResponsesTable(data.responses || []);
                updatePagination(data.pagination || {});
            })
            .catch(error => {
                console.error('Error loading responses:', error);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="table-no-data">
                            <div class="empty-state">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h4>Error Loading Data</h4>
                                <p>Unable to load responses. Please try again later.</p>
                            </div>
                        </td>
                    </tr>
                `;
            });
    }
    
    function updateResponsesTable(responses) {
        const tableBody = document.getElementById('responsesTableBody');
        
        if (!responses || responses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-no-data">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <h4>No Responses Found</h4>
                            <p>No responses match your search criteria.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = responses.map(response => {
            const hasResponded = response.status === 'completed';
            const progressPercentage = response.progress || 0;
            
            return `
                <tr class="responses-table-row ${hasResponded ? 'responded' : 'not-responded'}">
                    <td>
                        <div class="employee-info">
                            <div class="employee-name">${response.employee_name}</div>
                            <div class="employee-id">#${response.employee_id}</div>
                        </div>
                    </td>
                    <td class="hide-column">${response.department || 'N/A'}</td>
                    <td>
                        <span class="status-pill status-${hasResponded ? 'green' : 'orange'}">
                            ${hasResponded ? 'Completed' : 'Not Responded'}
                        </span>
                    </td>
                    <td class="hide-column">${response.submitted_at ? formatDateTime(response.submitted_at) : '-'}</td>
                    <td>
                        <div class="progress-circle" style="background: conic-gradient(var(--primary-color) ${progressPercentage * 3.6}deg, var(--border-color) 0deg);">
                            <span>${progressPercentage}%</span>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <button class="btn btn-sm btn-outline view-response-btn" 
                                data-user-id="${response.user_id}"
                                data-employee-name="${response.employee_name}"
                                ${!hasResponded ? 'disabled' : ''}>
                            <i class="fas fa-eye"></i>
                            ${hasResponded ? 'View' : 'No Response'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Setup view response buttons
        setupViewResponseButtons();
    }
    
    function setupViewResponseButtons() {
        const viewButtons = document.querySelectorAll('.view-response-btn');
        
        viewButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.userId;
                const employeeName = this.dataset.employeeName;
                
                if (!this.disabled) {
                    openResponseView(userId, employeeName);
                }
            });
        });
    }
    
    function updatePagination(pagination) {
        const startRecord = document.getElementById('responsesStartRecord');
        const endRecord = document.getElementById('responsesEndRecord');
        const totalRecords = document.getElementById('responsesTotalRecords');
        const pageNumbers = document.getElementById('responsesPageNumbers');
        const prevBtn = document.getElementById('responsesPrevBtn');
        const nextBtn = document.getElementById('responsesNextBtn');
        
        // Update info
        startRecord.textContent = pagination.start_index || 0;
        endRecord.textContent = pagination.end_index || 0;
        totalRecords.textContent = pagination.total_count || 0;
        
        // Update page numbers
        pageNumbers.innerHTML = '';
        if (pagination.page_range && pagination.page_range.length > 0) {
            pagination.page_range.forEach(pageNum => {
                const isActive = pageNum === pagination.current_page;
                const pageBtn = document.createElement(isActive ? 'span' : 'button');
                pageBtn.className = `pagination-btn ${isActive ? 'active' : ''}`;
                pageBtn.textContent = pageNum;
                
                if (!isActive) {
                    pageBtn.addEventListener('click', () => {
                        currentPage = pageNum;
                        loadResponsesData();
                    });
                }
                
                pageNumbers.appendChild(pageBtn);
            });
        } else {
            pageNumbers.innerHTML = '<span class="pagination-btn active">1</span>';
        }
        
        // Update navigation buttons
        prevBtn.disabled = !pagination.has_previous;
        nextBtn.disabled = !pagination.has_next;
        
        if (pagination.has_previous) {
            prevBtn.onclick = () => {
                currentPage = pagination.previous_page;
                loadResponsesData();
            };
        }
        
        if (pagination.has_next) {
            nextBtn.onclick = () => {
                currentPage = pagination.next_page;
                loadResponsesData();
            };
        }
    }
    
    function setupOffcanvas() {
        const offcanvas = document.getElementById('responseViewOffcanvas');
        const closeBtn = document.getElementById('closeResponseView');
        
        closeBtn.addEventListener('click', function() {
            closeResponseView();
        });
        
        // Close on overlay click
        document.addEventListener('click', function(e) {
            if (offcanvas.classList.contains('show') && 
                !offcanvas.querySelector('.offcanvas-content').contains(e.target) &&
                !e.target.closest('.view-response-btn')) {
                closeResponseView();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && offcanvas.classList.contains('show')) {
                closeResponseView();
            }
        });
    }
    
    function openResponseView(userId, employeeName) {
        const offcanvas = document.getElementById('responseViewOffcanvas');
        const title = document.getElementById('responseViewTitle');
        const body = document.getElementById('responseViewBody');
        
        title.textContent = `Response from ${employeeName}`;
        
        // Show loading state
        body.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading response details...</p>
            </div>
        `;
        
        // Show offcanvas
        document.body.classList.add('modal-open');
        offcanvas.classList.add('show');
        
        // Load response data
    fetch(`/survey/surveys/${surveyId}/response/${userId}/`)
            .then(response => response.json())
            .then(data => {
                displayResponseData(data);
            })
            .catch(error => {
                console.error('Error loading response:', error);
                body.innerHTML = `
                    <div class="empty-state center-offcanvas">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Error Loading Response</h4>
                        <p>Unable to load response details. Please try again later.</p>
                    </div>
                `;
            });
    }
    
    function displayResponseData(data) {
        const body = document.getElementById('responseViewBody');
        
        if (!data.answers || data.answers.length === 0) {
            body.innerHTML = `
                <div class="empty-state center-offcanvas">
                    <i class="fas fa-clipboard-list"></i>
                    <h4>No Response Data</h4>
                    <p>This user has not submitted any responses yet.</p>
                </div>
            `;
            return;
        }
        
        const sectionsHtml = data.answers.map((answer, index) => {
            return createResponseSection(answer, index + 1);
        }).join('');
        
        body.innerHTML = `
            <div class="response-view-sections">
                ${sectionsHtml}
            </div>
        `;
    }
    
    function createResponseSection(answer, questionNumber) {
        let answerDisplay = '';
        
        switch (answer.question_type) {
            case 'single_choice':
            case 'dropdown':
                answerDisplay = `<div class="response-answer-value">${answer.answer || 'No answer provided'}</div>`;
                break;
            case 'multiple_choice':
                if (answer.answer && Array.isArray(answer.answer)) {
                    answerDisplay = `
                        <div class="response-answer-multiple">
                            ${answer.answer.map(option => `
                                <span class="response-answer-tag">${option}</span>
                            `).join('')}
                        </div>
                    `;
                } else {
                    answerDisplay = `<div class="response-answer-value">No answer provided</div>`;
                }
                break;
            case 'rating_scale':
                const rating = parseInt(answer.answer) || 0;
                const maxRating = answer.max_value || 5;
                answerDisplay = `
                    <div class="response-rating-display">
                        <div class="rating-stars">
                            ${Array.from({length: maxRating}, (_, i) => `
                                <span class="rating-star ${i < rating ? '' : 'empty'}">
                                    <i class="fas fa-star"></i>
                                </span>
                            `).join('')}
                        </div>
                        <span class="rating-value">${rating}/${maxRating}</span>
                    </div>
                `;
                break;
            case 'yes_no':
                const yesNoAnswer = answer.answer === true || answer.answer === 'true' || answer.answer === 'Yes';
                answerDisplay = `
                    <div class="response-answer-value">
                        <span class="status-pill status-${yesNoAnswer ? 'green' : 'red'}">
                            <i class="fas ${yesNoAnswer ? 'fa-check' : 'fa-times'}"></i>
                            ${yesNoAnswer ? 'Yes' : 'No'}
                        </span>
                    </div>
                `;
                break;
            case 'file_upload':
                if (answer.file_url) {
                    answerDisplay = `
                        <a href="${answer.file_url}" target="_blank" class="response-file-link">
                            <i class="fas fa-file-download"></i>
                            View uploaded file
                        </a>
                    `;
                } else {
                    answerDisplay = `<div class="response-answer-value">No file uploaded</div>`;
                }
                break;
            case 'date':
                answerDisplay = `<div class="response-answer-value">${formatDate(answer.answer) || 'No date selected'}</div>`;
                break;
            default:
                answerDisplay = `<div class="response-answer-value">${answer.answer || 'No answer provided'}</div>`;
        }
        
        return `
            <div class="response-view-section">
                <div class="response-question">
                    <div class="response-question-text">Q${questionNumber}: ${answer.question_text}</div>
                    <div class="response-question-type">${formatQuestionType(answer.question_type)}</div>
                </div>
                <div class="response-answer">
                    ${answerDisplay}
                </div>
            </div>
        `;
    }
    
    function closeResponseView() {
        const offcanvas = document.getElementById('responseViewOffcanvas');
        document.body.classList.remove('modal-open');
        offcanvas.classList.remove('show');
    }
    
    function setupExportButton() {
        const exportBtn = document.getElementById('exportReportBtn');
        
        exportBtn.addEventListener('click', function() {
            handleExport();
        });
    }
    
    function handleExport() {
        // Show loading state
        const exportBtn = document.getElementById('exportReportBtn');
        const originalText = exportBtn.innerHTML;
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        
        fetch(`/survey/surveys/${surveyId}/export-excel/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            throw new Error('Export failed');
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `survey-response-data.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification('Excel export completed successfully!', 'success');
        })
        .catch(error => {
            console.error('Export error:', error);
            showNotification('Export failed. Please try again.', 'error');
        })
        .finally(() => {
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalText;
        });
    }
    
    function getFileExtension(format) {
        const extensions = {
            'excel': 'xlsx',
            'csv': 'csv',
            'pdf': 'pdf'
        };
        return extensions[format] || 'xlsx';
    }
    
    // Utility functions
    function showModal(modal) {
        document.body.classList.add('modal-open');
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
    
    function hideModal(modal) {
        document.body.classList.remove('modal-open');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    function formatQuestionType(type) {
        const types = {
            'single_choice': 'Single Choice',
            'multiple_choice': 'Multiple Choice',
            'rating_scale': 'Rating Scale',
            'dropdown': 'Dropdown',
            'short_answer': 'Short Answer',
            'paragraph': 'Paragraph',
            'yes_no': 'Yes/No',
            'date': 'Date',
            'file_upload': 'File Upload'
        };
        return types[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
    
    function showNotification(message, type = 'info') {
        // Create toast notification
        const toastContainer = document.querySelector('.toast-container') || createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="message-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    function getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
    
    function showChartError(chartId) {
        const canvas = document.getElementById(chartId);
        const container = canvas.parentElement;
        
        container.innerHTML = `
            <div class="chart-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load chart data</p>
            </div>
        `;
    }
    
    // Initialize charts when summary tab becomes active
    const summaryTab = document.querySelector('[data-tab="summary"]');
    if (summaryTab && summaryTab.classList.contains('active')) {
        setTimeout(() => {
            loadCharts();
            loadQuestionAnalysis();
        }, 100);
    }
    
    // Trigger animations for progress bars when they become visible
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const progressObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const progressFills = entry.target.querySelectorAll('.progress-fill');
                progressFills.forEach(fill => {
                    const width = fill.style.width;
                    fill.style.width = '0%';
                    setTimeout(() => {
                        fill.style.width = width;
                    }, 100);
                });
            }
        });
    }, observerOptions);
    
    // Observe question analysis sections when they're added
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(child) {
        const result = originalAppendChild.call(this, child);
        if (child.classList && child.classList.contains('question-analysis-section')) {
            progressObserver.observe(child);
        }
        return result;
    };
});