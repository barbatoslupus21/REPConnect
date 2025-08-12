/**
 * Leave Management - Admin Interface JavaScript
 * Handles administrative functionalities for leave management
 */

class LeaveAdminInterface {
    constructor() {
        this.currentModal = null;
        this.selectedItems = new Set();
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeBulkActions();
        this.initializeSearch();
        this.initializeSorting();
        this.initializeDropdowns();
        this.initializeTabs();
        this.initializeModals();
        this.initializeBalanceManagement();
    }

    initializeTabs() {
        // Tab switching logic for Leave Requests Tab
        const tabButtons = document.querySelectorAll('.tabs-horizontal .tab-list .tab');
        const leaveRequestsPanel = document.getElementById('leave-requests');
        const leaveBalancesPanel = document.getElementById('leave-balances');

        if (tabButtons.length && leaveRequestsPanel && leaveBalancesPanel) {
            tabButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Remove active from all buttons
                    tabButtons.forEach(b => b.classList.remove('active'));
                    // Hide all panels
                    leaveRequestsPanel.classList.remove('active');
                    leaveBalancesPanel.classList.remove('active');
                    // Set active on clicked button
                    this.classList.add('active');
                    // Show the corresponding panel
                    const target = this.getAttribute('data-target');
                    if (target === 'leave-requests') {
                        leaveRequestsPanel.classList.add('active');
                        // Clear balance search when switching to leave requests
                        const balanceSearchInput = document.getElementById('balanceSearchInput');
                        if (balanceSearchInput) balanceSearchInput.value = '';
                    } else if (target === 'leave-balances') {
                        leaveBalancesPanel.classList.add('active');
                        // Clear leave request search when switching to balance
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) searchInput.value = '';
                    }
                });
            });
        }
    }

    initializeModals() {
        // Modal overlay clicks
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeCurrentModal();
                }
            });
        });

        // Initialize filter form
        this.initializeFilterForm();
        
        // Initialize export modal
        this.initializeExportModal();
    }

    initializeFilterForm() {
        const searchFilterForm = document.getElementById('searchFilterForm');
        const resetFilters = document.getElementById('resetFilters');
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');

        // Reset filters
        if (resetFilters) {
            resetFilters.addEventListener('click', () => {
                // Clear all filter inputs
                document.getElementById('filter_search').value = '';
                document.getElementById('filter_status').value = '';
                document.getElementById('filter_leave_type').value = '';
                document.getElementById('filter_department').value = '';
                document.getElementById('filter_date_from').value = '';
                document.getElementById('filter_date_to').value = '';
                
                // Refresh table with no filters
                this.refreshTable();
            });
        }

        // Handle filter form submission with AJAX and add animation effects
        if (searchFilterForm) {
            searchFilterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(searchFilterForm);
                const params = new URLSearchParams(formData);
                const tableContainer = document.querySelector('#leave-requests .leave-table-container');
                if (tableContainer) {
                    // Remove any lingering classes and reset opacity
                    tableContainer.classList.remove('fade-in');
                    tableContainer.classList.remove('fade-out');
                    tableContainer.style.opacity = '1';
                    // Force reflow to ensure transition
                    void tableContainer.offsetWidth;
                    tableContainer.classList.add('fade-out');
                }
                fetch(window.location.pathname + '?' + params.toString(), {
                    method: 'GET',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.html) {
                        if (tableContainer) {
                            setTimeout(() => {
                                tableContainer.innerHTML = data.html;
                                // Remove fade-out, force reflow, then fade-in
                                tableContainer.classList.remove('fade-out');
                                void tableContainer.offsetWidth;
                                tableContainer.classList.add('fade-in');
                                setTimeout(() => {
                                    tableContainer.classList.remove('fade-in');
                                    tableContainer.style.opacity = '1';
                                }, 350);
                            }, 200);
                        }
                        this.closeModal('filterModal');
                    }
                })
                .catch(err => {
                    console.error('Filter error:', err);
                    this.showMessage('Error applying filters', 'error');
                    if (tableContainer) {
                        tableContainer.classList.remove('fade-out');
                        tableContainer.classList.remove('fade-in');
                        tableContainer.style.opacity = '1';
                    }
                });
            });
        }

        // Live search functionality
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                const searchTerm = searchInput.value.trim();

                searchTimeout = setTimeout(() => {
                    // Check if we're on the leave requests tab
                    const leaveRequestsTab = document.getElementById('leave-requests');
                    if (!leaveRequestsTab || !leaveRequestsTab.classList.contains('active')) {
                        return; // Don't search if not on leave requests tab
                    }

                    const params = new URLSearchParams();
                    if (searchTerm) params.append('search', searchTerm);

                    fetch(window.location.pathname + '?' + params.toString(), {
                        method: 'GET',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.html) {
                            const tableContainer = document.querySelector('#leave-requests .leave-table-container');
                            if (tableContainer) {
                                tableContainer.innerHTML = data.html;
                            }

                            const clearButton = document.querySelector('.search-clear');
                            if (clearButton) clearButton.style.display = searchTerm ? 'inline-block' : 'none';
                        }
                    })
                    .catch(err => console.error('Search error:', err));
                }, 300);
            });
        }

        // Clear search functionality
        if (clearSearch) {
            clearSearch.addEventListener('click', (e) => {
                e.preventDefault();
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            });
        }

        // Load specific page with AJAX (for pagination)
        window.loadPage = (pageNum, searchTerm = '') => {
            const url = new URL(window.location.href);
            url.searchParams.set('page', pageNum);
            if (searchTerm) url.searchParams.set('search', searchTerm);

            fetch(url.toString(), {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(res => res.json())
            .then((data) => {
                if (data.success && data.html) {
                    const tableContainer = document.querySelector('#leave-requests .leave-table-container');
                    const paginationContainer = document.getElementById('leaveRequestsPaginationContainer');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = data.html;
                    const newTable = tempDiv.querySelector('.leave-table-container');
                    const newPagination = tempDiv.querySelector('.pagination');

                    if (newTable && tableContainer) tableContainer.innerHTML = newTable.innerHTML;
                    if (newPagination && paginationContainer) paginationContainer.outerHTML = newPagination.outerHTML;
                }
            })
            .catch(err => console.error('Error loading page:', err));
        };
    }

    initializeExportModal() {
        const exportBtn = document.getElementById('export-leave-report-btn');
        const exportModal = document.getElementById('exportModal');
        const exportButton = document.querySelector('[data-action="start-export"]');
        const exportDateFrom = document.getElementById('exportDateFrom');
        const exportDateTo = document.getElementById('exportDateTo');

        // Open export modal
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.openModal('exportModal');
            });
        }

        // Handle export
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                const dateFrom = exportDateFrom.value;
                const dateTo = exportDateTo.value;

                // Validate date inputs
                if (!dateFrom || !dateTo) {
                    this.showMessage('Please select both date from and date to fields', 'error');
                    return;
                }

                if (new Date(dateFrom) > new Date(dateTo)) {
                    this.showMessage('Date from cannot be later than date to', 'error');
                    return;
                }

                // Start export process
                this.exportLeaveReport(dateFrom, dateTo);
            });
        }
    }

    exportLeaveReport(dateFrom, dateTo) {
        // Show loading state
        const exportButton = document.querySelector('[data-action="start-export"]');
        const originalText = exportButton.innerHTML;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        exportButton.disabled = true;

        // Create download URL with date parameters
        const url = new URL('/leave/export-report/', window.location.origin);
        url.searchParams.set('date_from', dateFrom);
        url.searchParams.set('date_to', dateTo);

        // Use window.location.href for direct download to Downloads folder
        window.location.href = url.toString();

        // Reset button state
        setTimeout(() => {
            exportButton.innerHTML = originalText;
            exportButton.disabled = false;
            this.closeModal('exportModal');
            this.showMessage('Report exported successfully', 'success');
        }, 1500);
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            // Force reflow
            void modal.offsetWidth;
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }, 300);
        }
    }

    bindEvents() {
        // Update existing modal handling to use new methods
        const closeButtons = document.querySelectorAll('[data-action="close-modal"]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = btn.getAttribute('data-modal');
                if (modalId) {
                    this.closeModal(modalId);
                }
            });
        });

        // Event delegation for all actions
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('change', this.handleChange.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));

        // Modal overlay clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeCurrentModal();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Search form auto-submit
        const searchForm = document.getElementById('searchFilterForm');
        if (searchForm) {
            const inputs = searchForm.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('change', this.debounce(() => {
                    if (input.type !== 'submit') {
                        searchForm.submit();
                    }
                }, 500));
            });
        }
    }

    handleClick(e) {
        // Always use closest to get the element with data-action
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-action');
        if (!action) return;

        console.log('Action clicked:', action); // Debug log
        e.preventDefault();

        switch (action) {
            case 'view-details':
                this.viewLeaveDetails(actionEl);
                break;
            case 'open-approval':
                this.openApprovalModal(actionEl);
                break;
            case 'view-timeline':
                this.viewTimeline(actionEl);
                break;
            case 'quick-approve':
                this.quickApprove(actionEl);
                break;
            case 'quick-disapprove':
                this.quickDisapprove(actionEl);
                break;
            case 'cancel-request':
                this.cancelRequest(actionEl);
                break;
            case 'export-request':
                this.exportRequest(actionEl);
                break;
            case 'add-balance':
                this.openAddBalanceModal();
                break;
            case 'export-data':
                this.openExportModal();
                break;
            case 'reset-filters':
                this.resetFilters();
                break;
            case 'refresh-table':
                this.refreshTable();
                break;
            case 'bulk-approve':
                this.bulkApprove();
                break;
            case 'bulk-disapprove':
                this.bulkDisapprove();
                break;
            case 'bulk-export':
                this.bulkExport();
                break;
            case 'start-export':
                this.startExport();
                break;
            case 'view-balance-details':
                this.viewBalanceDetails(actionEl);
                break;
            case 'delete-balance':
                this.deleteBalance(actionEl);
                break;
            case 'dropdown-toggle':
                this.toggleDropdown(actionEl);
                break;
            case 'open-modal':
                this.openModal(actionEl.getAttribute('data-modal'));
                break;
            case 'close-modal':
                this.closeModal(actionEl.getAttribute('data-modal'));
                break;
            case 'process-approval':
                this.handleProcessApproval(actionEl);
                break;
        }
    }

    handleChange(e) {
        const element = e.target;
        
        // Bulk selection
        if (element.classList.contains('bulk-select-all')) {
            this.toggleSelectAll(element.checked);
        } else if (element.classList.contains('bulk-select-item')) {
            this.toggleSelectItem(element.value, element.checked);
        }

        // Date validation in add balance form
        if (element.id === 'valid_from' || element.id === 'valid_to') {
            this.validateBalanceDates();
        }
    }

    handleSubmit(e) {
        if (e.target.id === 'balanceSearchForm') {
            e.preventDefault();
            const searchInput = document.getElementById('balanceSearchInput');
            const searchValue = searchInput ? searchInput.value : '';
            this.performBalanceSearch(searchValue);
            return false;
        }
        
        if (e.target.id === 'addBalanceForm') {
            if (!this.validateBalanceForm()) {
                e.preventDefault();
                return false;
            }
            this.showFormSubmitting(e.target);
        }
    }

    handleKeyboard(e) {
        // Escape key closes modals and dropdowns
        if (e.key === 'Escape') {
            if (this.currentModal) {
                this.closeCurrentModal();
            }
            this.closeAllDropdowns();
        }
        
        // Ctrl/Cmd + A selects all items
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            const selectAllCheckbox = document.querySelector('.bulk-select-all');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = true;
                this.toggleSelectAll(true);
            }
        }
    }

    // Bulk Actions
    initializeBulkActions() {
        this.selectedItems = new Set();
        this.updateBulkActionsVisibility();
    }

    toggleSelectAll(checked) {
        const items = document.querySelectorAll('.bulk-select-item');
        items.forEach(item => {
            item.checked = checked;
            if (checked) {
                this.selectedItems.add(item.value);
            } else {
                this.selectedItems.delete(item.value);
            }
        });
        this.updateBulkActionsVisibility();
    }

    toggleSelectItem(itemId, checked) {
        if (checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        
        // Update select all checkbox
        const selectAllCheckbox = document.querySelector('.bulk-select-all');
        const totalItems = document.querySelectorAll('.bulk-select-item').length;
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = this.selectedItems.size === totalItems;
            selectAllCheckbox.indeterminate = this.selectedItems.size > 0 && this.selectedItems.size < totalItems;
        }
        
        this.updateBulkActionsVisibility();
    }

    updateBulkActionsVisibility() {
        const bulkActions = document.getElementById('bulkActions');
        const selectedCount = document.querySelector('.selected-count');
        
        if (bulkActions) {
            bulkActions.style.display = this.selectedItems.size > 0 ? 'flex' : 'none';
        }
        
        if (selectedCount) {
            selectedCount.textContent = `${this.selectedItems.size} item${this.selectedItems.size !== 1 ? 's' : ''} selected`;
        }
    }

    async bulkApprove() {
        this.showBulkConfirmation('approve', `approve ${this.selectedItems.size} selected leave request${this.selectedItems.size !== 1 ? 's' : ''}?`);
    }

    async bulkDisapprove() {
        this.showBulkConfirmation('disapprove', `disapprove ${this.selectedItems.size} selected leave request${this.selectedItems.size !== 1 ? 's' : ''}?`);
    }

    async bulkExport() {
        if (this.selectedItems.size === 0) {
            this.showToast('No items selected', 'warning');
            return;
        }

        this.showToast(`Exporting ${this.selectedItems.size} leave requests...`, 'info');
        
        try {
            const response = await fetch('/leave/admin/bulk-export/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    item_ids: Array.from(this.selectedItems)
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                this.downloadFile(blob, 'leave_requests_export.xlsx');
                this.showToast('Export completed successfully', 'success');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            this.showToast('Error exporting data', 'error');
        }
    }

    showBulkConfirmation(action, message) {
        const modal = document.getElementById('bulkConfirmModal');
        const messageElement = document.getElementById('bulkConfirmMessage');
        const confirmButton = document.getElementById('confirmBulkAction');
        
        if (messageElement) {
            messageElement.textContent = `Are you sure you want to ${message}`;
        }
        
        if (confirmButton) {
            confirmButton.onclick = () => this.executeBulkAction(action);
        }
        
        this.openModal('bulkConfirmModal');
    }

    async executeBulkAction(action) {
        const comments = document.getElementById('bulkComments').value;
        
        try {
            const response = await fetch('/leave/admin/bulk-action/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    item_ids: Array.from(this.selectedItems),
                    comments: comments
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message, 'success');
                this.closeModal('bulkConfirmModal');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error executing bulk action:', error);
            this.showToast('Error executing bulk action', 'error');
        }
    }

    // Search and Filtering
    initializeSearch() {
        // Initialize balance search functionality
        const balanceSearchInput = document.getElementById('balanceSearchInput');
        const balanceSearchForm = document.getElementById('balanceSearchForm');
        
        if (balanceSearchInput) {
            balanceSearchInput.addEventListener('input', this.debounce((e) => {
                this.performBalanceSearch(e.target.value);
            }, 300));
        }

        // Prevent form submission for balance search form
        if (balanceSearchForm) {
            balanceSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const searchValue = balanceSearchInput ? balanceSearchInput.value : '';
                this.performBalanceSearch(searchValue);
                return false;
            });
        }
    }

    performBalanceSearch(query) {
        // Check if we're on the leave balances tab
        const leaveBalancesTab = document.getElementById('leave-balances');
        if (!leaveBalancesTab || !leaveBalancesTab.classList.contains('active')) {
            return; // Don't search if not on leave balances tab
        }

        const url = new URL(window.location.href);
        url.searchParams.set('balance_search', query);
        
        fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById('balanceTableBody');
                if (tableBody) {
                    // Add fade animation
                    tableBody.style.opacity = '0';
                    setTimeout(() => {
                        tableBody.innerHTML = data.html;
                        tableBody.style.opacity = '1';
                        // Re-attach event listeners to new content
                        this.setupBalanceTableListeners();
                    }, 150);
                }
            }
        })
        .catch(error => {
            console.error('Balance search error:', error);
            this.showMessage('Search failed. Please try again.', 'error');
        });
    }

    performLiveSearch(query) {
        // This method is now deprecated in favor of server-side search
        // Keeping it for backwards compatibility but not used
        const tableRows = document.querySelectorAll('#leaveRequestsTable tbody tr');
        
        tableRows.forEach(row => {
            if (row.querySelector('.empty-state')) return; // Skip empty state row
            
            const text = row.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }

    resetFilters() {
        const form = document.getElementById('searchFilterForm');
        if (form) {
            form.reset();
            form.submit();
        }
    }

    // Sorting
    initializeSorting() {
        const sortableHeaders = document.querySelectorAll('[data-sort]');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                this.sortTable(header.getAttribute('data-sort'));
            });
            header.style.cursor = 'pointer';
        });
    }

    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Update visual indicators
        this.updateSortIndicators();
        
        // Perform sort (for now, just reload with sort parameters)
        const url = new URL(window.location);
        url.searchParams.set('sort', column);
        url.searchParams.set('direction', this.sortDirection);
        window.location.href = url.toString();
    }

    updateSortIndicators() {
        const headers = document.querySelectorAll('[data-sort]');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.getAttribute('data-sort') === this.sortColumn) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    // Leave Request Actions
    async viewLeaveDetails(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        try {
            const response = await fetch(`/leave/admin/detail/${controlNumber}/`);
            if (!response.ok) throw new Error('Failed to fetch details');
            
            const data = await response.json();
            if (data.success) {
                document.getElementById('leaveDetailsContent').innerHTML = data.content;
                this.openModal('leaveDetailsModal');
            } else {
                throw new Error(data.error || 'Failed to load details');
            }
        } catch (error) {
            console.error('Error loading leave details:', error);
            this.showMessage('Error loading leave details', 'error');
        }
    }

    async openApprovalModal(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        try {
            const response = await fetch(`/leave/admin/approval-detail/${controlNumber}/`);
            if (!response.ok) throw new Error('Failed to fetch details');
            
            const data = await response.json();
            if (data.success) {
                const approvalContent = document.getElementById('approvalContent');
                approvalContent.innerHTML = data.content;
                approvalContent.setAttribute('data-control-number', controlNumber);
                
                // Set up approval buttons if user can approve
                if (data.can_approve) {
                    this.setupApprovalButtons(controlNumber);
                }
                
                this.openModal('approvalModal');
            } else {
                throw new Error(data.error || 'Failed to load details');
            }
        } catch (error) {
            console.error('Error loading approval modal:', error);
            this.showMessage('Error loading approval details', 'error');
        }
    }

    handleProcessApproval(actionEl) {
        console.log('handleProcessApproval called', actionEl); // Debug log
        
        const approvalAction = actionEl.getAttribute('data-approval-action');
        const commentsField = document.getElementById('approvalComments');
        const comments = commentsField ? commentsField.value.trim() : '';
        
        console.log('Approval action:', approvalAction, 'Comments:', comments); // Debug log
        
        // Get control number from the modal content or from a data attribute
        const modalContent = document.getElementById('approvalContent');
        const controlNumber = modalContent ? modalContent.getAttribute('data-control-number') : null;
        
        console.log('Control number found:', controlNumber); // Debug log
        
        if (!controlNumber) {
            console.error('No control number found for approval processing');
            this.showMessage('Error: Unable to identify leave request', 'error');
            return;
        }

        if (approvalAction === 'approved') {
            this.processApproval(controlNumber, 'approve', comments);
        } else if (approvalAction === 'disapproved') {
            this.processApproval(controlNumber, 'disapprove', comments);
        }
    }

    setupApprovalButtons(controlNumber) {
        // Store control number for the event delegation handler
        const approvalContent = document.getElementById('approvalContent');
        if (approvalContent) {
            approvalContent.setAttribute('data-control-number', controlNumber);
        }
        
        // No need to set onclick handlers - event delegation will handle it
        console.log('Approval buttons set up for control number:', controlNumber);
    }

    async processApproval(controlNumber, action, comments) {
        console.log(`Processing approval: ${action} for ${controlNumber} with comments: "${comments}"`); // Debug log
        
        try {
            const url = `/leave/admin/process-approval/${controlNumber}/`;
            console.log('Making request to:', url); // Debug log
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    action: action,
                    comments: comments
                })
            });

            console.log('Response received:', response.status, response.statusText); // Debug log
            
            const data = await response.json();
            console.log('Response data:', data); // Debug log
            
            if (data.success) {
                // Close modal first
                this.closeModal('approvalModal');
                
                // Show success toast after a brief delay to ensure modal is closed
                setTimeout(() => {
                    this.showMessage(data.message, 'success');
                }, 200);
                
                // Refresh the table to show updated status
                setTimeout(() => {
                    this.refreshTable();
                }, 300);
            } else {
                throw new Error(data.error || 'Failed to process approval');
            }
        } catch (error) {
            console.error(`Error ${action}ing leave:`, error);
            this.showMessage(`Error ${action}ing leave request`, 'error');
        }
    }

    getCSRFToken() {
        // Try to get CSRF token from various sources
        let csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) return csrfToken.value;
        
        // Try from cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        
        // Try from meta tag
        const metaToken = document.querySelector('meta[name=csrf-token]');
        if (metaToken) return metaToken.getAttribute('content');
        
        return '';
    }

    refreshTable() {
        // AJAX table refresh removed. Use full page reloads for table updates.
        window.location.reload();
    }

    async viewTimeline(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        try {
            const response = await fetch(`/leave/timeline/${controlNumber}/`);
            if (!response.ok) throw new Error('Failed to fetch timeline');
            
            const html = await response.text();
            document.getElementById('timelineContent').innerHTML = html;
            this.openModal('timelineModal');
        } catch (error) {
            console.error('Error loading timeline:', error);
            this.showToast('Error loading timeline', 'error');
        }
    }

    async quickApprove(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        if (!confirm('Are you sure you want to approve this leave request?')) {
            return;
        }

        await this.processQuickAction(controlNumber, 'approve');
    }

    async quickDisapprove(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        if (!confirm('Are you sure you want to disapprove this leave request?')) {
            return;
        }

        await this.processQuickAction(controlNumber, 'disapprove');
    }

    async processQuickAction(controlNumber, action) {
        try {
            const response = await fetch(`/leave/process/${controlNumber}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    comments: `Quick ${action} by admin`
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message, 'success');
                this.updateRowStatus(controlNumber, action);
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error processing action:', error);
            this.showToast('Error processing request', 'error');
        }
    }

    updateRowStatus(controlNumber, newStatus) {
        const row = document.querySelector(`[data-leave-id] .control-number:contains("${controlNumber}")`);
        if (row) {
            const statusCell = row.closest('tr').querySelector('.status-badge');
            if (statusCell) {
                statusCell.className = `status-badge status-${newStatus}d`;
                statusCell.textContent = newStatus === 'approve' ? 'Approved' : 'Disapproved';
            }
            
            // Remove action buttons
            const actionButtons = row.closest('tr').querySelector('.action-buttons');
            if (actionButtons) {
                const quickButtons = actionButtons.querySelectorAll('[data-action^="quick-"]');
                quickButtons.forEach(btn => btn.remove());
            }
        }
    }

    async cancelRequest(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        if (!confirm('Are you sure you want to cancel this leave request?')) {
            return;
        }

        try {
            const response = await fetch(`/leave/cancel/${controlNumber}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message, 'success');
                this.updateRowStatus(controlNumber, 'cancelled');
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error cancelling request:', error);
            this.showToast('Error cancelling request', 'error');
        }
    }

    async exportRequest(element) {
        const controlNumber = this.getControlNumber(element);
        if (!controlNumber) return;

        try {
            const response = await fetch(`/leave/export/${controlNumber}/pdf/`);
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            this.downloadFile(blob, `leave_request_${controlNumber}.pdf`);
            this.showToast('Request exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting request:', error);
            this.showToast('Error exporting request', 'error');
        }
    }

    // Balance Management
    openAddBalanceModal() {
        this.resetBalanceForm();
        this.openModal('addBalanceModal');
    }

    resetBalanceForm() {
        const form = document.getElementById('addBalanceForm');
        if (form) {
            form.reset();
        }
    }

    validateBalanceForm() {
        const employee = document.getElementById('employee').value;
        const leaveType = document.getElementById('leave_type_balance').value;
        const entitled = document.getElementById('entitled').value;
        const validFrom = document.getElementById('valid_from').value;
        const validTo = document.getElementById('valid_to').value;

        if (!employee || !leaveType || !entitled || !validFrom || !validTo) {
            this.showToast('Please fill in all required fields', 'error');
            return false;
        }

        if (parseFloat(entitled) <= 0) {
            this.showToast('Entitled days must be greater than 0', 'error');
            return false;
        }

        if (new Date(validTo) <= new Date(validFrom)) {
            this.showToast('Valid to date must be after valid from date', 'error');
            return false;
        }

        return true;
    }

    validateBalanceDates() {
        const validFrom = document.getElementById('valid_from');
        const validTo = document.getElementById('valid_to');
        
        if (!validFrom || !validTo) return;
        
        const fromDate = validFrom.value;
        const toDate = validTo.value;
        
        if (fromDate && toDate) {
            validTo.min = fromDate;
            
            if (new Date(toDate) <= new Date(fromDate)) {
                validTo.setCustomValidity('Valid to date must be after valid from date');
            } else {
                validTo.setCustomValidity('');
            }
        }
    }

    // Export Functions
    openExportModal() {
        this.openModal('exportModal');
    }

    async startExport() {
        const exportType = document.querySelector('input[name="exportType"]:checked').value;
        const dateFrom = document.getElementById('exportDateFrom').value;
        const dateTo = document.getElementById('exportDateTo').value;
        const includeTimeline = document.getElementById('includeTimeline').checked;

        const params = new URLSearchParams({
            format: exportType,
            include_timeline: includeTimeline
        });

        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);

        try {
            this.showToast('Preparing export...', 'info');
            
            const response = await fetch(`/leave/admin/export/?${params.toString()}`);
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const filename = `leave_requests_export.${exportType}`;
            this.downloadFile(blob, filename);
            
            this.showToast('Export completed successfully', 'success');
            this.closeModal('exportModal');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showToast('Error exporting data', 'error');
        }
    }

    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Dropdown Management
    initializeDropdowns() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }

    toggleDropdown(element) {
        const dropdown = element.closest('.dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        
        // Close other dropdowns
        this.closeAllDropdowns(dropdown);
        
        // Toggle current dropdown
        const isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
        
        if (!isOpen) {
            // Position dropdown
            this.positionDropdown(dropdown, menu);
        }
    }

    closeAllDropdowns(except = null) {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(menu => {
            if (!except || !except.contains(menu)) {
                menu.style.display = 'none';
            }
        });
    }

    positionDropdown(dropdown, menu) {
        const rect = dropdown.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if dropdown goes below viewport
        if (rect.bottom + menuRect.height > viewportHeight) {
            menu.style.top = 'auto';
            menu.style.bottom = '100%';
        } else {
            menu.style.top = '100%';
            menu.style.bottom = 'auto';
        }
    }

    // Table Management
    async refreshTable() {
        // Removed the 'Refreshing table...' toast as requested
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.currentModal = modal;
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const firstFocusable = modal.querySelector('input, button, textarea, select');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
        
        // Animation
        setTimeout(() => {
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'scale(1)';
                content.style.opacity = '1';
            }
        }, 10);
    }

    openModal(modalId) {
        console.log('Opening modal:', modalId); // Debug log
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.log('Modal not found:', modalId); // Debug log
            return;
        }

        console.log('Modal found, showing...'); // Debug log
        this.currentModal = modal;
        modal.style.display = 'flex';
        modal.classList.add('show', 'active');
        document.body.style.overflow = 'hidden';
        
        // Animate modal
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(0.9)';
            content.style.opacity = '0';
        }
        
        setTimeout(() => {
            if (content) {
                content.style.transform = 'scale(1)';
                content.style.opacity = '1';
            }
        }, 10);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Add closing class for zoom out effect
        modal.classList.add('closing');
        const onAnimationEnd = () => {
            modal.style.display = 'none';
            modal.classList.remove('show', 'active', 'closing');
            document.body.style.overflow = '';
            this.currentModal = null;

            // Reset forms
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }

            // Clear dynamic content only for modals that load content via AJAX
            // Skip balanceDetailsContent as it has static form fields
            if (modalId === 'leaveDetailsModal' || modalId === 'approvalModal') {
                const dynamicContent = modal.querySelector('[id$="Content"]');
                if (dynamicContent) {
                    dynamicContent.innerHTML = '';
                }
            }

            modal.removeEventListener('animationend', onAnimationEnd);
        };
        modal.addEventListener('animationend', onAnimationEnd);
    }

    closeCurrentModal() {
        if (this.currentModal) {
            this.closeModal(this.currentModal.id);
        }
    }

    // Utility Functions
    getControlNumber(element) {
        return element.getAttribute('data-control-number') ||
               element.closest('[data-control-number]')?.getAttribute('data-control-number');
    }

    showFormSubmitting(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    showToast(message, type = 'info') {
        const toastContainer = this.getOrCreateToastContainer();
        const toast = this.createToastElement(message, type);
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 4000);
    }

    getOrCreateToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        const config = this.getToastConfig(type);
        
        toast.style.cssText = `
            background: ${config.bgColor};
            color: white;
            border: none;
            border-radius: var(--radius-md);
            padding: var(--space-md);
            margin-bottom: var(--space-sm);
            box-shadow: var(--shadow-lg);
            min-width: 300px;
            animation: toastSlideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${config.icon}" style="font-size: 1.1rem; opacity: 0.9;"></i>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; opacity: 0.7; font-size: 1.2rem; padding: 0; margin-left: 8px;">&times;</button>
        `;
        
        return toast;
    }

    getToastConfig(type) {
        const configs = {
            success: {
                icon: 'check-circle',
                bgColor: 'var(--success-color)'
            },
            error: {
                icon: 'exclamation-circle',
                bgColor: 'var(--error-color)'
            },
            warning: {
                icon: 'exclamation-triangle',
                bgColor: 'var(--warning-color)'
            },
            info: {
                icon: 'info-circle',
                bgColor: 'var(--primary-color)'
            }
        };
        
        return configs[type] || configs.info;
    }

    removeToast(toast) {
        if (!toast.parentNode) return;
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Performance helpers
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }

    // Data validation helpers
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Statistics helpers
    updateStatistics() {
        // Could implement real-time statistics updates
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            // Add animation class for number updates
            stat.classList.add('stat-update');
            setTimeout(() => {
                stat.classList.remove('stat-update');
            }, 500);
        });
    }

    // Accessibility helpers
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Message display helper
    showMessage(message, type = 'info') {
        // Get or create toast container
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Create toast notification with proper styling
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Create toast content with close button
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-content';
        toastContent.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 12px;';
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;
        messageSpan.style.cssText = 'flex: 1;';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.style.cssText = 'background: none; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.onclick = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        };
        
        toastContent.appendChild(messageSpan);
        toastContent.appendChild(closeButton);
        toast.appendChild(toastContent);
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.parentElement.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
        
        // Add hover effect to close button
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
    }

    // Balance Management Methods
    viewBalanceDetails(actionEl) {
        let balanceId = null;
        if (typeof actionEl === 'string') {
            balanceId = actionEl;
        } else if (actionEl && typeof actionEl.getAttribute === 'function') {
            balanceId = actionEl.getAttribute('data-balance-id');
        }
        if (!balanceId) {
            this.showMessage('Invalid balance ID', 'error');
            return;
        }
        fetch(`/leave/balance/details/${balanceId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.populateBalanceModal(data.data);
                    this.openModal('balanceDetailsModal');
                } else {
                    this.showMessage('Failed to load balance details', 'error');
                }
            })
            .catch(error => {
                console.error('Error loading balance details:', error);
                this.showMessage('Failed to load balance details', 'error');
            });
    }

    populateBalanceModal(data) {
        const employeeIdInput = document.getElementById('balance-employee-id');
        const employeeNameInput = document.getElementById('balance-employee-name');
        const leaveTypeInput = document.getElementById('balance-leave-type');
        const entitledInput = document.getElementById('balance-entitled');
        const usedInput = document.getElementById('balance-used');
        const remainingInput = document.getElementById('balance-remaining');
        const validFromInput = document.getElementById('balance-valid-from');
        const validToInput = document.getElementById('balance-valid-to');

        if (employeeIdInput) employeeIdInput.value = data.employee_id || '';
        if (employeeNameInput) employeeNameInput.value = data.employee_name || '';
        if (leaveTypeInput) leaveTypeInput.value = data.leave_type || '';
        if (entitledInput) entitledInput.value = data.entitled || '';
        if (usedInput) usedInput.value = data.used || '';
        if (remainingInput) remainingInput.value = data.remaining || '';
        if (validFromInput) validFromInput.value = data.valid_from || '';
        if (validToInput) validToInput.value = data.valid_to || '';
        
        // Show edit button if user can edit
        const editBtn = document.getElementById('edit-balance-btn');
        const entitledField = document.getElementById('balance-entitled');
        const validFromField = document.getElementById('balance-valid-from');
        const validToField = document.getElementById('balance-valid-to');
        if (data.can_edit && editBtn) {
            editBtn.style.display = 'block';
            editBtn.setAttribute('data-balance-id', data.id);
            // Enable editable fields
            if (entitledField) entitledField.readOnly = false;
            if (validFromField) validFromField.readOnly = false;
            if (validToField) validToField.readOnly = false;
        } else {
            if (editBtn) editBtn.style.display = 'none';
            // Disable editable fields
            if (entitledField) entitledField.readOnly = true;
            if (validFromField) validFromField.readOnly = true;
            if (validToField) validToField.readOnly = true;
        }
    }

    deleteBalance(actionEl) {
        const balanceId = actionEl.getAttribute('data-balance-id');
        
        // Store balance ID for deletion
        const confirmBtn = document.getElementById('confirm-delete-balance-btn');
        if (confirmBtn) {
            confirmBtn.setAttribute('data-balance-id', balanceId);
        }
        
        this.openModal('deleteBalanceModal');
    }

    updateBalance(balanceId) {
        const formData = new FormData();
        formData.append('entitled', document.getElementById('balance-entitled').value);
        formData.append('valid_from', document.getElementById('balance-valid-from').value);
        formData.append('valid_to', document.getElementById('balance-valid-to').value);
        formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

        fetch(`/leave/balance/update/${balanceId}/`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal('balanceDetailsModal');
                this.refreshBalanceTable();
            } else {
                this.showMessage(data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating balance:', error);
            this.showMessage('Failed to update balance', 'error');
        });
    }

    confirmDeleteBalance(balanceId) {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

        fetch(`/leave/balance/delete/${balanceId}/`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeModal('deleteBalanceModal');
                this.refreshBalanceTable();
            } else {
                this.showMessage(data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting balance:', error);
            this.showMessage('Failed to delete balance', 'error');
        });
    }

    handleImportBalance() {
        const fileInput = document.getElementById('balance-files');
        const deleteAllCheckbox = document.getElementById('deleteAllBalances');
        
        if (!fileInput.files.length) {
            this.showMessage('Please select a file to import', 'error');
            return;
        }

        if (deleteAllCheckbox.checked) {
            // Show confirmation modal
            this.openModal('importConfirmModal');
        } else {
            this.processImportBalance();
        }
    }

    confirmImportBalance() {
        this.closeModal('importConfirmModal');
        this.processImportBalance();
    }

    processImportBalance() {
        const fileInput = document.getElementById('balance-files');
        const deleteAllCheckbox = document.getElementById('deleteAllBalances');
        const formData = new FormData();
        
        formData.append('file', fileInput.files[0]);
        formData.append('delete_all', deleteAllCheckbox.checked);
        formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);

        // Show loading state
        const importBtn = document.getElementById('import-balance-btn');
        const originalText = importBtn.innerHTML;
        importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
        importBtn.disabled = true;

        fetch('/leave/balance/import/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showMessage(data.message, 'success');
                if (data.errors && data.errors.length > 0) {
                    console.warn('Import warnings:', data.errors);
                }
                this.closeModal('addBalanceModal');
                this.refreshBalanceTable();
                // Clear file input
                fileInput.value = '';
                deleteAllCheckbox.checked = false;
            } else {
                this.showMessage(data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Error importing balance:', error);
            this.showMessage('Failed to import balance', 'error');
        })
        .finally(() => {
            // Reset button state
            importBtn.innerHTML = originalText;
            importBtn.disabled = false;
        });
    }

    refreshBalanceTable() {
        // Reload balance table via AJAX
        const balanceSearch = document.getElementById('balanceSearchInput').value || '';
        this.performBalanceSearch(balanceSearch);
    }

    // Balance Management Initialization
    initializeBalanceManagement() {
        // Initialize balance table listeners
        this.setupBalanceTableListeners();
        
        // Edit balance button
        const editBalanceBtn = document.getElementById('edit-balance-btn');
        if (editBalanceBtn) {
            editBalanceBtn.addEventListener('click', (e) => {
                this.updateBalance(e.target.getAttribute('data-balance-id'));
            });
        }

        // Confirm delete balance button
        const confirmDeleteBtn = document.getElementById('confirm-delete-balance-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', (e) => {
                this.confirmDeleteBalance(e.target.getAttribute('data-balance-id'));
            });
        }

        // Import balance button
        const importBalanceBtn = document.getElementById('import-balance-btn');
        if (importBalanceBtn) {
            importBalanceBtn.addEventListener('click', () => {
                this.handleImportBalance();
            });
        }

        // Confirm import button
        const confirmImportBtn = document.getElementById('confirm-import-btn');
        if (confirmImportBtn) {
            confirmImportBtn.addEventListener('click', () => {
                this.confirmImportBalance();
            });
        }
    }

    // Setup event listeners for balance table rows
    setupBalanceTableListeners() {
        // View balance buttons
        document.querySelectorAll('[data-action="view-balance-details"]').forEach(button => {
            button.addEventListener('click', (e) => {
                this.viewBalanceDetails(e.currentTarget);
            });
        });

        // Delete balance buttons
        document.querySelectorAll('[data-action="delete-balance"]').forEach(button => {
            button.addEventListener('click', (e) => {
                this.deleteBalanceConfirm(e.currentTarget);
            });
        });
    }
}

// CSS for admin-specific animations and styles
const adminStyle = document.createElement('style');
adminStyle.textContent = `
    @keyframes toastSlideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .bulk-actions {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface);
        border: 2px solid var(--primary-color);
        border-radius: var(--radius-lg);
        padding: var(--space-md) var(--space-lg);
        box-shadow: var(--shadow-xl);
        z-index: 1000;
        animation: slideUp 0.3s ease-out;
    }

    .bulk-actions-content {
        display: flex;
        align-items: center;
        gap: var(--space-lg);
    }

    .bulk-action-buttons {
        display: flex;
        gap: var(--space-sm);
    }

    .dropdown {
        position: relative;
        display: inline-block;
    }

    .dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        min-width: 150px;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        color: var(--text-primary);
        cursor: pointer;
        transition: background-color var(--transition-fast);
    }

    .dropdown-item:hover {
        background: var(--surface-hover);
    }

    .dropdown-item.text-error {
        color: var(--error-color);
    }

    .dropdown-divider {
        height: 1px;
        background: var(--border-color);
        margin: var(--space-xs) 0;
    }

    .export-options {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
        margin-bottom: var(--space-lg);
    }

    .export-option {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-md);
        border: 2px solid var(--border-color);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
    }

    .export-option:hover {
        border-color: var(--primary-color);
        background: var(--surface-hover);
    }

    .export-option input[type="radio"]:checked + label {
        color: var(--primary-color);
        font-weight: 600;
    }

    .export-option input[type="radio"] {
        margin: 0;
    }

    .export-option label {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        cursor: pointer;
        flex: 1;
        margin: 0;
    }

    .sort-asc::after {
        content: ' ↑';
        color: var(--primary-color);
    }

    .sort-desc::after {
        content: ' ↓';
        color: var(--primary-color);
    }

    .stat-update {
        animation: pulse 0.5s ease-in-out;
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .form-row-4col {
        grid-template-columns: repeat(4, 1fr);
    }

    @media (max-width: 1024px) {
        .form-row-4col {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .form-row-4col {
            grid-template-columns: 1fr;
        }
        
        .bulk-actions {
            left: var(--space-md);
            right: var(--space-md);
            transform: none;
        }
        
        .bulk-actions-content {
            flex-direction: column;
            gap: var(--space-md);
        }
        
        .bulk-action-buttons {
            width: 100%;
            justify-content: center;
        }
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    .chart-container.slider-out {
        animation: chartSlideOut 0.35s forwards;
    }

    .chart-container.slider-in {
        animation: chartSlideIn 0.4s forwards;
    }

    @keyframes chartSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-40px);
        }
    }

    @keyframes chartSlideIn {
        from {
            opacity: 0;
            transform: translateX(40px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(adminStyle);

// Global functions for backward compatibility
window.LeaveAdmin = {
    viewDetails: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveAdminInterface?.viewLeaveDetails(element);
    },
    quickApprove: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveAdminInterface?.quickApprove(element);
    },
    quickDisapprove: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveAdminInterface?.quickDisapprove(element);
    },
    exportRequest: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveAdminInterface?.exportRequest(element);
    },

    // Balance Management Methods (delegated to interface)
    viewBalanceDetails: (actionEl) => {
        window.leaveAdminInterface?.viewBalanceDetails(actionEl);
    },
    deleteBalance: (actionEl) => {
        window.leaveAdminInterface?.deleteBalanceConfirm(actionEl.getAttribute('data-balance-id'));
    }
};

