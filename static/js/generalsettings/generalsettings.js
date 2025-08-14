// General Settings JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    // Add event listeners for all settings sections
    setupLineSettings();
    setupDepartmentSettings();
    setupPositionSettings();
    
    // Add finance settings
    setupFinanceSettings();
    
    // Add modal overlay event listener
    const modalOverlay = document.querySelector('#departmentLinesModal .modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeDepartmentLinesModal);
    }
    
    // Add tab switching functionality
    setupTabSwitching();
}

// Line Settings
function setupLineSettings() {
    const addBtn = document.getElementById('addLineBtn');
    const fieldsContainer = document.getElementById('lineFields');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addLineField();
        });
    }
    
    // Load existing lines
    loadExistingLines();
}

function addLineField(lineData = null) {
    const fieldsContainer = document.getElementById('lineFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const lineId = lineData ? lineData.id : '';
    const lineName = lineData ? lineData.name : '';
    
    fieldDiv.innerHTML = `
        <div class="input-with-icon">
            <i class="fas fa-industry"></i>
            <input type="text" 
                   placeholder="Enter line name..." 
                   value="${lineName}"
                   data-id="${lineId}"
                   data-original="${lineName}"
                   oninput="handleFieldChange(this)">
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateLine(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteLine(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    // Focus on the input if it's a new field
    if (!lineData) {
        fieldDiv.querySelector('input').focus();
    }
}

function loadExistingLines() {
    fetch('/general-settings/api/lines/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('lineFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            // Always ensure minimum 3 fields
            const lines = data.lines || [];
            const minFields = 3;
            
            // Add existing lines
            lines.forEach(line => {
                addLineField(line);
            });
            
            // Add empty fields to reach minimum
            while (fieldsContainer.children.length < minFields) {
                addLineField();
            }
        })
        .catch(error => {
            console.error('Error loading lines:', error);
            // Add minimum 3 empty fields on error
            const fieldsContainer = document.getElementById('lineFields');
            if (fieldsContainer) {
                fieldsContainer.innerHTML = '';
                for (let i = 0; i < 3; i++) {
                    addLineField();
                }
            }
            showToast('Error loading lines', 'error');
        });
}

function updateLine(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('input');
    const lineId = input.dataset.id;
    const newName = input.value.trim();
    
    if (!newName) {
        showToast('Line name cannot be empty', 'error');
        return;
    }
    
    field.classList.add('field-loading');
    
    const url = lineId ? `/general-settings/api/lines/${lineId}/` : '/general-settings/api/lines/';
    const method = lineId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ name: newName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            input.dataset.id = data.line.id;
            input.dataset.original = newName;
            field.classList.remove('changed', 'field-loading');
            showToast(lineId ? 'Line updated successfully' : 'Line created successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to save line');
        }
    })
    .catch(error => {
        field.classList.remove('field-loading');
        showToast(error.message, 'error');
    });
}

function deleteLine(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('input');
    const lineId = input.dataset.id;
    const lineName = input.value;
    const fieldsContainer = document.getElementById('lineFields');
    
    // If empty field and more than 3 fields, just remove it
    if (!lineId && !lineName.trim() && fieldsContainer.children.length > 3) {
        field.remove();
        return;
    }
    
    // If empty field and only 3 fields, just clear it
    if (!lineId && !lineName.trim() && fieldsContainer.children.length <= 3) {
        input.value = '';
        input.dataset.original = '';
        field.classList.remove('changed');
        return;
    }
    
    // Show confirmation modal for deletion
    const itemName = lineName || 'this line';
    openDeleteModal(itemName, 'line', () => {
        // Check if we can delete (minimum 3 fields required)
        if (fieldsContainer.children.length <= 3) {
            // If it's a saved record, delete from server but keep the field empty
            if (lineId) {
                field.classList.add('field-loading');
                
                fetch(`/general-settings/api/lines/${lineId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCsrfToken()
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the field but don't remove it
                        input.value = '';
                        input.dataset.id = '';
                        input.dataset.original = '';
                        field.classList.remove('changed', 'field-loading');
                        showToast('Line deleted successfully', 'success');
                    } else {
                        throw new Error(data.error || 'Failed to delete line');
                    }
                })
                .catch(error => {
                    field.classList.remove('field-loading');
                    showToast(error.message, 'error');
                });
            } else {
                // Just clear the field for unsaved entries
                input.value = '';
                input.dataset.original = '';
                field.classList.remove('changed');
                showToast('Field cleared', 'info');
            }
            return;
        }
        
        // If more than 3 fields, we can remove the field entirely
        if (lineId) {
            field.classList.add('field-loading');
            
            fetch(`/general-settings/api/lines/${lineId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    field.remove();
                    showToast('Line deleted successfully', 'success');
                } else {
                    throw new Error(data.error || 'Failed to delete line');
                }
            })
            .catch(error => {
                field.classList.remove('field-loading');
                showToast(error.message, 'error');
            });
        } else {
            field.remove();
            showToast('Field removed', 'info');
        }
    });
}

// Department Settings
function setupDepartmentSettings() {
    const addBtn = document.getElementById('addDepartmentBtn');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addDepartmentField();
        });
    }
    
    loadExistingDepartments();
}

function addDepartmentField(departmentData = null) {
    const fieldsContainer = document.getElementById('departmentFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const deptId = departmentData ? departmentData.id : '';
    const deptName = departmentData ? departmentData.name : '';
    
    fieldDiv.innerHTML = `
        <div class="input-with-icon">
            <i class="fas fa-building"></i>
            <input type="text" 
                   placeholder="Enter department name..." 
                   value="${deptName}"
                   data-id="${deptId}"
                   data-original="${deptName}"
                   oninput="handleFieldChange(this)">
        </div>
        <button type="button" class="btn-department-lines" onclick="openDepartmentLinesModal(this)" title="Manage Lines">
            <i class="fas fa-list"></i>
        </button>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateDepartment(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteDepartment(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!departmentData) {
        fieldDiv.querySelector('input').focus();
    }
}

function loadExistingDepartments() {
    fetch('/general-settings/api/departments/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('departmentFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            // Always ensure minimum 3 fields
            const departments = data.departments || [];
            const minFields = 3;
            
            // Add existing departments
            departments.forEach(dept => {
                addDepartmentField(dept);
            });
            
            // Add empty fields to reach minimum
            while (fieldsContainer.children.length < minFields) {
                addDepartmentField();
            }
        })
        .catch(error => {
            console.error('Error loading departments:', error);
            // Add minimum 3 empty fields on error
            const fieldsContainer = document.getElementById('departmentFields');
            if (fieldsContainer) {
                fieldsContainer.innerHTML = '';
                for (let i = 0; i < 3; i++) {
                    addDepartmentField();
                }
            }
            showToast('Error loading departments', 'error');
        });
}

function updateDepartment(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('input');
    const deptId = input.dataset.id;
    const newName = input.value.trim();
    
    if (!newName) {
        showToast('Department name cannot be empty', 'error');
        return;
    }
    
    field.classList.add('field-loading');
    
    const url = deptId ? `/general-settings/api/departments/${deptId}/` : '/general-settings/api/departments/';
    const method = deptId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ name: newName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            input.dataset.id = data.department.id;
            input.dataset.original = newName;
            field.classList.remove('changed', 'field-loading');
            showToast(deptId ? 'Department updated successfully' : 'Department created successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to save department');
        }
    })
    .catch(error => {
        field.classList.remove('field-loading');
        showToast(error.message, 'error');
    });
}

