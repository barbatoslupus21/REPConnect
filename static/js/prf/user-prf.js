class EmployeePRFManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 7;
        this.filteredRows = [];
        this.allRows = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormHandlers();
        this.initializePagination();
        this.setupSearch();
    }

    initializePagination() {
        this.allRows = Array.from(document.querySelectorAll('.prf-row'));
        this.filteredRows = [...this.allRows];
        
        // Only initialize pagination if pagination elements exist
        if (document.getElementById('totalRecords')) {
            this.updatePagination();
            this.showCurrentPage();
        }
    }

    updatePagination() {
        const totalRecords = this.filteredRows.length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);
        
        // Check if pagination elements exist before trying to update them
        const totalRecordsEl = document.getElementById('totalRecords');
        const startRecordEl = document.getElementById('startRecord');
        const endRecordEl = document.getElementById('endRecord');
        
        if (!totalRecordsEl || !startRecordEl || !endRecordEl) {
            return; // Exit early if pagination elements don't exist
        }
        
        totalRecordsEl.textContent = totalRecords;
        
        const startRecord = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endRecord = Math.min(this.currentPage * this.itemsPerPage, totalRecords);
        
        startRecordEl.textContent = startRecord;
        endRecordEl.textContent = endRecord;
        
        this.updatePageButtons(totalPages);
        this.renderPageNumbers(totalPages);
    }

    updatePageButtons(totalPages) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        // Check if pagination buttons exist before trying to update them
        if (!prevBtn || !nextBtn) {
            return; // Exit early if pagination buttons don't exist
        }
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }

    renderPageNumbers(totalPages) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        
        // Check if page numbers container exists before trying to update it
        if (!pageNumbersContainer) {
            return; // Exit early if page numbers container doesn't exist
        }
        
        pageNumbersContainer.innerHTML = '';
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.goToPage(i);
            pageNumbersContainer.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.showCurrentPage();
        this.updatePagination();
    }

    changePage(direction) {
        const newPage = this.currentPage + direction;
        const totalPages = Math.ceil(this.filteredRows.length / this.itemsPerPage);
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.goToPage(newPage);
        }
    }

    showCurrentPage() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        
        // Hide all rows first
        this.allRows.forEach(row => {
            row.style.display = 'none';
        });
        
        // Show only the rows for the current page
        const rowsToShow = this.filteredRows.slice(startIndex, endIndex);
        rowsToShow.forEach(row => {
            row.style.display = '';
        });
        
        this.updateNoDataRow();
    }

    updateNoDataRow() {
        const noDataRow = document.querySelector('.no-data-row');
        if (this.filteredRows.length === 0) {
            noDataRow.style.display = '';
        } else {
            noDataRow.style.display = 'none';
        }
    }

    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
    }

    performSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (term === '') {
            this.filteredRows = [...this.allRows];
        } else {
            this.filteredRows = this.allRows.filter(row => {
                const text = row.textContent.toLowerCase();
                return text.includes(term);
            });
        }
        
        this.currentPage = 1;
        this.updatePagination();
        this.showCurrentPage();
    }

    setupEventListeners() {
        const categorySelect = document.getElementById('prf_category');
        const typeSelect = document.getElementById('prf_type');
        const controlNumberGroup = document.getElementById('control-number-group');

        console.log('Setting up event listeners:', { categorySelect: !!categorySelect, typeSelect: !!typeSelect });

        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                console.log('Category changed to:', categorySelect.value);
                this.loadPRFTypes(categorySelect.value);
            });
        }

        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                this.toggleControlNumberField(typeSelect.value);
            });
        }

        const prfForm = document.getElementById('prfForm');
        if (prfForm) {
            prfForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPRFRequest();
            });
        }
    }

    setupFormHandlers() {
        const form = document.getElementById('prfForm');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.validateField(input);
                });
            });
        }
    }

    async loadPRFTypes(category) {
        console.log('loadPRFTypes called with category:', category);
        const typeSelect = document.getElementById('prf_type');
        const typeGroup = document.getElementById('prf-type-group');
        const controlNumberGroup = document.getElementById('control-number-group');
        
        console.log('Elements found:', { typeSelect: !!typeSelect, typeGroup: !!typeGroup, controlNumberGroup: !!controlNumberGroup });
        
        if (!typeSelect || !category) {
            console.log('Early return - no typeSelect or no category');
            typeSelect.innerHTML = '<option value="">Select PRF Type</option>';
            typeGroup.style.display = 'none';
            controlNumberGroup.style.display = 'none';
            return;
        }

        try {
            console.log('Fetching PRF types for category:', category);
            const response = await fetch(`/prf/get-types/?category=${category}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            console.log('Response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('Received data:', data);
                typeSelect.innerHTML = '<option value="">Select PRF Type</option>';
                
                data.types.forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    typeSelect.appendChild(option);
                });

                console.log('Showing type group');
                typeGroup.style.display = 'block';
                this.animateFieldShow(typeGroup);
                
                typeSelect.style.opacity = '0.6';
                setTimeout(() => {
                    typeSelect.style.opacity = '1';
                }, 150);
            } else {
                console.log('Response not ok:', response.status);
            }
        } catch (error) {
            console.error('Error loading PRF types:', error);
            this.showToast('Error loading PRF types', 'error');
        }
    }

    toggleControlNumberField(prfType) {
        const controlNumberGroup = document.getElementById('control-number-group');
        const controlNumberInput = document.getElementById('control_number');
        
        const loanTypes = [
            'pagibig_loan', 'sss_loan', 'medical_loan', 'educational_loan', 'coop_loan'
        ];

        // Emergency Loan doesn't require manual control number (auto-generated)
        if (prfType === 'emergency_loan') {
            controlNumberGroup.style.display = 'none';
            controlNumberInput.required = false;
            controlNumberInput.value = '';
        } else if (loanTypes.includes(prfType)) {
            controlNumberGroup.style.display = 'block';
            controlNumberInput.required = true;
            this.animateFieldShow(controlNumberGroup);
        } else {
            controlNumberGroup.style.display = 'none';
            controlNumberInput.required = false;
            controlNumberInput.value = '';
        }
    }

    animateFieldShow(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 10);
    }

    validateField(field) {
        const value = field.value.trim();
        field.classList.remove('valid', 'invalid');

        if (field.required && !value) {
            field.classList.add('invalid');
            return false;
        } else if (value) {
            field.classList.add('valid');
            return true;
        }
        
        return true;
    }

    validateForm() {
        const form = document.getElementById('prfForm');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async submitPRFRequest() {
        if (!this.validateForm()) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        const form = document.getElementById('prfForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            
            const response = await fetch('/prf/submit/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            const data = await response.json();

            if (data.success) {
                // Check if it's an Emergency Loan that needs the modal
                if (data.show_emergency_loan_modal) {
                    this.prfData = data.prf_data;
                    closeModal('submitPRFModal');
                    form.reset();
                    this.showEmergencyLoanModal();
                } else {
                    this.showToast(data.message, 'success');
                    form.reset();
                    closeModal('submitPRFModal');
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            } else {
                // Check if it's an existing Emergency Loan error
                if (data.show_existing_loan_error && data.message === 'existing_emergency_loan') {
                    closeModal('submitPRFModal');
                    form.reset();
                    // Show existing loan error modal
                    document.getElementById('existing-balance').textContent = `₱${data.current_balance.toLocaleString()}`;
                    openModal('emergencyLoanErrorModal');
                } else {
                    this.showToast(data.message, 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting PRF:', error);
            this.showToast('An error occurred while submitting your request', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
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

    // Emergency Loan Methods
    async showEmergencyLoanModal() {
        // Since we already checked for existing loans during PRF submission,
        // we can proceed directly to setting up the form
        this.setupEmergencyLoanForm();
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('emergency_start_date').setAttribute('min', today);
        
        openModal('emergencyLoanModal');
    }
    
    setupEmergencyLoanForm() {
        const form = document.getElementById('emergencyLoanForm');
        const amountSelect = document.getElementById('emergency_amount');
        const cutoffSelect = document.getElementById('emergency_cutoff');
        const startDateInput = document.getElementById('emergency_start_date');
        const fullNameInput = document.getElementById('employee_full_name');
        const submitBtn = document.getElementById('emergency-loan-submit');
        
        // Reset form
        form.reset();
        cutoffSelect.disabled = true;
        cutoffSelect.innerHTML = '<option value="">Select Amount First</option>';
        submitBtn.disabled = true;
        
        // Handle amount change
        amountSelect.addEventListener('change', async (e) => {
            const amount = e.target.value;
            if (amount) {
                const response = await fetch(`/prf/emergency-loan/cutoff-choices/?amount=${amount}`);
                const data = await response.json();
                
                cutoffSelect.innerHTML = '<option value="">Select Cut-off</option>';
                data.choices.forEach(choice => {
                    cutoffSelect.innerHTML += `<option value="${choice.value}">${choice.text}</option>`;
                });
                cutoffSelect.disabled = false;
            } else {
                cutoffSelect.disabled = true;
                cutoffSelect.innerHTML = '<option value="">Select Amount First</option>';
            }
            this.updateAgreementText();
            this.validateEmergencyLoanForm();
        });
        
        // Handle cutoff change
        cutoffSelect.addEventListener('change', () => {
            this.updateAgreementText();
            this.validateEmergencyLoanForm();
        });
        
        // Handle start date change
        startDateInput.addEventListener('change', () => {
            this.updateAgreementText();
            this.validateEmergencyLoanForm();
        });
        
        // Handle full name change
        fullNameInput.addEventListener('input', () => {
            this.validateEmergencyLoanForm();
        });
        
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEmergencyLoan();
        });
    }
    
    updateAgreementText() {
        const amount = document.getElementById('emergency_amount').value;
        const cutoff = document.getElementById('emergency_cutoff').value;
        const startDate = document.getElementById('emergency_start_date').value;
        
        const deductionSpan = document.getElementById('deduction-amount');
        const startDateSpan = document.getElementById('start-date-display');
        
        if (amount && cutoff) {
            const deduction = (parseInt(amount) / parseInt(cutoff)).toLocaleString('en-US', {
                style: 'currency',
                currency: 'PHP'
            });
            deductionSpan.textContent = deduction;
        } else {
            deductionSpan.textContent = '₱0.00';
        }
        
        if (startDate) {
            const date = new Date(startDate);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            startDateSpan.textContent = formattedDate;
        } else {
            startDateSpan.textContent = '___________';
        }
    }
    
    validateEmergencyLoanForm() {
        const amount = document.getElementById('emergency_amount').value;
        const cutoff = document.getElementById('emergency_cutoff').value;
        const startDate = document.getElementById('emergency_start_date').value;
        const fullName = document.getElementById('employee_full_name').value.trim();
        const submitBtn = document.getElementById('emergency-loan-submit');
        
        // Check if all fields are filled and full name matches exactly
        const expectedName = window.USER_FULL_NAME || '';
        const nameMatches = fullName === expectedName;
        const isValid = amount && cutoff && startDate && nameMatches;
        
        submitBtn.disabled = !isValid;
    }
    
    async submitEmergencyLoan() {
        // Check if current time is past 10:00 AM
        const now = new Date();
        const cutoffTime = new Date();
        cutoffTime.setHours(10, 0, 0, 0); // Set to 10:00 AM today
        
        if (now > cutoffTime) {
            // Show cutoff warning modal
            openModal('emergencyLoanCutoffModal');
            return;
        }
        
        // Proceed with normal submission if before cutoff
        this.performEmergencyLoanSubmission();
    }
    
    async performEmergencyLoanSubmission() {
        const form = document.getElementById('emergencyLoanForm');
        const submitBtn = document.getElementById('emergency-loan-submit');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            // Add PRF data to the form submission
            if (this.prfData) {
                formData.append('prf_data', JSON.stringify(this.prfData));
            }
            
            const response = await fetch('/prf/emergency-loan/submit/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success toast and refresh page
                this.showToast('Emergency Loan request submitted successfully!', 'success');
                closeModal('emergencyLoanModal');
                
                // Refresh page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                if (data.message === 'loan_settled') {
                    this.showToast('Your existing loan is settled. PRF submission cancelled.', 'info');
                    closeModal('emergencyLoanModal');
                } else if (data.message === 'existing_loan_error') {
                    document.getElementById('existing-balance').textContent = `₱${data.current_balance.toLocaleString()}`;
                    closeModal('emergencyLoanModal');
                    openModal('emergencyLoanErrorModal');
                } else {
                    this.showToast(data.message || 'Failed to submit Emergency Loan request', 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting Emergency Loan:', error);
            this.showToast('An error occurred while submitting your request', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Global function to handle proceeding with emergency loan after cutoff warning
function proceedWithEmergencyLoanSubmission() {
    closeModal('emergencyLoanCutoffModal');
    if (window.prfManager) {
        window.prfManager.performEmergencyLoanSubmission();
    }
}

async function viewPRFDetail(prfId) {
    try {
        const response = await fetch(`/prf/detail/${prfId}/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        if (response.ok) {
            const data = await response.json();
            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            set('details-category', data.prf_category);
            set('details-type', data.prf_type);
            set('details-purpose', data.purpose);
            set('details-control-number', data.control_number);
            set('details-remarks', data.admin_remarks);
            set('details-date', data.created_at);
            set('details-created', data.created_at);
            // Status badge logic
            const statusSpan = document.getElementById('details-status-badge');
            if (statusSpan) {
                statusSpan.className = `status-badge prf-status status-${data.status.toLowerCase()}`;
                let icon = '<i class="fas fa-clock"></i>';
                let statusText = 'PENDING';
                if (data.status.toLowerCase() === 'approved') {
                    icon = '<i class="fas fa-check"></i>';
                    statusText = 'APPROVED';
                } else if (data.status.toLowerCase() === 'disapproved') {
                    icon = '<i class="fas fa-times"></i>';
                    statusText = 'DISAPPROVED';
                } else if (data.status.toLowerCase() === 'cancelled') {
                    icon = '<i class="fas fa-ban"></i>';
                    statusText = 'CANCELLED';
                }
                statusSpan.innerHTML = `${icon} <span>${statusText}</span>`;
            }
            // Show/hide cancel button
            const cancelBtn = document.getElementById('cancel-request-btn');
            if (cancelBtn) {
                if (data.status.toLowerCase() === 'pending') {
                    cancelBtn.style.display = '';
                } else {
                    cancelBtn.style.display = 'none';
                }
            }
            // Hide remarks if not present
            const remarksRow = document.getElementById('details-remarks-row');
            if (remarksRow) remarksRow.style.display = data.admin_remarks === 'No remarks' ? 'none' : '';
            // Set prf-id on modal for cancel
            document.getElementById('prfDetailModal').setAttribute('data-prf-id', prfId);
            openModal('prfDetailModal');
        } else {
            window.prfManager.showToast('Error loading PRF details', 'error');
        }
    } catch (error) {
        console.error('Error fetching PRF details:', error);
        window.prfManager.showToast('Error loading PRF details', 'error');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (modalId === 'submitPRFModal') {
        const typeGroup = document.getElementById('prf-type-group');
        const controlNumberGroup = document.getElementById('control-number-group');
        if (typeGroup) typeGroup.style.display = 'none';
        if (controlNumberGroup) controlNumberGroup.style.display = 'none';
        
        const categorySelect = document.getElementById('prf_category');
        if (categorySelect) {
            categorySelect.value = '';
            categorySelect.dispatchEvent(new Event('change'));
        }
    }
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('show');
        modal.classList.remove('closing');
    });
}

