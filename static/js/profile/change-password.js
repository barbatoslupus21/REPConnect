class PasswordChangeManager {
    constructor() {
        this.form = document.getElementById('passwordChangeForm');
        this.currentPasswordInput = document.getElementById('currentPassword');
        this.newPasswordInput = document.getElementById('newPassword');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.passwordTooltip = document.getElementById('passwordTooltip');
        this.strengthFill = document.getElementById('strengthFill');
        this.strengthText = document.getElementById('strengthText');
        this.messageContainer = document.getElementById('messageContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.submitBtn = document.getElementById('submitBtn');
        this.cancelBtn = document.getElementById('cancelBtn');

        this.passwordRules = {
            length: {
                test: (password) => password.length >= 6,
                message: 'At least 6 characters'
            },
            uppercase: {
                test: (password) => /[A-Z]/.test(password),
                message: 'One uppercase letter (A-Z)'
            },
            lowercase: {
                test: (password) => /[a-z]/.test(password),
                message: 'One lowercase letter (a-z)'
            },
            number: {
                test: (password) => /[0-9]/.test(password),
                message: 'One number (0-9)'
            },
            special: {
                test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
                message: 'One special character (!@#$%^&*)'
            }
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPasswordToggles();
        this.setupTooltipBehavior();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Cancel button
        if (this.cancelBtn) {
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        }

        // Password input events
        this.newPasswordInput.addEventListener('input', () => this.handlePasswordInput());
        this.newPasswordInput.addEventListener('focus', () => this.showTooltip());
        this.newPasswordInput.addEventListener('blur', () => this.hideTooltipDelayed());

        this.confirmPasswordInput.addEventListener('input', () => this.handleConfirmPasswordInput());
        this.confirmPasswordInput.addEventListener('focus', () => this.showTooltip());
        this.confirmPasswordInput.addEventListener('blur', () => this.hideTooltipDelayed());

        // Current password validation
        this.currentPasswordInput.addEventListener('input', () => this.validateCurrentPassword());

        // Prevent form submission on Enter key in password fields
        [this.currentPasswordInput, this.newPasswordInput, this.confirmPasswordInput].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.focusNextField(input);
                }
            });
        });

        // Close messages
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('message-close')) {
                this.closeMessage(e.target.closest('.message'));
            }
        });

        // Escape key to hide tooltip
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideTooltip();
            }
        });

        // Click outside to hide tooltip (only on desktop)
        document.addEventListener('click', (e) => {
            if (!this.isMobile() && 
                !this.passwordTooltip.contains(e.target) && 
                !this.newPasswordInput.contains(e.target) && 
                !this.confirmPasswordInput.contains(e.target)) {
                this.hideTooltip();
            }
        });
    }

    setupPasswordToggles() {
        const passwordToggles = document.querySelectorAll('.password-toggle');
        
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.getAttribute('data-target');
                const targetInput = document.getElementById(targetId);
                const icon = toggle.querySelector('i');

                if (targetInput.type === 'password') {
                    targetInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    toggle.setAttribute('aria-label', 'Hide password');
                } else {
                    targetInput.type = 'password';
                    icon.className = 'fas fa-eye';
                    toggle.setAttribute('aria-label', 'Show password');
                }

                // Add animation without affecting positioning
                toggle.style.transform = 'translateY(-50%) scale(0.9)';
                setTimeout(() => {
                    toggle.style.transform = 'translateY(-50%) scale(1)';
                }, 150);
            });
        });
    }

    setupTooltipBehavior() {
        // Handle mobile responsive behavior
        this.handleResponsiveTooltip();
        window.addEventListener('resize', () => this.handleResponsiveTooltip());
    }

    setupFormValidation() {
        // Real-time validation for all fields
        const inputs = [this.currentPasswordInput, this.newPasswordInput, this.confirmPasswordInput];
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    showTooltip() {
        if (this.isMobile()) {
            this.showMobileTooltip();
        } else {
            this.passwordTooltip.classList.add('show');
        }
        
        // Update rules immediately
        this.updatePasswordRules();
    }

    hideTooltip() {
        this.passwordTooltip.classList.remove('show');
        this.hideMobileTooltip();
    }

    hideTooltipDelayed() {
        if (this.isMobile()) return;
        
        setTimeout(() => {
            if (!this.newPasswordInput.matches(':focus') && 
                !this.confirmPasswordInput.matches(':focus') &&
                !this.passwordTooltip.matches(':hover')) {
                this.hideTooltip();
            }
        }, 150);
    }

    showMobileTooltip() {
        if (this.isMobile()) {
            this.passwordTooltip.style.position = 'fixed';
            this.passwordTooltip.style.top = '50%';
            this.passwordTooltip.style.left = '1rem';
            this.passwordTooltip.style.right = '1rem';
            this.passwordTooltip.style.transform = 'translateY(-50%)';
            this.passwordTooltip.style.zIndex = '10000';
            this.passwordTooltip.classList.add('show');
        }
    }

    hideMobileTooltip() {
        if (this.isMobile()) {
            this.passwordTooltip.style.position = '';
            this.passwordTooltip.style.top = '';
            this.passwordTooltip.style.left = '';
            this.passwordTooltip.style.right = '';
            this.passwordTooltip.style.transform = '';
            this.passwordTooltip.style.zIndex = '';
        }
    }

    handleResponsiveTooltip() {
        if (this.passwordTooltip.classList.contains('show')) {
            if (this.isMobile()) {
                this.showMobileTooltip();
            } else {
                this.hideMobileTooltip();
            }
        }
    }

    handlePasswordInput() {
        const password = this.newPasswordInput.value;
        
        this.updatePasswordRules();
        this.updatePasswordStrength(password);
        this.validateNewPassword();
        
        // Re-validate confirm password if it has a value
        if (this.confirmPasswordInput.value) {
            this.validateConfirmPassword();
        }
    }

    handleConfirmPasswordInput() {
        this.validateConfirmPassword();
        this.updatePasswordRules();
    }

    updatePasswordRules() {
        const password = this.newPasswordInput.value;
        
        Object.keys(this.passwordRules).forEach(ruleName => {
            const ruleElement = document.querySelector(`[data-rule="${ruleName}"]`);
            const rule = this.passwordRules[ruleName];
            
            if (ruleElement) {
                if (rule.test(password)) {
                    ruleElement.classList.add('valid');
                } else {
                    ruleElement.classList.remove('valid');
                }
            }
        });
    }

    updatePasswordStrength(password) {
        if (!password) {
            this.updateStrengthLines(0);
            this.updatePasswordTitle('Enter a password');
            this.updateRequirements([]);
            return;
        }

        let score = 0;
        let passedRules = 0;
        let metRequirements = [];

        // Check each rule
        Object.values(this.passwordRules).forEach(rule => {
            if (rule.test(password)) {
                passedRules++;
            }
        });

        // Check specific requirements
        if (/[A-Z]/.test(password)) {
            metRequirements.push('uppercase');
        }
        if (/[a-z]/.test(password)) {
            metRequirements.push('lowercase');
        }
        if (/[0-9]/.test(password)) {
            metRequirements.push('number');
        }
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            metRequirements.push('special');
        }

        // Additional scoring factors
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[A-Z].*[A-Z]/.test(password)) score += 1; // Multiple uppercase
        if (/[0-9].*[0-9]/.test(password)) score += 1; // Multiple numbers

        const totalScore = passedRules + score;
        let strength, title;

        if (totalScore <= 2) {
            strength = 1;
            title = 'Weak Password';
        } else if (totalScore <= 4) {
            strength = 2;
            title = 'Fair Password';
        } else if (totalScore <= 6) {
            strength = 3;
            title = 'Good Password';
        } else {
            strength = 4;
            title = 'Strong Password';
        }

        this.updateStrengthLines(strength);
        this.updatePasswordTitle(title);
        this.updateRequirements(metRequirements);
    }

    updateStrengthLines(strength) {
        const lines = document.querySelectorAll('.strength-lines .line');
        
        // Determine strength level and color
        let strengthClass = '';
        if (strength === 1) strengthClass = 'weak';
        else if (strength === 2) strengthClass = 'fair';
        else if (strength === 3) strengthClass = 'good';
        else if (strength === 4) strengthClass = 'strong';
        
        lines.forEach((line, index) => {
            // Remove all strength classes first
            line.classList.remove('filled', 'weak', 'fair', 'good', 'strong');
            
            if (index < strength) {
                line.classList.add('filled', strengthClass);
            }
        });
    }

    updatePasswordTitle(title) {
        const titleElement = document.getElementById('passwordTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    updateRequirements(metRequirements) {
        const requirements = document.querySelectorAll('.requirements-list li');
        requirements.forEach(requirement => {
            const requirementType = requirement.getAttribute('data-requirement');
            const icon = requirement.querySelector('i');
            
            if (metRequirements.includes(requirementType)) {
                requirement.classList.add('met');
                icon.className = 'fas fa-check-circle';
            } else {
                requirement.classList.remove('met');
                icon.className = 'fas fa-check';
            }
        });
    }

    validateCurrentPassword() {
        const value = this.currentPasswordInput.value.trim();
        
        if (!value) {
            this.showFieldError(this.currentPasswordInput, 'Current password is required');
            return false;
        }

        if (value.length < 6) {
            this.showFieldError(this.currentPasswordInput, 'Password must be at least 6 characters');
            return false;
        }

        this.clearFieldError(this.currentPasswordInput);
        return true;
    }

    validateNewPassword() {
        const password = this.newPasswordInput.value;
        
        if (!password) {
            this.showFieldError(this.newPasswordInput, 'New password is required');
            return false;
        }

        // Check if all rules pass
        const failedRules = Object.entries(this.passwordRules).filter(
            ([ruleName, rule]) => !rule.test(password)
        );

        if (failedRules.length > 0) {
            const firstFailedRule = failedRules[0][1];
            this.showFieldError(this.newPasswordInput, `Password must have: ${firstFailedRule.message}`);
            return false;
        }

        // Check if new password is different from current password
        if (password === this.currentPasswordInput.value) {
            this.showFieldError(this.newPasswordInput, 'New password must be different from current password');
            return false;
        }

        this.clearFieldError(this.newPasswordInput);
        return true;
    }

    validateConfirmPassword() {
        const password = this.newPasswordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (!confirmPassword) {
            this.showFieldError(this.confirmPasswordInput, 'Please confirm your new password');
            return false;
        }

        if (password !== confirmPassword) {
            this.showFieldError(this.confirmPasswordInput, 'Passwords do not match');
            return false;
        }

        this.clearFieldError(this.confirmPasswordInput);
        return true;
    }

    validateField(input) {
        switch (input) {
            case this.currentPasswordInput:
                return this.validateCurrentPassword();
            case this.newPasswordInput:
                return this.validateNewPassword();
            case this.confirmPasswordInput:
                return this.validateConfirmPassword();
            default:
                return true;
        }
    }

    showFieldError(input, message) {
        input.classList.add('error');
        input.classList.remove('success');
        const errorElement = document.getElementById(input.id + 'Error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        // (No toast here)
    }

    showToast(text, type = 'error') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${text}</span>
            <button class="message-close" aria-label="Close toast">
                <i class="fas fa-times"></i>
            </button>
        `;
        toastContainer.appendChild(toast);
        // Remove on close
        toast.querySelector('.message-close').onclick = () => toast.remove();
        // Auto-hide after 5s
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
    }

    clearFieldError(input) {
        input.classList.remove('error');
        
        const errorElement = document.getElementById(input.id + 'Error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    validateForm() {
        const currentPasswordValid = this.validateCurrentPassword();
        const newPasswordValid = this.validateNewPassword();
        const confirmPasswordValid = this.validateConfirmPassword();

        return currentPasswordValid && newPasswordValid && confirmPasswordValid;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        this.clearMessages();
        // Remove all toasts
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) toastContainer.innerHTML = '';

        // Validate all fields and collect errors
        const errors = [];
        if (!this.validateCurrentPassword()) {
            errors.push('Current password is invalid.');
        }
        if (!this.validateNewPassword()) {
            errors.push('New password is invalid.');
        }
        if (!this.validateConfirmPassword()) {
            errors.push('Confirm password is invalid.');
        }
        if (errors.length > 0) {
            errors.forEach(msg => this.showToast(msg, 'error'));
            this.showToast('Please fix the errors above before submitting.', 'error');
            return;
        }
        this.setLoadingState(true);
        try {
            await this.submitPasswordChange();
            this.showToast('Password updated successfully!', 'success');
            this.resetForm();
            this.hideTooltip();
            if (this.passwordTooltip) {
                this.passwordTooltip.classList.remove('show');
                this.passwordTooltip.style.display = '';
            }
        } catch (error) {
            this.showToast(error.message || 'Failed to update password. Please try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async submitPasswordChange() {
        const formData = new FormData();
        formData.append('currentPassword', this.currentPasswordInput.value);
        formData.append('newPassword', this.newPasswordInput.value);
        formData.append('confirmPassword', this.confirmPasswordInput.value);

        const response = await fetch('/profile/api/change-password/', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Password change failed');
        }
        return data;
    }

    handleCancel() {
        if (this.hasFormChanges()) {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                this.resetForm();
                // Navigate back or close modal
                window.history.back();
            }
        } else {
            window.history.back();
        }
    }

    hasFormChanges() {
        return this.currentPasswordInput.value.trim() !== '' ||
               this.newPasswordInput.value.trim() !== '' ||
               this.confirmPasswordInput.value.trim() !== '';
    }

    resetForm() {
        this.form.reset();
        this.hideTooltip();
        this.clearAllFieldErrors();
        if (this.strengthFill) {
        this.strengthFill.className = 'strength-fill';
        }
        if (this.strengthText) {
        this.strengthText.textContent = 'Enter a password';
        this.strengthText.className = 'strength-text';
        }
    }

    clearAllFieldErrors() {
        [this.currentPasswordInput, this.newPasswordInput, this.confirmPasswordInput].forEach(input => {
            this.clearFieldError(input);
        });
    }

    setLoadingState(loading) {
        if (loading) {
            this.submitBtn.classList.add('loading');
            this.submitBtn.disabled = true;
            this.loadingOverlay.style.display = 'flex';
        } else {
            this.submitBtn.classList.remove('loading');
            this.submitBtn.disabled = false;
            this.loadingOverlay.style.display = 'none';
        }
    }

    showMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${text}</span>
            <button class="message-close" aria-label="Close message">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.messageContainer.appendChild(message);

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (message.parentNode) {
                    this.closeMessage(message);
                }
            }, 5000);
        }
    }

    closeMessage(message) {
        message.style.animation = 'slideOutUp 0.3s ease';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 300);
    }

    clearMessages() {
        this.messageContainer.innerHTML = '';
    }

    focusNextField(currentInput) {
        if (currentInput === this.currentPasswordInput) {
            this.newPasswordInput.focus();
        } else if (currentInput === this.newPasswordInput) {
            this.confirmPasswordInput.focus();
        } else if (currentInput === this.confirmPasswordInput) {
            this.submitBtn.focus();
        }
    }

    isMobile() {
        return window.innerWidth <= 768;
    }
}

// Helper function to get CSRF token (if using Django)
function getCsrfToken() {
    const tokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    return tokenElement ? tokenElement.value : '';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PasswordChangeManager();
});

// Add slideOutUp animation CSS if not already defined
if (!document.querySelector('#dynamic-styles')) {
    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    style.textContent = `
        @keyframes slideOutUp {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);
}