// ================================
// ADMIN LEAVE CHART FUNCTIONALITY
// ================================

// Admin Leave Dashboard Chart functionality
let adminLeaveChart = null;
let currentPeriod = 'month';
let currentChartType = 'line';

function initializeAdminChart() {
    const ctx = document.getElementById('adminLeaveChart');
    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }
    
    // Destroy any existing chart instances on this canvas
    if (adminLeaveChart) {
        adminLeaveChart.destroy();
        adminLeaveChart = null;
    }
    if (typeof approvalChart !== 'undefined' && approvalChart) {
        approvalChart.destroy();
        approvalChart = null;
    }
    
    // Also check if Chart.js has any chart instances on this canvas
    Chart.getChart(ctx)?.destroy();
    
    // Show loading state
    showChartLoading(true);
    
    // Load initial data
    loadChartData(currentPeriod, currentChartType);
}

function setupChartControls() {
    // Period filter buttons
    const periodButtons = document.querySelectorAll('.period-filter');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            periodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update period and reload chart
            currentPeriod = this.dataset.period;
            loadChartData(currentPeriod, currentChartType);
        });
    });
    
    // Chart type filter buttons
    const typeButtons = document.querySelectorAll('.chart-type-filter');
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            typeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update chart type and reload chart
            currentChartType = this.dataset.type;
            loadChartData(currentPeriod, currentChartType);
        });
    });
}

