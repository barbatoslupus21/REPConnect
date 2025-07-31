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

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployeeFinanceModule;
}