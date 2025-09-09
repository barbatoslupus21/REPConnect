document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('status-filter');
    const departmentFilter = document.getElementById('department-filter');
    const createEmployeeBtn = document.getElementById('create-employee-btn');
    const createEmployeeModal = document.getElementById('createEmployeeModal');
    const viewEmployeeModal = document.getElementById('viewEmployeeModal');
    const confirmModal = document.getElementById('confirmModal');
    const createEmployeeForm = document.getElementById('create-employee-form');
    const saveEmployeeBtn = document.getElementById('save-employee-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    
    // Modal form elements
    const departmentSelect = document.getElementById('departmentSelect');
    const lineSelect = document.getElementById('lineSelect');
    const positionSelect = document.getElementById('positionSelect');

    let currentPage = 1;
    let searchTimeout;
    let currentAction = null;
    let currentEmployeeId = null;

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterEmployees();
            }, 500);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterEmployees);
    }

    if (departmentFilter) {
        departmentFilter.addEventListener('change', filterEmployees);
    }

    if (createEmployeeBtn) {
        createEmployeeBtn.addEventListener('click', function() {
            // Reset form and initialize dropdowns when modal opens
            createEmployeeForm.reset();
            
            // Initialize dropdowns
            fetchDepartments();
            fetchPositions();
            
            // Reset line dropdown to initial state
            const lineSelect = document.getElementById('lineSelect');
            if (lineSelect) {
                lineSelect.innerHTML = '<option value="">Select Line</option>';
                lineSelect.disabled = true;
            }
            
            showModal(createEmployeeModal);
        });
    }

    if (saveEmployeeBtn) {
        saveEmployeeBtn.addEventListener('click', function() {
            createEmployee();
        });
    }

    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', function() {
            executeAction();
        });
    }

    // Import employees modal functionality
    const importEmployeesBtn = document.getElementById('import-employees-btn');
    const importEmployeesModal = document.getElementById('importEmployeesModal');
    const employeeFileUpload = document.getElementById('employee-file-upload');
    const uploadEmployeesBtn = document.getElementById('uploadEmployeesBtn');

    if (importEmployeesBtn && importEmployeesModal) {
        importEmployeesBtn.addEventListener('click', function() {
            showModal(importEmployeesModal);
        });
    }

    if (employeeFileUpload) {
        employeeFileUpload.addEventListener('change', function() {
            handleEmployeeFileSelection(this.files);
        });
    }

    if (uploadEmployeesBtn) {
        uploadEmployeesBtn.addEventListener('click', function() {
            uploadEmployeeFiles();
        });
    }

    // Modal close handlers
    document.addEventListener('click', function(e) {
        if (e.target.id === 'closeImportModal' || e.target.id === 'cancelImportBtn') {
            hideModal(importEmployeesModal);
        }
        if (e.target.id === 'closeEditEmployeeModal' || e.target.id === 'cancelEditEmployeeBtn') {
            hideModal(document.getElementById('editEmployeeModal'));
        }
        if (e.target.id === 'closeDeleteEmployeeModal' || e.target.id === 'cancelDeleteEmployeeBtn') {
            hideModal(document.getElementById('deleteEmployeeModal'));
        }
        if (e.target.id === 'closeImportProgressBtn') {
            hideModal(document.getElementById('importProgressModal'));
            filterEmployees(); // Refresh employee list
        }
        if (e.target.id === 'viewImportResultsBtn') {
            showImportResultsModal();
        }
        if (e.target.id === 'closeImportResultsModal' || e.target.id === 'closeResultsModalBtn') {
            hideModal(document.getElementById('importResultsModal'));
        }
        if (e.target.id === 'downloadErrorReportBtn') {
            downloadErrorReport();
        }

        if (e.target.classList.contains('edit-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            openEditEmployeeModal(employeeId);
            return;
        }

        if (e.target.classList.contains('delete-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            openDeleteEmployeeModal(employeeId);
            return;
        }

        if (e.target.classList.contains('view-employee-btn') || e.target.closest('.view-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const btn = e.target.classList.contains('view-employee-btn') ? e.target : e.target.closest('.view-employee-btn');
            const employeeId = btn.dataset.employeeId;
            viewEmployee(employeeId);
            return;
        }

        if (e.target.classList.contains('deactivate-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            const employeeName = e.target.dataset.employeeName;
            const deactivateModal = document.getElementById('deactivateConfirmModal');
            const message = deactivateModal.querySelector('#deactivate-confirm-message');
            message.textContent = `Are you sure you want to deactivate ${employeeName}?`;
            deactivateModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            // Store for confirm
            deactivateModal.dataset.employeeId = employeeId;
            return;
        }

        if (e.target.classList.contains('activate-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            const employeeName = e.target.dataset.employeeName;
            confirmAction('activate', employeeId, employeeName);
            return;
        }

        if (e.target.classList.contains('lock-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            const employeeName = e.target.dataset.employeeName;
            confirmAction('lock', employeeId, employeeName);
            return;
        }

        if (e.target.classList.contains('unlock-employee-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            const employeeName = e.target.dataset.employeeName;
            confirmAction('unlock', employeeId, employeeName);
            return;
        }

        if (e.target.classList.contains('reset-password-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const employeeId = e.target.dataset.employeeId;
            const employeeName = e.target.dataset.employeeName;
            confirmAction('reset_password', employeeId, employeeName);
            return;
        }

        if (e.target.classList.contains('page-link')) {
            e.preventDefault();
            const page = e.target.dataset.page;
            if (page && page !== currentPage.toString()) {
                currentPage = parseInt(page);
                filterEmployees();
            }
        }

        if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal);
        }

        if (e.target.classList.contains('btn-close') || e.target.closest('.btn-close')) {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal);
        }

        if (e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal);
        }

        if (e.target.classList.contains('btn-outline') && e.target.textContent.trim() === 'Cancel') {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal);
        }

        if (e.target.classList.contains('btn-outline') && e.target.textContent.trim() === 'Close') {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal);
        }

        if (e.target.id === 'confirm-deactivate-btn') {
            const deactivateModal = document.getElementById('deactivateConfirmModal');
            const employeeId = deactivateModal.dataset.employeeId;
            deactivateModal.classList.remove('show');
            document.body.style.overflow = '';
            // Actually perform the deactivation using the existing confirmAction logic
            confirmAction('deactivate', employeeId, '');
        }
        if ((e.target.classList.contains('modal-close') || (e.target.closest && e.target.closest('.modal-close'))) && e.target.closest('#deactivateConfirmModal')) {
            const deactivateModal = document.getElementById('deactivateConfirmModal');
            deactivateModal.classList.remove('show');
            document.body.style.overflow = '';
        }
        if (e.target.classList.contains('btn-outline') && e.target.textContent.trim() === 'Cancel' && e.target.closest('#deactivateConfirmModal')) {
            const deactivateModal = document.getElementById('deactivateConfirmModal');
            deactivateModal.classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close dropdowns when clicking outside
        if (!e.target.closest('.action-dropdown') && !e.target.classList.contains('dropdown-item')) {
            document.querySelectorAll('.action-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu) {
                    menu.classList.remove('show');
                }
                // Remove dropdown-open class from table row
                const tableRow = dropdown.closest('tr');
                if (tableRow) {
                    tableRow.classList.remove('dropdown-open');
                }
            });
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) hideModal(openModal);

            // Close all open dropdowns
            document.querySelectorAll('.action-dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                const menu = dropdown.querySelector('.dropdown-menu');
                if (menu) {
                    menu.classList.remove('show');
                }
                // Remove dropdown-open class from table row
                const tableRow = dropdown.closest('tr');
                if (tableRow) {
                    tableRow.classList.remove('dropdown-open');
                }
            });
        }
    });

    initializeDropdowns();

    function initializeDropdowns() {
        console.log('Initializing dropdowns...');

        // Remove existing event listeners by cloning elements
        document.querySelectorAll('.action-dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');

            if (toggle && menu) {
                // Clone toggle to remove existing listeners
                const newToggle = toggle.cloneNode(true);
                toggle.parentNode.replaceChild(newToggle, toggle);

                // Add click event to toggle
                newToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('Dropdown toggle clicked for employee:', this.dataset.employeeId);

                    // Close all other dropdowns first
                    document.querySelectorAll('.action-dropdown').forEach(otherDropdown => {
                        if (otherDropdown !== dropdown) {
                            otherDropdown.classList.remove('open');
                            const otherMenu = otherDropdown.querySelector('.dropdown-menu');
                            if (otherMenu) {
                                otherMenu.classList.remove('show');
                            }
                            // Remove dropdown-open class from table row
                            const otherRow = otherDropdown.closest('tr');
                            if (otherRow) {
                                otherRow.classList.remove('dropdown-open');
                            }
                        }
                    });

                    // Toggle this dropdown
                    const isOpen = dropdown.classList.contains('open');
                    const tableRow = dropdown.closest('tr');

                    if (isOpen) {
                        dropdown.classList.remove('open');
                        menu.classList.remove('show');
                        if (tableRow) {
                            tableRow.classList.remove('dropdown-open');
                        }
                    } else {
                        dropdown.classList.add('open');
                        menu.classList.add('show');
                        if (tableRow) {
                            tableRow.classList.add('dropdown-open');
                        }
                    }

                    console.log('Dropdown toggled, now open:', !isOpen);
                });

                // Prevent menu clicks from closing dropdown
                menu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
        });

        console.log('Dropdowns initialized:', document.querySelectorAll('.action-dropdown').length);
    }

    function filterEmployees() {
        const searchTerm = searchInput ? searchInput.value : '';
        const status = statusFilter ? statusFilter.value : '';
        const department = departmentFilter ? departmentFilter.value : '';

        const params = new URLSearchParams({
            search: searchTerm,
            status: status,
            department: department,
            page: currentPage
        });

        showLoadingState();

        fetch(`/profile/admin/employees/?${params}`)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newTableBody = doc.querySelector('.data-table tbody');
                const newPagination = doc.querySelector('#paginationContainer');

                if (newTableBody) {
                    document.querySelector('.data-table tbody').innerHTML = newTableBody.innerHTML;
                }

                if (newPagination) {
                    const currentPagination = document.querySelector('#paginationContainer');
                    if (currentPagination) {
                        currentPagination.innerHTML = newPagination.innerHTML;
                    }
                }

                hideLoadingState();
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error loading employees', 'error');
                hideLoadingState();
            });
    }

    function createEmployee() {
        const form = document.getElementById('create-employee-form');
        const formData = new FormData(form);
        formData.set('department', document.getElementById('departmentSelect').value);
        formData.set('line', document.getElementById('lineSelect').value);
        formData.set('position', document.getElementById('positionSelect').value);
        fetch('/profile/admin/create-employee/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                hideModal(createEmployeeModal);
                location.reload();
            } else {
                displayFormErrors(data.errors);
            }
        })
        .catch(() => {
            showNotification('An error occurred while creating the employee', 'error');
        });
    }

    function viewEmployee(employeeId) {
        window.location.href = `/profile/admin/employee/${employeeId}/`;
    }

    function editEmployee(employeeId) {
                    window.location.href = `/profile/admin/update-employee/${employeeId}/`;
    }

    function confirmAction(action, employeeId, employeeName) {
        currentAction = action;
        currentEmployeeId = employeeId;

        const messages = {
            deactivate: `Are you sure you want to deactivate ${employeeName}?`,
            lock: `Are you sure you want to lock ${employeeName}'s account?`,
            delete: `Are you sure you want to delete ${employeeName}? This action cannot be undone.`,
            reset_password: `Are you sure you want to reset ${employeeName}'s password?`
        };

        const confirmMessage = document.getElementById('confirm-message');
        confirmMessage.textContent = messages[action];

        const actionBtn = confirmActionBtn;
        actionBtn.className = action === 'delete' ? 'btn btn-danger' : 'btn btn-warning';
        actionBtn.textContent = action === 'delete' ? 'Delete' :
                               action === 'reset_password' ? 'Reset Password' :
                               action.charAt(0).toUpperCase() + action.slice(1);

        showModal(confirmModal);
    }

    function executeAction() {
        if (!currentAction || !currentEmployeeId) return;

        const urls = {
                    deactivate: `/profile/admin/deactivate-employee/${currentEmployeeId}/`,
        lock: `/profile/admin/lock-employee/${currentEmployeeId}/`,
        delete: `/profile/admin/delete-employee/${currentEmployeeId}/`,
        reset_password: `/profile/admin/reset-password/${currentEmployeeId}/`
        };

        confirmActionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmActionBtn.disabled = true;

        fetch(urls[currentAction], {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                hideModal(confirmModal);
                filterEmployees();
            } else {
                showNotification(data.message || 'Error performing action', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred while performing action', 'error');
        })
        .finally(() => {
            confirmActionBtn.innerHTML = 'Confirm';
            confirmActionBtn.disabled = false;
            currentAction = null;
            currentEmployeeId = null;
        });
    }



    function showLoadingState() {
        const tableBody = document.querySelector('.employees-table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center p-4">
                        <div class="loading-spinner"></div>
                        <p class="mt-2 mb-0">Loading employees...</p>
                    </td>
                </tr>
            `;
        }
    }

    function hideLoadingState() {
    }

    function showLoadingModal(modal) {
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="text-center p-4">
                    <div class="loading-spinner"></div>
                    <p class="mt-3 mb-0">Loading...</p>
                </div>
            `;
        }
    }

    function hideLoadingModal(modal) {
    }

    function showModal(modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        if (!modal) return;
        
        modal.classList.add('closing');
        
        setTimeout(() => {
            modal.classList.remove('show', 'closing');
        document.body.style.overflow = '';
        }, 200);
    }

    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function showNotification(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function displayFormErrors(errors) {
        Object.keys(errors).forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.add('error');

                let errorDiv = field.parentNode.querySelector('.field-error');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'field-error';
                    field.parentNode.appendChild(errorDiv);
                }
                errorDiv.textContent = errors[fieldName][0];
            }
        });

        setTimeout(() => {
            document.querySelectorAll('.field-error').forEach(error => error.remove());
            document.querySelectorAll('.form-input.error').forEach(input => input.classList.remove('error'));
        }, 5000);
    }

    // Modal Functions
    function openEditEmployeeModal(employeeId) {
        const modal = document.getElementById('editEmployeeModal');
        if (!modal) return;

        // Load employee data (placeholder - implement actual API call)
        console.log('Opening edit modal for employee:', employeeId);
        showModal(modal);
    }

    function openDeleteEmployeeModal(employeeId) {
        const modal = document.getElementById('deleteEmployeeModal');
        if (!modal) return;

        document.getElementById('deleteEmployeeDetails').textContent = `Employee ID: ${employeeId}`;
        document.getElementById('confirmDeleteEmployeeBtn').dataset.employeeId = employeeId;

        showModal(modal);
    }

    function handleEmployeeFileSelection(files) {
        const selectedFiles = document.getElementById('selectedEmployeeFiles');
        const fileList = document.getElementById('employeeFileList');
        const uploadBtn = document.getElementById('uploadEmployeesBtn');

        if (files.length > 0) {
            selectedFiles.style.display = 'block';
            fileList.innerHTML = '';

            Array.from(files).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <i class="fas fa-file-excel"></i>
                    <span>${file.name}</span>
                    <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                `;
                fileList.appendChild(fileItem);
            });

            uploadBtn.disabled = false;
        } else {
            selectedFiles.style.display = 'none';
            uploadBtn.disabled = true;
        }
    }

    function uploadEmployeeFiles() {
        const fileInput = document.getElementById('employee-file-upload');
        const uploadBtn = document.getElementById('uploadEmployeesBtn');
        const progressContainer = document.getElementById('employeeUploadProgress');
        const progressFill = document.getElementById('employeeProgressFill');
        const progressText = document.getElementById('employeeProgressText');

        if (!fileInput.files.length) return;

        const formData = new FormData();
        Array.from(fileInput.files).forEach(file => {
            formData.append('files', file);
        });
        formData.append('csrfmiddlewaretoken', getCsrfToken());

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        progressContainer.style.display = 'block';

        // Show upload progress
        let uploadProgress = 0;
        const uploadInterval = setInterval(() => {
            uploadProgress += 5;
            progressFill.style.width = uploadProgress + '%';
            progressText.textContent = uploadProgress + '%';

            if (uploadProgress >= 90) {
                clearInterval(uploadInterval);
            }
        }, 100);

        fetch('/profile/import-employees/', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Upload response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Upload response data:', data);
            clearInterval(uploadInterval);
            progressFill.style.width = '100%';
            progressText.textContent = '100%';

            setTimeout(() => {
                if (data.success) {
                    console.log('Upload successful, starting import process');
                    // Close import modal first
                    hideModal(document.getElementById('importEmployeesModal'));

                    // Reset upload form
                    resetUploadForm();

                    // Show progress modal after a brief delay
                    setTimeout(() => {
                        console.log('Showing progress modal for', data.total_rows, 'rows');
                        showImportProgressModal(data.total_rows);
                        // Start import process
                        startImportProcess(data.import_id);
                    }, 300);
                } else {
                    console.error('Upload failed:', data.message);
                    showNotification(data.message || 'Error uploading files', 'error');
                    // Reset upload form on error
                    resetUploadForm();
                }
            }, 500);
        })
        .catch(error => {
            clearInterval(uploadInterval);
            console.error('Error:', error);
            showNotification('Error uploading files', 'error');
            resetUploadForm();
        });
    }

    function resetUploadForm() {
        const fileInput = document.getElementById('employee-file-upload');
        const uploadBtn = document.getElementById('uploadEmployeesBtn');
        const progressContainer = document.getElementById('employeeUploadProgress');

        fileInput.value = '';
        document.getElementById('selectedEmployeeFiles').style.display = 'none';
        progressContainer.style.display = 'none';
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Files';
    }

    function showImportProgressModal(totalRows) {
        const modal = document.getElementById('importProgressModal');

        if (!modal) {
            console.error('Import progress modal not found');
            return;
        }

        const progressFill = document.getElementById('importProgressFill');
        const progressText = document.getElementById('importProgressText');
        const progressCount = document.getElementById('importProgressCount');
        const importDetails = document.getElementById('importDetails');
        const importProgressFooter = document.getElementById('importProgressFooter');

        // Reset progress modal
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        if (progressCount) progressCount.textContent = `0 of ${totalRows} employees`;
        if (importDetails) importDetails.style.display = 'none';
        if (importProgressFooter) importProgressFooter.style.display = 'none';

        // Reset status icon
        const statusIcon = document.getElementById('importStatusIcon');
        if (statusIcon) {
            statusIcon.className = 'fas fa-users';
            statusIcon.parentElement.className = 'import-status-icon';
        }

        console.log('Showing import progress modal');
        showModal(modal);
    }

    function startImportProcess(importId) {
        console.log('Starting import process polling for ID:', importId);

        // Poll for import progress
        const pollInterval = setInterval(() => {
            fetch(`/profile/import-progress/${importId}/`)
                .then(response => {
                    console.log('Progress poll response status:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('Progress poll data:', data);
                    updateImportProgress(data);

                    if (data.status === 'completed' || data.status === 'failed') {
                        console.log('Import process finished with status:', data.status);
                        clearInterval(pollInterval);
                        handleImportCompletion(data);
                    }
                })
                .catch(error => {
                    console.error('Error polling import progress:', error);
                    clearInterval(pollInterval);
                    handleImportError();
                });
        }, 1000); // Poll every second
    }

    function updateImportProgress(data) {
        console.log('Updating progress with data:', data);

        const progressFill = document.getElementById('importProgressFill');
        const progressText = document.getElementById('importProgressText');
        const progressCount = document.getElementById('importProgressCount');
        const successCount = document.getElementById('successCount');
        const errorCount = document.getElementById('errorCount');
        const importDetails = document.getElementById('importDetails');

        const percentage = Math.round((data.processed / data.total) * 100);

        if (progressFill) progressFill.style.width = percentage + '%';
        if (progressText) progressText.textContent = percentage + '%';
        if (progressCount) progressCount.textContent = `${data.processed} of ${data.total} employees`;

        if (data.processed > 0 && importDetails) {
            importDetails.style.display = 'block';
            if (successCount) successCount.textContent = data.success_count;
            if (errorCount) errorCount.textContent = data.error_count;
        }

        console.log(`Progress: ${percentage}% (${data.processed}/${data.total}), Success: ${data.success_count}, Errors: ${data.error_count}`);
    }

    function handleImportCompletion(data) {
        console.log('Handling import completion with data:', data);

        const statusIcon = document.getElementById('importStatusIcon');
        const progressTitle = document.getElementById('importProgressTitle');
        const progressDescription = document.getElementById('importProgressDescription');
        const importProgressFooter = document.getElementById('importProgressFooter');
        const viewResultsBtn = document.getElementById('viewImportResultsBtn');

        if (data.status === 'completed') {
            console.log('Import completed successfully');
            if (statusIcon) {
                statusIcon.className = 'fas fa-check-circle';
                statusIcon.parentElement.className = 'import-status-icon success';
            }
            if (progressTitle) progressTitle.textContent = 'Import Completed Successfully!';
            if (progressDescription) {
                progressDescription.textContent = `${data.success_count} employees imported successfully.`;

                if (data.error_count > 0) {
                    progressDescription.textContent += ` ${data.error_count} employees failed to import.`;
                    if (viewResultsBtn) viewResultsBtn.style.display = 'inline-block';
                }
            }

            // Show success notification
            showNotification(`Successfully imported ${data.success_count} employees`, 'success');
        } else {
            console.log('Import failed with status:', data.status);
            if (statusIcon) {
                statusIcon.className = 'fas fa-exclamation-circle';
                statusIcon.parentElement.className = 'import-status-icon error';
            }
            if (progressTitle) progressTitle.textContent = 'Import Failed';
            if (progressDescription) {
                progressDescription.textContent = data.error_message || 'An error occurred during the import process.';
            }

            // Show error notification
            showNotification('Import process failed', 'error');
        }

        if (importProgressFooter) importProgressFooter.style.display = 'flex';

        // Store import results for results modal
        window.importResults = data;

        console.log('Import completion handled');
    }

    function handleImportError() {
        const statusIcon = document.getElementById('importStatusIcon');
        const progressTitle = document.getElementById('importProgressTitle');
        const progressDescription = document.getElementById('importProgressDescription');
        const importProgressFooter = document.getElementById('importProgressFooter');

        statusIcon.className = 'fas fa-exclamation-circle';
        statusIcon.parentElement.className = 'import-status-icon error';
        progressTitle.textContent = 'Import Failed';
        progressDescription.textContent = 'An error occurred while processing the import.';
        importProgressFooter.style.display = 'flex';

        showNotification('Import process failed', 'error');
    }

    function showImportResultsModal() {
        const modal = document.getElementById('importResultsModal');
        const results = window.importResults;

        if (!results) return;

        // Update summary cards
        document.getElementById('summarySuccessCount').textContent = results.success_count;
        document.getElementById('summaryErrorCount').textContent = results.error_count;

        // Show/hide error section
        const errorSection = document.getElementById('importErrorsSection');
        const downloadBtn = document.getElementById('downloadErrorReportBtn');

        if (results.error_count > 0 && results.errors) {
            errorSection.style.display = 'block';
            downloadBtn.style.display = 'inline-block';

            // Populate error table
            const errorsList = document.getElementById('importErrorsList');
            errorsList.innerHTML = '';

            results.errors.forEach((error, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${error.row || index + 1}</td>
                    <td>${error.name || 'N/A'}</td>
                    <td>${error.email || 'N/A'}</td>
                    <td>
                        <div class="error-details">
                            ${Array.isArray(error.errors) ? error.errors.join(', ') : error.errors || 'Unknown error'}
                        </div>
                    </td>
                `;
                errorsList.appendChild(row);
            });
        } else {
            errorSection.style.display = 'none';
            downloadBtn.style.display = 'none';
        }

        showModal(modal);
    }

    function downloadErrorReport() {
        const results = window.importResults;
        if (!results || !results.errors) return;

        // Create CSV content
        let csvContent = 'Row,Employee Name,Email,Error Details\n';

        results.errors.forEach((error, index) => {
            const row = error.row || index + 1;
            const name = (error.name || 'N/A').replace(/"/g, '""');
            const email = (error.email || 'N/A').replace(/"/g, '""');
            const errors = Array.isArray(error.errors) ? error.errors.join('; ') : (error.errors || 'Unknown error');
            const errorDetails = errors.replace(/"/g, '""');

            csvContent += `"${row}","${name}","${email}","${errorDetails}"\n`;
        });

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `import_errors_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Error report downloaded successfully', 'success');
    }

    // Reinitialize dropdowns when content changes (for navigation fix)
    function reinitializeDropdowns() {
        setTimeout(() => {
            initializeDropdowns();
        }, 100);
    }

    // Call reinitialize when page becomes visible (fixes navigation issue)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            reinitializeDropdowns();
        }
    });

    // Also reinitialize on window focus
    window.addEventListener('focus', function() {
        reinitializeDropdowns();
    });

    // Listen for custom reinitialize event (for navigation fix)
    window.addEventListener('reinitializeDropdowns', function() {
        console.log('Received reinitializeDropdowns event');
        reinitializeDropdowns();
    });

    // Global function for clearing search
    window.clearSearch = function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            filterEmployees();
        }
    };

    // Global function for starting product tour
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
                        element: '#searchInput',
                        popover: {
                            title: 'Search',
                            description: 'Use this search bar to quickly find employees by entering their name, ID number, or email address. It helps you locate specific records efficiently without scrolling through the entire list.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#create-employee-btn',
                        popover: {
                            title: 'Create Employee',
                            description: 'Click here to add a new employee. Make sure to fill out all the required fields in the form. Since this action is done by an admin, the employee account will be automatically approved upon creation.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#import-employees-btn',
                        popover: {
                            title: 'Import Employees',
                            description: 'Need to add multiple employees at once? Use this option to upload an Excel file and import employee data in bulk, saving you time on manual entries.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#exportEmployeeTemplateBtn',
                        popover: {
                            title: 'Download Template',
                            description: 'Download the pre-formatted Excel template required for importing employees. This ensures your data follows the correct structure before uploading.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '.file-upload-area',
                        popover: {
                            title: 'Upload Excel File',
                            description: 'Drag and drop your completed Excel file here, or click to browse and select the file from your device. The system will read and process the data for import.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#export-employees-btn',
                        popover: {
                            title: 'Export Employees',
                            description: 'Click this option to export the entire list of employees into an Excel file. Useful for backup or offline record-keeping.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#exportDepartment',
                        popover: {
                            title: 'Export Filter',
                            description: 'Before exporting, you can filter the employee data by department to download only the records relevant to your selection.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '#exportEmployeesBtn',
                        popover: {
                            title: 'Export',
                            description: 'After applying your filters (if any), click this button to generate and download the Excel file containing the employee data.',
                            position: 'bottom',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    },
                    {
                        element: '.data-table',
                        popover: {
                            title: 'Employee Table',
                            description: 'This is where all employee records are displayed. You can view, edit, and manage each employee\'s details directly from this table.',
                            position: 'top',
                            buttons: [
                                { text: 'Back', className: 'btn btn-outline driver-popover-prev-btn', action: 'previous' },
                                { text: 'Next', className: 'btn btn-primary driver-popover-next-btn', action: 'next' },
                                { text: 'Close', className: 'btn btn-outline driver-popover-close-btn', action: 'close' }
                            ]
                        }
                    }
                ],
                onHighlightStarted: (element, step, { state }) => {
                    const importModal = document.getElementById('importEmployeesModal');
                    const exportModal = document.getElementById('exportEmployeesModal');
                    // Step indices: 0=search, 1=create, 2=import, 3=download template, 4=upload excel, 5=export, 6=export filter, 7=export, 8=table
                    const idx = state.activeIndex;
                    // After step 3 (import employees), show import modal
                    if (idx === 3 && importModal && !importModal.classList.contains('show')) {
                        importModal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }
                    // Before step 5 (upload excel), close import modal
                    if (idx === 5 && importModal && importModal.classList.contains('show')) {
                        importModal.classList.remove('show');
                        document.body.style.overflow = '';
                    }
                    // After step 6 (export employees), show export modal
                    if (idx === 6 && exportModal && !exportModal.classList.contains('show')) {
                        exportModal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                    }
                    // Before step 9 (employee table), close export modal
                    if (idx === 8 && exportModal && exportModal.classList.contains('show')) {
                        exportModal.classList.remove('show');
                        document.body.style.overflow = '';
                    }
                },
                onReset: () => {
                    const importModal = document.getElementById('importEmployeesModal');
                    if (importModal) {
                        importModal.classList.remove('show');
                        document.body.style.overflow = '';
                    }
                    const exportModal = document.getElementById('exportEmployeesModal');
                    if (exportModal) {
                        exportModal.classList.remove('show');
                        document.body.style.overflow = '';
                    }
                }
            });
            driver.drive();
        }
    };

    function fetchDepartments() {
        fetch('/api/api/departments/')
            .then(res => res.json())
            .then(data => {
                if (departmentSelect) {
                    departmentSelect.innerHTML = '<option value="">Select Department</option>';
                    data.departments.forEach(dep => {
                        departmentSelect.innerHTML += `<option value="${dep.id}">${dep.name}</option>`;
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching departments:', error);
            });
    }

    function fetchLines(departmentId) {
        if (!departmentId) {
            if (lineSelect) {
                lineSelect.innerHTML = '<option value="">Select Line</option>';
                lineSelect.disabled = true;
            }
            return;
        }
        
        fetch(`/api/api/departments/${departmentId}/lines/`)
            .then(res => res.json())
            .then(data => {
                if (lineSelect) {
                    lineSelect.innerHTML = '<option value="">Select Line</option>';
                    if (data.success && data.lines && data.lines.length > 0) {
                        data.lines.forEach(line => {
                            lineSelect.innerHTML += `<option value="${line.id}">${line.name}</option>`;
                        });
                        lineSelect.disabled = false;
                    } else {
                        lineSelect.disabled = true;
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching lines:', error);
                if (lineSelect) {
                    lineSelect.innerHTML = '<option value="">Select Line</option>';
                    lineSelect.disabled = true;
                }
            });
    }

    function fetchPositions() {
        fetch('/api/api/positions/')
            .then(res => res.json())
            .then(data => {
                positionSelect.innerHTML = '<option value="">Select Position</option>';
                data.positions.forEach(pos => {
                    positionSelect.innerHTML += `<option value="${pos.id}">${pos.name}</option>`;
                });
            });
    }

    if (departmentSelect) {
        departmentSelect.addEventListener('change', function () {
            const depId = departmentSelect.value;
            fetchLines(depId);
        });
    }

    const exportEmployeeTemplateBtn = document.getElementById('exportEmployeeTemplateBtn');
    if (exportEmployeeTemplateBtn) {
        exportEmployeeTemplateBtn.addEventListener('click', function() {
            window.location.href = '/profile/download-employee-template/';
        });
    }

    // --- Export Modal Logic ---
    const exportModal = document.getElementById('exportEmployeesModal');
    const openExportBtn = document.getElementById('export-employees-btn');
    const closeExportBtn = document.getElementById('closeExportEmployeesModal');
    const cancelExportBtn = document.getElementById('cancelExportEmployeesBtn');
    const exportBtn = document.getElementById('exportEmployeesBtn');

    const exportDepartment = document.getElementById('exportDepartment');
    const exportLine = document.getElementById('exportLine');
    const exportPosition = document.getElementById('exportPosition');
    const exportEmploymentTypeCheckboxes = document.getElementById('exportEmploymentTypeRadios');
    const exportStatusCheckboxes = document.getElementById('exportStatusRadios');

    function showExportModal() {
        showModal(exportModal);
    }
    function hideExportModal() {
        hideModal(exportModal);
    }
    if (openExportBtn) openExportBtn.addEventListener('click', showExportModal);
    if (closeExportBtn) closeExportBtn.addEventListener('click', hideExportModal);
    if (cancelExportBtn) cancelExportBtn.addEventListener('click', hideExportModal);

    // Populate filter dropdowns and checkbox groups
    function populateExportFilters() {
        fetch('/profile/api/export-filters/')
            .then(res => res.json())
            .then(data => {
                // Departments
                exportDepartment.innerHTML = '<option value="">All</option>' + data.departments.map(d => `<option value="${d}">${d}</option>`).join('');
                // Positions
                exportPosition.innerHTML = '<option value="">All</option>' + data.positions.map(p => `<option value="${p}">${p}</option>`).join('');
                // Lines (initially disabled)
                exportLine.innerHTML = '<option value="">All</option>';
                exportLine.disabled = true;
            });
        // Employment Type checkboxes
        const empTypes = [
            { value: '', label: 'All', checked: true },
            { value: 'Regular', label: 'Regular' },
            { value: 'Probationary', label: 'Probationary' },
            { value: 'OJT', label: 'OJT' }
        ];
        exportEmploymentTypeCheckboxes.innerHTML = empTypes.map(e =>
            `<label class="standard-checkbox"><input type="checkbox" name="employment_type" value="${e.value}"${e.checked ? ' checked' : ''}><span class="checkmark"></span><span>${e.label}</span></label>`
        ).join('');
        // Status checkboxes
        const statuses = [
            { value: '', label: 'All', checked: true },
            { value: 'approved', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'deactivated', label: 'Deactivated' }
        ];
        exportStatusCheckboxes.innerHTML = statuses.map(s =>
            `<label class="standard-checkbox"><input type="checkbox" name="status" value="${s.value}"${s.checked ? ' checked' : ''}><span class="checkmark"></span><span>${s.label}</span></label>`
        ).join('');
    }
    if (openExportBtn) openExportBtn.addEventListener('click', populateExportFilters);

    // On department change, fetch lines for that department
    if (exportDepartment) {
        exportDepartment.addEventListener('change', function() {
            const dep = exportDepartment.value;
            if (dep) {
                exportLine.disabled = false; // Enable immediately after department is selected
                fetch(`/profile/api/lines/?department=${encodeURIComponent(dep)}`)
                    .then(res => res.json())
                    .then(data => {
                        exportLine.innerHTML = '<option value="">All</option>' + (data.lines || []).map(l => `<option value="${l}">${l}</option>`).join('');
                        exportLine.disabled = false; // Always enable after fetch
                    })
                    .catch(() => {
                        exportLine.innerHTML = '<option value="">All</option>';
                        exportLine.disabled = false; // Still enable even if error
                    });
            } else {
                exportLine.innerHTML = '<option value="">All</option>';
                exportLine.disabled = true;
            }
        });
    }

    // Export logic (collect all checked values for each group)
    if (exportBtn) exportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const form = document.getElementById('exportEmployeesForm');
        const params = new URLSearchParams();
        // Add selects
        ['department', 'line', 'position'].forEach(name => {
            const el = form.elements[name];
            if (el && el.value) params.append(name, el.value);
        });
        // Add employment_type checkboxes
        form.querySelectorAll('input[name="employment_type"]:checked').forEach(cb => {
            if (cb.value) params.append('employment_type', cb.value);
        });
        // Add status checkboxes
        form.querySelectorAll('input[name="status"]:checked').forEach(cb => {
            if (cb.value) params.append('status', cb.value);
        });
        fetch(`/profile/export-employees/?${params.toString()}`)
            .then(response => {
                if (!response.ok) throw new Error('Export failed');
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'employees_export.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                hideExportModal();
            })
            .catch(() => {
                alert('Export failed.');
            });
    });

    // Utility function to get CSRF token
    function getCsrfToken() {
        // Try to get from hidden input first
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfInput) {
            return csrfInput.value;
        }

        // Try to get from meta tag
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) {
            return csrfMeta.getAttribute('content');
        }

        // Try to get from cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }

        console.warn('CSRF token not found');
        return '';
    }

    const tourBtn = document.getElementById('btn-tour');
    if (tourBtn) {
        if (!tourBtn.querySelector('.tour-tooltip')) {
            const tooltip = document.createElement('span');
            tooltip.className = 'tour-tooltip';
            tooltip.textContent = 'Page Tour';
            tourBtn.appendChild(tooltip);
        }
        tourBtn.addEventListener('click', function() {
            window.startProductTour();
        });
    }

    // Reset Password functionality
    const resetPasswordModal = document.getElementById('resetPasswordModal');
    let currentEmployeeData = null;

    // Handle clicks on reset password buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('#reset-password-btn')) {
            e.preventDefault();
            
            // Get employee data from the button's data attributes or closest table row
            const btn = e.target.closest('#reset-password-btn');
            const employeeId = btn.getAttribute('data-employee-id');
            const employeeName = btn.getAttribute('data-employee-name');
            const employeeIdNumber = btn.getAttribute('data-employee-idnumber');
            
            if (employeeId && employeeName && employeeIdNumber) {
                currentEmployeeData = {
                    id: employeeId,
                    name: employeeName,
                    idnumber: employeeIdNumber
                };
                
                showResetPasswordModal();
            }
        }
    });

    function showResetPasswordModal() {
        if (currentEmployeeData && resetPasswordModal) {
            // Update modal content with employee details
            const resetDetails = document.getElementById('resetPasswordDetails');
            const employeeIdDisplay = document.getElementById('employeeIdDisplay');
            
            if (resetDetails) {
                resetDetails.textContent = `Employee: ${currentEmployeeData.name} (ID: ${currentEmployeeData.idnumber})`;
            }
            
            if (employeeIdDisplay) {
                employeeIdDisplay.textContent = currentEmployeeData.idnumber;
            }
            
            // Show the modal
            resetPasswordModal.classList.add('show');
        }
    }

    // Handle modal close actions
    if (resetPasswordModal) {
        const closeBtn = document.getElementById('closeResetPasswordModal');
        const cancelBtn = document.getElementById('cancelResetPasswordBtn');
        const confirmBtn = document.getElementById('confirmResetPasswordBtn');
        const overlay = resetPasswordModal.querySelector('.modal-overlay');

        // Close modal events
        [closeBtn, cancelBtn, overlay].forEach(element => {
            if (element) {
                element.addEventListener('click', function() {
                    resetPasswordModal.classList.remove('show');
                    currentEmployeeData = null;
                });
            }
        });

        // Confirm reset password
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                if (currentEmployeeData) {
                    resetEmployeePassword(currentEmployeeData.id, currentEmployeeData.idnumber);
                }
            });
        }
    }

    function resetEmployeePassword(employeeId, employeeIdNumber) {
        const newPassword = `Repco_${employeeIdNumber}`;
        
        fetch(`/profile/admin/employee/${employeeId}/reset-password/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                new_password: newPassword
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                resetPasswordModal.classList.remove('show');
                currentEmployeeData = null;
                
                // Show success toast
                showToast(`Password successfully reset to: ${newPassword}`, 'success');
            } else {
                showToast(data.message || 'Failed to reset password', 'error');
            }
        })
        .catch(error => {
            console.error('Error resetting password:', error);
            showToast('An error occurred while resetting password', 'error');
        });
    }

    // Toast notification function
    function showToast(message, type = 'info') {
        // Create toast element if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 400px;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
});