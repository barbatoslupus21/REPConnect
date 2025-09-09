// Highlight selected radio-option border in export modal
document.addEventListener('DOMContentLoaded', function () {
  const exportModal = document.getElementById('exportReportsModal');
  if (exportModal) {
    const radioOptions = exportModal.querySelectorAll('.radio-option');
    const radios = exportModal.querySelectorAll('input[type="radio"][name="export_type"]');
    function updateSelected() {
      radioOptions.forEach(opt => opt.classList.remove('selected'));
      radios.forEach(radio => {
        if (radio.checked) {
          radio.closest('.radio-option').classList.add('selected');
        }
      });
    }
    radios.forEach(radio => {
      radio.addEventListener('change', updateSelected);
    });
    // Initial highlight
    updateSelected();
  }
});
// Utility to find the nearest scrollable parent
function getScrollableParent(element) {
    let parent = element.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return window;
}

// Utility function to properly close modals
function closeModalProperly(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('closing');
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        return true;
    }
    return false;
}


// Modal mapping for import options
const importModalMap = {
    'payslips_regular': 'regularProbationaryImportModal',
    'payslips_ojt': 'ojtImportModal',
    'loans_principal': 'principalBalanceImportModal',
    'loans_deduction': 'deductionImportModal',
    'allowances': 'allowancesImportModal',
    'savings': 'savingsImportModal'
};

// Setup event listeners for import option buttons to open the correct modal
function setupImportOptionButtons() {
    document.querySelectorAll('.import-btn-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const importType = btn.getAttribute('data-import');
            console.log('Import button clicked:', importType);
            const modalId = importModalMap[importType];
            console.log('Mapped modal ID:', modalId);
            if (modalId) {
                const modal = document.getElementById(modalId);
                console.log('Found modal element:', modal);
                if (modal) {
                    modal.style.display = 'flex';
                    modal.style.opacity = '1';
                    modal.style.visibility = 'visible';
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    console.log('Modal should be visible now');
                } else {
                    console.error('Modal element not found:', modalId);
                }
            } else {
                console.error('No modal mapped for import type:', importType);
            }
            // Hide the popover after selection
            const popover = document.getElementById('importOptionsPopover');
            if (popover) popover.style.display = 'none';
        });
    });
}


document.addEventListener('DOMContentLoaded', function() {
    // Setup import modal triggers for all import option buttons
    setupImportOptionButtons();

    // --- Page Tour for Admin Finance ---
    function startAdminFinanceTour() {
        if (typeof introJs === 'undefined') {
            alert('Tour library (introJs) not loaded.');
            return;
        }
        const steps = [
            {
                intro: '<b>Welcome to the Finance Management Page!</b><br><br>This tour will guide you through the main features. Click <b>Next</b> to begin.',
                position: 'floating'
            },
            {
                element: '.dashboard-stats-container',
                intro: '<b>Statistics Card</b><br>This section displays the total count of employees, payslips, loans, and allowances for the current month.',
                position: 'bottom'
            },
            {
                element: '.chart-card-container',
                intro: '<b>Finance Overview Chart</b><br>A dynamic chart that visualizes the overall trends of loans and allowances.',
                position: 'bottom'
            },
            {
                element: '.chart-filters',
                intro: '<b>Chart Range Filter</b><br>Adjust the date range shown in the chart for better data comparison.',
                position: 'bottom'
            },
            {
                element: '.chart-type-filters',
                intro: '<b>Graph Type Filter</b><br>Toggle between a line graph or a bar graph.',
                position: 'bottom'
            },
            {
                element: '#filterBtn',
                intro: '<b>Chart Filter Button</b><br>Choose whether to display data related to loans or allowances in the chart.',
                position: 'bottom'
            },
            {
                element: '#searchInput',
                intro: '<b>Search Bar</b><br>Quickly find and highlight a specific employee within the financial data table.',
                position: 'bottom'
            },
            {
                element: '#importBtn',
                intro: '<b>Import Button</b><br>Upload employee finance data such as payslips, loans, or allowances.',
                position: 'bottom'
            },
            {
                element: '#importPopover',
                intro: '<b>Import Popover</b><br>Select the type of financial data you want to import.',
                position: 'bottom'
            },
            {
                element: '.employees-table-container',
                intro: '<b>Employee Table</b><br>Displays all employees along with their financial data.',
                position: 'top'
            },
            {
                element: 'a.btn.btn-icon',
                intro: '<b>View Button</b><br>Open and review the detailed financial records of a specific employee.',
                position: 'left'
            },
            {
                element: '.tour-btn',
                intro: 'Click this button anytime to restart the tour and learn about all available features on this page.',
                position: 'left'
            }
        ];
        // Only include steps with available elements (except welcome)
        const filteredSteps = [steps[0]].concat(steps.slice(1).filter(s => s.element));
        introJs()
            .setOptions({
                steps: filteredSteps,
                tooltipClass: 'custom-tour-tooltip',
                showProgress: true,
                showBullets: false,
                showStepNumbers: true,
                nextLabel: 'Next →',
                prevLabel: '← Previous',
                doneLabel: 'Finish Tour',
                skipLabel: 'Skip',
                exitOnOverlayClick: true,
                exitOnEsc: true,
                scrollToElement: true,
                scrollTo: 'tooltip',
                disableInteraction: false
            })
            .start();
    }

    // Bind tour button click event
    const tourBtn = document.querySelector('.tour-btn');
    if (tourBtn) {
        tourBtn.addEventListener('click', function(e) {
            e.preventDefault();
            startAdminFinanceTour();
        });
    }

    // Expose for manual triggering if needed
    window.startAdminFinanceTour = startAdminFinanceTour;
    setupImportOptionButtons();

    // Export Finance Report Modal logic
    const exportBtn = document.getElementById('export-finance-btn');
    const exportModal = document.getElementById('exportReportsModal');
    const exportReportBtn = document.getElementById('exportReportBtn');
    const cancelExportBtn = document.getElementById('cancelExportBtn');
    const closeExportModalBtn = document.getElementById('closeExportModalBtn');
    
    console.log('Export button found:', exportBtn);
    console.log('Export modal found:', exportModal);
    
    if (exportBtn && exportModal) {
        console.log('Adding click event listener to export button');
        exportBtn.addEventListener('click', function(e) {
            console.log('Export button clicked!');
            e.preventDefault();
            exportModal.style.display = 'flex';
            exportModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log('Export modal should now be visible');
        });
        
        // Handle export report button click
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', function() {
                const selectedType = document.querySelector('input[name="export_type"]:checked').value;
                let exportUrl = '';
                
                switch(selectedType) {
                    case 'savings':
                        exportUrl = '/finance/export/employee-savings/';
                        break;
                    case 'loans':
                        exportUrl = '/finance/export/employee-total-loans/';
                        break;
                    case 'allowances':
                        exportUrl = '/finance/export/total-ojt-allowances/';
                        break;
                }
                
                if (exportUrl) {
                    console.log('Redirecting to:', exportUrl);
                    window.location.href = exportUrl;
                    // Close modal
                    exportModal.style.display = 'none';
                    exportModal.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Close modal handlers
        [closeExportModalBtn, cancelExportBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function() {
                    console.log('Closing export modal');
                    exportModal.style.display = 'none';
                    exportModal.classList.remove('show');
                    document.body.style.overflow = '';
                });
            }
        });
        
        // Close on clicking modal overlay
        exportModal.addEventListener('mousedown', function(e) {
            if (e.target === exportModal) {
                console.log('Closing export modal via overlay click');
                exportModal.style.display = 'none';
                exportModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    } else {
        console.error('Export button or modal not found!');
    }

    // Ensure importOptionsPopover always shows when import option is selected
    document.querySelectorAll('#importPopover .import-option').forEach(opt => {
        opt.addEventListener('mouseenter', function() {
            const type = opt.getAttribute('data-type');
            // Show the correct group in the popover
            document.querySelectorAll('#importOptionsPopover .import-options-group').forEach(group => {
                group.style.display = group.getAttribute('data-group') === type ? '' : 'none';
            });
            // Position and show the popover
            const popover = document.getElementById('importOptionsPopover');
            if (popover) {
                popover.style.display = 'block';
            }
        });
        opt.addEventListener('click', function() {
            const type = opt.getAttribute('data-type');
            document.querySelectorAll('#importOptionsPopover .import-options-group').forEach(group => {
                group.style.display = group.getAttribute('data-group') === type ? '' : 'none';
            });
            const popover = document.getElementById('importOptionsPopover');
            if (popover) {
                popover.style.display = 'block';
            }
        });
    });

    // Hide importOptionsPopover when clicking outside
    document.addEventListener('mousedown', function(e) {
        const popover = document.getElementById('importOptionsPopover');
        const importPopover = document.getElementById('importPopover');
        if (popover && !popover.contains(e.target) && importPopover && !importPopover.contains(e.target)) {
            popover.style.display = 'none';
        }
    });

    // Hide importOptionsPopover when a modal is closed
    document.querySelectorAll('.modal-close, .btn.btn-outline').forEach(btn => {
        btn.addEventListener('click', function() {
            const popover = document.getElementById('importOptionsPopover');
            if (popover) popover.style.display = 'none';
        });
    });

    // When a modal is closed, restore body scroll
    document.querySelectorAll('.modal-close, .btn.btn-outline').forEach(btn => {
        btn.addEventListener('click', function() {
            document.body.style.overflow = '';
        });
    });

    // Export Finance Report: form always submits to /finance/export/ (backend dispatches by type)
});
// Generic modal close logic for all modals
document.addEventListener('DOMContentLoaded', function () {
    // Hide modal when clicking .modal-close or .modal-overlay
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });
    document.querySelectorAll('.modal .modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function () {
            const modal = overlay.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });
});

class AdminFinanceModule {
    constructor() {
        this.currentPage = 1;
        this.currentTab = 'loans';
        this.selectedFiles = [];
        this.employeesData = [];
        this.isLoading = false;
        this.chart = null;
        this.currentChartPeriod = 'month';
        this.currentChartType = 'line';
        this.currentFilterCategory = 'loans';
        this.currentFilterType = '';
        this.progressToasts = new Map();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTabSwitching();
        this.loadEmployeesData();
        this.loadDefaultChartData();
        this.initChartWithRetry();
    }

    initChartWithRetry(retryCount = 0) {
        const maxRetries = 5;
        
        if (retryCount >= maxRetries) {
            console.error('Failed to initialize chart after maximum retries');
            return;
        }

        const ctx = document.getElementById('financeChart');
        if (!ctx || !ctx.ownerDocument || !ctx.ownerDocument.body.contains(ctx)) {
            setTimeout(() => this.initChartWithRetry(retryCount + 1), 200);
            return;
        }

        this.initChart();
    }

    async loadDefaultChartData() {
        try {
            const response = await fetch('/finance/filter-options/?category=loans');
            const data = await response.json();
            
            if (data.success && data.options.length > 0) {
                this.currentFilterType = data.options[0];
                setTimeout(() => this.loadChartData(), 500);
            }
        } catch (error) {
            console.error('Error loading default chart data:', error);
        }
    }

    initializeFilterPopover() {
        const categorySelect = document.getElementById('filterCategorySelect');
        if (categorySelect) {
            categorySelect.value = this.currentFilterCategory || 'loans';
            const event = new Event('change');
            categorySelect.dispatchEvent(event);
            
            setTimeout(() => {
                const typeRadios = document.querySelectorAll('input[name="filter_type"]');
                typeRadios.forEach(radio => {
                    if (radio.value === this.currentFilterType) {
                        radio.checked = true;
                    }
                });
            }, 100);
        }
    }
    
    setupEventListeners() {
        this.setupEmployeeActions();
        this.setupPaginationHandlers();
        this.setupSearchHandlers();
        this.setupFilterHandlers();
        this.setupFileUploadHandlers();
        this.setupFormHandlers();
        this.setupModalHandlers();
        this.setupTemplateDownloads();
        this.setupFilterPopover();
        this.setupImportPopover();
        this.setupGlobalFunctions();
    }

