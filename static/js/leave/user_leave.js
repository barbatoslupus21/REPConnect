/**
 * Leave Management - User Interface JavaScript
 * Handles employee and approver functionalities
 */

class LeaveUserInterface {
    constructor() {
        this.currentModal = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeDateInputs();
        this.initializeTabs();
        this.setupFormValidation();
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
    }

    handleClick(e) {
        const action = e.target.getAttribute('data-action') || 
                      e.target.closest('[data-action]')?.getAttribute('data-action');
        
        if (!action) return;

        e.preventDefault();
        
        switch (action) {
            case 'apply-leave':
                this.openApplyLeaveModal();
                break;
            case 'view-details':
                this.viewLeaveDetails(e.target);
                break;
            case 'cancel-leave':
                this.cancelLeave(e.target);
                break;
            case 'open-approval':
                this.openApprovalModal(e.target);
                break;
            case 'process-approval':
                this.processApproval(e.target);
                break;
            case 'scroll-to-balances':
                this.scrollToBalances();
                break;
            case 'refresh-data':
                this.refreshData();
                break;
            case 'close-modal':
                this.closeModal(e.target.getAttribute('data-modal'));
                break;
        }
    }

    handleChange(e) {
        const element = e.target;
        
        if (element.id === 'id_leave_type') {
            this.checkLeaveBalance();
        }
        
        if (element.id === 'id_date_from' || element.id === 'id_date_to') {
            this.calculateDays();
            this.validateDates();
        }
    }

    handleSubmit(e) {
        if (e.target.id === 'applyLeaveForm') {
            if (!this.validateLeaveForm()) {
                e.preventDefault();
                return false;
            }
            this.showFormSubmitting(e.target);
        }
    }

