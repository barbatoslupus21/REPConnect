// Main DOMContentLoaded event listener - consolidating all initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing employee finance details page...');
    // Initialize tab switching
    initTabFunctionality();
    // Initialize progress bar animations
    initProgressBarAnimations();
    // Initialize loan functionality
    initLoanFunctionality();
    // Initialize allowance functionality
    initAllowanceFunctionality();
    // Initialize payslip functionality
    initPayslipFunctionality();
    // Initialize OJT payslip view modal functionality
    initOjtPayslipViewModal();
    // Initialize page tour functionality
    initPageTour();

    // Initialize savings withdraw modal functionality
    initWithdrawSavingsModal();
});
// Withdraw Savings Modal functionality
function initWithdrawSavingsModal() {
    const withdrawModal = document.getElementById('withdrawSavingsModal');
    const savingsIdInput = document.getElementById('withdrawSavingsId');
    const withdrawForm = document.getElementById('withdrawSavingsForm');
    if (!withdrawModal) return;

    // Bind withdraw buttons
    document.querySelectorAll('.withdraw-savings-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const savingsId = btn.getAttribute('data-savings-id');
            if (savingsIdInput) savingsIdInput.value = savingsId;
            withdrawModal.style.display = 'flex';
            withdrawModal.classList.add('show');
        });
    });

    // Handle form submission
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const savingsId = savingsIdInput.value;
            const employeeId = document.querySelector('input[name="employee_id"]').value;
            
            if (!savingsId) {
                alert('No savings selected');
                return;
            }

            // Submit the withdrawal
            fetch(`/finance/savings/withdraw/${savingsId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employeeId
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success toast
                    if (window.app && window.app.showNotification) {
                        window.app.showNotification(data.message, 'success', 5000);
                    }
                    // Store the current tab before redirect
                    localStorage.setItem('activeTab', 'allowances-tab');
                    // Close modal first
                    withdrawModal.classList.remove('show');
                    withdrawModal.style.display = 'none';
                    // Redirect to the employee details page
                    setTimeout(() => {
                        window.location.href = data.redirect_url;
                    }, 500);
                } else {
                    alert(data.message || 'Error withdrawing savings');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error withdrawing savings');
            });
        });
    }

    // Close modal handlers
    const closeEls = withdrawModal.querySelectorAll('.close-withdraw-savings-modal, .modal-close');
    closeEls.forEach(el => {
        el.addEventListener('click', function() {
            withdrawModal.classList.remove('show');
            setTimeout(() => {
                withdrawModal.style.display = 'none';
            }, 300);
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === withdrawModal) {
            withdrawModal.classList.remove('show');
            setTimeout(() => {
                withdrawModal.style.display = 'none';
            }, 300);
        }
    });
}

// OJT Payslip View Modal functionality
function initOjtPayslipViewModal() {
    const modal = document.getElementById('ojtPayslipViewModal');
    if (!modal) return;

    // Function to populate modal with payslip data
    function populateOjtPayslipModal(payslip) {
        // Helper function to format currency
        const formatCurrency = (value) => {
            const num = parseFloat(value) || 0;
            return `₱ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        // Helper function to safely set element content
        const safeSetContent = (id, content) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = content;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        };

        // Populate Basic Information fields
        safeSetContent('modal-cut-off', payslip.cut_off || '-');
        safeSetContent('modal-holiday-hours', parseFloat(payslip.holiday_hours || 0).toFixed(2));
        safeSetContent('modal-rd-ot-days', parseFloat(payslip.rd_ot_days || 0).toFixed(2));
        safeSetContent('modal-regular-day', parseFloat(payslip.regular_day || 0).toFixed(2) + ' Days');
        safeSetContent('modal-allowance-day', formatCurrency(payslip.allowance_day));
        
        // Populate OJT Rate fields
        safeSetContent('modal-reg-nd-rate', formatCurrency(payslip.reg_nd_rate));
        safeSetContent('modal-reg-nd-ot-rate', formatCurrency(payslip.reg_nd_ot_rate));
        safeSetContent('modal-reg-ot-rate', formatCurrency(payslip.reg_ot_rate));
        safeSetContent('modal-rest-ot-rate', formatCurrency(payslip.rest_ot_rate));
        safeSetContent('modal-legal-rate', formatCurrency(payslip.legal_rate));
        safeSetContent('modal-sat-off-rate', formatCurrency(payslip.sat_off_rate));
        
        // Populate Allowances & Benefits fields
        safeSetContent('modal-basic-ojt-share', formatCurrency(payslip.basic_ojt_share));
        safeSetContent('modal-nd-allowance', formatCurrency(payslip.nd_allowance));
        safeSetContent('modal-rice-allowance', formatCurrency(payslip.rice_allowance));
        safeSetContent('modal-perfect-attendance', formatCurrency(payslip.perfect_attendance));
        safeSetContent('modal-satoff-allowance', formatCurrency(payslip.satoff_allowance));
        
        // Populate Holidays & Overtime fields
        safeSetContent('modal-nd-ot-allowance', formatCurrency(payslip.nd_ot_allowance));
        safeSetContent('modal-ot-allowance', formatCurrency(payslip.ot_allowance));
        safeSetContent('modal-rd-ot', formatCurrency(payslip.rd_ot));
        safeSetContent('modal-special-holiday', formatCurrency(payslip.special_holiday));
        safeSetContent('modal-legal-holiday', formatCurrency(payslip.legal_holiday));
        safeSetContent('modal-adjustment', formatCurrency(payslip.adjustment));
        
        // Populate Shares & Deductions fields
        safeSetContent('modal-basic-school-share', formatCurrency(payslip.basic_school_share));
        safeSetContent('modal-deduction', formatCurrency(payslip.deduction));
        safeSetContent('modal-deduction-2', formatCurrency(payslip.deduction_2));
        
        // Populate Totals fields
        safeSetContent('modal-net-ojt-share', formatCurrency(payslip.net_ojt_share));
        safeSetContent('modal-ot-pay-allowance', formatCurrency(payslip.ot_pay_allowance));
        safeSetContent('modal-total-allow', formatCurrency(payslip.total_allow));
    }

    // Function to show modal with loading
    function showOjtPayslipModal(payslipId) {
        // Show modal immediately
        modal.style.display = 'flex';
        modal.classList.add('show');

        // Fetch payslip data via AJAX
        fetch(`/finance/ajax/ojt-payslip-details/${payslipId}/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Received payslip data:', data); // Add debugging
                if (data.success) {
                    populateOjtPayslipModal(data.payslip);
                } else {
                    throw new Error(data.error || 'Failed to fetch payslip details');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Show error message in modal
                const modalBody = document.getElementById('ojtPayslipModalBody');
                if (modalBody) {
                    modalBody.innerHTML = `
                        <div class="error-message" style="text-align: center; padding: 2rem; color: var(--error-color);">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <h5>Error Loading Payslip</h5>
                            <p>Unable to load payslip details. Please try again.</p>
                            <small style="color: #666;">${error.message}</small>
                        </div>
                    `;
                }
            });
    }

    // Bind view buttons
    document.querySelectorAll('.view-ojt-payslip-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const payslipId = btn.getAttribute('data-payslip-id');
            if (payslipId) {
                showOjtPayslipModal(payslipId);
            }
        });
    });

    // Close modal functionality
    const closeButtons = modal.querySelectorAll('.close-ojt-payslip-modal, .modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    });

    // Close on overlay click
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
}

// Tab switching functionality
function initTabFunctionality() {
    const tabBtns = document.querySelectorAll('.tabs-horizontal .tab-list .tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Check URL parameter for active tab first, then localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');
    let activeTab = urlTab || localStorage.getItem('activeTab');
    
    // If no saved tab or invalid tab, default to first tab
    const validTabs = Array.from(tabBtns).map(btn => btn.getAttribute('data-tab'));
    if (!activeTab || !validTabs.includes(activeTab)) {
        activeTab = validTabs[0];
    }

    // Set initial active tab
    if (activeTab) {
        // Remove active class from all tabs and content
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // Add active class to saved tab
        const activeTabBtn = document.querySelector(`[data-tab="${activeTab}"]`);
        const activeTabContent = document.getElementById(activeTab);
        
        if (activeTabBtn) activeTabBtn.classList.add('active');
        if (activeTabContent) {
            activeTabContent.classList.add('active');
            // Animate progress bars when loans tab is activated
            if (activeTab === 'loans-tab') {
                setTimeout(animateProgressBars, 100);
            }
        }
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs and content
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            
            if (tabContent) {
                tabContent.classList.add('active');
                // Save active tab to localStorage
                localStorage.setItem('activeTab', tabId);
                // Animate progress bars when loans tab is activated
                if (tabId === 'loans-tab') {
                    setTimeout(animateProgressBars, 100);
                }
            }
        });
    });
}

// Progress bar animation
function initProgressBarAnimations() {
    // Active loans toggle functionality
    const activeLoansToggle = document.getElementById('showActiveLoansOnly');
    if (activeLoansToggle) {
        activeLoansToggle.addEventListener('change', function() {
            const loanRows = document.querySelectorAll('#loansTable tbody tr');
            const showActiveOnly = this.checked;
            loanRows.forEach(row => {
                const isActive = row.getAttribute('data-active') === 'true';
                if (showActiveOnly) {
                    row.style.display = isActive ? '' : 'none';
                } else {
                    row.style.display = '';
                }
            });
        });
        // Trigger the filter on page load (default is checked)
        activeLoansToggle.dispatchEvent(new Event('change'));
    }
}

function animateProgressBars() {
    const progressBars = document.querySelectorAll('.loan-progress-bar-fill');
    progressBars.forEach((bar, index) => {
        const targetWidth = bar.getAttribute('data-width') + '%';
        // Add a small delay for each bar for a staggered effect
        setTimeout(() => {
            bar.classList.add('animating');
            bar.style.width = targetWidth;
            // Remove the shimmer effect after animation completes
            setTimeout(() => {
                bar.classList.remove('animating');
            }, 2000);
        }, index * 200);
    });
}

// Loan functionality
function initLoanFunctionality() {
    // Get DOM elements
    const deleteLoanForm = document.getElementById('deleteLoanForm');
    const deleteLoanIdInput = document.getElementById('deleteLoanId');
    const loanDeleteModal = document.getElementById('deleteLoanModal');
    const loansTableContainer = document.querySelector('#loans-tab .loans-table-container');
    const confirmDeleteLoanInput = document.getElementById('confirmDeleteLoanInput');
    const confirmDeleteLoanBtn = document.getElementById('confirmDeleteLoanBtn');
    const loanModal = document.getElementById('loanDeductionsModal');
    const loanModalBody = document.getElementById('loanDeductionsBody');
    
    // AJAX delete form submission
    function bindDeleteLoanForm() {
        if (deleteLoanForm) {
            deleteLoanForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const loanId = deleteLoanIdInput.value;
                const url = `/finance/loan/delete/${loanId}/`;
                const formData = new FormData(deleteLoanForm);
                
                fetch(url, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    // Close modal
                    if (loanDeleteModal) {
                        loanDeleteModal.classList.remove('show');
                        setTimeout(() => {
                            loanDeleteModal.style.display = 'none';
                        }, 300);
                    }
                    // Update table if successful
                    // Use a robust selector for the loans table container
                    let loansSection = document.querySelector('#loans-tab .loans-table-container');
                    if (!loansSection) {
                        // fallback: try to find by data-tour attribute
                        loansSection = document.querySelector('#loans-tab [data-tour="loans-table"]')?.parentElement;
                    }
                    if (data.success && data.html && loansSection) {
                        loansSection.innerHTML = data.html;
                        if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                            window.portalUI.showNotification(data.message, 'success');
                        }
                        // No need to re-bind - event delegation handles this automatically
                    } else {
                        if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                            window.portalUI.showNotification(data.message || 'Failed to delete loan.', 'error');
                        }
                    }
                })
                .catch(() => {
                    if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                        window.portalUI.showNotification('Failed to delete loan.', 'error');
                    }
                });
            });
        }
    }
    
    // Use event delegation for loan buttons - handles dynamically added content
    if (loansTableContainer) {
        loansTableContainer.addEventListener('click', function(event) {
            // Handle delete loan button clicks
            if (event.target.closest('.delete-loan-btn')) {
                const btn = event.target.closest('.delete-loan-btn');
                const loanId = btn.getAttribute('data-loan-id');
                if (deleteLoanIdInput) deleteLoanIdInput.value = loanId;
                if (deleteLoanForm) deleteLoanForm.action = `/finance/loan/delete/${loanId}/`;
                if (confirmDeleteLoanInput) confirmDeleteLoanInput.value = '';
                if (confirmDeleteLoanBtn) confirmDeleteLoanBtn.disabled = true;
                if (loanDeleteModal) {
                    loanDeleteModal.style.display = 'flex';
                    loanDeleteModal.classList.add('show');
                }
            }
            
            // Handle view loan button clicks
            if (event.target.closest('.view-loan-btn')) {
                const btn = event.target.closest('.view-loan-btn');
                const loanId = btn.getAttribute('data-loan-id');
                if (loanModal && loanModalBody) {
                    loanModalBody.innerHTML = '<div class="loading-spinner" style="margin:2rem auto;"></div>';
                    loanModal.style.display = 'flex';
                    loanModal.classList.add('show');
                    
                    fetch(`/finance/loan/${loanId}/deductions/`, {
                        method: 'GET',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            loanModalBody.innerHTML = data.html;
                        } else {
                            loanModalBody.innerHTML = '<div class="error-message">Failed to load deductions.</div>';
                        }
                    })
                    .catch(() => {
                        loanModalBody.innerHTML = '<div class="error-message">Failed to load deductions.</div>';
                    });
                }
            }
        });
    }
    
    // Initialize loan functionality
    bindDeleteLoanForm();
    
    // Confirm delete input validation
    if (confirmDeleteLoanInput && confirmDeleteLoanBtn) {
        confirmDeleteLoanInput.addEventListener('input', function() {
            if (this.value.trim().toLowerCase() === 'delete') {
                confirmDeleteLoanBtn.disabled = false;
            } else {
                confirmDeleteLoanBtn.disabled = true;
            }
        });
    }
    
    // Modal close handlers for loan delete modal
    const closeLoanDeleteModalEls = loanDeleteModal ? loanDeleteModal.querySelectorAll('.close-loan-delete-modal') : [];
    closeLoanDeleteModalEls.forEach(el => {
        el.addEventListener('click', function() {
            if (loanDeleteModal) {
                loanDeleteModal.classList.remove('show');
                setTimeout(() => {
                    loanDeleteModal.style.display = 'none';
                }, 300);
            }
        });
    });
    
    // Modal close handlers for loan view modal
    const closeLoanModalEls = loanModal ? loanModal.querySelectorAll('.close-loan-modal') : [];
    closeLoanModalEls.forEach(el => {
        el.addEventListener('click', function() {
            if (loanModal) {
                loanModal.classList.remove('show');
                setTimeout(() => {
                    loanModal.style.display = 'none';
                }, 300);
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === loanDeleteModal) {
            loanDeleteModal.classList.remove('show');
            setTimeout(() => {
                loanDeleteModal.style.display = 'none';
            }, 300);
        }
        if (event.target === loanModal) {
            loanModal.classList.remove('show');
            setTimeout(() => {
                loanModal.style.display = 'none';
            }, 300);
        }
    });
}

// Allowance functionality
function initAllowanceFunctionality() {
    // Get DOM elements
    const deleteAllowanceForm = document.getElementById('deleteAllowanceForm');
    const deleteAllowanceIdInput = document.getElementById('deleteAllowanceId');
    const allowanceModal = document.getElementById('deleteAllowanceModal');
    const allowancesTab = document.getElementById('allowances-tab');
    
    // AJAX delete form submission
    function bindDeleteAllowanceForm() {
        if (deleteAllowanceForm) {
            deleteAllowanceForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const allowanceId = deleteAllowanceIdInput.value;
                const url = `/finance/allowance/delete/${allowanceId}/`;
                const formData = new FormData(deleteAllowanceForm);
                fetch(url, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    // Close modal
                    if (allowanceModal) {
                        allowanceModal.classList.remove('show');
                        setTimeout(() => {
                            allowanceModal.style.display = 'none';
                        }, 300);
                    }
                    // Update table if successful
                    // Use a robust selector for the allowances table container
                    let allowancesSection = document.querySelector('#allowances-tab .section-content');
                    if (!allowancesSection) {
                        // fallback: try to find by data-tour attribute
                        allowancesSection = document.querySelector('#allowances-tab [data-tour="allowances-table"]')?.parentElement;
                    }
                    if (data.success && data.html && allowancesSection) {
                        allowancesSection.innerHTML = data.html;
                        if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                            window.portalUI.showNotification(data.message, 'success');
                        }
                    } else {
                        if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                            window.portalUI.showNotification(data.message || 'Failed to delete allowance.', 'error');
                        }
                    }
                })
                .catch(() => {
                    if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                        window.portalUI.showNotification('Failed to delete allowance.', 'error');
                    }
                });
            });
        }
    }
    
    // Use event delegation for delete allowance buttons - handles dynamically added content
    if (allowancesTab) {
        allowancesTab.addEventListener('click', function(event) {
            const btn = event.target.closest('.delete-allowance-btn');
            if (btn) {
                const allowanceId = btn.getAttribute('data-allowance-id');
                if (deleteAllowanceIdInput) deleteAllowanceIdInput.value = allowanceId;
                if (deleteAllowanceForm) deleteAllowanceForm.action = `/finance/allowance/delete/${allowanceId}/`;
                if (allowanceModal) {
                    allowanceModal.style.display = 'flex';
                    allowanceModal.classList.add('show');
                }
            }
        });
    }
    
    // Initialize allowance functionality
    bindDeleteAllowanceForm();
    
    // Modal close handlers
    const closeAllowanceModalEls = allowanceModal ? allowanceModal.querySelectorAll('.close-allowance-modal') : [];
    closeAllowanceModalEls.forEach(el => {
        el.addEventListener('click', function() {
            if (allowanceModal) {
                allowanceModal.classList.remove('show');
                setTimeout(() => {
                    allowanceModal.style.display = 'none';
                }, 300);
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === allowanceModal) {
            allowanceModal.classList.remove('show');
            setTimeout(() => {
                allowanceModal.style.display = 'none';
            }, 300);
        }
    });
}

// Payslip functionality
function initPayslipFunctionality() {
    // Initialize payslip functionality
    bindDeleteBtns();
    bindDeletePayslipForm();
    bindViewPayslipBtns();

    // Modal close handlers
    const modal = document.getElementById('deletePayslipModal');
    const closeModalEls = modal ? modal.querySelectorAll('.close-modal') : [];
    closeModalEls.forEach(el => {
        el.addEventListener('click', function() {
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    });

    // Real-time search functionality
    initPayslipSearch();

    // Initialize pagination handlers
    bindPaginationHandlers();
}

// Bind delete payslip buttons (global function)
function bindDeleteBtns() {
    const modal = document.getElementById('deletePayslipModal');
    const deleteForm = document.getElementById('deletePayslipForm');

    const deleteBtns = document.querySelectorAll('.delete-payslip-btn');
    deleteBtns.forEach(btn => {
        // Remove existing event listeners
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Re-select after cloning
    const newDeleteBtns = document.querySelectorAll('.delete-payslip-btn');
    newDeleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const payslipId = btn.getAttribute('data-payslip-id');
            console.log('[DeletePayslip] Button clicked. data-payslip-id:', payslipId);
            
            // Store the payslip ID on the modal element for later retrieval
            if (modal) {
                modal.setAttribute('data-current-payslip-id', payslipId || '');
                console.log('[DeletePayslip] Stored payslip ID on modal:', payslipId);
            }
            
            // Set the form action
            if (deleteForm) {
                deleteForm.action = `/finance/payslip/delete/${payslipId || ''}/`;
                console.log('[DeletePayslip] Set deleteForm.action to:', deleteForm.action);
            }
            
            // Show the modal
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
            }
        });
    });
}

// AJAX delete for payslip (global function)
function bindDeletePayslipForm() {
    const modal = document.getElementById('deletePayslipModal');
    const deleteForm = document.getElementById('deletePayslipForm');

    if (deleteForm) {
        // Remove existing event listener by cloning
        const newDeleteForm = deleteForm.cloneNode(true);
        deleteForm.parentNode.replaceChild(newDeleteForm, deleteForm);
        
        newDeleteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get the payslip ID from the modal's data attribute (set by the delete button)
            const payslipId = modal ? modal.getAttribute('data-current-payslip-id') : '';
            console.log('[DeletePayslip] Form submitted. payslipId from modal:', payslipId);
            
            if (!payslipId) {
                console.error('No payslip ID provided for delete. Aborting request.');
                if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                    window.portalUI.showNotification('No payslip selected for deletion.', 'error');
                }
                return;
            }
            
            // Also update the hidden input for backend processing
            const payslipIdInput = newDeleteForm.querySelector('#deletePayslipId');
            if (payslipIdInput) {
                payslipIdInput.value = payslipId;
                console.log('[DeletePayslip] Updated hidden input value to:', payslipId);
            }
            
            const url = `/finance/payslip/delete/${payslipId}/`;
            const formData = new FormData(newDeleteForm);
            fetch(url, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Close modal immediately for better UX
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                    // Clear the stored payslip ID
                    modal.removeAttribute('data-current-payslip-id');
                }
                // Update table if successful
                const payslipsTableContainer = document.getElementById('payslipsTableContainer');
                if (data.success && data.html && payslipsTableContainer) {
                    payslipsTableContainer.innerHTML = data.html;
                    if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                        window.portalUI.showNotification(data.message, 'success');
                    }
                    // Re-bind delete buttons and form
                    setTimeout(() => {
                        bindDeleteBtns();
                        bindDeletePayslipForm();
                        bindViewPayslipBtns();
                        bindPaginationHandlers();
                    }, 100);
                } else {
                    if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                        window.portalUI.showNotification(data.message || 'Failed to delete payslip.', 'error');
                    }
                }
            })
            .catch(() => {
                if (window.portalUI && typeof window.portalUI.showNotification === 'function') {
                    window.portalUI.showNotification('Failed to delete payslip.', 'error');
                }
            });
        });
    }
}

// Bind view payslip buttons (global function)
function bindViewPayslipBtns() {
    const viewBtns = document.querySelectorAll('.view-payslip-btn');
    viewBtns.forEach(btn => {
        // Remove existing event listeners
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Re-select after cloning
    const newViewBtns = document.querySelectorAll('.view-payslip-btn');
    newViewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const payslipUrl = btn.getAttribute('data-payslip-url');
            if (payslipUrl) {
                window.open(payslipUrl, '_blank');
            }
        });
    });
}

// Payslip search functionality
function initPayslipSearch() {
    const searchInput = document.getElementById('payslipSearchInput');
    const payslipsTableContainer = document.getElementById('payslipsTableContainer');
    
    console.log('InitPayslipSearch called');
    console.log('Search input found:', !!searchInput);
    console.log('Payslips container found:', !!payslipsTableContainer);
    
    if (!searchInput || !payslipsTableContainer) {
        console.error('Missing required elements for payslip search');
        return;
    }
    
    let searchTimeout;
    const employeeId = getEmployeeIdFromUrl();
    console.log('Employee ID:', employeeId);
    
    // Debounced search function
    function performSearch() {
        const searchQuery = searchInput.value.trim();
        console.log('Performing search with query:', searchQuery);
        loadPayslips(employeeId, searchQuery, 1);
    }
    
    // Add input event listener for real-time search
    searchInput.addEventListener('input', function(e) {
        console.log('Input event fired with value:', e.target.value);
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300); // 300ms delay
    });
    
    console.log('Event listeners attached to search input');
    
    // Handle search clear
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchInput.value = '';
            performSearch();
        }
    });
}

// Load payslips via AJAX
function loadPayslips(employeeId, searchQuery = '', page = 1) {
    const payslipsTableContainer = document.getElementById('payslipsTableContainer');
    
    console.log('LoadPayslips called with:', { employeeId, searchQuery, page });
    
    if (!payslipsTableContainer) {
        console.error('Payslips table container not found');
        return;
    }
    
    // Show loading state
    payslipsTableContainer.style.opacity = '0.6';
    payslipsTableContainer.style.pointerEvents = 'none';
    
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (page && page !== 1) params.append('page', page);
    
    const url = `/finance/employee/${employeeId}/ajax-payslips/?${params.toString()}`;
    
    console.log('Making AJAX request to:', url);
    
    fetch(url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log('Response received:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success && data.html) {
            payslipsTableContainer.innerHTML = data.html;
            console.log('Table updated successfully');
            
            // Update search clear button display
            updateSearchClearButton(searchQuery);
            
            // Re-initialize functionality for new content
            setTimeout(() => {
                bindDeleteBtns();
                bindDeletePayslipForm();
                bindViewPayslipBtns();
                bindPaginationHandlers();
            }, 100);
        } else {
            console.error('Error loading payslips:', data.error);
        }
    })
    .catch(error => {
        console.error('Error loading payslips:', error);
    })
    .finally(() => {
        // Remove loading state
        payslipsTableContainer.style.opacity = '1';
        payslipsTableContainer.style.pointerEvents = 'auto';
    });
}

// Bind pagination handlers
function bindPaginationHandlers() {
    const paginationBtns = document.querySelectorAll('.payslip-pagination');
    const employeeId = getEmployeeIdFromUrl();
    const searchInput = document.getElementById('payslipSearchInput');
    
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = btn.getAttribute('data-page');
            const searchQuery = searchInput ? searchInput.value.trim() : '';
            loadPayslips(employeeId, searchQuery, page);
        });
    });
}

// Update search clear button display
function updateSearchClearButton(searchQuery) {
    const searchClear = document.getElementById('payslipSearchClear');
    if (searchClear) {
        if (searchQuery && searchQuery.length > 0) {
            searchClear.style.display = 'inline-block';
        } else {
            searchClear.style.display = 'none';
        }
    }
}

// Clear payslip search function (called from template)
function clearPayslipSearch() {
    const searchInput = document.getElementById('payslipSearchInput');
    if (searchInput) {
        searchInput.value = '';
        const employeeId = getEmployeeIdFromUrl();
        loadPayslips(employeeId, '', 1);
    }
}

// Get employee ID from URL
function getEmployeeIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const employeeIndex = pathParts.indexOf('employee');
    if (employeeIndex !== -1 && pathParts[employeeIndex + 1]) {
        return pathParts[employeeIndex + 1];
    }
    return null;
}

// Page Tour functionality using Driver.js

// Page Tour functionality using Intro.js
function initPageTour() {
    // Check if Intro.js is available
    if (typeof introJs === 'undefined') {
        console.warn('Intro.js is not loaded');
        return;
    }

    // Map of tour steps: selector, intro, title, position
    const tourSteps = [
        {
            intro: '<b>Welcome to the Employee Finance Details Page!</b><br><br>This interactive tour will guide you through all the features and sections available. Click <b>Next</b> to begin.',
            title: 'Welcome',
            position: 'floating'
        },
        {
            element: '[data-tour="page-header"]',
            intro: 'This page shows comprehensive financial information for the selected employee, including payslips, loans, and allowances.',
            title: 'Employee Finance Details',
            position: 'bottom'
        },
        {
            element: '[data-tour="tabs-section"]',
            intro: 'Navigate between different financial categories: Payslips for salary documents, Loans for borrowing records, and Allowances for additional benefits.',
            title: 'Financial Sections',
            position: 'bottom'
        },
        {
            element: '[data-tour="payslips-tab-btn"]',
            intro: 'View and manage employee payslips and salary documents. This is the default active tab.',
            title: 'Payslips Tab',
            position: 'bottom'
        },
        {
            element: '[data-tour="search-functionality"]',
            intro: 'Use this search box to quickly find specific payslips by filtering through the available records.',
            title: 'Search Payslips',
            position: 'left'
        },
        {
            element: '[data-tour="payslips-table"]',
            intro: 'This table displays all payslips for the employee. You can view details and delete records using the action buttons in each row.',
            title: 'Payslips Records',
            position: 'top'
        },
        {
            element: '[data-tour="loans-tab-btn"]',
            intro: 'Click here to view employee loans, payment progress, and outstanding balances.',
            title: 'Loans Tab',
            position: 'bottom',
            onbeforechange: function() {
                const loansTab = document.querySelector('[data-tab="loans-tab"]');
                if (loansTab && !loansTab.classList.contains('active')) {
                    loansTab.click();
                }
            }
        },
        {
            element: '[data-tour="loans-toggle"]',
            intro: 'Toggle this switch to show only active loans or view all loan records including completed ones.',
            title: 'Filter Active Loans',
            position: 'left'
        },
        {
            element: '[data-tour="loans-table"]',
            intro: 'This table shows detailed information about employee loans including payment progress, balances, and status.',
            title: 'Loans Overview',
            position: 'top'
        },
        // Removed Payment Progress and Loan Actions steps here
        // Loan Table Columns
        {
            element: '#loansTable thead th:nth-child(1)',
            intro: 'This column shows the loan name and creation date.',
            title: 'Loan Column',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(2)',
            intro: 'This column displays the type of loan.',
            title: 'Type Column',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(3)',
            intro: 'Minimum monthly payment required for the loan.',
            title: 'Min. Monthly Payment',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(4)',
            intro: 'Principal balance of the loan.',
            title: 'Principal Balance',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(5)',
            intro: 'Shows the payment progress for each loan.',
            title: 'Payment Progress',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(6)',
            intro: 'Current status of the loan (Active/Inactive).',
            title: 'Status',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(7)',
            intro: 'Current balance remaining for the loan.',
            title: 'Balance',
            position: 'top'
        },
        {
            element: '#loansTable thead th:nth-child(8)',
            intro: 'Action buttons for each loan record.',
            title: 'Action Column',
            position: 'top'
        },
        // Loan Table Footer
        {
            element: '#loansTable tfoot th:nth-child(7)',
            intro: 'This is the total loan balance for all active loans.',
            title: 'Total Loan Balance',
            position: 'top'
        },
        {
            element: '[data-tour="allowances-tab-btn"]',
            intro: 'Click here to monitor employee allowances and additional benefits.',
            title: 'Allowances Tab',
            position: 'bottom',
            onbeforechange: function() {
                const allowancesTab = document.querySelector('[data-tab="allowances-tab"]');
                if (allowancesTab && !allowancesTab.classList.contains('active')) {
                    allowancesTab.click();
                }
            }
        },
        {
            element: '[data-tour="allowances-table"]',
            intro: 'This table displays all allowances and benefits provided to the employee, including amounts, dates, and management options.',
            title: 'Allowances Records',
            position: 'top'
        },
        {
            element: '#savingsTable',
            intro: 'This table displays all savings records for the employee, including total savings, status, and withdrawal actions.',
            title: 'Savings Records',
            position: 'top'
        },
        {
            element: '[data-tour="allowance-actions"]',
            intro: 'Use the delete button to remove allowance records from the system when needed.',
            title: 'Allowance Actions',
            position: 'left'
        },
        {
            element: '[data-tour="tour-button"]',
            intro: 'You can click this button anytime to restart the tour and learn about all available features on this page.',
            title: 'Page Tour',
            position: 'left'
        }
    ];

    function startTour() {
        // Reset to payslips tab before starting tour
        const payslipsTab = document.querySelector('[data-tab="payslips-tab"]');
        if (payslipsTab && !payslipsTab.classList.contains('active')) {
            payslipsTab.click();
        }

        // Filter steps for available elements
        const availableSteps = tourSteps.filter(step => document.querySelector(step.element));
        if (availableSteps.length === 0) {
            console.warn('No tour elements found on the page');
            return;
        }

        // Map to Intro.js step format, keeping the welcome step first (no element)
        const introSteps = [];
        // Add the rest of the steps for available elements, but skip the welcome and 'Employee Finance Details' steps
        let foundFirst = false;
        availableSteps.forEach((step) => {
            if (!step.element) return;
            // Skip the old welcome and 'Employee Finance Details' steps
            if (step.title && step.title.toLowerCase().includes('employee finance details')) return;
            const el = document.querySelector(step.element);
            if (!el) return;
            // Make 'Financial Sections' the first step
            if (!foundFirst && step.title && step.title.toLowerCase().includes('financial sections')) {
                introSteps.unshift({
                    element: el,
                    intro: step.intro,
                    title: step.title,
                    position: step.position
                });
                foundFirst = true;
            } else {
                // For Loans Tab and Allowances Tab, ensure tab is visible before continuing
                if (step.title === 'Loans Tab') {
                    introSteps.push({
                        element: el,
                        intro: step.intro,
                        title: step.title,
                        position: step.position,
                        onbeforechange: function() {
                            const loansTab = document.querySelector('[data-tab="loans-tab"]');
                            if (loansTab && !loansTab.classList.contains('active')) {
                                loansTab.click();
                            }
                        },
                        onafterchange: function() {
                            setTimeout(() => {}, 300);
                        }
                    });
                } else if (step.title === 'Allowances Tab') {
                    introSteps.push({
                        element: el,
                        intro: step.intro,
                        title: step.title,
                        position: step.position,
                        onbeforechange: function() {
                            const allowancesTab = document.querySelector('[data-tab="allowances-tab"]');
                            if (allowancesTab && !allowancesTab.classList.contains('active')) {
                                allowancesTab.click();
                            }
                        },
                        onafterchange: function() {
                            setTimeout(() => {}, 300);
                        }
                    });
                } else if (step.title === 'Loans Overview') {
                    // This is step 6 (index 5 if zero-based). Add onbeforechange to ensure loan tab is active before showing this step.
                    introSteps.push({
                        element: el,
                        intro: step.intro,
                        title: step.title,
                        position: step.position,
                        onbeforechange: function() {
                            const loansTab = document.querySelector('[data-tab="loans-tab"]');
                            if (loansTab && !loansTab.classList.contains('active')) {
                                loansTab.click();
                            }
                        }
                    });
                } else {
                    introSteps.push({
                        element: el,
                        intro: step.intro,
                        title: step.title,
                        position: step.position,
                        ...(step.onbeforechange ? {onbeforechange: step.onbeforechange} : {})
                    });
                }
            }
        });

        // Start the tour at the welcome step (step 0)
        const tour = introJs.tour();
        tour.setOptions({
            steps: introSteps,
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
        });

        // Intercept step change to handle loan tab activation
        tour.onchange(function(targetElement) {
            let currentStep = tour.currentStep || tour._currentStep;
            if (typeof currentStep !== 'number' || isNaN(currentStep)) {
                // Try to get from the tour API
                if (typeof tour.getCurrentStep === 'function') {
                    currentStep = tour.getCurrentStep();
                }
            }
            const stepObj = introSteps && typeof currentStep === 'number' ? introSteps[currentStep] : undefined;
            console.log('[Tour] Step:', currentStep, stepObj ? stepObj.title : 'Unknown', stepObj);
            // For any loans-related step, ensure the loans tab is active and visible before showing the step
            if (stepObj && (
                stepObj.title === 'Filter Active Loans' || 
                stepObj.title === 'Loans Overview' || 
                stepObj.title === 'Payment Progress' || 
                stepObj.title === 'Loan Actions'
            )) {
                const loansTab = document.querySelector('[data-tab="loans-tab"]');
                const loansTabContent = document.getElementById('loans-tab');
                if (loansTab) {
                    console.log('[Tour] Switching to Loans tab...');
                    // Remove active from all tabs and tab contents
                    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                    // Add active to loans tab and content
                    loansTab.classList.add('active');
                    if (loansTabContent) {
                        loansTabContent.classList.add('active');
                        console.log('[Tour] Loans tab content set to active.');
                    } else {
                        console.warn('[Tour] Loans tab content not found!');
                    }
                } else {
                    console.warn('[Tour] Loans tab button not found!');
                }
            }
            // For the Allowances Records step, ensure the allowances tab is active and visible
            if (stepObj && stepObj.title === 'Allowances Records') {
                const allowancesTab = document.querySelector('[data-tab="allowances-tab"]');
                const allowancesTabContent = document.getElementById('allowances-tab');
                if (allowancesTab) {
                    console.log('[Tour] Switching to Allowances tab...');
                    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                    allowancesTab.classList.add('active');
                    if (allowancesTabContent) {
                        allowancesTabContent.classList.add('active');
                        console.log('[Tour] Allowances tab content set to active.');
                    } else {
                        console.warn('[Tour] Allowances tab content not found!');
                    }
                } else {
                    console.warn('[Tour] Allowances tab button not found!');
                }
            }
        });
        tour.start();
    }

    // Bind tour button click event
    const tourBtn = document.querySelector('.tour-btn');
    if (tourBtn) {
        tourBtn.addEventListener('click', function(e) {
            e.preventDefault();
            startTour();
        });
    }

    window.startFinanceTour = startTour;
}