function deleteDepartment(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('input');
    const deptId = input.dataset.id;
    const deptName = input.value;
    const fieldsContainer = document.getElementById('departmentFields');
    
    // If empty field and more than 3 fields, just remove it
    if (!deptId && !deptName.trim() && fieldsContainer.children.length > 3) {
        field.remove();
        return;
    }
    
    // If empty field and only 3 fields, just clear it
    if (!deptId && !deptName.trim() && fieldsContainer.children.length <= 3) {
        input.value = '';
        input.dataset.original = '';
        field.classList.remove('changed');
        return;
    }
    
    // Show confirmation modal for deletion
    const itemName = deptName || 'this department';
    openDeleteModal(itemName, 'department', () => {
        // Check if we can delete (minimum 3 fields required)
        if (fieldsContainer.children.length <= 3) {
            // If it's a saved record, delete from server but keep the field empty
            if (deptId) {
                field.classList.add('field-loading');
                
                fetch(`/general-settings/api/departments/${deptId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCsrfToken()
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the field but don't remove it
                        input.value = '';
                        input.dataset.id = '';
                        input.dataset.original = '';
                        field.classList.remove('changed', 'field-loading');
                        showToast('Department deleted successfully', 'success');
                    } else {
                        throw new Error(data.error || 'Failed to delete department');
                    }
                })
                .catch(error => {
                    field.classList.remove('field-loading');
                    showToast(error.message, 'error');
                });
            } else {
                // Just clear the field for unsaved entries
                input.value = '';
                input.dataset.original = '';
                field.classList.remove('changed');
                showToast('Field cleared', 'info');
            }
            return;
        }
        
        // If more than 3 fields, we can remove the field entirely
        if (deptId) {
            field.classList.add('field-loading');
            
            fetch(`/general-settings/api/departments/${deptId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    field.remove();
                    showToast('Department deleted successfully', 'success');
                } else {
                    throw new Error(data.error || 'Failed to delete department');
                }
            })
            .catch(error => {
                field.classList.remove('field-loading');
                showToast(error.message, 'error');
            });
        } else {
            field.remove();
            showToast('Field removed', 'info');
        }
    });
}