function loadChartData(period, chartType) {
    showChartLoading(true);
    
    fetch(`/leave/ajax/admin-chart-data/?period=${period}`, { credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateChart(data.chart_data, data.period_label, chartType, period);
                updateChartTitle(data.period_label);
            } else {
                console.error('Chart data error:', data.error);
                showChartError(data.error);
            }
        })
        .catch(error => {
            console.error('Chart loading error:', error);
            showChartError('Failed to load chart data');
        })
        .finally(() => {
            showChartLoading(false);
        });
}

function updateChart(chartData, periodLabel, chartType, period) {
    const ctx = document.getElementById('adminLeaveChart');
    
    // Destroy all existing chart instances that might be using this canvas
    if (adminLeaveChart) {
        adminLeaveChart.destroy();
        adminLeaveChart = null;
    }
    if (typeof approvalChart !== 'undefined' && approvalChart) {
        approvalChart.destroy();
        approvalChart = null;
    }
    
    // Also check if Chart.js has any chart instances on this canvas
    Chart.getChart(ctx)?.destroy();
    
    // Configure chart options based on type
    const chartConfig = {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: `Leave Requests - ${periodLabel}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 6,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: getXAxisLabel(period),
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Number of Requests',
                        font: {
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            elements: {
                line: {
                    tension: chartType === 'line' ? 0.4 : 0
                },
                point: {
                    radius: chartType === 'line' ? 4 : 0,
                    hoverRadius: chartType === 'line' ? 6 : 0
                }
            },
            hover: {
                mode: 'index',
                intersect: false
            }
        }
    };
    
    // Adjust configuration for bar charts
    if (chartType === 'bar') {
        chartConfig.options.scales.x.stacked = false;
        chartConfig.options.scales.y.stacked = false;
        
        // Update dataset styles for bar chart
        chartData.datasets.forEach(dataset => {
            dataset.borderWidth = 1;
            dataset.borderRadius = 4;
            dataset.borderSkipped = false;
        });
    }
    
    // Create new chart
    adminLeaveChart = new Chart(ctx, chartConfig);
}

function getXAxisLabel(period) {
    switch(period) {
        case 'month':
            return 'Days';
        case 'quarter':
            return 'Months';
        case 'year':
            return 'Months';
        default:
            return 'Time';
    }
}

function updateChartTitle(periodLabel) {
    const titleElement = document.querySelector('.chart-title');
    if (titleElement) {
        titleElement.textContent = `Leave Requests Overview - ${periodLabel}`;
    }
}

function showChartLoading(show) {
    const loadingElement = document.querySelector('.chart-loading');
    const chartContainer = document.querySelector('.chart-container');
    
    if (loadingElement && chartContainer) {
        if (show) {
            loadingElement.style.display = 'flex';
            chartContainer.style.opacity = '0.3';
        } else {
            loadingElement.style.display = 'none';
            chartContainer.style.opacity = '1';
        }
    }
}

function showChartError(message) {
    const errorElement = document.querySelector('.chart-error');
    const chartContainer = document.querySelector('.chart-container');
    
    if (errorElement) {
        errorElement.textContent = message || 'Failed to load chart data';
        errorElement.style.display = 'block';
        if (chartContainer) {
            chartContainer.style.display = 'none';
        }
    }
}

// Export functions for external use
window.AdminLeaveChart = {
    loadChartData,
    updateChart,
    showChartLoading,
    showChartError
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.leaveAdminInterface = new LeaveAdminInterface();
    console.log('Leave Admin Interface initialized');
    
    // Initialize chart functionality
    if (document.getElementById('adminLeaveChart')) {
        setTimeout(() => {
            initializeAdminChart();
            setupChartControls();
            setupApprovalChartControls();
            loadApprovalChartData(approvalCurrentPeriod, approvalCurrentType);
        }, 100);
    }
});

// Approval Chart AJAX and Slider Effect
let approvalChart = null;
let approvalCurrentPeriod = 'month';
let approvalCurrentType = 'line';

function loadApprovalChartData(period, chartType) {
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.classList.add('slider-out');
    }
    fetch(`/leave/ajax/approval-chart-data/?period=${period}`, { credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.line_chart) {
                setTimeout(() => {
                    updateApprovalChart(data.line_chart, chartType, period);
                    if (chartContainer) {
                        chartContainer.classList.remove('slider-out');
                        chartContainer.classList.add('slider-in');
                        setTimeout(() => chartContainer.classList.remove('slider-in'), 400);
                    }
                }, 350);
            }
        });
}

function updateApprovalChart(chartData, chartType, period) {
    const ctx = document.getElementById('adminLeaveChart');
    if (!ctx) return;
    
    // Destroy both chart instances that might be using this canvas
    if (approvalChart) {
        approvalChart.destroy();
        approvalChart = null;
    }
    if (adminLeaveChart) {
        adminLeaveChart.destroy();
        adminLeaveChart = null;
    }
    
    // Also check if Chart.js has any chart instances on this canvas
    Chart.getChart(ctx)?.destroy();
    
    // For bar chart, ensure each dataset uses its own strong color (not lighter)
    if (chartType === 'bar' && chartData.datasets && chartData.datasets.length > 0) {
        chartData.datasets.forEach(ds => {
            // If the dataset has a borderColor, use it as the backgroundColor for bold bars
            if (ds.borderColor) {
                ds.backgroundColor = ds.borderColor;
            }
            // If the dataset has an array of borderColor, use it for backgroundColor
            if (Array.isArray(ds.borderColor)) {
                ds.backgroundColor = ds.borderColor;
            }
            // If the dataset has a backgroundColor array, ensure it's not transparent/lighter
            if (Array.isArray(ds.backgroundColor)) {
                ds.backgroundColor = ds.backgroundColor.map(c => c.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)'));
            } else if (typeof ds.backgroundColor === 'string' && ds.backgroundColor.includes('rgba')) {
                ds.backgroundColor = ds.backgroundColor.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)');
            }
        });
    }
    approvalChart = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { display: true, grid: { color: 'rgba(0,0,0,0.07)' } },
                y: { display: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.07)' } }
            }
        }
    });
}

// Bind filter buttons for approval chart
function setupApprovalChartControls() {
    // Chart filter slider logic (matches style.css and admin-finance.html)
    const chartFilters = document.querySelector('.chart-filters');
    const periodBtns = chartFilters ? chartFilters.querySelectorAll('.filter-btn') : [];
    function updateSlider(idx) {
        if (!chartFilters) return;
        chartFilters.classList.remove('slide-0', 'slide-1', 'slide-2');
        chartFilters.classList.add('slide-' + idx);
        chartFilters.classList.add('has-active');
    }
    periodBtns.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('active')) return;
            periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            approvalCurrentPeriod = this.dataset.period;
            updateSlider(idx);
            loadApprovalChartData(approvalCurrentPeriod, approvalCurrentType);
        });
        // Set initial slider position
        if (btn.classList.contains('active')) updateSlider(idx);
    });

    // Chart type slider logic (apply slider effect to chart-type-filters)
    const chartTypeFilters = document.querySelector('.chart-type-filters');
    const typeBtns = chartTypeFilters ? chartTypeFilters.querySelectorAll('.chart-type-btn') : [];
    function updateTypeSlider(idx) {
        if (!chartTypeFilters) return;
        chartTypeFilters.classList.remove('slide-0', 'slide-1', 'slide-2');
        chartTypeFilters.classList.add('slide-' + idx);
        chartTypeFilters.classList.add('has-active');
    }
    typeBtns.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('active')) return;
            typeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            approvalCurrentType = this.dataset.type;
            updateTypeSlider(idx);
            loadApprovalChartData(approvalCurrentPeriod, approvalCurrentType);
        });
        // Set initial slider position
        if (btn.classList.contains('active')) updateTypeSlider(idx);
    });
}

// Slider effect CSS (inject if not present)
(function() {
    if (!document.getElementById('approval-slider-style')) {
        const style = document.createElement('style');
        style.id = 'approval-slider-style';
        style.innerHTML = `
        .chart-container.slider-out { animation: chartSlideOut 0.35s forwards; }
        .chart-container.slider-in { animation: chartSlideIn 0.4s forwards; }
        @keyframes chartSlideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-40px); } }
        @keyframes chartSlideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        `;
        document.head.appendChild(style);
    }
})();