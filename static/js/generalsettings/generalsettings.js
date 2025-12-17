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
    
    // Add leave settings
    setupLeaveSettings();
    
    // Add ticketing settings
    setupTicketingSettings();
    
    // Add modal overlay event listener
    const modalOverlay = document.querySelector('#departmentLinesModal .modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeDepartmentLinesModal);
    }
    
    // Add keyboard event listeners for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close any open modals
            const editReasonModal = document.getElementById('editLeaveTypeReasonModal');
            const deleteModal = document.getElementById('deleteConfirmModal');
            const departmentLinesModal = document.getElementById('departmentLinesModal');
            const ojtRateModal = document.getElementById('ojtRateModal');
            const leaveTypeReasonsModal = document.getElementById('leaveTypeReasonsModal');
            
            if (editReasonModal && editReasonModal.style.display === 'flex') {
                closeEditLeaveTypeReasonModal();
            } else if (deleteModal && deleteModal.style.display === 'flex') {
                closeDeleteModal();
            } else if (departmentLinesModal && departmentLinesModal.style.display === 'flex') {
                closeDepartmentLinesModal();
            } else if (ojtRateModal && ojtRateModal.style.display === 'flex') {
                closeOJTRateModal();
            } else if (leaveTypeReasonsModal && leaveTypeReasonsModal.style.display === 'flex') {
                closeLeaveTypeReasonsModal();
            }
        }
    });
    
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
    const hasLineLeader = departmentData ? departmentData.has_line_leader : false;
    
    fieldDiv.innerHTML = `
        <div class="department-inputs">
            <div class="input-with-icon">
                <i class="fas fa-building"></i>
                <input type="text" 
                       placeholder="Enter department name..." 
                       value="${deptName}"
                       data-id="${deptId}"
                       data-original="${deptName}"
                       data-field="name"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="department-checkboxes">
                <div class="checkbox-container">
                    <label class="standard-checkbox">
                        <input type="checkbox" ${hasLineLeader ? 'checked' : ''} data-field="has_line_leader" onchange="handleFieldChange(this)">
                        <span class="checkmark"></span>
                    </label>
                    <span>Has Line Leader</span>
                </div>
            </div>
        </div>
        <div class="department-actions">
            <button type="button" class="btn-department-lines" onclick="openDepartmentLinesModal(this)" title="Manage Lines">
                <i class="fas fa-list"></i>
            </button>
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
        fieldDiv.querySelector('input[data-field="name"]').focus();
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
    const nameInput = field.querySelector('input[data-field="name"]');
    const hasLineLeaderInput = field.querySelector('input[data-field="has_line_leader"]');
    
    const deptId = nameInput.dataset.id;
    const newName = nameInput.value.trim();
    const hasLineLeader = hasLineLeaderInput.checked;
    
    if (!newName) {
        showToast('Department name cannot be empty', 'error');
        return;
    }
    
    field.classList.add('field-loading');
    
    const url = deptId ? `/general-settings/api/departments/${deptId}/` : '/general-settings/api/departments/';
    const method = deptId ? 'PUT' : 'POST';
    
    const data = {
        name: newName,
        has_line_leader: hasLineLeader
    };
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            nameInput.dataset.id = data.department.id;
            nameInput.dataset.original = newName;
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
    const nameInput = field.querySelector('input[data-field="name"]');
    const deptId = nameInput.dataset.id;
    const deptName = nameInput.value;
    const fieldsContainer = document.getElementById('departmentFields');
    
    // If empty field and more than 3 fields, just remove it
    if (!deptId && !deptName.trim() && fieldsContainer.children.length > 3) {
        field.remove();
        return;
    }
    
    // If empty field and only 3 fields, just clear it
    if (!deptId && !deptName.trim() && fieldsContainer.children.length <= 3) {
        nameInput.value = '';
        nameInput.dataset.original = '';
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
                        nameInput.value = '';
                        nameInput.dataset.id = '';
                        nameInput.dataset.original = '';
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
                nameInput.value = '';
                nameInput.dataset.original = '';
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
    const isLineLeader = positionData ? positionData.is_line_leader : false;
    
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
        <div class="checkbox-container">
            <label class="standard-checkbox">
                <input type="checkbox" ${isLineLeader ? 'checked' : ''} data-original="${isLineLeader}" onchange="handleFieldChange(this)">
                <span class="checkmark"></span>
            </label>
            <span>Is Line Leader</span>
        </div>
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
    const checkbox = field.querySelector('input[type="checkbox"]');
    const posId = input.dataset.id;
    const newName = input.value.trim();
    const newLevel = select.value;
    const isLineLeader = checkbox.checked;
    
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
            level: newLevel,
            is_line_leader: isLineLeader
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            input.dataset.id = data.position.id;
            input.dataset.original = newName;
            select.dataset.original = newLevel;
            checkbox.dataset.original = isLineLeader;
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
    fieldDiv.classList.remove('modified', 'changed');
    
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
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
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
    const nameInput = field.querySelector('input[data-field="name"]');
    const deptId = nameInput.dataset.id;
    const deptName = nameInput.value.trim();
    
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
                } else if (targetTab === 'leave') {
                    initializeLeaveSettings();
                }
            }
        });
    });
}

// Finance Settings
function setupFinanceSettings() {
    setupLoanTypeSettings();
    setupAllowanceTypeSettings();
    setupSavingsTypeSettings();
    setupOJTRateSettings();
}

function initializeFinanceSettings() {
    loadExistingLoanTypes();
    loadExistingAllowanceTypes();
    loadExistingSavingsTypes();
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
            <div class="checkbox-container">
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
                // Removed automatic field addition
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
    
    openDeleteModal(loanType, 'loantype', () => {
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
                // Removed automatic field addition
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
    
    openDeleteModal(allowanceType, 'allowancetype', () => {
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

// SavingsType Settings
function setupSavingsTypeSettings() {
    const addBtn = document.getElementById('addSavingsTypeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addSavingsTypeField();
        });
    }
}

function addSavingsTypeField(savingsTypeData = null) {
    const fieldsContainer = document.getElementById('savingsTypeFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const savingsTypeId = savingsTypeData ? savingsTypeData.id : '';
    const savingsType = savingsTypeData ? savingsTypeData.savings_type : '';
    
    fieldDiv.innerHTML = `
        <div class="input-with-icon">
            <i class="fas fa-piggy-bank"></i>
            <input type="text" 
                   placeholder="Enter savings type..." 
                   value="${savingsType}"
                   data-id="${savingsTypeId}"
                   data-original="${savingsType}"
                   oninput="handleFieldChange(this)">
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateSavingsType(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteSavingsType(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!savingsTypeData) {
        fieldDiv.querySelector('input').focus();
    }
}

