let currentTicketId = null;
let currentDeviceId = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadFormOptions();
    setupEventListeners();
    setupSearchFunctionality();
});

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchToTab(targetTab);
        });
    });
}

function switchToTab(targetTab) {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-tab="${targetTab}"]`);
    const activePanel = document.getElementById(`${targetTab}-tab`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
}

function setupEventListeners() {
    const addDeviceForm = document.getElementById('addDeviceForm');
    const requestTicketForm = document.getElementById('requestTicketForm');
    
    if (addDeviceForm) {
        addDeviceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitAddDevice();
        });
    }
    
    if (requestTicketForm) {
        requestTicketForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitRequestTicket();
        });
    }
}

function setupSearchFunctionality() {
    // Requests search
    const requestsSearchInput = document.getElementById('requestsSearchInput');
    const clearRequestsSearch = document.getElementById('clearRequestsSearch');
    
    if (requestsSearchInput) {
        let searchTimeout;
        requestsSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch('requests', this.value);
            }, 300);
        });
    }
    
    if (clearRequestsSearch) {
        clearRequestsSearch.addEventListener('click', function(e) {
            e.preventDefault();
            requestsSearchInput.value = '';
            performSearch('requests', '');
        });
    }
    
    // Devices search
    const devicesSearchInput = document.getElementById('devicesSearchInput');
    const clearDevicesSearch = document.getElementById('clearDevicesSearch');
    
    if (devicesSearchInput) {
        let searchTimeout;
        devicesSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch('devices', this.value);
            }, 300);
        });
    }
    
    if (clearDevicesSearch) {
        clearDevicesSearch.addEventListener('click', function(e) {
            e.preventDefault();
            devicesSearchInput.value = '';
            performSearch('devices', '');
        });
    }
}

async function performSearch(tab, searchQuery) {
    try {
        const params = new URLSearchParams();
        params.append('tab', tab);
        if (searchQuery) params.append('search', searchQuery);
        
        const response = await fetch(window.location.pathname + '?' + params.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (tab === 'requests') {
                document.getElementById('requestsTableBody').innerHTML = data.html;
                updatePagination('requests', data.pagination);
            } else if (tab === 'devices') {
                document.getElementById('devicesTableBody').innerHTML = data.html;
                updatePagination('devices', data.pagination);
            }
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function updatePagination(tab, pagination) {
    const prefix = tab === 'requests' ? 'requests' : 'devices';
    
    document.getElementById(`${prefix}StartRecord`).textContent = pagination.start_index || 0;
    document.getElementById(`${prefix}EndRecord`).textContent = pagination.end_index || 0;
    document.getElementById(`${prefix}TotalRecords`).textContent = pagination.count || 0;
    
    // Update pagination controls
    const paginationControls = document.getElementById(`${prefix}PaginationControls`);
    const pageNumbers = document.getElementById(`${prefix}PageNumbers`);
    
    if (paginationControls && pageNumbers) {
        // Update previous button
        const prevBtn = paginationControls.querySelector('.pagination-btn:first-child');
        if (pagination.has_previous) {
            prevBtn.onclick = () => tab === 'requests' ? loadRequestsPage(pagination.number - 1) : loadDevicesPage(pagination.number - 1);
            prevBtn.classList.remove('disabled');
        } else {
            prevBtn.onclick = null;
            prevBtn.classList.add('disabled');
        }
        
        // Update next button
        const nextBtn = paginationControls.querySelector('.pagination-btn:last-child');
        if (pagination.has_next) {
            nextBtn.onclick = () => tab === 'requests' ? loadRequestsPage(pagination.number + 1) : loadDevicesPage(pagination.number + 1);
            nextBtn.classList.remove('disabled');
        } else {
            nextBtn.onclick = null;
            nextBtn.classList.add('disabled');
        }
        
        // Update page numbers
        let pageNumbersHTML = '';
        const currentPage = pagination.number;
        const totalPages = pagination.num_pages;
        
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            if (i === currentPage) {
                pageNumbersHTML += `<span class="pagination-btn active">${i}</span>`;
            } else {
                const clickHandler = tab === 'requests' ? `loadRequestsPage(${i})` : `loadDevicesPage(${i})`;
                pageNumbersHTML += `<button class="pagination-btn" onclick="${clickHandler}">${i}</button>`;
            }
        }
        pageNumbers.innerHTML = pageNumbersHTML;
    }
}

async function loadRequestsPage(page) {
    const searchQuery = document.getElementById('requestsSearchInput')?.value || '';
    const params = new URLSearchParams();
    params.append('tab', 'requests');
    params.append('page', page);
    if (searchQuery) params.append('search', searchQuery);
    
    try {
        const response = await fetch(window.location.pathname + '?' + params.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('requestsTableBody').innerHTML = data.html;
            updatePagination('requests', data.pagination);
        }
    } catch (error) {
        console.error('Pagination error:', error);
    }
}

async function loadDevicesPage(page) {
    const searchQuery = document.getElementById('devicesSearchInput')?.value || '';
    const params = new URLSearchParams();
    params.append('tab', 'devices');
    params.append('page', page);
    if (searchQuery) params.append('search', searchQuery);
    
    try {
        const response = await fetch(window.location.pathname + '?' + params.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('devicesTableBody').innerHTML = data.html;
            updatePagination('devices', data.pagination);
        }
    } catch (error) {
        console.error('Pagination error:', error);
    }
}

async function loadFormOptions() {
    try {
        const response = await fetch('/ticket/form-options/');
        const data = await response.json();
        
        const deviceTypeSelect = document.querySelector('select[name="device_type"]');
        if (deviceTypeSelect) {
            // Clear existing options except the first one (Select Device Type)
            const firstOption = deviceTypeSelect.querySelector('option[value=""]');
            deviceTypeSelect.innerHTML = '';
            if (firstOption) {
                deviceTypeSelect.appendChild(firstOption);
            } else {
                deviceTypeSelect.add(new Option('Select Device Type', ''));
            }
            
            data.device_types.forEach(type => {
                const option = new Option(type.name, type.id);
                deviceTypeSelect.add(option);
            });
        }
        
        const categorySelect = document.querySelector('select[name="category"]');
        if (categorySelect) {
            // Clear existing options except the first one
            const firstOption = categorySelect.querySelector('option[value=""]');
            categorySelect.innerHTML = '';
            if (firstOption) {
                categorySelect.appendChild(firstOption);
            } else {
                categorySelect.add(new Option('Select Category', ''));
            }
            
            data.categories.forEach(cat => {
                const option = new Option(cat.name, cat.id);
                categorySelect.add(option);
            });
        }
        
        const deviceSelect = document.querySelector('select[name="device"]');
        if (deviceSelect) {
            // Clear existing options except the first one
            const firstOption = deviceSelect.querySelector('option[value=""]');
            deviceSelect.innerHTML = '';
            if (firstOption) {
                deviceSelect.appendChild(firstOption);
            } else {
                deviceSelect.add(new Option('Select Device', ''));
            }
            
            data.devices.forEach(device => {
                const option = new Option(device.device_name, device.id);
                deviceSelect.add(option);
            });
        }
    } catch (error) {
        console.error('Error loading form options:', error);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Remove .show after animation, keep modal visible for zoom out
        modal.classList.add('closing');
        document.body.classList.remove('modal-open');

        setTimeout(() => {
            modal.classList.remove('show');
            modal.classList.remove('closing');
        }, 200);

        if (modalId === 'viewTicketModal' || modalId === 'viewDeviceModal') {
            isEditMode = false;
        }
    }
}

function openAddDeviceModal() {
    document.getElementById('addDeviceForm').reset();
    openModal('addDeviceModal');
}

function openRequestTicketModal() {
    document.getElementById('requestTicketForm').reset();
    loadFormOptions();
    openModal('requestTicketModal');
}

async function submitAddDevice() {
    const form = document.getElementById('addDeviceForm');
    const deviceName = form.elements['device_name'].value.trim();
    const deviceCode = form.elements['device_code'].value.trim();
    const deviceLocation = form.elements['device_location'].value.trim();
    const deviceType = form.elements['device_type'].value.trim();

    if (!deviceName || !deviceCode || !deviceLocation || !deviceType) {
        showToast('Please complete all required fields before submitting.', 'error');
        return;
    }

    const formData = new FormData(form);
    try {
        const response = await fetch('/ticket/device/add/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal('addDeviceModal');
            form.reset();
            // Stay on devices tab and refresh the devices table
            switchToTab('devices');
            performSearch('devices', '');
        } else {
            // If backend still returns field errors, show a generic message
            showToast('Please complete all required fields before submitting.', 'error');
        }
    } catch (error) {
        console.error('Add device error:', error);
        showToast('An error occurred while adding device', 'error');
    }
}

async function submitRequestTicket() {
    const form = document.getElementById('requestTicketForm');
    const device = form.elements['device'].value.trim();
    const priority = form.elements['priority_level'].value.trim();
    const category = form.elements['category'].value.trim();
    const problem = form.elements['problem_details'].value.trim();

    if (!device || !priority || !category || !problem) {
        showToast('Please complete all required fields before submitting.', 'error');
        return;
    }

    const formData = new FormData(form);
    try {
        const response = await fetch('/ticket/ticket/create/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.status === 'success') {
            showToast(`Ticket ${data.ticket_number} created successfully`, 'success');
            closeModal('requestTicketModal');
            // Stay on requests tab and refresh the requests table
            switchToTab('requests');
            performSearch('requests', '');
        } else {
            // If backend still returns field errors, show a generic message
            showToast('Please complete all required fields before submitting.', 'error');
        }
    } catch (error) {
        showToast('An error occurred', 'error');
    }
}

async function viewTicket(ticketId) {
    currentTicketId = ticketId;
    
    try {
        const response = await fetch(`/ticket/ticket/${ticketId}/details/`);
        const data = await response.json();
        
        // Populate static modal fields
        document.getElementById('detailTicketNumber').textContent = data.ticket_number;
        document.getElementById('detailTicketStatus').innerHTML = `<span class="status-pill status-${getStatusColor(data.status)}">${data.status}</span>`;
        document.getElementById('detailTicketRequestor').textContent = data.requestor_name;
        document.getElementById('detailTicketDevice').textContent = data.device || '-';
        document.getElementById('detailTicketPriority').innerHTML = `<span class="status-pill status-${getPriorityColor(data.priority_level)}">${data.priority_level}</span>`;
        document.getElementById('detailTicketCategory').textContent = data.category || '-';
        document.getElementById('detailTicketProblem').textContent = data.problem_details;
        
        // Format Created At
        document.getElementById('detailTicketCreatedAt').textContent = formatLongDate(data.created_at);
        
        // Populate edit fields
        document.getElementById('editProblemDetails').value = data.problem_details;
        
        // Show/hide review section
        const reviewSection = document.getElementById('reviewSection');
        if (data.status !== 'Processing' && data.technician_name) {
            document.getElementById('detailTechnician').textContent = data.technician_name;
            document.getElementById('detailDiagnosis').textContent = data.diagnosis || '-';
            document.getElementById('detailActionTaken').textContent = data.action_taken || '-';
            document.getElementById('detailPossibleReason').textContent = data.possible_reason || '-';
            document.getElementById('detailRecommendation').textContent = data.recommendation || '-';
            reviewSection.style.display = 'block';
        } else {
            reviewSection.style.display = 'none';
        }
        
        // Setup edit/save buttons visibility
        const editBtn = document.getElementById('editTicketBtn');
        const saveBtn = document.getElementById('saveTicketBtn');
        const printBtn = document.getElementById('printTicketBtn');
        
        if (data.can_edit) {
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
            await loadEditOptions();
            document.getElementById('editDevice').value = data.device_id || '';
            document.getElementById('editPriority').value = data.priority_level;
            document.getElementById('editCategory').value = data.category_id || '';
        } else {
            editBtn.style.display = 'none';
            saveBtn.style.display = 'none';
        }
        
        // Show Print Ticket button only for approved tickets
        if (data.status === 'Approved') {
            printBtn.style.display = 'inline-block';
        } else {
            printBtn.style.display = 'none';
        }
        
        // Reset edit mode and remove animation
        isEditMode = false;
        const modalBody = document.querySelector('#viewTicketModal .modal-body');
        modalBody.classList.remove('edit-mode', 'edit-animate');
        
        // Always show non-editable fields
        document.getElementById('detailTicketNumber').style.opacity = 1;
        document.getElementById('detailTicketStatus').style.opacity = 1;
        document.getElementById('detailTicketRequestor').style.opacity = 1;
        document.getElementById('detailTicketCreatedAt').style.opacity = 1;
        
        openModal('viewTicketModal');
    } catch (error) {
        showToast('Error loading ticket details', 'error');
    }
}

async function toggleEditTicket() {
    const modal = document.getElementById('viewTicketModal');
    const editBtn = document.getElementById('editTicketBtn');
    const saveBtn = document.getElementById('saveTicketBtn');
    const modalBody = modal.querySelector('.modal-body');
    
    if (!isEditMode) {
        modalBody.classList.add('edit-mode');
        // Add animation effect
        modalBody.classList.add('edit-animate');
        setTimeout(() => modalBody.classList.remove('edit-animate'), 400);
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        isEditMode = true;
    } else {
        modalBody.classList.remove('edit-mode');
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        isEditMode = false;
    }
    
    // Always show non-editable fields
    document.getElementById('detailTicketNumber').style.opacity = 1;
    document.getElementById('detailTicketStatus').style.opacity = 1;
    document.getElementById('detailTicketRequestor').style.opacity = 1;
    document.getElementById('detailTicketCreatedAt').style.opacity = 1;
}

async function saveTicketChanges() {
    const formData = new FormData();
    formData.append('device', document.getElementById('editDevice').value);
    formData.append('priority_level', document.getElementById('editPriority').value);
    formData.append('category', document.getElementById('editCategory').value);
    formData.append('problem_details', document.getElementById('editProblemDetails').value);
    
    try {
        const response = await fetch(`/ticket/ticket/${currentTicketId}/update/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal('viewTicketModal');
            // Stay on requests tab and refresh the table
            switchToTab('requests');
            performSearch('requests', '');
        } else {
            showToast('Error updating ticket', 'error');
        }
    } catch (error) {
        showToast('An error occurred', 'error');
    }
}

