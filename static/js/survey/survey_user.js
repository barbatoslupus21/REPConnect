class SurveyUser {
    constructor() {
        this.init();
    }
    
    init() {
        this.initSurveyTaking();
        this.initProgressTracking();
        this.initAutoSave();
        this.initValidation();
    }
    
    initSurveyTaking() {
        // Initialize survey taking functionality
        this.bindQuestionEvents();
        this.initRatingStars();
        this.initFileUploads();
    }
    
    bindQuestionEvents() {
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name^="question_"], select[name^="question_"], textarea[name^="question_"]')) {
                this.updateProgress();
                this.saveAnswer(e.target);
            }
        });
        
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="text"], textarea')) {
                clearTimeout(this.inputTimeout);
                this.inputTimeout = setTimeout(() => {
                    this.updateProgress();
                    this.saveAnswer(e.target);
                }, 500);
            }
        });
    }
    
    initRatingStars() {
        document.querySelectorAll('.rating-scale').forEach(ratingScale => {
            const options = ratingScale.querySelectorAll('.rating-option');
            
            options.forEach(option => {
                const label = option.querySelector('label');
                const stars = option.querySelectorAll('.star-rating i');
                const input = option.querySelector('input[type="radio"]');
                
                label.addEventListener('mouseenter', () => {
                    const rating = parseInt(input.value);
                    this.highlightStars(stars, rating);
                });
                
                label.addEventListener('mouseleave', () => {
                    const checkedInput = ratingScale.querySelector('input[type="radio"]:checked');
                    if (checkedInput) {
                        const rating = parseInt(checkedInput.value);
                        this.highlightStars(stars, rating);
                    } else {
                        this.clearStars(stars);
                    }
                });
                
                input.addEventListener('change', () => {
                    const rating = parseInt(input.value);
                    this.highlightStars(stars, rating);
                    this.updateProgress();
                });
            });
        });
    }
    
    highlightStars(stars, rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    
    clearStars(stars) {
        stars.forEach(star => star.classList.remove('active'));
    }
    
    initFileUploads() {
        document.querySelectorAll('.file-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const label = e.target.nextElementSibling;
                const maxSize = parseInt(e.target.dataset.maxSize) || 5242880;
                
                if (file) {
                    if (file.size > maxSize) {
                        window.portalUI.showNotification(`File size exceeds ${this.formatFileSize(maxSize)} limit`, 'error');
                        e.target.value = '';
                        return;
                    }
                    
                    label.innerHTML = `
                        <i class="fas fa-file"></i>
                        <span>${file.name}</span>
                        <small>${this.formatFileSize(file.size)}</small>
                    `;
                } else {
                    label.innerHTML = `
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Choose File</span>
                        <small>Max size: ${this.formatFileSize(maxSize)}</small>
                    `;
                }
            });
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    initProgressTracking() {
        this.updateProgress();
    }
    
    updateProgress() {
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (!progressBar || !progressText) return;
        
        const totalQuestions = document.querySelectorAll('.question-card').length;
        const answeredQuestions = this.getAnsweredQuestions();
        const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${answeredQuestions} of ${totalQuestions} questions completed (${Math.round(progress)}%)`;
    }
    
    getAnsweredQuestions() {
        let answered = 0;
        
        document.querySelectorAll('.question-card').forEach(questionCard => {
            const inputs = questionCard.querySelectorAll('input, select, textarea');
            let hasAnswer = false;
            
            inputs.forEach(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.checked) hasAnswer = true;
                } else if (input.type === 'file') {
                    if (input.files && input.files.length > 0) hasAnswer = true;
                } else if (input.value && input.value.trim() !== '') {
                    hasAnswer = true;
                }
            });
            
            if (hasAnswer) answered++;
        });
        
        return answered;
    }
    
    initAutoSave() {
        const surveyForm = document.getElementById('surveyForm');
        if (!surveyForm || !surveyForm.dataset.autoSave) return;
        
        this.autoSaveInterval = setInterval(() => {
            this.saveDraft();
        }, 30000); // Save every 30 seconds
        
        // Save before page unload
        window.addEventListener('beforeunload', () => {
            this.saveDraft();
        });
    }
    
    saveDraft() {
        const form = document.getElementById('surveyForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (key.startsWith('question_')) {
                if (data[key]) {
                    if (!Array.isArray(data[key])) {
                        data[key] = [data[key]];
                    }
                    data[key].push(value);
                } else {
                    data[key] = value;
                }
            }
        }
        
        const surveyId = this.getSurveyId();
        if (!surveyId) return;
        
        fetch(`/surveys/${surveyId}/draft/save/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.getCSRFToken(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).catch(() => {
            // Silent fail for auto-save
        });
    }
    
    saveAnswer(input) {
        // Individual answer saving for better UX
        const questionCard = input.closest('.question-card');
        const questionId = questionCard.dataset.questionId;
        
        // Visual feedback
        questionCard.classList.add('saving');
        setTimeout(() => {
            questionCard.classList.remove('saving');
            questionCard.classList.add('saved');
            setTimeout(() => {
                questionCard.classList.remove('saved');
            }, 2000);
        }, 500);
    }
    
    initValidation() {
        const surveyForm = document.getElementById('surveyForm');
        if (!surveyForm) return;
        
        surveyForm.addEventListener('submit', (e) => {
            if (e.submitter && e.submitter.name === 'submit_survey') {
                if (!this.validateForm()) {
                    e.preventDefault();
                    return false;
                }
            }
        });
    }
    
    validateForm() {
        let isValid = true;
        let firstError = null;
        
        document.querySelectorAll('.question-card').forEach(questionCard => {
            const isRequired = questionCard.querySelector('.required-indicator') !== null;
            const questionNumber = questionCard.querySelector('.question-number').textContent;
            
            if (isRequired) {
                const inputs = questionCard.querySelectorAll('input, select, textarea');
                let hasAnswer = false;
                
                inputs.forEach(input => {
                    if (input.type === 'radio' || input.type === 'checkbox') {
                        if (input.checked) hasAnswer = true;
                    } else if (input.type === 'file') {
                        if (input.files && input.files.length > 0) hasAnswer = true;
                    } else if (input.value && input.value.trim() !== '') {
                        hasAnswer = true;
                    }
                });
                
                if (!hasAnswer) {
                    this.showValidationError(questionCard, `Question ${questionNumber} is required`);
                    isValid = false;
                    if (!firstError) firstError = questionCard;
                } else {
                    this.clearValidationError(questionCard);
                }
            }
        });
        
        if (!isValid && firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            window.portalUI.showNotification('Please answer all required questions', 'error');
        }
        
        return isValid;
    }
    
    showValidationError(questionCard, message) {
        questionCard.classList.add('has-error');
        questionCard.style.borderColor = 'var(--error-color)';
        
        let errorEl = questionCard.querySelector('.validation-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'validation-error';
            questionCard.appendChild(errorEl);
        }
        
        errorEl.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        `;
    }
    
    clearValidationError(questionCard) {
        questionCard.classList.remove('has-error');
        questionCard.style.borderColor = '';
        
        const errorEl = questionCard.querySelector('.validation-error');
        if (errorEl) {
            errorEl.remove();
        }
    }
    
    loadDraft() {
        const surveyId = this.getSurveyId();
        if (!surveyId) return;
        
        fetch(`/surveys/${surveyId}/draft/load/`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    this.populateForm(data.data);
                    window.portalUI.showNotification('Draft loaded', 'info');
                }
            })
            .catch(() => {
                // Silent fail for draft loading
            });
    }
    
    populateForm(data) {
        Object.entries(data).forEach(([questionName, value]) => {
            const inputs = document.querySelectorAll(`[name="${questionName}"]`);
            
            inputs.forEach(input => {
                if (input.type === 'radio') {
                    input.checked = input.value === value;
                } else if (input.type === 'checkbox') {
                    if (Array.isArray(value)) {
                        input.checked = value.includes(input.value);
                    } else {
                        input.checked = input.value === value;
                    }
                } else {
                    input.value = value;
                }
            });
        });
        
        this.updateProgress();
    }
    
    showConfirmationModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content congrats-modal">
                <div class="congrats-animation">
                    ${Array.from({length: 20}, (_, i) => `<div class="confetti"></div>`).join('')}
                </div>
                <div class="modal-header">
                    <h3>Survey Submitted!</h3>
                </div>
                <div class="modal-body congrats-content">
                    <div class="text-center">
                        <div class="success-icon">
                            <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--success-color); margin-bottom: 1rem;"></i>
                        </div>
                        <h4>Thank you for your response!</h4>
                        <p>Your survey response has been submitted successfully.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <a href="/surveys/user/" class="btn btn-primary">Back to Dashboard</a>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
            window.location.href = '/surveys/user/';
        }, 5000);
    }
    
    getSurveyId() {
        const match = window.location.pathname.match(/surveys\/(\d+)/);
        return match ? match[1] : null;
    }
    
    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    }
    
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
        }
    }
}

// Survey Response Viewer
class SurveyResponseViewer {
    constructor() {
        this.initViewer();
    }
    
    initViewer() {
        this.addPrintButton();
        this.enhanceDisplay();
    }
    
    addPrintButton() {
        const header = document.querySelector('.page-header');
        if (header) {
            const printBtn = document.createElement('button');
            printBtn.className = 'btn btn-outline';
            printBtn.innerHTML = '<i class="fas fa-print"></i> Print Response';
            printBtn.addEventListener('click', () => window.print());
            
            const actions = header.querySelector('.page-actions') || header;
            actions.appendChild(printBtn);
        }
    }
    
    enhanceDisplay() {
        // Add visual enhancements for better response viewing
        document.querySelectorAll('.question-response').forEach(response => {
            const questionType = response.dataset.questionType;
            
            if (questionType === 'rating_scale') {
                this.enhanceRatingDisplay(response);
            }
        });
    }
    
    enhanceRatingDisplay(response) {
        const rating = parseInt(response.textContent);
        if (!isNaN(rating)) {
            const stars = Array.from({length: 5}, (_, i) => 
                `<i class="fas fa-star ${i < rating ? 'text-warning' : 'text-muted'}"></i>`
            ).join('');
            
            response.innerHTML = `
                <div class="rating-display">
                    ${stars}
                    <span class="rating-value">(${rating}/5)</span>
                </div>
            `;
        }
    }
}

// Survey Analytics
class SurveyAnalytics {
    constructor() {
        if (document.querySelector('.analytics-container')) {
            this.initAnalytics();
        }
    }
    
    initAnalytics() {
        this.loadCharts();
        this.initFilters();
    }
    
    loadCharts() {
        // This would integrate with Chart.js or similar
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            const chartData = JSON.parse(container.dataset.chartData || '{}');
            const chartType = container.dataset.chartType || 'bar';
            
            this.renderChart(container, chartType, chartData);
        });
    }
    
    renderChart(container, type, data) {
        // Placeholder for chart rendering
        // Would use Chart.js, D3.js, or another charting library
        container.innerHTML = `
            <div class="chart-placeholder">
                <i class="fas fa-chart-${type === 'pie' ? 'pie' : 'bar'}"></i>
                <p>Chart: ${type}</p>
                <small>Data points: ${Object.keys(data).length}</small>
            </div>
        `;
    }
    
    initFilters() {
        const filterButtons = document.querySelectorAll('.chart-filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                this.applyFilter(filter);
                
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    applyFilter(filter) {
        // Apply filter to charts
        console.log('Applying filter:', filter);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path.includes('/take/')) {
        window.surveyUser = new SurveyUser();
        // Load draft if available
        window.surveyUser.loadDraft();
    } else if (path.includes('/view/')) {
        window.responseViewer = new SurveyResponseViewer();
    } else if (path.includes('/analytics/')) {
        window.surveyAnalytics = new SurveyAnalytics();
    }
});

// Handle survey submission success
document.addEventListener('surveySubmitted', () => {
    if (window.surveyUser) {
        window.surveyUser.showConfirmationModal();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.surveyUser) {
        window.surveyUser.destroy();
    }
});