    handleKeyboard(e) {
        // Escape key closes modals
        if (e.key === 'Escape' && this.currentModal) {
            this.closeCurrentModal();
        }
        
        // Ctrl/Cmd + N opens apply leave modal
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openApplyLeaveModal();
        }
    }

    initializeDateInputs() {
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = document.querySelectorAll('#applyLeaveModal input[type="date"]');
        
        dateInputs.forEach(input => {
            input.min = today;
        });
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                this.switchTab(target);
            });
        });
    }

    switchTab(targetId) {
        // Remove active from all tabs and panels
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Activate selected tab and panel
        const activeTab = document.querySelector(`[data-target="${targetId}"]`);
        const activePanel = document.getElementById(targetId);
        
        if (activeTab) activeTab.classList.add('active');
        if (activePanel) {
            activePanel.classList.add('active');
            this.onTabActivated(targetId);
        }
    }

    onTabActivated(tabId) {
        switch (tabId) {
            case 'my-requests':
                this.refreshMyRequests();
                break;
            case 'approvals':
                this.refreshApprovals();
                break;
        }
    }

    // Leave Application Functions
    openApplyLeaveModal() {
        this.resetApplyForm();
        this.openModal('applyLeaveModal');
    }

    resetApplyForm() {
        const form = document.getElementById('applyLeaveForm');
        if (form) {
            form.reset();
            
            // Reset displays
            const balanceDisplay = document.getElementById('balanceDisplay');
            const daysDisplay = document.getElementById('daysRequested');
            
            if (balanceDisplay) {
                balanceDisplay.innerHTML = '<span class="balance-text">Select leave type to view balance</span>';
            }
            
            if (daysDisplay) {
                daysDisplay.innerHTML = '<span class="days-text">Select dates to calculate</span>';
            }
        }
    }

    async checkLeaveBalance() {
        const leaveTypeSelect = document.getElementById('id_leave_type');
        const balanceDisplay = document.getElementById('balanceDisplay');
        
        if (!leaveTypeSelect || !balanceDisplay) return;
        
        const leaveTypeId = leaveTypeSelect.value;
        
        if (!leaveTypeId) {
            balanceDisplay.innerHTML = '<span class="balance-text">Select leave type to view balance</span>';
            return;
        }

        balanceDisplay.innerHTML = '<span class="balance-text"><i class="fas fa-spinner fa-spin"></i> Loading balance...</span>';

        try {
            const response = await fetch(`/leave/ajax/balance/?leave_type_id=${leaveTypeId}`);
            const data = await response.json();
            
            if (data.remaining !== null) {
                balanceDisplay.innerHTML = `
                    <div class="balance-info">
                        <span class="balance-remaining">${data.remaining} days remaining</span>
                        <small class="balance-period">${data.valid_period}</small>
                    </div>
                `;
            } else {
                balanceDisplay.innerHTML = '<span class="balance-text text-muted">No active balance found</span>';
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
            balanceDisplay.innerHTML = '<span class="balance-text text-error">Error loading balance</span>';
        }
    }

    calculateDays() {
        const dateFromInput = document.getElementById('id_date_from');
        const dateToInput = document.getElementById('id_date_to');
        const daysDisplay = document.getElementById('daysRequested');
        
        if (!dateFromInput || !dateToInput || !daysDisplay) return;
        
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;
        
        if (!dateFrom || !dateTo) {
            daysDisplay.innerHTML = '<span class="days-text">Select dates to calculate</span>';
            return;
        }
        
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        
        if (toDate < fromDate) {
            daysDisplay.innerHTML = '<span class="days-text text-error">End date cannot be before start date</span>';
            return;
        }
        
        const timeDiff = toDate.getTime() - fromDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        
        daysDisplay.innerHTML = `
            <div class="days-info">
                <span class="days-count">${daysDiff} day${daysDiff !== 1 ? 's' : ''}</span>
                <small class="days-range">${this.formatDate(fromDate)} to ${this.formatDate(toDate)}</small>
            </div>
        `;
    }

    validateDates() {
        const dateFromInput = document.getElementById('id_date_from');
        const dateToInput = document.getElementById('id_date_to');
        
        if (!dateFromInput || !dateToInput) return;
        
        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;
        
        if (dateFrom && dateTo) {
            dateToInput.min = dateFrom;
            
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            
            if (toDate < fromDate) {
                dateToInput.setCustomValidity('End date cannot be before start date');
            } else {
                dateToInput.setCustomValidity('');
            }
        }
    }

    validateLeaveForm() {
        const leaveType = document.getElementById('id_leave_type').value;
        const dateFrom = document.getElementById('id_date_from').value;
        const dateTo = document.getElementById('id_date_to').value;
        const reason = document.getElementById('id_reason').value.trim();

        if (!leaveType) {
            this.showToast('Please select a leave type', 'error');
            return false;
        }

        if (!dateFrom || !dateTo) {
            this.showToast('Please select both start and end dates', 'error');
            return false;
        }

        if (!reason) {
            this.showToast('Please provide a reason for your leave', 'error');
            return false;
        }

        if (new Date(dateTo) < new Date(dateFrom)) {
            this.showToast('End date cannot be before start date', 'error');
            return false;
        }

        if (new Date(dateFrom) < new Date()) {
            this.showToast('Cannot apply for leave in the past', 'error');
            return false;
        }

        return this.validateFileUpload();
    }

    validateFileUpload() {
        const fileInput = document.getElementById('id_attachment');
        if (!fileInput || fileInput.files.length === 0) return true;
        
        const file = fileInput.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (file.size > maxSize) {
            this.showToast('File size must be less than 5MB', 'error');
            return false;
        }

        const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showToast('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG', 'error');
            return false;
        }

        return true;
    }

    setupFormValidation() {
        const form = document.getElementById('applyLeaveForm');
        if (!form) return;

        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        switch (field.id) {
            case 'id_leave_type':
                if (!value) {
                    isValid = false;
                    message = 'Please select a leave type';
                }
                break;
            case 'id_date_from':
            case 'id_date_to':
                if (!value) {
                    isValid = false;
                    message = 'Please select a date';
                } else if (new Date(value) < new Date()) {
                    isValid = false;
                    message = 'Date cannot be in the past';
                }
                break;
            case 'id_reason':
                if (!value) {
                    isValid = false;
                    message = 'Please provide a reason';
                } else if (value.length < 10) {
                    isValid = false;
                    message = 'Reason should be at least 10 characters';
                }
                break;
        }

        this.setFieldValidation(field, isValid, message);
        return isValid;
    }

    setFieldValidation(field, isValid, message) {
        const parent = field.closest('.form-group');
        if (!parent) return;

        // Remove existing validation
        parent.classList.remove('field-valid', 'field-invalid');
        const existingMessage = parent.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        if (!isValid && message) {
            parent.classList.add('field-invalid');
            const messageElement = document.createElement('small');
            messageElement.className = 'validation-message text-error';
            messageElement.textContent = message;
            parent.appendChild(messageElement);
        } else if (field.value.trim()) {
            parent.classList.add('field-valid');
        }
    }

    showFormSubmitting(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        }
    }

    // Leave Details and Actions
    async viewLeaveDetails(element) {
        const controlNumber = element.getAttribute('data-control-number') ||
                            element.closest('[data-control-number]')?.getAttribute('data-control-number');
        
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

    async cancelLeave(element) {
        const controlNumber = element.getAttribute('data-control-number') ||
                            element.closest('[data-control-number]')?.getAttribute('data-control-number');
        
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
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error cancelling leave:', error);
            this.showToast('Error cancelling leave request', 'error');
        }
    }

    // Approval Functions
    async openApprovalModal(element) {
        const controlNumber = element.getAttribute('data-control-number') ||
                            element.closest('[data-control-number]')?.getAttribute('data-control-number');
        
        if (!controlNumber) return;

        try {
            const response = await fetch(`/leave/detail/${controlNumber}/`);
            if (!response.ok) throw new Error('Failed to fetch details');
            
            const html = await response.text();
            const approvalContent = `
                ${html}
                <div class="approval-form">
                    <div class="form-group">
                        <label for="approvalComments">Comments (Optional)</label>
                        <textarea id="approvalComments" class="form-control" rows="3" placeholder="Add comments for your decision..."></textarea>
                    </div>
                </div>
            `;
            
            document.getElementById('approvalContent').innerHTML = approvalContent;
            document.getElementById('approvalModal').setAttribute('data-control-number', controlNumber);
            this.openModal('approvalModal');
        } catch (error) {
            console.error('Error loading approval details:', error);
            this.showToast('Error loading request details', 'error');
        }
    }

    async processApproval(element) {
        const action = element.getAttribute('data-approval-action');
        const modal = document.getElementById('approvalModal');
        const controlNumber = modal.getAttribute('data-control-number');
        const commentsField = document.getElementById('approvalComments');
        const comments = commentsField ? commentsField.value : '';
        
        if (!controlNumber || !action) {
            this.showToast('Error: Missing required information', 'error');
            return;
        }

        if (!['approve', 'disapprove'].includes(action)) {
            this.showToast('Error: Invalid action', 'error');
            return;
        }

        try {
            const response = await fetch(`/leave/process/${controlNumber}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCookie('csrftoken'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    comments: comments
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message, 'success');
                this.closeModal('approvalModal');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error processing approval:', error);
            this.showToast('Error processing request', 'error');
        }
    }

    // Data Refresh Functions
    async refreshMyRequests() {
        // Could implement AJAX refresh of requests table
        console.log('Refreshing my requests...');
    }

    async refreshApprovals() {
        // Could implement AJAX refresh of approvals table
        console.log('Refreshing approvals...');
    }

    async refreshData() {
        this.showToast('Refreshing data...', 'info');
        
        // Simple page reload for now, could be enhanced with AJAX
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    scrollToBalances() {
        const balancesSection = document.querySelector('.balance-cards-grid');
        if (balancesSection) {
            balancesSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
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
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
            modal.querySelector('.modal-content').style.opacity = '1';
        }, 10);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentModal = null;
        
        // Reset modal content if needed
        if (modalId === 'applyLeaveModal') {
            this.resetApplyForm();
        }
        
        // Clear dynamic content
        const dynamicContent = modal.querySelector('[id$="Content"]');
        if (dynamicContent && modalId !== 'applyLeaveModal') {
            dynamicContent.innerHTML = '';
        }
    }

    closeCurrentModal() {
        if (this.currentModal) {
            this.closeModal(this.currentModal.id);
        }
    }

    // Utility Functions
    formatDate(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
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

    // Animation helpers
    animateElement(element, animationClass = 'animate-fadeIn') {
        element.classList.add(animationClass);
        
        element.addEventListener('animationend', () => {
            element.classList.remove(animationClass);
        }, { once: true });
    }

    // Loading states
    showLoading(element, text = 'Loading...') {
        const originalContent = element.innerHTML;
        element.setAttribute('data-original-content', originalContent);
        element.disabled = true;
        element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    hideLoading(element) {
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
            element.innerHTML = originalContent;
            element.removeAttribute('data-original-content');
        }
        element.disabled = false;
    }

    // Error handling
    handleError(error, context = 'operation') {
        console.error(`Error in ${context}:`, error);
        
        let message = `An error occurred during ${context}`;
        
        if (error.message) {
            message = error.message;
        } else if (typeof error === 'string') {
            message = error;
        }
        
        this.showToast(message, 'error');
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

    // Performance optimization
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
}

// CSS for animations and toast (since we can't inline CSS)
const style = document.createElement('style');
style.textContent = `
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

    .animate-fadeIn {
        animation: fadeIn 0.5s ease-in-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .modal-content {
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s ease;
    }

    .modal.active .modal-content {
        transform: scale(1);
        opacity: 1;
    }

    .field-valid input,
    .field-valid select,
    .field-valid textarea {
        border-color: var(--success-color);
    }

    .field-invalid input,
    .field-invalid select,
    .field-invalid textarea {
        border-color: var(--error-color);
    }

    .validation-message {
        margin-top: 4px;
        font-size: var(--font-size-xs);
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

    .toast-container {
        position: fixed;
        top: var(--space-lg);
        right: var(--space-lg);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: var(--space-sm);
    }

    @media (max-width: 768px) {
        .toast-container {
            left: var(--space-md);
            right: var(--space-md);
            top: var(--space-md);
        }
        
        .toast {
            min-width: auto !important;
        }
    }
`;
document.head.appendChild(style);

// Global functions for backward compatibility and external access
window.LeaveUser = {
    openApplyModal: () => window.leaveUserInterface?.openApplyLeaveModal(),
    viewDetails: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveUserInterface?.viewLeaveDetails(element);
    },
    cancelLeave: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveUserInterface?.cancelLeave(element);
    },
    openApproval: (controlNumber) => {
        const element = document.createElement('div');
        element.setAttribute('data-control-number', controlNumber);
        window.leaveUserInterface?.openApprovalModal(element);
    },
    processApproval: (action) => {
        const element = document.createElement('div');
        element.setAttribute('data-approval-action', action);
        window.leaveUserInterface?.processApproval(element);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.leaveUserInterface = new LeaveUserInterface();
    console.log('Leave User Interface initialized');
});