function loadExistingSavingsTypes() {
    fetch('/general-settings/api/savingstypes/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('savingsTypeFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            const savingsTypes = data.savingstypes || [];
            const minFields = 3;
            
            savingsTypes.forEach(savingsType => {
                addSavingsTypeField(savingsType);
            });
            
            while (fieldsContainer.children.length < minFields) {
                addSavingsTypeField();
            }
        })
        .catch(error => {
            console.error('Error loading savings types:', error);
        });
}

function updateSavingsType(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const savingsTypeId = input.dataset.id;
    const savingsType = input.value.trim();
    
    if (!savingsType) {
        showToast('Please enter a savings type', 'error');
        return;
    }
    
    const data = { savings_type: savingsType };
    
    if (savingsTypeId) {
        // Update existing
        fetch(`/general-settings/api/savingstypes/${savingsTypeId}/`, {
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
                showToast('Savings type updated successfully', 'success');
                input.dataset.original = savingsType;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to update savings type', 'error');
            }
        })
        .catch(error => {
            showToast('Error updating savings type', 'error');
        });
    } else {
        // Create new
        fetch('/general-settings/api/savingstypes/', {
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
                showToast('Savings type created successfully', 'success');
                input.dataset.id = result.savingstype.id;
                input.dataset.original = savingsType;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to create savings type', 'error');
            }
        })
        .catch(error => {
            showToast('Error creating savings type', 'error');
        });
    }
}

