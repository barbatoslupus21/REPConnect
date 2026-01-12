/**
 * Leave Management - User Interface JavaScript
 * Handles employee and approver functionalities
 */

class LeaveUserInterface {
    constructor() {
        this.currentModal = null;
        this.currentDate = new Date();
        this.leaveData = [];
        this.holidays = [];
        this.sundayExceptions = [];
        this.init();
    }

    init() {
        this.loadHolidaysAndExceptions();
        this.bindEvents();
        this.initializeDateInputs();
        this.initializeTabs();
        this.setupFormValidation();
        this.initializeCalendar();
        this.initializeCharts();
        this.initializeHoursEditor();
        this.initializeSearch();
    }

    async loadHolidaysAndExceptions() {
        try {
            console.log('Loading holidays and Sunday exceptions...');
            const response = await fetch('/leave/api/holidays-and-exceptions/');
            const data = await response.json();
            this.holidays = data.holidays || [];
            this.sundayExceptions = data.sunday_exceptions || [];
            console.log('Loaded holidays:', this.holidays);
            console.log('Loaded Sunday exceptions:', this.sundayExceptions);
        } catch (error) {
            console.error('Error loading holidays and exceptions:', error);
            this.holidays = [];
            this.sundayExceptions = [];
        }
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
        // Always get the closest element with data-action, so clicking <i> inside button works
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        const action = actionEl.getAttribute('data-action');
        e.preventDefault();
        switch (action) {
            case 'apply-leave':
                this.openApplyLeaveModal();
                break;
            case 'view-details':
                this.viewLeaveDetails(actionEl);
                break;
            case 'cancel-leave':
                this.cancelLeave(actionEl);
                break;
            case 'open-approval':
                this.openApprovalModal(actionEl);
                break;
            case 'process-approval':
                this.processApproval(actionEl);
                break;
            case 'scroll-to-balances':
                this.scrollToBalances();
                break;
            case 'refresh-data':
                this.refreshData();
                break;
            case 'close-modal':
                this.closeModal(actionEl.getAttribute('data-modal'));
                break;
            case 'view-leave-history':
                this.viewLeaveHistory(actionEl);
                break;
        }
    }

    handleChange(e) {
        const element = e.target;
        
        if (element.id === 'id_leave_type') {
            this.checkLeaveBalance();
        }

        if (element.id === 'id_date_from') {
            // Set min for Date To
            const dateTo = document.getElementById('id_date_to');
            if (dateTo) {
                dateTo.min = element.value;
                // If Date To is before Date From, reset it
                if (dateTo.value && dateTo.value < element.value) {
                    dateTo.value = element.value;
                }
            }
        }

        if (element.id === 'id_date_from' || element.id === 'id_date_to') {
            this.calculateDays();
            this.validateDates();
        }
    }

    handleSubmit(e) {
        console.log('Form submit event triggered, target:', e.target.id);
        
        if (e.target.id === 'applyLeaveForm') {
            e.preventDefault(); // Always prevent default first
            console.log('Apply leave form submission detected');
            
            if (!this.validateLeaveForm()) {
                console.log('Form validation failed, stopping submission');
                return false;
            }
            
            console.log('Form validation passed, checking approver...');
            // Check for approver before submitting
            this.checkApproverAndSubmit(e.target);
        }
    }

    async checkApproverAndSubmit(form) {
        try {
            console.log('Checking approver status...');
            
            // Show loading state
            this.showFormSubmitting(form);
            
            // Check if user has an approver
            const response = await fetch('/leave/api/check-approver/');
            const data = await response.json();
            
            console.log('Approver check response:', data);
            
            if (!data.has_approver) {
                console.log('No approver found, showing modal');
                // Reset button state
                this.resetFormSubmitButton(form);
                // Show no approver modal
                this.openModal('noApproverModal');
                return;
            }
            
            console.log('Approver found, proceeding with form submission');
            // User has approver, submit the form
            this.submitLeaveForm(form);
            
        } catch (error) {
            console.error('Error checking approver:', error);
            // Reset button state
            this.resetFormSubmitButton(form);
            this.showToast('Error checking approver status. Please try again.', 'error');
        }
    }

