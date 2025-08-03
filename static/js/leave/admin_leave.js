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
    }

    bindEvents() {
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
        const action = e.target.getAttribute('data-action') || 
                      e.target.closest('[data-action]')?.getAttribute('data-action');
        
        if (!action) return;

        e.preventDefault();
        
        switch (action) {
            case 'view-details':
                this.viewLeaveDetails(e.target);
                break;
            case 'view-timeline':
                this.viewTimeline(e.target);
                break;
            case 'quick-approve':
                this.quickApprove(e.target);
                break;
            case 'quick-disapprove':
                this.quickDisapprove(e.target);
                break;
            case 'cancel-request':
                this.cancelRequest(e.target);
                break;
            case 'export-request':
                this.exportRequest(e.target);
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
            case 'dropdown-toggle':
                this.toggleDropdown(e.target);
                break;
            case 'close-modal':
                this.closeModal(e.target.getAttribute('data-modal'));
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
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.performLiveSearch(e.target.value);
            }, 300));
        }
    }

    performLiveSearch(query) {
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
            const response = await fetch(`/leave/detail/${controlNumber}/`);
            if (!response.ok) throw new Error('Failed to fetch details');
            
            const html = await response.text();
            document.getElementById('leaveDetailsContent').innerHTML = html;
            this.openModal('leaveDetailsModal');
        } catch (error) {
            console.error('Error loading leave details:', error);
            this.showToast('Error loading leave details', 'error');
        }
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
        this.showToast('Refreshing table...', 'info');
        
        try {
            // For now, just reload the page
            // In a more advanced implementation, this could be an AJAX refresh
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Error refreshing table:', error);
            this.showToast('Error refreshing table', 'error');
        }
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

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentModal = null;
        
        // Reset forms
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // Clear dynamic content
        const dynamicContent = modal.querySelector('[id$="Content"]');
        if (dynamicContent) {
            dynamicContent.innerHTML = '';
        }
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
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.leaveAdminInterface = new LeaveAdminInterface();
    console.log('Leave Admin Interface initialized');
});