function deleteSavingsType(button) {
    const fieldDiv = button.closest('.invite-field');
    const input = fieldDiv.querySelector('input');
    const savingsTypeId = input.dataset.id;
    const savingsType = input.value.trim();
    
    if (!savingsTypeId) {
        fieldDiv.remove();
        ensureMinimumFields('savingsTypeFields', 3, addSavingsTypeField);
        return;
    }
    
    openDeleteModal(savingsType, 'savingstype', () => {
        fetch(`/general-settings/api/savingstypes/${savingsTypeId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Savings type deleted successfully', 'success');
                fieldDiv.remove();
                ensureMinimumFields('savingsTypeFields', 3, addSavingsTypeField);
            } else {
                showToast(result.error || 'Failed to delete savings type', 'error');
            }
        })
        .catch(error => {
            showToast('Error deleting savings type', 'error');
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
            <button type="button" class="btn-department-lines" onclick="openOJTRateModal(this)" title="Rates" ${!ojtRateId ? 'disabled' : ''}>
                <i class="fa fa-list-ul"></i>
            </button>
            <button type="button" class="btn-update" onclick="updateOJTRate(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteOJTRate(this)" title="Delete">
                <i class="fas fa-times"></i>
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
                
                // Removed automatic field addition
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
    
    openDeleteModal(site, 'ojtrate', () => {
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
    modal.style.display = 'flex';
    // Use setTimeout to trigger transition after display is set
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeOJTRateModal() {
    const modal = document.getElementById('ojtRateModal');
    modal.classList.remove('show');
    // Use setTimeout to hide after transition completes
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    currentOJTRateId = null;
    
    // Clear form inputs manually
    document.getElementById('allowanceDayInput').value = '';
    document.getElementById('regNdRateInput').value = '';
    document.getElementById('regNdOtRateInput').value = '';
    document.getElementById('regOtRateInput').value = '';
    document.getElementById('restOtRateInput').value = '';
    document.getElementById('legalRateInput').value = '';
    document.getElementById('satOffRateInput').value = '';
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
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            showToast('OJT rates saved successfully', 'success');
            closeOJTRateModal();
        } else {
            showToast(result.error || 'Failed to save OJT rates', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving OJT rates:', error);
        showToast('Error saving OJT rates', 'error');
    });
}

// Leave Settings
function setupLeaveSettings() {
    setupLeaveTypeSettings();
    setupSundayExceptionSettings();
}

function initializeLeaveSettings() {
    loadExistingLeaveTypes();
    loadExistingSundayExceptions();
}

// LeaveType Settings
function setupLeaveTypeSettings() {
    const addBtn = document.getElementById('addLeaveTypeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addLeaveTypeField();
        });
    }
}

function addLeaveTypeField(leaveTypeData = null) {
    const fieldsContainer = document.getElementById('leaveTypeFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const leaveTypeId = leaveTypeData ? leaveTypeData.id : '';
    const name = leaveTypeData ? leaveTypeData.name : '';
    const code = leaveTypeData ? leaveTypeData.code : '';
    const goToClinic = leaveTypeData ? leaveTypeData.go_to_clinic : false;
    const isActive = leaveTypeData ? leaveTypeData.is_active : true;
    const isDeducted = leaveTypeData ? leaveTypeData.is_deducted : false;
    
    fieldDiv.innerHTML = `
        <div class="leave-type-inputs">
            <div class="input-with-icon">
                <i class="fas fa-calendar-alt"></i>
                <input type="text" 
                       placeholder="Enter leave type name..." 
                       value="${name}"
                       data-id="${leaveTypeId}"
                       data-original="${name}"
                       data-field="name"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="input-with-icon">
                <i class="fas fa-code"></i>
                <input type="text" 
                       placeholder="Enter code..." 
                       value="${code}"
                       data-field="code"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="leave-type-checkboxes">
                <div class="checkbox-container">
                    <label class="standard-checkbox">
                        <input type="checkbox" ${goToClinic ? 'checked' : ''} data-field="go_to_clinic" onchange="handleFieldChange(this)">
                        <span class="checkmark"></span>
                    </label>
                    <span>Go to Clinic</span>
                </div>
                <div class="checkbox-container">
                    <label class="standard-checkbox">
                        <input type="checkbox" ${isActive ? 'checked' : ''} data-field="is_active" onchange="handleFieldChange(this)">
                        <span class="checkmark"></span>
                    </label>
                    <span>Is Active</span>
                </div>
                <div class="checkbox-container">
                    <label class="standard-checkbox">
                        <input type="checkbox" ${isDeducted ? 'checked' : ''} data-field="is_deducted" onchange="handleFieldChange(this)">
                        <span class="checkmark"></span>
                    </label>
                    <span>Is Deducted</span>
                </div>
            </div>
        </div>
        <div class="leave-type-actions">
            <button type="button" class="btn-department-lines" onclick="openLeaveTypeReasonsModal(this)" title="Reasons" ${!leaveTypeId ? 'disabled' : ''}>
                <i class="fa fa-list-ul"></i>
            </button>
            <button type="button" class="btn-update" onclick="updateLeaveType(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteLeaveType(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!leaveTypeData) {
        fieldDiv.querySelector('input[data-field="name"]').focus();
    }
}

function loadExistingLeaveTypes() {
    fetch('/general-settings/api/leavetypes/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('leaveTypeFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            const leaveTypes = data.leavetypes || [];
            const minFields = 3;
            
            leaveTypes.forEach(leaveType => {
                addLeaveTypeField(leaveType);
            });
            
            while (fieldsContainer.children.length < minFields) {
                addLeaveTypeField();
            }
        })
        .catch(error => {
            console.error('Error loading leave types:', error);
        });
}

function updateLeaveType(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const codeInput = fieldDiv.querySelector('input[data-field="code"]');
    const goToClinicInput = fieldDiv.querySelector('input[data-field="go_to_clinic"]');
    const isActiveInput = fieldDiv.querySelector('input[data-field="is_active"]');
    const isDeductedInput = fieldDiv.querySelector('input[data-field="is_deducted"]');
    
    const leaveTypeId = nameInput.dataset.id;
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const goToClinic = goToClinicInput.checked;
    const isActive = isActiveInput.checked;
    const isDeducted = isDeductedInput.checked;
    
    if (!name || !code) {
        showToast('Please enter both name and code', 'error');
        return;
    }
    
    const data = {
        name: name,
        code: code,
        go_to_clinic: goToClinic,
        is_active: isActive,
        is_deducted: isDeducted
    };
    
    if (leaveTypeId) {
        // Update existing
        fetch(`/general-settings/api/leavetypes/${leaveTypeId}/`, {
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
                showToast('Leave type updated successfully', 'success');
                nameInput.dataset.original = name;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to update leave type', 'error');
            }
        })
        .catch(error => {
            showToast('Error updating leave type', 'error');
        });
    } else {
        // Create new
        fetch('/general-settings/api/leavetypes/', {
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
                showToast('Leave type created successfully', 'success');
                nameInput.dataset.id = result.leavetype.id;
                nameInput.dataset.original = name;
                resetFieldState(fieldDiv);
                
                // Enable the List button
                const listBtn = fieldDiv.querySelector('.btn-department-line');
                if (listBtn) {
                    listBtn.disabled = false;
                }
                
                // Removed automatic field addition
            } else {
                showToast(result.error || 'Failed to create leave type', 'error');
            }
        })
        .catch(error => {
            showToast('Error creating leave type', 'error');
        });
    }
}

