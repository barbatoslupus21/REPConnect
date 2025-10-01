// Loan Deductions Modal logic
document.addEventListener('DOMContentLoaded', function() {
    // Open modal and load deductions
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.view-loan-btn');
        if (btn) {
            const loanId = btn.getAttribute('data-loan-id');
            const modal = document.getElementById('loanDeductionsModal');
            const body = document.getElementById('loanDeductionsBody');
            if (modal && body && loanId) {
                modal.classList.add('show');
                body.innerHTML = '<div class="loader" style="text-align:center; padding:2em;">Loading...</div>';
                fetch(`/finance/loan/${loanId}/deductions/`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            body.innerHTML = data.html;
                        } else {
                            body.innerHTML = '<div style="color:red;">'+(data.error || 'Failed to load deductions')+'</div>';
                        }
                    })
                    .catch(() => {
                        body.innerHTML = '<div style="color:red;">Failed to load deductions</div>';
                    });
            }
        }
    });
    // Close modal
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close')) {
            const modal = e.target.closest('.modal') || document.getElementById('loanDeductionsModal');
            if (modal) modal.classList.remove('show');
        }
    });
});
class EmployeeFinanceModule {
    constructor() {
        this.currentPayslip = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTabSwitching();
        this.setupViewAllButtons();
    }
    