    async submitLeaveForm(form) {
        try {
            console.log('Starting form submission...');
            
            // Set hrs_requested value before submission
            const hrsCountElement = document.getElementById('hrsCount');
            const hrsRequestedInput = document.getElementById('id_hrs_requested');
            if (hrsCountElement && hrsRequestedInput) {
                // Extract numeric value from hrsCountElement.textContent
                const match = hrsCountElement.textContent.match(/([\d.]+)/);
                hrsRequestedInput.value = match ? parseFloat(match[1]) : 0;
                console.log('Set hrs_requested to:', hrsRequestedInput.value);
            }
            
            const formData = new FormData(form);
            console.log('Form data prepared, submitting to:', form.action);
            
            // Log form data for debugging
            console.log('=== FORM SUBMISSION DEBUG ===');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }
            console.log('=== END FORM DEBUG ===');
            
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            console.log('Response status:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('Response is OK, checking content type...');
                // Check if it's a JSON response
                const contentType = response.headers.get('content-type');
                console.log('Content type:', contentType);
                
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    console.log('JSON response received:', data);
                    
                    if (data.success) {
                        console.log('Success response, showing toast and reloading...');
                        this.showToast(data.message || 'Leave request submitted successfully!', 'success');
                        this.closeCurrentModal();
                        form.reset();
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        console.log('Error response:', data);
                        
                        // Handle detailed error messages
                        if (data.error_list && data.error_list.length > 0) {
                            const errorMessage = data.message + '\n• ' + data.error_list.join('\n• ');
                            this.showToast(errorMessage, 'error');
                            console.error('Detailed form errors:', data.errors);
                            console.error('Error list:', data.error_list);
                        } else {
                            this.showToast(data.message || 'Error submitting leave request', 'error');
                            if (data.errors) {
                                console.error('Form errors:', data.errors);
                            }
                        }
                    }
                } else {
                    console.log('Non-JSON response, treating as redirect...');
                    // Handle redirect response (non-AJAX submission)
                    this.showToast('Leave request submitted successfully!', 'success');
                    this.closeCurrentModal();
                    form.reset();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            } else {
                console.error('Response not OK:', response.status, response.statusText);
                const responseText = await response.text();
                console.error('Response body:', responseText);
                this.showToast('Error submitting leave request. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            this.showToast('Error submitting leave request. Please try again.', 'error');
        } finally {
            this.resetFormSubmitButton(form);
        }
    }

    resetFormSubmitButton(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
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
        // Allow users to select any date (including past dates)
        // Removed the min date restriction to allow filing leaves for past dates
        const dateInputs = document.querySelectorAll('#applyLeaveModal input[type="date"]');
        
        // No longer setting min date restriction
        // Users can now select dates before today
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabPanels = document.querySelectorAll('.tab-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target');
                this.switchTab(target);
                // Update URL hash when a tab is clicked
                window.location.hash = target;
            });
        });
        // Activate tab based on URL hash on page load
        const initialHash = window.location.hash.substring(1);
        if (initialHash) {
            this.switchTab(initialHash);
        }
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
        
        // Ensure the Leave Counts Preview is hidden initially
        setTimeout(() => {
            this.calculateDays(); // Call calculateDays to set initial state
        }, 100);
    }

    resetApplyForm() {
        const form = document.getElementById('applyLeaveForm');
        if (form) {
            form.reset();
            
            // Reset displays
            const balanceDisplay = document.getElementById('balanceDisplay');
            const daysCountElement = document.getElementById('daysCount');
            const daysRangeElement = document.getElementById('daysRange');
            const hrsCountElement = document.getElementById('hrsCount');
            const hrsRangeElement = document.getElementById('hrsRange');
            const daysDisplay = document.getElementById('daysRequested');
            const daysFormRow = daysDisplay ? daysDisplay.closest('.form-row') : null;
            
            if (balanceDisplay) {
                balanceDisplay.innerHTML = '<span class="balance-text">Select leave type to view balance</span>';
            }
            
            if (daysCountElement) {
                daysCountElement.textContent = 'Select dates to calculate';
                daysCountElement.className = 'days-count';
            }
            
            if (daysRangeElement) {
                daysRangeElement.textContent = '';
            }
            
            if (hrsCountElement) {
                hrsCountElement.textContent = 'Hours Count';
                hrsCountElement.className = 'days-count';
            }
            
            if (hrsRangeElement) {
                // Clear any stored time values to ensure we show the default
                localStorage.removeItem('leaveTimeFrom');
                localStorage.removeItem('leaveTimeTo');
                hrsRangeElement.textContent = this.getHoursRange();
            }
            
            // Hide the days display
            if (daysFormRow) {
                daysFormRow.classList.add('days-hidden');
                daysFormRow.classList.remove('days-show');
            }
            
            // Reset hours editor state
            this.isEditingHours = false;
            this.canEditHours = false;
            this.toggleHoursEditButton(false);
            if (this.hoursEditButton) {
                this.hoursEditButton.style.display = 'none';
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
        const daysCountElement = document.getElementById('daysCount');
        const daysRangeElement = document.getElementById('daysRange');
        const hrsCountElement = document.getElementById('hrsCount');
        const hrsRangeElement = document.getElementById('hrsRange');
        const daysDisplay = document.getElementById('daysRequested');
        const daysFormRow = daysDisplay ? daysDisplay.closest('.form-row') : null;

        if (!dateFromInput || !dateToInput || !daysCountElement || !daysRangeElement || !hrsCountElement || !hrsRangeElement || !daysDisplay || !daysFormRow) return;

        const dateFrom = dateFromInput.value;
        const dateTo = dateToInput.value;

        if (!dateTo) {
            // Hide the days display when Date To is not selected
            daysFormRow.classList.add('days-hidden');
            daysFormRow.classList.remove('days-show');

            daysCountElement.textContent = 'Select dates to calculate';
            daysRangeElement.textContent = '';
            hrsCountElement.textContent = 'Hours Count';
            hrsRangeElement.textContent = '';
            return;
        }

        if (!dateFrom) {
            // Ensure Date From is selected before proceeding
            daysCountElement.textContent = 'Please select a start date';
            daysCountElement.className = 'days-count text-error';
            daysRangeElement.textContent = '';
            hrsCountElement.textContent = 'Hours Count';
            hrsRangeElement.textContent = '';
            return;
        }

        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        if (toDate < fromDate) {
            daysCountElement.textContent = 'End date cannot be before start date';
            daysCountElement.className = 'days-count text-error';
            daysRangeElement.textContent = '';
            hrsCountElement.textContent = 'Hours Count';
            hrsRangeElement.textContent = '';
            return;
        }

        // Show the days display when both dates are valid
        daysFormRow.classList.remove('days-hidden');
        daysFormRow.classList.add('days-show');

        // Calculate working days excluding Sundays (unless exempted) and holidays
        const workingDays = this.calculateWorkingDays(fromDate, toDate);
        
        // Calculate hours based on working days and custom hours (if single day)
        let totalHours;
        if (workingDays === 1 && this.hasCustomHours()) {
            totalHours = this.getCustomHours();
        } else if (workingDays === 0) {
            // Handle edge case where selected dates are all non-working days
            totalHours = 0;
        } else {
            totalHours = workingDays * 8; // 8 hours per day
        }

        // Display appropriate message for working days
        if (workingDays === 0) {
            daysCountElement.textContent = '0 day(s) (Non-working days)';
            daysCountElement.className = 'days-count text-warning';
        } else {
            daysCountElement.textContent = `${workingDays} day(s)`;
            daysCountElement.className = 'days-count';
        }
        
        daysRangeElement.textContent = `${this.formatDateLong(fromDate)} - ${this.formatDateLong(toDate)}`;
        hrsCountElement.textContent = `${totalHours} hour(s)`;
        hrsRangeElement.textContent = this.getHoursRange();

        // Update the hidden hrs_requested field
        const hrsRequestedInput = document.getElementById('id_hrs_requested');
        if (hrsRequestedInput) {
            hrsRequestedInput.value = totalHours;
        }

        // Enable/disable hours editing based on working days count
        this.toggleHoursEditButton(workingDays === 1);
        
        // Clear custom hours if not a single day
        if (workingDays !== 1) {
            localStorage.removeItem('leaveTimeFrom');
            localStorage.removeItem('leaveTimeTo');
        }
    }

    calculateWorkingDays(startDate, endDate) {
        let workingDays = 0;
        const currentDate = new Date(startDate);
        
        console.log('Calculating working days from', startDate, 'to', endDate);
        console.log('Available holidays:', this.holidays);
        console.log('Available Sunday exceptions:', this.sundayExceptions);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const dateString = currentDate.toISOString().split('T')[0];

            // Check if it's a holiday
            const isHoliday = this.holidays.some(holiday => holiday.date === dateString);

            // Check if it's Sunday and if it's exempted
            const isSunday = dayOfWeek === 0;
            const isSundayExempted = this.sundayExceptions.some(exception => exception.date === dateString);

            console.log(`Checking ${dateString}: isSunday=${isSunday}, isHoliday=${isHoliday}, isSundayExempted=${isSundayExempted}`);

            // Count the day if it's not a holiday and either not Sunday or is an exempted Sunday
            if (!isHoliday && (!isSunday || isSundayExempted)) {
                workingDays++;
                console.log(`  -> Counted as working day. Total: ${workingDays}`);
            } else {
                console.log(`  -> Excluded. Reason: ${isHoliday ? 'Holiday' : 'Sunday (not exempted)'}`);
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log('Final working days count:', workingDays);
        return workingDays;
    }

    getHoursPerDay() {
        // 1 day = 8 hours (7:00 AM to 4:00 PM with 1 hour lunch break)
        return 8;
    }

    getHoursRange() {
        const timeFrom = localStorage.getItem('leaveTimeFrom') || '07:00';
        const timeTo = localStorage.getItem('leaveTimeTo') || '16:00';
        
        // Convert to 12-hour format
        const formatTime = (time) => {
            const [hour, minute] = time.split(':').map(Number);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
        };
        
        return `${formatTime(timeFrom)} to ${formatTime(timeTo)}`;
    }

    formatDateLong(date) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    hasCustomHours() {
        // Check if user has set custom hours for single day leave
        const customTimeFrom = localStorage.getItem('leaveTimeFrom');
        const customTimeTo = localStorage.getItem('leaveTimeTo');
        return customTimeFrom && customTimeTo;
    }

    getCustomHours() {
        // Get custom hours duration from stored time range
        const timeFrom = localStorage.getItem('leaveTimeFrom') || '07:00';
        const timeTo = localStorage.getItem('leaveTimeTo') || '16:00';
        
        const [fromHour, fromMin] = timeFrom.split(':').map(Number);
        const [toHour, toMin] = timeTo.split(':').map(Number);
        
        const fromMinutes = fromHour * 60 + fromMin;
        const toMinutes = toHour * 60 + toMin;
        
        return Math.max(0, (toMinutes - fromMinutes) / 60);
    }

    initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        let searchTimeout;
        
        // Auto-search on input with debouncing
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            
            searchTimeout = setTimeout(() => {
                const searchTerm = e.target.value.trim();
                this.performAjaxSearch(searchTerm, 1); // Always start from page 1 when searching
            }, 500); // 500ms delay for debouncing
        });

        // Setup pagination click handlers
        this.setupAjaxPaginationHandlers();
        
        // Update search clear button based on initial value
        this.updateSearchClearButton(searchInput.value.trim());
    }

    setupAjaxPaginationHandlers() {
        // Handle pagination clicks with event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#approvalsPaginationControls a.pagination-btn')) {
                e.preventDefault();
                const link = e.target.closest('a.pagination-btn');
                const url = new URL(link.href);
                const page = url.searchParams.get('approvals_page') || 1;
                const search = url.searchParams.get('search') || '';
                
                this.performAjaxSearch(search, page);
            }
        });
    }

    async performAjaxSearch(searchTerm, page = 1) {
        try {
            // Show loading state
            this.showTableLoading();
            
            // Update search input and clear button
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = searchTerm;
            }
            this.updateSearchClearButton(searchTerm);
            
            // Make AJAX request
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            params.append('page', page);
            
            const response = await fetch(`/leave/ajax/search-approvals/?${params.toString()}`);
            const data = await response.json();
            
            // Update table content
            this.updateApprovalsTable(data.approvals, data.search_query);
            this.updateApprovalsPagination(data.pagination, data.search_query);
            
        } catch (error) {
            console.error('Error performing search:', error);
            this.showTableError();
        }
    }

    showTableLoading() {
        const tableBody = document.getElementById('approvalsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    showTableError() {
        const tableBody = document.getElementById('approvalsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h5>Error Loading Data</h5>
                            <p>Please try again later.</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    updateSearchClearButton(searchTerm) {
        const clearBtn = document.querySelector('.search-clear');
        const searchBox = document.querySelector('.search-box');
        
        if (searchTerm && searchTerm.length > 0) {
            if (!clearBtn && searchBox) {
                const newClearBtn = document.createElement('span');
                newClearBtn.className = 'search-clear';
                newClearBtn.innerHTML = '<i class="fas fa-times"></i>';
                newClearBtn.onclick = () => this.clearAjaxSearch();
                searchBox.appendChild(newClearBtn);
            }
        } else {
            if (clearBtn) {
                clearBtn.remove();
            }
        }
    }

    clearAjaxSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            this.performAjaxSearch('', 1);
        }
    }

    updateApprovalsTable(approvals, searchQuery) {
        const tableBody = document.getElementById('approvalsTableBody');
        if (!tableBody) return;
        
        if (approvals.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h5>No leave requests found</h5>
                            ${searchQuery ? `<p>No results found for "${searchQuery}"</p>` : '<p>No pending approvals at this time.</p>'}
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const rowsHtml = approvals.map(approval => `
            <tr>
                <td>
                    <span class="control-number">${approval.control_number}</span>
                </td>
                <td>
                    <div class="employee-info">
                        <span class="employee-name">${approval.employee_name}</span>
                        <small class="employee-id">${approval.employee_id}</small>
                    </div>
                </td>
                <td>${approval.leave_type}</td>
                <td>${approval.leave_reason}</td>
                <td>${approval.duration_display}</td>
                <td class="center-align">
                    <span class="status-badge status-${approval.status}">
                        ${approval.status_display}
                    </span>
                </td>
                <td>${approval.date_prepared}</td>
                <td>
                    <div class="center-align">
                        ${approval.is_routing ? 
                            `<button class="btn btn-sm btn-primary" data-action="open-approval" data-control-number="${approval.control_number}" title="Review & Approve">
                                <i class="fas fa-check"></i>
                                Review
                            </button>` :
                            `<button class="btn btn-icon" data-action="view-details" data-control-number="${approval.control_number}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
        
        tableBody.innerHTML = rowsHtml;
    }

    updateApprovalsPagination(pagination, searchQuery) {
        // Update pagination info
        const startRecord = document.getElementById('approvalsStartRecord');
        const endRecord = document.getElementById('approvalsEndRecord');
        const totalRecords = document.getElementById('approvalsTotalRecords');
        
        if (startRecord) startRecord.textContent = pagination.start_index || 0;
        if (endRecord) endRecord.textContent = pagination.end_index || 0;
        if (totalRecords) totalRecords.textContent = pagination.count || 0;
        
        // Update pagination controls
        const paginationControls = document.getElementById('approvalsPaginationControls');
        if (!paginationControls) return;
        
        const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
        
        let paginationHtml = '';
        
        // Previous button
        if (pagination.has_previous) {
            paginationHtml += `<a class="pagination-btn" href="?approvals_page=${pagination.previous_page_number}${searchParam}#approvals">
                <i class="fas fa-chevron-left"></i>
            </a>`;
        } else {
            paginationHtml += `<span class="pagination-btn" disabled>
                <i class="fas fa-chevron-left"></i>
            </span>`;
        }
        
        // Page numbers container
        paginationHtml += '<div id="approvalsPageNumbers">';
        
        if (pagination.page_range && pagination.page_range.length > 0) {
            const currentPage = pagination.number;
            for (const num of pagination.page_range) {
                if (num === currentPage) {
                    paginationHtml += `<span class="pagination-btn active">${num}</span>`;
                } else if (num > currentPage - 3 && num < currentPage + 3) {
                    paginationHtml += `<a class="pagination-btn" href="?approvals_page=${num}${searchParam}#approvals">${num}</a>`;
                }
            }
        } else {
            paginationHtml += '<span class="pagination-btn active">1</span>';
        }
        
        paginationHtml += '</div>';
        
        // Next button
        if (pagination.has_next) {
            paginationHtml += `<a class="pagination-btn" href="?approvals_page=${pagination.next_page_number}${searchParam}#approvals">
                <i class="fas fa-chevron-right"></i>
            </a>`;
        } else {
            paginationHtml += `<span class="pagination-btn" disabled>
                <i class="fas fa-chevron-right"></i>
            </span>`;
        }
        
        paginationControls.innerHTML = paginationHtml;
    }

    initializeHoursEditor() {
        const hrsCountElement = document.getElementById('hrsCount');
        if (!hrsCountElement) return;

        // Create edit button
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'hours-edit-btn';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Edit hours';
        editButton.style.display = 'none';

        // Add edit button to the hrs count element
        const hrsInfoDiv = hrsCountElement.closest('.days-info');
        if (hrsInfoDiv) {
            hrsInfoDiv.style.position = 'relative';
            hrsInfoDiv.appendChild(editButton);
        }

        // Only show edit button when canEditHours is true (single day)
        // No hover logic

        // Handle edit button click
        editButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.canEditHours) {
                this.showHoursEditor();
            }
        });

        // Store reference to edit button
        this.hoursEditButton = editButton;
    }

    toggleHoursEditButton(canEdit) {
        this.canEditHours = canEdit;
        const hrsCountElement = document.getElementById('hrsCount');
        const hrsInfoDiv = hrsCountElement ? hrsCountElement.closest('.days-info') : null;
        
        if (hrsInfoDiv) {
            if (canEdit) {
                hrsInfoDiv.classList.add('editable-hours');
                hrsInfoDiv.title = 'Click to edit hours for single day leave';
            } else {
                hrsInfoDiv.classList.remove('editable-hours');
                hrsInfoDiv.title = '';
            }
        }
        
        if (this.hoursEditButton) {
            this.hoursEditButton.style.display = canEdit ? 'flex' : 'none';
        }
    }

    showHoursEditor() {
        this.isEditingHours = true;
        const hrsRangeElement = document.getElementById('hrsRange');
        if (!hrsRangeElement) return;

        const currentTimeFrom = localStorage.getItem('leaveTimeFrom') || '07:00';
        const currentTimeTo = localStorage.getItem('leaveTimeTo') || '16:00';

        // Create editor HTML
        const editorHTML = `
            <div class="hours-editor">
                <div class="hours-inputs">
                    <div class="time-input-group">
                        <label>From:</label>
                        <input type="time" id="timeFromInput" value="${currentTimeFrom}" class="time-input">
                    </div>
                    <div class="time-input-group">
                        <label>To:</label>
                        <input type="time" id="timeToInput" value="${currentTimeTo}" class="time-input">
                    </div>
                </div>
                <div class="hours-editor-actions">
                    <button type="button" class="btn-save-hours">Save</button>
                    <button type="button" class="btn-cancel-hours">Cancel</button>
                </div>
            </div>
        `;

        hrsRangeElement.innerHTML = editorHTML;
        
        // Add slide down animation
        const hoursEditor = hrsRangeElement.querySelector('.hours-editor');
        if (hoursEditor) {
            // Start with hidden state
            hoursEditor.classList.add('hide');
            // Trigger slide down animation
            setTimeout(() => {
                hoursEditor.classList.remove('hide');
                hoursEditor.classList.add('show');
            }, 10);
        }

        // Add event listeners
        const saveBtn = hrsRangeElement.querySelector('.btn-save-hours');
        const cancelBtn = hrsRangeElement.querySelector('.btn-cancel-hours');

        saveBtn.addEventListener('click', () => this.saveHoursEdit());
        cancelBtn.addEventListener('click', () => this.cancelHoursEdit());

        // Focus on first input
        const timeFromInput = document.getElementById('timeFromInput');
        if (timeFromInput) {
            timeFromInput.focus();
        }
    }

    saveHoursEdit() {
        const timeFromInput = document.getElementById('timeFromInput');
        const timeToInput = document.getElementById('timeToInput');

        if (!timeFromInput || !timeToInput) return;

        const timeFrom = timeFromInput.value;
        const timeTo = timeToInput.value;

        if (!timeFrom || !timeTo) {
            alert('Please select both time from and time to');
            return;
        }

        // Validate time range
        const [fromHour, fromMin] = timeFrom.split(':').map(Number);
        const [toHour, toMin] = timeTo.split(':').map(Number);
        
        const fromMinutes = fromHour * 60 + fromMin;
        const toMinutes = toHour * 60 + toMin;

        if (toMinutes <= fromMinutes) {
            alert('End time must be after start time');
            return;
        }

        // Save to localStorage
        localStorage.setItem('leaveTimeFrom', timeFrom);
        localStorage.setItem('leaveTimeTo', timeTo);

        // Add slide up animation before hiding
        const hoursEditor = document.querySelector('.hours-editor');
        if (hoursEditor) {
            hoursEditor.classList.remove('show');
            hoursEditor.classList.add('hide');
            // Wait for animation to complete before calling cancelHoursEdit
            setTimeout(() => {
                this.cancelHoursEdit();
                this.calculateDays(); // Recalculate with new hours
            }, 300);
        } else {
            this.cancelHoursEdit();
            this.calculateDays(); // Recalculate with new hours
        }
    }

    cancelHoursEdit() {
        // Add slide up animation if editor exists
        const hoursEditor = document.querySelector('.hours-editor');
        if (hoursEditor) {
            hoursEditor.classList.remove('show');
            hoursEditor.classList.add('hide');
            // Wait for animation to complete before restoring text
            setTimeout(() => {
                this.isEditingHours = false;
                const hrsRangeElement = document.getElementById('hrsRange');
                if (hrsRangeElement) {
                    hrsRangeElement.textContent = this.getHoursRange();
                }

                // Hide edit button (preserve when single-day editing allowed)
                const editButton = document.querySelector('.hours-edit-btn');
                if (editButton) {
                    editButton.style.display = this.canEditHours ? 'flex' : 'none';
                }
            }, 300);
        } else {
            this.isEditingHours = false;
            const hrsRangeElement = document.getElementById('hrsRange');
            if (hrsRangeElement) {
                hrsRangeElement.textContent = this.getHoursRange();
            }

            // Hide edit button (preserve when single-day editing allowed)
            const editButton = document.querySelector('.hours-edit-btn');
            if (editButton) {
                editButton.style.display = this.canEditHours ? 'flex' : 'none';
            }
        }
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
        console.log('Starting form validation...');
        
        const leaveType = document.getElementById('id_leave_type').value;
        const leaveReasonSelect = document.getElementById('id_leave_reason');
        const leaveReason = leaveReasonSelect.value;
        const dateFrom = document.getElementById('id_date_from').value;
        const dateTo = document.getElementById('id_date_to').value;
        const reason = document.getElementById('id_reason').value.trim();

        console.log('Form values:', {
            leaveType,
            leaveReason,
            dateFrom,
            dateTo,
            reason: reason.substring(0, 50) + (reason.length > 50 ? '...' : '')
        });

        if (!leaveType) {
            console.log('Validation failed: No leave type selected');
            this.showToast('Please select a leave type', 'error');
            return false;
        }

        // Check if leave reason is required (has options) but not selected
        if (leaveReasonSelect && !leaveReasonSelect.disabled && leaveReasonSelect.options.length > 1 && !leaveReason) {
            console.log('Validation failed: No leave reason selected');
            this.showToast('Please select a leave reason category', 'error');
            return false;
        }

        if (!dateFrom || !dateTo) {
            console.log('Validation failed: Missing dates');
            this.showToast('Please select both start and end dates', 'error');
            return false;
        }

        if (!reason) {
            console.log('Validation failed: No reason provided');
            this.showToast('Please provide a reason for your leave', 'error');
            return false;
        }

        if (new Date(dateTo) < new Date(dateFrom)) {
            console.log('Validation failed: End date before start date');
            this.showToast('End date cannot be before start date', 'error');
            return false;
        }

        console.log('Basic validation passed, checking file upload...');
        const fileValidation = this.validateFileUpload();
        console.log('File validation result:', fileValidation);
        return fileValidation;
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
            
            const data = await response.json();
            if (data.success) {
                document.getElementById('leaveDetailsContent').innerHTML = data.html;
                this.openModal('leaveDetailsModal');
            } else {
                this.showToast(data.message || 'Error loading leave details', 'error');
            }
        } catch (error) {
            console.error('Error loading leave details:', error);
            this.showToast('Error loading leave details', 'error');
        }
    }

    async viewLeaveHistory(element) {
        const employeeId = element.getAttribute('data-employee-id');
        const employeeName = element.getAttribute('data-employee-name');
        
        if (!employeeId) return;

        try {
            const response = await fetch(`/leave/api/employee-leave-history/${employeeId}/`);
            if (!response.ok) throw new Error('Failed to fetch leave history');
            
            const data = await response.json();
            if (data.success) {
                // Update modal title
                document.getElementById('leaveHistoryModalTitle').textContent = `${data.employee_name}'s Leave History`;
                
                // Build the leave history content
                let content = '';
                if (data.leave_history.length === 0) {
                    content = `
                        <div class="empty-state">
                            <i class="fas fa-calendar-times"></i>
                            <h4>No leave history</h4>
                            <p>This employee has no leave requests.</p>
                        </div>
                    `;
                } else {
                    content = `
                        <div class="leave-history-cards">
                            ${data.leave_history.map(leave => `
                                <div class="leave-history-card">
                                    <div class="leave-history-card-row leave-history-header">
                                        <span class="leave-history-control">LR-${leave.control_number}</span>
                                        <span class="leave-history-type">${leave.leave_type}</span>
                                        <span class="status-badge status-${leave.status}">${leave.status_display}</span>
                                    </div>
                                    <div class="leave-history-card-row">
                                        <span class="leave-history-value">${leave.reason}</span>
                                    </div>
                                    <div class="leave-history-card-row">
                                        <span class="leave-history-value-info">${leave.leave_reason} • ${leave.date_from} - ${leave.date_to}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                document.getElementById('leaveHistoryContent').innerHTML = content;
                this.openModal('leaveHistoryModal');
            } else {
                this.showToast(data.error || 'Error loading leave history', 'error');
            }
        } catch (error) {
            console.error('Error loading leave history:', error);
            this.showToast('Error loading leave history', 'error');
        }
    }

    async cancelLeave(element) {
        const controlNumber = element.getAttribute('data-control-number') ||
                            element.closest('[data-control-number]')?.getAttribute('data-control-number');
        
        if (!controlNumber) return;

        // Show cancellation confirmation modal
        const cancelModal = document.getElementById('cancelConfirmModal');
        if (!cancelModal) {
            console.error('Cancel confirmation modal not found');
            return;
        }
        const confirmBtn = document.getElementById('confirmCancelBtn');
        // Attach handler for confirmation
        confirmBtn.onclick = async () => {
            this.closeModal('cancelConfirmModal');
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
        };
        this.openModal('cancelConfirmModal');
        return;
    }

    // Approval Functions
    async openApprovalModal(element) {
        const controlNumber = element.getAttribute('data-control-number') ||
                            element.closest('[data-control-number]')?.getAttribute('data-control-number');
        
        if (!controlNumber) return;
        // Check if current user has an assigned approver for routing further approvals
        try {
            const authResp = await fetch('/leave/api/check-approver/');
            const authData = await authResp.json();
            if (!authData.has_approver) {
                // Show no approver error modal and prevent review
                this.openModal('noApproverModal');
                return;
            }
        } catch (err) {
            console.error('Error checking approver before review:', err);
            this.showToast('Error checking approver. Please try again.', 'error');
            return;
        }

        try {
            const response = await fetch(`/leave/detail/${controlNumber}/`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to fetch details');
            // If user has no assigned approver in their profile, show error modal
            if (!data.has_approver) {
                this.openModal('noApproverModal');
                return;
            }

            // Use the detail_content.html markup for approval modal (user is authorized)
            const approvalContent = `
                ${data.html}
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
            this.showToast(error.message || 'Error loading leave details', 'error');
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
        // Reload approval charts when tab becomes visible
        console.log('Refreshing approvals...');
        // Charts need to be redrawn when the tab becomes visible
        // because they may have been initialized while hidden
        setTimeout(() => {
            this.loadApprovalChartData();
        }, 100);
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

    // Calendar Functions
    initializeCalendar() {
        // Initialize leave data from Django context
        if (window.leaveCalendarData) {
            this.leaveData = window.leaveCalendarData.map(leave => {
                // Create dates at local midnight to avoid timezone issues
                const startDate = new Date(leave.startDate + 'T00:00:00');
                const endDate = new Date(leave.endDate + 'T00:00:00');
                
                return {
                    startDate: startDate,
                    endDate: endDate,
                    leaveType: leave.leaveType,
                    reason: leave.reason,
                    code: leave.code,
                    controlNumber: leave.controlNumber,
                    status: leave.status
                };
            });
        }
        
        // Bind calendar navigation
        this.bindCalendarEvents();
        this.updateCalendar();
    }

    bindCalendarEvents() {
        // Make sure changeMonth is available globally
        window.changeMonth = (delta) => {
            this.changeMonth(delta);
        };
        window.goToToday = () => {
            this.goToToday();
        };
    }

    goToToday() {
        this.currentDate = new Date();
        this.updateCalendar();
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.updateCalendar();
    }

    updateCalendar() {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        // Update month display
        const monthElement = document.getElementById('currentMonth');
        if (monthElement) {
            monthElement.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }
        
        // Generate calendar days
        const calendarDays = document.getElementById('calendar-days');
        if (!calendarDays) return;
        
        calendarDays.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Get previous month's last days
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        // Add previous month's trailing days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const dayDiv = this.createDayElement(dayNum, 'prev-month', new Date(year, month - 1, dayNum));
            calendarDays.appendChild(dayDiv);
        }
        
        // Add current month's days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDay = new Date(year, month, day);
            const isToday = (year === today.getFullYear() && 
                            month === today.getMonth() && 
                            day === today.getDate());
            const dayDiv = this.createDayElement(day, isToday ? 'current-date' : '', currentDay);
            
            // Add leave events for this day
            this.addLeaveEventsToDay(dayDiv, currentDay);
            
            calendarDays.appendChild(dayDiv);
        }
        
        // Add next month's leading days to fill the grid
        const totalCells = calendarDays.children.length;
        const remainingCells = 42 - totalCells; // 6 rows × 7 days
        for (let day = 1; day <= remainingCells && day <= 14; day++) {
            const dayDiv = this.createDayElement(day, 'prev-month', new Date(year, month + 1, day));
            calendarDays.appendChild(dayDiv);
        }
    }

    createDayElement(dayNum, className, date) {
        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day ${className}`;
        
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = dayNum;
        
        dayDiv.appendChild(dayNumber);
        return dayDiv;
    }

    addLeaveEventsToDay(dayDiv, date) {
        const leavesForDay = [];
        
        this.leaveData.forEach(leave => {
            // Exclude cancelled leaves from highlighting
            if (leave.status !== 'cancelled' && this.isDateInRange(date, leave.startDate, leave.endDate)) {
                leavesForDay.push(leave);
            }
        });
        
        if (leavesForDay.length > 0) {
            // Use the first leave for primary styling (in case of overlapping leaves)
            const primaryLeave = leavesForDay[0];
            
            // Add status-based background color to the entire day cell
            dayDiv.classList.add(`leave-day-${primaryLeave.status}`);
            
            // Set tooltip title to display leave type and date range
            const fmtOptions = { month: 'short', day: 'numeric', year: 'numeric' };
            const fromStr = primaryLeave.startDate.toLocaleDateString(undefined, fmtOptions);
            const toStr = primaryLeave.endDate.toLocaleDateString(undefined, fmtOptions);
            dayDiv.title = `${primaryLeave.leaveType}: ${fromStr} - ${toStr}`;

            // Add border radius for first and last days of leave period
            if (this.isSameDate(date, primaryLeave.startDate)) {
                dayDiv.classList.add('leave-start');
            }
            if (this.isSameDate(date, primaryLeave.endDate)) {
                dayDiv.classList.add('leave-end');
            }
        }
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    getStatusDisplayText(status) {
        const statusMap = {
            'approved': 'Approved',
            'routing': 'Pending Approval',
            'disapproved': 'Disapproved',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    isDateInRange(date, startDate, endDate) {
        // Normalize all dates to remove time component
        const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        const checkDate = normalizeDate(date);
        const start = normalizeDate(startDate);
        const end = normalizeDate(endDate);
        
        return checkDate >= start && checkDate <= end;
    }

    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.currentModal = modal;
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Focus management
        const firstFocusable = modal.querySelector('input, button, textarea, select');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Start zoom-out animation by removing .show
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        this.currentModal = null;

        // Wait for transition to finish before hiding
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // match transition duration in style.css

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
            container.style.cssText = 'position: fixed !important; bottom: 20px !important; right: 20px !important; top: auto !important; left: auto !important; z-index: 10000 !important; display: flex !important; flex-direction: column !important; gap: 8px !important;';
            document.body.appendChild(container);
        }
        return container;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const config = this.getToastConfig(type);
        toast.innerHTML = `
            <i class="fas fa-${config.icon}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="modal-close toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        return toast;
    }

    getToastConfig(type) {
        const configs = {
            success: { icon: 'check-circle' },
            error: { icon: 'exclamation-circle' },
            warning: { icon: 'exclamation-triangle' },
            info: { icon: 'info-circle' }
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

    // Chart Management
    initializeCharts() {
        this.statusChart = null;
        this.leaveTypesChart = null;
        this.approvalDistributionChart = null;
        this.approvalRequestChart = null;
        this.currentApprovalPeriod = 'month';
        this.loadChartData();
        this.initializeApprovalCharts();
        
        // Auto-refresh charts every minute
        setInterval(() => {
            this.loadChartData();
            this.loadApprovalChartData();
        }, 60000);
    }

    async loadChartData() {
        try {
            const response = await fetch('/leave/ajax/chart-data/');
            const data = await response.json();
            
            if (data.success) {
                this.updateFiscalYearIndicator(data.fiscal_year);
                this.createStatusChart(data.status_chart);
                this.createLeaveTypesChart(data.line_chart);
            } else {
                this.showChartError();
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showChartError();
        }
    }

    updateFiscalYearIndicator(fiscalYear) {
        // Set fiscal year duration in both chart subtitle spans
        const fySpan1 = document.getElementById('fiscalYearDuration');
        const fySpan2 = document.getElementById('fiscalYearDuration2');
        if (fySpan1) {
            fySpan1.textContent = this.formatFiscalYearDuration(fiscalYear);
        }
        if (fySpan2) {
            fySpan2.textContent = this.formatFiscalYearDuration(fiscalYear);
        }
    }

    formatFiscalYearDuration(fiscalYear) {
        // fiscalYear is like '2025-2026'
        const [startYear, endYear] = fiscalYear.split('-');
        return `Fiscal Year: May ${startYear} - April ${endYear}`;
    }

    createStatusChart(data) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.statusChart) {
            this.statusChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';

        // Update center text
        this.updateDonutCenter(data.total_requests || 0);

        // Create custom legend
        this.createCustomLegend(data);

        // Handle case where all data is zero - add a small value to prevent empty chart
        const chartData = data.data.slice();
        const hasData = chartData.some(value => value > 0);
        
        if (!hasData) {
            // If all values are zero, add small placeholder values to show the segments
            chartData.fill(1);
        }

        this.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: data.backgroundColor,
                    borderWidth: 2,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    hoverBorderWidth: 3,
                    hoverOffset: hasData ? 4 : 0 // No hover effect if no real data
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: false // Disable built-in legend
                    },
                    tooltip: {
                        enabled: hasData, // Disable tooltips if no real data
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const percentage = ((context.parsed / data.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                onHover: (event, elements) => {
                    ctx.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });
    }

    updateDonutCenter(total) {
        const centerNumber = document.querySelector('.donut-center-number');
        const centerLabel = document.querySelector('.donut-center-label');
        
        if (centerNumber) {
            centerNumber.textContent = total.toLocaleString();
        }
        if (centerLabel) {
            centerLabel.textContent = 'Total Requests';
        }
    }

    createCustomLegend(data) {
        const legendContainer = document.querySelector('.chart-legend');
        if (!legendContainer) return;

        const total = data.data.reduce((sum, value) => sum + value, 0);
        
        let legendHTML = '';
        data.labels.forEach((label, index) => {
            const value = data.data[index];
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const color = data.backgroundColor[index];
            
            // Add class for zero values to style them differently
            const itemClass = value === 0 ? 'legend-item legend-item-zero' : 'legend-item';
            
            // Show all legend items regardless of data count
            legendHTML += `
                <div class="${itemClass}" data-index="${index}">
                    <div style="display: flex; align-items: center;">
                        <div class="legend-color" style="background-color: ${color};"></div>
                        <span class="legend-label">${label}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span class="legend-value">${value}</span>
                        <span class="legend-percentage">(${percentage}%)</span>
                    </div>
                </div>
            `;
        });
        
        legendContainer.innerHTML = legendHTML;

        // Add click handlers to legend items for all statuses
        legendContainer.querySelectorAll('.legend-item').forEach((item, index) => {
            // Get the actual data index from the DOM
            const dataIndex = parseInt(item.getAttribute('data-index'));
            
            item.addEventListener('click', () => {
                if (this.statusChart) {
                    const meta = this.statusChart.getDatasetMeta(0);
                    const element = meta.data[dataIndex];
                    if (element) {
                        element.hidden = !element.hidden;
                        this.statusChart.update();
                        
                        // Update legend item appearance
                        item.style.opacity = element.hidden ? '0.5' : '1';
                    }
                }
            });
            
            item.addEventListener('mouseenter', () => {
                if (this.statusChart) {
                    this.statusChart.setActiveElements([{
                        datasetIndex: 0,
                        index: dataIndex
                    }]);
                    this.statusChart.update('none');
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (this.statusChart) {
                    this.statusChart.setActiveElements([]);
                    this.statusChart.update('none');
                }
            });
        });
    }

    createLeaveTypesChart(data) {
        const ctx = document.getElementById('leaveTypesChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.leaveTypesChart) {
            this.leaveTypesChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        this.leaveTypesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                family: 'Poppins',
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
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 11
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                                       },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 11
                            },
                            stepSize: 1,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    showChartError() {
        const containers = ['statusChart', 'leaveTypesChart'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                const parent = container.parentElement;
                parent.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Failed to load chart data</span>
                    </div>
                `;
            }
        });
    }

    // Theme change handler for charts
    updateChartsForTheme() {
        if (this.statusChart) this.statusChart.destroy();
        if (this.leaveTypesChart) this.leaveTypesChart.destroy();
        if (this.approvalDistributionChart) this.approvalDistributionChart.destroy();
        if (this.approvalRequestChart) this.approvalRequestChart.destroy();
        
        setTimeout(() => {
            this.loadChartData();
            this.loadApprovalChartData();
        }, 100);
    }

    // Approval Charts Management
    initializeApprovalCharts() {
        this.setupApprovalChartFilters();
        this.setupApprovalTrendFilters();
        this.loadApprovalChartData();
        
        // Handle window resize for slider positioning
        window.addEventListener('resize', () => {
            this.repositionSliders();
        });
    }

    repositionSliders() {
        // Reposition approval chart filter slider
        const approvalActiveBtn = document.querySelector('#approval-chart-filters .filter-btn.active');
        const approvalSlider = document.querySelector('#approval-chart-filters .filter-slider');
        if (approvalActiveBtn && approvalSlider) {
            this.updateSliderPosition(approvalActiveBtn, approvalSlider);
        }
        
        // Reposition trend chart filter slider
        const trendActiveBtn = document.querySelector('#approval-trend-filters .filter-btn.active');
        const trendSlider = document.querySelector('#approval-trend-filters .filter-slider');
        if (trendActiveBtn && trendSlider) {
            this.updateSliderPosition(trendActiveBtn, trendSlider);
        }
    }

    setupApprovalChartFilters() {
        const filterButtons = document.querySelectorAll('#approval-chart-filters .filter-btn');
        const slider = document.querySelector('#approval-chart-filters .filter-slider');
        
        if (!filterButtons.length) return;

        // Set initial active filter and slider position
        const activeBtn = document.querySelector('#approval-chart-filters .filter-btn.active');
        if (activeBtn && slider) {
            // Delay to ensure proper rendering
            setTimeout(() => {
                this.updateSliderPosition(activeBtn, slider);
            }, 100);
        }

        // Setup filter button handlers
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const period = btn.getAttribute('data-period');
                if (period && period !== this.currentApprovalPeriod) {
                    this.currentApprovalPeriod = period;
                    
                    // Update active state
                    filterButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Move slider
                    if (slider) {
                        this.updateSliderPosition(btn, slider);
                    }
                    
                    // Reload chart data with new period
                    this.loadApprovalChartData();
                }
            });
        });
    }

    updateSliderPosition(activeBtn, slider) {
        const container = activeBtn.parentElement;
        const containerRect = container.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        
        const left = btnRect.left - containerRect.left;
        const width = btnRect.width;
        
        slider.style.left = `${left}px`;
        slider.style.width = `${width}px`;
    }

    setupApprovalTrendFilters() {
        const filterButtons = document.querySelectorAll('#approval-trend-filters .filter-btn');
        const filterContainer = document.getElementById('approval-trend-filters');
        if (!filterButtons.length || !filterContainer) return;

        // Helper to update slider class
        function updateSliderClass() {
            const activeIdx = Array.from(filterButtons).findIndex(btn => btn.classList.contains('active'));
            filterContainer.classList.remove('slide-0', 'slide-1', 'slide-2', 'has-active');
            if (activeIdx >= 0) {
                filterContainer.classList.add('has-active', `slide-${activeIdx}`);
            }
        }

        // Set initial slider
        setTimeout(updateSliderClass, 100);

        filterButtons.forEach((btn, idx) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const period = btn.getAttribute('data-period');
                if (period && period !== this.currentApprovalPeriod) {
                    this.currentApprovalPeriod = period;
                    filterButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateSliderClass();
                    this.loadApprovalChartData();
                }
            });
        });
    }

    async loadApprovalChartData() {
        try {
            const url = `/leave/ajax/approval-chart-data/?period=${this.currentApprovalPeriod}`;
            console.log('Fetching approval chart data from', url);
            const response = await fetch(url, { credentials: 'same-origin' });
            console.log('Approval chart HTTP status:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();
            console.log('Approval chart data response:', JSON.stringify(data, null, 2));
            if (data.success) {
                console.log('Status chart data:', data.status_chart);
                console.log('Line chart data:', data.line_chart);
                this.createApprovalDistributionChart(data.status_chart);
                this.createApprovalRequestChart(data.line_chart);
                this.updateApprovalPeriodLabels(data.period_label);
            } else {
                console.error('Approval chart data error:', data.error);
                this.showApprovalChartError();
            }
        } catch (error) {
            console.error('Error loading approval chart data:', error);
            this.showApprovalChartError();
        }
    }

    updateApprovalPeriodLabels(periodLabel) {
        // Update period labels if needed
        const periodElements = document.querySelectorAll('.chart-subtitle');
        periodElements.forEach(el => {
            if (el.textContent.includes('This Month') || el.textContent.includes('This Quarter') || el.textContent.includes('This Year')) {
                el.textContent = periodLabel;
            }
        });
    }

    createApprovalDistributionChart(data) {
        const ctx = document.getElementById('LeaveDistributionChart');
        if (!ctx) {
            console.log('LeaveDistributionChart canvas not found');
            return;
        }

        console.log('Creating approval distribution chart with data:', data);

        // Destroy existing chart
        if (this.approvalDistributionChart) {
            this.approvalDistributionChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        
        // Ensure data has required properties with defaults
        const labels = data.labels || [];
        const values = data.data || [];
        const bgColors = data.backgroundColor || ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
        
        // Update center text for approval chart (sum of all types)
        const centerNumber = document.querySelector('#LeaveDistributionChart').closest('.donut-chart-wrapper').querySelector('.donut-center-number');
        const centerLabel = document.querySelector('#LeaveDistributionChart').closest('.donut-chart-wrapper').querySelector('.donut-center-label');
        const totalActions = values.reduce((sum, v) => sum + v, 0);
        if (centerNumber) {
            centerNumber.textContent = totalActions.toLocaleString();
        }
        if (centerLabel) {
            centerLabel.textContent = 'Total Requests';
        }

        // Create custom legend for approval actions
        this.createApprovalCustomLegend({ labels, data: values, backgroundColor: bgColors });

        // Handle case where there's no data at all
        let chartLabels = labels;
        let chartData = values.slice();
        let chartColors = bgColors;
        const hasData = chartData.length > 0 && chartData.some(value => value > 0);
        
        if (!hasData) {
            // Show placeholder when no data
            chartLabels = ['No Data'];
            chartData = [1];
            chartColors = [isDark ? '#334155' : '#e2e8f0'];
        }

        this.approvalDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 2,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    hoverBorderWidth: 3,
                    hoverOffset: hasData ? 4 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: hasData,
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const total = values.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                onHover: (event, elements) => {
                    ctx.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });
    }

    createApprovalCustomLegend(data) {
        const legendContainer = document.querySelector('#approvalDistributionLegend');
        if (!legendContainer) return;

        const total = data.data.reduce((sum, value) => sum + value, 0);
        
        let legendHTML = '';
        data.labels.forEach((label, index) => {
            const value = data.data[index];
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const color = data.backgroundColor[index];
            
            // Add class for zero values to style them differently
            const itemClass = value === 0 ? 'legend-item legend-item-zero' : 'legend-item';
            
            legendHTML += `
                <div class="${itemClass}" data-index="${index}">
                    <div style="display: flex; align-items: center;">
                        <div class="legend-color" style="background-color: ${color};"></div>
                        <span class="legend-label">${label}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span class="legend-value">${value}</span>
                        <span class="legend-percentage">(${percentage}%)</span>
                    </div>
                </div>
            `;
        });
        
        legendContainer.innerHTML = legendHTML;

        // Add click handlers to legend items
        legendContainer.querySelectorAll('.legend-item').forEach((item, index) => {
            const dataIndex = parseInt(item.getAttribute('data-index'));
            
            item.addEventListener('click', () => {
                if (this.approvalDistributionChart) {
                    const meta = this.approvalDistributionChart.getDatasetMeta(0);
                    const element = meta.data[dataIndex];
                    if (element) {
                        element.hidden = !element.hidden;
                        this.approvalDistributionChart.update();
                        
                        // Update legend item appearance
                        item.style.opacity = element.hidden ? '0.5' : '1';
                    }
                }
            });
            
            item.addEventListener('mouseenter', () => {
                if (this.approvalDistributionChart) {
                    this.approvalDistributionChart.setActiveElements([{
                        datasetIndex: 0,
                        index: dataIndex
                    }]);
                    this.approvalDistributionChart.update('none');
                }
            });
            
            item.addEventListener('mouseleave', () => {
                if (this.approvalDistributionChart) {
                    this.approvalDistributionChart.setActiveElements([]);
                    this.approvalDistributionChart.update('none');
                }
            });
        });
    }

    createApprovalRequestChart(data) {
        const ctx = document.getElementById('leaveRequestChart');
        if (!ctx) {
            console.log('leaveRequestChart canvas not found');
            return;
        }

        console.log('Creating approval request chart with data:', data);

        // Destroy existing chart
        if (this.approvalRequestChart) {
            this.approvalRequestChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        // Ensure data has required properties with defaults
        const labels = data.labels || [];
        const datasets = data.datasets || [];

        this.approvalRequestChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                family: 'Poppins',
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
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 11
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Poppins',
                                size: 11
                            },
                            stepSize: 1,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        },
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    showApprovalChartError() {
        const containers = ['LeaveDistributionChart', 'leaveRequestChart'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                const parent = container.parentElement;
                parent.innerHTML = `
                    <div class="chart-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Failed to load approval chart data</span>
                    </div>
                `;
            }
        });
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

    /* Fade animations for edit/view mode */
    .fade-in {
        animation: fadeIn 0.3s ease-in-out forwards;
    }

    .fade-out {
        animation: fadeOut 0.3s ease-in-out forwards;
    }

    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
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
    
    // Add theme change listener for charts
    const themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                if (window.leaveUserInterface) {
                    window.leaveUserInterface.updateChartsForTheme();
                }
            }
        });
    });
    
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
    // Setup leave type -> reason cascading
    const leaveTypeSelect = document.getElementById('id_leave_type');
    const reasonCategorySelect = document.getElementById('id_leave_reason');
    if (leaveTypeSelect && reasonCategorySelect) {
        leaveTypeSelect.addEventListener('change', async function () {
            const selected = this.value;
            reasonCategorySelect.disabled = true;
            reasonCategorySelect.innerHTML = '<option value="">Loading...</option>';
            if (selected) {
                try {
                    const response = await fetch(`/leave/api/leave-reasons/${selected}/`);
                    const reasons = await response.json();
                    reasonCategorySelect.innerHTML = '<option value="">Select Leave Reason</option>';
                    reasons.forEach(r => {
                        const opt = document.createElement('option');
                        opt.value = r.id;
                        opt.textContent = r.reason_text;
                        reasonCategorySelect.appendChild(opt);
                    });
                    reasonCategorySelect.disabled = false;
                } catch {
                    reasonCategorySelect.innerHTML = '<option value="">Error loading reasons</option>';
                }
            } else {
                reasonCategorySelect.innerHTML = '<option value="">Select Leave Reason</option>';
            }
        });
    }
    // Modal close logic
    const applyModal = document.getElementById('applyLeaveModal');
    if (applyModal) {
        const overlay = applyModal.querySelector('.modal-overlay');
        const closeBtns = applyModal.querySelectorAll('.modal-close, [data-action="close-modal"]');
        overlay.addEventListener('click', e => e.stopPropagation());
        closeBtns.forEach(btn => btn.addEventListener('click', () => applyModal.classList.remove('open')));
    }
});

// Global function for clearing search (called from template)
function clearSearch() {
    const leaveInterface = window.leaveUserInterface;
    if (leaveInterface && typeof leaveInterface.clearAjaxSearch === 'function') {
        leaveInterface.clearAjaxSearch();
    } else {
        // Fallback to page reload method
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            
            // Get current URL and remove search parameter
            const url = new URL(window.location);
            url.searchParams.delete('search');
            url.searchParams.delete('approvals_page');
            url.hash = 'approvals';
            
            // Reload page without search
            window.location.href = url.toString();
        }
    }
}