function deleteLeaveType(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const leaveTypeId = nameInput.dataset.id;
    const name = nameInput.value.trim();
    
    if (!leaveTypeId) {
        fieldDiv.remove();
        ensureMinimumFields('leaveTypeFields', 3, addLeaveTypeField);
        return;
    }
    
    openDeleteModal(name, 'leavetype', () => {
        fetch(`/general-settings/api/leavetypes/${leaveTypeId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Leave type deleted successfully', 'success');
                fieldDiv.remove();
                ensureMinimumFields('leaveTypeFields', 3, addLeaveTypeField);
            } else {
                showToast(result.error || 'Failed to delete leave type', 'error');
            }
        })
        .catch(error => {
            showToast('Error deleting leave type', 'error');
        });
    });
}

// SundayException Settings
function setupSundayExceptionSettings() {
    const addBtn = document.getElementById('addSundayExceptionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addSundayExceptionField();
        });
    }
}

function addSundayExceptionField(sundayExceptionData = null) {
    const fieldsContainer = document.getElementById('sundayExceptionFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const sundayExceptionId = sundayExceptionData ? sundayExceptionData.id : '';
    const date = sundayExceptionData ? sundayExceptionData.date : '';
    const description = sundayExceptionData ? sundayExceptionData.description : '';
    
    fieldDiv.innerHTML = `
        <div class="sunday-exception-inputs">
            <div class="input-with-icon">
                <i class="fas fa-calendar"></i>
                <input type="date" 
                       value="${date}"
                       data-id="${sundayExceptionId}"
                       data-original="${date}"
                       data-field="date"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="input-with-icon">
                <i class="fas fa-comment"></i>
                <input type="text" 
                       placeholder="Enter description..." 
                       value="${description}"
                       data-field="description"
                       oninput="handleFieldChange(this)">
            </div>
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateSundayException(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteSundayException(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!sundayExceptionData) {
        fieldDiv.querySelector('input[data-field="date"]').focus();
    }
}

function loadExistingSundayExceptions() {
    fetch('/general-settings/api/sundayexceptions/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('sundayExceptionFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            const sundayExceptions = data.sundayexceptions || [];
            const minFields = 3;
            
            sundayExceptions.forEach(sundayException => {
                addSundayExceptionField(sundayException);
            });
            
            while (fieldsContainer.children.length < minFields) {
                addSundayExceptionField();
            }
        })
        .catch(error => {
            console.error('Error loading sunday exceptions:', error);
        });
}

function updateSundayException(button) {
    const fieldDiv = button.closest('.invite-field');
    const dateInput = fieldDiv.querySelector('input[data-field="date"]');
    const descriptionInput = fieldDiv.querySelector('input[data-field="description"]');
    
    const sundayExceptionId = dateInput.dataset.id;
    const date = dateInput.value.trim();
    const description = descriptionInput.value.trim();
    
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }
    
    const data = {
        date: date,
        description: description
    };
    
    if (sundayExceptionId) {
        // Update existing
        fetch(`/general-settings/api/sundayexceptions/${sundayExceptionId}/`, {
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
                showToast('Sunday exception updated successfully', 'success');
                dateInput.dataset.original = date;
                resetFieldState(fieldDiv);
            } else {
                showToast(result.error || 'Failed to update sunday exception', 'error');
            }
        })
        .catch(error => {
            showToast('Error updating sunday exception', 'error');
        });
    } else {
        // Create new
        fetch('/general-settings/api/sundayexceptions/', {
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
                showToast('Sunday exception created successfully', 'success');
                dateInput.dataset.id = result.sundayexception.id;
                dateInput.dataset.original = date;
                resetFieldState(fieldDiv);
                // Removed automatic field addition
            } else {
                showToast(result.error || 'Failed to create sunday exception', 'error');
            }
        })
        .catch(error => {
            showToast('Error creating sunday exception', 'error');
        });
    }
}