    setupEventListeners() {

        // Send payslip email modal logic for .send-payslip-email-btn
        document.addEventListener('click', (e) => {
            if (e.target.closest('.send-payslip-email-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const btn = e.target.closest('.send-payslip-email-btn');
                const modal = document.getElementById('emailSelectionModal');
                
                if (!modal) return;
                
                // First ensure modal is hidden
                modal.classList.remove('show');
                
                // Store payslip data for later use
                this.currentPayslip = {
                    id: btn.getAttribute('data-payslip-id'),
                    employeeId: btn.getAttribute('data-employee-id'),
                    cutoffDate: btn.getAttribute('data-cutoff-date')
                };
                
                // Show modal with a small delay to ensure it's properly reset
                setTimeout(() => {
                    modal.classList.add('show');
                }, 50);
            }
        });

        // Modal close logic for .modal-close
        document.addEventListener('click', (e) => {
            if (e.target.closest('.modal-close')) {
                e.preventDefault();
                e.stopPropagation();
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                    this.resetModalState();
                }
            }
        });

        // Also close modal when clicking overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.preventDefault();
                e.stopPropagation();
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                    this.resetModalState();
                }
            }
        });
        
        // Email confirmation
        const confirmBtn = document.getElementById('confirm-email-send');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.sendPayslipEmail();
            });
        }
        
        // Cancel button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-outline') && e.target.textContent.trim() === 'Cancel') {
                e.preventDefault();
                e.stopPropagation();
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                    this.resetModalState();
                }
            }
        });
        
        // ESC key handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    openModal.classList.remove('show');
                    this.resetModalState();
                }
            }
        });
        
        // Move toggle logic to global scope to avoid issues
        setTimeout(() => {
            this.initializeLoanToggle();
        }, 100);
    }
    
    initializeLoanToggle() {
        const toggle = document.getElementById('showActiveLoansOnly');
        const loanTable = document.getElementById('loanTableContainer');
        
        console.log('Initializing loan toggle...', { toggle, loanTable });
        
        if (toggle && loanTable) {
            const activeRows = loanTable.querySelectorAll('tbody tr.active-loan');
            const inactiveRows = loanTable.querySelectorAll('tbody tr.inactive-loan');
            
            console.log('Found rows:', { activeRows: activeRows.length, inactiveRows: inactiveRows.length });
            
            const filterLoans = () => {
                const showActiveOnly = toggle.checked;
                console.log('Filtering loans. Show active only:', showActiveOnly);
                if (showActiveOnly) {
                    // Show only active loans (hide inactive with effect)
                    activeRows.forEach(row => {
                        row.style.display = '';
                        console.log('Showing active row:', row);
                    });
                    inactiveRows.forEach(row => {
                        // Add fade-in effect before hiding
                        row.classList.add('fade-in-effect');
                        setTimeout(() => {
                            row.classList.remove('fade-in-effect');
                            row.style.display = 'none';
                        }, 700);
                        console.log('Hiding inactive row with effect:', row);
                    });
                } else {
                    // Show both active and inactive loans, animate inactive
                    activeRows.forEach(row => {
                        row.style.display = '';
                        console.log('Showing active row:', row);
                    });
                    inactiveRows.forEach(row => {
                        row.style.display = '';
                        // Add fade-in effect
                        row.classList.add('fade-in-effect');
                        // Remove the effect class after animation
                        setTimeout(() => {
                            row.classList.remove('fade-in-effect');
                        }, 700);
                        console.log('Showing inactive row with effect:', row);
                    });
                }
                // Animate progress bars after filtering
                setTimeout(animateProgressBars, 100);
            };
            
            toggle.addEventListener('change', filterLoans);
            filterLoans(); // Initial filter on page load
        } else {
            console.error('Toggle or loan table not found!', { toggle, loanTable });
        }
        
        // Initial progress bar animation on page load
        setTimeout(animateProgressBars, 500);
    }
    
    resetModalState() {
        // Reset form
        const form = document.getElementById('email-selection-form');
        if (form) form.reset();
        
        // Reset radio buttons to default (first option checked)
        const emailOptions = document.getElementById('email-options');
        if (emailOptions) {
            const firstRadio = emailOptions.querySelector('input[type="radio"]');
            if (firstRadio) firstRadio.checked = true;
        }
        
        // Hide payslip info
        const payslipInfoContainer = document.getElementById('payslip-info');
        if (payslipInfoContainer) payslipInfoContainer.style.display = 'none';
        
        // Reset current payslip
        this.currentPayslip = null;
    }
    
    setupViewAllButtons() {
        // Handle "View All" button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-all-btn')) {
                const btn = e.target.closest('.view-all-btn');
                const target = btn.dataset.target;
                this.showDetailedView(target);
            }
        });
        
        // Handle back button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-back')) {
                this.showSummaryView();
            }
        });
    }
    
    showDetailedView(target) {
        const summaryView = document.querySelector('.financial-summary');
        const detailedViews = document.querySelector('.detailed-views');
        const targetView = document.getElementById(`detailed-${target}`);
        
        if (summaryView && detailedViews && targetView) {
            // Hide summary
            summaryView.style.display = 'none';
            
            // Show detailed views container
            detailedViews.style.display = 'block';
            
            // Hide all detailed views
            document.querySelectorAll('.detailed-view').forEach(view => {
                view.classList.remove('active');
            });
            
            // Show target view
            targetView.classList.add('active');
            
            // Load content based on target
            this.loadDetailedContent(target, targetView);
        }
    }
    
    showSummaryView() {
        const summaryView = document.querySelector('.financial-summary');
        const detailedViews = document.querySelector('.detailed-views');
        
        if (summaryView && detailedViews) {
            summaryView.style.display = 'block';
            detailedViews.style.display = 'none';
        }
    }
    
    loadDetailedContent(target, targetView) {
        // This would typically load content via AJAX
        // For now, we'll create placeholder content
        const contentArea = targetView.querySelector('.detailed-content') || 
                           this.createDetailedContentArea(targetView);
        
        switch(target) {
            case 'payslips':
                this.loadPayslipsContent(contentArea);
                break;
            case 'loans':
                this.loadLoansContent(contentArea);
                break;
            case 'allowances':
                this.loadAllowancesContent(contentArea);
                break;
            case 'savings':
                this.loadSavingsContent(contentArea);
                break;
        }
    }
    
    createDetailedContentArea(targetView) {
        const contentArea = document.createElement('div');
        contentArea.className = 'detailed-content';
        targetView.appendChild(contentArea);
        return contentArea;
    }
    
    loadPayslipsContent(contentArea) {
        contentArea.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading payslips...</p>
            </div>
        `;
        // Here you would typically make an AJAX call to load full payslips data
    }
    
    loadLoansContent(contentArea) {
        contentArea.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading loans...</p>
            </div>
        `;
        // Here you would typically make an AJAX call to load full loans data
    }
    
    loadAllowancesContent(contentArea) {
        contentArea.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading allowances...</p>
            </div>
        `;
        // Here you would typically make an AJAX call to load full allowances data
    }
    
    loadSavingsContent(contentArea) {
        contentArea.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading savings...</p>
            </div>
        `;
        // Here you would typically make an AJAX call to load full savings data
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                    
                    // Add smooth transition animation
                    targetContent.style.opacity = '0';
                    targetContent.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        targetContent.style.transition = 'all 0.3s ease';
                        targetContent.style.opacity = '1';
                        targetContent.style.transform = 'translateY(0)';
                    }, 50);
                }
            });
        });
    }
    
    showEmailSelection(payslipId, payslipType, buttonElement) {
        // Get payslip information from the card
        const payslipCard = buttonElement.closest('.payslip-card');
        let payslipInfo = {
            employee: '{{ request.user.name }}',
            period: 'N/A',
            type: payslipType
        };
        
        if (payslipCard) {
            const headerElement = payslipCard.querySelector('.card-header h4');
            if (headerElement) {
                payslipInfo.period = headerElement.textContent.trim();
            }
            
            const typeElement = payslipCard.querySelector('.payslip-type-badge');
            if (typeElement) {
                payslipInfo.type = typeElement.textContent.trim();
            }
        }
        
        // Setup email options (these would normally come from the server)
        const emailOptions = [
            { value: 'personal', label: 'Personal Email ({{ request.user.email }})' },
            { value: 'work', label: 'Work Email' }
        ];
        
        const radioContainer = document.getElementById('email-options');
        if (!radioContainer) return;
        
        radioContainer.innerHTML = '';
        
        emailOptions.forEach((option, index) => {
            const radioDiv = document.createElement('div');
            radioDiv.innerHTML = `
                <label class="label">
                    <input type="radio" name="email_type" value="${option.value}" ${index === 0 ? 'checked' : ''}>
                    <p class="text">${option.label}</p>
                </label>
            `;
            radioContainer.appendChild(radioDiv);
        });
        
        // Update payslip info in modal
        this.updatePayslipInfo(payslipInfo);
        
        // Store payslip info for sending
        this.currentPayslip = { 
            id: payslipId, 
            type: payslipType,
            info: payslipInfo
        };
        
        this.openModal('emailSelectionModal');
    }
    
    updatePayslipInfo(payslipInfo) {
        const employeeNameElement = document.getElementById('payslip-employee-name');
        const periodElement = document.getElementById('payslip-period');
        const typeElement = document.getElementById('payslip-type');
        const payslipInfoContainer = document.getElementById('payslip-info');
        
        if (employeeNameElement) employeeNameElement.textContent = payslipInfo.employee;
        if (periodElement) periodElement.textContent = payslipInfo.period;
        if (typeElement) typeElement.textContent = payslipInfo.type;
        if (payslipInfoContainer) payslipInfoContainer.style.display = 'block';
    }
    
    async sendPayslipEmail() {
        const selectedEmail = document.querySelector('input[name="selected_email"]:checked');
        if (!selectedEmail || !this.currentPayslip) {
            this.showToast('Please select an email option', 'warning');
            return;
        }
        
        // Show custom loader
        const loader = document.getElementById('emailLoader');
        if (loader) {
            loader.style.display = 'flex';
        }
        
        // Close modal
        const modal = document.getElementById('emailSelectionModal');
        if (modal) {
            modal.classList.remove('show');
        }
        
        try {
            const formData = new FormData();
            formData.append('selected_email', selectedEmail.value);
            formData.append('csrfmiddlewaretoken', this.getCSRFToken());
            
            const response = await fetch(`/finance/payslip/send/${this.currentPayslip.id}/`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // Hide loader
            if (loader) {
                loader.style.display = 'none';
            }
            
            if (data.success) {
                this.showToast(data.message, 'success');
                
                // Update the payslip status in the UI
                this.updatePayslipStatus(this.currentPayslip.id, true);
            } else {
                this.showToast(data.message || 'Failed to send email', 'error');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            this.showToast('Error sending email. Please try again.', 'error');
            
            // Hide loader
            if (loader) {
                loader.style.display = 'none';
            }
        } finally {
            // Reset modal state
            this.resetModalState();
        }
    }
    
    updatePayslipStatus(payslipId, isSent) {
        // Find the status badge for this payslip and update it
        const payslipRows = document.querySelectorAll(`[data-payslip-id="${payslipId}"]`);
        payslipRows.forEach(button => {
            const row = button.closest('tr');
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge && isSent) {
                    statusBadge.className = 'status-badge status-connected';
                    statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Sent to mail';
                }
            }
        });
    }
    
    markPayslipAsSent() {
        // Find all payslip buttons with the same ID and mark them as sent
        const buttons = document.querySelectorAll(`[data-payslip-id="${this.currentPayslip.id}"]`);
        buttons.forEach(btn => {
            btn.classList.add('btn-success');
            btn.classList.remove('btn-primary');
            btn.innerHTML = '<i class="fas fa-check"></i> Sent';
            
            // Reset after 3 seconds
            setTimeout(() => {
                btn.classList.remove('btn-success');
                btn.classList.add('btn-primary');
                btn.innerHTML = '<i class="fas fa-envelope"></i> Send to Email';
            }, 3000);
        });
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            document.body.style.overflow = 'hidden';
            
            // Add entrance animation
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'scale(0.9) translateY(-20px)';
                modalContent.style.opacity = '0';
                
                setTimeout(() => {
                    modalContent.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    modalContent.style.transform = 'scale(1) translateY(0)';
                    modalContent.style.opacity = '1';
                }, 50);
            }
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            
            if (modalContent) {
                modalContent.style.transition = 'all 0.2s ease';
                modalContent.style.transform = 'scale(0.9) translateY(-20px)';
                modalContent.style.opacity = '0';
            }
            
            setTimeout(() => {
                modal.classList.remove('show');
                modal.style.opacity = '0';
                modal.style.visibility = 'hidden';
                document.body.style.overflow = '';
                
                // Reset payslip info
                const payslipInfoContainer = document.getElementById('payslip-info');
                if (payslipInfoContainer) payslipInfoContainer.style.display = 'none';
                
                // Reset form
                const form = document.getElementById('email-selection-form');
                if (form) form.reset();
                
                this.currentPayslip = null;
            }, 200);
        }
    }
    
    showToast(message, type = 'info') {
        // Use the existing toast notification system from the project
        if (window.portalUI && window.portalUI.showNotification) {
            window.portalUI.showNotification(message, type);
        } else {
            // Fallback if toast system is not available
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Create a simple toast fallback
            this.createSimpleToast(message, type);
        }
    }
    
    createSimpleToast(message, type) {
        // Simple toast fallback implementation
        const toast = document.createElement('div');
        toast.className = `simple-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInToast 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
        
        // Add animation styles if not already present
        this.addToastAnimations();
    }
    
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    getToastColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#17a2b8';
    }
    
    addToastAnimations() {
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInToast {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutToast {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .simple-toast .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    getCSRFToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }
    
    // Utility method to format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }
    
    // Utility method to format dates
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Progress bar animation function
function animateProgressBars() {
    const progressBars = document.querySelectorAll('.loan-progress-bar-fill');
    let visibleIndex = 0;
    progressBars.forEach((bar) => {
        // Only animate visible progress bars
        const row = bar.closest('tr');
        if (row && row.style.display !== 'none') {
            const targetWidth = bar.getAttribute('data-width') + '%';
            // Add a small delay for each visible bar for a staggered effect
            setTimeout(() => {
                bar.classList.add('animating');
                bar.style.width = targetWidth;
                // Remove the shimmer effect after animation completes
                setTimeout(() => {
                    bar.classList.remove('animating');
                }, 2000);
            }, visibleIndex * 200);
            visibleIndex++;
        } else {
            // Reset hidden bars to 0 width
            bar.style.width = '0%';
            bar.classList.remove('animating');
        }
    });
}

// Initialize the employee finance module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.employeeFinance = new EmployeeFinanceModule();
});

// User Finance Page Tour Function
function startUserFinanceTour() {
    // Check if user is OJT - don't show tour for OJT users
    const userEmploymentType = document.body.getAttribute('data-employment-type');
    if (userEmploymentType === 'OJT') {
        alert('Page tour is not available for OJT users as some sections are not accessible.');
        return;
    }

    // Collect available tour steps
    const availableSteps = [];

    // Welcome step (no element, just intro)
    availableSteps.push({
        intro: '<h2>Welcome to your Finance Dashboard!</h2><p>This quick tour will guide you through the main features so you can make the most of your financial tools.</p>',
        position: 'center'
    });

    // Always include dashboard stats (step 1)
    const dashboardElement = document.querySelector('[data-step="1"]');
    if (dashboardElement) {
        availableSteps.push({
            element: '[data-step="1"]',
            intro: dashboardElement.getAttribute('data-intro'),
            position: 'bottom'
        });
    }
    
    // Check for loans section (steps 2, 3, 4, 5)
    const loanTableElement = document.querySelector('[data-step="2"]');
    const loanToggleElement = document.querySelector('[data-step="3"]');
    const viewLoanBtnElement = document.querySelector('[data-step="4"]');
    
    if (loanTableElement && loanToggleElement) {
        availableSteps.push({
            element: '[data-step="2"]',
            intro: loanTableElement.getAttribute('data-intro'),
            position: 'top'
        });
        
        availableSteps.push({
            element: '[data-step="3"]',
            intro: loanToggleElement.getAttribute('data-intro'),
            position: 'bottom'
        });
        
        if (viewLoanBtnElement) {
            availableSteps.push({
                element: '[data-step="4"]',
                intro: viewLoanBtnElement.getAttribute('data-intro'),
                position: 'top'
            });
            
            // Add deduction modal step only if view loan button exists
            availableSteps.push({
                element: '[data-step="5"]',
                intro: '<b>Loan Deductions Modal</b><br>This modal shows detailed information about loan deductions including payment schedules and amounts.',
                position: 'bottom'
            });
        }
    }
    
    // Check for payslips section (steps 6, 7, 8)
    const payslipTableElement = document.querySelector('[data-step="6"]');
    const emailPayslipBtnElement = document.querySelector('[data-step="7"]');
    
    if (payslipTableElement) {
        availableSteps.push({
            element: '[data-step="6"]',
            intro: payslipTableElement.getAttribute('data-intro'),
            position: 'top'
        });
        
        if (emailPayslipBtnElement) {
            availableSteps.push({
                element: '[data-step="7"]',
                intro: emailPayslipBtnElement.getAttribute('data-intro'),
                position: 'top'
            });
            
            // Add email modal step only if email button exists
            availableSteps.push({
                element: '[data-step="8"]',
                intro: '<b>Email Selection Modal</b><br>Choose which email address to send your payslip to - your personal email or work email.',
                position: 'bottom'
            });
        }
    }
    
    // Check for allowances section (step 9)
    const allowancesElement = document.querySelector('[data-step="9"]');
    if (allowancesElement) {
        availableSteps.push({
            element: '[data-step="9"]',
            intro: allowancesElement.getAttribute('data-intro'),
            position: 'top'
        });
    }
    
    // Check for savings section (step 10)
    const savingsElement = document.querySelector('[data-step="10"]');
    if (savingsElement) {
        availableSteps.push({
            element: '[data-step="10"]',
            intro: savingsElement.getAttribute('data-intro'),
            position: 'top'
        });
    }
    
    // If no sections are available except dashboard, show a message
    if (availableSteps.length <= 1) {
        alert('No financial data available for tour. Please check back once you have loans, payslips, allowances, or savings data.');
        return;
    }

    // Configure intro.js
    introJs.tour().setOptions({
        showStepNumbers: true,
        showBullets: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: 'Next →',
        prevLabel: '← Back',
        doneLabel: 'Finish Tour',
        skipLabel: '×',
        highlightClass: 'tour-highlight',
        scrollToElement: true,
        scrollPadding: 50,
        positionPrecedence: ['bottom', 'top', 'right', 'left'],
        showProgress: true,
        progressBarAdditionalClass: 'tour-progress-bar',
        steps: availableSteps
    }).onbeforechange(function(targetElement) {
        // Handle modal visibility during tour
        const stepElement = targetElement;
        const intro = stepElement ? stepElement.getAttribute('data-intro') || '' : '';
        
        // Show deduction modal for deduction modal step
        if (intro.includes('Loan Deductions Modal')) {
            const modal = document.getElementById('loanDeductionsModal');
            if (modal) {
                modal.classList.add('show');
                // Add sample content if modal body is empty
                const modalBody = document.getElementById('loanDeductionsBody');
                if (modalBody && modalBody.innerHTML.trim() === '') {
                    modalBody.innerHTML = `
                        <div style="padding: 20px; text-align: center;">
                            <h4>Sample Loan Deduction Details</h4>
                            <table style="width:100%;margin:1em 0;border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f3f4f6;">
                                        <th style="padding:8px;border:1px solid #e5e7eb;">Date</th>
                                        <th style="padding:8px;border:1px solid #e5e7eb;">Amount</th>
                                        <th style="padding:8px;border:1px solid #e5e7eb;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding:8px;border:1px solid #e5e7eb;">2025-08-15</td>
                                        <td style="padding:8px;border:1px solid #e5e7eb;">₱ 2,000.00</td>
                                        <td style="padding:8px;border:1px solid #e5e7eb;"><span style="color: #10b981; font-weight: bold;">Paid</span></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px;border:1px solid #e5e7eb;">2025-09-15</td>
                                        <td style="padding:8px;border:1px solid #e5e7eb;">₱ 2,000.00</td>
                                        <td style="padding:8px;border:1px solid #e5e7eb;"><span style="color: #f59e0b; font-weight: bold;">Upcoming</span></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:8px;border:1px solid #e5e7eb;">2025-10-15</td>
                                        <td style="padding:8px;border:1px solid #e5e7eb;">₱ 2,000.00</td>
                                        <td style="padding:8px;border:1px solid #e5e7eb;"><span style="color: #f59e0b; font-weight: bold;">Upcoming</span></td>
                                    </tr>
                                </tbody>
                            </table>
                            <p style="margin-top:1em;color:#64748b;"><em>This is a demo for the tour - actual data would appear here when viewing a real loan.</em></p>
                        </div>
                    `;
                }
                // Center modal in viewport
                setTimeout(() => {
                    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
        
        // Show email modal for email modal step
        if (intro.includes('Email Selection Modal')) {
            const modal = document.getElementById('emailSelectionModal');
            if (modal) {
                modal.classList.add('show');
            }
        }
        
        // Hide modals when not on modal steps or when moving to next step
        if (!intro.includes('Loan Deductions Modal')) {
            const deductionModal = document.getElementById('loanDeductionsModal');
            if (deductionModal) {
                deductionModal.classList.remove('show');
            }
        }
        
        if (!intro.includes('Email Selection Modal')) {
            const emailModal = document.getElementById('emailSelectionModal');
            if (emailModal) {
                emailModal.classList.remove('show');
            }
        }
        
        // Scroll to element with better positioning
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            
            if (!isVisible) {
                targetElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        }
    }).onexit(function() {
        // Clean up - hide any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => modal.classList.remove('show'));
    }).oncomplete(function() {
        // Clean up - hide any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => modal.classList.remove('show'));
        
        // Optional: Show completion message
        // (Removed alert on tour completion)
    }).start();
}

// Make tour function globally available
window.startUserFinanceTour = startUserFinanceTour;

// Toast notification system using existing style.css classes
function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    if (toast && toast.parentNode) {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// OJT Payslip functionality
document.addEventListener('DOMContentLoaded', function() {
    // View OJT Payslip Details
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.view-ojtpayslip-btn');
        if (btn) {
            const payslipId = btn.getAttribute('data-payslip-id');
            const modal = document.getElementById('ojtPayslipDetailsModal');
            
            if (modal && payslipId) {
                modal.classList.add('show');
                loadOJTPayslipDetails(payslipId);
            }
        }
    });

    // Send OJT Payslip Email
    document.body.addEventListener('click', function(e) {
        const btn = e.target.closest('.send-ojtpayslip-email-btn');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            
            const payslipId = btn.getAttribute('data-payslip-id');
            const userEmail = btn.getAttribute('data-user-email');
            const workEmail = btn.getAttribute('data-work-email');
            const cutoffDate = btn.getAttribute('data-cutoff-date');
            
            showOJTEmailConfirmationModal(payslipId, userEmail, workEmail, cutoffDate);
        }
    });

    // Print OJT Payslip
    document.getElementById('printOjtPayslip')?.addEventListener('click', function() {
        printOJTPayslip();
    });

    // Close OJT modal
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close')) {
            const modal = e.target.closest('.modal');
            if (modal && (modal.id === 'ojtPayslipDetailsModal' || modal.id === 'ojtEmailConfirmationModal')) {
                modal.classList.remove('show');
            }
        }
    });

    // OJT Email Confirmation
    const confirmOJTEmailBtn = document.getElementById('confirm-ojt-email-send');
    if (confirmOJTEmailBtn) {
        confirmOJTEmailBtn.addEventListener('click', function() {
            sendOJTPayslipEmailConfirmed();
        });
    }
});

function loadOJTPayslipDetails(payslipId) {
    console.log('Loading OJT payslip details for ID:', payslipId);
    
    fetch(`/finance/ajax/ojt-payslip-details/${payslipId}/`)
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Full response data:', data);
            
            if (data.success) {
                populateOJTPayslipModal(data.payslip);
                // Remove success toast as requested
            } else {
                console.error('Server error:', data.error);
                showToast('error', data.error || 'Failed to load payslip details');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showToast('error', 'Failed to load payslip details. Please try again.');
        });
}

function populateOJTPayslipModal(payslip) {
    console.log('Populating modal with payslip data:', payslip);
    
    try {
        // Employee info
        const employeeData = payslip.employee || {};
        console.log('Employee data:', employeeData);
        
        // Safely populate employee information
        const setElementText = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '-';
                console.log(`Set ${id} to:`, value || '-');
            } else {
                console.warn(`Element with ID '${id}' not found`);
            }
        };

        // Employee basic info
        setElementText('ojt-id-number', employeeData.idnumber);
        setElementText('ojt-cutoff', payslip.cut_off);
        setElementText('ojt-name', employeeData.full_name);
        setElementText('ojt-line', employeeData.line);

        // Regular Day section
        setElementText('ojt-regular-days', payslip.regular_day);
        setElementText('ojt-allowance-day', payslip.allowance_day);
        
        // Calculate regular total
        const regularDays = parseFloat(payslip.regular_day || 0);
        const allowanceDay = parseFloat(payslip.allowance_day || 0);
        const regularTotal = regularDays * allowanceDay;
        setElementText('ojt-regular-total', regularTotal.toFixed(2));
        
        // Regular Day fields
        setElementText('ojt-reg-nd-allowance', payslip.nd_allowance);
        setElementText('ojt-grand-total', payslip.grand_total);
        setElementText('ojt-basic-school-share', payslip.basic_school_share);
        setElementText('ojt-basic-ojt-share', payslip.basic_ojt_share);
        setElementText('ojt-deduction', payslip.deduction);
        setElementText('ojt-net-basic-share', payslip.net_ojt_share);

        // Allowances section
        setElementText('ojt-rice-allowance', payslip.rice_allowance);
        setElementText('ojt-reg-ot-allowance', payslip.ot_allowance);
        setElementText('ojt-reg-nd-ot-allowance', payslip.nd_ot_allowance);
        setElementText('ojt-special-holiday', payslip.special_holiday);
        setElementText('ojt-legal-holiday', payslip.legal_holiday);
        setElementText('ojt-sat-off-allowance', payslip.satoff_allowance);
        setElementText('ojt-rd-ot', payslip.rd_ot);
        setElementText('ojt-perfect-attendance', payslip.perfect_attendance);
        setElementText('ojt-adjustment', payslip.adjustment);
        setElementText('ojt-deduction-2', payslip.deduction_2);
        setElementText('ojt-net-ot-pay-allowance', payslip.ot_pay_allowance);

        // Total allowance calculation - sum of NET OJT OT PAY ALLOWANCE + NET BASIC ALLOW. OJT SHARE
        const netBasicOjtShare = parseFloat(payslip.net_ojt_share || 0);
        const netOjtOtPayAllowance = parseFloat(payslip.ot_pay_allowance || 0);
        const totalAllowanceValue = netBasicOjtShare + netOjtOtPayAllowance;
        
        const formattedTotal = `₱ ${totalAllowanceValue.toLocaleString('en-US', {
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2
        })}`;
        setElementText('ojt-total-allowance-display', formattedTotal);
        
        console.log('Modal populated successfully');
        
    } catch (error) {
        console.error('Error populating modal:', error);
        showToast('error', 'Failed to populate payslip details');
    }
}

// Global variables for OJT email confirmation
let currentOJTPayslipId = null;
let currentOJTEmail = null;

function showOJTEmailConfirmationModal(payslipId, userEmail, workEmail, cutoffDate) {
    // Store current payslip data
    currentOJTPayslipId = payslipId;
    
    // Determine which email to use
    const emails = [];
    if (userEmail && userEmail !== 'None') emails.push(userEmail);
    if (workEmail && workEmail !== 'None' && workEmail !== userEmail) emails.push(workEmail);
    
    if (emails.length === 0) {
        showToast('warning', 'No email address found. Please update your profile.');
        return;
    }
    
    // For now, use the first available email (you can enhance this later for multiple email selection)
    currentOJTEmail = emails[0];
    
    // Update modal content
    const emailDisplay = document.getElementById('ojt-confirmation-email');
    const cutoffDisplay = document.getElementById('ojt-confirmation-cutoff');
    
    if (emailDisplay) emailDisplay.textContent = currentOJTEmail;
    if (cutoffDisplay) cutoffDisplay.textContent = cutoffDate;
    
    // Show modal
    const modal = document.getElementById('ojtEmailConfirmationModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function sendOJTPayslipEmailConfirmed() {
    if (!currentOJTPayslipId || !currentOJTEmail) {
        showToast('error', 'Missing payslip information. Please try again.');
        return;
    }
    
    // Close confirmation modal
    const confirmationModal = document.getElementById('ojtEmailConfirmationModal');
    if (confirmationModal) {
        confirmationModal.classList.remove('show');
    }
    
    // Show email loader
    const loader = document.getElementById('emailLoader');
    if (loader) loader.style.display = 'flex';
    
    // Send email
    sendOJTPayslipEmail(currentOJTPayslipId, currentOJTEmail);
    
    // Reset variables
    currentOJTPayslipId = null;
    currentOJTEmail = null;
}

function sendOJTPayslipEmail(payslipId, email) {
    fetch(`/finance/ojt-payslip/send/${payslipId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            email: email
        })
    })
    .then(response => response.json())
    .then(data => {
        // Hide email loader
        const loader = document.getElementById('emailLoader');
        if (loader) loader.style.display = 'none';
        
        if (data.success) {
            showToast('success', `OJT payslip has been sent to ${email}`);
        } else {
            showToast('error', data.error || 'Failed to send email');
        }
    })
    .catch(error => {
        // Hide email loader
        const loader = document.getElementById('emailLoader');
        if (loader) loader.style.display = 'none';
        
        console.error('Error sending email:', error);
        showToast('error', 'Failed to send email. Please try again.');
    });
}