// Position Settings
function setupPositionSettings() {
    const addBtn = document.getElementById('addPositionBtn');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addPositionField();
        });
    }
    
    loadExistingPositions();
}

function addPositionField(positionData = null) {
    const fieldsContainer = document.getElementById('positionFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const posId = positionData ? positionData.id : '';
    const posName = positionData ? positionData.name : '';
    const posLevel = positionData ? positionData.level : '1';
    
    fieldDiv.innerHTML = `
        <div class="input-with-icon">
            <i class="fas fa-user-tie"></i>
            <input type="text" 
                   placeholder="Enter position name..." 
                   value="${posName}"
                   data-id="${posId}"
                   data-original="${posName}"
                   oninput="handleFieldChange(this)">
        </div>
        <select data-original="${posLevel}" onchange="handleFieldChange(this)">
            <option value="1" ${posLevel == '1' ? 'selected' : ''}>Level 1</option>
            <option value="2" ${posLevel == '2' ? 'selected' : ''}>Level 2</option>
            <option value="3" ${posLevel == '3' ? 'selected' : ''}>Level 3</option>
        </select>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updatePosition(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deletePosition(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!positionData) {
        fieldDiv.querySelector('input').focus();
    }
}

function loadExistingPositions() {
    fetch('/general-settings/api/positions/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('positionFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            // Always ensure minimum 3 fields
            const positions = data.positions || [];
            const minFields = 3;
            
            // Add existing positions
            positions.forEach(pos => {
                addPositionField(pos);
            });
            
            // Add empty fields to reach minimum
            while (fieldsContainer.children.length < minFields) {
                addPositionField();
            }
        })
        .catch(error => {
            console.error('Error loading positions:', error);
            // Add minimum 3 empty fields on error
            const fieldsContainer = document.getElementById('positionFields');
            if (fieldsContainer) {
                fieldsContainer.innerHTML = '';
                for (let i = 0; i < 3; i++) {
                    addPositionField();
                }
            }
            showToast('Error loading positions', 'error');
        });
}

function updatePosition(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('input');
    const select = field.querySelector('select');
    const posId = input.dataset.id;
    const newName = input.value.trim();
    const newLevel = select.value;
    
    if (!newName) {
        showToast('Position name cannot be empty', 'error');
        return;
    }
    
    field.classList.add('field-loading');
    
    const url = posId ? `/general-settings/api/positions/${posId}/` : '/general-settings/api/positions/';
    const method = posId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ 
            name: newName,
            level: newLevel
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            input.dataset.id = data.position.id;
            input.dataset.original = newName;
            select.dataset.original = newLevel;
            field.classList.remove('changed', 'field-loading');
            showToast(posId ? 'Position updated successfully' : 'Position created successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to save position');
        }
    })
    .catch(error => {
        field.classList.remove('field-loading');
        showToast(error.message, 'error');
    });
}

function deletePosition(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('input');
    const posId = input.dataset.id;
    const posName = input.value;
    const fieldsContainer = document.getElementById('positionFields');
    
    // If empty field and more than 3 fields, just remove it
    if (!posId && !posName.trim() && fieldsContainer.children.length > 3) {
        field.remove();
        return;
    }
    
    // If empty field and only 3 fields, just clear it
    if (!posId && !posName.trim() && fieldsContainer.children.length <= 3) {
        input.value = '';
        input.dataset.original = '';
        const select = field.querySelector('select');
        if (select) {
            select.value = '1';
            select.dataset.original = '1';
        }
        field.classList.remove('changed');
        return;
    }
    
    // Show confirmation modal for deletion
    const itemName = posName || 'this position';
    openDeleteModal(itemName, 'position', () => {
        // Check if we can delete (minimum 3 fields required)
        if (fieldsContainer.children.length <= 3) {
            // If it's a saved record, delete from server but keep the field empty
            if (posId) {
                field.classList.add('field-loading');
                
                fetch(`/general-settings/api/positions/${posId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCsrfToken()
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the field but don't remove it
                        input.value = '';
                        input.dataset.id = '';
                        input.dataset.original = '';
                        const select = field.querySelector('select');
                        if (select) {
                            select.value = '1';
                            select.dataset.original = '1';
                        }
                        field.classList.remove('changed', 'field-loading');
                        showToast('Position deleted successfully', 'success');
                    } else {
                        throw new Error(data.error || 'Failed to delete position');
                    }
                })
                .catch(error => {
                    field.classList.remove('field-loading');
                    showToast(error.message, 'error');
                });
            } else {
                // Just clear the field for unsaved entries
                input.value = '';
                input.dataset.original = '';
                const select = field.querySelector('select');
                if (select) {
                    select.value = '1';
                    select.dataset.original = '1';
                }
                field.classList.remove('changed');
                showToast('Field cleared', 'info');
            }
            return;
        }
        
        // If more than 3 fields, we can remove the field entirely
        if (posId) {
            field.classList.add('field-loading');
            
            fetch(`/general-settings/api/positions/${posId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    field.remove();
                    showToast('Position deleted successfully', 'success');
                } else {
                    throw new Error(data.error || 'Failed to delete position');
                }
            })
            .catch(error => {
                field.classList.remove('field-loading');
                showToast(error.message, 'error');
            });
        } else {
            field.remove();
            showToast('Field removed', 'info');
        }
    });
}

// Utility Functions
function handleFieldChange(element) {
    const field = element.closest('.invite-field');
    const inputs = field.querySelectorAll('input, select');
    let hasChanges = false;
    
    inputs.forEach(input => {
        if (input.value !== input.dataset.original) {
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        field.classList.add('changed');
    } else {
        field.classList.remove('changed');
    }
}

function showEmptyState(container, type, message) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h4>${message}</h4>
            <p>Click the "Add ${type.slice(0, -1)}" button to get started.</p>
        </div>
    `;
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            icon = 'fas fa-info-circle';
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="${icon} toast-icon"></i>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

function getCsrfToken() {
    const tokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    if (tokenElement) {
        return tokenElement.value;
    }
    
    // Fallback: try to get from cookie
    const name = 'csrftoken';
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

// Utility Functions
function resetFieldState(fieldDiv) {
    // Remove any highlight or modified state classes
    fieldDiv.classList.remove('modified');
    
    // Reset buttons state if needed
    const updateBtn = fieldDiv.querySelector('.btn-update');
    const deleteBtn = fieldDiv.querySelector('.btn-delete');
    
    if (updateBtn) updateBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
}

function ensureMinimumFields(containerID, minCount, addFieldFunction) {
    const container = document.getElementById(containerID);
    if (!container) return;
    
    while (container.children.length < minCount) {
        addFieldFunction();
    }
}

// Modal Functions
let deleteCallback = null;

function openDeleteModal(itemName, itemType, callback) {
    const modal = document.getElementById('deleteConfirmModal');
    const nameElement = document.getElementById('deleteItemName');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    nameElement.textContent = `"${itemName}"?`;
    deleteCallback = callback;
    
    confirmBtn.onclick = function() {
        if (deleteCallback) {
            deleteCallback();
        }
        closeDeleteModal();
    };
    
    modal.classList.add('show');
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('show');
    deleteCallback = null;
}

// Updated Toast Function - using style.css design
function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Department Lines Modal Functions
let currentDepartmentId = null;
let currentDepartmentName = '';

function openDepartmentLinesModal(button) {
    const field = button.closest('.invite-field');
    const input = field.querySelector('.input-with-icon input'); // Updated selector
    const deptId = input.dataset.id;
    const deptName = input.value.trim();
    
    console.log('Department ID:', deptId, 'Name:', deptName); // Debug log
    
    if (!deptName) {
        showToast('Please enter a department name first', 'error');
        return;
    }
    
    if (!deptId) {
        showToast('Please save the department first before managing lines', 'error');
        return;
    }
    
    currentDepartmentId = deptId;
    currentDepartmentName = deptName;
    
    // Show modal using the style.css modal system
    const modal = document.getElementById('departmentLinesModal');
    console.log('Modal element:', modal); // Debug log
    
    if (!modal) {
        console.error('Department Lines Modal not found');
        showToast('Modal not found. Please refresh the page.', 'error');
        return;
    }
    
    const modalTitle = modal.querySelector('#departmentLinesTitle');
    if (modalTitle) {
        modalTitle.textContent = `Lines in ${deptName}`;
    }
    
    // Use the style.css modal system
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Load department lines and available lines
    loadDepartmentLines(deptId);
    loadAvailableLines();
}

function closeDepartmentLinesModal() {
    const modal = document.getElementById('departmentLinesModal');
    modal.classList.remove('show');
    // Use setTimeout to hide after transition completes
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    currentDepartmentId = null;
    currentDepartmentName = '';
}

function loadDepartmentLines(departmentId) {
    const container = document.getElementById('departmentLinesList');
    container.innerHTML = '<div class="loading">Loading lines...</div>';
    
    fetch(`/general-settings/api/departments/${departmentId}/lines/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayDepartmentLines(data.lines);
            } else {
                throw new Error(data.error || 'Failed to load department lines');
            }
        })
        .catch(error => {
            container.innerHTML = '<div class="error">Error loading lines</div>';
            showToast(error.message, 'error');
        });
}

function displayDepartmentLines(lines) {
    const container = document.getElementById('departmentLinesList');
    
    if (lines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-industry"></i>
                <h4>No lines found</h4>
                <p>This department doesn't have any lines yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = lines.map(line => `
        <div class="department-line-item" data-line-id="${line.id}">
            <div class="line-info">
                <i class="fas fa-industry"></i>
                <span class="line-name">${line.name}</span>
            </div>
            <button type="button" class="btn-remove-line" onclick="removeDepartmentLine(${line.id})" title="Remove from department">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function addLineToDepartment() {
    const select = document.getElementById('availableLinesSelect');
    const lineId = select.value;
    
    if (!lineId) {
        showToast('Please select a line to add', 'error');
        return;
    }
    
    fetch(`/general-settings/api/departments/${currentDepartmentId}/lines/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ line_id: lineId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Line added to department successfully', 'success');
            loadDepartmentLines(currentDepartmentId);
            loadAvailableLines(); // Refresh available lines
        } else {
            throw new Error(data.error || 'Failed to add line to department');
        }
    })
    .catch(error => {
        showToast(error.message, 'error');
    });
}

function removeDepartmentLine(lineId) {
    fetch(`/general-settings/api/departments/${currentDepartmentId}/lines/${lineId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Line removed from department successfully', 'success');
            loadDepartmentLines(currentDepartmentId);
            loadAvailableLines(); // Refresh available lines
        } else {
            throw new Error(data.error || 'Failed to remove line from department');
        }
    })
    .catch(error => {
        showToast(error.message, 'error');
    });
}

function loadAvailableLines() {
    const select = document.getElementById('availableLinesSelect');
    
    fetch('/general-settings/api/lines/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Get lines that are not already in this department
                fetch(`/general-settings/api/departments/${currentDepartmentId}/lines/`)
                    .then(response => response.json())
                    .then(deptData => {
                        if (deptData.success) {
                            const assignedLineIds = deptData.lines.map(line => line.id);
                            const availableLines = data.lines.filter(line => !assignedLineIds.includes(line.id));
                            
                            select.innerHTML = '<option value="">Select a line to add...</option>' +
                                availableLines.map(line => `<option value="${line.id}">${line.name}</option>`).join('');
                        }
                    });
            }
        })
        .catch(error => {
            showToast('Error loading available lines', 'error');
        });
}

// Tab Switching Functionality
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
                
                // Initialize the corresponding settings when tab is activated
                if (targetTab === 'finance') {
                    initializeFinanceSettings();
                }
            }
        });
    });
}