function confirmCancelTicket(ticketId) {
    currentTicketId = ticketId;
    document.getElementById('confirmTitle').textContent = 'Cancel Ticket';
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to cancel this ticket? This action cannot be undone.';
    document.getElementById('confirmButton').onclick = cancelTicket;
    openModal('confirmationModal');
}

async function cancelTicket() {
    try {
        const response = await fetch(`/ticket/ticket/${currentTicketId}/cancel/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal('confirmationModal');
            // Stay on requests tab and refresh the table
            switchToTab('requests');
            performSearch('requests', '');
        } else {
            showToast('Error cancelling ticket', 'error');
        }
    } catch (error) {
        showToast('An error occurred', 'error');
    }
}

async function viewDevice(deviceId) {
    currentDeviceId = deviceId;
    try {
        const response = await fetch(`/ticket/device/${deviceId}/details/`);
        const data = await response.json();
        // Populate static modal fields
        document.getElementById('detailDeviceName').textContent = data.device_name;
        document.getElementById('editDeviceName').value = data.device_name;
        document.getElementById('detailDeviceCode').textContent = data.device_code;
        document.getElementById('editDeviceCode').value = data.device_code;
        document.getElementById('detailDeviceType').textContent = data.device_type || '-';
        await loadDeviceTypeOptions();
        document.getElementById('editDeviceType').value = data.device_type_id || '';
        document.getElementById('detailDeviceLocation').textContent = data.device_location;
        document.getElementById('editDeviceLocation').value = data.device_location;
        document.getElementById('detailDeviceOwner').textContent = data.user;
        // Format Created At
        document.getElementById('detailDeviceCreatedAt').textContent = formatLongDate(data.created_at);
        // Setup edit/save buttons visibility
        const editBtn = document.getElementById('editDeviceBtn');
        const saveBtn = document.getElementById('saveDeviceBtn');
        if (data.can_edit) {
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
        } else {
            editBtn.style.display = 'none';
            saveBtn.style.display = 'none';
        }
        // Reset edit mode and remove animation
        isEditMode = false;
        const modalBody = document.querySelector('#viewDeviceModal .modal-body');
        modalBody.classList.remove('edit-mode', 'edit-animate');
        // Always show Owner and Created At
        document.getElementById('detailDeviceOwner').style.opacity = 1;
        document.getElementById('detailDeviceCreatedAt').style.opacity = 1;
        openModal('viewDeviceModal');
    } catch (error) {
        showToast('Error loading device details', 'error');
    }
}

function formatLongDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const options = { year: 'numeric', month: 'long', day: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

async function toggleEditDevice() {
    const modal = document.getElementById('viewDeviceModal');
    const editBtn = document.getElementById('editDeviceBtn');
    const saveBtn = document.getElementById('saveDeviceBtn');
    const modalBody = modal.querySelector('.modal-body');
    if (!isEditMode) {
        modalBody.classList.add('edit-mode');
        // Add animation effect
        modalBody.classList.add('edit-animate');
        setTimeout(() => modalBody.classList.remove('edit-animate'), 400);
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        isEditMode = true;
    } else {
        modalBody.classList.remove('edit-mode');
        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        isEditMode = false;
    }
    // Always show Owner and Created At
    document.getElementById('detailDeviceOwner').style.opacity = 1;
    document.getElementById('detailDeviceCreatedAt').style.opacity = 1;
}

async function saveDeviceChanges() {
    const formData = new FormData();
    formData.append('device_name', document.getElementById('editDeviceName').value);
    formData.append('device_code', document.getElementById('editDeviceCode').value);
    formData.append('device_type', document.getElementById('editDeviceType').value);
    formData.append('device_location', document.getElementById('editDeviceLocation').value);
    
    try {
        const response = await fetch(`/ticket/device/${currentDeviceId}/update/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal('viewDeviceModal');
            // Stay on devices tab and refresh the table
            switchToTab('devices');
            performSearch('devices', '');
        } else {
            showToast('Error updating device', 'error');
        }
    } catch (error) {
        showToast('An error occurred', 'error');
    }
}