function printOJTPayslip() {
    const modal = document.getElementById('ojtPayslipDetailsModal');
    const printContent = modal.querySelector('.payslip-container');
    
    if (printContent) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OJT Payslip</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        font-size: 12px;
                    }
                    .payslip-container { width: 100%; }
                    .payslip-header { margin-bottom: 20px; }
                    .company-info { 
                        display: flex; 
                        align-items: center; 
                        justify-content: center;
                        margin-bottom: 20px;
                    }
                    .company-logo { 
                        width: 60px; 
                        height: 60px; 
                        margin-right: 15px; 
                    }
                    .company-details h1 { 
                        margin: 0; 
                        font-size: 16px; 
                        font-weight: bold;
                    }
                    .company-details p { 
                        margin: 5px 0 0 0; 
                        font-size: 10px; 
                    }
                    .employee-info-grid { 
                        display: grid; 
                        grid-template-columns: 1fr 1fr; 
                        gap: 10px; 
                        margin-bottom: 20px;
                        border: 1px solid #000;
                    }
                    .employee-info-grid > div {
                        display: flex;
                        padding: 8px;
                        border-right: 1px solid #000;
                        border-bottom: 1px solid #000;
                    }
                    .employee-info-grid > div:nth-child(2n) {
                        border-right: none;
                    }
                    .employee-info-grid > div:nth-last-child(-n+2) {
                        border-bottom: none;
                    }
                    .info-label { 
                        font-weight: bold; 
                        margin-right: 10px;
                        min-width: 80px;
                    }
                    .info-value { 
                        flex: 1;
                    }
                    .section-row { 
                        display: flex; 
                        gap: 20px; 
                        margin-bottom: 20px; 
                    }
                    .section { 
                        flex: 1; 
                        border: 1px solid #000; 
                    }
                    .section h3 { 
                        margin: 0; 
                        padding: 10px; 
                        background: #f0f0f0; 
                        font-size: 14px; 
                        text-align: center;
                        border-bottom: 1px solid #000;
                    }
                    .section-content { padding: 10px; }
                    .field { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-bottom: 5px; 
                        padding: 2px 0;
                    }
                    .field.total { 
                        border-top: 1px solid #000; 
                        font-weight: bold; 
                        padding-top: 5px;
                    }
                    .total-allowance { 
                        text-align: center; 
                        font-size: 16px; 
                        font-weight: bold; 
                        border: 2px solid #000; 
                        padding: 15px; 
                        margin-top: 20px;
                    }
                    hr { 
                        margin: 10px 0; 
                        border: none; 
                        border-top: 1px solid #000; 
                    }
                    @media print {
                        body { margin: 0; }
                        .payslip-container { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                ${printContent.outerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }
}

// Helper function to get CSRF token
function getCookie(name) {
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

// Privacy Toggle Functionality
function togglePrivacy(type) {
    const valueElement = document.getElementById(`${type}-value`);
    const eyeIcon = document.getElementById(`${type}-eye-icon`);
    
    if (!valueElement || !eyeIcon) return;
    
    const isHidden = valueElement.classList.contains('hidden');
    const actualValue = valueElement.getAttribute('data-value');
    
    // Add transitioning class for smooth effect
    valueElement.classList.add('transitioning');
    
    setTimeout(() => {
        if (isHidden) {
            // Show the actual value
            valueElement.textContent = actualValue;
            valueElement.classList.remove('hidden');
            valueElement.classList.add('showing');
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        } else {
            // Hide the value
            valueElement.textContent = '₱ - - - -';
            valueElement.classList.remove('showing');
            valueElement.classList.add('hidden');
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
        
        // Remove transitioning class
        setTimeout(() => {
            valueElement.classList.remove('transitioning');
        }, 50);
    }, 150);
}

// Initialize privacy states on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial state for all privacy values
    const privacyTypes = ['allowances', 'savings', 'loans'];
    
    privacyTypes.forEach(type => {
        const valueElement = document.getElementById(`${type}-value`);
        const eyeIcon = document.getElementById(`${type}-eye-icon`);
        
        if (valueElement && eyeIcon) {
            // Ensure initial hidden state
            valueElement.classList.add('hidden');
            valueElement.classList.remove('showing');
            eyeIcon.classList.add('fa-eye-slash');
            eyeIcon.classList.remove('fa-eye');
        }
    });
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployeeFinanceModule;
}