// Finance Settings
function setupFinanceSettings() {
    setupLoanTypeSettings();
    setupAllowanceTypeSettings(); 
    setupOJTRateSettings();
}

function initializeFinanceSettings() {
    loadExistingLoanTypes();
    loadExistingAllowanceTypes();
    loadExistingOJTRates();
}

// LoanType Settings
function setupLoanTypeSettings() {
    const addBtn = document.getElementById('addLoanTypeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addLoanTypeField();
        });
    }
}

function addLoanTypeField(loanTypeData = null) {
    const fieldsContainer = document.getElementById('loanTypeFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const loanTypeId = loanTypeData ? loanTypeData.id : '';
    const loanType = loanTypeData ? loanTypeData.loan_type : '';
    const description = loanTypeData ? loanTypeData.description : '';
    const isStackable = loanTypeData ? loanTypeData.is_stackable : true;
    
    fieldDiv.innerHTML = `
        <div class="loan-type-inputs">
            <div class="input-with-icon">
                <i class="fas fa-money-bill-wave"></i>
                <input type="text" 
                       placeholder="Enter loan type..." 
                       value="${loanType}"
                       data-id="${loanTypeId}"
                       data-original="${loanType}"
                       data-field="loan_type"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="input-with-icon">
                <i class="fas fa-align-left"></i>
                <input type="text" 
                       placeholder="Enter description..." 
                       value="${description}"
                       data-field="description"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="checkbox-wrapper">
                <label class="standard-checkbox">
                    <input type="checkbox" ${isStackable ? 'checked' : ''} data-field="is_stackable" onchange="handleFieldChange(this)">
                    <span class="checkmark"></span>
                </label>
                <span>Is Stackable</span>
            </div>
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateLoanType(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteLoanType(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!loanTypeData) {
        fieldDiv.querySelector('input[data-field="loan_type"]').focus();
    }
}

function loadExistingLoanTypes() {
    fetch('/general-settings/api/loantypes/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('loanTypeFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            const loanTypes = data.loantypes || [];
            const minFields = 3;
            
            loanTypes.forEach(loanType => {
                addLoanTypeField(loanType);
            });
            
            while (fieldsContainer.children.length < minFields) {
                addLoanTypeField();
            }
        })
        .catch(error => {
            console.error('Error loading loan types:', error);
        });
}

function updateLoanType(button) {
    const fieldDiv = button.closest('.invite-field');
    const inputs = fieldDiv.querySelectorAll('input');
    const loanTypeInput = fieldDiv.querySelector('input[data-field="loan_type"]');
    const descriptionInput = fieldDiv.querySelector('input[data-field="description"]');
    const stackableInput = fieldDiv.querySelector('input[data-field="is_stackable"]');
    
    const loanTypeId = loanTypeInput.dataset.id;
    const loanType = loanTypeInput.value.trim();
    const description = descriptionInput.value.trim();
    const isStackable = stackableInput.checked;
    
    if (!loanType) {
        showToast('Please enter a loan type', 'error');
        return;
    }
    
    const data = {
        loan_type: loanType,
        description: description,
        is_stackable: isStackable
    };
    
    if (loanTypeId) {
        // Update existing
        fetch(`/general-settings/api/loantypes/${loanTypeId}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Loan type updated successfully', 'success');
                loanTypeInput.dataset.original = loanType;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to update loan type', 'error');
            }
        })
        .catch(error => {
            showToast('Error updating loan type', 'error');
        });
    } else {
        // Create new
        fetch('/general-settings/api/loantypes/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Loan type created successfully', 'success');
                loanTypeInput.dataset.id = result.loantype.id;
                loanTypeInput.dataset.original = loanType;
                resetFieldState(fieldDiv);
                addLoanTypeField(); // Add new empty field
            } else {
                showToast(result.error || 'Failed to create loan type', 'error');
            }
        })
        .catch(error => {
            showToast('Error creating loan type', 'error');
        });
    }
}

