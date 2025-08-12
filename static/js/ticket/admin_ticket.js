let currentTicketId = null;
let currentDeviceId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    setupEventListeners();
});

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
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
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        setTimeout(() => {
            modal.classList.remove('closing');
        }, 200);
    }
}

async function viewTicket(ticketId) {
    currentTicketId = ticketId;
    
    try {
        const response = await fetch(`/mis-ticketing/ticket/${ticketId}/details/`);
        const data = await response.json();
        
        let content = `
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
                    <span class="detail-value">${data.created_at}</span>
                </div>
            </div>
        `;
        
        if (data.status !== 'Processing' && data.technician_name) {
            content += `
                <div class="review-section">
                    <h4>Review Information</h4>
                    <div class="ticket-details-grid">
                        <div class="detail-group">
                            <span class="detail-label">Technician</span>
                            <span class="detail-value">${data.technician_name}</span>
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
        
        document.getElementById('ticketDetailsContent').innerHTML = content;
        openModal('viewTicketModal');
    } catch (error) {
        showToast('Error loading ticket details', 'error');
    }
}

async function reviewTicket(ticketId) {
    currentTicketId = ticketId;
    document.getElementById('reviewTicketId').value = ticketId;
    
    try {
        const response = await fetch(`/mis-ticketing/ticket/${ticketId}/details/`);
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
                    <span class="info-label">Created At</span>
                    <span class="info-value">${data.created_at}</span>
                </div>
                <div class="info-item" style="grid-column: span 2;">
                    <span class="info-label">Problem Details</span>
                    <span class="info-value">${data.problem_details}</span>
                </div>
            </div>
        `;
        
        document.getElementById('ticketInfoSection').innerHTML = ticketInfo;
        document.getElementById('reviewTicketForm').reset();
        openModal('reviewTicketModal');
    } catch (error) {
        showToast('Error loading ticket for review', 'error');
    }
}

async function submitReviewTicket() {
    const form = document.getElementById('reviewTicketForm');
    const formData = new FormData(form);
    
    const requiredFields = ['status', 'diagnosis', 'action_taken', 'possible_reason'];
    let isValid = true;
    
    for (const field of requiredFields) {
        const value = formData.get(field);
        if (!value || value.trim() === '') {
            isValid = false;
            const element = form.querySelector(`[name="${field}"]`);
            if (element) {
                element.classList.add('error');
                setTimeout(() => element.classList.remove('error'), 3000);
            }
        }
    }
    
    if (!isValid) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/mis-ticketing/ticket/${currentTicketId}/review/`, {
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
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast('Error reviewing ticket', 'error');
        }
    } catch (error) {
        showToast('An error occurred while reviewing the ticket', 'error');
    }
}

async function viewDevice(deviceId) {
    currentDeviceId = deviceId;
    
    try {
        const response = await fetch(`/mis-ticketing/device/${deviceId}/details/`);
        const data = await response.json();
        
        const content = `
            <div class="device-details-grid">
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
                    <span class="detail-value">${data.user}</span>
                </div>
                <div class="detail-group">
                    <span class="detail-label">Created At</span>
                    <span class="detail-value">${data.created_at}</span>
                </div>
            </div>
        `;
        
        document.getElementById('deviceDetailsContent').innerHTML = content;
        openModal('viewDeviceModal');
    } catch (error) {
        showToast('Error loading device details', 'error');
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
        'High': 'yellow',
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