function confirmDeleteDevice(deviceId) {
    currentDeviceId = deviceId;
    document.getElementById('confirmTitle').textContent = 'Delete Device';
    document.getElementById('confirmMessage').textContent = 'Are you sure you want to delete this device? This action cannot be undone.';
    document.getElementById('confirmButton').onclick = deleteDevice;
    openModal('confirmationModal');
}

async function deleteDevice() {
    try {
        const response = await fetch(`/ticket/device/${currentDeviceId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal('confirmationModal');
            // Stay on devices tab and refresh the table
            switchToTab('devices');
            performSearch('devices', '');
        } else {
            showToast('Error deleting device', 'error');
        }
    } catch (error) {
        showToast('An error occurred', 'error');
    }
}

async function loadEditOptions() {
    try {
        const response = await fetch('/ticket/form-options/');
        const data = await response.json();
        
        const deviceSelect = document.getElementById('editDevice');
        if (deviceSelect) {
            deviceSelect.innerHTML = '<option value="">Select Device</option>';
            data.devices.forEach(device => {
                const option = new Option(device.device_name, device.id);
                deviceSelect.add(option);
            });
        }
        
        const categorySelect = document.getElementById('editCategory');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            data.categories.forEach(cat => {
                const option = new Option(cat.name, cat.id);
                categorySelect.add(option);
            });
        }
    } catch (error) {
        console.error('Error loading edit options:', error);
    }
}

async function loadDeviceTypeOptions() {
    try {
        const response = await fetch('/ticket/form-options/');
        const data = await response.json();
        
        const deviceTypeSelect = document.getElementById('editDeviceType');
        if (deviceTypeSelect) {
            deviceTypeSelect.innerHTML = '<option value="">Select Device Type</option>';
            data.device_types.forEach(type => {
                const option = new Option(type.name, type.id);
                deviceTypeSelect.add(option);
            });
        }
    } catch (error) {
        console.error('Error loading device type options:', error);
    }
}

function getStatusColor(status) {
    const colors = {
        'Processing': 'yellow',
        'Approved': 'green',
        'Disapproved': 'red',
        'Cancelled': 'purple'
    };
    return colors[status] || 'blue';
}

function getPriorityColor(priority) {
    const colors = {
        'Low': 'green',
        'Medium': 'blue',
        'High': 'orange',
        'Urgent': 'red'
    };
    return colors[priority] || 'blue';
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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

function printTicket() {
    if (!currentTicketId) {
        showToast('No ticket selected for printing.', 'error');
        return;
    }
    
    try {
        // Create download link
        const url = `/ticket/ticket/${currentTicketId}/print/`;
        const link = document.createElement('a');
        link.href = url;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Ticket PDF generated successfully. Download will begin shortly.', 'success');
    } catch (error) {
        console.error('Print ticket error:', error);
        showToast('Failed to generate ticket PDF. Please try again.', 'error');
    }
}