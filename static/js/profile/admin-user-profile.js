document.addEventListener('DOMContentLoaded', function() {
    // Global variables and initialization
    let currentEditingCard = null;
    let currentEditingEducation = null;
    let pendingAction = null;
    let originalCardData = {};

    // DOM element references
    const educationModal = document.getElementById('educationModal');
    const educationForm = document.getElementById('education-form');
    const saveEducationBtn = document.getElementById('save-education-btn');
    const addEducationBtn = document.getElementById('add-education-btn');
    const unsavedChangesModal = document.getElementById('unsavedChangesModal');
    const discardChangesBtn = document.getElementById('discard-changes-btn');
    const saveAndContinueBtn = document.getElementById('save-and-continue-btn');
    const tabButtons = document.querySelectorAll('.tab');
    const tabPanes = document.querySelectorAll('.tab-panel');

    // Initialize modal state
    if (educationModal) {
        educationModal.style.display = 'none';
        educationModal.classList.remove('show');
        console.log('Education modal initialized and hidden');
    }

    // Enhanced tab functionality for new design
    const enhancedTabs = document.querySelectorAll('.profile-tab');
    const enhancedTabPanels = document.querySelectorAll('.tab-panel');
    
    enhancedTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.target;
            
            // Remove active class from all tabs and panels
            enhancedTabs.forEach(t => t.classList.remove('active'));
            enhancedTabPanels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            this.classList.add('active');
            const targetPanel = document.getElementById(target);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Original tab functionality (backward compatibility)
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.dataset.target;
            if (currentEditingCard && hasUnsavedChanges()) {
                pendingAction = () => switchTab(targetTab);
                showUnsavedChangesModal();
                return;
            }
            switchTab(targetTab);
        });
    });

    // --- Tab persistence logic ---
    function setLastActiveTab(tabId) {
        localStorage.setItem('profile_last_active_tab', tabId);
    }
    function getLastActiveTab() {
        return localStorage.getItem('profile_last_active_tab');
    }

    // Listen for tab switches and store the last active tab
    const enhancedTabButtons = document.querySelectorAll('.profile-tab');
    enhancedTabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = btn.dataset.target;
            if (target) setLastActiveTab(target);
        });
    });

    // On page load, activate the last tab if present
    window.addEventListener('DOMContentLoaded', function() {
        const lastTab = getLastActiveTab();
        if (lastTab) {
            const tabBtn = document.querySelector(`.profile-tab[data-target="${lastTab}"]`);
            if (tabBtn) tabBtn.click();
        }
    });
    // --- End tab persistence logic ---

    // Utility functions
    function getCsrfToken() {
        const csrfForm = document.getElementById('hidden-csrf-form');
        if (csrfForm) {
            const csrfInput = csrfForm.querySelector('[name=csrfmiddlewaretoken]');
            return csrfInput ? csrfInput.value : '';
        }
        return '';
    }

    function showModal(modal) {
        if (modal) {
            // Ensure modal is properly displayed
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            // Focus first input in modal
            setTimeout(() => {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);

            console.log('Modal shown:', modal.id);
        }
    }

    function hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';

            // Hide modal completely after transition
            setTimeout(() => {
                if (!modal.classList.contains('show')) {
                    modal.style.display = 'none';
                }
            }, 300); // Match CSS transition duration

            console.log('Modal hidden:', modal.id);
        }
    }

    // Animate percentage and progress bar from 0 to target
    let hasAnimatedCompletion = false;
    function animatePercentage(target, element, bar) {
        let current = 0;
        const duration = 2000;
        const stepTime = Math.max(Math.floor(duration / target), 10);
        const increment = target > 0 ? 1 : 0;
        element.textContent = "0%";
        bar.style.width = "0%";
        let interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            element.textContent = `${current}%`;
            bar.style.width = `${current}%`;
        }, stepTime);
    }

    // Enhanced profile completion calculation
    function calculateProfileCompletion() {
        // Use group-based completion calculation
        const personalStatus = checkPersonalInfoStatus();
        const contactStatus = checkContactPersonStatus();
        const employmentStatus = checkEmploymentStatus();
        
        // Check education status
        const educationRecords = document.querySelectorAll('.timeline-item[data-education-id]');
        const educationStatus = educationRecords.length > 0 ? 'complete' : 'none';
        
        // Count completed groups
        let completedGroups = 0;
        const totalGroups = 4; // personal, contact, employment, education
        
        if (personalStatus === 'complete') completedGroups++;
        if (contactStatus === 'complete') completedGroups++;
        if (employmentStatus === 'complete') completedGroups++;
        if (educationStatus === 'complete') completedGroups++;
        
        const percentage = Math.round((completedGroups / totalGroups) * 100);
        
        // Update UI
        const percentageElement = document.getElementById('completion-percentage');
        const progressBar = document.querySelector('.progress-bar');
        const messageElement = document.getElementById('completion-message');
        
        if (percentageElement && progressBar) {
            if (!hasAnimatedCompletion) {
                animatePercentage(percentage, percentageElement, progressBar);
                hasAnimatedCompletion = true;
            } else {
                percentageElement.textContent = `${percentage}%`;
                progressBar.style.width = `${percentage}%`;
            }
            let color = '';
            if (percentage < 30) {
                color = '#ef4444'; // red
            } else if (percentage < 60) {
                color = '#f59e0b'; // orange
            } else if (percentage < 90) {
                color = '#fbbf24'; // yellow
            } else if (percentage < 100) {
                color = '#10b981'; // green
            } else {
                color = '#6366f1'; // blue
            }
            percentageElement.style.color = color;
        }
        
        if (progressBar) {
            let barColor = '';
            if (percentage < 30) {
                barColor = 'linear-gradient(90deg, #ef4444, #f87171)';
            } else if (percentage < 60) {
                barColor = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
            } else if (percentage < 90) {
                barColor = 'linear-gradient(90deg, #fbbf24, #fde68a)';
            } else if (percentage < 100) {
                barColor = 'linear-gradient(90deg, #10b981, #6ee7b7)';
            } else {
                barColor = 'linear-gradient(90deg, #6366f1, #818cf8)';
            }
            progressBar.style.background = barColor;
        }
        
        if (messageElement) {
            let message = '';
            if (percentage < 25) {
                message = "Let's get started! Add more info to your profile.";
            } else if (percentage < 50) {
                message = "You're making progress! Keep going.";
            } else if (percentage < 75) {
                message = "Almost there! Just a few more steps.";
            } else if (percentage < 100) {
                message = "So close! Complete the last details.";
            } else {
                message = "Awesome! Your profile is 100% complete.";
            }
            messageElement.textContent = message;
        }



        // Special handling for personal information group
        function checkPersonalInfoStatus() {
            const personalInfoCard = document.querySelector('[data-group="personal-info"]');
            if (!personalInfoCard) return 'none';
            
            // Define required fields for personal information completion
            const requiredFields = [
                'gender',
                'birth_date', 
                'birth_place',
                'contact_number',
                'present_barangay',
                'present_city',
                'present_province',
                'present_country',
                'provincial_barangay',
                'provincial_city',
                'provincial_province',
                'provincial_country'
            ];
            
            let filled = 0;
            const total = requiredFields.length;
            
            // Check each required field
            requiredFields.forEach(fieldName => {
                // First try to find the form input
                const field = personalInfoCard.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    const value = field.value ? field.value.trim() : '';
                    if (value && value !== '') {
                        filled++;
                        return;
                    }
                }
                
                // If form input is empty or not found, check the form-value div
                const formGroup = personalInfoCard.querySelector(`[name="${fieldName}"]`).closest('.form-group');
                if (formGroup) {
                    const formValueDiv = formGroup.querySelector('.form-value');
                    if (formValueDiv) {
                        const textContent = formValueDiv.textContent ? formValueDiv.textContent.trim() : '';
                        if (textContent && textContent !== '-') {
                            filled++;
                        }
                    }
                }
            });
            
            if (filled === 0) return 'none';
            if (filled === total) return 'complete';
            return 'partial';
        }

        // Special handling for contact person group
        function checkContactPersonStatus() {
            const personalInfoCard = document.querySelector('[data-group="personal-info"]');
            if (!personalInfoCard) return 'none';
            
            // Find the Emergency Contact section
            const emergencySection = personalInfoCard.querySelector('.form-section:last-child');
            if (!emergencySection) return 'none';
            
            // Get all form-value divs in the Emergency Contact section
            const formValueDivs = emergencySection.querySelectorAll('.form-value');
            
            let filled = 0;
            const total = formValueDivs.length;
            
            formValueDivs.forEach(div => {
                const textContent = div.textContent ? div.textContent.trim() : '';
                if (textContent && textContent !== '-') {
                    filled++;
                }
            });
            
            if (filled === 0) return 'none';
            if (filled === total) return 'complete';
            return 'partial';
        }

        // Special handling for employment information group
        function checkEmploymentStatus() {
            const employmentCard = document.querySelector('[data-group="employment-info"]');
            if (!employmentCard) return 'none';
            
            // Get all form-value divs in the employment card
            const formValueDivs = employmentCard.querySelectorAll('.form-value');
            
            let filled = 0;
            const total = formValueDivs.length;
            
            formValueDivs.forEach(div => {
                const textContent = div.textContent ? div.textContent.trim() : '';
                if (textContent && textContent !== '-') {
                    filled++;
                }
            });
            
            if (filled === 0) return 'none';
            if (filled === total) return 'complete';
            return 'partial';
        }

        // Set group icons
        function setGroupIcon(group, status) {
            const iconEl = document.getElementById(`icon-${group}`);
            if (!iconEl) return;
            if (status === 'complete') {
                iconEl.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981"></i>';
            } else if (status === 'partial') {
                iconEl.innerHTML = '<i class="fas fa-hourglass-half" style="color:#fbbf24"></i>';
            } else {
                iconEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444"></i>';
            }
        }

        setGroupIcon('personal', checkPersonalInfoStatus());
        setGroupIcon('contact', checkContactPersonStatus());
        setGroupIcon('employment', checkEmploymentStatus());
        // Education group
        const educationRecordsForGroup = document.querySelectorAll('.timeline-item[data-education-id]');
        if (educationRecordsForGroup.length > 0) {
            setGroupIcon('education', 'complete');
        } else {
            setGroupIcon('education', 'none');
        }

        // Hide progress-card-content when profile is 100% complete
        const progressCardContent = document.querySelector('.progress-card-content');
        if (progressCardContent) {
            if (percentage === 100) {
                progressCardContent.style.display = 'none';
            } else {
                progressCardContent.style.display = 'block';
            }
        }
    }

    // Enhanced avatar functionality
    function initializeAvatarUpload() {
        const avatarContainer = document.querySelector('.profile-avatar-container');
        const avatarImg = document.querySelector('.profile-avatar');
        const avatarOverlay = document.querySelector('.avatar-edit-overlay');

        if (avatarContainer && avatarImg) {
            // Create hidden file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            // Handle avatar click
            avatarContainer.addEventListener('click', function() {
                fileInput.click();
            });

            // Handle file selection
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        avatarImg.src = e.target.result;
                        // Here you would typically upload the file to the server
                        console.log('Avatar changed - implement upload functionality');
                        showToast('Avatar updated successfully!', 'success');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    // Card editing functions
    function storeCardData(group) {
        const card = document.querySelector(`[data-group="${group}"]`);
        if (!card) return;

        originalCardData[group] = {};
        const inputs = card.querySelectorAll('.form-input');

        inputs.forEach(input => {
            if (input.name) {
                originalCardData[group][input.name] = input.value || '';
            }
        });

        console.log(`Stored original data for ${group}:`, originalCardData[group]);
    }

    function restoreCardData(group) {
        const card = document.querySelector(`[data-group="${group}"]`);
        if (!card || !originalCardData[group]) return;

        const inputs = card.querySelectorAll('.form-input');

        inputs.forEach(input => {
            if (input.name && originalCardData[group][input.name] !== undefined) {
                input.value = originalCardData[group][input.name];
            }
        });

        console.log(`Restored original data for ${group}`);
    }

    function hasUnsavedChanges() {
        if (!currentEditingCard || !originalCardData[currentEditingCard]) return false;

        const card = document.querySelector(`[data-group="${currentEditingCard}"]`);
        if (!card) return false;

        const inputs = card.querySelectorAll('.form-input');

        for (let input of inputs) {
            // Only check visible, enabled inputs
            if (input.offsetParent !== null &&
                input.style.display !== 'none' &&
                !input.disabled &&
                input.name) {

                const originalValue = originalCardData[currentEditingCard][input.name] || '';
                const currentValue = input.value || '';

                if (originalValue !== currentValue) {
                    return true;
                }
            }
        }

        return false;
    }

    function detectUnsavedChanges() {
        if (currentEditingCard) {
            const card = document.querySelector(`[data-group="${currentEditingCard}"]`);
            if (card) {
                if (hasUnsavedChanges()) {
                    card.classList.add('has-changes');
                } else {
                    card.classList.remove('has-changes');
                }
            }
        }
    }

    function exitEditMode(group) {
        const card = document.querySelector(`[data-group="${group}"]`);
        if (!card) return;

        restoreCardData(group);
        card.classList.remove('edit-mode', 'has-changes');
        currentEditingCard = null;

        // Hide card actions and show edit button
        const cardActions = card.querySelector('.card-actions');
        if (cardActions) {
            cardActions.style.display = 'none';
        }
        const editBtn = card.querySelector('.edit-card-btn');
        if (editBtn) {
            editBtn.style.display = '';
        }

        // Switch back to display mode
        const detailValues = card.querySelectorAll('.form-value');
        const formInputs = card.querySelectorAll('.form-input');

        detailValues.forEach(value => {
            value.style.display = 'block';
        });

        formInputs.forEach(input => {
            input.classList.remove('error');
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });

        console.log(`Edit mode exited for ${group}`);
    }

    function startEditCard(group) {
        const card = document.querySelector(`[data-group="${group}"]`);
        if (!card) return;

        storeCardData(group);
        card.classList.add('edit-mode');
        currentEditingCard = group;

        const detailValues = card.querySelectorAll('.form-value');
        const editInputs = card.querySelectorAll('.form-input');
        const editInputGroups = card.querySelectorAll('.edit-input-group');
        const editBtn = card.querySelector('.edit-card-btn');
        const cardActions = card.querySelector('.card-actions');

        // Handle form display/edit mode switching
        if (group === 'employment-info') {
            // For employment info, handle non-editable fields for non-HR admins
            detailValues.forEach(value => {
                const formGroup = value.closest('.form-group');
                const input = formGroup ? formGroup.querySelector('.form-input') : null;
                const fieldName = input ? input.name : null;

                // Check if this field should be editable for non-HR admin users
                const editableFields = ['department', 'line', 'approver'];
                const isHROnlyField = !editableFields.includes(fieldName);

                if (isHROnlyField && !window.isHRAdmin) {
                    // Keep the field as display-only for non-HR admin users
                    value.style.display = 'block';
                    // input.style.display handled by CSS
                } else {
                    // Hide display value and show input for editable fields
                    value.style.display = 'none';
                    // input.style.display handled by CSS
                }
            });
        } else {
            // For other groups, hide all display values and show all inputs
            detailValues.forEach(value => {
                value.style.display = 'none';
            });

            // input.style.display handled by CSS
        }

        editInputGroups.forEach(group => {
            group.style.display = 'flex';
        });

        // Hide edit button and show card actions (Save/Cancel buttons)
        if (editBtn) {
            editBtn.style.display = 'none';
        }
        if (cardActions) {
            cardActions.style.display = 'flex';
            console.log(`Card actions for ${group} are now visible`);
        }

        // Focus first visible input
        const firstInput = card.querySelector('.form-input:not([style*="display: none"]):not([disabled])');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
                console.log(`Focused on first input: ${firstInput.name}`);
            }, 100);
        }

        // Add input event listeners to clear error styling on user input
        const inputs = card.querySelectorAll('.form-input');
        inputs.forEach(input => {
            // Remove existing listeners to prevent duplicates
            input.removeEventListener('input', clearErrorStyling);
            input.removeEventListener('change', clearErrorStyling);

            // Add new listeners
            input.addEventListener('input', clearErrorStyling);
            input.addEventListener('change', clearErrorStyling);
        });

        console.log(`Edit mode activated for ${group} with ${inputs.length} form inputs`);
    }

    // Helper function to clear error styling
    function clearErrorStyling() {
        this.classList.remove('error');
        this.style.borderColor = '';
        this.style.boxShadow = '';
    }

    function saveCardChanges(group, callback) {
        console.log('=== saveCardChanges called for group:', group, '===');
        const card = document.querySelector(`[data-group="${group}"]`);
        if (!card) {
            console.log('Card not found, returning');
            return;
        }

        // Check if card is in edit mode
        if (!card.classList.contains('edit-mode')) {
            console.log('Card is not in edit mode, cannot save');
            return;
        }

        // Comprehensive client-side validation using required attribute
        const emptyFields = [];
        const allInputs = card.querySelectorAll('.form-input[required]');

        console.log(`Found ${allInputs.length} required inputs in card:`);

        // Perform validation on all required fields
        let validationPassed = true;

        allInputs.forEach(input => {
            // Check if input is visible and enabled
            const isVisible = input.offsetParent !== null &&
                             input.style.display !== 'none' &&
                             !input.disabled;

            console.log(`Checking ${input.name}: value="${input.value}", visible=${isVisible}, required=${input.hasAttribute('required')}`);

            if (isVisible && input.hasAttribute('required')) {
                const value = input.value ? input.value.trim() : '';

                if (!value || value === '') {
                    // Get field label from the associated label element
                    const formGroup = input.closest('.form-group');
                    const label = formGroup ? formGroup.querySelector('.form-label') : null;
                    const fieldLabel = label ? label.textContent.trim() : input.name;

                    emptyFields.push(fieldLabel);

                    // Add visual feedback
                    input.classList.add('error');
                    input.style.borderColor = '#dc3545';
                    input.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';

                    validationPassed = false;
                    console.log(`Field ${input.name} (${fieldLabel}) is empty and marked as error`);
                } else {
                    // Clear error styling for valid fields
                    input.classList.remove('error');
                    input.style.borderColor = '';
                    input.style.boxShadow = '';
                    console.log(`Field ${input.name} is valid`);
                }
            }
        });


        console.log(`Validation result for ${group}: ${emptyFields.length} empty fields found, validationPassed: ${validationPassed}`);

        // Show validation errors if any
        if (!validationPassed) {
            const fieldNames = emptyFields.slice(0, 3).join(', ');
            const message = emptyFields.length > 3
                ? `Please fill in all required fields: ${fieldNames} and ${emptyFields.length - 3} more...`
                : `Please fill in all required fields: ${fieldNames}`;

            showToast(message, 'error');
            console.log('Validation failed, preventing save');
            console.log('Empty fields:', emptyFields);

            // Scroll to first error field
            const firstErrorField = card.querySelector('.form-input.error');
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => firstErrorField.focus(), 300);
            }

            return; // Stop execution here
        }

        console.log('Validation passed, proceeding with save');

        // Collect form data from all form inputs (not just edit-input)
        const formData = new FormData();
        const inputs = card.querySelectorAll('.form-input');

        console.log(`Collecting data from ${inputs.length} form inputs:`);

        inputs.forEach(input => {
            // Only collect data from visible, enabled inputs
            const isVisible = input.offsetParent !== null &&
                             input.style.display !== 'none' &&
                             !input.disabled;

            if (isVisible && input.name) {
                let value;
                if (input.type === 'checkbox') {
                    value = input.checked;
                } else if (input.type === 'radio') {
                    if (input.checked) {
                        value = input.value;
                    } else {
                        return; // Skip unchecked radio buttons
                    }
                } else {
                    value = input.value || '';
                }

                formData.append(input.name, value);
                console.log(`Added to FormData: ${input.name} = "${value}"`);
            } else {
                console.log(`Skipped input: ${input.name} (visible: ${isVisible})`);
            }
        });

        formData.append('group', group);
        formData.append('csrfmiddlewaretoken', getCsrfToken());

        console.log('FormData prepared, sending request...');

        let endpoint = '/profile/update-profile-section/';
        if (group === 'employment-info') {
            const employmentForm = document.getElementById('editEmploymentForm');
            if (employmentForm) {
                const employeeId = employmentForm.getAttribute('data-employee-id');
                if (employeeId) {
                    endpoint = `/profile/admin/employee/${employeeId}/update/`;
                }
            }
        }
        fetch(endpoint, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message || 'Information updated successfully', 'success');
                
                // Update display values
                if (data.updated_data) {
                    updateDisplayValues(card, data.updated_data);
                }
                
                card.classList.remove('edit-mode', 'has-changes');
                currentEditingCard = null;
                
                // Recalculate profile completion
                calculateProfileCompletion();
                
                if (callback) callback();
                // Refresh page and restore last tab
                setTimeout(() => { location.reload(); }, 800);
                return;
            } else {
                showToast(data.message || 'Error updating information', 'error');
                if (data.errors) {
                    displayFormErrors(data.errors, card);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while saving', 'error');
        });
    }

    function updateDisplayValues(card, updatedData) {
        const fieldMappings = {
            'first_name': 'first_name',
            'middle_name': 'middle_name',
            'last_name': 'last_name',
            'nickname': 'nickname',
            'email': 'email',
            'work_email': 'work_email',
            'gender': 'gender',
            'birth_date': 'birth_date',
            'birth_place': 'birth_place',
            'contact_number': 'contact_number',
            'present_country': 'present_country',
            'present_province': 'present_province',
            'present_city': 'present_city',
            'present_barangay': 'present_barangay',
            'present_block_lot': 'present_block_lot',
            'provincial_country': 'provincial_country',
            'provincial_province': 'provincial_province',
            'provincial_city': 'provincial_city',
            'provincial_barangay': 'provincial_barangay',
            'provincial_street': 'provincial_street',
            'provincial_block_lot': 'provincial_block_lot',
            'contact_name': 'contact_name',
            'contact_relationship': 'contact_relationship',
            'contact_contact_number': 'contact_contact_number',
            'contact_address': 'contact_address',
            'position': 'position',
            'department': 'department',
            'line': 'line',
            'employment_type': 'employment_type',
            'date_hired': 'date_hired',
            'approver': 'approver',
            'tin_number': 'tin_number',
            'sss_number': 'sss_number',
            'hdmf_number': 'hdmf_number',
            'philhealth_number': 'philhealth_number',
            'bank_account': 'bank_account',
            'mother_name': 'mother_name',
            'father_name': 'father_name',
            'spouse_name': 'spouse_name',
            'children_names': 'children_names'
        };

        Object.keys(updatedData).forEach(key => {
            const fieldName = fieldMappings[key];
            if (fieldName) {
                const detailItem = card.querySelector(`[name="${fieldName}"]`);
                if (detailItem) {
                    const detailValue = detailItem.parentNode.querySelector('.detail-value, .form-value');
                    if (detailValue) {
                        detailValue.textContent = updatedData[key] || '-';
                    }
                }
            }
        });

        // Update user basic info if available
        if (updatedData.first_name) {
            const firstNameValue = document.querySelector('.profile-main-name, .profile-name');
            if (firstNameValue) {
                const currentText = firstNameValue.textContent;
                const parts = currentText.split(' ');
                if (parts.length >= 2) {
                    firstNameValue.textContent = `${updatedData.first_name} ${parts[1]}`;
                }
            }
        }

        if (updatedData.last_name) {
            const lastNameValue = document.querySelector('.profile-main-name, .profile-name');
            if (lastNameValue) {
                const currentText = lastNameValue.textContent;
                const parts = currentText.split(' ');
                if (parts.length >= 2) {
                    lastNameValue.textContent = `${parts[0]} ${updatedData.last_name}`;
                }
            }
        }
    }

    function showUnsavedChangesModal() {
        if (unsavedChangesModal) {
            showModal(unsavedChangesModal);
        }
    }

    // Address dropdown functionality
    const philippineData = {
        "Philippines": {
            "Metro Manila": ["Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila", "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig", "Quezon City", "San Juan", "Taguig", "Valenzuela"],
            "Cebu": ["Alcantara", "Alcoy", "Alegria", "Aloguinsan", "Argao", "Asturias", "Badian", "Balamban", "Bantayan", "Barili", "Bogo", "Boljoon", "Borbon", "Carcar", "Carmen", "Catmon", "Cebu City", "Compostela", "Consolacion", "Cordova", "Daanbantayan", "Dalaguete", "Danao", "Dumanjug", "Ginatilan", "Lapu-Lapu", "Liloan", "Madridejos", "Malabuyoc", "Mandaue", "Medellin", "Minglanilla", "Moalboal", "Naga", "Oslob", "Pilar", "Pinamungajan", "Poro", "Ronda", "Samboan", "San Fernando", "San Francisco", "San Remigio", "Santa Fe", "Santander", "Sibonga", "Sogod", "Tabogon", "Tabuelan", "Talisay", "Toledo", "Tuburan", "Tudela"],
            "Laguna": ["Alaminos", "Bay", "Biñan", "Cabuyao", "Calamba", "Calauan", "Cavinti", "Famy", "Kalayaan", "Liliw", "Los Baños", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo", "San Pedro", "Santa Cruz", "Santa Maria", "Santa Rosa", "Siniloan", "Victoria"]
        }
    };

    function handleAddressChange(selectElement) {
        const type = selectElement.dataset.type;
        const address = selectElement.dataset.address;
        const value = selectElement.value;

        if (type === 'country') {
            handleCountryChange(address, value);
        } else if (type === 'province') {
            handleProvinceChange(address, value);
        }
    }

    function handleCountryChange(addressType, countryValue) {
        const provinceSelect = document.querySelector(`select[name="${addressType}_province"]`);
        const citySelect = document.querySelector(`select[name="${addressType}_city"]`);

        if (!provinceSelect || !citySelect) return;

        // Reset and disable dependent dropdowns
        resetDropdown(provinceSelect);
        resetDropdown(citySelect);
        citySelect.disabled = true;

        // Update cascade info messages
        updateCascadeInfo(addressType, 'province', !countryValue || countryValue !== 'Philippines');
        updateCascadeInfo(addressType, 'city', true);

        if (countryValue === 'Philippines') {
            provinceSelect.disabled = false;
            updateProvinces(addressType, countryValue);
        } else {
            provinceSelect.disabled = true;
        }
    }

    function handleProvinceChange(addressType, provinceValue) {
        const citySelect = document.querySelector(`select[name="${addressType}_city"]`);
        if (!citySelect) return;
        resetDropdown(citySelect);
        updateCascadeInfo(addressType, 'city', !provinceValue);
        if (provinceValue) {
            citySelect.disabled = false;
            updateCities(addressType, provinceValue);
        } else {
            citySelect.disabled = true;
        }
    }

    function updateCascadeInfo(addressType, fieldType, show) {
        const fieldName = `${addressType}_${fieldType}`;
        const select = document.querySelector(`select[name="${fieldName}"]`);

        if (!select) return;

        const cascadeInfo = select.parentNode.querySelector('.cascade-info');
        if (cascadeInfo) {
            if (show) {
                cascadeInfo.classList.add('show');
            } else {
                cascadeInfo.classList.remove('show');
            }
        }
    }

    function resetDropdown(selectElement) {
        selectElement.innerHTML = '<option value="">Select ' +
            (selectElement.name.includes('province') ? 'Province' : 'City/Municipality') + '</option>';
        selectElement.value = '';
    }

    function updateProvinces(addressType, country) {
        const provinceSelect = document.querySelector(`select[name="${addressType}_province"]`);
        const citySelect = document.querySelector(`select[name="${addressType}_city"]`);
        
        // Clear existing options
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        
        if (country && philippineData[country]) {
            const provinces = Object.keys(philippineData[country]);
            provinces.forEach(province => {
                const option = document.createElement('option');
                option.value = province;
                option.textContent = province;
                provinceSelect.appendChild(option);
            });
        }
    }

    function updateCities(addressType, province) {
        const countrySelect = document.querySelector(`select[name="${addressType}_country"]`);
        const citySelect = document.querySelector(`select[name="${addressType}_city"]`);
        const country = countrySelect.value;
        
        // Clear existing options
        citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        
        if (country && philippineData[country] && philippineData[country][province]) {
            const cities = philippineData[country][province];
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
    }

    // Department/Line dropdown functionality
    function handleDepartmentLineDropdowns() {
        const departmentSelect = document.querySelector('select[name="department"]');
        const lineSelect = document.querySelector('select[name="line"]');
        const approverSelect = document.querySelector('select[name="approver"]');

        if (!departmentSelect || !lineSelect) return;

        function populateLines(departmentOption) {
            const lines = departmentOption.dataset.lines;
            lineSelect.innerHTML = '<option value="">Select Line</option>';
            if (lines) {
                const lineArray = lines.split(',');
                lineArray.forEach(linePair => {
                    const [id, name] = linePair.split(':');
                    if (id && name) {
                        const option = document.createElement('option');
                        option.value = id.trim();
                        option.textContent = name.trim();
                        lineSelect.appendChild(option);
                    }
                });
            }
        }

        async function populateApprovers(departmentName) {
            if (!approverSelect) return;
            
            try {
                const response = await fetch(`/profile/api/approvers/?department=${encodeURIComponent(departmentName)}`);
                const data = await response.json();
                
                approverSelect.innerHTML = '<option value="">Select Approver</option>';
                
                if (data.approvers) {
                    data.approvers.forEach(approver => {
                        const option = document.createElement('option');
                        option.value = approver.id;
                        option.textContent = approver.name;
                        approverSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error fetching approvers:', error);
            }
        }

        departmentSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                lineSelect.disabled = false;
                populateLines(selectedOption);
                
                // Enable and populate approver dropdown
                if (approverSelect) {
                    approverSelect.disabled = false;
                    populateApprovers(selectedOption.value);
                }
            } else {
                lineSelect.disabled = true;
                lineSelect.innerHTML = '<option value="">Select Line</option>';
                
                // Disable approver dropdown
                if (approverSelect) {
                    approverSelect.disabled = true;
                    approverSelect.innerHTML = '<option value="">Select Approver</option>';
                }
            }
        });

        // On edit mode open, set initial state
        function initialize() {
            const currentDept = departmentSelect.getAttribute('data-current-value');
            if (currentDept) {
                for (let i = 0; i < departmentSelect.options.length; i++) {
                    if (departmentSelect.options[i].value === currentDept) {
                        departmentSelect.selectedIndex = i;
                        lineSelect.disabled = false;
                        populateLines(departmentSelect.options[i]);
                        
                        // Initialize approver dropdown
                        if (approverSelect) {
                            approverSelect.disabled = false;
                            populateApprovers(currentDept).then(() => {
                                const currentApprover = approverSelect.getAttribute('data-current-value');
                                if (currentApprover) {
                                    approverSelect.value = currentApprover;
                                }
                            });
                        }
                        break;
                    }
                }
                const currentLine = lineSelect.getAttribute('data-current-value');
                if (currentLine) {
                    for (let i = 0; i < lineSelect.options.length; i++) {
                        if (lineSelect.options[i].value === currentLine) {
                            lineSelect.options[i].selected = true;
                            break;
                        }
                    }
                }
            } else {
                lineSelect.disabled = true;
                lineSelect.innerHTML = '<option value="">Select Line</option>';
                
                if (approverSelect) {
                    approverSelect.disabled = true;
                    approverSelect.innerHTML = '<option value="">Select Approver</option>';
                }
            }
        }

        // Run on edit mode open
        document.querySelectorAll('.edit-card-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (btn.dataset.group === 'employment-info') {
                    setTimeout(initialize, 10);
                }
            });
        });
    }

    // Education modal functions
    function openEducationModal(educationId = null) {
        if (!educationModal) {
            console.error('Education modal not found');
            return;
        }

        currentEditingEducation = educationId;
        const modalTitle = document.getElementById('educationModalTitle');
        const form = educationForm;

        // Always reset form first
        if (form) {
            form.reset();
        }

        console.log('Opening education modal for:', educationId || 'new education');

        if (educationId) {
            modalTitle.textContent = 'Edit Education';
            
            // Fetch education data and populate form
            const educationItem = document.querySelector(`[data-education-id="${educationId}"]`);
            if (educationItem) {
                // Extract data from timeline item (simplified approach)
                const level = educationItem.querySelector('.timeline-level-badge').textContent;
                const school = educationItem.querySelector('.timeline-school').textContent;
                const degree = educationItem.querySelector('.timeline-degree').textContent;
                const year = educationItem.querySelector('.timeline-year').textContent;
                const honors = educationItem.querySelector('.timeline-honors')?.textContent?.replace('🏆 ', '') || '';

                form.querySelector('[name="level"]').value = level;
                form.querySelector('[name="school_name"]').value = school;
                form.querySelector('[name="degree_course"]').value = degree;
                form.querySelector('[name="year_graduated"]').value = year === 'Ongoing' ? '' : year;
                form.querySelector('[name="honors_awards"]').value = honors;
            }
        } else {
            modalTitle.textContent = 'Add Education';
        }

        showModal(educationModal);
        
        // Ensure form inputs are visible and accessible after modal is shown
        setTimeout(() => {
            if (form) {
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    input.style.display = '';
                    input.style.visibility = 'visible';
                    input.style.opacity = '1';
                });
            }
        }, 100);
    }

    function saveEducation() {
        const form = educationForm;
        const formData = new FormData(form);
        
        saveEducationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveEducationBtn.disabled = true;

        if (currentEditingEducation) {
            formData.append('education_id', currentEditingEducation);
        }

        const url = currentEditingEducation ? 
            `/profile/update-education/${currentEditingEducation}/` :
            '/profile/add-education/';

        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(data.message || 'Education saved successfully', 'success');
                hideModal(educationModal);
                refreshEducationTimeline();
                calculateProfileCompletion();
            } else {
                showToast(data.message || 'Error saving education', 'error');
                if (data.errors) {
                    displayFormErrors(data.errors, form);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('An error occurred while saving', 'error');
        })
        .finally(() => {
            saveEducationBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveEducationBtn.disabled = false;
        });
    }

    function refreshEducationTimeline() {
        // Reload the page to refresh the education timeline
        // In a real implementation, you might want to use AJAX to refresh just the timeline
        window.location.reload();
    }

    function displayFormErrors(errors, form) {
        // Clear previous errors
        form.querySelectorAll('.field-error').forEach(error => error.remove());
        form.querySelectorAll('.form-input.error').forEach(input => input.classList.remove('error'));

        // Display new errors
        Object.keys(errors).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.add('error');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.textContent = errors[fieldName][0];
                field.parentNode.appendChild(errorDiv);
            }
        });
    }

    function switchTab(targetTab) {
        exitAllEditModes();
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        const targetButton = document.querySelector(`[data-target="${targetTab}"]`);
        const targetPane = document.getElementById(targetTab);

        if (targetButton && targetPane) {
            targetButton.classList.add('active');
            targetPane.classList.add('active');
        }
    }

    function exitAllEditModes() {
        document.querySelectorAll('.profile-card.edit-mode').forEach(card => {
            card.classList.remove('edit-mode', 'has-changes');
            const cardActions = card.querySelector('.card-actions');
            if (cardActions) cardActions.style.display = 'none';
            const editBtn = card.querySelector('.edit-card-btn');
            if (editBtn) editBtn.style.display = '';
            // Switch back to display mode
            const detailValues = card.querySelectorAll('.form-value');
            detailValues.forEach(value => value.style.display = 'block');
            // No need to set input.style.display, CSS handles it
            const formInputs = card.querySelectorAll('.form-input');
            formInputs.forEach(input => {
                input.classList.remove('error');
                input.style.borderColor = '';
                input.style.boxShadow = '';
            });
        });
    }

    // Initialize form animations
    function initializeFormAnimations() {
        const formInputs = document.querySelectorAll('.form-input');
        
        formInputs.forEach(input => {
            // Add focus effects
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
                if (this.value.trim() === '') {
                    this.parentElement.classList.remove('filled');
                } else {
                    this.parentElement.classList.add('filled');
                }
            });
            
            // Initial state
            if (input.value.trim() !== '') {
                input.parentElement.classList.add('filled');
            }
        });
    }

    // Initialize progress animations
    function initializeProgressAnimations() {
        const progressBar = document.querySelector('.progress-bar');
        const progressItems = document.querySelectorAll('.progress-item');
        
        // Animate progress bar on load
        if (progressBar) {
            const targetWidth = progressBar.style.width;
            progressBar.style.width = '0%';
            setTimeout(() => {
                progressBar.style.width = targetWidth;
            }, 500);
        }
        
        // Animate progress items with stagger
        progressItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 700 + (index * 100));
        });
    }

    // Initialize timeline animations
    function initializeTimelineAnimations() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        // Intersection Observer for timeline items
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        timelineItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(30px)';
            item.style.transition = `all 0.6s ease ${index * 0.1}s`;
            observer.observe(item);
        });
    }

    // Initialize keyboard shortcuts
    function initializeKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Escape key to cancel edit mode
            if (e.key === 'Escape') {
                const editModeCard = document.querySelector('.profile-card.edit-mode');
                if (editModeCard) {
                    const cancelBtn = editModeCard.querySelector('.cancel-card-btn');
                    if (cancelBtn) {
                        cancelBtn.click();
                    }
                }
            }
            
            // Ctrl/Cmd + S to save (prevent default and trigger save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const editModeCard = document.querySelector('.profile-card.edit-mode');
                if (editModeCard) {
                    const saveBtn = editModeCard.querySelector('.save-card-btn');
                    if (saveBtn) {
                        saveBtn.click();
                    }
                }
            }
        });
    }

    // Event listeners
    document.querySelectorAll('.edit-card-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.dataset.group;
            if (currentEditingCard && currentEditingCard !== group && hasUnsavedChanges()) {
                pendingAction = () => startEditCard(group);
                showUnsavedChangesModal();
                return;
            }
            startEditCard(group);
        });
    });

    document.querySelectorAll('.cancel-card-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.dataset.group;
            exitEditMode(group);
        });
    });

    document.querySelectorAll('.save-card-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.dataset.group;
            saveCardChanges(group);
        });
    });

    // Unsaved changes modal handlers
    if (discardChangesBtn) {
        discardChangesBtn.addEventListener('click', function() {
            if (currentEditingCard) {
                exitEditMode(currentEditingCard);
            }
            hideModal(unsavedChangesModal);
            if (pendingAction) {
                pendingAction();
                pendingAction = null;
            }
        });
    }

    if (saveAndContinueBtn) {
        saveAndContinueBtn.addEventListener('click', function() {
            if (currentEditingCard) {
                saveCardChanges(currentEditingCard, () => {
                    hideModal(unsavedChangesModal);
                    if (pendingAction) {
                        pendingAction();
                        pendingAction = null;
                    }
                });
            }
        });
    }

    // Monitor input changes for unsaved changes detection
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('form-input') && currentEditingCard) {
            detectUnsavedChanges();
        }
        // Recalculate profile completion on form changes
        calculateProfileCompletion();
    });

    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('form-input') && currentEditingCard) {
            detectUnsavedChanges();
        }

        // Handle cascading address dropdowns
        if (e.target.classList.contains('address-select')) {
            handleAddressChange(e.target);
        }
        
        // Recalculate profile completion on form changes
        calculateProfileCompletion();
    });

    // Education timeline handlers
    if (addEducationBtn) {
        addEducationBtn.addEventListener('click', function() {
            openEducationModal();
        });
    }

    if (saveEducationBtn) {
        saveEducationBtn.addEventListener('click', function() {
            saveEducation();
        });
    }

    // Modal close button handlers
    const closeEducationModal = document.getElementById('closeEducationModal');
    const cancelEducationBtn = document.getElementById('cancelEducationBtn');
    
    if (closeEducationModal) {
        closeEducationModal.addEventListener('click', function() {
            hideModal(educationModal);
            if (educationForm) {
                educationForm.reset();
                currentEditingEducation = null;
            }
        });
    }
    
    if (cancelEducationBtn) {
        cancelEducationBtn.addEventListener('click', function() {
            hideModal(educationModal);
            if (educationForm) {
                educationForm.reset();
                currentEditingEducation = null;
            }
        });
    }

    // Close modal handlers
    document.addEventListener('click', function(e) {
        // Close modal when clicking close button or overlay
        if (e.target.classList.contains('modal-close') ||
            e.target.classList.contains('modal-overlay') ||
            e.target.id === 'closeEducationModal' ||
            e.target.id === 'cancelEducationBtn') {

            console.log('Closing education modal via click');
            hideModal(educationModal);

            // Reset form when closing
            if (educationForm) {
                educationForm.reset();
                currentEditingEducation = null;
            }
        }
    });

    // Close modal when clicking on overlay
    if (educationModal) {
        const modalOverlay = educationModal.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function() {
                hideModal(educationModal);
                if (educationForm) {
                    educationForm.reset();
                    currentEditingEducation = null;
                }
            });
        }
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-education-btn')) {
            const educationItem = e.target.closest('.education-item');
            const educationId = educationItem.dataset.id;
            editEducation(educationId, educationItem);
        }

        if (e.target.classList.contains('delete-education-btn')) {
            const educationItem = e.target.closest('.education-item');
            const educationId = educationItem.dataset.id;
            deleteEducation(educationId, educationItem);
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                hideModal(openModal);
                // Reset education form if it's the education modal
                if (openModal === educationModal && educationForm) {
                    educationForm.reset();
                    currentEditingEducation = null;
                }
            }
        }
    });

    // Global functions for timeline actions
    window.editEducation = function(educationId) {
        openEducationModal(educationId);
    };

    window.deleteEducation = function(educationId) {
        if (confirm('Are you sure you want to delete this education record?')) {
            fetch(`/profile/delete-education/${educationId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Education deleted successfully', 'success');
                    refreshEducationTimeline();
                    calculateProfileCompletion();
                } else {
                    showToast(data.message || 'Error deleting education', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred while deleting', 'error');
            });
        }
    };

    // Global toast function for notifications
    window.showToast = function(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '24px';
            toastContainer.style.right = '24px';
            toastContainer.style.zIndex = '1100';
            toastContainer.style.display = 'flex';
            toastContainer.style.flexDirection = 'column';
            toastContainer.style.gap = '12px';
            document.body.appendChild(toastContainer);
        }
        let toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.minWidth = '300px';
        toast.style.maxWidth = '500px';
        toast.style.marginBottom = '0';
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toastContainer.removeChild(toast), 300);
        }, 3000);
    };

    // Initialize all functionality
    function initializeAllEnhancements() {
        calculateProfileCompletion();
        initializeAvatarUpload();
        initializeFormAnimations();
        initializeProgressAnimations();
        initializeTimelineAnimations();
        initializeKeyboardShortcuts();
        handleDepartmentLineDropdowns();
        
        // Recalculate when education is added/removed
        const educationTimeline = document.getElementById('education-timeline');
        if (educationTimeline) {
            const observer = new MutationObserver(calculateProfileCompletion);
            observer.observe(educationTimeline, {
                childList: true,
                subtree: true
            });
        }
    }

    // Start initialization
    initializeAllEnhancements();

    // Ensure modal is properly hidden on page load
    function ensureModalsClosed() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
        console.log('All modals ensured closed on page load');
    }

    // Call on page load
    ensureModalsClosed();

    // Fix dropdown navigation issue - reinitialize dropdowns when page becomes visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Reinitialize any dropdowns that might exist on this page
            setTimeout(() => {
                const dropdowns = document.querySelectorAll('.action-dropdown');
                if (dropdowns.length > 0) {
                    console.log('Reinitializing dropdowns on user profile page');
                    // Trigger a custom event that admin-profile.js can listen to
                    window.dispatchEvent(new CustomEvent('reinitializeDropdowns'));
                }
            }, 100);
        }
    });

    // Also reinitialize on window focus
    window.addEventListener('focus', function() {
        const dropdowns = document.querySelectorAll('.action-dropdown');
        if (dropdowns.length > 0) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('reinitializeDropdowns'));
            }, 100);
        }
    });

    // Expose functions for external use
    window.enhancedProfile = {
        calculateProfileCompletion,
        initializeAllEnhancements
    };

    var editBtn = document.getElementById('edit-employment-btn');
    var cancelBtn = document.querySelector('.cancel-card-btn[data-group="employment-info"]');
    var saveBtn = document.querySelector('.save-card-btn[data-group="employment-info"]');
    var formGroups = document.querySelectorAll('#work-info .form-group');
    function setEditMode(editing) {
        formGroups.forEach(function(group) {
            var displays = group.querySelectorAll('.employment-display');
            var inputs = group.querySelectorAll('.employment-input');
            displays.forEach(function(display) { display.style.display = editing ? 'none' : ''; });
            inputs.forEach(function(input) { input.style.display = editing ? '' : 'none'; });
        });
        if (editBtn) editBtn.style.display = editing ? 'none' : '';
        if (cancelBtn) cancelBtn.style.display = editing ? '' : 'none';
        if (saveBtn) saveBtn.style.display = editing ? '' : 'none';
    }
    if (editBtn) {
        editBtn.addEventListener('click', function(e) {
            e.preventDefault();
            setEditMode(true);
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            setEditMode(false);
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            setEditMode(false);
        });
    }
    setEditMode(false);

    // Modal logic for Deactivate, Lock, Delete
    function setupModal(triggerId, modalId, closeId, cancelId) {
        const trigger = document.getElementById(triggerId);
        const modal = document.getElementById(modalId);
        const closeBtn = document.getElementById(closeId);
        const cancelBtn = document.getElementById(cancelId);
        
        if (trigger && modal) {
            trigger.addEventListener('click', function() {
                modal.classList.add('show');
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', function() {
                modal.classList.remove('show');
            });
        }
        
        if (cancelBtn && modal) {
            cancelBtn.addEventListener('click', function() {
                modal.classList.remove('show');
            });
        }
        
        // Close modal when clicking overlay
        if (modal) {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', function() {
                    modal.classList.remove('show');
                });
            }
        }
    }
    setupModal('deactivateBtn', 'deactivateModal', 'closeDeactivateModal', 'cancelDeactivate');
    setupModal('lockBtn', 'lockModal', 'closeLockModal', 'cancelLock');
    setupModal('deleteBtn', 'deleteModal', 'closeDeleteModal', 'cancelDelete');
    setupModal('activateBtn', 'activateModal', 'closeActivateModal', 'cancelActivate');
    setupModal('unlockBtn', 'unlockModal', 'closeUnlockModal', 'cancelUnlock');
    setupModal('approvalBtn', 'approvalModal', 'closeApprovalModal', 'cancelApproval');
    setupModal('resetBtn', 'resetPasswordModal', 'closeResetPasswordModal', 'cancelResetPassword');

    // Handle Activate/Deactivate/Lock/Unlock actions
    const confirmDeactivate = document.getElementById('confirmDeactivate');
    const confirmActivate = document.getElementById('confirmActivate');
    const confirmLock = document.getElementById('confirmLock');
    const confirmUnlock = document.getElementById('confirmUnlock');
    const confirmDelete = document.getElementById('confirmDelete');
    const employmentForm = document.getElementById('editEmploymentForm');
    let employeeId = null;
    if (employmentForm) {
        employeeId = employmentForm.getAttribute('data-employee-id');
    }
    if (confirmDeactivate && employeeId) {
        confirmDeactivate.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/deactivate/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('deactivateModal').classList.remove('show');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to deactivate', 'error');
                }
            });
        });
    }
    if (confirmActivate && employeeId) {
        confirmActivate.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/activate/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('activateModal').classList.remove('show');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to activate', 'error');
                }
            });
        });
    }
    if (confirmLock && employeeId) {
        confirmLock.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/lock/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('lockModal').classList.remove('show');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to lock', 'error');
                }
            });
        });
    }
    if (confirmUnlock && employeeId) {
        confirmUnlock.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/unlock/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('unlockModal').classList.remove('show');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to unlock', 'error');
                }
            });
        });
    }
    if (confirmDelete && employeeId) {
        confirmDelete.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/delete/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('deleteModal').classList.remove('show');
                    setTimeout(() => window.location.href = '/profile/admin/employees/', 800);
                } else {
                    showToast(data.message || 'Failed to delete', 'error');
                }
            });
        });
    }

    const confirmApprove = document.getElementById('confirmApprove');
    const confirmDisapprove = document.getElementById('confirmDisapprove');

    if (confirmApprove && employeeId) {
        confirmApprove.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/approve/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('approvalModal').classList.remove('show');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to approve', 'error');
                }
            });
        });
    }

    if (confirmDisapprove && employeeId) {
        confirmDisapprove.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/disapprove/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('approvalModal').classList.remove('show');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast(data.message || 'Failed to disapprove', 'error');
                }
            });
        });
    }

    // Handle Reset Password action
    const confirmResetPassword = document.getElementById('confirmResetPassword');
    if (confirmResetPassword && employeeId) {
        confirmResetPassword.addEventListener('click', function() {
            fetch(`/profile/admin/employee/${employeeId}/reset-password/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCsrfToken() }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(data.message, 'success');
                    document.getElementById('resetPasswordModal').classList.remove('show');
                } else {
                    showToast(data.message || 'Failed to reset password', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred while resetting password', 'error');
            });
        });
    }
});