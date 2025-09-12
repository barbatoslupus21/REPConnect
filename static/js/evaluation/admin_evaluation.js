document.addEventListener('DOMContentLoaded', function() {
    // Initialize chart variables
    let evaluationChart = null;
    let currentPeriod = 'month';
    let currentChartType = 'line';

    // Initialize the evaluation performance chart
    function initializeEvaluationChart() {
        const ctx = document.getElementById('evaluationChart');
        if (!ctx) return;

        const initialData = window.evaluationChartData.periodData[currentPeriod];
        
        evaluationChart = new Chart(ctx, {
            type: currentChartType,
            data: {
                labels: initialData.labels,
                datasets: initialData.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} submissions`;
                            },
                            afterBody: function(context) {
                                const total = window.evaluationChartData.totalNonAdminUsers;
                                return [`Total non-admin users: ${total}`];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: getXAxisTitle(currentPeriod)
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: ''
                        },
                        beginAtZero: true,
                        max: window.evaluationChartData.totalNonAdminUsers,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            stepSize: Math.ceil(window.evaluationChartData.totalNonAdminUsers / 10)
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    },
                    line: {
                        tension: 0.4
                    }
                }
            }
        });
    }

    // Get X-axis title based on period
    function getXAxisTitle(period) {
        switch(period) {
            case 'month': return '';
            case 'quarter': return 'Quarter';
            case 'year': return 'Year';
            default: return 'Time Period';
        }
    }

    // Update chart data based on selected period
    function updateChartData(period) {
        if (!evaluationChart || !window.evaluationChartData.periodData[period]) return;
        
        currentPeriod = period;
        const newData = window.evaluationChartData.periodData[period];
        
        evaluationChart.data.labels = newData.labels;
        evaluationChart.data.datasets = newData.datasets;
        evaluationChart.options.scales.x.title.text = getXAxisTitle(period);
        evaluationChart.update('active');
    }

    // Update chart type (line or bar)
    function updateChartType(type) {
        if (!evaluationChart) return;
        
        currentChartType = type;
        evaluationChart.config.type = type;
        
        // Adjust options based on chart type
        if (type === 'bar') {
            evaluationChart.options.elements.line = undefined;
            evaluationChart.data.datasets.forEach(dataset => {
                dataset.tension = undefined;
                dataset.fill = false;
                dataset.borderWidth = 1;
            });
        } else {
            evaluationChart.options.elements.line = { tension: 0.4 };
            evaluationChart.data.datasets.forEach(dataset => {
                dataset.tension = 0.4;
                dataset.fill = false;
                dataset.borderWidth = 2;
            });
        }
        
        evaluationChart.update('active');
    }

    // Handle filter button clicks with slider effect
    function handleFilterClick(event) {
        const button = event.target.closest('.filter-btn');
        if (!button) return;
        
        const period = button.dataset.period;
        const filterContainer = button.parentElement;
        const buttons = filterContainer.querySelectorAll('.filter-btn');
        
        // Remove active class from all buttons
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update slider position
        const buttonIndex = Array.from(buttons).indexOf(button);
        filterContainer.className = `chart-filters has-active slide-${buttonIndex}`;
        
        // Update chart data
        updateChartData(period);
    }

    // Handle chart type button clicks with slider effect
    function handleChartTypeClick(event) {
        const button = event.target.closest('.chart-type-btn');
        if (!button) return;
        
        const type = button.dataset.type;
        const typeContainer = button.parentElement;
        const buttons = typeContainer.querySelectorAll('.chart-type-btn');
        
        // Remove active class from all buttons
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update slider position
        const buttonIndex = Array.from(buttons).indexOf(button);
        typeContainer.className = `chart-type-filters has-active slide-${buttonIndex}`;
        
        // Update chart type
        updateChartType(type);
    }

    // Event listeners
    document.addEventListener('click', function(event) {
        if (event.target.closest('.filter-btn')) {
            handleFilterClick(event);
        } else if (event.target.closest('.chart-type-btn')) {
            handleChartTypeClick(event);
        }
    });

    // Initialize chart on page load
    initializeEvaluationChart();

    // Resize handler
    window.addEventListener('resize', function() {
        if (evaluationChart) {
            evaluationChart.resize();
        }
    });

    // Tab switching: show only the selected tab panel
    (function() {
        const tabs = document.querySelectorAll('.tab');
        const panels = document.querySelectorAll('.tab-panel');
        if (!tabs || tabs.length === 0) return;

        function activateTabButton(button) {
            tabs.forEach(t => t.classList.remove('active'));
            button.classList.add('active');
        }

        function showPanel(id) {
            panels.forEach(p => {
                if (p.id === id) p.classList.add('active');
                else p.classList.remove('active');
            });
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                const target = this.dataset.target;
                if (!target) return;
                activateTabButton(this);
                showPanel(target);
            });
        });

        // Check URL parameters for initial tab activation
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam === 'tasklist') {
            const tasklistTab = document.querySelector('.tab[data-target="tasklist"]');
            if (tasklistTab) {
                activateTabButton(tasklistTab);
                showPanel('tasklist');
            }
        }
    })();

    // Live search across entire Evaluation DB (debounced)
    (function() {
        const searchInput = document.getElementById('trainingSearchInput');
        const searchClear = document.querySelector('.search-clear');
        if (!searchInput) return;

        let debounceTimer = null;
        function submitSearchImmediate() {
            const q = searchInput.value.trim();
            // perform AJAX partial refresh for table
            ajaxLoadTable({search: q, page: 1});
        }

        function debounceSubmit() {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(submitSearchImmediate, 400);
        }

        // Typing triggers debounced search
        searchInput.addEventListener('input', function() {
            // show/hide clear icon
            if (searchClear) searchClear.style.display = this.value ? 'inline-block' : 'none';
            debounceSubmit();
        });

        // Enter submits immediately
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (debounceTimer) clearTimeout(debounceTimer);
                submitSearchImmediate();
            }
        });

        // Clear button
        if (searchClear) {
            searchClear.addEventListener('click', function() {
                searchInput.value = '';
                searchClear.style.display = 'none';
                ajaxLoadTable({search: '', page: 1});
            });
        }
    })();

    // AJAX loader for table and pagination
    function ajaxLoadTable(params) {
        const url = new URL(window.location.href);
        
        // Check which tab is active
        const activeTab = document.querySelector('.tab-panel.active');
        const isTasklistTab = activeTab && activeTab.id === 'tasklist';
        
        if (isTasklistTab) {
            url.searchParams.set('partial', 'tasklist_table');
            if (params.page !== undefined) {
                if (params.page && params.page > 1) url.searchParams.set('users_page', params.page);
                else url.searchParams.delete('users_page');
            }
        } else {
            url.searchParams.set('partial', 'table');
            if (params.page !== undefined) {
                if (params.page && params.page > 1) url.searchParams.set('page', params.page);
                else url.searchParams.delete('page');
            }
        }
        
        if (params.search !== undefined) {
            if (params.search) url.searchParams.set('search', params.search);
            else url.searchParams.delete('search');
        }

        fetch(url.toString(), {headers: {'X-Requested-With': 'XMLHttpRequest'}})
            .then(r => r.json())
            .then(data => {
                let tbody, pagination;
                if (isTasklistTab) {
                    tbody = document.getElementById('tasklistTableBody');
                    pagination = document.getElementById('paginationContainer');
                } else {
                    tbody = document.getElementById('evaluationTableBody');
                    pagination = document.getElementById('paginationContainer');
                }
                
                if (tbody && data.rows_html) tbody.innerHTML = data.rows_html;
                if (pagination && data.pagination_html) pagination.innerHTML = data.pagination_html;
                
                // Update browser URL without reloading
                const pushUrl = new URL(window.location.href);
                if (params.search !== undefined) {
                    if (params.search) pushUrl.searchParams.set('search', params.search);
                    else pushUrl.searchParams.delete('search');
                }
                if (params.page !== undefined) {
                    if (params.page && params.page > 1) {
                        if (isTasklistTab) {
                            pushUrl.searchParams.set('users_page', params.page);
                        } else {
                            pushUrl.searchParams.set('page', params.page);
                        }
                    } else {
                        pushUrl.searchParams.delete('page');
                        pushUrl.searchParams.delete('users_page');
                    }
                }
                window.history.replaceState({}, '', pushUrl.toString());
            })
            .catch(err => {
                console.error('Error loading table:', err);
            });
    }

    // Delegate click on pagination links to AJAX loader
    document.addEventListener('click', function(e) {
        const a = e.target.closest('#paginationContainer a');
        if (a) {
            e.preventDefault();
            const href = new URL(a.href);
            
            // Check which tab is active to determine the correct page parameter
            const activeTab = document.querySelector('.tab-panel.active');
            const isTasklistTab = activeTab && activeTab.id === 'tasklist';
            
            let page;
            if (isTasklistTab) {
                page = href.searchParams.get('users_page') || 1;
            } else {
                page = href.searchParams.get('page') || 1;
            }
            
            const search = document.getElementById('trainingSearchInput')?.value || '';
            ajaxLoadTable({search: search.trim(), page: Number(page)});
        }
    });

    // Modal functions
    window.openCreateEvaluationModal = function() {
        const modal = document.getElementById('createEvaluationModal');
        if (modal) {
            modal.style.display = 'flex'; // Ensure modal is visible
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    };

    window.openTasklistImportModal = function() {
        const modal = document.getElementById('tasklistImportModal');
        if (modal) {
            modal.style.display = 'flex'; // Ensure modal is visible
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Add zoom out effect by removing show class
            modal.classList.remove('show');
            
            // Wait for the transition to complete before hiding and resetting overflow
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
                
                // Clear selected IDs when closing delete modal
                if (modalId === 'deleteConfirmModal') {
                    window.selectedTasklistId = null;
                    // Reset confirm button state
                    const confirmBtn = document.getElementById('confirmDeleteBtn');
                    if (confirmBtn) {
                        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Confirm';
                        confirmBtn.disabled = false;
                    }
                }
            }, 250); // Match the transition duration from CSS (--transition-normal is 250ms)
        }
    };

    // Close modal when clicking overlay
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-overlay')) {
            const modal = event.target.closest('.modal');
            if (modal) {
                // Add zoom out effect by removing show class
                modal.classList.remove('show');
                
                // Wait for the transition to complete before hiding and resetting overflow
                setTimeout(() => {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    
                    // Clear selected IDs when closing delete modal via overlay
                    if (modal.id === 'deleteConfirmModal') {
                        window.selectedTasklistId = null;
                        // Reset confirm button state
                        const confirmBtn = document.getElementById('confirmDeleteBtn');
                        if (confirmBtn) {
                            confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Confirm';
                            confirmBtn.disabled = false;
                        }
                    }
                }, 250); // Match the transition duration from CSS
            }
        }
    });

    // Handle form submission - let Django handle it normally
    const createEvaluationForm = document.getElementById('createEvaluationForm');
    if (createEvaluationForm) {
        createEvaluationForm.addEventListener('submit', function(e) {
            console.log('Form submission triggered');
            e.preventDefault(); // Prevent default to handle manually
            
            // Close modal with zoom out effect
            const modal = document.getElementById('createEvaluationModal');
            if (modal) {
                modal.classList.remove('show');
                
                // Submit the form after the zoom out animation completes
                setTimeout(() => {
                    console.log('Submitting form...');
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    this.submit();
                }, 250); // Match the transition duration
            }
        });
    }

    // Utility function to show messages using toast (simplified DOM-only approach)
    window.showToast = function(message, type = 'success', duration = 5000) {
        console.log('admin_evaluation.showToast called:', { message, type, duration });
        
        // Always use DOM toast for reliability
        return createDomToast(message, type, duration);
    }

    function createDomToast(message, type = 'success', duration = 5000) {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';

        let icon;
        switch (type) {
            case 'success': icon = 'fas fa-check-circle'; break;
            case 'error': icon = 'fas fa-exclamation-circle'; break;
            case 'warning': icon = 'fas fa-exclamation-triangle'; break;
            default: icon = 'fas fa-info-circle';
        }

        toast.innerHTML = `
            <div style="display: flex; align-items: center; color: inherit;">
                <i class="${icon}" style="margin-right: 8px;"></i>
                <span class="message-text" style="color: inherit; font-weight: 500;">${message}</span>
            </div>
            <button type="button" class="message-close" aria-label="Close">&times;</button>
        `;

        const closeBtn = toast.querySelector('.message-close');
        if (closeBtn) closeBtn.addEventListener('click', () => removeToast(toast));

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
            toast.style.transition = 'all 0.3s ease-out';
        });

        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }

        return toast;
    }

    window.removeToast = function(toast) {
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

    // Handle Django messages (moved here after showToast is defined)
    if (window.djangoMessages && window.djangoMessages.length > 0) {
        console.log('admin_evaluation: djangoMessages found', window.djangoMessages);
        window.djangoMessages.forEach(function(msg) {
            showToast(msg.message, msg.type);
        });
    }

    // Tasklist file upload handling
    const tasklistFileInput = document.getElementById('tasklist-files');
    const selectedTasklistFiles = document.getElementById('selectedTasklistFiles');
    const tasklistFileList = document.getElementById('tasklist-file-list');
    const tasklistUploadForm = document.getElementById('tasklist-upload-form');
    const tasklistUploadBtn = document.getElementById('tasklist-upload-btn');

    if (tasklistFileInput) {
        tasklistFileInput.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files.length > 0) {
                selectedTasklistFiles.style.display = 'block';
                tasklistFileList.innerHTML = '';
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">(${formatFileSize(file.size)})</span>
                    `;
                    tasklistFileList.appendChild(fileItem);
                }
            } else {
                selectedTasklistFiles.style.display = 'none';
            }
        });
    }

    if (tasklistUploadForm) {
        tasklistUploadForm.addEventListener('submit', function(e) {
            const files = tasklistFileInput.files;
            if (files.length === 0) {
                e.preventDefault();
                showToast('Please select at least one file to upload', 'error');
                return;
            }
            
            // Show loading state
            tasklistUploadBtn.disabled = true;
            tasklistUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        });
    }

    // Utility function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // View evaluation details: navigate to evaluation details page
    (function() {
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.view-evaluation-btn');
            if (!btn) return;
            const evalId = btn.dataset.evaluationId;
            if (!evalId) return;

            // Navigate to evaluation details page
            window.location.href = `/evaluation/${evalId}/details/`;
        });
    })();

    // Edit evaluation: open modal, fetch data, submit updates via AJAX
    (function() {
        // Delegate click to edit buttons
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.edit-evaluation-btn');
            if (!btn) return;
            const evalId = btn.dataset.evaluationId;
            if (!evalId) return;

            // Fetch evaluation detail
            fetch(`/evaluation/${evalId}/detail/`, {headers: {'X-Requested-With': 'XMLHttpRequest'}})
                .then(r => r.json())
                .then(data => {
                    const ev = data.evaluation;
                    // Populate modal fields
                    document.getElementById('edit_evaluation_id').value = ev.id;
                    document.getElementById('edit_title').value = ev.title || '';
                    document.getElementById('edit_description').value = ev.description || '';
                    document.getElementById('edit_start_year').value = ev.start_year || '';
                    document.getElementById('edit_end_year').value = ev.end_year || '';
                    document.getElementById('edit_duration').value = ev.duration || 'monthly';

                    // Show modal
                    const modal = document.getElementById('editEvaluationModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        modal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }
                })
                .catch(err => {
                    console.error('Error fetching evaluation details', err);
                    showToast('Error fetching evaluation details', 'error');
                });
        });

        // Submit update
        const saveBtn = document.getElementById('saveEditEvaluationBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const form = document.getElementById('editEvaluationForm');
                const evalId = document.getElementById('edit_evaluation_id').value;
                if (!evalId) return showToast('Missing evaluation id', 'error');

                // Build form data
                const formData = new FormData(form);
                // Include CSRF token if present
                const csrf = document.querySelector('input[name=csrfmiddlewaretoken]');
                if (csrf) formData.set('csrfmiddlewaretoken', csrf.value);

                fetch(`/evaluation/${evalId}/update/`, {
                    method: 'POST',
                    headers: {'X-Requested-With': 'XMLHttpRequest'},
                    body: formData
                })
                .then(async res => {
                    if (res.ok) return res.json();
                    const err = await res.json().catch(() => ({}));
                    throw err;
                })
                .then(data => {
                    showToast(data.message || 'Evaluation updated', 'success');
                    // Close modal with animation
                    closeModal('editEvaluationModal');
                    // Refresh table (keep current search/page)
                    const search = document.getElementById('trainingSearchInput')?.value || '';
                    ajaxLoadTable({search: search.trim(), page: 1});
                })
                .catch(err => {
                    console.error('Update error', err);
                    if (err && err.errors) {
                        // Show first error message
                        const firstField = Object.keys(err.errors)[0];
                        const firstMsg = err.errors[firstField][0];
                        showToast(firstMsg, 'error');
                    } else {
                        showToast('Error updating evaluation', 'error');
                    }
                });
            });
        }
    })();

    // Delete evaluation: show confirm modal and send delete request
    (function() {
        let selectedEvaluationId = null;
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.delete-evaluation-btn');
            if (!btn) return;
            selectedEvaluationId = btn.dataset.evaluationId;
            const title = btn.dataset.evaluationTitle || '';

            // Populate modal details
            const deleteName = document.getElementById('deleteTrainingName');
            if (deleteName) deleteName.textContent = title;

            // Show modal
            const modal = document.getElementById('deleteConfirmModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });

        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                // Check if we're deleting a tasklist or evaluation
                if (window.selectedTasklistId) {
                    // Delete tasklist
                    confirmDeleteTasklist();
                } else if (selectedEvaluationId) {
                    // Delete evaluation (existing logic)
                    const csrf = document.querySelector('input[name=csrfmiddlewaretoken]');
                    const formData = new FormData();
                    if (csrf) formData.set('csrfmiddlewaretoken', csrf.value);

                    fetch(`/evaluation/${selectedEvaluationId}/delete/`, {
                        method: 'POST',
                        headers: {'X-Requested-With': 'XMLHttpRequest'},
                        body: formData
                    })
                    .then(async res => {
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw data;
                        return data;
                    })
                    .then(data => {
                        showToast(data.message || 'Deleted', 'success');
                        closeModal('deleteConfirmModal');
                        // Refresh table (keep current search)
                        const search = document.getElementById('trainingSearchInput')?.value || '';
                        ajaxLoadTable({search: search.trim(), page: 1});
                    })
                    .catch(err => {
                        console.error('Delete error', err);
                        showToast((err && err.message) || 'Error deleting evaluation', 'error');
                    });
                } else {
                    showToast('No item selected for deletion', 'error');
                }
            });
        }
    })();

    // Tasklist functions
    window.viewTasklist = function(userId) {
        // Fetch user tasklists
        fetch(`/evaluation/user/${userId}/tasklists/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayTasklistModal(data);
            } else {
                showToast(data.error || 'Error loading tasklists', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error loading tasklists', 'error');
        });
    };

    function displayTasklistModal(data) {
        const modal = document.getElementById('viewTasklistModal');
        const title = document.getElementById('tasklistModalTitle');
        const content = document.getElementById('tasklistContent');

        title.textContent = `${data.user_name} - Tasklists`;

        if (data.tasklists.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fas fa-list" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>No tasklists found for this user</div>
                </div>
                <div class="add-tasklist-section" style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="addNewTasklist(${data.user_id})">
                        <i class="fas fa-plus"></i>
                        Add Tasklist
                    </button>
                </div>
            `;
        } else {
            const tasklistHtml = data.tasklists.map((task, index) => `
                <div class="tasklist-item" data-task-id="${task.id}">
                    <div class="tasklist-content">
                        <span class="tasklist-number">${index + 1}.</span>
                        <span class="tasklist-text" onclick="editTasklist(${task.id})">${task.tasklist}</span>
                        <div class="tasklist-edit-form" style="display: none;">
                            <input type="text" class="tasklist-input form-input" value="${task.tasklist}">
                            <div class="tasklist-actions">
                                <button class="btn btn-sm btn-success" onclick="saveTasklist(${task.id})">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-sm btn-error" onclick="cancelEdit(${task.id})">
                                    <i class="fas fa-times"></i>
                                </button>
                                <button class="btn btn-sm btn-error" onclick="deleteTasklist(${task.id})">
                                    <i class="fa fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            content.innerHTML = `
                <div class="tasklist-list">
                    ${tasklistHtml}
                </div>
                <div class="add-tasklist-section">
                    <button class="btn add-tasklist-btn" onclick="addNewTasklist(${data.user_id})">
                        <i class="fas fa-plus"></i>
                        Add Tasklist
                    </button>
                </div>
            `;
        }

        openModal('viewTasklistModal');
    }

    window.editTasklist = function(taskId) {
        const item = document.querySelector(`[data-task-id="${taskId}"]`);
        const textSpan = item.querySelector('.tasklist-text');
        const editForm = item.querySelector('.tasklist-edit-form');

        textSpan.style.display = 'none';
        editForm.style.display = 'flex';
        
        const input = editForm.querySelector('.tasklist-input');
        input.focus();
        input.select();
    };

    window.cancelEdit = function(taskId) {
        const item = document.querySelector(`[data-task-id="${taskId}"]`);
        const textSpan = item.querySelector('.tasklist-text');
        const editForm = item.querySelector('.tasklist-edit-form');
        const input = editForm.querySelector('.tasklist-input');

        // Reset input value to original
        input.value = textSpan.textContent;
        
        textSpan.style.display = 'block';
        editForm.style.display = 'none';
    };

    window.saveTasklist = function(taskId) {
        const item = document.querySelector(`[data-task-id="${taskId}"]`);
        const textSpan = item.querySelector('.tasklist-text');
        const editForm = item.querySelector('.tasklist-edit-form');
        const input = editForm.querySelector('.tasklist-input');

        const newText = input.value.trim();
        if (!newText) {
            showToast('Tasklist text cannot be empty', 'error');
            return;
        }

        // Show loading state
        const saveBtn = editForm.querySelector('.btn-success');
        const originalSaveHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;

        fetch(`/evaluation/tasklist/${taskId}/update/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                tasklist: newText
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the display text
                textSpan.textContent = data.tasklist.tasklist;
                
                // Switch back to view mode
                textSpan.style.display = 'block';
                editForm.style.display = 'none';
                
                // Show success message
                showToast(data.message || 'Tasklist updated successfully', 'success');
            } else {
                showToast(data.error || 'Error updating tasklist', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error updating tasklist', 'error');
        })
        .finally(() => {
            // Reset button state
            saveBtn.innerHTML = originalSaveHtml;
            saveBtn.disabled = false;
        });
    };

    window.deleteTasklist = function(taskId) {
        // Store the task ID for the confirmation function
        window.selectedTasklistId = taskId;
        
        // Get the tasklist text for display in the modal
        const item = document.querySelector(`[data-task-id="${taskId}"]`);
        const textSpan = item.querySelector('.tasklist-text');
        const tasklistText = textSpan ? textSpan.textContent : 'this tasklist';
        
        // Update modal content
        const deleteName = document.getElementById('deleteTrainingName');
        if (deleteName) deleteName.textContent = tasklistText;
        
        // Update modal title and message for tasklist
        const modalTitle = document.querySelector('#deleteConfirmModal .modal-header h4');
        if (modalTitle) modalTitle.textContent = 'Confirm Delete Tasklist';
        
        const confirmMessage = document.querySelector('#deleteConfirmModal .confirmation-message h5');
        if (confirmMessage) confirmMessage.textContent = 'Confirm Delete Tasklist';
        
        const confirmText = document.querySelector('#deleteConfirmModal .confirmation-message p:first-of-type');
        if (confirmText) confirmText.textContent = 'Are you sure you want to delete this tasklist?';
        
        const alertText = document.querySelector('#deleteConfirmModal .alert');
        if (alertText) alertText.innerHTML = '<i class="fas fa-info-circle"></i> This action cannot be undone.';
        
        // Reset confirm button state in case it was left in a bad state
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Confirm';
            confirmBtn.disabled = false;
        }
        
        // Show modal
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    };

    window.confirmDeleteTasklist = function() {
        const taskId = window.selectedTasklistId;
        if (!taskId) return showToast('No tasklist selected', 'error');

        const item = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!item) return;

        // Show loading state on the confirm button
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const originalConfirmHtml = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        confirmBtn.disabled = true;

        fetch(`/evaluation/tasklist/${taskId}/delete/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reset button state before closing modal
                confirmBtn.innerHTML = originalConfirmHtml;
                confirmBtn.disabled = false;
                
                // Close the modal first
                closeModal('deleteConfirmModal');
                
                // Clear the selected tasklist ID
                window.selectedTasklistId = null;
                
                // Add fade-out animation before removing
                item.classList.add('fade-out');
                
                // Wait for animation to complete before removing
                setTimeout(() => {
                    if (item.parentNode) {
                        item.parentNode.removeChild(item);
                    }
                    
                    // Renumber remaining tasklists
                    const remainingItems = document.querySelectorAll('.tasklist-item');
                    remainingItems.forEach((remainingItem, index) => {
                        const numberSpan = remainingItem.querySelector('.tasklist-number');
                        if (numberSpan) {
                            numberSpan.textContent = `${index + 1}.`;
                        }
                    });
                    
                    // If no tasklists remain, show the "no tasklists" message
                    if (remainingItems.length === 0) {
                        const content = document.getElementById('tasklistContent');
                        const addSection = document.querySelector('.add-tasklist-section');
                        
                        // Remove the empty tasklist list
                        const tasklistList = document.querySelector('.tasklist-list');
                        if (tasklistList) {
                            tasklistList.remove();
                        }
                        
                        // Add back the "no tasklists" message
                        const noTasklistMsg = document.createElement('div');
                        noTasklistMsg.style.cssText = 'text-align: center; padding: 2rem; color: #64748b;';
                        noTasklistMsg.innerHTML = `
                            <i class="fas fa-list" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                            <div>No tasklists found for this user</div>
                        `;
                        addSection.parentNode.insertBefore(noTasklistMsg, addSection);
                    }
                }, 300); // Match the animation duration
                
                // Show success message
                showToast(data.message || 'Tasklist deleted successfully', 'success');
                
                // Update the table in the background to reflect the deletion
                const search = document.getElementById('trainingSearchInput')?.value || '';
                ajaxLoadTable({search: search.trim(), page: 1});
            } else {
                showToast(data.error || 'Error deleting tasklist', 'error');
                // Reset button state
                confirmBtn.innerHTML = originalConfirmHtml;
                confirmBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error deleting tasklist', 'error');
            // Reset button state
            confirmBtn.innerHTML = originalConfirmHtml;
            confirmBtn.disabled = false;
        });
    };

    window.addNewTasklist = function(userId) {
        // Check if there's already a new tasklist being added
        const existingNew = document.querySelector('.new-tasklist-item');
        if (existingNew) {
            showToast('Please complete or cancel the current new tasklist first', 'warning');
            return;
        }

        const tasklistList = document.querySelector('.tasklist-list');
        const addSection = document.querySelector('.add-tasklist-section');
        
        if (!tasklistList && !addSection) return;

        // Get current count of tasklists for numbering
        const existingItems = document.querySelectorAll('.tasklist-item').length;
        const newNumber = existingItems + 1;

        // Create new tasklist item
        const newTasklistItem = document.createElement('div');
        newTasklistItem.className = 'new-tasklist-item';
        newTasklistItem.style.opacity = '0'; // Start invisible for animation
        newTasklistItem.innerHTML = `
            <div class="tasklist-content">
                <span class="tasklist-number">${newNumber}.</span>
                <div class="tasklist-edit-form" style="display: flex;">
                    <input type="text" class="tasklist-input form-input" placeholder="Enter new tasklist..." style="flex: 1; margin: 0;">
                    <div class="tasklist-actions" style="display: flex; gap: 0.25rem;">
                        <button class="btn btn-sm btn-success" onclick="saveNewTasklist(${userId})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-error" onclick="cancelNewTasklist()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Insert before the add section
        if (tasklistList) {
            tasklistList.appendChild(newTasklistItem);
        } else {
            // If no tasklist list exists, create one
            const content = document.getElementById('tasklistContent');
            const noTasklistMsg = content.querySelector('div[style*="text-align: center"]');
            if (noTasklistMsg) {
                noTasklistMsg.remove();
            }
            
            const newTasklistList = document.createElement('div');
            newTasklistList.className = 'tasklist-list';
            newTasklistList.appendChild(newTasklistItem);
            addSection.parentNode.insertBefore(newTasklistList, addSection);
        }

        // Trigger animation by setting opacity to 1 after a brief delay
        requestAnimationFrame(() => {
            newTasklistItem.style.opacity = '1';
        });

        // Focus on the input
        const input = newTasklistItem.querySelector('.tasklist-input');
        input.focus();
    };

    window.cancelNewTasklist = function() {
        const newItem = document.querySelector('.new-tasklist-item');
        if (newItem) {
            // Add fade-out animation
            newItem.classList.add('fade-out');
            
            // Wait for animation to complete before removing
            setTimeout(() => {
                if (newItem.parentNode) {
                    newItem.parentNode.removeChild(newItem);
                }
                
                // If this was the only item and we removed it, show the "no tasklists" message
                const tasklistList = document.querySelector('.tasklist-list');
                const remainingItems = document.querySelectorAll('.tasklist-item').length;
                
                if (remainingItems === 0 && tasklistList) {
                    const content = document.getElementById('tasklistContent');
                    const addSection = document.querySelector('.add-tasklist-section');
                    
                    // Remove the empty tasklist list
                    tasklistList.remove();
                    
                    // Add back the "no tasklists" message
                    const noTasklistMsg = document.createElement('div');
                    noTasklistMsg.style.cssText = 'text-align: center; padding: 2rem; color: #64748b;';
                    noTasklistMsg.innerHTML = `
                        <i class="fas fa-list" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                        <div>No tasklists found for this user</div>
                    `;
                    addSection.parentNode.insertBefore(noTasklistMsg, addSection);
                }
            }, 300); // Match the animation duration
        }
    };

    window.saveNewTasklist = function(userId) {
        const newItem = document.querySelector('.new-tasklist-item');
        if (!newItem) return;

        const input = newItem.querySelector('.tasklist-input');
        const newText = input.value.trim();
        
        if (!newText) {
            showToast('Tasklist text cannot be empty', 'error');
            input.focus();
            return;
        }

        // Show loading state
        const saveBtn = newItem.querySelector('.btn-success');
        const originalSaveHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;

        fetch(`/evaluation/user/${userId}/tasklists/create/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                tasklist: newText
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Convert the new item to a regular tasklist item
                const taskId = data.tasklist.id;
                const taskText = data.tasklist.tasklist;
                
                // Get current number
                const number = newItem.querySelector('.tasklist-number').textContent;
                
                newItem.className = 'tasklist-item success-flash';
                newItem.dataset.taskId = taskId;
                newItem.innerHTML = `
                    <div class="tasklist-content">
                        <span class="tasklist-number">${number}</span>
                        <span class="tasklist-text" onclick="editTasklist(${taskId})">${taskText}</span>
                        <div class="tasklist-edit-form" style="display: none;">
                            <input type="text" class="tasklist-input form-input" value="${taskText}">
                            <div class="tasklist-actions">
                                <button class="btn btn-sm btn-success" onclick="saveTasklist(${taskId})">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-sm btn-error" onclick="cancelEdit(${taskId})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove success flash after animation
                setTimeout(() => {
                    newItem.classList.remove('success-flash');
                }, 1500);
                
                // Show success message
                showToast(data.message || 'Tasklist created successfully', 'success');
                
                // Update the table in the background to reflect the new tasklist
                const search = document.getElementById('trainingSearchInput')?.value || '';
                ajaxLoadTable({search: search.trim(), page: 1});
            } else {
                showToast(data.error || 'Error creating tasklist', 'error');
                // Reset button state
                saveBtn.innerHTML = originalSaveHtml;
                saveBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error creating tasklist', 'error');
            // Reset button state
            saveBtn.innerHTML = originalSaveHtml;
            saveBtn.disabled = false;
        });
    };

});