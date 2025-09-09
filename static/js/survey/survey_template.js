document.addEventListener('DOMContentLoaded', function() {
    const templateBuilder = new TemplateBuilder();
    templateBuilder.init();
    // expose the initialized instance for inline handlers (edit/move/delete)
    window.templateBuilder = templateBuilder;
});

class TemplateBuilder {
    constructor() {
        this.questions = [];
        this.currentEditingIndex = -1;
        this.questionCounter = 0;
    // shared rating scale for all rating questions when enabled
    this.sharedRating = { min: 1, max: 5 };
    this.sharedRatingEnabled = false;
    }
    
    init() {
        this.bindEvents();
        this.updateQuestionsDisplay();
    this.initBasicInfoEditing();
        // If server injected initial template data (edit mode), load it now
        try {
            if (window.__initial_template_data) {
                const data = window.__initial_template_data;
                // questions stored directly
                if (Array.isArray(data.questions)) {
                    this.questions = data.questions;
                    this.questionCounter = this.questions.length;
                }

                // settings
                if (data.settings) {
                    document.getElementById('defaultRequired').checked = !!data.settings.default_required;
                    document.getElementById('includeProgress').checked = !!data.settings.include_progress;
                    document.getElementById('enableAutosave').checked = !!data.settings.enable_autosave;
                    document.getElementById('anonymousDefault').checked = !!data.settings.anonymous_default;
                }

                // basic meta
                if (window.__initial_template_meta) {
                    const meta = window.__initial_template_meta;
                    if (meta.name) {
                        const titleEl = document.getElementById('editableTitle');
                        const hiddenTitle = document.getElementById('template_name_hidden');
                        titleEl.textContent = meta.name || 'Untitled form';
                        hiddenTitle.value = meta.name || '';
                    }
                    if (meta.description) {
                        const descEl = document.getElementById('editableDesc');
                        const hiddenDesc = document.getElementById('template_description_hidden');
                        descEl.textContent = meta.description || 'Form description';
                        hiddenDesc.value = meta.description || '';
                    }
                }

                // refresh display
                this.updateQuestionsDisplay();
            }
        } catch (e) {
            console.warn('Error loading initial template data', e);
        }
    }
    
