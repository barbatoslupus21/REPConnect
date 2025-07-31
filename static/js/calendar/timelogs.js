class TimeLogsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;
        this.employees = [];
        this.filteredEmployees = [];
        this.selectedFiles = [];
        this.searchTerm = '';
        this.selectedDepartments = ['all'];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadEmployees();
        this.setupDragAndDrop();
        this.setupModals();
    }

    setupEventListeners() {
        // Import/Export buttons
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());
        document.getElementById('exportTemplateBtn').addEventListener('click', () => this.exportTemplate());
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadFiles());

        // Search functionality
        document.getElementById('employeeSearch').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('searchClear').addEventListener('click', () => this.clearSearch());

        // Pagination
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());

        // File input
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileSelect(e));

        // Modal buttons
        document.getElementById('saveTimelogBtn').addEventListener('click', () => this.saveTimelog());
        document.getElementById('addTimelogBtn').addEventListener('click', () => this.addTimelog());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
    }

    setupDragAndDrop() {
        const fileLabel = document.querySelector('.file-label');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileLabel.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            fileLabel.addEventListener(eventName, () => fileLabel.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileLabel.addEventListener(eventName, () => fileLabel.classList.remove('drag-over'), false);
        });

        fileLabel.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.processFiles(files);
    }

    handleFileSelect(e) {
        this.processFiles(e.target.files);
    }

    processFiles(files) {
        this.selectedFiles = Array.from(files).filter(file =>
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel'
        );

        if (this.selectedFiles.length === 0) {
            this.showNotification('Please select valid Excel files (.xlsx, .xls)', 'warning');
            return;
        }

        this.displaySelectedFiles();
        document.getElementById('uploadBtn').disabled = false;
    }

    displaySelectedFiles() {
        const selectedFilesContainer = document.getElementById('selectedFiles');
        const fileList = document.getElementById('fileList');

        if (this.selectedFiles.length === 0) {
            selectedFilesContainer.style.display = 'none';
            return;
        }

        selectedFilesContainer.style.display = 'block';
        fileList.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-excel file-icon"></i>
                    <div class="file-details">
                        <p class="file-name">${file.name}</p>
                        <p class="file-size">${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="file-remove" onclick="timelogsManager.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.displaySelectedFiles();

        if (this.selectedFiles.length === 0) {
            document.getElementById('uploadBtn').disabled = true;
            document.getElementById('file-upload').value = '';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showImportModal() {
        this.resetFileUpload();
        openModal('importTimelogModal');
    }

    hideImportModal() {
        closeModal('importTimelogModal');
        this.resetFileUpload();
    }

    resetFileUpload() {
        document.getElementById('file-upload').value = '';
        document.querySelector('.file-label span').textContent = 'Drag & drop Excel files here or click to browse';
        document.getElementById('uploadBtn').disabled = true;
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('selectedFiles').style.display = 'none';
        document.getElementById('fileList').innerHTML = '';
        this.selectedFiles = [];
    }

    async uploadFiles() {
        if (this.selectedFiles.length === 0) return;

        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressContainer.style.display = 'block';
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/calendar/timelogs/import/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': this.getCSRFToken()
                    }
                });

                const result = await response.json();
                const progress = ((i + 1) / this.selectedFiles.length) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;

                if (!response.ok) {
                    throw new Error(result.message || 'Upload failed');
                }

            } catch (error) {
                this.showNotification(`Error uploading ${file.name}: ${error.message}`, 'error');
                continue;
            }
        }

        this.showNotification('Files uploaded successfully!', 'success');
        this.hideImportModal();
        this.loadEmployees();
        
        // Refresh calendar indicators if calendar manager exists
        if (window.calendarManager && window.calendarManager.refreshTimelogIndicators) {
            await window.calendarManager.refreshTimelogIndicators();
        }
    }

    async exportTemplate() {
        try {
            const response = await fetch('/calendar/timelogs/export-template/', {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'timelog_template.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showNotification('Template downloaded successfully!', 'success');
        } catch (error) {
            this.showNotification('Error downloading template', 'error');
        }
    }

    async loadEmployees() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.style.display = 'block';

        try {
            const response = await fetch('/calendar/timelogs/employees/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load employees');
            }

            const data = await response.json();
            this.employees = data.employees;
            this.filteredEmployees = [...this.employees];
            this.totalItems = this.filteredEmployees.length;
            
            this.renderEmployees();
            this.renderPagination();
            
        } catch (error) {
            this.showNotification('Error loading employees', 'error');
            this.renderEmptyState();
        } finally {
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    renderEmployees() {
        const container = document.getElementById('employeeList');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageEmployees = this.filteredEmployees.slice(startIndex, endIndex);

        if (pageEmployees.length === 0) {
            this.renderEmptyState();
            return;
        }

        container.innerHTML = pageEmployees.map(employee => this.renderEmployeeItem(employee)).join('');
        
        // Add event listeners for employee items (expand/collapse)
        container.querySelectorAll('.employee-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const employeeItem = e.currentTarget.closest('.employee-item');
                employeeItem.classList.toggle('expanded');
            });
        });

        document.getElementById('paginationContainer').style.display = 'flex';
    }

    renderEmployeeItem(employee) {
        const totalLogs = employee.timelogs ? employee.timelogs.length : 0;
        const timeInCount = employee.timelogs ? employee.timelogs.filter(log => log.entry === 'timein').length : 0;
        const timeOutCount = employee.timelogs ? employee.timelogs.filter(log => log.entry === 'timeout').length : 0;

        return `
            <div class="employee-item" data-employee-id="${employee.id}">
                <div class="employee-header">
                    <div class="employee-info">
                        <img src="${employee.avatar || '/static/images/default-avatar.png'}" alt="${employee.name}" class="employee-avatar">
                        <div class="employee-details">
                            <h4>${employee.name}</h4>
                            <p>ID: ${employee.idnumber} • ${employee.email}</p>
                        </div>
                    </div>
                    <div class="employee-stats">
                        <div class="stat-item">
                            <span class="stat-number">${totalLogs}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${timeInCount}</span>
                            <span class="stat-label">Time In</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${timeOutCount}</span>
                            <span class="stat-label">Time Out</span>
                        </div>
                    </div>
                    <div class="employee-actions">
                        <i class="fas fa-chevron-down expand-icon"></i>
                    </div>
                </div>
                <div class="employee-timelogs">
                    ${this.renderEmployeeTimelogs(employee)}
                </div>
            </div>
        `;
    }

    renderEmployeeTimelogs(employee) {
        if (!employee.timelogs || employee.timelogs.length === 0) {
            return `
                <div class="no-timelogs">
                    <i class="fas fa-clock"></i>
                    <p>No time logs found for this employee</p>
                </div>
            `;
        }

        const headerActions = `
            <div class="timelogs-header-actions">
                <h5>Time Logs (${employee.timelogs.length})</h5>
            </div>
        `;

        const timeLogs = employee.timelogs.map(log => `
            <div class="timelog-entry">
                <div class="timelog-info">
                    <span class="entry-type-badge ${log.entry}">${log.entry === 'timein' ? 'Time In' : 'Time Out'}</span>
                    <div class="timelog-datetime">
                        <span class="timelog-date">${this.formatDate(log.time)}</span>
                        <span class="timelog-time">${this.formatTime(log.time)}</span>
                    </div>
                </div>
                <div class="timelog-actions">
                    <button class="btn btn-sm btn-icon btn-outline" onclick="timeLogsManager.editTimelog(${log.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-error" onclick="timeLogsManager.deleteTimelog(${log.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        return headerActions + timeLogs;
    }

    renderEmptyState() {
        const container = document.getElementById('employeeList');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No employees found</h3>
                <p>Try adjusting your search criteria or filters</p>
            </div>
        `;
        document.getElementById('paginationContainer').style.display = 'none';
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const paginationInfo = document.getElementById('paginationInfo');
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        // Update info
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
        paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${this.totalItems} employees`;

        // Update buttons
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;

        // Update page numbers
        pageNumbers.innerHTML = '';
        const maxVisiblePages = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageNumbers.appendChild(pageBtn);
        }
    }

    handleSearch(term) {
        this.searchTerm = term.toLowerCase();
        this.applyFilters();
    }

    clearSearch() {
        document.getElementById('employeeSearch').value = '';
        this.searchTerm = '';
        this.applyFilters();
    }

    applyFilters() {
        this.filteredEmployees = this.employees.filter(employee => {
            // Search filter
            const matchesSearch = !this.searchTerm || 
                employee.name.toLowerCase().includes(this.searchTerm) ||
                employee.email.toLowerCase().includes(this.searchTerm) ||
                employee.idnumber.toLowerCase().includes(this.searchTerm);

            return matchesSearch;
        });

        this.totalItems = this.filteredEmployees.length;
        this.currentPage = 1;
        this.renderEmployees();
        this.renderPagination();
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderEmployees();
        this.renderPagination();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    setupModals() {
        // Modal close events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    openAddModal(employeeId = null) {
        const modal = document.getElementById('addTimelogModal');
        const employeeSelect = document.getElementById('addEmployeeSelect');
        
        // Populate employee select
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        this.employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.name} (${emp.idnumber})`;
            if (employeeId && emp.id === employeeId) {
                option.selected = true;
            }
            employeeSelect.appendChild(option);
        });

        // Set default date to today
        document.getElementById('addDate').value = new Date().toISOString().split('T')[0];
        
        modal.classList.add('show');
    }

    async addTimelog() {
        const form = document.getElementById('addTimelogForm');
        const formData = new FormData(form);
        
        const data = {
            employee_id: document.getElementById('addEmployeeSelect').value,
            date: document.getElementById('addDate').value,
            time: document.getElementById('addTime').value,
            entry: document.getElementById('addEntryType').value
        };

        if (!data.employee_id || !data.date || !data.time || !data.entry) {
            this.showNotification('Please fill in all fields', 'warning');
            return;
        }

        try {
            const response = await fetch('/calendar/timelogs/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to add time log');
            }

            this.showNotification('Time log added successfully!', 'success');
            this.closeAllModals();
            this.loadEmployees();
            
            // Refresh calendar indicators if calendar manager exists
            if (window.calendarManager && window.calendarManager.refreshTimelogIndicators) {
                await window.calendarManager.refreshTimelogIndicators();
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async editTimelog(timelogId) {
        try {
            const response = await fetch(`/calendar/timelogs/user/${timelogId}/`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load time log');
            }

            const timelog = await response.json();
            
            // Populate edit form
            document.getElementById('editTimelogId').value = timelog.id;
            document.getElementById('editDate').value = timelog.date;
            document.getElementById('editTime').value = timelog.time;
            document.getElementById('editEntryType').value = timelog.entry;

            document.getElementById('editTimelogModal').classList.add('show');
        } catch (error) {
            this.showNotification('Error loading time log', 'error');
        }
    }

    async saveTimelog() {
        const timelogId = document.getElementById('editTimelogId').value;
        const data = {
            date: document.getElementById('editDate').value,
            time: document.getElementById('editTime').value,
            entry: document.getElementById('editEntryType').value
        };

        if (!data.date || !data.time || !data.entry) {
            this.showNotification('Please fill in all fields', 'warning');
            return;
        }

        try {
            const response = await fetch(`/calendar/timelogs/user/${timelogId}/update/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to update time log');
            }

            this.showNotification('Time log updated successfully!', 'success');
            this.closeAllModals();
            this.loadEmployees();
            
            // Refresh calendar indicators if calendar manager exists
            if (window.calendarManager && window.calendarManager.refreshTimelogIndicators) {
                await window.calendarManager.refreshTimelogIndicators();
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    deleteTimelog(timelogId) {
        // Find the timelog details for confirmation
        let timelogDetails = '';
        this.employees.forEach(emp => {
            if (emp.timelogs) {
                const timelog = emp.timelogs.find(log => log.id === timelogId);
                if (timelog) {
                    timelogDetails = `${emp.name} - ${this.formatDate(timelog.time)} ${this.formatTime(timelog.time)} (${timelog.entry === 'timein' ? 'Time In' : 'Time Out'})`;
                }
            }
        });

        document.getElementById('deleteDetails').textContent = timelogDetails;
        document.getElementById('confirmDeleteBtn').setAttribute('data-timelog-id', timelogId);
        document.getElementById('deleteTimelogModal').classList.add('show');
    }

    async confirmDelete() {
        const timelogId = document.getElementById('confirmDeleteBtn').getAttribute('data-timelog-id');

        try {
            const response = await fetch(`/calendar/timelogs/user/${timelogId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to delete time log');
            }

            this.showNotification('Time log deleted successfully!', 'success');
            this.closeAllModals();
            this.loadEmployees();
            
            // Refresh calendar indicators if calendar manager exists
            if (window.calendarManager && window.calendarManager.refreshTimelogIndicators) {
                await window.calendarManager.refreshTimelogIndicators();
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    showNotification(message, type = 'info') {
        if (window.portalUI && window.portalUI.showNotification) {
            window.portalUI.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.timeLogsManager = new TimeLogsManager();
});

// Global functions for inline event handlers
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}