function deleteLoanType(button) {
    const fieldDiv = button.closest('.invite-field');
    const loanTypeInput = fieldDiv.querySelector('input[data-field="loan_type"]');
    const loanTypeId = loanTypeInput.dataset.id;
    const loanType = loanTypeInput.value.trim();
    
    if (!loanTypeId) {
        fieldDiv.remove();
        ensureMinimumFields('loanTypeFields', 3, addLoanTypeField);
        return;
    }
    
    showDeleteModal(loanType, () => {
        fetch(`/general-settings/api/loantypes/${loanTypeId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Loan type deleted successfully', 'success');
                fieldDiv.remove();
                ensureMinimumFields('loanTypeFields', 3, addLoanTypeField);
            } else {
                showToast(result.error || 'Failed to delete loan type', 'error');
            }
        })
        .catch(error => {
            showToast('Error deleting loan type', 'error');
        });
    });
}

// AllowanceType Settings
function setupAllowanceTypeSettings() {
    const addBtn = document.getElementById('addAllowanceTypeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addAllowanceTypeField();
        });
    }
}

function addAllowanceTypeField(allowanceTypeData = null) {
    const fieldsContainer = document.getElementById('allowanceTypeFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const allowanceTypeId = allowanceTypeData ? allowanceTypeData.id : '';
    const allowanceType = allowanceTypeData ? allowanceTypeData.allowance_type : '';
    
    fieldDiv.innerHTML = `
        <div class="input-with-icon">
            <i class="fas fa-gift"></i>
            <input type="text" 
                   placeholder="Enter allowance type..." 
                   value="${allowanceType}"
                   data-id="${allowanceTypeId}"
                   data-original="${allowanceType}"
                   oninput="handleFieldChange(this)">
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateAllowanceType(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteAllowanceType(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!allowanceTypeData) {
        fieldDiv.querySelector('input').focus();
    }
}

function loadExistingAllowanceTypes() {
    fetch('/general-settings/api/allowancetypes/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('allowanceTypeFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            const allowanceTypes = data.allowancetypes || [];
            const minFields = 3;
            
            allowanceTypes.forEach(allowanceType => {
                addAllowanceTypeField(allowanceType);
            });
            
            while (fieldsContainer.children.length < minFields) {
                addAllowanceTypeField();
            }
        })
        .catch(error => {
            console.error('Error loading allowance types:', error);
        });
}

function updateAllowanceType(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const allowanceTypeId = input.dataset.id;
    const allowanceType = input.value.trim();
    
    if (!allowanceType) {
        showToast('Please enter an allowance type', 'error');
        return;
    }
    
    const data = { allowance_type: allowanceType };
    
    if (allowanceTypeId) {
        // Update existing
        fetch(`/general-settings/api/allowancetypes/${allowanceTypeId}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Allowance type updated successfully', 'success');
                input.dataset.original = allowanceType;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to update allowance type', 'error');
            }
        })
        .catch(error => {
            showToast('Error updating allowance type', 'error');
        });
    } else {
        // Create new
        fetch('/general-settings/api/allowancetypes/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Allowance type created successfully', 'success');
                input.dataset.id = result.allowancetype.id;
                input.dataset.original = allowanceType;
                resetFieldState(fieldDiv);
                addAllowanceTypeField(); // Add new empty field
            } else {
                showToast(result.error || 'Failed to create allowance type', 'error');
            }
        })
        .catch(error => {
            showToast('Error creating allowance type', 'error');
        });
    }
}

function deleteAllowanceType(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const allowanceTypeId = input.dataset.id;
    const allowanceType = input.value.trim();
    
    if (!allowanceTypeId) {
        fieldDiv.remove();
        ensureMinimumFields('allowanceTypeFields', 3, addAllowanceTypeField);
        return;
    }
    
    showDeleteModal(allowanceType, () => {
        fetch(`/general-settings/api/allowancetypes/${allowanceTypeId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Allowance type deleted successfully', 'success');
                fieldDiv.remove();
                ensureMinimumFields('allowanceTypeFields', 3, addAllowanceTypeField);
            } else {
                showToast(result.error || 'Failed to delete allowance type', 'error');
            }
        })
        .catch(error => {
            showToast('Error deleting allowance type', 'error');
        });
    });
}

// OJTRate Settings
function setupOJTRateSettings() {
    const addBtn = document.getElementById('addOJTRateBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addOJTRateField();
        });
    }
}