function openFilterModal() {
    window.prfManager.showToast('Filter functionality coming soon!', 'info');
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

function toggleFilterPopover() {
    const popover = document.getElementById('filterPopover');
    if (popover) {
        popover.classList.toggle('show');
    }
}

function applyFilter(event) {
    event.preventDefault();
    toggleFilterPopover();
    
    if (!window.prfManager) return;
    
    // Get selected field and value
    const field = document.querySelector('.filter-field-select').value;
    let value = '';
    if (field === 'status' || field === 'category' || field === 'prf_type') {
        const checked = document.querySelector('input[name="filter_value"]:checked');
        value = checked ? checked.value : 'all';
    } else {
        value = document.getElementById('filterValueInput').value.trim().toLowerCase();
    }
    
    // Filter rows based on criteria
    window.prfManager.filteredRows = window.prfManager.allRows.filter(row => {
        if (field === 'status' || field === 'category' || field === 'prf_type') {
            return value === 'all' || row.dataset[field] === value;
        } else {
            // For other fields, do a simple text search
            const text = row.textContent.toLowerCase();
            return text.includes(value);
        }
    });
    
    // Reset to first page and update display
    window.prfManager.currentPage = 1;
    window.prfManager.updatePagination();
    window.prfManager.showCurrentPage();
}

function cancelPRFRequest() {
    const prfId = document.getElementById('prfDetailModal').getAttribute('data-prf-id');
    if (!prfId) return;
    fetch('/prf/cancel-prf/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: `prf_id=${prfId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.prfManager.showToast('PRF request cancelled.', 'success');
            closeModal('prfDetailModal');
            location.reload();
        } else {
            window.prfManager.showToast(data.message || 'Failed to cancel request.', 'error');
        }
    })
    .catch(() => {
        window.prfManager.showToast('Failed to cancel request.', 'error');
    });
}