function deleteSundayException(button) {
    const fieldDiv = button.closest('.invite-field');
    const dateInput = fieldDiv.querySelector('input[data-field="date"]');
    const sundayExceptionId = dateInput.dataset.id;
    const date = dateInput.value.trim();
    
    if (!sundayExceptionId) {
        fieldDiv.remove();
        ensureMinimumFields('sundayExceptionFields', 3, addSundayExceptionField);
        return;
    }
    
    openDeleteModal(date, 'sundayexception', () => {
        fetch(`/general-settings/api/sundayexceptions/${sundayExceptionId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showToast('Sunday exception deleted successfully', 'success');
                fieldDiv.remove();
                ensureMinimumFields('sundayExceptionFields', 3, addSundayExceptionField);
            } else {
                showToast(result.error || 'Failed to delete sunday exception', 'error');
            }
        })
        .catch(error => {
            showToast('Error deleting sunday exception', 'error');
        });
    });
}

// Leave Type Reasons Modal Functions
let currentLeaveTypeId = null;
let currentLeaveTypeName = '';

function openLeaveTypeReasonsModal(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const leaveTypeId = nameInput.dataset.id;
    const leaveTypeName = nameInput.value.trim();
    
    if (!leaveTypeId) {
        showToast('Please save the leave type first before managing reasons', 'error');
        return;
    }
    
    currentLeaveTypeId = leaveTypeId;
    currentLeaveTypeName = leaveTypeName;
    
    // Update modal title
    document.getElementById('leaveTypeReasonsTitle').textContent = `Reasons for ${leaveTypeName}`;
    
    // Load current reasons
    loadLeaveTypeReasons(leaveTypeId);
    
    // Show modal
    const modal = document.getElementById('leaveTypeReasonsModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeLeaveTypeReasonsModal() {
    const modal = document.getElementById('leaveTypeReasonsModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    currentLeaveTypeId = null;
    currentLeaveTypeName = '';
    
    // Clear form
    document.getElementById('newReasonInput').value = '';
    document.getElementById('newReasonActiveInput').checked = true;
}

function loadLeaveTypeReasons(leaveTypeId) {
    const reasonsList = document.getElementById('leaveTypeReasonsList');
    reasonsList.innerHTML = '<div class="loading">Loading reasons...</div>';
    
    fetch(`/general-settings/api/leavetypes/${leaveTypeId}/reasons/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayLeaveTypeReasons(data.reasons);
            } else {
                reasonsList.innerHTML = '<div class="error">Error loading reasons</div>';
            }
        })
        .catch(error => {
            reasonsList.innerHTML = '<div class="error">Error loading reasons</div>';
        });
}

