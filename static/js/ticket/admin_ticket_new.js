let currentTicketId = null;
let currentDeviceId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
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
    const reviewTicketForm = document.getElementById('reviewTicketForm');
    
    if (reviewTicketForm) {
        reviewTicketForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitReviewTicket();
        });
    }
}

function setupSearchFunctionality() {
    // Tickets search
    const ticketsSearchInput = document.getElementById('ticketsSearchInput');
    const clearTicketsSearch = document.getElementById('clearTicketsSearch');
    
    if (ticketsSearchInput) {
        let searchTimeout;
        ticketsSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch('tickets', this.value);
            }, 300);
        });
    }
    
    if (clearTicketsSearch) {
        clearTicketsSearch.addEventListener('click', function(e) {
            e.preventDefault();
            ticketsSearchInput.value = '';
            performSearch('tickets', '');
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

async function performSearch(tab, query) {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('search', query);
        url.searchParams.set('tab', tab);
        url.searchParams.set('page', '1');
        
        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update table content
            const tableBody = document.getElementById(`${tab}TableBody`);
            if (tableBody) {
                tableBody.innerHTML = data.html;
            }
            
            // Update pagination
            updatePagination(tab, data.pagination);
            
            // Show/hide clear search button
            const searchInput = document.getElementById(`${tab}SearchInput`);
            const clearSearch = document.getElementById(`clear${tab.charAt(0).toUpperCase() + tab.slice(1)}Search`);
            if (clearSearch) {
                clearSearch.parentElement.style.display = query ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Search failed. Please try again.', 'error');
    }
}

function updatePagination(tab, pagination) {
    const startRecord = document.getElementById(`${tab}StartRecord`);
    const endRecord = document.getElementById(`${tab}EndRecord`);
    const totalRecords = document.getElementById(`${tab}TotalRecords`);
    const pageNumbers = document.getElementById(`${tab}PageNumbers`);
    const paginationControls = document.getElementById(`${tab}PaginationControls`);
    
    if (startRecord) startRecord.textContent = pagination.start_index;
    if (endRecord) endRecord.textContent = pagination.end_index;
    if (totalRecords) totalRecords.textContent = pagination.count;
    
    // Update page numbers
    if (pageNumbers) {
        let pageNumbersHTML = '';
        const currentPage = pagination.number;
        const totalPages = pagination.num_pages;
        
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            if (i === currentPage) {
                pageNumbersHTML += `<span class="pagination-btn active">${i}</span>`;
            } else {
                pageNumbersHTML += `<button class="pagination-btn" onclick="load${tab.charAt(0).toUpperCase() + tab.slice(1)}Page(${i})">${i}</button>`;
            }
        }
        pageNumbers.innerHTML = pageNumbersHTML;
    }
    
    // Update prev/next buttons
    if (paginationControls) {
        const prevBtn = paginationControls.querySelector('.pagination-btn:first-child');
        const nextBtn = paginationControls.querySelector('.pagination-btn:last-child');
        
        if (prevBtn) {
            if (pagination.has_previous) {
                prevBtn.outerHTML = `<button class="pagination-btn" onclick="load${tab.charAt(0).toUpperCase() + tab.slice(1)}Page(${pagination.number - 1})"><i class="fas fa-chevron-left"></i></button>`;
            } else {
                prevBtn.outerHTML = `<span class="pagination-btn disabled"><i class="fas fa-chevron-left"></i></span>`;
            }
        }
        
        if (nextBtn) {
            if (pagination.has_next) {
                nextBtn.outerHTML = `<button class="pagination-btn" onclick="load${tab.charAt(0).toUpperCase() + tab.slice(1)}Page(${pagination.number + 1})"><i class="fas fa-chevron-right"></i></button>`;
            } else {
                nextBtn.outerHTML = `<span class="pagination-btn disabled"><i class="fas fa-chevron-right"></i></span>`;
            }
        }
    }
}

async function loadTicketsPage(page) {
    const searchQuery = document.getElementById('ticketsSearchInput').value;
    await loadPage('tickets', page, searchQuery);
}

async function loadDevicesPage(page) {
    const searchQuery = document.getElementById('devicesSearchInput').value;
    await loadPage('devices', page, searchQuery);
}

async function loadPage(tab, page, searchQuery = '') {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('search', searchQuery);
        url.searchParams.set('tab', tab);
        url.searchParams.set('page', page);
        
        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update table content
            const tableBody = document.getElementById(`${tab}TableBody`);
            if (tableBody) {
                tableBody.innerHTML = data.html;
            }
            
            // Update pagination
            updatePagination(tab, data.pagination);
        }
    } catch (error) {
        console.error('Pagination error:', error);
        showToast('Failed to load page. Please try again.', 'error');
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
        modal.classList.add('closing');
        document.body.classList.remove('modal-open');
        
        setTimeout(() => {
            modal.classList.remove('show');
            modal.classList.remove('closing');
        }, 200);
    }
}