    bindEvents() {
        // Add question button
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
            this.showQuestionModal();
        });
        
        // Question type change
        document.getElementById('questionTypeSelect').addEventListener('change', (e) => {
            this.updateQuestionOptions(e.target.value);
        });
        
        // Save question
        document.getElementById('saveQuestionBtn').addEventListener('click', () => {
            this.saveQuestion();
        });
        
        // Preview template
        document.getElementById('previewTemplateBtn').addEventListener('click', () => {
            this.showTemplatePreview();
        });
        
        // Save template form
        document.getElementById('templateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTemplate();
        });
        
        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.closest('.modal-close, .modal-overlay, [data-action="cancel"], [data-action="close"]')) {
                this.closeModals();
            }
        });
        
        // Set default required state
        const defaultRequired = document.getElementById('defaultRequired');
        defaultRequired.addEventListener('change', () => {
            document.getElementById('questionRequired').checked = defaultRequired.checked;
        });

        // Make .standard-checkbox container toggle its inner checkbox when clicked (fixes div vs label usage)
        document.addEventListener('click', (e) => {
            const container = e.target.closest('.standard-checkbox');
            if (!container) return;

            // If click directly on the native checkbox input, let it behave normally
            if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') return;

            const checkbox = container.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
    
    showQuestionModal(editIndex = -1) {
        const modal = document.getElementById('questionBuilderModal');
        const form = document.getElementById('questionBuilderForm');
        const title = document.getElementById('questionModalTitle');
        const saveBtn = document.getElementById('saveQuestionBtn');
        
        // Reset form
        form.reset();
        document.getElementById('questionOptions').innerHTML = '';
        // reset description toggle (use slide helpers for smooth effect)
        const descContainer = document.getElementById('questionDescriptionContainer');
        const toggleBtn = document.getElementById('toggleDescriptionBtn');
        if (descContainer && toggleBtn) {
            // ensure hidden state without visual jump
            descContainer.style.display = 'none';
            descContainer.style.overflow = '';
            descContainer.style.maxHeight = '';
            toggleBtn.setAttribute('aria-pressed', 'false');
            toggleBtn.textContent = 'Show description';
        }
        
        if (editIndex >= 0) {
            // Edit mode
            this.currentEditingIndex = editIndex;
            const question = this.questions[editIndex];
            
            title.textContent = 'Edit Question';
            saveBtn.textContent = 'Update Question';
            
            // Populate form
            form.question_text.value = question.question_text;
            form.question_type.value = question.question_type;
            form.required.checked = question.required;
            form.description.value = question.description || '';
            
            this.updateQuestionOptions(question.question_type, question);
        } else {
            // Add mode
            this.currentEditingIndex = -1;
            title.textContent = 'Add Question';
            saveBtn.textContent = 'Add Question';
            
            // Set default required state
            form.required.checked = document.getElementById('defaultRequired').checked;
            // Default question type to multiple_choice and render options
            if (form.question_type) {
                form.question_type.value = 'multiple_choice';
                this.updateQuestionOptions('multiple_choice');
            }
        }
        
    modal.classList.add('show');
    // keep page from scrolling while modal is open and use the standard zoom-in animation
    document.body.classList.add('modal-open');
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.style.animation = 'modalZoomIn 0.28s ease-out';
        // bind toggle button with slide animation
        const toggleBtn2 = document.getElementById('toggleDescriptionBtn');
        const descContainer2 = document.getElementById('questionDescriptionContainer');
        if (toggleBtn2 && descContainer2) {
            toggleBtn2.onclick = () => {
                const pressed = toggleBtn2.getAttribute('aria-pressed') === 'true';
                if (pressed) {
                    this.slideUp(descContainer2, 220);
                    toggleBtn2.setAttribute('aria-pressed', 'false');
                    toggleBtn2.textContent = 'Show description';
                } else {
                    this.slideDown(descContainer2, 220);
                    toggleBtn2.setAttribute('aria-pressed', 'true');
                    toggleBtn2.textContent = 'Hide description';
                }
            };
        }
    }

    // Simple slideDown animation (uses max-height) — element should be display:none or hidden
    slideDown(el, duration = 200) {
        el.style.removeProperty('display');
        let display = window.getComputedStyle(el).display;
        if (display === 'none') display = 'block';
        el.style.display = display;

        const height = el.scrollHeight + 'px';
        el.style.overflow = 'hidden';
        el.style.maxHeight = '0px';
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.style.transition = `max-height ${duration}ms ease`;
        el.style.maxHeight = height;

        window.setTimeout(() => {
            el.style.removeProperty('max-height');
            el.style.removeProperty('overflow');
            el.style.removeProperty('transition');
        }, duration + 10);
    }

    // Simple slideUp animation (collapses to 0 then hides)
    slideUp(el, duration = 200) {
        el.style.overflow = 'hidden';
        const height = el.scrollHeight + 'px';
        el.style.maxHeight = height;
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.style.transition = `max-height ${duration}ms ease`;
        el.style.maxHeight = '0px';

        window.setTimeout(() => {
            el.style.display = 'none';
            el.style.removeProperty('max-height');
            el.style.removeProperty('overflow');
            el.style.removeProperty('transition');
        }, duration + 10);
    }
    
    updateQuestionOptions(questionType, questionData = null) {
        const container = document.getElementById('questionOptions');
        container.innerHTML = '';
        
        switch (questionType) {
            case 'single_choice':
            case 'multiple_choice':
            case 'dropdown':
                container.innerHTML = this.renderChoiceOptions(Object.assign({}, questionData || {}, { question_type: questionType }));
                this.bindOptionEvents();
                break;
                
            case 'rating_scale':
                // if shared rating is enabled, ensure the UI uses shared values
                const ratingData = Object.assign({}, questionData || {});
                if (this.sharedRatingEnabled) {
                    ratingData.min_value = this.sharedRating.min;
                    ratingData.max_value = this.sharedRating.max;
                }
                container.innerHTML = this.renderRatingOptions(ratingData);
                // initialize interactive preview for rating stars
                this.initRatingPreview(container);
                break;
                
            case 'file_upload':
                container.innerHTML = this.renderFileOptions(questionData);
                break;
                
            default:
                container.innerHTML = '';
        }
    }
    
    renderChoiceOptions(questionData) {
        const options = questionData?.options || ['Option 1', 'Option 2'];
        // Build option rows with a leading control (radio or checkbox) depending on question type.
        const isSingle = (questionData?.question_type === 'single_choice') || false;
        return `
            <div class="form-group">
                <label class="form-label">Options *</label>
                <div class="options-container" id="optionsContainer">
                    ${options.map((option, index) => `
                        <div class="option-item" style="display:flex; align-items:center; gap:12px;">
                            ${isSingle ? `
                                <label class="radio-option" style="margin:0;">
                                    <input type="radio" name="preview_radio" class="option-radio-input">
                                    <span class="radio-circle"></span>
                                </label>
                            ` : `
                                <label class="standard-checkbox" style="margin:0;">
                                    <input type="checkbox" class="option-checkbox-input">
                                    <span class="checkmark"></span>
                                </label>
                            `}

                            <input type="text" class="form-input option-input" value="${option}" placeholder="Option ${index + 1}" required style="flex:1;">
                            <button type="button" class="btn btn-sm btn-icon btn-error remove-option-btn">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="add-option-btn" id="addOptionBtn">
                    <i class="fas fa-plus"></i>
                    Add Option
                </button>
            </div>
        `;
    }
    
    renderRatingOptions(questionData) {
    const min = questionData?.min_value || 1;
    const max = questionData?.max_value || 5;
        // Simple rating scale without items/rows - just min/max value configuration
        return `

            <div class="form-group" style="margin-top:12px;">
                <label class="form-label">Preview</label>
                <div class="rating-preview" style="padding: 12px; background: #f8f9fa; border-radius: 6px;">
                    <div style="margin-bottom: 8px; color: #6c757d; font-size: 14px;">Rating scale preview:</div>
                    <div class="rating-stars-preview" style="display: flex; justify-content: center; gap: 12px; align-items: center;">
                        ${Array.from({length: max - min + 1}, (_, i) => {
                            const value = min + i;
                            return `
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                                    <i class="fas fa-star" style="color: #ddd; font-size: 20px;"></i>
                                    <span style="font-size: 12px; color: #6c757d;">${value}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            
            <div class="form-row form-row-2col" style="margin-top:12px;">
                <div class="form-group">
                    <label class="form-label">Minimum Value</label>
                    <input type="number" class="form-input" name="min_value" value="${min}" min="1" max="10">
                </div>
                <div class="form-group">
                    <label class="form-label">Maximum Value</label>
                    <input type="number" class="form-input" name="max_value" value="${max}" min="1" max="10">
                </div>
            </div>
            
            
        `;
    }

    
    renderFileOptions(questionData) {
        return `
            <div class="form-row form-row-2col">
                <div class="form-group">
                    <label class="form-label">Max File Size (MB)</label>
                    <input type="number" class="form-input" name="max_file_size" value="${(questionData?.max_file_size || 5242880) / 1048576}" step="0.1" min="0.1" max="100">
                </div>
                <div class="form-group">
                    <label class="form-label">Allowed File Types</label>
                    <input type="text" class="form-input" name="allowed_file_types" value="${questionData?.allowed_file_types?.join(', ') || '.pdf, .doc, .docx, .jpg, .png'}" placeholder=".pdf, .doc, .jpg">
                </div>
            </div>
        `;
    }

    // Initialize interactive rating preview inside the rating options container
    initRatingPreview(container) {
        try {
            const minInput = container.querySelector('input[name="min_value"]');
            const maxInput = container.querySelector('input[name="max_value"]');
            const previewContainer = container.querySelector('.rating-stars-preview');
            
            if (!minInput || !maxInput || !previewContainer) return;

            const updatePreview = () => {
                let min = parseInt(minInput.value) || 1;
                let max = parseInt(maxInput.value) || 5;
                
                // Validation
                if (min < 1) {
                    min = 1;
                    minInput.value = min;
                }
                if (max < min) {
                    max = min;
                    maxInput.value = max;
                }
                if (max > 10) {
                    max = 10;
                    maxInput.value = max;
                }
                
                // Update star preview with individual numbers
                const starCount = max - min + 1;
                previewContainer.innerHTML = Array.from({length: starCount}, (_, i) => {
                    const value = min + i;
                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <i class="fas fa-star" style="color: #ddd; font-size: 20px;"></i>
                            <span style="font-size: 12px; color: #6c757d;">${value}</span>
                        </div>
                    `;
                }).join('');
            };

            // Bind events to update preview when values change
            minInput.addEventListener('input', updatePreview);
            maxInput.addEventListener('input', updatePreview);
            minInput.addEventListener('change', updatePreview);
            maxInput.addEventListener('change', updatePreview);
            
            // Initial preview update
            updatePreview();
        } catch (e) {
            console.error('Error initializing rating preview:', e);
        }
    }
    
    bindOptionEvents() {
        // Add option button
        document.getElementById('addOptionBtn')?.addEventListener('click', () => {
            this.addOption();
        });
        
        // Remove option buttons
        document.querySelectorAll('.remove-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeOption(e.target.closest('.option-item'));
            });
        });
    }
    
    addOption() {
        const container = document.getElementById('optionsContainer');
        const optionCount = container.children.length + 1;
        const isSingle = document.getElementById('questionTypeSelect')?.value === 'single_choice';

        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.style.display = 'flex';
        optionItem.style.alignItems = 'center';
        optionItem.style.gap = '12px';

        optionItem.innerHTML = isSingle ? `
            <label class="radio-option" style="margin:0;">
                <input type="radio" name="preview_radio" class="option-radio-input">
                <span class="radio-circle"></span>
            </label>
            <input type="text" class="form-input option-input" placeholder="Option ${optionCount}" required style="flex:1;">
            <button type="button" class="btn btn-sm btn-icon btn-error remove-option-btn">
                <i class="fas fa-trash"></i>
            </button>
        ` : `
            <label class="standard-checkbox" style="margin:0;">
                <input type="checkbox" class="option-checkbox-input">
                <span class="checkmark"></span>
            </label>
            <input type="text" class="form-input option-input" placeholder="Option ${optionCount}" required style="flex:1;">
            <button type="button" class="btn btn-sm btn-icon btn-error remove-option-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(optionItem);
        
        // Bind remove event
        optionItem.querySelector('.remove-option-btn').addEventListener('click', () => {
            this.removeOption(optionItem);
        });
        
    // focus the text input inside the new option row
    optionItem.querySelector('.option-input')?.focus();
    }
    
    removeOption(optionItem) {
        const container = document.getElementById('optionsContainer');
        if (container.children.length > 2) {
            optionItem.remove();
        } else {
            window.portalUI.showNotification('At least 2 options are required', 'error');
        }
    }
    
    saveQuestion() {
        const form = document.getElementById('questionBuilderForm');
        const formData = new FormData(form);
        
        // Validate required fields
        if (!formData.get('question_text').trim()) {
            window.portalUI.showNotification('Question text is required', 'error');
            return;
        }
        
        if (!formData.get('question_type')) {
            window.portalUI.showNotification('Question type is required', 'error');
            return;
        }
        
        const question = {
            question_text: formData.get('question_text').trim(),
            question_type: formData.get('question_type'),
            required: formData.has('required'),
            description: formData.get('description')?.trim() || '',
        };
        
        // Handle type-specific options
        if (['single_choice', 'multiple_choice', 'dropdown'].includes(question.question_type)) {
            const options = Array.from(document.querySelectorAll('.option-input'))
                .map(input => input.value.trim())
                .filter(value => value);
            
            if (options.length < 2) {
                window.portalUI.showNotification('At least 2 options are required', 'error');
                return;
            }
            
            question.options = options;
        }
        
        if (question.question_type === 'rating_scale') {
            if (this.sharedRatingEnabled) {
                question.min_value = this.sharedRating.min;
                question.max_value = this.sharedRating.max;
            } else {
                question.min_value = parseInt(formData.get('min_value')) || 1;
                if (question.min_value < 1) question.min_value = 1;
                question.max_value = parseInt(formData.get('max_value')) || Math.max(5, question.min_value);
            }
            // No rows needed for simple rating scale
        }
        
        if (question.question_type === 'file_upload') {
            question.max_file_size = (parseFloat(formData.get('max_file_size')) || 5) * 1048576;
            const fileTypes = formData.get('allowed_file_types');
            question.allowed_file_types = fileTypes ? 
                fileTypes.split(',').map(t => t.trim()).filter(t => t) : 
                ['.pdf', '.doc', '.docx', '.jpg', '.png'];
        }
        
        // Save or update question
        if (this.currentEditingIndex >= 0) {
            this.questions[this.currentEditingIndex] = question;
            window.portalUI.showNotification('Question updated successfully', 'success');
        } else {
            this.questions.push(question);
            this.questionCounter++;
            window.portalUI.showNotification('Question added successfully', 'success');
        }
        
        this.updateQuestionsDisplay();
        this.closeModals();
    }
    
    updateQuestionsDisplay() {
        const container = document.getElementById('questionsContainer');
        const emptyState = document.getElementById('emptyQuestionsState');
        
        if (this.questions.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = this.questions.map((question, index) => `
            <div class="question-builder-item" data-index="${index}">
                <div class="question-item-header">
                    <div class="question-number">${index + 1}</div>
                    <div class="question-content">
                        <div class="question-text">
                            ${question.question_text}
                            ${question.required ? '<span class="required-indicator">*</span>' : ''}
                        </div>
                        ${question.description ? `<div class="question-description">${question.description}</div>` : ''}
                        <div class="question-type-badge">${this.getQuestionTypeDisplay(question.question_type)}</div>
                    </div>
                    <div class="question-actions">
                        <button type="button" class="btn btn-sm btn-icon" onclick="templateBuilder.editQuestion(${index})" title="Edit Question">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-icon btn-error" onclick="templateBuilder.deleteQuestion(${index})" title="Delete Question">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-icon" onclick="templateBuilder.moveQuestion(${index}, -1)" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-icon" onclick="templateBuilder.moveQuestion(${index}, 1)" title="Move Down" ${index === this.questions.length - 1 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                </div>
                
                <div class="question-preview">
                    ${this.renderQuestionPreview(question)}
                </div>
            </div>
        `).join('') + emptyState.outerHTML;
    }
    
    renderQuestionPreview(question) {
        switch (question.question_type) {
            case 'single_choice':
                return `
                    <div class="question-options-preview">
                        ${question.options.map(option => `
                            <div class="option-preview">
                                <input type="radio" disabled> ${option}
                            </div>
                        `).join('')}
                    </div>
                `;
                
            case 'multiple_choice':
                return `
                    <div class="question-options-preview">
                        ${question.options.map(option => `
                            <div class="option-preview">
                                <input type="checkbox" disabled> ${option}
                            </div>
                        `).join('')}
                    </div>
                `;
                
            case 'dropdown':
                return `
                    <select class="form-input" disabled>
                        <option>Select an option...</option>
                        ${question.options.map(option => `<option>${option}</option>`).join('')}
                    </select>
                `;
                
            case 'rating_scale':
                // Render a simple star rating preview with individual numbers
                const min = question.min_value || 1;
                const max = question.max_value || 5;
                const count = Math.max(1, Math.min(10, (max - min + 1)));
                const starsWithNumbers = Array.from({ length: count }).map((_, i) => {
                    const value = min + i;
                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <i class="fas fa-star" style="color: #ddd; font-size: 20px;"></i>
                            <span style="font-size: 12px; color: #6c757d;">${value}</span>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="rating-scale-preview">
                        <div style="margin-bottom: 12px; color: #6c757d; font-size: 14px;">Rate from ${min} to ${max}:</div>
                        <div style="display: flex; justify-content: space-evenly; align-items: center; gap: 8px; width: 100%;">
                            ${starsWithNumbers}
                        </div>
                    </div>
                `;
                
            case 'short_answer':
                return `<input type="text" class="form-input" placeholder="Short answer text" disabled>`;
                
            case 'paragraph':
                return `<textarea class="form-input" rows="4" placeholder="Long answer text" disabled></textarea>`;
                
            case 'yes_no':
                return `
                    <div class="yes-no-preview">
                        <label><input type="radio" name="preview_${Math.random()}" disabled> Yes</label>
                        <label><input type="radio" name="preview_${Math.random()}" disabled> No</label>
                    </div>
                `;
                
            case 'date':
                return `<input type="date" class="form-input" disabled>`;
                
            case 'file_upload':
                return `
                    <div class="file-upload-preview">
                        <input type="file" disabled style="margin-bottom: 8px;">
                        <div style="font-size: 0.875rem; color: var(--text-muted);">
                            Max size: ${((question.max_file_size || 5242880) / 1048576).toFixed(1)}MB<br>
                            Allowed: ${question.allowed_file_types?.join(', ') || 'All files'}
                        </div>
                    </div>
                `;
                
            default:
                return '';
        }
    }
    
    getQuestionTypeDisplay(type) {
        const types = {
            'single_choice': 'Single Choice',
            'multiple_choice': 'Multiple Choice',
            'rating_scale': 'Rating Scale',
            'dropdown': 'Dropdown',
            'short_answer': 'Short Answer',
            'paragraph': 'Paragraph',
            'yes_no': 'Yes/No',
            'date': 'Date',
            'file_upload': 'File Upload'
        };
        return types[type] || type;
    }
    
    editQuestion(index) {
        this.showQuestionModal(index);
    }
    
    deleteQuestion(index) {
        // show confirmation modal before deleting
        this.showDeleteConfirm(() => {
            this.questions.splice(index, 1);
            this.updateQuestionsDisplay();
            window.portalUI.showNotification('Question deleted successfully', 'success');
        });
    }

    // reusable in-page confirmation modal
    showDeleteConfirm(onConfirm) {
        let modal = document.getElementById('confirmDeleteQuestionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirmDeleteQuestionModal';
            modal.className = 'modal modal-md';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Confirm Delete</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete this question?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" data-action="cancel">Cancel</button>
                        <button class="btn btn-error" id="confirmDeleteQuestionBtn">Delete</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // close wiring
            modal.querySelectorAll('.modal-overlay, .modal-close, [data-action="cancel"]').forEach(el => {
                el.addEventListener('click', () => {
                    this._closeModalElement(modal);
                });
            });
        }

        // open modal
        document.body.classList.add('modal-open');
        modal.classList.add('show');
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) modalContent.style.animation = 'modalZoomIn 0.28s ease-out';

        // confirm handler
        const confirmBtn = modal.querySelector('#confirmDeleteQuestionBtn');
        const handler = () => {
            if (onConfirm) onConfirm();
            this._closeModalElement(modal);
            confirmBtn.removeEventListener('click', handler);
        };
        confirmBtn.addEventListener('click', handler);
    }

    _closeModalElement(modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
        setTimeout(() => {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            if (modalContent) modalContent.style.animation = '';
        }, 260);
    }
    
    moveQuestion(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.questions.length) return;
        
        // Swap questions
        [this.questions[index], this.questions[newIndex]] = [this.questions[newIndex], this.questions[index]];
        this.updateQuestionsDisplay();
    }
    
    showTemplatePreview() {
        const modal = document.getElementById('templatePreviewModal');
        const content = document.getElementById('templatePreviewContent');
        
        const templateName = document.querySelector('[name="name"]').value || 'Untitled Template';
        const templateDescription = document.querySelector('[name="description"]').value || '';
        
        content.innerHTML = `
            <div class="template-preview-section">
                <h2>${templateName}</h2>
                ${templateDescription ? `<p class="text-muted">${templateDescription}</p>` : ''}
                
                <div class="preview-stats">
                    <div class="stat-item">
                        <span class="stat-label">Questions:</span>
                        <span class="stat-value">${this.questions.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Required:</span>
                        <span class="stat-value">${this.questions.filter(q => q.required).length}</span>
                    </div>
                </div>
            </div>
            
            ${this.questions.length > 0 ? `
                <div class="template-preview-section">
                    <h3>Questions Preview</h3>
                    ${this.questions.map((question, index) => `
                        <div class="preview-question">
                            <div class="preview-question-header">
                                <div class="preview-question-number">${index + 1}</div>
                                <div class="preview-question-content">
                                    <h4>
                                        ${question.question_text}
                                        ${question.required ? '<span class="required-indicator">*</span>' : ''}
                                    </h4>
                                    <div class="preview-question-type">${this.getQuestionTypeDisplay(question.question_type)}</div>
                                    ${question.description ? `<p class="text-muted">${question.description}</p>` : ''}
                                </div>
                            </div>
                            
                            <div class="preview-answer-section">
                                ${this.renderQuestionPreview(question)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="empty-state">
                    <i class="fas fa-question-circle"></i>
                    <h5>No Questions Added</h5>
                    <p>Add questions to see the preview</p>
                </div>
            `}
        `;
        
        modal.classList.add('show');
    }
    
    saveTemplate() {
        const form = document.getElementById('templateForm');
        const formData = new FormData(form);
        
        // Validate template
        const templateName = formData.get('name')?.trim();
        if (!templateName) {
            window.portalUI.showNotification('Template name is required', 'error');
            return;
        }
        
        if (this.questions.length === 0) {
            window.portalUI.showNotification('Please add at least one question', 'error');
            return;
        }
        
        // Prepare template data
        const templateData = {
            name: templateName,
            description: formData.get('description')?.trim() || '',
            category: formData.get('category') || null,
            questions: this.questions,
            settings: {
                default_required: formData.has('default_required'),
                include_progress: formData.has('include_progress'),
                enable_autosave: formData.has('enable_autosave'),
                anonymous_default: formData.has('anonymous_default')
            }
        };
        
        // Show loading state
        const saveBtn = document.getElementById('saveTemplateBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Template...';
        saveBtn.disabled = true;
        
        // Submit template (use form action to avoid template tags in a static JS file)
        const formEl = document.getElementById('templateForm');
        const submitUrl = formEl?.action || '{% url "create_template" %}';
        const redirectUrl = formEl?.dataset?.redirect || '{% url "template_list" %}';

        // Submit template
        fetch(submitUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(templateData)
        })
        .then(async (response) => {
            const contentType = (response.headers.get('content-type') || '').toLowerCase();

            // If response is not OK, try to read body (JSON or text) for a helpful message
            if (!response.ok) {
                const text = await response.text();
                let message = text;
                if (contentType.includes('application/json')) {
                    try {
                        const json = JSON.parse(text);
                        message = json.error || json.message || JSON.stringify(json);
                    } catch (e) {
                        // fall back to raw text
                    }
                } else if (text && text.startsWith('<')) {
                    // Received HTML (likely a login redirect or error page) — show short snippet
                    message = `Server returned HTML (status ${response.status}). First 300 chars:\n` + text.slice(0, 300);
                }
                throw new Error(`Request failed (${response.status}): ${message}`);
            }

            // If response is JSON, parse it. Otherwise return text and attempt to parse.
            if (contentType.includes('application/json')) {
                return response.json();
            }

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                throw new Error('Server returned a non-JSON response. See console for details.');
            }
        })
        .then(data => {
            if (data && data.success) {
                window.portalUI.showNotification('Template saved successfully!', 'success');
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1000);
            } else {
                const err = (data && (data.error || data.message)) || 'Error saving template';
                window.portalUI.showNotification(err, 'error');
                console.error('Save template response:', data);
            }
        })
        .catch(error => {
            console.error('Error saving template request:', error);
            // Show truncated message to user
            const msg = (error && error.message) ? (error.message.length > 300 ? error.message.slice(0, 300) + '...' : error.message) : 'Error saving template';
            window.portalUI.showNotification(msg, 'error');
        })
        .finally(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        });
    }

    // Basic info (title/description) click-to-edit
    initBasicInfoEditing() {
        const self = this;
        function makeEditable(displayEl, hiddenInput, isMultiline){
            if(!displayEl || !hiddenInput) return;
            displayEl.addEventListener('click', activate);
            displayEl.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); activate(); } });

            function activate(){
                if(displayEl._editing) return;
                displayEl._editing = true;
                const current = displayEl.textContent.trim();
                let editor;
                if(isMultiline){
                    editor = document.createElement('textarea');
                    editor.rows = 3;
                    editor.className = 'form-input';
                } else {
                    editor = document.createElement('input');
                    editor.type = 'text';
                    editor.className = 'form-input';
                }
                editor.value = (current === 'Untitled form' || current === 'Form description') ? '' : current;
                displayEl.style.display = 'none';
                displayEl.parentNode.insertBefore(editor, displayEl);
                editor.focus();

                function commit(){
                    const v = editor.value.trim() || (isMultiline ? 'Form description' : 'Untitled form');
                    displayEl.textContent = v;
                    hiddenInput.value = v === (isMultiline ? 'Form description' : 'Untitled form') ? '' : v;
                    editor.remove();
                    displayEl.style.display = '';
                    displayEl._editing = false;
                }

                function cancel(){
                    editor.remove();
                    displayEl.style.display = '';
                    displayEl._editing = false;
                }

                editor.addEventListener('blur', commit);
                editor.addEventListener('keydown', function(e){
                    if(e.key === 'Enter' && !isMultiline){ commit(); }
                    if(e.key === 'Escape'){ cancel(); }
                });
            }
        }

        const titleEl = document.getElementById('editableTitle');
        const descEl = document.getElementById('editableDesc');
        const hiddenTitle = document.getElementById('template_name_hidden');
        const hiddenDesc = document.getElementById('template_description_hidden');

        if(titleEl && hiddenTitle){
            if(!hiddenTitle.value) hiddenTitle.value = titleEl.textContent.trim() === 'Untitled form' ? '' : titleEl.textContent.trim();
            makeEditable(titleEl, hiddenTitle, false);
        }
        if(descEl && hiddenDesc){
            if(!hiddenDesc.value) hiddenDesc.value = descEl.textContent.trim() === 'Form description' ? '' : descEl.textContent.trim();
            makeEditable(descEl, hiddenDesc, true);
        }

        // ensure sync before form submit
        const form = document.getElementById('templateForm');
        if(form){
            form.addEventListener('submit', function(){
                if(titleEl && hiddenTitle && !hiddenTitle.value) hiddenTitle.value = titleEl.textContent.trim() === 'Untitled form' ? '' : titleEl.textContent.trim();
                if(descEl && hiddenDesc && !hiddenDesc.value) hiddenDesc.value = descEl.textContent.trim() === 'Form description' ? '' : descEl.textContent.trim();
            });
        }
    }
    
    closeModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
            }

            setTimeout(() => {
                modal.classList.remove('show');
                document.body.classList.remove('modal-open');
                if (modalContent) modalContent.style.animation = '';
            }, 260);
        });
    }
}

// (Initialization is handled at top to expose window.templateBuilder)