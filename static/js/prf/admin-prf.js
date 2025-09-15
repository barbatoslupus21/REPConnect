class AdminPRFDashboard {
    constructor() {
        this.chart = null;
        this.currentChartType = 'line';
        this.currentPeriod = 'month';
        this.selectedPRFs = new Set();
        this.processingPRFId = null;
        this.isUpdatingChart = false;
        this.isLoadingTable = false;
        this.currentPage = 1;
        this.currentFilters = {};
        this.currentSearch = '';
        this.init();
    }

    init() {
        this.initChart();
        this.setupEventListeners();
        this.setupAnimations();
        this.initFilterSlider();
        this.initializeCurrentState();
    }

    initializeCurrentState() {
        // Initialize current state from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.currentSearch = urlParams.get('search') || '';
        this.currentPage = parseInt(urlParams.get('page')) || 1;

        // Initialize filters from URL
        this.currentFilters = {};
        for (const [key, value] of urlParams.entries()) {
            if (key !== 'search' && key !== 'page') {
                this.currentFilters[key] = value;
            }
        }
    }

    async loadTableData(page = 1, preserveCheckboxes = false) {
        if (this.isLoadingTable) return;

        this.isLoadingTable = true;
        this.currentPage = page;

        // Store current checkbox states if preserving
        let selectedIds = new Set();
        if (preserveCheckboxes) {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');
            checkboxes.forEach(cb => selectedIds.add(cb.value));
        }

        // Store current scroll position
        const scrollPosition = window.pageYOffset;

        // Show loading overlay
        this.showTableLoading(true);

        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (this.currentSearch) params.set('search', this.currentSearch);
            if (page > 1) params.set('page', page);

            // Add current filters
            for (const [key, value] of Object.entries(this.currentFilters)) {
                if (value) params.set(key, value);
            }

            const response = await fetch(`/prf/hradmin/table-data/?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateTableContent(data);

                    // Restore checkbox states if preserving
                    if (preserveCheckboxes && selectedIds.size > 0) {
                        setTimeout(() => {
                            selectedIds.forEach(id => {
                                const checkbox = document.querySelector(`.row-checkbox[value="${id}"]`);
                                if (checkbox) {
                                    checkbox.checked = true;
                                    this.selectedPRFs.add(id);
                                }
                            });
                            this.updateBulkDeleteButton();
                        }, 100);
                    }

                    // Restore scroll position
                    setTimeout(() => {
                        window.scrollTo(0, scrollPosition);
                    }, 50);
                } else {
                    this.showToast('Error loading table data', 'error');
                }
            } else {
                this.showToast('Error loading table data', 'error');
            }
        } catch (error) {
            console.error('Error loading table data:', error);
            this.showToast('Error loading table data', 'error');
        } finally {
            this.showTableLoading(false);
            this.isLoadingTable = false;
        }
    }

    showTableLoading(show) {
        const overlay = document.getElementById('tableLoadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    updateTableContent(data) {
        const tableBody = document.getElementById('tableBody');

        if (data.has_results) {
            // Update table body
            tableBody.innerHTML = data.table_data.map(prf => this.createTableRow(prf)).join('');
        } else {
            // Show contextual no data message
            let emptyStateIcon = 'fas fa-search';
            let emptyStateTitle = 'No PRF Requests Found';
            let emptyStateMessage = '';
            
            if (data.search && data.search.trim() !== '') {
                emptyStateIcon = 'fas fa-search';
                emptyStateTitle = 'No Search Results';
                emptyStateMessage = `No PRF requests found matching "<strong>${data.search}</strong>". Try adjusting your search terms or check spelling.`;
            } else if (Object.keys(this.currentFilters).length > 0) {
                emptyStateIcon = 'fas fa-filter';
                emptyStateTitle = 'No Filtered Results';
                emptyStateMessage = 'No PRF requests match your current filters. Try adjusting or clearing the filters.';
            } else {
                emptyStateIcon = 'fas fa-calendar-alt';
                emptyStateTitle = 'No PRF Requests';
                emptyStateMessage = 'There are no PRF requests in the system yet. Requests will appear here once submitted by employees.';
            }
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <i class="${emptyStateIcon}"></i>
                            <h5>${emptyStateTitle}</h5>
                            <p>${emptyStateMessage}</p>
                            ${data.search || Object.keys(this.currentFilters).length > 0 ? 
                                '<button class="btn btn-outline btn-sm" onclick="window.adminDashboard.clearFilters()">Clear All Filters</button>' : 
                                ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }

        // Update pagination
        this.updatePagination(data.pagination);

        // Reset checkbox states
        this.selectedPRFs.clear();
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        this.updateBulkDeleteButton();

        // Re-apply animations
        this.setupAnimations();
    }

    createTableRow(prf) {
        const purposeTruncated = prf.purpose.length > 50 ? prf.purpose.substring(0, 47) + '...' : prf.purpose;
        let actionButton = '';
        const status = (prf.status || '').toLowerCase().trim();
        if (status === 'pending') {
            actionButton = `<button class="btn btn-primary btn-sm" onclick="viewAdminPRFDetail(${prf.id})" title="View Details">
                <i class="fa fa-check"></i>
                Review
            </button>`;
        } else {
            actionButton = `<button class="btn btn-icon" onclick="viewAdminPRFDetail(${prf.id})" title="View Details">
                <i class="fa fa-eye"></i>
            </button>`;
        }
        return `
            <tr>
                <td>
                    <label class="standard-checkbox">
                        <input type="checkbox" class="row-checkbox" value="${prf.id}" onchange="updateBulkDeleteButton()">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td>${prf.prf_control_number}</td>
                <td>
                    <div class="employee-info">
                        <strong>${prf.employee_username}</strong>
                        <small>${prf.employee_firstname} ${prf.employee_lastname}</small>
                    </div>
                </td>
                <td>
                    <div class="prf-type-info">
                        <strong>${prf.prf_type_display}</strong>
                        <small>${prf.prf_category_display}</small>
                    </div>
                </td>
                <td>${purposeTruncated}</td>
                <td style="text-align: center;">
                    <span class="status-pill status-${prf.status === 'approved' ? 'green' : prf.status === 'disapproved' ? 'red' : prf.status === 'cancelled' ? 'gray' : 'yellow'}">
                        ${prf.status_display}
                    </span>
                </td>
                <td>${prf.created_at}</td>
                <td style="text-align: center;">
                    ${actionButton}
                </td>
            </tr>
        `;
    }

    updatePagination(pagination) {
        // Update pagination info
        document.getElementById('startRecord').textContent = pagination.start_index;
        document.getElementById('endRecord').textContent = pagination.end_index;
        document.getElementById('totalRecords').textContent = pagination.total_count;

        // Update pagination controls
        const paginationControls = document.getElementById('paginationControls');

        // Previous button
        const prevBtn = pagination.has_previous ?
            `<button class="pagination-btn" onclick="loadPage(${pagination.previous_page_number})">
                <i class="fas fa-chevron-left"></i>
            </button>` :
            `<button class="pagination-btn" disabled>
                <i class="fas fa-chevron-left"></i>
            </button>`;

        // Page numbers
        let pageNumbers = '';
        const currentPage = pagination.current_page;
        const pageRange = pagination.page_range;

        for (const num of pageRange) {
            if (num === currentPage) {
                pageNumbers += `<span class="pagination-btn active">${num}</span>`;
            } else if (num > currentPage - 3 && num < currentPage + 3) {
                pageNumbers += `<button class="pagination-btn" onclick="loadPage(${num})">${num}</button>`;
            }
        }

        // Next button
        const nextBtn = pagination.has_next ?
            `<button class="pagination-btn" onclick="loadPage(${pagination.next_page_number})">
                <i class="fas fa-chevron-right"></i>
            </button>` :
            `<button class="pagination-btn" disabled>
                <i class="fas fa-chevron-right"></i>
            </button>`;

        paginationControls.innerHTML = `
            ${prevBtn}
            <div id="pageNumbers">${pageNumbers}</div>
            ${nextBtn}
        `;
    }

    initChart() {
        const ctx = document.getElementById('prfChart');
        if (!ctx || !window.chartData) {
            console.log('Chart initialization failed:', { ctx: !!ctx, chartData: !!window.chartData });
            return;
        }

        // Ensure canvas takes full container size
        const container = ctx.parentElement;
        ctx.style.width = '100%';
        ctx.style.height = '100%';

        const data = window.chartData;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        console.log('Initializing chart with data:', data);
        this.createChart(ctx, data, isDark);
    }

    createChart(ctx, data, isDark) {
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        if (this.chart) {
            this.chart.destroy();
        }

        // Define category colors
        const categoryColors = {
            government: '#6366f1',
            banking: '#10b981',
            hr_payroll: '#f59e0b'
        };

        const categoryLabels = {
            government: 'Government Transaction',
            banking: 'Banking and Finance',
            hr_payroll: 'Human Resources and Payroll'
        };

        // Create datasets for each category
        const datasets = [];
        const categories = ['government', 'banking', 'hr_payroll'];

        categories.forEach(category => {
            datasets.push({
                label: categoryLabels[category],
                data: data.map(item => item[category] || 0),
                borderColor: categoryColors[category],
                backgroundColor: this.currentChartType === 'line'
                    ? `${categoryColors[category]}20`
                    : categoryColors[category],
                tension: this.currentChartType === 'line' ? 0.4 : 0,
                fill: this.currentChartType === 'line',
                pointRadius: this.currentChartType === 'line' ? 4 : 0,
                pointHoverRadius: this.currentChartType === 'line' ? 6 : 0,
                pointBackgroundColor: categoryColors[category],
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                borderRadius: this.currentChartType === 'bar' ? 6 : 0,
                borderSkipped: false,
            });
        });

        const chartData = {
            labels: data.map(item => item.date),
            datasets: datasets
        };

        this.chart = new Chart(ctx, {
            type: this.currentChartType,
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1,
                layout: {
                    padding: {
                        top: 20,
                        right: 30,
                        bottom: 20,
                        left: 30
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: 'Poppins',
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        titleFont: {
                            family: 'Poppins',
                            size: 14
                        },
                        bodyFont: {
                            family: 'Poppins',
                            size: 13
                        },
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 12
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                        },
                        stacked: this.currentChartType === 'bar'
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 0.5,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            },
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 12
                            },
                            precision: 0
                        },
                        afterDataLimits: function(axis) {
                            axis.max = Math.ceil(axis.max) + 1;
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                        },
                        stacked: this.currentChartType === 'bar'
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                font: {
                    family: 'Poppins',
                    size: 12
                }
            }
        });

        // Assign chart instance to window.prfChartInstance
        window.prfChartInstance = this.chart;
    }

    initFilterSlider() {
        const filterContainer = document.querySelector('.chart-filters');
        const filterButtons = filterContainer?.querySelectorAll('.filter-btn');

        if (!filterContainer || !filterButtons.length) return;

        // Set initial active state
        const activeButton = filterContainer.querySelector('.filter-btn.active');
        if (activeButton) {
            const index = Array.from(filterButtons).indexOf(activeButton);
            filterContainer.classList.add('has-active', `slide-${index}`);
        }
    }

    async updateChartPeriod(period) {
        if (this.isUpdatingChart) return;

        this.isUpdatingChart = true;
        this.currentPeriod = period;

        // Update filter button states and slide effect
        const filterContainer = document.querySelector('.chart-filters');
        const filterButtons = filterContainer?.querySelectorAll('.filter-btn');

        if (filterContainer && filterButtons) {
            // Remove all slide classes
            filterContainer.classList.remove('slide-0', 'slide-1', 'slide-2', 'has-active');

            // Update active states
            filterButtons.forEach((btn, index) => {
                const btnPeriod = btn.onclick.toString().match(/'([\w]+)'/)?.[1];
                if (btnPeriod === period) {
                    btn.classList.add('active');
                    filterContainer.classList.add('has-active', `slide-${index}`);
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        try {
            // Fetch new chart data via AJAX
            const response = await fetch(`/prf/hradmin/chart-data/?period=${period}`);
            const result = await response.json();

            this.updateChartData(result.data, document.documentElement.getAttribute('data-theme') === 'dark');
        } catch (error) {
            this.showToast('Failed to update chart data', 'error');
        } finally {
            this.isUpdatingChart = false;
        }
    }

    updateChartData(data, isDark) {
        if (!this.chart) return;

        // Define category colors
        const categoryColors = {
            government: '#6366f1',
            banking: '#10b981',
            hr_payroll: '#f59e0b'
        };

        const categoryLabels = {
            government: 'Government Transaction',
            banking: 'Banking and Finance',
            hr_payroll: 'Human Resources and Payroll'
        };

        // Update chart data
        this.chart.data.labels = data.map(item => item.date);

        // Update datasets
        const categories = ['government', 'banking', 'hr_payroll'];
        categories.forEach((category, index) => {
            if (this.chart.data.datasets[index]) {
                this.chart.data.datasets[index].data = data.map(item => item[category] || 0);
                this.chart.data.datasets[index].backgroundColor = this.currentChartType === 'line'
                    ? `${categoryColors[category]}20`
                    : categoryColors[category];
            }
        });

        // Update chart options for stacked bars
        this.chart.options.scales.x.stacked = this.currentChartType === 'bar';
        this.chart.options.scales.y.stacked = this.currentChartType === 'bar';

        this.chart.update('active');
    }

    setupEventListeners() {
        document.getElementById('exportForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportPRFs();
        });

        document.getElementById('processForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processPRFRequest();
        });

        document.getElementById('filterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFilters();
        });

        document.getElementById('selectAllCheckbox')?.addEventListener('change', (e) => {
            this.selectAllCheckboxes(e.target.checked);
        });

        const searchInput = document.getElementById('searchInput');
        const searchForm = document.querySelector('.search-box');
        
        // Prevent form submission
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (searchInput) {
                    this.performSearch(searchInput.value);
                }
            });
        }
        
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                
                // Add visual feedback during search
                const searchIcon = document.querySelector('.search-icon');
                if (searchIcon) {
                    searchIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }
                
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                    
                    // Reset search icon
                    if (searchIcon) {
                        searchIcon.innerHTML = '<i class="fas fa-search"></i>';
                    }
                }, 300);
            });

            // Keep the keypress handler for immediate search on Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(searchTimeout); // Cancel any pending debounced search
                    const query = e.target.value.trim();
                    this.performSearch(query);
                }
            });
        }

        const searchClear = document.querySelector('.search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    
                    // Add visual feedback
                    const searchIcon = document.querySelector('.search-icon');
                    if (searchIcon) {
                        searchIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    }
                    
                    this.performSearch('');
                    searchInput.focus();
                    
                    // Reset search icon after a short delay
                    setTimeout(() => {
                        if (searchIcon) {
                            searchIcon.innerHTML = '<i class="fas fa-search"></i>';
                        }
                    }, 200);
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modal = e.target.closest('.modal');
                if (modal) closeModal(modal.id);
            }
            
            const filterBtn = document.getElementById('filterBtn');
            const filterPopover = document.getElementById('filterPopover');
            
            if (filterPopover && filterBtn) {
                if (!filterBtn.contains(e.target) && !filterPopover.contains(e.target)) {
                    filterPopover.classList.remove('show');
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) closeModal(openModal.id);
                
                const filterPopover = document.getElementById('filterPopover');
                if (filterPopover && filterPopover.classList.contains('show')) {
                    filterPopover.classList.remove('show');
                }
            }
        });

        const fieldSelect = document.querySelector('.filter-field-select');
        const conditionGroup = document.getElementById('filterConditionGroup');
        const valueInput = document.getElementById('filterValueInput');

        if (fieldSelect && conditionGroup && valueInput) {
            fieldSelect.addEventListener('change', () => {
                const field = fieldSelect.value;
                if (field === 'status' || field === 'category' || field === 'prf_type') {
                    const choices = window.PRF_FILTER_CHOICES[field] || [];
                    conditionGroup.innerHTML = choices.map(choice => 
                        `<label><input type=\"checkbox\" name=\"filter_value\" value=\"${choice.value}\"> ${choice.label}</label>`
                    ).join('');
                    valueInput.style.display = 'none';
                } else {
                    conditionGroup.innerHTML = `
                        <label><input type=\"radio\" name=\"filter_condition\" value=\"is\" checked> is</label>
                        <label><input type=\"radio\" name=\"filter_condition\" value=\"is_not\"> is not</label>
                        <label><input type=\"radio\" name=\"filter_condition\" value=\"contains\"> contains</label>
                        <label><input type=\"radio\" name=\"filter_condition\" value=\"any\"> has any value</label>
                    `;
                    valueInput.style.display = '';
                    valueInput.placeholder = 'Enter value...';
                }
            });
            
            fieldSelect.dispatchEvent(new Event('change'));
        }
    }

    setupAnimations() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

        const tableRows = document.querySelectorAll('.data-table tbody tr');
        tableRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.4s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, (index * 50) + 300);
        });
    }

    performSearch(query) {
        this.currentSearch = query.trim();
        this.currentPage = 1;
        this.loadTableData(1, false);

        // Update URL without page reload
        this.updateURL();
    }

    applyFilters() {
        const form = document.getElementById('filterForm');
        const formData = new FormData(form);

        // Update current filters
        this.currentFilters = {};
        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                this.currentFilters[key] = value;
            }
        }

        this.currentPage = 1;
        closeModal('filterModal');
        this.loadTableData(1, false);

        // Update URL without page reload
        this.updateURL();
    }

    clearFilters() {
        this.currentFilters = {};
        this.currentSearch = '';
        this.currentPage = 1;

        // Clear search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Clear filter form
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.reset();
        }

        this.loadTableData(1, false);

        // Update URL without page reload
        this.updateURL();
    }

    updateURL() {
        const url = new URL(window.location);

        // Clear existing parameters
        url.search = '';

        // Add current search
        if (this.currentSearch) {
            url.searchParams.set('search', this.currentSearch);
        }

        // Add current page if not 1
        if (this.currentPage > 1) {
            url.searchParams.set('page', this.currentPage);
        }

        // Add current filters
        for (const [key, value] of Object.entries(this.currentFilters)) {
            if (value) {
                url.searchParams.set(key, value);
            }
        }

        // Update URL without page reload
        window.history.replaceState({}, '', url.toString());
    }

    selectAllCheckboxes(checked) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedPRFs.add(checkbox.value);
            } else {
                this.selectedPRFs.delete(checkbox.value);
            }
        });
        this.updateBulkDeleteButton();
    }

    updateBulkDeleteButton() {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        
        this.selectedPRFs.clear();
        checkboxes.forEach(checkbox => {
            this.selectedPRFs.add(checkbox.value);
        });

        if (bulkDeleteBtn) {
            if (this.selectedPRFs.size > 0) {
                bulkDeleteBtn.style.display = 'inline-flex';
                bulkDeleteBtn.textContent = `Delete Selected (${this.selectedPRFs.size})`;
            } else {
                bulkDeleteBtn.style.display = 'none';
            }
        }

        const allCheckboxes = document.querySelectorAll('.row-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkboxes.length === allCheckboxes.length && allCheckboxes.length > 0;
            selectAllCheckbox.indeterminate = checkboxes.length > 0 && checkboxes.length < allCheckboxes.length;
        }
    }

    async exportPRFs() {
        const form = document.getElementById('exportForm');
        const formData = new FormData(form);
        const params = new URLSearchParams(formData);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Exporting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/prf/hradmin/export/?${params.toString()}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'prf_requests.xlsx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showToast('PRF requests exported successfully!', 'success');
                closeModal('exportModal');
                
                // Reset the form after successful export
                form.reset();
            } else {
                this.showToast('Error exporting PRF requests', 'error');
            }
        } catch (error) {
            console.error('Error exporting PRFs:', error);
            this.showToast('Error exporting PRF requests', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async processPRFRequest() {
        if (!this.processingPRFId) return;

        const form = document.getElementById('processForm');
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/prf/admin/process-action/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                closeModal('processModal');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error processing PRF:', error);
            this.showToast('Error processing PRF request', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    confirmBulkDelete() {
        if (this.selectedPRFs.size === 0) {
            this.showToast('No PRF requests selected', 'warning');
            return;
        }

        document.getElementById('deleteCount').textContent = 
            `${this.selectedPRFs.size} PRF request(s) will be permanently deleted.`;
        
        // Reset the confirmation input and disable delete button
        const confirmationInput = document.getElementById('deleteConfirmationInput');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmationInput) {
            confirmationInput.value = '';
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = true;
        }
        
        openModal('confirmDeleteModal');
    }

    async executeBulkDelete() {
        const deleteBtn = document.querySelector('#confirmDeleteModal .btn-error');
        const originalText = deleteBtn.innerHTML;

        deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';
        deleteBtn.disabled = true;

        try {
            const response = await fetch('/prf/hradmin/bulk-delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    prf_ids: Array.from(this.selectedPRFs)
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                closeModal('confirmDeleteModal');
                setTimeout(() => {
                    localStorage.setItem('adminPRFScroll', window.scrollY);
                    window.location.reload();
                }, 1500);
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting PRFs:', error);
            this.showToast('Error deleting PRF requests', 'error');
        } finally {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }

    checkDeleteConfirmation() {
        const confirmationInput = document.getElementById('deleteConfirmationInput');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        if (confirmationInput && confirmDeleteBtn) {
            const inputValue = confirmationInput.value.trim().toLowerCase();
            confirmDeleteBtn.disabled = inputValue !== 'delete';
        }
    }

    showToast(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = 'info-circle';
        let bgColor = 'var(--primary-color)';
        
        if (type === 'success') {
            icon = 'check-circle';
            bgColor = 'var(--success-color)';
        } else if (type === 'error') {
            icon = 'exclamation-circle';
            bgColor = 'var(--error-color)';
        } else if (type === 'warning') {
            icon = 'exclamation-triangle';
            bgColor = 'var(--warning-color)';
        }
        
        toast.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: white;">
                <i class="fas fa-${icon}" style="font-size: 1.1rem; opacity: 0.9; color: white;"></i>
                <span style="flex: 1; color: white; font-weight: 500;">${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
}

function checkDeleteConfirmation() {
    const confirmationInput = document.getElementById('deleteConfirmationInput');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (confirmationInput && confirmDeleteBtn) {
        const inputValue = confirmationInput.value.trim().toLowerCase();
        confirmDeleteBtn.disabled = inputValue !== 'delete';
    }
}

function updateChartPeriod(period) {
    if (window.adminDashboard) {
        window.adminDashboard.updateChartPeriod(period);
    }
}

function switchChartType(type) {
    const buttons = document.querySelectorAll('.chart-type-btn');
    const filterContainer = document.querySelector('.chart-type-filters');
    buttons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = event.target.closest('.chart-type-btn');
    activeBtn.classList.add('active');

    // Slider effect
    if (filterContainer) {
        filterContainer.classList.remove('slide-0', 'slide-1', 'has-active');
        const index = Array.from(buttons).indexOf(activeBtn);
        filterContainer.classList.add('has-active', `slide-${index}`);
    }

    window.adminDashboard.currentChartType = type;

    // Update chart type and stacking
    if (window.adminDashboard.chart) {
        window.adminDashboard.chart.config.type = type;

        // Update dataset properties for the new chart type
        window.adminDashboard.chart.data.datasets.forEach(dataset => {
            if (type === 'line') {
                dataset.backgroundColor = `${dataset.borderColor}20`;
                dataset.fill = true;
                dataset.tension = 0.4;
                dataset.pointRadius = 4;
                dataset.pointHoverRadius = 6;
                dataset.borderRadius = 0;
            } else {
                dataset.backgroundColor = dataset.borderColor;
                dataset.fill = false;
                dataset.tension = 0;
                dataset.pointRadius = 0;
                dataset.pointHoverRadius = 0;
                dataset.borderRadius = 6;
            }
        });

        // Update stacking for bar charts
        window.adminDashboard.chart.options.scales.x.stacked = type === 'bar';
        window.adminDashboard.chart.options.scales.y.stacked = type === 'bar';

        window.adminDashboard.chart.update('active');
    }
}

async function viewAdminPRFDetail(prfId) {
    window.currentDetailPRFId = prfId;
    try {
        const response = await fetch(`/prf/admin/detail/${prfId}/?_t=${Date.now()}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log('=== FULL API RESPONSE OBJECT ===');
            console.log('Response keys:', Object.keys(data));
            console.log('prf_type_value:', data.prf_type_value);
            console.log('emergency_loan:', data.emergency_loan);
            console.log('Raw response:', data);
            console.log('===============================');
            
            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            set('details-requestor', `${data.employee_firstname || ''} ${data.employee_lastname || ''}`.trim());
            set('details-idnumber', data.employee_idnumber || '');
            set('details-category', data.prf_category);
            set('details-type', data.prf_type);
            set('details-prf-number', data.prf_control_number || 'N/A');
            set('details-purpose', data.purpose);
            set('details-created', data.created_at);
            set('details-remarks', data.admin_remarks);
            set('details-control', data.control_number || '');
            const controlRow = document.getElementById('details-control-row');
            if (controlRow) controlRow.style.display = data.control_number ? '' : 'none';
            
            // Status badge logic
            const statusSpan = document.getElementById('details-status-badge');
            if (statusSpan) {
                statusSpan.className = `status-badge status-${data.status.toLowerCase()}`;
                let icon = '<i class="fas fa-clock"></i>';
                if (data.status.toLowerCase() === 'approved') icon = '<i class="fas fa-check"></i>';
                else if (data.status.toLowerCase() === 'disapproved') icon = '<i class="fas fa-times"></i>';
                statusSpan.innerHTML = `${icon} ${data.status_display}`;
            }
            
            // Handle Emergency Loan details
            const emergencyLoanSection = document.getElementById('emergency-loan-details');
            console.log('=== Emergency Loan Debug ===');
            console.log('PRF Type Value:', data.prf_type_value);
            console.log('Emergency Loan Data:', data.emergency_loan);
            console.log('Is Emergency Loan PRF?', data.prf_type_value === 'emergency_loan');
            console.log('Has Emergency Loan Data?', !!data.emergency_loan);
            
            if (emergencyLoanSection) {
                // Only show for Emergency Loan PRFs that have emergency loan data
                if (data.prf_type_value === 'emergency_loan' && data.emergency_loan) {
                    console.log('✅ Showing Emergency Loan section - This is an Emergency Loan PRF with data');
                    
                    // Show Emergency Loan section with proper styling
                    emergencyLoanSection.style.display = 'block';
                    emergencyLoanSection.style.background = '#f8f9fa';
                    emergencyLoanSection.style.border = '1px solid #dee2e6';
                    emergencyLoanSection.style.padding = '1rem';
                    emergencyLoanSection.style.margin = '1rem 0';
                    emergencyLoanSection.style.borderRadius = '0.375rem';
                    
                    // Populate Emergency Loan data
                    set('emergency-control-number', data.control_number || 'N/A');
                    set('emergency-amount', `₱${parseFloat(data.emergency_loan.amount).toLocaleString()}`);
                    set('emergency-number-of-cutoff', data.emergency_loan.number_of_cutoff.toString());
                    set('emergency-starting-date', data.emergency_loan.starting_date);
                    
                    console.log('Emergency Loan data populated successfully');
                } else {
                    console.log('❌ Hiding Emergency Loan section - Either not Emergency Loan PRF or no data available');
                    console.log('  - PRF Type:', data.prf_type_value);
                    console.log('  - Has Emergency Loan Data:', !!data.emergency_loan);
                    
                    // Hide Emergency Loan section for non-emergency loan PRFs or PRFs without emergency loan data
                    emergencyLoanSection.style.display = 'none';
                }
            } else {
                console.log('❌ Emergency Loan section element not found in DOM!');
            }
            
            // Hide remarks if not present
            const remarksRow = document.getElementById('details-remarks-row');
            if (remarksRow) remarksRow.style.display = data.admin_remarks ? '' : 'none';
            
            openModal('prfDetailModal');
            const approveBtn = document.getElementById('approveBtn');
            const disapproveBtn = document.getElementById('disapproveBtn');
            if (approveBtn && disapproveBtn) {
                if (data.status === 'pending') {
                    approveBtn.style.display = '';
                    disapproveBtn.style.display = '';
                } else {
                    approveBtn.style.display = 'none';
                    disapproveBtn.style.display = 'none';
                }
            }
        } else {
            window.adminDashboard.showToast('Error loading PRF details', 'error');
        }
    } catch (error) {
        console.error('Error fetching PRF details:', error);
        window.adminDashboard.showToast('Error loading PRF details', 'error');
    }
}

function processPRF(prfId) {
    window.adminDashboard.processingPRFId = prfId;
    document.getElementById('processForm').reset();
    openModal('processModal');
}

function handleSearchSubmit(event) {
    event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const query = searchInput.value.trim();
        window.adminDashboard.performSearch(query);
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        window.adminDashboard.performSearch('');
    }
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    window.adminDashboard.selectAllCheckboxes(selectAllCheckbox.checked);
}

function updateBulkDeleteButton() {
    window.adminDashboard.updateBulkDeleteButton();
}

function confirmBulkDelete() {
    window.adminDashboard.confirmBulkDelete();
}

function executeBulkDelete() {
    window.adminDashboard.executeBulkDelete();
}

function clearFilters() {
    window.adminDashboard.clearFilters();
}

function loadPage(page) {
    window.adminDashboard.loadTableData(page, true); // Preserve checkboxes when paginating
    window.adminDashboard.updateURL();
}

function toggleFilterPopover() {
    const popover = document.getElementById('filterPopover');
    if (popover) {
        popover.classList.toggle('show');
    }
}

function applyFilter(event) {
    event.preventDefault();
    toggleFilterPopover();

    const field = document.querySelector('.filter-field-select').value;
    let value = '';

    if (field === 'status' || field === 'category' || field === 'prf_type') {
        const checked = Array.from(document.querySelectorAll('input[name="filter_value"]:checked'));
        value = checked.map(cb => cb.value).filter(v => v !== 'all').join(',');
    } else {
        const condition = document.querySelector('input[name="filter_condition"]:checked').value;
        const inputValue = document.getElementById('filterValueInput').value.trim();
        value = `${condition}:${inputValue}`;
    }

    // Update dashboard filters
    if (value) {
        window.adminDashboard.currentFilters['filter_field'] = field;
        window.adminDashboard.currentFilters['filter_value'] = value;
    } else {
        delete window.adminDashboard.currentFilters['filter_field'];
        delete window.adminDashboard.currentFilters['filter_value'];
    }

    window.adminDashboard.currentPage = 1;
    window.adminDashboard.loadTableData(1, true); // Preserve checkboxes for popover filters
    window.adminDashboard.updateURL();
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('show');
        modal.classList.remove('closing');
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('closing');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.remove('closing');
        modal.style.display = 'none';
    }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminPRFDashboard();

    // Add export form submit handler only once
    const exportForm = document.getElementById('exportForm');
    if (exportForm) {
        exportForm.addEventListener('submit', handleExportSubmit);
    }

    // Restore scroll position if available
    const savedScroll = localStorage.getItem('adminPRFScroll');
    if (savedScroll !== null) {
        window.scrollTo(0, parseInt(savedScroll, 10));
        localStorage.removeItem('adminPRFScroll');
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal.id);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) closeModal(openModal.id);
        }
    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                if (window.adminDashboard.chart && window.chartData) {
                    const data = JSON.parse(window.chartData);
                    window.adminDashboard.createChart(
                        document.getElementById('prfChart'), 
                        data, 
                        isDark
                    );
                }
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
});

function processPRFAction(action) {
    const prfId = window.currentDetailPRFId;
    if (!prfId) return;
    
    if (action === 'disapproved') {
        // Show disapproval remarks modal
        document.getElementById('disapprovalRemarks').value = '';
        closeModal('prfDetailModal');
        openModal('disapprovalRemarksModal');
    } else {
        // Handle approval directly
        submitPRFAction(action, '');
    }
}

function submitDisapproval() {
    const remarks = document.getElementById('disapprovalRemarks').value.trim();
    if (!remarks) {
        window.adminDashboard.showToast('Please provide a reason for disapproval', 'warning');
        return;
    }
    
    submitPRFAction('disapproved', remarks);
}

function submitPRFAction(action, remarks) {
    const prfId = window.currentDetailPRFId;
    if (!prfId) return;
    
    // Disable action buttons to prevent double submission
    const approveBtn = document.getElementById('approveBtn');
    const disapproveBtn = document.getElementById('disapproveBtn');
    const originalApproveText = approveBtn ? approveBtn.innerHTML : '';
    const originalDisapproveText = disapproveBtn ? disapproveBtn.innerHTML : '';
    
    if (approveBtn) {
        approveBtn.disabled = true;
        approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    if (disapproveBtn) {
        disapproveBtn.disabled = true;
        disapproveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    fetch('/prf/admin/process-action/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `prf_id=${encodeURIComponent(prfId)}&action=${encodeURIComponent(action)}&remarks=${encodeURIComponent(remarks)}`
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Close all modals
            closeModal('disapprovalRemarksModal');
            closeModal('prfDetailModal');
            
            // Show success message
            window.adminDashboard.showToast(data.message, 'success');
            
            // Refresh the entire page to ensure all data is updated
            setTimeout(() => {
                window.location.reload();
            }, 1500); // Wait 1.5 seconds to show the toast message
        } else {
            window.adminDashboard.showToast(data.message || 'Action failed', 'error');
            
            // Re-enable buttons on error
            if (approveBtn) {
                approveBtn.disabled = false;
                approveBtn.innerHTML = originalApproveText;
            }
            if (disapproveBtn) {
                disapproveBtn.disabled = false;
                disapproveBtn.innerHTML = originalDisapproveText;
            }
        }
    })
    .catch(() => {
        window.adminDashboard.showToast('Action failed', 'error');
        
        // Re-enable buttons on error
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = originalApproveText;
        }
        if (disapproveBtn) {
            disapproveBtn.disabled = false;
            disapproveBtn.innerHTML = originalDisapproveText;
        }
    });
}

function handleExportSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return; // Prevent double submit
    submitBtn.disabled = true;
    const formData = new FormData(form);
    const prfType = formData.get('prf_type');
    const startDate = formData.get('start_date');
    const endDate = formData.get('end_date');
    // PRF Type can be empty (for All)
    if (!startDate) {
        window.adminDashboard.showToast('Please select a Start Date', 'warning');
        submitBtn.disabled = false;
        return;
    }
    if (!endDate) {
        window.adminDashboard.showToast('Please select an End Date', 'warning');
        submitBtn.disabled = false;
        return;
    }
    if (startDate > endDate) {
        window.adminDashboard.showToast('Start Date cannot be after End Date', 'warning');
        submitBtn.disabled = false;
        return;
    }
    window.adminDashboard.exportPRFs().finally(() => {
        submitBtn.disabled = false;
    });
}

function getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return '';
}

// Chart.js dark mode support
function applyChartDarkTheme(isDark) {
    if (!window.prfChartInstance) return;
    window.prfChartInstance.options.plugins.legend.labels.color = isDark ? '#e0e6ed' : '#222';
    window.prfChartInstance.options.plugins.title.color = isDark ? '#e0e6ed' : '#222';
    window.prfChartInstance.options.scales.x.ticks.color = isDark ? '#e0e6ed' : '#222';
    window.prfChartInstance.options.scales.y.ticks.color = isDark ? '#e0e6ed' : '#222';
    window.prfChartInstance.options.scales.x.grid.color = isDark ? '#444' : '#eee';
    window.prfChartInstance.options.scales.y.grid.color = isDark ? '#444' : '#eee';
    window.prfChartInstance.options.backgroundColor = isDark ? '#23272f' : '#fff';
    window.prfChartInstance.update();
}

function updateChartThemeOnDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyChartDarkTheme(isDark);
}

// Observe theme changes
const chartThemeObserver = new MutationObserver(updateChartThemeOnDarkMode);
chartThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// Call on page load
updateChartThemeOnDarkMode();