async function reviewTicket(ticketId) {
    currentTicketId = ticketId;
    document.getElementById('reviewTicketId').value = ticketId;
    
    try {
        const response = await fetch(`/ticket/ticket/${ticketId}/details/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const ticketInfo = `
            <h4>Ticket Information</h4>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Ticket Number</span>
                    <span class="info-value">${data.ticket_number}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Requestor</span>
                    <span class="info-value">${data.requestor_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Device</span>
                    <span class="info-value">${data.device || '-'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Priority</span>
                    <span class="info-value">
                        <span class="status-pill status-${getPriorityColor(data.priority_level)}">${data.priority_level}</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Category</span>
                    <span class="info-value">${data.category || '-'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Problem Details</span>
                    <span class="info-value">${data.problem_details}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Created</span>
                    <span class="info-value">${formatDate(data.created_at)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('ticketInfoSection').innerHTML = ticketInfo;
        openModal('reviewTicketModal');
    } catch (error) {
        console.error('Review ticket error:', error);
        showToast('Failed to load ticket details. Please try again.', 'error');
    }
}

async function viewTicket(ticketId) {
    try {
        const response = await fetch(`/ticket/ticket/${ticketId}/details/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        let ticketContent = `
            <div class="ticket-details-grid">
                <div class="detail-group">
                    <span class="detail-label">Ticket Number</span>
                    <span class="detail-value">${data.ticket_number}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                        <span class="status-pill status-${getStatusColor(data.status)}">${data.status}</span>
                    </span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Requestor</span>
                    <span class="detail-value">${data.requestor_name}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Device</span>
                    <span class="detail-value">${data.device || '-'}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Priority Level</span>
                    <span class="detail-value">
                        <span class="status-pill status-${getPriorityColor(data.priority_level)}">${data.priority_level}</span>
                    </span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Category</span>
                    <span class="detail-value">${data.category || '-'}</span>
                </div>
                <div class="detail-group" style="grid-column: span 2;">
                    <span class="detail-label">Problem Details</span>
                    <span class="detail-value">${data.problem_details}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Created At</span>
                    <span class="detail-value">${formatDate(data.created_at)}</span>
                </div>
            </div>
        `;
        
        // Add review information if available
        if (data.status !== 'Processing' && data.technician_name) {
            ticketContent += `
                <div class="review-section">
                    <h4>Review Information</h4>
                    <div class="ticket-details-grid">
                        <div class="detail-group">
                            <span class="detail-label">Technician</span>
                            <span class="detail-value">${data.technician_name || '-'}</span>
                        </div>
                        <div class="detail-group">
                            <span class="detail-label">Diagnosis</span>
                            <span class="detail-value">${data.diagnosis || '-'}</span>
                        </div>
                        <div class="detail-group">
                            <span class="detail-label">Action Taken</span>
                            <span class="detail-value">${data.action_taken || '-'}</span>
                        </div>
                        <div class="detail-group">
                            <span class="detail-label">Possible Reason</span>
                            <span class="detail-value">${data.possible_reason || '-'}</span>
                        </div>
                        <div class="detail-group" style="grid-column: span 2;">
                            <span class="detail-label">Recommendation</span>
                            <span class="detail-value">${data.recommendation || '-'}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('ticketDetailsContent').innerHTML = ticketContent;
        openModal('viewTicketModal');
    } catch (error) {
        console.error('View ticket error:', error);
        showToast('Failed to load ticket details. Please try again.', 'error');
    }
}

async function viewDevice(deviceId) {
    try {
        const response = await fetch(`/ticket/device/${deviceId}/details/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const deviceContent = `
            <div class="employee-info-grid">
                <div class="detail-group">
                    <span class="detail-label">Device Name</span>
                    <span class="detail-value">${data.device_name}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Device Code</span>
                    <span class="detail-value">${data.device_code}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Device Type</span>
                    <span class="detail-value">${data.device_type || '-'}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${data.device_location}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Owner</span>
                    <span class="detail-value">${data.owner || '-'}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                        <span class="status-pill status-${data.is_active ? 'green' : 'red'}">
                            ${data.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Created At</span>
                    <span class="detail-value">${formatDate(data.created_at)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('deviceDetailsContent').innerHTML = deviceContent;
        openModal('viewDeviceModal');
    } catch (error) {
        console.error('View device error:', error);
        showToast('Failed to load device details. Please try again.', 'error');
    }
}

async function submitReviewTicket() {
    const form = document.getElementById('reviewTicketForm');
    const formData = new FormData(form);
    
    // Validate required fields
    const status = formData.get('status');
    const diagnosis = formData.get('diagnosis');
    const actionTaken = formData.get('action_taken');
    const possibleReason = formData.get('possible_reason');
    
    if (!status || !diagnosis || !actionTaken || !possibleReason) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/ticket/ticket/${currentTicketId}/review/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            closeModal('reviewTicketModal');
            // Refresh the current tab
            const activeTab = document.querySelector('.tab.active').dataset.tab;
            if (activeTab === 'tickets') {
                const searchQuery = document.getElementById('ticketsSearchInput').value;
                performSearch('tickets', searchQuery);
            }
        } else {
            showToast('Error reviewing ticket: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Review ticket error:', error);
        showToast('An error occurred while reviewing the ticket', 'error');
    }
}

// Helper functions
function getPriorityColor(priority) {
    switch (priority) {
        case 'Urgent': return 'red';
        case 'High': return 'yellow';
        case 'Medium': return 'blue';
        case 'Low': return 'green';
        default: return 'gray';
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'Approved': return 'green';
        case 'Disapproved': return 'red';
        case 'Cancelled': return 'purple';
        case 'Processing': return 'yellow';
        default: return 'gray';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}