// Global function for pagination buttons
function changePage(direction) {
    if (window.prfManager) {
        window.prfManager.changePage(direction);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.prfManager = new EmployeePRFManager();

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

    const prfCards = document.querySelectorAll('.prf-request-card');
    prfCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, (index * 100) + 200);
    });

    const fieldSelect = document.querySelector('.filter-field-select');
    const conditionGroup = document.getElementById('filterConditionGroup');
    const valueInput = document.getElementById('filterValueInput');

    function renderRadioOptions(options, name) {
        return options.map(opt =>
            `<label><input type="radio" name="filter_value" value="${opt.value}" ${opt.value === 'all' ? 'checked' : ''}> ${opt.label}</label>`
        ).join('');
    }

    function updateFilterConditionUI() {
        const field = fieldSelect.value;
        if (field === 'status' || field === 'category' || field === 'prf_type') {
            let opts = window.PRF_FILTER_CHOICES[field] || [];
            conditionGroup.innerHTML = renderRadioOptions(opts, 'filter_value');
            conditionGroup.style.display = '';
            valueInput.style.display = 'none';
        } else {
            // Default: show condition radios and value input
            conditionGroup.innerHTML = `
                <label><input type="radio" name="filter_condition" value="is" checked> is</label>
                <label><input type="radio" name="filter_condition" value="is_not"> is not</label>
                <label><input type="radio" name="filter_condition" value="contains"> contains</label>
                <label><input type="radio" name="filter_condition" value="any"> has any value</label>
            `;
            conditionGroup.style.display = '';
            valueInput.style.display = '';
        }
    }

    if (fieldSelect && conditionGroup && valueInput) {
        fieldSelect.addEventListener('change', updateFilterConditionUI);
        updateFilterConditionUI();
    }
});