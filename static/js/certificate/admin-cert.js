class AdminCertificateManager {
    constructor() {
        this.currentCertificateId = null;
        this.currentEmployeeId = null;
        this.loadedEmployees = new Set();
        this.currentSearch = '';
        this.currentPage = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFileUpload();
        this.setupFormValidation();
        this.initializeCurrentState();
    }

    initializeCurrentState() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentSearch = urlParams.get('search') || '';
        this.currentPage = parseInt(urlParams.get('page')) || 1;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-certificate')) {
                this.viewCertificate(e.target.dataset.certificateId);
            }
            
            if (e.target.classList.contains('replace-certificate')) {
                this.showReplaceCertificateModal(e.target.dataset.certificateId);
            }
        });

        const bulkUploadForm = document.getElementById('bulkUploadForm');
        if (bulkUploadForm) {
            bulkUploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBulkUpload();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCertificateViewModal();
                this.closeReplaceCertificateModal();
            }
        });

        this.setupDragAndDrop();
        this.setupSearch();
        this.setupPagination();
    }

    setupPagination() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination-btn') && !e.target.closest('.pagination-btn').hasAttribute('disabled')) {
                e.preventDefault();
                const pageBtn = e.target.closest('.pagination-btn');
                const href = pageBtn.getAttribute('href');
                if (href) {
                    const url = new URL(href, window.location.origin);
                    const page = url.searchParams.get('page');
                    if (page) {
                        this.loadPage(parseInt(page));
                    }
                }
            }
        });
    }

    async loadPage(page) {
        this.currentPage = page;
        await this.loadTableData();
        this.updateURL();
    }

    async loadTableData() {
        const tableContainer = document.querySelector('.component-card');
        const table = tableContainer.querySelector('.data-table');
        const paginationContainer = document.getElementById('paginationContainer');
        const emptyState = tableContainer.querySelector('.empty-state');

        this.showTableLoading(true);

        try {
            const params = new URLSearchParams({
                search: this.currentSearch,
                page: this.currentPage
            });

            const response = await fetch(`/certificate/admin-certificate/search/?${params}`);
            const data = await response.json();

            if (data.success) {
                this.updateTableContent(data);
                this.updatePagination(data.pagination, data.page_numbers);
                
                if (data.has_results) {
                    table.style.display = 'table';
                    paginationContainer.style.display = 'flex';
                    if (emptyState) emptyState.style.display = 'none';
                } else {
                    table.style.display = 'none';
                    paginationContainer.style.display = 'none';
                    this.showEmptyState(data.search_query);
                }
            } else {
                this.showNotification('Error loading data', 'error');
            }
        } catch (error) {
            console.error('Error loading table data:', error);
            this.showNotification('Error loading data', 'error');
        } finally {
            this.showTableLoading(false);
        }
    }

    updateTableContent(data) {
        const tbody = document.querySelector('.data-table tbody');
        tbody.innerHTML = '';

        data.employees.forEach(employee => {
            const row = this.createEmployeeRow(employee);
            tbody.appendChild(row);
        });
    }

    createEmployeeRow(employee) {
        const row = document.createElement('tr');
        row.className = 'employee-row';
        row.style.cursor = 'pointer';
        row.onclick = () => this.toggleEmployeeCertificates(employee.id);

        const avatarCell = document.createElement('td');
        if (employee.avatar_url) {
            avatarCell.innerHTML = `<img src="${employee.avatar_url}" alt="${employee.firstname}" class="employee-avatar">`;
        } else {
            avatarCell.innerHTML = '<div class="avatar-placeholder"><i class="fas fa-user"></i></div>';
        }

        const idCell = document.createElement('td');
        idCell.textContent = employee.idnumber;

        const nameCell = document.createElement('td');
        nameCell.textContent = `${employee.firstname} ${employee.lastname}`;

        const emailCell = document.createElement('td');
        emailCell.textContent = employee.email;

        const certCountCell = document.createElement('td');
        certCountCell.textContent = `${employee.certificate_count} certificate${employee.certificate_count !== 1 ? 's' : ''}`;

        const actionCell = document.createElement('td');
        actionCell.className = 'expand-icon';
        actionCell.innerHTML = '<i class="fas fa-chevron-down"></i>';

        row.appendChild(avatarCell);
        row.appendChild(idCell);
        row.appendChild(nameCell);
        row.appendChild(emailCell);
        row.appendChild(certCountCell);
        row.appendChild(actionCell);

        return row;
    }

    updatePagination(pagination, pageNumbers) {
        const paginationContainer = document.getElementById('paginationContainer');
        const infoDiv = paginationContainer.querySelector('.pagination-info');
        const controlsDiv = paginationContainer.querySelector('.pagination-controls');

        infoDiv.innerHTML = `Showing <span id="startRecord">${pagination.start_index}</span> to <span id="endRecord">${pagination.end_index}</span> of <span id="totalRecords">${pagination.total_count}</span> entries`;

        const prevBtn = controlsDiv.querySelector('#prevPage');
        const nextBtn = controlsDiv.querySelector('#nextPage');
        const pageNumbersDiv = controlsDiv.querySelector('#pageNumbers');

        if (pagination.has_previous) {
            prevBtn.outerHTML = `<a class="pagination-btn" id="prevPage" href="?page=${pagination.previous_page_number}${this.currentSearch ? `&search=${this.currentSearch}` : ''}"><i class="fas fa-chevron-left"></i></a>`;
        } else {
            prevBtn.outerHTML = `<span class="pagination-btn" id="prevPage" disabled><i class="fas fa-chevron-left"></i></span>`;
        }

        if (pagination.has_next) {
            nextBtn.outerHTML = `<a class="pagination-btn" id="nextPage" href="?page=${pagination.next_page_number}${this.currentSearch ? `&search=${this.currentSearch}` : ''}"><i class="fas fa-chevron-right"></i></a>`;
        } else {
            nextBtn.outerHTML = `<span class="pagination-btn" id="nextPage" disabled><i class="fas fa-chevron-right"></i></span>`;
        }

        pageNumbersDiv.innerHTML = pageNumbers.map(page => {
            if (page.is_current) {
                return `<span class="pagination-btn active">${page.number}</span>`;
            } else {
                return `<a class="pagination-btn" href="?page=${page.number}${this.currentSearch ? `&search=${this.currentSearch}` : ''}">${page.number}</a>`;
            }
        }).join('');
    }

    showEmptyState(searchQuery) {
        const tableContainer = document.querySelector('.component-card');
        let emptyState = tableContainer.querySelector('.empty-state');
        
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            tableContainer.appendChild(emptyState);
        }

        if (searchQuery) {
            emptyState.innerHTML = `
                <div class="empty-state-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No Results Found</h3>
                <p>No employees found matching "${searchQuery}". Try adjusting your search terms.</p>
            `;
        } else {
            emptyState.innerHTML = `
                <div class="empty-state-icon">
                    <i class="fas fa-users"></i>
                </div>
                <h3>No Certificates Found</h3>
                <p>No employees have certificates yet. Upload some certificates to get started!</p>
            `;
        }
        
        emptyState.style.display = 'block';
    }

    showTableLoading(show) {
        const tableContainer = document.querySelector('.component-card');
        let loadingOverlay = tableContainer.querySelector('.table-loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'table-loading-overlay';
            loadingOverlay.innerHTML = '<div class="loading-spinner"></div><span>Loading...</span>';
            tableContainer.appendChild(loadingOverlay);
        }
        
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchClear = document.querySelector('.search-clear');
        const searchForm = document.querySelector('.search-box');

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (searchInput) {
                    const query = searchInput.value.trim();
                    this.performSearch(query);
                }
            });
        }

        if (searchInput) {
            let searchTimeout;

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();

                clearTimeout(searchTimeout);

                if (query.length === 0) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch('');
                    }, 300);
                } else {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 500);
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value.trim();
                    this.performSearch(query);
                }
            });
        }

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.performSearch('');
                    searchInput.focus();
                }
            });
        }
    }

    async performSearch(query) {
        this.currentSearch = query.trim();
        this.currentPage = 1;
        await this.loadTableData();
        this.updateURL();
    }

    updateURL() {
        const url = new URL(window.location);
        if (this.currentSearch) {
            url.searchParams.set('search', this.currentSearch);
        } else {
            url.searchParams.delete('search');
        }
        if (this.currentPage > 1) {
            url.searchParams.set('page', this.currentPage);
        } else {
            url.searchParams.delete('page');
        }
        window.history.replaceState({}, '', url);
    }

    setupFileUpload() {
        const fileInputs = document.querySelectorAll('.file-input');
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleFileSelection(input, e.target.files);
            });
        });
    }

    setupDragAndDrop() {
        const fileLabels = document.querySelectorAll('.file-label');
        
        fileLabels.forEach(label => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                label.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                label.addEventListener(eventName, () => this.highlight(label), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                label.addEventListener(eventName, () => this.unhighlight(label), false);
            });

            label.addEventListener('drop', (e) => this.handleDrop(e, label), false);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(element) {
        element.style.borderColor = 'var(--primary-color)';
        element.style.backgroundColor = 'var(--primary-light)';
        element.style.transform = 'scale(1.02)';
    }

    unhighlight(element) {
        element.style.borderColor = 'var(--border-color)';
        element.style.backgroundColor = 'transparent';
        element.style.transform = 'scale(1)';
    }

    handleDrop(e, label) {
        const dt = e.dataTransfer;
        const files = dt.files;
        const input = label.previousElementSibling;
        
        input.files = files;
        this.handleFileSelection(input, files);
    }

    handleFileSelection(input, files) {
        const label = input.nextElementSibling;
        const span = label.querySelector('span');
        
        if (files.length > 0) {
            if (files.length === 1) {
                span.textContent = files[0].name;
            } else {
                span.textContent = `${files.length} files selected`;
            }
            label.style.borderColor = 'var(--success-color)';
            label.style.color = 'var(--success-color)';
            
            this.validateFiles(files);
        } else {
            this.resetFileLabel(label, span);
        }
    }

    validateFiles(files) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const errors = [];

        Array.from(files).forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                errors.push(`${file.name}: Invalid file type`);
            }
            if (file.size > maxSize) {
                errors.push(`${file.name}: File too large (max 10MB)`);
            }
        });

        if (errors.length > 0) {
            this.showNotification(errors.join('\n'), 'error');
        }
    }

    setupFormValidation() {
        const form = document.getElementById('bulkUploadForm');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
            });
        }
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        
        if (field.hasAttribute('required') && !value) {
            isValid = false;
        }
        
        if (field.type === 'file' && field.hasAttribute('required') && field.files.length === 0) {
            isValid = false;
        }
        
        if (isValid) {
            field.classList.remove('invalid');
            field.classList.add('valid');
        } else {
            field.classList.remove('valid');
            field.classList.add('invalid');
        }
        
        return isValid;
    }

    clearFieldError(field) {
        field.classList.remove('invalid');
    }

    async handleBulkUpload() {
        const form = document.getElementById('bulkUploadForm');
        const formData = new FormData(form);
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (!this.validateForm(form)) {
            this.showNotification('Please correct the errors and try again', 'error');
            return;
        }

        // Close the modal immediately
        closeModal('bulkUploadModal');
        
        // Show upload progress overlay
        this.showUploadProgress();
        
        // Disable the upload button
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> Uploading...';

        try {
            const response = await fetch('/certificate/bulk-upload/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            const data = await response.json();

            if (data.success) {
                // Hide progress overlay
                this.hideUploadProgress();
                
                // Show success notification
                this.showNotification(
                    `Successfully uploaded ${data.uploaded_count} certificate(s)!`,
                    'success'
                );
                
                // Show error notifications if any
                if (data.errors && data.errors.length > 0) {
                    setTimeout(() => {
                        data.errors.forEach(error => {
                            this.showNotification(error, 'warning');
                        });
                    }, 1000);
                }
                
                // Reset form
                form.reset();
                this.resetAllFileLabels();
                
                // Refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.hideUploadProgress();
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.hideUploadProgress();
            this.showNotification('Network error occurred', 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Certificates';
        }
    }

    validateForm(form) {
        const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    resetAllFileLabels() {
        const fileLabels = document.querySelectorAll('.file-label');
        fileLabels.forEach(label => {
            const span = label.querySelector('span');
            this.resetFileLabel(label, span);
        });
    }

    resetFileLabel(label, span) {
        span.textContent = 'Choose files or drag here';
        label.style.borderColor = 'var(--border-color)';
        label.style.color = 'var(--text-muted)';
        label.style.backgroundColor = 'transparent';
        label.style.transform = 'scale(1)';
    }

    async toggleEmployeeCertificates(employeeId) {
        const row = document.getElementById('certificates-' + employeeId);
        if (!row) return;
        const content = row.querySelector('.certificates-content');
        if (row._animating) return;

        // Close any other open certificate rows
        document.querySelectorAll('.certificates-row.open').forEach(openRow => {
            if (openRow !== row) {
                const openContent = openRow.querySelector('.certificates-content');
                if (openContent) {
                    openContent.style.maxHeight = openContent.scrollHeight + 'px';
                    void openContent.offsetHeight;
                    openContent.style.maxHeight = '0';
                    openRow.classList.remove('open');
                    const onTransitionEnd = function(e) {
                        if (e.propertyName === 'max-height') {
                            openRow.style.display = 'none';
                            openContent.style.maxHeight = '';
                            openContent.removeEventListener('transitionend', onTransitionEnd);
                            openRow._animating = false;
                        }
                    };
                    openContent.addEventListener('transitionend', onTransitionEnd);
                }
            }
        });

        row._animating = true;
        if (row.classList.contains('open')) {
            content.style.maxHeight = content.scrollHeight + 'px';
            void content.offsetHeight;
            content.style.maxHeight = '0';
            row.classList.remove('open');
            const onTransitionEnd = function(e) {
                if (e.propertyName === 'max-height') {
                row.style.display = 'none';
                    content.style.maxHeight = '';
                    content.removeEventListener('transitionend', onTransitionEnd);
                    row._animating = false;
                }
            };
            content.addEventListener('transitionend', onTransitionEnd);
        } else {
            row.style.display = '';
            content.style.maxHeight = '0';
            void content.offsetHeight;
                content.style.maxHeight = content.scrollHeight + 'px';
                row.classList.add('open');
            const onTransitionEnd = function(e) {
                if (e.propertyName === 'max-height') {
                    content.style.maxHeight = '';
                    content.removeEventListener('transitionend', onTransitionEnd);
                    row._animating = false;
                }
            };
            content.addEventListener('transitionend', onTransitionEnd);
        }
    }

    async loadEmployeeCertificates(employeeId, callback) {
        const certificatesDiv = document.getElementById(`certificates-${employeeId}`);
        
        try {
            const response = await fetch(`/certificate/employee-certificates/${employeeId}/`);
            const data = await response.json();

            if (data.success) {
                certificatesDiv.innerHTML = this.renderCertificatesGrid(data.certificates);
                this.loadedEmployees.add(employeeId);
                
                setTimeout(() => {
                    const rows = certificatesDiv.querySelectorAll('.certificate-row');
                    rows.forEach((row, index) => {
                        row.style.animationDelay = `${index * 0.1}s`;
                        row.style.animation = 'slideInUp 0.5s ease-out forwards';
                    });
                }, 100);
            } else {
                certificatesDiv.innerHTML = `<p class="error">Failed to load certificates: ${data.error}</p>`;
            }
        } catch (error) {
            certificatesDiv.innerHTML = '<p class="error">Network error occurred</p>';
        } finally {
            if (typeof callback === 'function') callback();
        }
    }

    renderCertificatesGrid(certificates) {
        if (certificates.length === 0) {
            return `
                <div class="empty-state" style="padding: var(--space-lg);">
                    <div class="empty-state-icon">
                        <i class="fas fa-certificate"></i>
                    </div>
                    <p class="text-muted">No certificates found for this employee.</p>
                </div>
            `;
        }

        const certificatesHtml = certificates.map(cert => `
            <tr class="certificate-row" data-certificate-id="${cert.id}">
                <td>
                    <div class="certificate-title">
                        <strong title="${cert.title}">${cert.title.length > 50 ? cert.title.substring(0, 50) + '...' : cert.title}</strong>
                    </div>
                </td>
                <td>
                    <div class="file-type">
                    ${cert.is_image ? 
                            `<span class="file-type-badge image">
                                <i class="fas fa-image"></i> Image
                            </span>` :
                            `<span class="file-type-badge pdf">
                                <i class="fas fa-file-pdf"></i> PDF
                            </span>`
                    }
                </div>
                </td>
                <td>
                    <div class="uploaded-by">
                        ${cert.uploaded_by || 'Unknown'}
                    </div>
                </td>
                <td>
                    <div class="upload-date">
                        ${cert.created_at}
                    </div>
                </td>
                <td>
                    <div class="certificate-status">
                        <span class="status-badge ${cert.is_seen ? 'seen' : 'unseen'}">
                        <i class="fas fa-${cert.is_seen ? 'check' : 'exclamation'}"></i>
                        ${cert.is_seen ? 'Seen' : 'Unseen'}
                    </span>
                </div>
                </td>
                <td>
                    <div class="certificate-actions">
                        <button class="btn btn-primary btn-sm view-certificate" data-certificate-id="${cert.id}" title="View Certificate">
                        <i class="fas fa-eye"></i>
                    </button>
                        <button class="btn btn-accent btn-sm replace-certificate" data-certificate-id="${cert.id}" title="Replace Certificate">
                        <i class="fas fa-edit"></i>
                    </button>
                        <button class="btn btn-error btn-sm delete-certificate" data-certificate-id="${cert.id}" title="Delete Certificate">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                </td>
            </tr>
        `).join('');

        return `
            <div class="certificate-table-container">
                <table class="data-table certificate-table">
                    <thead>
                        <tr>
                            <th>Certificate Title</th>
                            <th>File Type</th>
                            <th>Uploaded By</th>
                            <th>Upload Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${certificatesHtml}
                    </tbody>
                </table>
            </div>
        `;
    }

    async viewCertificate(certificateId) {
        this.currentCertificateId = certificateId;
        const modal = document.getElementById('certificateViewModal');
        const content = document.getElementById('certificateViewContent');
        const title = document.getElementById('certificateViewTitle');
        
        content.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading certificate...</p></div>';
        modal.classList.add('show');

        try {
            // First, get certificate details to determine file type
            const certResponse = await fetch(`/certificate/get-certificate-details/${certificateId}/`);
            const certData = await certResponse.json();
            
            if (!certData.success) {
                throw new Error('Failed to get certificate details');
            }
            
            title.textContent = certData.certificate.title || 'Certificate Preview';
            
            if (certData.certificate.is_image) {
                // For images, use img tag with CSS styling
                content.innerHTML = `
                    <img src="${certData.certificate.file_url}" 
                         alt="${certData.certificate.title || 'Certificate'}" 
                         class="certificate-preview-image">
                `;
            } else {
                // For PDFs and other files, use iframe
                const viewUrl = `/certificate/view/${certificateId}/`;
                content.innerHTML = `
                    <iframe src="${viewUrl}" width="100%" height="70vh" frameborder="0" style="border-radius: var(--radius-md);">
                        <p>Unable to load certificate. <a href="${viewUrl}" target="_blank" class="btn btn-primary">Open in new tab</a></p>
                    </iframe>
                `;
            }
        } catch (error) {
            console.error('Error loading certificate:', error);
            content.innerHTML = '<p class="error">Failed to load certificate</p>';
        }
    }

    async deleteCertificate(certificateId) {
        this.showLoading();
        try {
            const response = await fetch(`/certificate/delete/${certificateId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                this.showNotification('Certificate deleted successfully', 'success');
                const certificateRow = document.querySelector(`[data-certificate-id="${certificateId}"]`);
                if (certificateRow) {
                    certificateRow.style.animation = 'slideOutDown 0.3s ease-out';
                    setTimeout(() => {
                        certificateRow.remove();
                    }, 300);
                }
                // Save scroll position and open employee before reload
                const openRow = document.querySelector('.certificates-row.open');
                if (openRow) {
                    const openEmployeeId = openRow.id.replace('certificates-', '');
                    localStorage.setItem('lastOpenEmployeeId', openEmployeeId);
                } else {
                    localStorage.removeItem('lastOpenEmployeeId');
                }
                localStorage.setItem('lastScrollY', window.scrollY);
                setTimeout(() => { window.location.reload(); }, 350);
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            this.showNotification('Network error occurred', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showReplaceCertificateModal(certificateId) {
        this.currentCertificateId = certificateId;
        const modal = document.getElementById('replaceCertificateModal');
        modal.classList.add('show');
    }

    async submitReplaceCertificate() {
        const form = document.getElementById('replaceCertificateForm');
        const formData = new FormData(form);
        
        if (!this.validateForm(form)) {
            this.showNotification('Please select a file', 'error');
            return;
        }
        
        this.showLoading();

        try {
            const response = await fetch(`/certificate/replace/${this.currentCertificateId}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Certificate replaced successfully', 'success');
                this.closeReplaceCertificateModal();
                
                setTimeout(() => {
                    this.refreshEmployeeCertificates();
                }, 1000);
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            this.showNotification('Network error occurred', 'error');
        } finally {
            this.hideLoading();
        }
    }

    refreshEmployeeCertificates() {
        const expandedEmployees = document.querySelectorAll('.employee-item.expanded');
        expandedEmployees.forEach(item => {
            const employeeId = item.querySelector('[id^="certificates-"]').id.split('-')[1];
            this.loadedEmployees.delete(employeeId);
            this.toggleEmployeeCertificates(employeeId);
        });
    }

    closeCertificateViewModal() {
        const modal = document.getElementById('certificateViewModal');
        if (modal) {
            modal.classList.remove('show');
            this.currentCertificateId = null;
        }
    }

    closeReplaceCertificateModal() {
        const modal = document.getElementById('replaceCertificateModal');
        const form = document.getElementById('replaceCertificateForm');
        
        if (modal) {
            modal.classList.remove('show');
        }
        
        if (form) {
            form.reset();
            this.resetAllFileLabels();
        }
        
        this.currentCertificateId = null;
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showUploadProgress() {
        // Create upload progress overlay if it doesn't exist
        let progressOverlay = document.getElementById('uploadProgressOverlay');
        if (!progressOverlay) {
            progressOverlay = document.createElement('div');
            progressOverlay.id = 'uploadProgressOverlay';
            progressOverlay.className = 'upload-progress-overlay';
            progressOverlay.innerHTML = `
                <div class="upload-progress-content">
                    <div class="upload-progress-spinner">
                        <div class="spinner"></div>
                    </div>
                    <h3>Uploading Certificates...</h3>
                    <p>Please wait while we process your files</p>
                    <div class="upload-progress-bar">
                        <div class="upload-progress-fill"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(progressOverlay);
        }
        
        progressOverlay.style.display = 'flex';
        
        // Animate the progress bar
        const progressFill = progressOverlay.querySelector('.upload-progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
            setTimeout(() => {
                progressFill.style.width = '100%';
            }, 100);
        }
    }

    hideUploadProgress() {
        const progressOverlay = document.getElementById('uploadProgressOverlay');
        if (progressOverlay) {
            progressOverlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'exclamation-circle';
        else if (type === 'warning') icon = 'exclamation-triangle';
        
        let bgColor = 'var(--primary-color)';
        if (type === 'success') bgColor = 'var(--success-color)';
        else if (type === 'error') bgColor = 'var(--error-color)';
        else if (type === 'warning') bgColor = 'var(--warning-color)';
        
        toast.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            border-radius: var(--radius-md);
            padding: var(--space-md);
            margin-bottom: var(--space-sm);
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: white;">
                <i class="fas fa-${icon}" style="font-size: 1.1rem; opacity: 0.9; color: white; flex-shrink: 0;"></i>
                <span style="flex: 1; color: white; white-space: pre-line;">${message}</span>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
    }
}

function toggleEmployeeCertificates(employeeId) {
    const row = document.getElementById('certificates-' + employeeId);
    if (!row) return;
    const content = row.querySelector('.certificates-content');
    if (row._animating) return;

    // Close any other open certificate rows
    document.querySelectorAll('.certificates-row.open').forEach(openRow => {
        if (openRow !== row) {
            const openContent = openRow.querySelector('.certificates-content');
            if (openContent) {
                openContent.style.maxHeight = openContent.scrollHeight + 'px';
                void openContent.offsetHeight;
                openContent.style.maxHeight = '0';
                openRow.classList.remove('open');
                const onTransitionEnd = function(e) {
                    if (e.propertyName === 'max-height') {
                        openRow.style.display = 'none';
                        openContent.style.maxHeight = '';
                        openContent.removeEventListener('transitionend', onTransitionEnd);
                        openRow._animating = false;
                    }
                };
                openContent.addEventListener('transitionend', onTransitionEnd);
            }
        }
    });

    row._animating = true;
    if (row.classList.contains('open')) {
        content.style.maxHeight = content.scrollHeight + 'px';
        void content.offsetHeight;
        content.style.maxHeight = '0';
        row.classList.remove('open');
        const onTransitionEnd = function(e) {
            if (e.propertyName === 'max-height') {
            row.style.display = 'none';
                content.style.maxHeight = '';
                content.removeEventListener('transitionend', onTransitionEnd);
                row._animating = false;
            }
        };
        content.addEventListener('transitionend', onTransitionEnd);
    } else {
        row.style.display = '';
        content.style.maxHeight = '0';
        void content.offsetHeight;
            content.style.maxHeight = content.scrollHeight + 'px';
            row.classList.add('open');
        const onTransitionEnd = function(e) {
            if (e.propertyName === 'max-height') {
                content.style.maxHeight = '';
                content.removeEventListener('transitionend', onTransitionEnd);
                row._animating = false;
            }
        };
        content.addEventListener('transitionend', onTransitionEnd);
    }
}

function loadEmployeeCertificates(employeeId, content, row, callback) {
    fetch(`/certificate/employee-certificates/${employeeId}/`)
        .then(response => response.text())
        .then(html => {
            content.innerHTML = html;
            row.dataset.loaded = 'true';
            if (typeof callback === 'function') callback();
        })
        .catch(() => {
            content.innerHTML = '<div class="error">Failed to load certificates.</div>';
            if (typeof callback === 'function') callback();
        });
}

function closeCertificateViewModal() {
    if (window.adminCertificateManager) {
        window.adminCertificateManager.closeCertificateViewModal();
    }
}

function closeReplaceCertificateModal() {
    if (window.adminCertificateManager) {
        window.adminCertificateManager.closeReplaceCertificateModal();
    }
}

function submitReplaceCertificate() {
    if (window.adminCertificateManager) {
        window.adminCertificateManager.submitReplaceCertificate();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminCertificateManager = new AdminCertificateManager();
});

document.addEventListener('DOMContentLoaded', function() {
    const lastScrollY = localStorage.getItem('lastScrollY');
    const lastOpenEmployeeId = localStorage.getItem('lastOpenEmployeeId');
    if (lastScrollY) {
        window.scrollTo(0, parseInt(lastScrollY, 10));
        localStorage.removeItem('lastScrollY');
    }
    if (lastOpenEmployeeId) {
        setTimeout(() => {
            toggleEmployeeCertificates(lastOpenEmployeeId);
            localStorage.removeItem('lastOpenEmployeeId');
        }, 200);
    }
});