function addOJTRateField(ojtRateData = null) {
    const fieldsContainer = document.getElementById('ojtRateFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const ojtRateId = ojtRateData ? ojtRateData.id : '';
    const site = ojtRateData ? ojtRateData.site : '';
    
    fieldDiv.innerHTML = `
        <div class="input-with-icon">
            <i class="fas fa-map-marker-alt"></i>
            <input type="text" 
                   placeholder="Enter site name..." 
                   value="${site}"
                   data-id="${ojtRateId}"
                   data-original="${site}"
                   oninput="handleFieldChange(this)">
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateOJTRate(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteOJTRate(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
            <button type="button" class="btn-department-line" onclick="openOJTRateModal(this)" title="Rates" ${!ojtRateId ? 'disabled' : ''}>
                Rate
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!ojtRateData) {
        fieldDiv.querySelector('input').focus();
    }
}

function loadExistingOJTRates() {
    fetch('/general-settings/api/ojtrates/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('ojtRateFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            const ojtRates = data.ojtrates || [];
            const minFields = 3;
            
            ojtRates.forEach(ojtRate => {
                addOJTRateField(ojtRate);
            });
            
            while (fieldsContainer.children.length < minFields) {
                addOJTRateField();
            }
        })
        .catch(error => {
            console.error('Error loading OJT rates:', error);
        });
}

function updateOJTRate(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const ojtRateId = input.dataset.id;
    const site = input.value.trim();
    
    if (!site) {
        showToast('Please enter a site name', 'error');
        return;
    }
    
    const data = { site: site };
    
    if (ojtRateId) {
        // Update existing
        fetch(`/general-settings/api/ojtrates/${ojtRateId}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('OJT rate updated successfully', 'success');
                input.dataset.original = site;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to update OJT rate', 'error');
            }
        })
        .catch(error => {
            showToast('Error updating OJT rate', 'error');
        });
    } else {
        // Create new
        fetch('/general-settings/api/ojtrates/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('OJT rate created successfully', 'success');
                input.dataset.id = result.ojtrate.id;
                input.dataset.original = site;
                resetFieldState(fieldDiv);
                
                // Enable the Rate button
                const rateBtn = fieldDiv.querySelector('.btn-department-line');
                if (rateBtn) {
                    rateBtn.disabled = false;
                }
                
                addOJTRateField(); // Add new empty field
            } else {
                showToast(result.error || 'Failed to create OJT rate', 'error');
            }
        })
        .catch(error => {
            showToast('Error creating OJT rate', 'error');
        });
    }
}