    setupEmployeeActions() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-employee-btn');
            if (btn && btn.tagName !== 'A') {
                e.preventDefault();
                const employeeId = btn.dataset.employeeId;
                const dataType = btn.dataset.type;
                this.showEmployeeDetails(employeeId, dataType);
            }
        });
    }

    setupPaginationHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination-btn')) {
                const btn = e.target.closest('.pagination-btn');
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page)) {
                    this.loadEmployeesData(page);
                }
            }
        });
    }

    setupSearchHandlers() {
        const searchInputs = ['#loan-employee-search', '#allowance-employee-search'];
        searchInputs.forEach(selector => {
            const input = document.querySelector(selector);
            if (input) {
                input.addEventListener('input', this.debounce(() => {
                    this.loadEmployeesData(1);
                }, 300));
            }
        });
    }

    setupFilterHandlers() {
        const departmentFilters = ['#loan-department-filter', '#allowance-department-filter'];
        departmentFilters.forEach(selector => {
            const select = document.querySelector(selector);
            if (select) {
                select.addEventListener('change', () => {
                    this.loadEmployeesData(1);
                });
            }
        });

        const employeeTypeSelect = document.getElementById('employee-type-select');
        if (employeeTypeSelect) {
            employeeTypeSelect.addEventListener('change', (e) => {
                this.updateFileUploadHint(e.target.value);
            });
        }
    }

    setupFileUploadHandlers() {
        this.setupUploadArea('payslip-upload-area', 'payslip-files', 'payslip-file-list', 'selectedPayslipFiles', 'payslip-upload-btn');
        this.setupUploadArea('loans-upload-area', 'loans-files', 'loans-file-list', 'selectedLoanFiles', 'loans-upload-btn');
        this.setupUploadArea('allowances-upload-area', 'allowances-files', 'allowances-file-list', 'selectedAllowanceFiles', 'allowances-upload-btn');
        this.setupUploadArea('savings-upload-area', 'savings-files', 'savings-file-list', 'selectedSavingsFiles', 'savings-upload-btn');
    }

    setupFormHandlers() {
        // Principal Balance Upload AJAX & Validation
        const principalBalanceUploadForm = document.getElementById('principal-balance-upload-form');
        if (principalBalanceUploadForm) {
            principalBalanceUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('principal-balance-files');
                let valid = true;
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    this.showToast('Please select an Excel (.xlsx) file to upload.', 'error');
                    valid = false;
                }
                if (!valid) {
                    return false;
                }

                // Close modal immediately when upload starts
                const modal = document.getElementById('principalBalanceImportModal');
                if (modal) {
                    modal.classList.add('closing');
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }

                // Create progress toast with spinner
                const toastId = 'principal-balance-upload-progress-toast';
                const toast = this.createPersistentProgressToast(toastId, 'Uploading Files... (0%)', 'success');

                // Prepare AJAX request
                const formData = new FormData();
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
                const csrfToken = principalBalanceUploadForm.querySelector('[name=csrfmiddlewaretoken]').value;

                const xhr = new XMLHttpRequest();
                xhr.open('POST', principalBalanceUploadForm.action, true);
                xhr.setRequestHeader('X-CSRFToken', csrfToken);

                // Track upload progress
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentage = Math.round((event.loaded / event.total) * 100);
                        this.updateProgressToastProgress(toastId, { 
                            percentage, 
                            message: `Uploading Files... (${percentage}%)` 
                        });
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            
                            // Mark progress as complete
                            this.updateProgressToastProgress(toastId, { 
                                percentage: 100, 
                                message: 'Uploading Files... (100%)' 
                            });

                            // Wait a moment then show result
                            setTimeout(() => {
                                if (data.success) {
                                    // Wait for the progress toast to be automatically closed (at 100%)
                                    // Then show success toast after it's fully removed
                                    setTimeout(() => {
                                        this.showToast('Upload successful!', 'success');
                                        principalBalanceUploadForm.reset();
                                    }, 650); // 650ms total delay: 300ms for progress toast close + 350ms buffer
                                } else {
                                    this.updateProgressToastError(toastId, 'Upload failed. Some active loans can\'t be added', data);
                                    // Auto-download successfully added loans as Excel (CSV)
                                    setTimeout(() => {
                                        if (data.added_loans && Array.isArray(data.added_loans) && data.added_loans.length > 0) {
                                            this.downloadErrorRowsExcel(data.added_loans);
                                        }
                                    }, 500);
                                }
                            }, 500);
                        } catch (e) {
                            this.updateProgressToastError(toastId, 'Upload failed. Invalid response format.', null);
                        }
                    } else {
                        this.updateProgressToastError(toastId, 'Upload failed. Server error occurred.', null);
                    }
                };

                xhr.onerror = () => {
                    this.updateProgressToastError(toastId, 'Upload failed. Network error occurred.', null);
                };

                xhr.send(formData);
            });
        }

        // Deduction Upload AJAX & Validation
        const deductionUploadForm = document.getElementById('deduction-upload-form');
        if (deductionUploadForm) {
            deductionUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const cutoffDateInput = document.getElementById('deduction-cutoff-date');
                const fileInput = document.getElementById('deduction-files');
                let valid = true;

                // Clear previous errors
                document.getElementById('deduction-cutoff-date-error').style.display = 'none';

                // Validate cutoff date
                if (!cutoffDateInput || !cutoffDateInput.value.trim()) {
                    document.getElementById('deduction-cutoff-date-error').style.display = 'block';
                    document.getElementById('deduction-cutoff-date-error').querySelector('.error-text').textContent = 'Cutoff date is required.';
                    valid = false;
                }

                // Validate file selection
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    this.showToast('Please select Excel (.xlsx, .xls) or CSV files to upload.', 'error');
                    valid = false;
                }

                if (!valid) {
                    return false;
                }

                // Close modal immediately when upload starts
                const modal = document.getElementById('deductionImportModal');
                if (modal) {
                    modal.classList.add('closing');
                    modal.classList.remove('show');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }

                // Create progress toast with spinner
                const toastId = 'deduction-upload-progress-toast';
                const toast = this.createPersistentProgressToast(toastId, 'Uploading Files... (0%)', 'success');

                // Prepare AJAX request
                const formData = new FormData();
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
                formData.append('cutoff_date', cutoffDateInput.value);
                const csrfToken = deductionUploadForm.querySelector('[name=csrfmiddlewaretoken]').value;

                const xhr = new XMLHttpRequest();
                xhr.open('POST', deductionUploadForm.action, true);
                xhr.setRequestHeader('X-CSRFToken', csrfToken);

                // Track upload progress
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentage = Math.round((event.loaded / event.total) * 100);
                        this.updateProgressToastProgress(toastId, { 
                            percentage, 
                            message: `Uploading Files... (${percentage}%)` 
                        });
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            
                            // Mark progress as complete
                            this.updateProgressToastProgress(toastId, { 
                                percentage: 100, 
                                message: 'Uploading Files... (100%)' 
                            });

                            // Wait a moment then show result
                            setTimeout(() => {
                                if (data.success) {
                                    // Wait for the progress toast to be automatically closed (at 100%)
                                    // Then show success toast after it's fully removed
                                    setTimeout(() => {
                                        this.showToast('Upload successful!', 'success');
                                        deductionUploadForm.reset();
                                    }, 650); // 650ms total delay: 300ms for progress toast close + 350ms buffer
                                } else {
                                    this.updateProgressToastError(toastId, 'Upload failed. Some deductions can\'t be added', data);
                                    // Auto-download successfully added deductions as Excel (CSV)
                                    setTimeout(() => {
                                        if (data.added_deductions && Array.isArray(data.added_deductions) && data.added_deductions.length > 0) {
                                            this.downloadErrorRowsExcel(data.added_deductions, 'deduction');
                                        }
                                    }, 500);
                                }
                            }, 500);
                        } catch (e) {
                            this.updateProgressToastError(toastId, 'Upload failed. Invalid response format.', null);
                        }
                    } else {
                        this.updateProgressToastError(toastId, 'Upload failed. Server error occurred.', null);
                    }
                };

                xhr.onerror = () => {
                    this.updateProgressToastError(toastId, 'Upload failed. Network error occurred.', null);
                };

                xhr.send(formData);
            });
        }

        // Loans upload
        const loansUploadForm = document.getElementById('loans-upload-form');
        if (loansUploadForm) {
            loansUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission('loans');
            });
        }

        // Allowances upload (unchanged)
        const allowancesUploadForm = document.getElementById('allowances-upload-form');
        if (allowancesUploadForm) {
            allowancesUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission('allowances');
            });
        }

        // Savings upload - direct form submission
        const savingsUploadForm = document.getElementById('savings-upload-form');
        if (savingsUploadForm) {
            savingsUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('savings-files');
                
                if (!fileInput.files.length) {
                    window.portalUI.showNotification('Please select a file to upload', 'warning');
                    return;
                }

                const formData = new FormData(savingsUploadForm);
                formData.set('file', fileInput.files[0]); // Use single file

                const xhr = new XMLHttpRequest();
                xhr.open('POST', savingsUploadForm.action, true);
                xhr.setRequestHeader('X-CSRFToken', this.getCSRFToken());

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                window.portalUI.showNotification(response.message, 'success');
                                if (response.redirect_url) {
                                    setTimeout(() => {
                                        window.location.href = response.redirect_url;
                                    }, 1000);
                                }
                            } else {
                                window.portalUI.showNotification(response.message, 'error');
                            }
                        } catch (e) {
                            window.portalUI.showNotification('Upload completed successfully', 'success');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        }
                    } else {
                        window.portalUI.showNotification('Upload failed. Please try again.', 'error');
                    }
                    
                    // Close modal using the proper function
                    const modal = document.getElementById('savingsImportModal');
                    if (modal) {
                        modal.classList.add('closing');
                        modal.classList.remove('show');
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                        // Reset form
                        savingsUploadForm.reset();
                        const fileInput = document.getElementById('savings-files');
                        if (fileInput) fileInput.value = '';
                    }
                };

                xhr.onerror = () => {
                    window.portalUI.showNotification('Upload failed. Please check your connection.', 'error');
                    
                    // Close modal on error as well
                    const modal = document.getElementById('savingsImportModal');
                    if (modal) {
                        modal.classList.add('closing');
                        modal.classList.remove('show');
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                };

                xhr.send(formData);
            });
        }

        // OJT Payslip Upload AJAX & Validation
        const ojtUploadForm = document.getElementById('ojt-upload-form');
        if (ojtUploadForm) {
            ojtUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const cutoffDateInput = document.getElementById('ojt-cutoff-date');
                const fileInput = document.getElementById('ojt-files');
                let valid = true;
                if (!cutoffDateInput || !cutoffDateInput.value) {
                    this.showToast('Please select a cutoff date.', 'error');
                    valid = false;
                }
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    this.showToast('Please select at least one Excel/CSV file to upload.', 'error');
                    valid = false;
                }
                if (!valid) {
                    return false;
                }

                // Prepare AJAX request
                const formData = new FormData();
                formData.append('cutoff_date', cutoffDateInput.value);
                for (let i = 0; i < fileInput.files.length; i++) {
                    formData.append('files', fileInput.files[i]);
                }
                const csrfToken = ojtUploadForm.querySelector('[name=csrfmiddlewaretoken]').value;

                fetch(ojtUploadForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': csrfToken
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        this.showToast('Payslips uploaded successfully!', 'success');
                        ojtUploadForm.reset();
                        // Close modal if present
                        const modal = document.getElementById('ojtImportModal');
                        if (modal) {
                            modal.classList.add('closing');
                            modal.classList.remove('show');
                            modal.style.display = 'none';
                            document.body.style.overflow = '';
                        }
                    } else {
                        this.showToast("Upload failed. Some active loans can't be added.", 'warning');
                    }
                })
                .catch(error => {
                    this.showToast('Upload failed. Please try again later.', 'warning');
                });
            });
        }
    }

    setupModalHandlers() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('offcanvas-overlay')) {
                const offcanvas = e.target.closest('.offcanvas');
                if (offcanvas) this.closeOffcanvas(offcanvas.id);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openOffcanvas = document.querySelector('.offcanvas.show');
                if (openOffcanvas) this.closeOffcanvas(openOffcanvas.id);
            }
        });

        const cancelButtons = [
            'cancelPayslipImportBtn',
            'cancelLoanImportBtn', 
            'cancelAllowanceImportBtn',
            'cancelSavingsImportBtn'
        ];
        
        cancelButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.resetForm(btnId.replace('cancel', '').replace('ImportBtn', ''));
                });
            }
        });
    }

    setupTemplateDownloads() {
        const templateButtons = [
            'exportPayslipTemplateBtn',
            'exportLoanTemplateBtn',
            'exportAllowanceTemplateBtn'
        ];
        
        templateButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.downloadTemplate(btnId.replace('export', '').replace('TemplateBtn', ''));
                });
            }
        });
    }

    setupFilterPopover() {
        const filterBtn = document.getElementById('filterBtn');
        const filterPopover = document.getElementById('filterPopover');
        
        if (filterBtn && filterPopover) {
            const newFilterBtn = filterBtn.cloneNode(true);
            filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
            
            newFilterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filterPopover.classList.toggle('show');
                
                if (filterPopover.classList.contains('show')) {
                    this.initializeFilterPopover();
                }
            });
            
            this._documentClickHandler = (e) => {
                if (!filterPopover.contains(e.target) && e.target !== newFilterBtn) {
                    filterPopover.classList.remove('show');
                }
            };
            
            this._documentKeydownHandler = (e) => {
                if (e.key === 'Escape') {
                    filterPopover.classList.remove('show');
                }
            };
            
            document.addEventListener('click', this._documentClickHandler);
            document.addEventListener('keydown', this._documentKeydownHandler);
        }
    }

    setupImportPopover() {
        const importBtn = document.getElementById('importBtn');
        const importPopover = document.getElementById('importPopover');
        
        if (importBtn && importPopover) {
            importBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                importPopover.classList.toggle('show');
            });
            
            document.addEventListener('click', (e) => {
                if (!importPopover.contains(e.target) && e.target !== importBtn) {
                    importPopover.classList.remove('show');
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    importPopover.classList.remove('show');
                }
            });
        }
    }

    setupGlobalFunctions() {
        window.applyFilter = (event) => {
            event.preventDefault();
            const form = event.target;
            const categorySelect = form.querySelector('#filterCategorySelect');
            const typeRadios = form.querySelectorAll('input[name="filter_type"]');
            
            let selectedType = '';
            typeRadios.forEach(radio => {
                if (radio.checked) {
                    selectedType = radio.value;
                }
            });
            
            const filterData = {
                category: categorySelect.value,
                type: selectedType
            };
            
            if (window.adminFinance) {
                window.adminFinance.currentFilterCategory = filterData.category;
                window.adminFinance.currentFilterType = filterData.type;
                window.adminFinance.loadChartData();
            }
            
            const filterPopover = document.getElementById('filterPopover');
            if (filterPopover) {
                filterPopover.classList.remove('show');
            }
            
            this.showToast('Filter applied successfully', 'success');
        };

        window.closeFilterPopover = () => {
            const filterPopover = document.getElementById('filterPopover');
            if (filterPopover) {
                filterPopover.classList.remove('show');
            }
        };

        window.closeImportPopover = () => {
            const importPopover = document.getElementById('importPopover');
            if (importPopover) {
                importPopover.classList.remove('show');
            }
        };

        window.updateFinanceChartPeriod = (period) => {
            if (window.adminFinance) {
                window.adminFinance.updateChartPeriod(period);
            }
        };

        window.switchFinanceChartType = (type) => {
            if (window.adminFinance) {
                window.adminFinance.switchChartType(type);
            }
        };

        window.updateFilterOptions = async () => {
            const categorySelect = document.getElementById('filterCategorySelect');
            const typeSection = document.getElementById('filterTypeSection');
            const typeOptions = document.getElementById('filterTypeOptions');
            
            if (!categorySelect || !typeSection || !typeOptions) return;
            
            const category = categorySelect.value;
            
            if (!category) {
                typeSection.style.display = 'none';
                return;
            }
            
            try {
                const response = await fetch(`/finance/filter-options/?category=${category}`);
                const data = await response.json();
                
                if (data.success) {
                    typeOptions.innerHTML = '';
                    
                    data.options.forEach((option, index) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'filter-type-option';
                        optionDiv.innerHTML = `
                            <input type="radio" name="filter_type" value="${option}" id="type_${option}" ${index === 0 ? 'checked' : ''}>
                            <label for="type_${option}">${option}</label>
                        `;
                        typeOptions.appendChild(optionDiv);
                    });
                    
                    typeSection.style.display = 'block';
                    
                    if (window.adminFinance && window.adminFinance.currentFilterType) {
                        const currentTypeRadio = document.querySelector(`input[name="filter_type"][value="${window.adminFinance.currentFilterType}"]`);
                        if (currentTypeRadio) {
                            currentTypeRadio.checked = true;
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading filter options:', error);
            }
        };

        const filterConditionRadios = document.querySelectorAll('input[name="filter_condition"]');
        const filterValueInput = document.getElementById('filterValueInput');
        
        if (filterConditionRadios.length > 0 && filterValueInput) {
            filterConditionRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'any') {
                        filterValueInput.style.display = 'none';
                        filterValueInput.value = '';
                    } else {
                        filterValueInput.style.display = 'block';
                    }
                });
            });
        }
    }
    
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                    
                    if (targetTab.includes('admin')) {
                        this.currentTab = targetTab.replace('-admin', '');
                        this.loadEmployeesData(1);
                    }
                }
            });
        });
    }
    
    setupUploadArea(areaId, inputId, listId, selectedFilesId, uploadBtnId) {
        const fileInput = document.getElementById(inputId);
        const fileUploadArea = document.getElementById(areaId);
        const fileList = document.getElementById(listId);
        const selectedFilesContainer = document.getElementById(selectedFilesId);
        const uploadBtn = document.getElementById(uploadBtnId);
        
        if (!fileInput || !fileUploadArea) return;
        
        // Store files specific to this upload area
        if (!fileInput._selectedFiles) {
            fileInput._selectedFiles = [];
        }
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelection(files, fileInput, listId, selectedFilesContainer, uploadBtn);
        });
        
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileSelection(files, fileInput, listId, selectedFilesContainer, uploadBtn);
        });
    }
    
    handleFileSelection(files, fileInput, listId, selectedFilesContainer, uploadBtn) {
        const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.csv'];
        
        if (!fileInput._selectedFiles) {
            fileInput._selectedFiles = [];
        }
        
        files.forEach(file => {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (validExtensions.includes(ext)) {
                if (!fileInput._selectedFiles.find(f => f.name === file.name)) {
                    fileInput._selectedFiles.push(file);
                }
            } else {
                this.showToast(`Invalid file type: ${file.name}`, 'error');
            }
        });
        
        this.updateFileList(listId, selectedFilesContainer, uploadBtn, fileInput);
    }
    
    updateFileList(listId, selectedFilesContainer, uploadBtn, fileInput) {
        const fileList = document.getElementById(listId);
        if (!fileList || !fileInput) return;
        
        if (!fileInput._selectedFiles) {
            fileInput._selectedFiles = [];
        }
        
        fileList.innerHTML = '';
        
        fileInput._selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file file-icon"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${this.formatFileSize(file.size)})</span>
                </div>
                <button type="button" class="file-remove" onclick="adminFinance.removeFile(${index}, '${listId}', '${selectedFilesContainer?.id || 'null'}', '${uploadBtn?.id || 'null'}', '${fileInput.id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });
        
        if (selectedFilesContainer) {
            selectedFilesContainer.style.display = fileInput._selectedFiles.length > 0 ? 'block' : 'none';
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = fileInput._selectedFiles.length === 0;
        }
    }
    
    removeFile(index, listId, selectedFilesContainerId, uploadBtnId, fileInputId) {
        const fileInput = document.getElementById(fileInputId);
        const selectedFilesContainer = selectedFilesContainerId !== 'null' ? document.getElementById(selectedFilesContainerId) : null;
        const uploadBtn = uploadBtnId !== 'null' ? document.getElementById(uploadBtnId) : null;
        
        if (fileInput && fileInput._selectedFiles) {
            fileInput._selectedFiles.splice(index, 1);
            this.updateFileList(listId, selectedFilesContainer, uploadBtn, fileInput);
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    updateFileUploadHint(employeeType) {
        const hint = document.getElementById('file-format-hint');
        if (!hint) return;
        
        if (employeeType === 'ojt') {
            hint.textContent = 'Select XLSX file for OJT employees';
        } else {
            hint.textContent = 'Select PDF/JPG/PNG files for Regular employees';
        }
    }

    downloadTemplate(type) {
        const templates = {
            'Payslip': '/finance/template/payslip/',
            'Loan': '/finance/template/loan/',
            'Allowance': '/finance/template/allowance/'
        };
        
        const url = templates[type];
        if (url) {
            window.open(url, '_blank');
        } else {
            this.showToast('Template not available', 'error');
        }
    }
    
    handleFormSubmission(type) {
        let form, uploadBtn, listId, fileInput;

        switch (type) {
            case 'loans':
                form = document.getElementById('loans-upload-form');
                uploadBtn = document.getElementById('loans-upload-btn');
                listId = 'loans-file-list';
                fileInput = document.getElementById('loans-files');
                break;
            case 'allowances':
                form = document.getElementById('allowances-upload-form');
                uploadBtn = document.getElementById('allowances-upload-btn');
                listId = 'allowances-file-list';
                fileInput = document.getElementById('allowances-files');
                break;
            default:
                return;
        }

        if (!form || !fileInput || !fileInput._selectedFiles || fileInput._selectedFiles.length === 0) {
            window.portalUI.showNotification('Please select files to upload', 'warning');
            return;
        }

        // Prepare form data for upload
        const formData = new FormData(form);
        formData.delete('files');
        fileInput._selectedFiles.forEach(file => {
            formData.append('files', file);
        });

        const toastId = `${type}-upload-progress-toast`;
        const toast = this.createPersistentProgressToast(toastId, `Uploading ${type}: 0%`, 'success');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', form.action, true);
        xhr.setRequestHeader('X-CSRFToken', this.getCSRFToken());

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentage = Math.round((event.loaded / event.total) * 100);
                this.updateProgressToastProgress(toastId, { 
                    percentage, 
                    message: `Uploading ${type}: ${percentage}%` 
                });
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    // Mark progress as complete first
                    this.updateProgressToastProgress(toastId, { 
                        percentage: 100, 
                        message: `Uploading ${type}: 100%` 
                    });
                    // Wait a moment then show result based on server response
                    setTimeout(() => {
                        if (data.success) {
                            // Wait for progress toast to auto-close, then show success toast
                            setTimeout(() => {
                                this.showToast('Upload successful!', 'success');
                                this.resetForm(type);
                            }, 350); // 350ms delay to ensure DOM update and no overlap
                        } else {
                            // Always show the persistent error toast for any failed loan upload
                            this.updateProgressToastError(
                                toastId,
                                'Upload failed. Some active loans can\'t be added',
                                data
                            );
                            // Auto-download successfully added loans as Excel (CSV)
                            setTimeout(() => {
                                if (data.added_loans && Array.isArray(data.added_loans) && data.added_loans.length > 0) {
                                    this.downloadErrorRowsExcel(data.added_loans);
                                }
                            }, 500);
                        }
                    }, 500);
                } catch (e) {
                    this.updateProgressToastError(toastId, 'Upload failed. Invalid response format.', null);
                }
            } else {
                this.updateProgressToastError(toastId, 'Upload failed. Server error occurred.', null);
            }
        };

        xhr.onerror = () => {
            this.updateProgressToastError(toastId, 'Upload failed: A network error occurred.');
        };

        xhr.send(formData);
    }
    
    resetForm(type) {
        let form, fileInput, listId, selectedFilesContainer, uploadBtn, modal;
        
        switch (type) {
            case 'payslip':
                form = document.getElementById('payslip-upload-form');
                fileInput = document.getElementById('payslip-files');
                listId = 'payslip-file-list';
                selectedFilesContainer = document.getElementById('selectedPayslipFiles');
                uploadBtn = document.getElementById('payslip-upload-btn');
                modal = document.getElementById('payslipImportModal');
                break;
            case 'loans':
                form = document.getElementById('loans-upload-form');
                fileInput = document.getElementById('loans-files');
                listId = 'loans-file-list';
                selectedFilesContainer = document.getElementById('selectedLoanFiles');
                uploadBtn = document.getElementById('loans-upload-btn');
                modal = document.getElementById('loansImportModal');
                break;
            case 'allowances':
                form = document.getElementById('allowances-upload-form');
                fileInput = document.getElementById('allowances-files');
                listId = 'allowances-file-list';
                selectedFilesContainer = document.getElementById('selectedAllowanceFiles');
                uploadBtn = document.getElementById('allowances-upload-btn');
                modal = document.getElementById('allowancesImportModal');
                break;
            case 'savings':
                form = document.getElementById('savings-upload-form');
                fileInput = document.getElementById('savings-files');
                listId = 'savings-file-list';
                selectedFilesContainer = document.getElementById('selectedSavingsFiles');
                uploadBtn = document.getElementById('savings-upload-btn');
                modal = document.getElementById('savingsImportModal');
                break;
            default:
                return;
        }
        
        if (form) {
            form.reset();
        }
        
        if (fileInput) {
            fileInput._selectedFiles = [];
            fileInput.value = '';
        }
        
        this.updateFileList(listId, selectedFilesContainer, uploadBtn, fileInput);
        
        if (modal) {
            modal.classList.add('closing');
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    async loadEmployeesData(page = 1) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.currentPage = page;
        
        const searchTerm = this.getSearchTerm();
        const department = this.getDepartmentFilter();
        
        this.showLoadingState(true);
        
        try {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            const params = new URLSearchParams({
                page: page,
                search: searchTerm,
                department: department
            });
            if (activeTab === 'loans-admin') {
                params.append('tab', 'loans');
            }
            
            const response = await fetch(`/finance/employees/?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.employeesData = data.employees;
                this.updateEmployeesTable();
                this.updatePagination(data);
            } else {
                this.showToast('Failed to load employees data', 'error');
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            this.showToast('Error loading employees data', 'error');
        } finally {
            this.isLoading = false;
            this.showLoadingState(false);
        }
    }
    
    getSearchTerm() {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        let searchInput;
        
        if (activeTab === 'loans-admin') {
            searchInput = document.getElementById('loan-employee-search');
        } else if (activeTab === 'allowances-admin') {
            searchInput = document.getElementById('allowance-employee-search');
        }
        
        return searchInput ? searchInput.value.trim() : '';
    }
    
    getDepartmentFilter() {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        let departmentSelect;
        
        if (activeTab === 'loans-admin') {
            departmentSelect = document.getElementById('loan-department-filter');
        } else if (activeTab === 'allowances-admin') {
            departmentSelect = document.getElementById('allowance-department-filter');
        }
        
        return departmentSelect ? departmentSelect.value : '';
    }
    
    showLoadingState(show) {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        let loadingElement;
        
        if (activeTab === 'loans-admin') {
            loadingElement = document.getElementById('loans-loading');
        } else if (activeTab === 'allowances-admin') {
            loadingElement = document.getElementById('allowances-loading');
        }
        
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }
    
    updateEmployeesTable() {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        let tbody;
        
        if (activeTab === 'loans-admin') {
            tbody = document.getElementById('loans-employees-tbody');
        } else if (activeTab === 'allowances-admin') {
            tbody = document.getElementById('allowances-employees-tbody');
        }
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.employeesData.forEach(employee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.idnumber || '-'}</td>
                <td>${employee.name}</td>
                <td>${employee.department}</td>
                <td>${employee.employment_type}</td>
                <td>
                    <button class="btn btn-primary btn-sm view-employee-btn" 
                            data-employee-id="${employee.id}" 
                            data-type="${this.currentTab}">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    updatePagination(data) {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        let paginationContainer;
        
        if (activeTab === 'loans-admin') {
            paginationContainer = document.getElementById('loans-pagination');
        } else if (activeTab === 'allowances-admin') {
            paginationContainer = document.getElementById('allowances-pagination');
        }
        
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        const prevBtn = document.createElement('button');
        prevBtn.className = `pagination-btn ${!data.has_previous ? 'disabled' : ''}`;
        prevBtn.disabled = !data.has_previous;
        prevBtn.dataset.page = data.page_number - 1;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        paginationContainer.appendChild(prevBtn);
        
        const startPage = Math.max(1, data.page_number - 2);
        const endPage = Math.min(data.total_pages, data.page_number + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === data.page_number ? 'active' : ''}`;
            pageBtn.dataset.page = i;
            pageBtn.textContent = i;
            paginationContainer.appendChild(pageBtn);
        }
        
        const nextBtn = document.createElement('button');
        nextBtn.className = `pagination-btn ${!data.has_next ? 'disabled' : ''}`;
        nextBtn.disabled = !data.has_next;
        nextBtn.dataset.page = data.page_number + 1;
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        paginationContainer.appendChild(nextBtn);
        
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.textContent = `Page ${data.page_number} of ${data.total_pages} (${data.total_count} total)`;
        paginationContainer.appendChild(pageInfo);
    }
    
    async showEmployeeDetails(employeeId, dataType) {
        const offcanvas = document.getElementById('employeeDetailsOffcanvas');
        const title = document.getElementById('employee-details-title');
        const content = document.getElementById('employee-details-content');
        
        if (!offcanvas || !title || !content) return;
        
        title.textContent = `Employee ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
        content.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading employee details...</p></div>';
        
        this.openOffcanvas('employeeDetailsOffcanvas');
        
        try {
            const endpoint = dataType === 'loans' ? 'loans' : 'allowances';
            const response = await fetch(`/finance/employee/${employeeId}/${endpoint}/`);
            const data = await response.json();
            
            if (data.success) {
                this.renderEmployeeDetails(data, dataType);
            } else {
                content.innerHTML = `<div class="empty-state"><p>${data.message || 'Failed to load data'}</p></div>`;
            }
        } catch (error) {
            console.error('Error loading employee details:', error);
            content.innerHTML = '<div class="empty-state"><p>Error loading data</p></div>';
        }
    }
    
    renderEmployeeDetails(data, dataType) {
        const content = document.getElementById('employee-details-content');
        if (!content) return;
        
        let html = `
            <div class="employee-info">
                <h4>${data.employee.name}</h4>
                <p>ID: ${data.employee.idnumber}</p>
            </div>
        `;
        
        const groups = dataType === 'loans' ? data.loan_groups : data.allowance_groups;
        
        if (Object.keys(groups).length === 0) {
            html += `<div class="empty-state"><p>No ${dataType} found for this employee.</p></div>`;
        } else {
            Object.entries(groups).forEach(([groupName, records]) => {
                html += `
                    <div class="records-section">
                        <h5>${groupName}</h5>
                `;
                
                records.forEach(record => {
                    if (dataType === 'loans') {
                        html += `
                            <div class="record-item">
                                <div class="record-header">
                                    <span class="record-amount">₱${parseFloat(record.amount).toLocaleString()}</span>
                                    <span class="status-badge ${record.status}">${record.status}</span>
                                </div>
                                <div class="record-details">
                                    <div class="record-detail">
                                        <span class="label">Balance:</span>
                                        <span class="value">₱${parseFloat(record.balance).toLocaleString()}</span>
                                    </div>
                                    <div class="record-detail">
                                        <span class="label">Monthly:</span>
                                        <span class="value">₱${parseFloat(record.monthly_deduction).toLocaleString()}</span>
                                    </div>
                                    <div class="record-detail">
                                        <span class="label">Date Issued:</span>
                                        <span class="value">${new Date(record.date_issued).toLocaleDateString()}</span>
                                    </div>
                                    <div class="record-detail">
                                        <span class="label">Terms:</span>
                                        <span class="value">${record.terms_months} months</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="record-item">
                                <div class="record-header">
                                    <span class="record-amount">₱${parseFloat(record.amount).toLocaleString()}</span>
                                    <span class="status-badge ${record.is_active ? 'active' : 'inactive'}">
                                        ${record.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div class="record-details">
                                    <div class="record-detail">
                                        <span class="label">Frequency:</span>
                                        <span class="value">${record.frequency}</span>
                                    </div>
                                    <div class="record-detail">
                                        <span class="label">Start Date:</span>
                                        <span class="value">${new Date(record.start_date).toLocaleDateString()}</span>
                                    </div>
                                    <div class="record-detail">
                                        <span class="label">End Date:</span>
                                        <span class="value">${record.end_date ? new Date(record.end_date).toLocaleDateString() : 'Ongoing'}</span>
                                    </div>
                                    ${record.description ? `
                                    <div class="record-detail" style="grid-column: 1 / -1;">
                                        <span class="label">Description:</span>
                                        <span class="value">${record.description}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }
                });
                
                html += '</div>';
            });
        }
        
        content.innerHTML = html;
    }
    
    openOffcanvas(offcanvasId) {
        const offcanvas = document.getElementById(offcanvasId);
        if (offcanvas) {
            offcanvas.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeOffcanvas(offcanvasId) {
        const offcanvas = document.getElementById(offcanvasId);
        if (offcanvas) {
            offcanvas.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    showToast(message, type = 'info') {
        if (window.portalUI && window.portalUI.showNotification) {
            // Use the portal UI notification system with auto-close duration
            window.portalUI.showNotification(message, type, 10000);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }
    
    getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }
    
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

    initChart() {
        const ctx = document.getElementById('financeChart');
        if (!ctx || !ctx.ownerDocument || !ctx.ownerDocument.body.contains(ctx)) {
            return;
        }

        const chartContainer = ctx.closest('.chart-container');
        if (chartContainer && chartContainer.offsetParent === null) {
            return;
        }

        try {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }

            const existingChart = Chart.getChart(ctx);
            if (existingChart) {
                existingChart.destroy();
            }

            this.chart = new Chart(ctx, {
                type: this.currentChartType,
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Finance Overview'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            this.loadChartData();
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    }

    async loadChartData() {
        try {
            if (!this.chart) {
                return;
            }

            if (!this.currentFilterCategory) {
                this.currentFilterCategory = 'loans';
            }

            const params = new URLSearchParams({
                category: this.currentFilterCategory,
                type: this.currentFilterType,
                period: this.currentChartPeriod
            });

            const response = await fetch(`/finance/chart-data/?${params}`);
            const data = await response.json();

            if (data.success && this.chart) {
                this.chart.data.labels = data.chart_data.labels;
                this.chart.data.datasets = data.chart_data.datasets;
                
                let title = 'Finance Overview';
                if (this.currentFilterCategory === 'loans') {
                    title = this.currentFilterType ? `${this.currentFilterType} Loans` : 'All Loans';
                } else if (this.currentFilterCategory === 'allowances') {
                    title = this.currentFilterType ? `${this.currentFilterType} Allowances` : 'All Allowances';
                }
                this.chart.options.plugins.title.text = title;
                
                this.chart.update();
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }

    updateChartPeriod(period) {
        this.currentChartPeriod = period;
        
        const chartFilters = document.querySelector('.chart-filters');
        const filterBtns = document.querySelectorAll('.chart-filters .filter-btn');
        
        filterBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        if (chartFilters) {
            chartFilters.classList.add('has-active');
            const activeIndex = Array.from(filterBtns).findIndex(btn => btn.getAttribute('data-period') === period);
            chartFilters.className = chartFilters.className.replace(/slide-\d/g, '');
            chartFilters.classList.add(`slide-${activeIndex}`);
        }
        
        this.loadChartData();
    }

    switchChartType(type) {
        this.currentChartType = type;
        
        const chartTypeFilters = document.querySelector('.chart-type-filters');
        const chartTypeBtns = document.querySelectorAll('.chart-type-filters .chart-type-btn');
        
        chartTypeBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        if (chartTypeFilters) {
            chartTypeFilters.classList.add('has-active');
            const activeIndex = Array.from(chartTypeBtns).findIndex(btn => btn.getAttribute('data-type') === type);
            chartTypeFilters.className = chartTypeFilters.className.replace(/slide-\d/g, '');
            chartTypeFilters.classList.add(`slide-${activeIndex}`);
        }
        
        this.initChart();
    }

    destroyChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        const ctx = document.getElementById('financeChart');
        if (ctx) {
            const existingChart = Chart.getChart(ctx);
            if (existingChart) {
                existingChart.destroy();
            }
        }
    }

    createPersistentProgressToast(toastId, message, type = 'success') {
        let toast = null;
        if (window.portalUI && window.portalUI.createPersistentProgressToast) {
            toast = window.portalUI.createPersistentProgressToast('', type);
            // Replace content with spinner and message
            if (toast) {
                toast.innerHTML = `
                    <div class="d-flex align-items-center">
                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span class="message-text">${message}</span>
                    </div>
                `;
                // Ensure correct background for warning toasts
                if (type === 'warning') {
                    toast.className = 'toast toast-warning persistent-toast';
                }
            }
        }
        this.progressToasts.set(toastId, {
            element: toast,
            percentage: 0,
            isCompleted: false,
            completedAt: null,
            shownAt: Date.now(),
            closeTimeout: null
        });
        return toast;
    }

    updateProgressToastProgress(toastId, data) {
        const toastData = this.progressToasts.get(toastId);
        if (!toastData || !toastData.element) return;

        // Show spinner and updating message
        const messageEl = toastData.element.querySelector('.message-text');
        if (messageEl) {
            messageEl.textContent = data.message || `Uploading Files... (${data.percentage || 0}%)`;
        }
        const spinner = toastData.element.querySelector('.spinner-border');
        if (spinner) {
            spinner.style.display = '';
        }

        if (data.percentage !== undefined) {
            toastData.percentage = data.percentage;
            // Keep progress toast visible until 100% - no auto-close during upload
            if (data.percentage < 100) {
                // Clear any existing timeout while uploading
                if (toastData.closeTimeout) {
                    clearTimeout(toastData.closeTimeout);
                    toastData.closeTimeout = null;
                }
            } else if (data.percentage >= 100) {
                // At 100%, automatically close the progress toast
                toastData.closeTimeout = setTimeout(() => {
                    this.removeProgressToast(toastId);
                }, 300); // 300ms delay to show 100% briefly before closing
            }
        }
    }

    updateProgressToastSuccess(toastId, message) {
        const toastData = this.progressToasts.get(toastId);
        if (!toastData || !toastData.element) return;

        // Hide spinner and show success message
        const messageEl = toastData.element.querySelector('.message-text');
        if (messageEl) {
            messageEl.textContent = message || 'Upload successful';
        }
        const spinner = toastData.element.querySelector('.spinner-border');
        if (spinner) {
            spinner.style.display = 'none';
        }

        toastData.element.className = 'toast toast-success persistent-toast';
        toastData.isCompleted = true;
        toastData.completedAt = Date.now();

        // Remove any close button if present (should not be closable by user)
        const closeBtn = toastData.element.querySelector('.toast-close-btn');
        if (closeBtn) closeBtn.remove();

        // Clear any existing timeout and set exactly 10 seconds for information toast
        if (toastData.closeTimeout) {
            clearTimeout(toastData.closeTimeout);
        }
        toastData.closeTimeout = setTimeout(() => {
            this.removeProgressToast(toastId);
        }, 10000);
    }

    updateProgressToastError(toastId, message, data = null) {
        const toastData = this.progressToasts.get(toastId);
        // If the progress toast is missing or not rendered, fallback to a regular persistent error toast
        if (!toastData || !toastData.element) {
            // Show a persistent error toast using portalUI as a fallback
            if (window.portalUI && window.portalUI.showNotification) {
                window.portalUI.showNotification(
                    "Upload failed. Some active loans can't be added",
                    'error',
                    10000 // Auto-close after 10 seconds
                );
            } else {
                alert("Upload failed. Some active loans can't be added");
            }
            // Trigger auto-download if there's error data - check multiple possible property names
            let errorRows = null;
            if (data) {
                if (data.not_uploaded_rows && Array.isArray(data.not_uploaded_rows) && data.not_uploaded_rows.length > 0) {
                    errorRows = data.not_uploaded_rows;
                } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                    errorRows = data.errors;
                } else if (data.failed_rows && Array.isArray(data.failed_rows) && data.failed_rows.length > 0) {
                    errorRows = data.failed_rows;
                } else if (data.error_rows && Array.isArray(data.error_rows) && data.error_rows.length > 0) {
                    errorRows = data.error_rows;
                } else if (data.failed_loans && Array.isArray(data.failed_loans) && data.failed_loans.length > 0) {
                    errorRows = data.failed_loans;
                }
            }
            
            if (errorRows) {
                setTimeout(() => {
                    this.downloadFailedLoansExcel(errorRows);
                }, 100);
            }
            return;
        }

        const messageEl = toastData.element.querySelector('.message-text');
        const spinner = toastData.element.querySelector('.spinner-border');

        if (messageEl) {
            messageEl.textContent = message || "Upload failed. Some active loans can't be added";
        }
        if (spinner) {
            spinner.style.display = 'none';
        }

        // Use yellow background for warning, red for error
        let isSpecialPersistent = false;
        if (message && message.trim() === "Upload failed. Some active loans can't be added") {
            isSpecialPersistent = true;
            toastData.element.className = 'toast toast-error persistent-toast';
        } else {
            toastData.element.className = 'toast toast-warning persistent-toast';
        }

        // Auto-download error report if error rows are available
        // Check multiple possible property names for error data
        let errorRows = null;
        if (data) {
            if (data.not_uploaded_rows && Array.isArray(data.not_uploaded_rows) && data.not_uploaded_rows.length > 0) {
                errorRows = data.not_uploaded_rows;
            } else if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                errorRows = data.errors;
            } else if (data.failed_rows && Array.isArray(data.failed_rows) && data.failed_rows.length > 0) {
                errorRows = data.failed_rows;
            } else if (data.error_rows && Array.isArray(data.error_rows) && data.error_rows.length > 0) {
                errorRows = data.error_rows;
            } else if (data.failed_loans && Array.isArray(data.failed_loans) && data.failed_loans.length > 0) {
                errorRows = data.failed_loans;
            }
        }
        
        if (errorRows) {
            // Small delay to ensure the toast is visible before download starts
            setTimeout(() => {
                this.downloadFailedLoansExcel(errorRows);
            }, 100);
        }

        // Add close button for persistent error toast
        if (isSpecialPersistent) {
            // Remove any existing close button
            let closeBtn = toastData.element.querySelector('.toast-close-btn');
            if (closeBtn) closeBtn.remove();
            closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '6px';
            closeBtn.style.right = '10px';
            closeBtn.style.background = 'none';
            closeBtn.style.border = 'none';
            closeBtn.style.fontSize = '18px';
            closeBtn.style.color = '#333';
            closeBtn.style.cursor = 'pointer';
            closeBtn.setAttribute('aria-label', 'Close');
            closeBtn.onclick = () => {
                this.removeProgressToast(toastId);
            };
            toastData.element.style.position = 'relative';
            toastData.element.appendChild(closeBtn);
        } else {
            // Remove any close button if present
            const closeBtn = toastData.element.querySelector('.toast-close-btn');
            if (closeBtn) closeBtn.remove();
        }

        toastData.isCompleted = true;
        toastData.completedAt = Date.now();

        // Always auto-close after 10 seconds, even for persistent error toast
        if (toastData.closeTimeout) {
            clearTimeout(toastData.closeTimeout);
        }
        toastData.closeTimeout = setTimeout(() => {
            this.removeProgressToast(toastId);
        }, 10000);
    }

    autoCloseProgressToast(toastId) {
        // This method is now redundant, as we always set a 10s timer on reaching 100%.
    // ...existing code...

    // ...existing code...
    }

    removeProgressToast(toastId) {
        const toastData = this.progressToasts.get(toastId);
        if (toastData && toastData.element) {
            // Clear any existing timeout
            if (toastData.closeTimeout) {
                clearTimeout(toastData.closeTimeout);
                toastData.closeTimeout = null;
            }
            
            if (window.portalUI && window.portalUI.removeToast) {
                window.portalUI.removeToast(toastData.element);
            }
            this.progressToasts.delete(toastId);
        }
    }

    simulateUploadProgress(toastId) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 95) {
                progress = 95;
                clearInterval(interval);
            }
            
            this.updateProgressToastProgress(toastId, {
                percentage: Math.round(progress),
                message: `Uploading: ${Math.round(progress)}%`
            });
        }, 500);
        
        return interval;
    }

    downloadFailedResults(data) {
        if (!data || data.length === 0) {
            console.error('No error data available for download');
            return;
        }
        // Generate CSV with all fields from error rows
        const keys = Object.keys(data[0] || {});
        let csvContent = keys.join(',') + '\n';
        data.forEach(row => {
            csvContent += keys.map(k => `"${(row[k] !== undefined ? String(row[k]).replace(/"/g, '""') : '')}"`).join(',') + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'loan_upload_errors.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast('Error rows downloaded', 'success');
    }

    downloadFailedLoansExcel(data) {
        if (!data || data.length === 0) {
            console.error('No error data available for download');
            return;
        }
        
        // Define headers for loan upload errors
        const headers = ['Id Number', 'Name', 'Loan Type', 'Principal Balance', 'Monthly Deduction'];
        
        // Create Excel content
        let excelContent = headers.join('\t') + '\n';
        
        data.forEach(row => {
            // Each row should be an array with the loan data
            if (Array.isArray(row)) {
                // Ensure we have exactly 5 columns, pad with empty strings if needed
                const rowData = [];
                for (let i = 0; i < 5; i++) {
                    rowData.push(row[i] !== undefined && row[i] !== null ? String(row[i]) : '');
                }
                excelContent += rowData.join('\t') + '\n';
            } else {
                // If row is an object, extract the expected fields
                const rowData = [
                    row.id_number || row.employee_id || row.idnumber || '',
                    row.name || row.employee_name || '',
                    row.loan_type || row.loan_type_name || '',
                    row.principal_balance || row.amount || '',
                    row.monthly_deduction || row.monthly_allowance || ''
                ];
                excelContent += rowData.join('\t') + '\n';
            }
        });
        
        // Create blob and download as Excel file
        const blob = new Blob([excelContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8;' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'loan_upload_errors.xls';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast('Error report downloaded as Excel', 'success');
    }

    downloadFailedDeductionsExcel(data) {
        if (!data || data.length === 0) {
            console.error('No error data available for download');
            return;
        }
        // Define headers for deduction upload errors as requested
        const headers = ['Id Number', 'Name', 'Loan Type', 'Deduction'];
        let excelContent = headers.join('\t') + '\n';
        data.forEach(row => {
            // If row is an array, map to the correct columns
            if (Array.isArray(row)) {
                // Try to map: [id number, name, loan type, deduction]
                const rowData = [];
                for (let i = 0; i < 4; i++) {
                    rowData.push(row[i] !== undefined && row[i] !== null ? String(row[i]) : '');
                }
                excelContent += rowData.join('\t') + '\n';
            } else {
                // If row is an object, extract the expected fields
                const rowData = [
                    row.id_number || row.employee_id || row.idnumber || '',
                    row.name || row.employee_name || '',
                    row.loan_type || row.loan_type_name || '',
                    row.deduction || row.deduction_amount || row.amount || ''
                ];
                excelContent += rowData.join('\t') + '\n';
            }
        });
        // Create blob and download as Excel file
        const blob = new Blob([excelContent], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'deduction_upload_errors.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast('Error report downloaded as Excel', 'success');
    }

    // Helper for auto-download error rows as Excel (CSV)
    downloadErrorRowsExcel(errorRows, type = 'loan') {
        // Always use the correct error report for deduction
        if (type === 'deduction') {
            this.downloadFailedDeductionsExcel(errorRows);
        } else {
            this.downloadFailedLoansExcel(errorRows);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // --- Page Tour: Auto-scroll to .component-card if step element is inside it ---
    if (window.startProductTour) {
        const originalStartProductTour = window.startProductTour;
        window.startProductTour = function() {
            let scrollToComponentCardNext = false;
            if (window.driver && window.driver.js && window.driver.js.driver) {
                const driverInstance = window.driver.js.driver;
                const origDriver = driverInstance;
                window.driver.js.driver = function(opts) {
                    if (Array.isArray(opts.steps)) {
                        opts.steps = opts.steps.map((step, idx, arr) => {
                            // Step 7: Import Button should highlight #importBtn and scroll to .component-card
                            if (step.popover && step.popover.title && step.popover.title.toLowerCase().includes('import button')) {
                                const origOnShow = step.onShow;
                                return Object.assign({}, step, {
                                    element: '#importBtn', // Always point to the Import button itself
                                    onShow: function(element) {
                                        const card = document.querySelector('.component-card');
                                        if (card) {
                                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                        // Optionally, add a visual effect to the button
                                        if (element) {
                                            element.classList.add('custom-tour-highlight');
                                            setTimeout(() => {
                                                element.classList.remove('custom-tour-highlight');
                                            }, 1200);
                                        }
                                        if (typeof origOnShow === 'function') {
                                            origOnShow(element);
                                        }
                                    }
                                });
                            }
                            // Step 6: Search Bar, before showing, scroll to .component-card
                            if (idx === 5) {
                                const origOnShow = step.onShow;
                                return Object.assign({}, step, {
                                    onShow: function(element) {
                                        if (scrollToComponentCardNext) {
                                            const card = document.querySelector('.component-card');
                                            if (card) {
                                                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }
                                            scrollToComponentCardNext = false;
                                        }
                                        if (typeof origOnShow === 'function') {
                                            origOnShow(element);
                                        }
                                    }
                                });
                            }
                            // Step 5: After this, set flag to scroll before step 6
                            if (idx === 4) {
                                const origOnNext = step.onNext;
                                return Object.assign({}, step, {
                                    onNext: function(element) {
                                        scrollToComponentCardNext = true;
                                        if (typeof origOnNext === 'function') {
                                            origOnNext(element);
                                        }
                                    }
                                });
                            }
                            return step;
                        });
                    }
                    return origDriver.call(this, opts);
                };
            }
            originalStartProductTour();
        };
    }
    // Page Tour for Finance Admin (driver.js)
    window.startProductTour = function() {
        if (window.driver && window.driver.js && window.driver.js.driver) {
            const driver = window.driver.js.driver({
                allowClose: false,
                animate: true,
                opacity: 0.6,
                padding: 8,
                nextBtnText: 'Next',
                prevBtnText: 'Back',
                doneBtnText: 'Finish',
                showProgress: true,
                steps: [
                    {
                        element: '.dashboard-stats-container',
                        popover: {
                            title: 'Statistics Card',
                            description: 'This section displays the total count of employees, payslips, loans, and allowances for the current month, helping you track key finance metrics at a glance.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '.chart-card-container',
                        popover: {
                            title: 'Finance Overview Chart',
                            description: 'A dynamic chart that visualizes the overall trends of loans and allowances, giving a quick summary of the company’s financial activities.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '.chart-filters',
                        popover: {
                            title: 'Chart Range Filter',
                            description: 'This lets you adjust the date range shown in the chart for better data comparison (This Month, This Quarter, This Year).',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '.chart-type-filters',
                        popover: {
                            title: 'Graph Type Filter',
                            description: 'Lets you toggle between a line graph or a bar graph, depending on your preferred chart view.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#filterBtn',
                        popover: {
                            title: 'Chart Filter Button',
                            description: 'Allows you to choose whether to display data related to loans or allowances in the chart.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#searchInput',
                        popover: {
                            title: 'Search Bar',
                            description: 'Use this to quickly find and highlight a specific employee within the financial data table.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        },
                        onShow: () => {
                            const searchInput = document.querySelector('#searchInput');
                            if (!searchInput) return;
                            const observer = new MutationObserver((mutations, obs) => {
                                const popover = document.querySelector('.driver-popover');
                                if (popover && popover.offsetParent !== null) {
                            const scrollParent = getScrollableParent(searchInput);
                            const rect = searchInput.getBoundingClientRect();
                            let parentRect, scrollTop, viewHeight;
                            if (scrollParent === window) {
                                parentRect = { top: 0 };
                                scrollTop = window.pageYOffset;
                                viewHeight = window.innerHeight;
                            } else {
                                parentRect = scrollParent.getBoundingClientRect();
                                scrollTop = scrollParent.scrollTop;
                                viewHeight = scrollParent.clientHeight;
                            }
                            const offset = rect.top - parentRect.top + scrollTop - (viewHeight / 2) + (rect.height / 2);
                            if (scrollParent === window) {
                                window.scrollTo({ top: offset, behavior: 'smooth' });
                            } else {
                                scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
                            }
                                    obs.disconnect();
                                }
                            });
                            observer.observe(document.body, { childList: true, subtree: true });
                        }
                    },
                    {
                        element: '#importBtn',
                        popover: {
                            title: 'Import Button',
                            description: 'Click this to upload employee finance data such as payslips, loans, or allowances into the system.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        },
                        onShow: function(element) {
                            if (!element) return;
                            const observer = new MutationObserver((mutations, obs) => {
                                const popover = document.querySelector('.driver-popover');
                                if (popover && popover.offsetParent !== null) {
                            const scrollParent = getScrollableParent(element);
                            const rect = element.getBoundingClientRect();
                            let parentRect, scrollTop, viewHeight;
                            if (scrollParent === window) {
                                parentRect = { top: 0 };
                                scrollTop = window.pageYOffset;
                                viewHeight = window.innerHeight;
                            } else {
                                parentRect = scrollParent.getBoundingClientRect();
                                scrollTop = scrollParent.scrollTop;
                                viewHeight = scrollParent.clientHeight;
                            }
                            const offset = rect.top - parentRect.top + scrollTop - (viewHeight / 2) + (rect.height / 2);
                            if (scrollParent === window) {
                                window.scrollTo({ top: offset, behavior: 'smooth' });
                            } else {
                                scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
                            }
                                    element.classList.add('custom-tour-highlight');
                                    setTimeout(() => {
                                        element.classList.remove('custom-tour-highlight');
                                    }, 1200);
                                    obs.disconnect();
                                }
                            });
                            observer.observe(document.body, { childList: true, subtree: true });
                        }
                    },
                    {
                        element: '#importPopover',
                        popover: {
                            title: 'Filter Popover of the Import Button',
                            description: 'When uploading, this popover lets you select the type of financial data you want to import for better organization.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        },
                        onShow: function() {
                            const importBtn = document.getElementById('importBtn');
                            if (importBtn) {
                                importBtn.click();
                                const observer = new MutationObserver((mutations, obs) => {
                                    const popover = document.querySelector('.driver-popover');
                                    if (popover && popover.offsetParent !== null) {
                                        const scrollParent = getScrollableParent(importBtn);
                                        const rect = importBtn.getBoundingClientRect();
                                        let parentRect, scrollTop, viewHeight;
                                        if (scrollParent === window) {
                                            parentRect = { top: 0 };
                                            scrollTop = window.pageYOffset;
                                            viewHeight = window.innerHeight;
                                        } else {
                                            parentRect = scrollParent.getBoundingClientRect();
                                            scrollTop = scrollParent.scrollTop;
                                            viewHeight = scrollParent.clientHeight;
                                        }
                                        const offset = rect.top - parentRect.top + scrollTop - (viewHeight / 2) + (rect.height / 2);
                                        if (scrollParent === window) {
                                            window.scrollTo({ top: offset, behavior: 'smooth' });
                                        } else {
                                            scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
                                        }
                                        obs.disconnect();
                                    }
                                });
                                observer.observe(document.body, { childList: true, subtree: true });
                            }
                        },
                        onHide: function() {
                            const popover = document.getElementById('importPopover');
                            if (popover) {
                                popover.classList.remove('show');
                            }
                        }
                    },
                    {
                        element: '.employees-table-container',
                        popover: {
                            title: 'Table',
                            description: 'A scrollable list displaying all employees along with their financial data, which automatically focuses on selected or searched entries.',
                            position: 'top',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        },
                        onShow: function(element) {
                            if (!element) return;
                            const observer = new MutationObserver((mutations, obs) => {
                                const popover = document.querySelector('.driver-popover');
                                if (popover && popover.offsetParent !== null) {
                                    const scrollParent = getScrollableParent(element);
                                    const rect = element.getBoundingClientRect();
                                    let parentRect, scrollTop, viewHeight;
                                    if (scrollParent === window) {
                                        parentRect = { top: 0 };
                                        scrollTop = window.pageYOffset;
                                        viewHeight = window.innerHeight;
                                    } else {
                                        parentRect = scrollParent.getBoundingClientRect();
                                        scrollTop = scrollParent.scrollTop;
                                        viewHeight = scrollParent.clientHeight;
                                    }
                                    const offset = rect.top - parentRect.top + scrollTop - (viewHeight / 2) + (rect.height / 2);
                                    if (scrollParent === window) {
                                        window.scrollTo({ top: offset, behavior: 'smooth' });
                                    } else {
                                        scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
                                    }
                                    setTimeout(() => {
                                        const newRect = element.getBoundingClientRect();
                                        if (newRect.bottom < 0 || newRect.top > (window.innerHeight || document.documentElement.clientHeight)) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }, 600);
                                    obs.disconnect();
                                }
                            });
                            observer.observe(document.body, { childList: true, subtree: true });
                        }
                    },
                    {
                        element: 'a.btn.btn-icon',
                        popover: {
                            title: 'View Button (in Table)',
                            description: 'This button allows you to open and review the detailed financial records of a specific employee.',
                            position: 'left',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Finish', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        },
                        onShow: function(element) {
                            if (!element) return;
                            setTimeout(() => {
                                const scrollParent = getScrollableParent(element);
                                const rect = element.getBoundingClientRect();
                                let parentRect, scrollTop, viewHeight;
                                if (scrollParent === window) {
                                    parentRect = { top: 0 };
                                    scrollTop = window.pageYOffset;
                                    viewHeight = window.innerHeight;
                                } else {
                                    parentRect = scrollParent.getBoundingClientRect();
                                    scrollTop = scrollParent.scrollTop;
                                    viewHeight = scrollParent.clientHeight;
                                }
                                const offset = rect.top - parentRect.top + scrollTop - (viewHeight / 2) + (rect.height / 2);
                                if (scrollParent === window) {
                                    window.scrollTo({ top: offset, behavior: 'smooth' });
                                } else {
                                    scrollParent.scrollTo({ top: offset, behavior: 'smooth' });
                                }
                                setTimeout(() => {
                                    const newRect = element.getBoundingClientRect();
                                    if (newRect.bottom < 0 || newRect.top > (window.innerHeight || document.documentElement.clientHeight)) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }, 600);
                            }, 500);
                        }
                    }
                ]
            });
            driver.drive();
        }
    };
    const tabList = document.querySelector('.tab-list');
    if (tabList) {
        tabList.addEventListener('click', function (e) {
            const tab = e.target.closest('.tab');
            if (!tab) return;
            e.preventDefault();
            e.stopPropagation();
            tabList.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            if (targetId) {
                const content = document.getElementById(targetId);
                if (content) content.classList.add('active');
            }
            const componentCard = document.querySelector('.component-card');
            if (componentCard) {
                componentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const modalCloseHandlers = [
        { modalId: 'payslipImportModal', closeBtnId: 'closePayslipImportModalBtn', cancelBtnId: 'cancelPayslipImportBtn' },
        { modalId: 'loansImportModal', closeBtnId: 'closeLoansImportModalBtn', cancelBtnId: 'cancelLoanImportBtn' },
        { modalId: 'allowancesImportModal', closeBtnId: 'closeAllowancesImportModalBtn', cancelBtnId: 'cancelAllowanceImportBtn' },
        { modalId: 'savingsImportModal', closeBtnId: 'closeSavingsImportModalBtn', cancelBtnId: 'cancelSavingsImportBtn' }
    ];

    modalCloseHandlers.forEach(({ modalId, closeBtnId, cancelBtnId }) => {
        const closeBtn = document.getElementById(closeBtnId);
        const modal = document.getElementById(modalId);
        const cancelBtn = document.getElementById(cancelBtnId);
        
        if (closeBtn && modal) {
            function closeModalWithAnimation() {
                modal.classList.add('closing');
                setTimeout(() => {
                    modal.classList.remove('show', 'closing');
                }, 200);
            }
            closeBtn.addEventListener('click', closeModalWithAnimation);
            modal.querySelector('.modal-overlay').addEventListener('click', closeModalWithAnimation);
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closeModalWithAnimation);
            }
        }
    });

    const ojtTemplateBtn = document.getElementById('ojtPayslipTemplateBtn');
    if (ojtTemplateBtn) {
        ojtTemplateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open('/finance/template/ojt_payslip/', '_blank');
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const tableContainer = document.getElementById('employeeTableContainer');
    let searchTimeout = null;
    
    function fetchTable(url) {
        fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(response => response.json())
            .then(data => {
                tableContainer.innerHTML = data.html;
            });
    }
    
    if (tableContainer) {
        tableContainer.addEventListener('click', function(e) {
            const a = e.target.closest('a');
            if (a && a.classList.contains('pagination-btn')) {
                e.preventDefault();
                fetchTable(a.href.replace('/?', '/finance/employee-table/?'));
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const search = encodeURIComponent(searchInput.value);
                fetchTable(`/finance/employee-table/?search=${search}`);
            }, 300);
        });
    }
});

function attachChartButtonHandlers() {
    document.querySelectorAll('.filter-btn[data-period]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.adminFinance) {
                window.adminFinance.updateChartPeriod(this.getAttribute('data-period'));
            }
        });
    });
    
    document.querySelectorAll('.chart-type-btn[data-type]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.adminFinance) {
                window.adminFinance.switchChartType(this.getAttribute('data-type'));
            }
        });
    });
    
    const chartFilters = document.querySelector('.chart-filters');
    const chartTypeFilters = document.querySelector('.chart-type-filters');
    
    if (chartFilters) {
        const activeFilterBtn = chartFilters.querySelector('.filter-btn.active');
        if (activeFilterBtn) {
            const activeIndex = Array.from(chartFilters.querySelectorAll('.filter-btn')).indexOf(activeFilterBtn);
            chartFilters.classList.add('has-active', `slide-${activeIndex}`);
        }
    }
    
    if (chartTypeFilters) {
        const activeChartTypeBtn = chartTypeFilters.querySelector('.chart-type-btn.active');
        if (activeChartTypeBtn) {
            const activeIndex = Array.from(chartTypeFilters.querySelectorAll('.chart-type-btn')).indexOf(activeChartTypeBtn);
            chartTypeFilters.classList.add('has-active', `slide-${activeIndex}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    window.adminFinance = new AdminFinanceModule();
    attachChartButtonHandlers();
    initializePayslipUploadSystem();

    // Delegated event handler for .btn-delete-allowance
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-delete-allowance');
        if (btn) {
            e.preventDefault();
            // Confirm delete
            if (!confirm('Are you sure you want to delete this allowance?')) return;
            const url = btn.getAttribute('data-url');
            if (!url) return;
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') || {}).value || ''
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Optionally show a notification
                    if (window.portalUI && window.portalUI.showNotification) {
                        window.portalUI.showNotification('Allowance deleted successfully.', 'success');
                    }
                    // Refresh the table (assume a function or reload)
                    if (typeof refreshAllowancesTable === 'function') {
                        refreshAllowancesTable();
                    } else {
                        // fallback: reload
                        window.location.reload();
                    }
                } else {
                    if (window.portalUI && window.portalUI.showNotification) {
                        window.portalUI.showNotification(data.message || 'Failed to delete allowance.', 'error');
                    } else {
                        alert(data.message || 'Failed to delete allowance.');
                    }
                }
            })
            .catch(() => {
                if (window.portalUI && window.portalUI.showNotification) {
                    window.portalUI.showNotification('Error deleting allowance.', 'error');
                } else {
                    alert('Error deleting allowance.');
                }
            });
        }
    });
});

function initializePayslipUploadSystem() {
    initializePayslipUploadButton();

    const payslipUploadForm = document.getElementById('payslip-upload-form');
    if (payslipUploadForm) {
        payslipUploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const tabRegular = document.getElementById('tab-regular-probationary');
            const tabOJT = document.getElementById('tab-ojt');

            if (tabRegular && tabRegular.classList.contains('active')) {
                handleRegularPayslipUpload();
            } else if (tabOJT && tabOJT.classList.contains('active')) {
                handleOJTPayslipUpload();
            }
        });
    }

    setupResultsModalHandlers();
}

function setupResultsModalHandlers() {
    const handlers = [
        { btnId: 'closePayslipProgressBtn', modalId: 'payslipProgressModal' },
        { btnId: 'viewPayslipResultsBtn', action: 'showResults' },
        { btnId: 'closePayslipResultsModal', modalId: 'payslipResultsModal' },
        { btnId: 'closeResultsModalBtn', modalId: 'payslipResultsModal' }
    ];

    handlers.forEach(({ btnId, modalId, action }) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                if (action === 'showResults') {
                    showPayslipResultsModal();
                } else if (modalId) {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.classList.remove('show');
                        if (modalId === 'payslipProgressModal') {
                            setTimeout(() => window.location.reload(), 500);
                        }
                    }
                }
            });
        }
    });

    const resultsTabs = document.querySelectorAll('.results-tabs .tab');
    const resultsTabPanels = document.querySelectorAll('.results-tabs .tab-panel');

    resultsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            resultsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            resultsTabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `tab-${targetTab}`) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

function initializePayslipUploadButton() {
    const payslipUploadBtn = document.getElementById('payslip-upload-btn');
    const fileInputRegular = document.getElementById('payslip-files-regular');
    const fileInputOJT = document.getElementById('payslip-files-ojt');

    function updatePayslipUploadBtnState() {
        const payslipUploadBtn = document.getElementById('payslip-upload-btn');
        if (!payslipUploadBtn) return;

        const currentTabRegular = document.getElementById('tab-regular-probationary');
        const currentTabOJT = document.getElementById('tab-ojt');
        const currentFileInputRegular = document.getElementById('payslip-files-regular');
        const currentFileInputOJT = document.getElementById('payslip-files-ojt');

        let hasFiles = false;
        let hasRequiredFields = true;

        if (currentTabRegular && currentTabRegular.classList.contains('active')) {
            const startDate = document.getElementById('cutoff-start-date');
            const endDate = document.getElementById('cutoff-end-date');
            hasFiles = currentFileInputRegular && currentFileInputRegular.files && currentFileInputRegular.files.length > 0;
            hasRequiredFields = !!(startDate && startDate.value && endDate && endDate.value);
        } else if (currentTabOJT && currentTabOJT.classList.contains('active')) {
            hasFiles = currentFileInputOJT && currentFileInputOJT.files && currentFileInputOJT.files.length > 0;
            hasRequiredFields = true;
        }

        const shouldEnable = hasFiles && hasRequiredFields;
        payslipUploadBtn.disabled = !shouldEnable;
    }

    window.updatePayslipUploadBtnState = updatePayslipUploadBtnState;

    if (fileInputRegular) {
        fileInputRegular.addEventListener('change', updatePayslipUploadBtnState);
    }
    if (fileInputOJT) {
        fileInputOJT.addEventListener('change', updatePayslipUploadBtnState);
    }

    const startDateInput = document.getElementById('cutoff-start-date');
    const endDateInput = document.getElementById('cutoff-end-date');
    if (startDateInput) {
        startDateInput.addEventListener('change', updatePayslipUploadBtnState);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', updatePayslipUploadBtnState);
    }

    const payslipTabs = document.getElementById('payslipImportTabs');
    if (payslipTabs) {
        const tabBtns = payslipTabs.querySelectorAll('.tab-list .tab');
        tabBtns.forEach((btn, idx) => {
            btn.addEventListener('click', function() {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tabRegular = document.getElementById('tab-regular-probationary');
                const tabOJT = document.getElementById('tab-ojt');
                
                if (tabRegular) tabRegular.classList.remove('active');
                if (tabOJT) tabOJT.classList.remove('active');

                const tabData = btn.dataset.tab;
                if (tabData === 'regular-probationary' && tabRegular) {
                    tabRegular.classList.add('active');
                } else if (tabData === 'ojt' && tabOJT) {
                    tabOJT.classList.add('active');
                }
                setTimeout(updatePayslipUploadBtnState, 50);
            });
        });
        if (tabBtns.length > 0) {
            tabBtns[0].classList.add('active');
            const tabRegular = document.getElementById('tab-regular-probationary');
            if (tabRegular) tabRegular.classList.add('active');
        }
    }

    const cancelBtn = document.getElementById('cancelPayslipImportBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (fileInputRegular) fileInputRegular.value = '';
            if (fileInputOJT) fileInputOJT.value = '';
            updatePayslipUploadBtnState();
        });
    }

    setTimeout(updatePayslipUploadBtnState, 100);
}

function handleRegularPayslipUpload() {
    const cutoffStartDate = document.getElementById('cutoff-start-date');
    const cutoffEndDate = document.getElementById('cutoff-end-date');
    const fileInputRegular = document.getElementById('payslip-files-regular');

    if (!validateRegularPayslipInputs(cutoffStartDate, cutoffEndDate, fileInputRegular)) {
        return;
    }

    const uploadModal = document.getElementById('regularProbationaryImportModal');
    if (uploadModal) {
        uploadModal.classList.add('closing');
        uploadModal.classList.remove('show');
        uploadModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    const toastId = 'payslip-upload-progress-toast';
    const toast = window.adminFinance.createPersistentProgressToast(toastId, 'Uploading payslips: 0%', 'success');

    const formData = new FormData();
    formData.append('cutoff_date', cutoffStartDate.value + ' to ' + cutoffEndDate.value);
    for (let i = 0; i < fileInputRegular.files.length; i++) {
        formData.append('files', fileInputRegular.files[i]);
    }

    fetch('/finance/regular_payslip_upload/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(response => response.json())
    .then(data => {
        // Mark progress as complete
        window.adminFinance.updateProgressToastProgress(toastId, {
            percentage: 100,
            message: 'Uploading payslips... (100%)'
        });
        setTimeout(() => {
            if (data.success && (!data.error_count || data.error_count === 0)) {
                window.adminFinance.showToast('Payslips uploaded successfully!', 'success');
            } else {
                window.adminFinance.updateProgressToastError(toastId, 'Upload completed with errors', data);
                window.adminFinance.showToast('Some payslips failed to upload. Downloading error report...', 'error');
                if (data.errors && data.errors.length > 0) {
                    // Auto-download error report as Excel
                    fetch('/finance/download_failed_payslips/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                        },
                        body: JSON.stringify({ errors: data.errors })
                    })
                    .then(resp => resp.blob())
                    .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = 'payslip_upload_errors.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        window.adminFinance.showToast('Error report downloaded as Excel', 'success');
                    });
                }
            }
            if (fileInputRegular) fileInputRegular.value = '';
            if (window.updatePayslipUploadBtnState) window.updatePayslipUploadBtnState();
        }, 500);
    })
    .catch(error => {
        console.error('Regular upload error:', error);
        window.adminFinance.updateProgressToastError(toastId, 'Upload failed: ' + error.message);
        if (fileInputRegular) fileInputRegular.value = '';
        if (window.updatePayslipUploadBtnState) window.updatePayslipUploadBtnState();
    });
}

function validateRegularPayslipInputs(cutoffStartDate, cutoffEndDate, fileInput) {
    let valid = true;

    const cutoffStartError = document.getElementById('cutoff-start-date-error');
    const cutoffEndError = document.getElementById('cutoff-end-date-error');

    if (cutoffStartError) cutoffStartError.style.display = 'none';
    if (cutoffEndError) cutoffEndError.style.display = 'none';

    if (!cutoffStartDate || !cutoffStartDate.value) {
        if (cutoffStartError) {
            cutoffStartError.querySelector('.error-text').textContent = 'Start cut off date is required';
            cutoffStartError.style.display = 'block';
        }
        valid = false;
    }

    if (!cutoffEndDate || !cutoffEndDate.value) {
        if (cutoffEndError) {
            cutoffEndError.querySelector('.error-text').textContent = 'End cut off date is required';
            cutoffEndError.style.display = 'block';
        }
        valid = false;
    }

    if (cutoffStartDate && cutoffEndDate && cutoffStartDate.value && cutoffEndDate.value) {
        const startDate = new Date(cutoffStartDate.value);
        const endDate = new Date(cutoffEndDate.value);

        if (startDate >= endDate) {
            if (cutoffEndError) {
                cutoffEndError.querySelector('.error-text').textContent = 'End date must be after start date';
                cutoffEndError.style.display = 'block';
            }
            valid = false;
        }
    }

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        const toastId = 'payslip-validation-error-toast';
        window.adminFinance.createPersistentProgressToast(toastId, 'Please select at least one PDF file', 'error');
        valid = false;
    } else {
        let invalidFiles = [];
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                invalidFiles.push(file.name);
            }
        }

        if (invalidFiles.length > 0) {
            const toastId = 'payslip-validation-error-toast';
            window.adminFinance.createPersistentProgressToast(toastId, 'Only PDF files are allowed', 'error');
            valid = false;
        }
    }

    return valid;
}

function validateOJTPayslipInputs(fileInput) {
    let valid = true;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        const toastId = 'payslip-validation-error-toast';
        window.adminFinance.createPersistentProgressToast(toastId, 'Please select at least one Excel/CSV file', 'error');
        valid = false;
    } else {
        let invalidFiles = [];
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
                invalidFiles.push(file.name);
            }
        }

        if (invalidFiles.length > 0) {
            const toastId = 'payslip-validation-error-toast';
            window.adminFinance.createPersistentProgressToast(toastId, 'Only Excel/CSV files are allowed', 'error');
            valid = false;
        }
    }

    return valid;
}

function startPayslipProgressPolling(uploadId, toastId) {
    const pollInterval = setInterval(() => {
        fetch(`/finance/payslips/upload-progress/${uploadId}/`)
            .then(response => response.json())
            .then(data => {
                updatePayslipProgress(data);
                window.adminFinance.updateProgressToastProgress(toastId, {
                    percentage: data.percentage,
                    message: `Uploading payslips: ${data.percentage}%`
                });

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollInterval);
                    handlePayslipUploadCompletion(data, toastId);
                }
            })
            .catch(error => {
                console.error('Progress polling error:', error);
                clearInterval(pollInterval);
                window.adminFinance.updateProgressToastError(toastId, 'Failed to get upload progress');
            });
    }, 1000);
}

function updatePayslipProgress(data) {
    const progressFill = document.getElementById('payslipProgressFill');
    const progressText = document.getElementById('payslipProgressText');
    const progressCount = document.getElementById('payslipProgressCount');
    const successCount = document.getElementById('payslipSuccessCount');
    const errorCount = document.getElementById('payslipErrorCount');
    const importDetails = document.getElementById('payslipImportDetails');

    let percentage = 0;
    if (data.total && !isNaN(data.total) && data.total > 0) {
        percentage = Math.round((data.processed / data.total) * 100);
    }

    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressText) progressText.textContent = percentage + '%';
    if (progressCount) progressCount.textContent = `${data.processed} of ${data.total} files`;

    if (data.processed > 0 && importDetails) {
        importDetails.style.display = 'block';
        if (successCount) successCount.textContent = data.success_count;
        if (errorCount) errorCount.textContent = data.error_count;
    }
}

function handlePayslipUploadCompletion(data, toastId) {
    const progressModal = document.getElementById('payslipProgressModal');
    const resultsModal = document.getElementById('payslipResultsModal');

    if (data.status === 'completed') {
        if (data.error_count > 0) {
            window.payslipUploadResults = data;
            window.adminFinance.updateProgressToastError(toastId, 'Upload completed with errors', data);

            if (progressModal) progressModal.classList.remove('show');
            if (resultsModal) resultsModal.classList.add('show');
        } else {
            window.adminFinance.updateProgressToastSuccess(toastId, 'Payslips uploaded successfully!');

            if (progressModal) progressModal.classList.remove('show');
            if (resultsModal) resultsModal.classList.remove('show');

            setTimeout(() => { window.location.reload(); }, 3000);
        }
    } else if (data.status === 'failed') {
        window.adminFinance.updateProgressToastError(toastId, data.error_message || 'Upload failed');
    }
}

function handleOJTPayslipUpload() {
    const fileInputOJT = document.getElementById('payslip-files-ojt');

    if (!validateOJTPayslipInputs(fileInputOJT)) {
        return;
    }

    const uploadModal = document.getElementById('payslipImportModal');
    if (uploadModal) uploadModal.classList.remove('show');

    const toastId = 'payslip-upload-progress-toast';
    const toast = window.adminFinance.createPersistentProgressToast(toastId, 'Uploading payslips: 0%', 'success');

    const formData = new FormData();
    for (let i = 0; i < fileInputOJT.files.length; i++) {
        formData.append('files', fileInputOJT.files[i]);
    }

    let progressInterval = window.adminFinance.simulateUploadProgress(toastId);

    fetch('/finance/payslip/upload/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);

        if (data.success) {
            window.adminFinance.updateProgressToastSuccess(toastId, `Successfully uploaded ${data.created} OJT payslip(s)`);
            setTimeout(() => { window.location.reload(); }, 3000);
        } else {
            let errorMsg = data.errors ? data.errors.join('\n') : (data.error || 'Upload failed');
            window.adminFinance.updateProgressToastError(toastId, errorMsg);
        }
        if (fileInputOJT) fileInputOJT.value = '';
        if (window.updatePayslipUploadBtnState) window.updatePayslipUploadBtnState();
    })
    .catch(error => {
        console.error('OJT upload error:', error);
        clearInterval(progressInterval);
        window.adminFinance.updateProgressToastError(toastId, 'Upload failed: ' + error.message);
        if (fileInputOJT) fileInputOJT.value = '';
        if (window.updatePayslipUploadBtnState) window.updatePayslipUploadBtnState();
    });
}

function showPayslipResultsModal() {
    const resultsModal = document.getElementById('payslipResultsModal');
    const progressModal = document.getElementById('payslipProgressModal');

    if (!window.payslipUploadResults) {
        console.error('No upload results available');
        return;
    }

    const data = window.payslipUploadResults;

    const successfulCount = document.getElementById('payslipSuccessfulCount');
    const failedCount = document.getElementById('payslipFailedCount');

    if (successfulCount) successfulCount.textContent = data.success_count || 0;
    if (failedCount) failedCount.textContent = data.error_count || 0;

    const successTable = document.getElementById('successfulUploadsTable');
    if (successTable && data.successful_uploads) {
        successTable.innerHTML = '';
        data.successful_uploads.forEach(upload => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${upload.filename}</td>
                <td>${upload.employee_id}</td>
                <td>${upload.employee_name}</td>
                <td>${upload.final_filename}</td>
                <td><span class="status-badge ${upload.action.toLowerCase()}">${upload.action}</span></td>
            `;
            successTable.appendChild(row);
        });
    }
    const downloadErrorBtn = document.getElementById('downloadPayslipErrorReportBtn');
    if (downloadErrorBtn) {
        if (data.error_count > 0) {
            downloadErrorBtn.style.display = 'inline-block';
            downloadErrorBtn.onclick = () => downloadPayslipErrorReportXLSX(data);
        } else {
            downloadErrorBtn.style.display = 'none';
        }
    }

    if (progressModal) progressModal.classList.remove('show');
    if (resultsModal) resultsModal.classList.add('show');
}

function downloadPayslipErrorReportXLSX(data) {
    if (!data.errors || data.errors.length === 0) return;
    const ws_data = [['Filename', 'Error']];
    data.errors.forEach(error => {
        ws_data.push([error.filename, error.error]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Failed Uploads');
    XLSX.writeFile(wb, 'payslip_upload_errors.xlsx');
}

document.addEventListener('DOMContentLoaded', function () {
    const importPopoverSetup = () => {
        const importBtn = document.getElementById('importBtn');
        const importPopover = document.getElementById('importPopover');
        const importOptionsPopover = document.getElementById('importOptionsPopover');
        const importOptions = document.querySelectorAll('.import-option');
        const importOptionsGroups = document.querySelectorAll('.import-options-group');

        let currentActiveGroup = null;
        let popoverTimeout = null;

        function showImportPopover() {
            if (popoverTimeout) {
                clearTimeout(popoverTimeout);
                popoverTimeout = null;
            }
            importPopover.classList.add('show');
        }

        function hideImportPopover() {
            popoverTimeout = setTimeout(() => {
                importPopover.classList.remove('show');
                hideImportOptionsPopover();
            }, 150);
        }

        function showImportOptionsPopover(groupType, hoveredButton) {
            if (popoverTimeout) {
                clearTimeout(popoverTimeout);
                popoverTimeout = null;
            }

            importOptions.forEach(option => {
                option.classList.remove('active');
            });

            if (hoveredButton) {
                hoveredButton.classList.add('active');
            }

            importOptionsGroups.forEach(group => {
                group.style.display = 'none';
            });

            const targetGroup = document.querySelector(`[data-group="${groupType}"]`);
            if (targetGroup) {
                targetGroup.style.display = 'block';
                currentActiveGroup = groupType;
            }

            if (hoveredButton && importPopover) {
                const mainPopoverRect = importPopover.getBoundingClientRect();
                const buttonRect = hoveredButton.getBoundingClientRect();

                const offsetTop = buttonRect.top - mainPopoverRect.top;
                const finalTop = Math.max(0, offsetTop);

                importOptionsPopover.style.top = `${finalTop}px`;

                setTimeout(() => {
                    importOptionsPopover.style.transition = 'all 0.2s ease';
                }, 10);
            }

            importOptionsPopover.classList.add('show');
        }

        function hideImportOptionsPopover() {
            popoverTimeout = setTimeout(() => {
                importOptionsPopover.classList.remove('show');
                importOptions.forEach(option => {
                    option.classList.remove('active');
                });
                currentActiveGroup = null;
            }, 150);
        }

        if (importBtn) {
            importBtn.addEventListener('mouseenter', showImportPopover);
            importBtn.addEventListener('mouseleave', hideImportPopover);
            importBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (importPopover.classList.contains('show')) {
                    hideImportPopover();
                } else {
                    showImportPopover();
                }
            });
        }

        if (importPopover) {
            importPopover.addEventListener('mouseenter', showImportPopover);
            importPopover.addEventListener('mouseleave', hideImportPopover);
        }

        importOptions.forEach(option => {
            option.addEventListener('mouseenter', function() {
                const type = this.dataset.type;
                showImportOptionsPopover(type, this);
            });

            option.addEventListener('mouseleave', function() {
                // Don't hide immediately, let user move to options popover
            });
        });

        if (importOptionsPopover) {
            importOptionsPopover.addEventListener('mouseenter', function() {
                if (popoverTimeout) {
                    clearTimeout(popoverTimeout);
                    popoverTimeout = null;
                }
            });

            importOptionsPopover.addEventListener('mouseleave', hideImportOptionsPopover);
        }

        const radioButtons = document.querySelectorAll('.import-options-popover input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    importPopover.classList.remove('show');
                    importOptionsPopover.classList.remove('show');

                    const value = this.value;
                    if (value.startsWith('payslips_')) {
                        const subType = value.split('_')[1];
                        openImportModal('payslips', subType);
                    } else if (value.startsWith('loans_')) {
                        const subType = value.split('_')[1];
                        openImportModal('loans', subType);
                    } else if (value === 'allowances') {
                        openImportModal('allowances');
                    }
                }
            });
        });

        document.addEventListener('click', function(e) {
            if (!importBtn.contains(e.target) &&
                !importPopover.contains(e.target) &&
                !importOptionsPopover.contains(e.target)) {
                importPopover.classList.remove('show');
                importOptionsPopover.classList.remove('show');
            }
        });

        window.openImportModal = function(type, subType = null) {
            let modalId;

            switch (type) {
                case 'payslips':
                    modalId = 'payslipImportModal';
                    if (subType === 'ojt') {
                        const ojtTab = document.querySelector('[data-tab="ojt"]');
                        const ojtPanel = document.getElementById('tab-ojt');
                        const regularTab = document.querySelector('[data-tab="regular-probationary"]');
                        const regularPanel = document.getElementById('tab-regular-probationary');

                        if (ojtTab && ojtPanel && regularTab && regularPanel) {
                            regularTab.classList.remove('active');
                            regularPanel.classList.remove('active');
                            ojtTab.classList.add('active');
                            ojtPanel.classList.add('active');
                        }
                    } else {
                        const regularTab = document.querySelector('[data-tab="regular-probationary"]');
                        const regularPanel = document.getElementById('tab-regular-probationary');
                        const ojtTab = document.querySelector('[data-tab="ojt"]');
                        const ojtPanel = document.getElementById('tab-ojt');

                        if (regularTab && regularPanel && ojtTab && ojtPanel) {
                            ojtTab.classList.remove('active');
                            ojtPanel.classList.remove('active');
                            regularTab.classList.add('active');
                            regularPanel.classList.add('active');
                        }
                    }
                    break;
                case 'loans':
                    modalId = 'loansImportModal';
                    break;
                case 'allowances':
                    modalId = 'allowancesImportModal';
                    break;
                default:
                    modalId = 'payslipImportModal';
            }

            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
            }
        };
    };

    importPopoverSetup();
});

document.addEventListener('DOMContentLoaded', function () {
    const radioToModal = {
        'import_payslips_regular': 'regularProbationaryImportModal',
        'import_payslips_ojt': 'ojtImportModal',
        'import_loans_principal': 'principalBalanceImportModal',
        'import_loans_deduction': 'deductionImportModal'
    };
    
    Object.keys(radioToModal).forEach(radioId => {
        const radio = document.getElementById(radioId);
        if (radio) {
            radio.addEventListener('change', function () {
                if (radio.checked) {
                    document.querySelectorAll('input[name="import_type"]').forEach(r => {
                        if (r !== radio) r.checked = false;
                    });
                    
                    Object.values(radioToModal).forEach(modalId => {
                        const modal = document.getElementById(modalId);
                        if (modal) modal.classList.remove('show');
                    });
                    
                    const modal = document.getElementById(radioToModal[radioId]);
                    if (modal) modal.classList.add('show');
                    
                    radio.checked = true;
                }
            });
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.add('closing');
        modal.classList.remove('show');
        modal.addEventListener('animationend', function handler() {
            modal.classList.remove('closing');
            modal.removeEventListener('animationend', handler);
        });
        setTimeout(() => modal.classList.remove('closing'), 350);
    }

    document.querySelectorAll('.modal').forEach(modal => {
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => closeModal(modal));
        }
        
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
        
        modal.querySelectorAll('button.btn.btn-outline').forEach(btn => {
            if (btn.textContent.trim().toLowerCase() === 'cancel') {
                btn.addEventListener('click', () => closeModal(modal));
            }
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => closeModal(modal));
        }
    });
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateSelectedFilesDisplay(fileInput, listId, containerId) {
    const fileList = document.getElementById(listId);
    const selectedFilesContainer = document.getElementById(containerId);
    const files = fileInput.files;

    if (!fileList || !selectedFilesContainer) return;

    if (files.length > 0) {
        selectedFilesContainer.style.display = 'block';
        fileList.innerHTML = '';
        for (const file of files) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file file-icon"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${formatFileSize(file.size)})</span>
                </div>
            `;
            fileList.appendChild(fileItem);
        }
    } else {
        selectedFilesContainer.style.display = 'none';
        fileList.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const regularFileInput = document.getElementById('regular-files');
    const regularFileList = document.getElementById('regular-file-list');
    const removeRegularFilesBtn = document.getElementById('remove-selected-regular-files');
    const regularUploadBtn = document.getElementById('regular-upload-btn');

    if (regularFileInput && regularFileList && removeRegularFilesBtn && regularUploadBtn) {
        regularFileInput.addEventListener('change', () => {
            updateRegularFileList(regularFileInput, regularFileList, removeRegularFilesBtn, regularUploadBtn);
        });

        removeRegularFilesBtn.addEventListener('click', () => {
            regularFileInput.value = '';
            updateRegularFileList(regularFileInput, regularFileList, removeRegularFilesBtn, regularUploadBtn);
        });
    }
});

function updateRegularFileList(fileInput, fileList, removeBtn, uploadBtn) {
    const files = fileInput.files;
    const noFilesSelected = fileList.querySelector('.no-files-selected');

    fileList.querySelectorAll('.file-item').forEach(item => item.remove());

    const cutoffInput = document.getElementById('regular-cutoff-date');
    
    if (files.length > 0) {
        if (noFilesSelected) noFilesSelected.style.display = 'none';
        removeBtn.style.display = 'inline-block';
        for (const file of files) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-pdf file-icon"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${formatFileSize(file.size)})</span>
                </div>
            `;
            fileList.appendChild(fileItem);
        }
    } else {
        if (noFilesSelected) noFilesSelected.style.display = 'flex';
        removeBtn.style.display = 'none';
    }

    if (uploadBtn) {
        if (files.length > 0 && cutoffInput && cutoffInput.value) {
            uploadBtn.disabled = false;
        } else {
            uploadBtn.disabled = true;
        }
    }

    if (cutoffInput && !cutoffInput._regularUploadListenerAdded) {
        cutoffInput.addEventListener('input', function() {
            if (fileInput.files.length > 0 && cutoffInput.value) {
                uploadBtn.disabled = false;
            } else {
                uploadBtn.disabled = true;
            }
        });
        cutoffInput._regularUploadListenerAdded = true;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const regularForm = document.getElementById('regular-upload-form');
    if (regularForm) {
        regularForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const regularFileInput = document.getElementById('regular-files');
            const cutoffInput = document.getElementById('regular-cutoff-date');

            if (!cutoffInput || !cutoffInput.value || !regularFileInput.files || regularFileInput.files.length === 0) {
                if (window.portalUI) {
                    window.portalUI.showNotification('Please select a cutoff date and at least one file.', 'error');
                    setTimeout(() => {
                        if (window.portalUI && window.portalUI.closeNotification) {
                            window.portalUI.closeNotification('regular-upload-toast');
                        }
                    }, 10000);
                } else {
                    alert('Please select a cutoff date and at least one file.');
                }
                return;
            }

            const regularModal = document.getElementById('regularProbationaryImportModal');
            if (regularModal) {
                regularModal.classList.remove('show');
                const modalBackdrop = document.querySelector('.modal-backdrop');
                if(modalBackdrop) modalBackdrop.remove();
                document.body.classList.remove('modal-open');
            }

            const formData = new FormData();
            formData.append('cutoff_date', cutoffInput.value);
            for (let i = 0; i < regularFileInput.files.length; i++) {
                formData.append('files', regularFileInput.files[i]);
            }

            fetch(regularForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if(window.portalUI) {
                        window.portalUI.showNotification(data.message || 'Payslips uploaded successfully!', 'success', true, 5000);
                    } else {
                        alert(data.message || 'Payslips uploaded successfully!');
                    }
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    let errorMessage = data.message;
                    if (data.errors && data.errors.length > 0) {
                        errorMessage += ` Errors: ${data.errors.join(', ')}`;
                    }
                    if(window.portalUI) {
                        window.portalUI.showNotification(errorMessage, 'error', true, 5000);
                    } else {
                        alert(errorMessage);
                    }
                }
            })
            .catch(error => {
                console.error('Upload error:', error);
                if(window.portalUI) {
                    window.portalUI.showNotification('An unexpected error occurred during upload.', 'error', true, 5000);
                } else {
                    alert('An unexpected error occurred during upload.');
                }
            });
        });
    }
});