function displayLeaveTypeReasons(reasons) {
    const reasonsList = document.getElementById('leaveTypeReasonsList');
    
    if (reasons.length === 0) {
        reasonsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-list"></i>
                <p>No reasons added yet</p>
            </div>
        `;
        return;
    }
    
    reasonsList.innerHTML = reasons.map(reason => `
        <div class="reason-item" data-reason-id="${reason.id}">
            <div class="reason-content">
                <div class="reason-text">${reason.reason_text}</div>
                <div class="reason-status ${reason.is_active ? 'active' : 'inactive'}">
                    ${reason.is_active ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div class="reason-actions">
                <button class="btn btn-icon" onclick="editLeaveTypeReason(${reason.id}, '${reason.reason_text.replace(/'/g, "\\'")}', ${reason.is_active})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-error" onclick="deleteLeaveTypeReason(${reason.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addReasonToLeaveType() {
    if (!currentLeaveTypeId) {
        showToast('No leave type selected', 'error');
        return;
    }
    
    const reasonText = document.getElementById('newReasonInput').value.trim();
    const isActive = document.getElementById('newReasonActiveInput').checked;
    
    if (!reasonText) {
        showToast('Please enter reason text', 'error');
        return;
    }
    
    const data = {
        reason_text: reasonText,
        is_active: isActive
    };
    
    fetch(`/general-settings/api/leavetypes/${currentLeaveTypeId}/reasons/`, {
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
            showToast('Reason added successfully', 'success');
            document.getElementById('newReasonInput').value = '';
            document.getElementById('newReasonActiveInput').checked = true;
            loadLeaveTypeReasons(currentLeaveTypeId);
        } else {
            showToast(result.error || 'Failed to add reason', 'error');
        }
    })
    .catch(error => {
        showToast('Error adding reason', 'error');
    });
}

// Edit Leave Type Reason Modal Variables
let editingReasonId = null;

function editLeaveTypeReason(reasonId, reasonText, isActive) {
    editingReasonId = reasonId;
    
    // Populate the edit form
    document.getElementById('editReasonTextInput').value = reasonText;
    document.getElementById('editReasonActiveInput').checked = isActive;
    
    // Open the modal
    openEditLeaveTypeReasonModal();
}

function openEditLeaveTypeReasonModal() {
    const modal = document.getElementById('editLeaveTypeReasonModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeEditLeaveTypeReasonModal() {
    const modal = document.getElementById('editLeaveTypeReasonModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        // Clear form
        document.getElementById('editReasonTextInput').value = '';
        document.getElementById('editReasonActiveInput').checked = false;
        editingReasonId = null;
    }, 300);
}

function saveEditedLeaveTypeReason() {
    if (!editingReasonId) return;
    
    const reasonText = document.getElementById('editReasonTextInput').value.trim();
    const isActive = document.getElementById('editReasonActiveInput').checked;
    
    if (!reasonText) {
        showToast('Reason text is required', 'error');
        return;
    }
    
    const data = {
        reason_text: reasonText,
        is_active: isActive
    };
    
    fetch(`/general-settings/api/leavetypes/${currentLeaveTypeId}/reasons/${editingReasonId}/`, {
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
            showToast('Reason updated successfully', 'success');
            loadLeaveTypeReasons(currentLeaveTypeId);
            closeEditLeaveTypeReasonModal();
        } else {
            showToast(result.error || 'Failed to update reason', 'error');
        }
    })
    .catch(error => {
        showToast('Error updating reason', 'error');
    });
}

function deleteLeaveTypeReason(reasonId) {
    if (!confirm('Are you sure you want to delete this reason?')) return;
    
    fetch(`/general-settings/api/leavetypes/${currentLeaveTypeId}/reasons/${reasonId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCsrfToken()
        }
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showToast('Reason deleted successfully', 'success');
            loadLeaveTypeReasons(currentLeaveTypeId);
        } else {
            showToast(result.error || 'Failed to delete reason', 'error');
        }
    })
    .catch(error => {
        showToast('Error deleting reason', 'error');
    });
}

// ========================
// TICKETING SETTINGS
// ========================

function setupTicketingSettings() {
    setupDeviceTypeSettings();
    setupTicketCategorySettings();
}

// DeviceType Settings
function setupDeviceTypeSettings() {
    const addBtn = document.getElementById('addDeviceTypeBtn');
    const fieldsContainer = document.getElementById('deviceTypeFields');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addDeviceTypeField();
        });
    }
    
    // Load existing device types
    loadExistingDeviceTypes();
}

function addDeviceTypeField(deviceTypeData = null) {
    const fieldsContainer = document.getElementById('deviceTypeFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const deviceTypeId = deviceTypeData ? deviceTypeData.id : '';
    const name = deviceTypeData ? deviceTypeData.name : '';
    const description = deviceTypeData ? deviceTypeData.description : '';
    
    fieldDiv.innerHTML = `
        <div class="device-type-inputs">
            <div class="input-with-icon">
                <i class="fas fa-desktop"></i>
                <input type="text" 
                       placeholder="Enter device type name..." 
                       value="${name}"
                       data-id="${deviceTypeId}"
                       data-original="${name}"
                       data-field="name"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="input-with-icon">
                <i class="fas fa-comment"></i>
                <input type="text" 
                       placeholder="Enter description..." 
                       value="${description}"
                       data-field="description"
                       oninput="handleFieldChange(this)">
            </div>
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateDeviceType(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteDeviceType(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!deviceTypeData) {
        fieldDiv.querySelector('input[data-field="name"]').focus();
    }
}

function loadExistingDeviceTypes() {
    fetch('/general-settings/api/devicetypes/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('deviceTypeFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            // Always ensure minimum 3 fields
            const deviceTypes = data.devicetypes || [];
            const minFields = 3;
            
            // Add existing device types
            deviceTypes.forEach(deviceType => {
                addDeviceTypeField(deviceType);
            });
            
            // Add empty fields to reach minimum
            while (fieldsContainer.children.length < minFields) {
                addDeviceTypeField();
            }
        })
        .catch(error => {
            console.error('Error loading device types:', error);
            showToast('Error loading device types', 'error');
        });
}

function updateDeviceType(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const descriptionInput = fieldDiv.querySelector('input[data-field="description"]');
    const deviceTypeId = nameInput.dataset.id;
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    
    if (!name) {
        showToast('Device type name is required', 'error');
        nameInput.focus();
        return;
    }
    
    const data = {
        name: name,
        description: description
    };
    
    let url, method;
    if (deviceTypeId) {
        url = `/general-settings/api/devicetypes/${deviceTypeId}/`;
        method = 'PUT';
    } else {
        url = '/general-settings/api/devicetypes/';
        method = 'POST';
    }
    
    button.disabled = true;
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            const deviceType = result.devicetype;
            nameInput.dataset.id = deviceType.id;
            nameInput.dataset.original = deviceType.name;
            descriptionInput.dataset.original = deviceType.description;
            
            resetFieldState(fieldDiv);
            showToast(`Device type ${deviceTypeId ? 'updated' : 'created'} successfully`, 'success');
            
            // Removed automatic field addition
        } else {
            showToast(result.error || 'Failed to save device type', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving device type:', error);
        showToast('Error saving device type', 'error');
    })
    .finally(() => {
        button.disabled = false;
        ensureMinimumFields('deviceTypeFields', 3, addDeviceTypeField);
    });
}

function deleteDeviceType(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const deviceTypeId = nameInput.dataset.id;
    const name = nameInput.value || 'this device type';
    
    if (!deviceTypeId) {
        // If no ID, just remove the field
        fieldDiv.remove();
        ensureMinimumFields('deviceTypeFields', 3, addDeviceTypeField);
        return;
    }
    
    openDeleteModal(name, 'device type', function() {
        fetch(`/general-settings/api/devicetypes/${deviceTypeId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                fieldDiv.remove();
                showToast('Device type deleted successfully', 'success');
                ensureMinimumFields('deviceTypeFields', 3, addDeviceTypeField);
            } else {
                showToast(result.error || 'Failed to delete device type', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting device type:', error);
            showToast('Error deleting device type', 'error');
        });
    });
}

// TicketCategory Settings
function setupTicketCategorySettings() {
    const addBtn = document.getElementById('addTicketCategoryBtn');
    const fieldsContainer = document.getElementById('ticketCategoryFields');
    
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addTicketCategoryField();
        });
    }
    
    // Load existing ticket categories
    loadExistingTicketCategories();
}

function addTicketCategoryField(ticketCategoryData = null) {
    const fieldsContainer = document.getElementById('ticketCategoryFields');
    if (!fieldsContainer) return;
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'invite-field';
    
    const ticketCategoryId = ticketCategoryData ? ticketCategoryData.id : '';
    const name = ticketCategoryData ? ticketCategoryData.name : '';
    const description = ticketCategoryData ? ticketCategoryData.description : '';
    
    fieldDiv.innerHTML = `
        <div class="ticket-category-inputs">
            <div class="input-with-icon">
                <i class="fas fa-tag"></i>
                <input type="text" 
                       placeholder="Enter ticket category name..." 
                       value="${name}"
                       data-id="${ticketCategoryId}"
                       data-original="${name}"
                       data-field="name"
                       oninput="handleFieldChange(this)">
            </div>
            <div class="input-with-icon">
                <i class="fas fa-comment"></i>
                <input type="text" 
                       placeholder="Enter description..." 
                       value="${description}"
                       data-field="description"
                       oninput="handleFieldChange(this)">
            </div>
        </div>
        <div class="field-actions">
            <button type="button" class="btn-update" onclick="updateTicketCategory(this)" title="Update">
                <i class="fas fa-check"></i>
            </button>
            <button type="button" class="btn-delete" onclick="deleteTicketCategory(this)" title="Delete">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    fieldsContainer.appendChild(fieldDiv);
    
    if (!ticketCategoryData) {
        fieldDiv.querySelector('input[data-field="name"]').focus();
    }
}

function loadExistingTicketCategories() {
    fetch('/general-settings/api/ticketcategories/')
        .then(response => response.json())
        .then(data => {
            const fieldsContainer = document.getElementById('ticketCategoryFields');
            if (!fieldsContainer) return;
            
            fieldsContainer.innerHTML = '';
            
            // Always ensure minimum 3 fields
            const ticketCategories = data.ticketcategories || [];
            const minFields = 3;
            
            // Add existing ticket categories
            ticketCategories.forEach(ticketCategory => {
                addTicketCategoryField(ticketCategory);
            });
            
            // Add empty fields to reach minimum
            while (fieldsContainer.children.length < minFields) {
                addTicketCategoryField();
            }
        })
        .catch(error => {
            console.error('Error loading ticket categories:', error);
            showToast('Error loading ticket categories', 'error');
        });
}

function updateTicketCategory(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const descriptionInput = fieldDiv.querySelector('input[data-field="description"]');
    const ticketCategoryId = nameInput.dataset.id;
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    
    if (!name) {
        showToast('Ticket category name is required', 'error');
        nameInput.focus();
        return;
    }
    
    const data = {
        name: name,
        description: description
    };
    
    let url, method;
    if (ticketCategoryId) {
        url = `/general-settings/api/ticketcategories/${ticketCategoryId}/`;
        method = 'PUT';
    } else {
        url = '/general-settings/api/ticketcategories/';
        method = 'POST';
    }
    
    button.disabled = true;
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            const ticketCategory = result.ticketcategory;
            nameInput.dataset.id = ticketCategory.id;
            nameInput.dataset.original = ticketCategory.name;
            descriptionInput.dataset.original = ticketCategory.description;
            
            resetFieldState(fieldDiv);
            showToast(`Ticket category ${ticketCategoryId ? 'updated' : 'created'} successfully`, 'success');
            
            // Removed automatic field addition
        } else {
            showToast(result.error || 'Failed to save ticket category', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving ticket category:', error);
        showToast('Error saving ticket category', 'error');
    })
    .finally(() => {
        button.disabled = false;
        ensureMinimumFields('ticketCategoryFields', 3, addTicketCategoryField);
    });
}

function deleteTicketCategory(button) {
    const fieldDiv = button.closest('.invite-field');
    const nameInput = fieldDiv.querySelector('input[data-field="name"]');
    const ticketCategoryId = nameInput.dataset.id;
    const name = nameInput.value || 'this ticket category';
    
    if (!ticketCategoryId) {
        // If no ID, just remove the field
        fieldDiv.remove();
        ensureMinimumFields('ticketCategoryFields', 3, addTicketCategoryField);
        return;
    }
    
    openDeleteModal(name, 'ticket category', function() {
        fetch(`/general-settings/api/ticketcategories/${ticketCategoryId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                fieldDiv.remove();
                showToast('Ticket category deleted successfully', 'success');
                ensureMinimumFields('ticketCategoryFields', 3, addTicketCategoryField);
            } else {
                showToast(result.error || 'Failed to delete ticket category', 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting ticket category:', error);
            showToast('Error deleting ticket category', 'error');
        });
    });
}