function deleteOJTRate(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const ojtRateId = input.dataset.id;
    const site = input.value.trim();
    
    if (!ojtRateId) {
        fieldDiv.remove();
        ensureMinimumFields('ojtRateFields', 3, addOJTRateField);
        return;
    }
    
    showDeleteModal(site, () => {
        fetch(`/general-settings/api/ojtrates/${ojtRateId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('OJT rate deleted successfully', 'success');
                fieldDiv.remove();
                ensureMinimumFields('ojtRateFields', 3, addOJTRateField);
            } else {
                showToast(result.error || 'Failed to delete OJT rate', 'error');
            }
        })
        .catch(error => {
            showToast('Error deleting OJT rate', 'error');
        });
    });
}

// OJT Rate Modal Functions
let currentOJTRateId = null;

function openOJTRateModal(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const ojtRateId = input.dataset.id;
    const site = input.value.trim();
    
    if (!ojtRateId) {
        showToast('Please save the site first before editing rates', 'error');
        return;
    }
    
    currentOJTRateId = ojtRateId;
    
    // Update modal title
    document.getElementById('ojtRateTitle').textContent = `OJT Rates - ${site}`;
    
    // Load current rates
    loadOJTRateData(ojtRateId);
    
    // Show modal
    const modal = document.getElementById('ojtRateModal');
    modal.classList.add('show');
}

function closeOJTRateModal() {
    const modal = document.getElementById('ojtRateModal');
    modal.classList.remove('show');
    currentOJTRateId = null;
    
    // Clear form
    const form = document.getElementById('ojtRateForm');
    if (form) {
        form.reset();
    }
}

function loadOJTRateData(ojtRateId) {
    fetch(`/general-settings/api/ojtrates/${ojtRateId}/rates/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const rates = data.rates;
                document.getElementById('allowanceDayInput').value = rates.allowance_day;
                document.getElementById('regNdRateInput').value = rates.reg_nd_rate;
                document.getElementById('regNdOtRateInput').value = rates.reg_nd_ot_rate;
                document.getElementById('regOtRateInput').value = rates.reg_ot_rate;
                document.getElementById('restOtRateInput').value = rates.rest_ot_rate;
                document.getElementById('legalRateInput').value = rates.legal_rate;
                document.getElementById('satOffRateInput').value = rates.sat_off_rate;
            } else {
                showToast('Error loading rate data', 'error');
            }
        })
        .catch(error => {
            showToast('Error loading rate data', 'error');
        });
}

function saveOJTRate() {
    if (!currentOJTRateId) {
        showToast('No OJT rate selected', 'error');
        return;
    }
    
    const data = {
        allowance_day: document.getElementById('allowanceDayInput').value || 0,
        reg_nd_rate: document.getElementById('regNdRateInput').value || 0,
        reg_nd_ot_rate: document.getElementById('regNdOtRateInput').value || 0,
        reg_ot_rate: document.getElementById('regOtRateInput').value || 0,
        rest_ot_rate: document.getElementById('restOtRateInput').value || 0,
        legal_rate: document.getElementById('legalRateInput').value || 0,
        sat_off_rate: document.getElementById('satOffRateInput').value || 0
    };
    
    fetch(`/general-settings/api/ojtrates/${currentOJTRateId}/rates/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('OJT rates saved successfully', 'success');
            closeOJTRateModal();
        } else {
            showToast(result.error || 'Failed to save OJT rates', 'error');
        }
    })
    .catch(error => {
        showToast('Error saving OJT rates', 'error');
    });
}
