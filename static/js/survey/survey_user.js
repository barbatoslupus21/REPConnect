document.addEventListener('DOMContentLoaded', function() {
    let expandedSurvey = null;
    let currentSurveyContent = null;
    
    // Initialize dashboard
    initializeDashboard();
    
    function initializeDashboard() {
        setupSurveyHover();
        setupSurveyActions();
        setupFilterFunctionality();
        updateDashboardStats();
        initializeProgressBars();
        setupMobileNavigation();
    }
    
    // Mobile navigation functions
    function setupMobileNavigation() {
        // Initialize mobile state
        if (isMobileView()) {
            showSurveysList();
        }
    }
    
    function isMobileView() {
        // Check both screen width and if the device has hover capability
        return window.innerWidth <= 992 || !window.matchMedia('(hover: hover)').matches;
    }
    
    function showSurveysList() {
        const container = document.querySelector('.dashboard-container');
        if (container) {
            container.classList.remove('show-content');
        }
    }
    
    function showContentArea() {
        const container = document.querySelector('.dashboard-container');
        if (container && isMobileView()) {
            container.classList.add('show-content');
        }
    }
    
    function addMobileBackButton(contentArea) {
        if (!isMobileView()) return;
        
        // Check if back button already exists
        if (contentArea.querySelector('.mobile-back-btn')) return;
        
        const backButton = document.createElement('button');
        backButton.className = 'mobile-back-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Dashboard';
        backButton.addEventListener('click', function() {
            showSurveysList();
        });
        
        // Insert back button at the beginning of content
        contentArea.insertBefore(backButton, contentArea.firstChild);
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const container = document.querySelector('.dashboard-container');
        if (!isMobileView() && container) {
            container.classList.remove('show-content');
        }
    });
    
    function setupSurveyHover() {
        const surveyItems = document.querySelectorAll('.survey-item');
        
        surveyItems.forEach(item => {
            // Only setup hover behavior on devices that support hover (desktop)
            if (window.matchMedia('(hover: hover)').matches && window.innerWidth > 992) {
                item.addEventListener('mouseenter', function() {
                    if (expandedSurvey && expandedSurvey !== this) {
                        collapseSurvey(expandedSurvey);
                    }
                    expandSurvey(this);
                });
                
                // Collapse on unhover only on desktop
                item.addEventListener('mouseleave', function() {
                    if (item.classList.contains('expanded')) {
                        collapseSurvey(item);
                    }
                });
            }
            
            // Click or keyboard toggle on header to expand/collapse
            const header = item.querySelector('.survey-header');
            const brief = item.querySelector('.survey-brief');
            
            if (header) {
                header.addEventListener('click', function(e) {
                    // Avoid toggling when clicking on a control inside the header
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    e.preventDefault(); // Prevent any default behavior
                    e.stopPropagation(); // Stop event bubbling
                    toggleSurveyExpansion(item);
                });
                
                // Add touch support for mobile devices
                header.addEventListener('touchend', function(e) {
                    if (e.target.closest('button') || e.target.closest('a')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSurveyExpansion(item);
                });
                
                header.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.click();
                    }
                });
            }
            
            // Also allow clicking on the brief description to expand
            if (brief) {
                brief.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSurveyExpansion(item);
                });
                
                // Add touch support for brief description
                brief.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSurveyExpansion(item);
                });
            }
        });
    }
    
    function expandSurvey(surveyItem) {
        if (expandedSurvey === surveyItem) return;

        // Collapse previously expanded survey
        if (expandedSurvey) {
            collapseSurvey(expandedSurvey);
        }

        // Expand current survey
        surveyItem.classList.add('expanded');
        expandedSurvey = surveyItem;

        // Animate progress bar if present
        const progressFill = surveyItem.querySelector('.progress-fill');
        if (progressFill) {
            // Force a reflow to ensure the transition works
            progressFill.offsetHeight;

            // Get the current width (should be the target width from template)
            const currentWidth = progressFill.style.width || '0%';
            const progressValue = parseInt(progressFill.dataset.progress || '0');

            // If it's not already animated, trigger the animation
            if (currentWidth !== '0%' && !progressFill.classList.contains('animated')) {
                progressFill.style.width = '0%';
                progressFill.classList.add('animated');

                // Use requestAnimationFrame for smoother animation
                requestAnimationFrame(() => {
                    progressFill.style.width = currentWidth;
                });
            }
        }
    }
    
    function collapseSurvey(surveyItem) {
        if (!surveyItem) return;
        
        surveyItem.classList.remove('expanded');
        if (expandedSurvey === surveyItem) {
            expandedSurvey = null;
        }
    }
    
    function toggleSurveyExpansion(item) {
        if (item.classList.contains('expanded')) {
            collapseSurvey(item);
        } else {
            // On mobile, collapse any previously expanded survey before expanding new one
            if (isMobileView() && expandedSurvey && expandedSurvey !== item) {
                collapseSurvey(expandedSurvey);
            }
            expandSurvey(item);
        }
    }
    
    
    
    function setupSurveyActions() {
        // Start Survey buttons
        document.addEventListener('click', function(e) {
            if (e.target.closest('.start-survey-btn')) {
                const btn = e.target.closest('.start-survey-btn');
                const surveyId = btn.dataset.surveyId;
                handleStartSurvey(surveyId, btn);
            }
            
            if (e.target.closest('.view-details-btn')) {
                const btn = e.target.closest('.view-details-btn');
                const surveyId = btn.dataset.surveyId;
                handleViewDetails(surveyId);
            }
            
            if (e.target.closest('.view-response-btn')) {
                const btn = e.target.closest('.view-response-btn');
                const surveyId = btn.dataset.surveyId;
                handleViewResponse(surveyId);
            }

            // Close button in content area should return to dashboard
            if (e.target.closest('.close-questions-btn')) {
                showDashboard();
            }
            
            // Back to dashboard button should return to dashboard
            if (e.target.closest('.back-to-dashboard-btn')) {
                showDashboard();
            }
            
            // Mobile back button should return to surveys list
            if (e.target.closest('.mobile-back-btn')) {
                showSurveysList();
            }
        });
    }
    
    function handleStartSurvey(surveyId, btn) {
        console.log('handleStartSurvey: starting for surveyId=', surveyId);
        // Show loading state
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
    // Load survey preview (JSON)
    fetch(`/survey/surveys/${surveyId}/preview/json/`)
            .then(response => {
                const ct = response.headers.get('content-type') || '';
                console.log(`preview json response: status=${response.status}, content-type=${ct}`);
                if (!response.ok) {
                    return response.text().then(t => { throw new Error('Network error: ' + response.status + ' - ' + t); });
                }
                if (!ct.includes('application/json')) {
                    return response.text().then(t => { throw new Error('Non-JSON response: ' + t); });
                }
                return response.json();
            })
            .then(data => {
                console.log('preview json payload:', data);
                // Pass the originating button so we can render into the left card
                try {
                    displaySurveyPreview(data, btn);
                } catch (err) {
                    console.error('Error rendering preview:', err);
                    showErrorMessage('Failed to render survey preview. See console for details.');
                }
            })
            .catch(error => {
                console.error('Error loading survey:', error);
                showErrorMessage('Failed to load survey. Please try again.');
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
            });
    }
    
    function handleViewDetails(surveyId) {
        // Prefer showing the user's response; if none, show survey details
        fetch(`/survey/surveys/${surveyId}/my-response/`)
            .then(res => {
                const ct = res.headers.get('content-type') || '';
                if (res.ok && ct.includes('application/json')) {
                    return res.json().then(data => ({ kind: 'response', data }));
                }
                // Fallback to details
                return fetch(`/survey/surveys/${surveyId}/details/`).then(r => {
                    const ctd = r.headers.get('content-type') || '';
                    if (!r.ok || !ctd.includes('application/json')) throw new Error('Failed details fetch');
                    return r.json().then(data => ({ kind: 'details', data }));
                });
            })
            .then(result => {
                if (result.kind === 'response') {
                    displayUserResponse(result.data);
                } else {
                    displaySurveyDetails(result.data);
                }
            })
            .catch(error => {
                console.error('Error loading survey details/response:', error);
                showErrorMessage('Failed to load survey information. Please try again.');
            });
    }
    
    function handleViewResponse(surveyId) {
        fetch(`/survey/surveys/${surveyId}/my-response/`)
            .then(response => {
                const ct = response.headers.get('content-type') || '';
                if (!response.ok) throw new Error('Network error');
                if (!ct.includes('application/json')) throw new Error('Non-JSON response');
                return response.json();
            })
            .then(data => {
                console.log('Response data received:', data);
                displayUserResponse(data);
            })
            .catch(error => {
                console.error('Error loading response:', error);
                showErrorMessage('Failed to load your response. Please try again.');
            });
    }
    
    function displaySurveyPreview(surveyData, originBtn) {
        const survey = surveyData.survey || surveyData; // handle payload wrapper
        const questionsHtml = generateQuestionsPreview(survey.questions);
    // Always render survey preview into the main content area (#contentArea)
    // This avoids mutating the left list items and keeps details in the right column.
        // Render into right column
        currentSurveyContent = 'preview';
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="survey-content show">
                <div class="survey-content-header">
                    <h2 class="survey-content-title">${survey.title}</h2>
                    <p class="survey-content-description">${survey.description || ''}</p>
                </div>
                <div class="survey-content-body">
                    ${questionsHtml}
                </div>
                <div class="survey-content-actions">
                    <button class="btn btn-outline close-questions-btn">Close</button>
                    <button class="btn btn-primary submit-survey-btn" data-survey-id="${survey.id}">Submit Survey</button>
                </div>
            </div>
        `;

    // Initialize interactive controls (radios/checkboxes/rating) then bind actions
    initPreviewControls();
    setupContentActions();
    
    // Add mobile back button and show content area on mobile
    addMobileBackButton(contentArea);
    showContentArea();
    }

    // Escape HTML to avoid XSS when rendering question text/options
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize interactive behaviors for the previewed controls
    function initPreviewControls() {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;

        // Wire standard-checkbox containers so clicking the label toggles the inner checkbox (replicates template behavior)
        contentArea.querySelectorAll('.standard-checkbox').forEach(container => {
            container.addEventListener('click', function(e) {
                // Allow native clicks on input to proceed
                if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') return;
                const cb = container.querySelector('input[type="checkbox"]');
                if (cb) {
                    // Use .click() so browser toggles and fires events consistently
                    cb.click();
                }
            });
        });

        // Wire radio-option containers to check the inner radio when label is clicked
        contentArea.querySelectorAll('.radio-option').forEach(container => {
            container.addEventListener('click', function(e) {
                // If user clicked the native input, let default behaviour run
                if (e.target.tagName === 'INPUT' && e.target.type === 'radio') return;
                const r = container.querySelector('input[type="radio"]');
                if (r) {
                    // Use .click() to ensure browser handles grouping and change events
                    r.click();
                }
            });
        });

        // Setup star rating interactivity: hover preview and click to set value in hidden input
        contentArea.querySelectorAll('.rating-stars').forEach(starsEl => {
            const qName = starsEl.dataset.questionName;
            const hiddenInput = starsEl.closest('.rating-scale-container').querySelector(`input[type="hidden"][name="${qName}"]`);
            const starEls = Array.from(starsEl.querySelectorAll('.rating-star'));

            function setVisual(value) {
                starEls.forEach(s => {
                    const v = parseInt(s.dataset.value, 10);
                    if (v <= value) {
                        s.classList.remove('empty');
                        s.classList.add('filled');
                    } else {
                        s.classList.remove('filled');
                        s.classList.add('empty');
                    }
                });
            }

            // hover preview
            starEls.forEach(s => {
                s.addEventListener('mouseenter', function() {
                    const v = parseInt(this.dataset.value, 10) || 0;
                    setVisual(v);
                });
                s.addEventListener('mouseleave', function() {
                    // restore from hidden input
                    const cur = parseInt(hiddenInput ? hiddenInput.value : 0, 10) || 0;
                    setVisual(cur);
                });
                s.addEventListener('click', function() {
                    const v = parseInt(this.dataset.value, 10) || 0;
                    console.log('Star clicked:', v, 'Hidden input:', hiddenInput, 'Question name:', qName);
                    if (hiddenInput) {
                        hiddenInput.value = String(v);
                        console.log('Hidden input value set to:', hiddenInput.value);
                        const qp = hiddenInput.closest('.question-preview');
                        if (qp) {
                            qp.classList.remove('error');
                            console.log('Removed error class from question preview');
                        }
                    } else {
                        console.error('Hidden input not found for question:', qName);
                    }
                    setVisual(v);
                });
            });

            // initialize visual from hidden value if present
            const initial = parseInt(hiddenInput ? hiddenInput.value : 0, 10) || 0;
            setVisual(initial);
        });

        // Setup matrix rating interactivity for grouped rating scale questions
        contentArea.querySelectorAll('.rating-matrix-container.user-matrix').forEach(matrixContainer => {
            matrixContainer.querySelectorAll('.matrix-row').forEach(row => {
                const starEls = Array.from(row.querySelectorAll('.matrix-star'));
                if (starEls.length === 0) return;
                
                const qName = starEls[0].dataset.questionName;
                const hiddenInput = row.querySelector(`input[type="hidden"][name="${qName}"]`);
                
                function setVisual(value) {
                    starEls.forEach(s => {
                        const v = parseInt(s.dataset.value, 10);
                        if (v <= value) {
                            s.classList.remove('empty');
                            s.classList.add('filled');
                        } else {
                            s.classList.remove('filled');
                            s.classList.add('empty');
                        }
                    });
                }
                
                // hover preview
                starEls.forEach(s => {
                    s.addEventListener('mouseenter', function() {
                        const v = parseInt(this.dataset.value, 10) || 0;
                        setVisual(v);
                    });
                    s.addEventListener('mouseleave', function() {
                        // restore from hidden input
                        const cur = parseInt(hiddenInput ? hiddenInput.value : 0, 10) || 0;
                        setVisual(cur);
                    });
                    s.addEventListener('click', function() {
                        const v = parseInt(this.dataset.value, 10) || 0;
                        if (hiddenInput) {
                            hiddenInput.value = String(v);
                            // Remove error state from row if exists
                            row.classList.remove('error');
                        }
                        setVisual(v);
                    });
                });
                
                // initialize visual from hidden value if present
                const initial = parseInt(hiddenInput ? hiddenInput.value : 0, 10) || 0;
                setVisual(initial);
            });
        });
    }

    // Validate required questions, then submit answers via POST
    function submitSurvey(surveyId) {
        // Validate required questions in the preview content
        const validation = validateRequiredQuestions();
        if (!validation.valid) {
            // Show toast, highlight, and scroll to first invalid question
            showToast('error', 'Please answer all required questions.');
            if (validation.firstInvalid) {
                validation.firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Attempt to focus first control inside
                const focusable = validation.firstInvalid.querySelector('input, select, textarea, button');
                if (focusable) try { focusable.focus({ preventScroll: true }); } catch (e) {}
            }
            return; // prevent submit
        }
        const contentArea = document.getElementById('contentArea');
        const formElements = contentArea.querySelectorAll('[name^="question_"]');
        const formData = new FormData();

        console.log('DEBUG: Form elements found:', formElements.length);
        formElements.forEach(el => {
            console.log('DEBUG: Element:', el.name, el.type, el.value, el.checked);
        });

        // Collect values; FormData handles multiple values for same name (checkboxes)
        formElements.forEach(el => {
            if (!el.name) return;
            if (el.type === 'checkbox') {
                if (el.checked) {
                    console.log('DEBUG: Adding checkbox:', el.name, el.value);
                    formData.append(el.name, el.value);
                }
            } else if (el.type === 'radio') {
                if (el.checked) {
                    console.log('DEBUG: Adding radio:', el.name, el.value);
                    formData.append(el.name, el.value);
                }
            } else if (el.tagName.toLowerCase() === 'select') {
                console.log('DEBUG: Adding select:', el.name, el.value);
                formData.append(el.name, el.value);
            } else if (el.type === 'file') {
                if (el.files && el.files.length) {
                    console.log('DEBUG: Adding file:', el.name, el.files[0].name);
                    formData.append(el.name, el.files[0]);
                }
            } else {
                console.log('DEBUG: Adding text/other:', el.name, el.value || '');
                formData.append(el.name, el.value || '');
            }
        });

        // Add submit flag so server knows to finalize
        formData.append('submit_survey', '1');

        // CSRF token from cookie
        const csrfToken = getCookie('csrftoken');

        // Debug: Show all form data being submitted
        console.log('DEBUG: FormData being submitted:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }

    fetch(`/survey/surveys/${surveyId}/take/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
            },
            body: formData
        })
        .then(async res => {
            const ct = res.headers.get('content-type') || '';
            const text = await res.text();
            if (!res.ok) {
                // Try to parse JSON error payload returned by server (includes trace)
                try {
                    const json = JSON.parse(text);
                    console.error('Server error response:', json);
                    if (json.trace) {
                        // Log trace for debugging
                        console.error('Server traceback:\n', json.trace);
                    }
                    showErrorMessage(json.error || ('Server error: ' + res.status));
                } catch (e) {
                    console.error('Server returned non-OK response:', res.status, text);
                    showErrorMessage('Server error: ' + res.status);
                }
                throw new Error('Network error: ' + res.status);
            }

            // Parse JSON response
            try {
                const result = JSON.parse(text);
                if (result.success) {
                    // Show success message in content area
                    const contentArea = document.getElementById('contentArea');
                    if (contentArea) {
                        contentArea.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; min-height: 60vh;">
                                <div style="text-align: center; max-width: 500px;">
                                    <div style="font-size: 4rem; color: #28a745; margin-bottom: 1rem;">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <h2 style="color: #28a745; margin-bottom: 1rem;">Survey Submitted Successfully!</h2>
                                    <p style="font-size: 1.1rem; color: #6c757d; margin-bottom: 2rem;">
                                        Thank you for completing the "${result.survey_title || 'survey'}". Your responses have been saved.
                                    </p>
                                    <div>
                                        <button onclick="window.location.reload()" class="btn btn-primary">
                                            <i class="fas fa-arrow-left"></i>
                                            Return to Dashboard
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Refresh the survey list to update status
                    refreshSurveyList();
                    
                    showToast('success', result.message || 'Survey submitted successfully.');
                } else {
                    showToast('error', result.error || 'Failed to submit survey.');
                }
            } catch (e) {
                console.error('Error parsing response:', e);
                showToast('error', 'Failed to submit survey. Please try again.');
            }
        })
        .catch(err => {
            console.error('Error submitting survey:', err);
            // err may already have triggered a user-visible message; if not, show generic one
            showToast('error', 'Failed to submit survey. Please try again.');
        });
    }

    // Read cookie helper
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Validate all required questions in the current preview content
    function validateRequiredQuestions() {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return { valid: true };
        
        let allValid = true;
        let firstInvalid = null;

        // Validate regular question blocks
        const requiredBlocks = contentArea.querySelectorAll('.question-preview[data-required="1"]');
        requiredBlocks.forEach(block => {
            // Clear previous error
            block.classList.remove('error');
            const qid = block.getAttribute('data-question-id');
            const baseName = `question_${qid}`;
            let valid = false;

            // Try common controls
            const radios = block.querySelectorAll(`input[type="radio"][name="${baseName}"]`);
            const checks = block.querySelectorAll(`input[type="checkbox"][name="${baseName}"]`);
            const select = block.querySelector('select[name="' + baseName + '"]');
            const text = block.querySelector('input[type="text"][name="' + baseName + '"]');
            const textarea = block.querySelector('textarea[name="' + baseName + '"]');
            const date = block.querySelector('input[type="date"][name="' + baseName + '"]');
            const file = block.querySelector('input[type="file"][name="' + baseName + '"]');

            if (radios && radios.length) {
                valid = Array.from(radios).some(r => r.checked);
            } else if (checks && checks.length) {
                valid = Array.from(checks).some(c => c.checked);
            } else if (select) {
                valid = !!(select.value && select.value.trim() !== '');
            } else if (text) {
                valid = !!(text.value && text.value.trim() !== '');
            } else if (textarea) {
                valid = !!(textarea.value && textarea.value.trim() !== '');
            } else if (date) {
                valid = !!date.value;
            } else if (file) {
                valid = file.files && file.files.length > 0;
            } else {
                // Check for single hidden input (simple rating scale)
                const hiddenInput = block.querySelector(`input[type="hidden"][name="${baseName}"]`);
                if (hiddenInput) {
                    valid = !!(hiddenInput.value && hiddenInput.value !== '0' && hiddenInput.value.trim() !== '');
                } else {
                    // Rating scale (hidden inputs), or per-item answers
                    const hiddenPerItems = block.querySelectorAll(`input[type="hidden"][name^="${baseName}_"]`);
                    if (hiddenPerItems && hiddenPerItems.length) {
                        // Consider valid if at least one item is rated (aligns with server fallback)
                        valid = Array.from(hiddenPerItems).some(h => h.value && h.value !== '0');
                    }
                }
            }

            if (!valid) {
                allValid = false;
                block.classList.add('error');
                if (!firstInvalid) firstInvalid = block;
            }
        });

        // Validate matrix rows for required questions
        const requiredMatrixRows = contentArea.querySelectorAll('.matrix-row[data-required="1"]');
        requiredMatrixRows.forEach(row => {
            row.classList.remove('error');
            const qid = row.getAttribute('data-question-id');
            const baseName = `question_${qid}`;
            const hiddenInput = row.querySelector(`input[type="hidden"][name="${baseName}"]`);
            
            let valid = false;
            if (hiddenInput) {
                valid = !!(hiddenInput.value && hiddenInput.value !== '0' && hiddenInput.value.trim() !== '');
            }
            
            if (!valid) {
                allValid = false;
                row.classList.add('error');
                if (!firstInvalid) firstInvalid = row;
            }
        });

        // When user edits, clear error state
        const contentAreaEl = document.getElementById('contentArea');
        if (contentAreaEl && !contentAreaEl.dataset.errorClearBound) {
            contentAreaEl.addEventListener('change', (e) => {
                const qp = e.target.closest('.question-preview');
                if (qp) qp.classList.remove('error');
                const mr = e.target.closest('.matrix-row');
                if (mr) mr.classList.remove('error');
            });
            contentAreaEl.dataset.errorClearBound = '1';
        }

        return { valid: allValid, firstInvalid };
    }

    // Show toast notification using the site's toast design
    function showToast(type, message) {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add icon based on type
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
            default:
                icon = '<i class="fas fa-bell"></i>';
        }
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${icon}
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 4000);
    }
    
    function displaySurveyDetails(surveyData) {
        const contentArea = document.getElementById('contentArea');
        currentSurveyContent = 'details';
        
        const surveyContent = `
            <div class="survey-content show">
                <div class="survey-content-header">
                    <h2 class="survey-content-title">${surveyData.title}</h2>
                    <p class="survey-content-description">${surveyData.description}</p>
                </div>
                <div class="survey-content-body">
                    <div class="survey-info-grid">
                        <div class="info-card">
                            <h4>Survey Information</h4>
                            <div class="info-details">
                                <div class="info-row">
                                    <span class="info-label">Created by:</span>
                                    <span class="info-value">${surveyData.created_by}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Created on:</span>
                                    <span class="info-value">${formatDate(surveyData.created_at)}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Status:</span>
                                    <span class="info-value">
                                        <span class="status-pill status-${getStatusColor(surveyData.status)}">
                                            ${surveyData.status_display}
                                        </span>
                                    </span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Deadline:</span>
                                    <span class="info-value">${surveyData.deadline ? formatDate(surveyData.deadline) : 'No deadline'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Anonymous:</span>
                                    <span class="info-value">
                                        <span class="status-badge status-${surveyData.anonymous ? 'green' : 'gray'}">
                                            <i class="fas ${surveyData.anonymous ? 'fa-shield-alt' : 'fa-user'}"></i>
                                            ${surveyData.anonymous ? 'Yes' : 'No'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <h4>Your Progress</h4>
                            <div class="progress-info">
                                <div class="progress-circle-large">
                                    <svg viewBox="0 0 36 36" class="progress-ring">
                                        <path class="progress-ring-bg"
                                              d="M18 2.0845
                                                 a 15.9155 15.9155 0 0 1 0 31.831
                                                 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                        <path class="progress-ring-fill"
                                              stroke-dasharray="${surveyData.progress || 0}, 100"
                                              d="M18 2.0845
                                                 a 15.9155 15.9155 0 0 1 0 31.831
                                                 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                    </svg>
                                    <div class="progress-text">
                                        <span class="progress-percentage">${surveyData.progress || 0}%</span>
                                        <span class="progress-label">Complete</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="questions-overview">
                        <h4>Questions Overview (${surveyData.questions_count} total)</h4>
                        <div class="question-types">
                            ${generateQuestionTypesOverview(surveyData.question_types)}
                        </div>
                    </div>
                </div>
                <div class="survey-content-actions">
                    <button class="btn btn-outline back-to-dashboard-btn">
                        <i class="fas fa-arrow-left"></i>
                        Back to Dashboard
                    </button>
                    ${surveyData.can_take ? `
                        <button class="btn btn-primary begin-survey-btn" data-survey-id="${surveyData.id}">
                            <i class="fas fa-play"></i>
                            ${surveyData.progress > 0 ? 'Continue Survey' : 'Start Survey'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        contentArea.innerHTML = surveyContent;
        setupContentActions();
    }
    
    function setupRatingStars() {
        const contentArea = document.getElementById('contentArea');
        // Setup star rating interactivity: hover preview and click to set value in hidden input
        contentArea.querySelectorAll('.rating-stars').forEach(starsEl => {
            const qName = starsEl.dataset.questionName;
            const hiddenInput = starsEl.parentElement.querySelector(`input[type="hidden"][name="${qName}"]`);
            const starEls = Array.from(starsEl.querySelectorAll('.rating-star'));

            function setVisual(value) {
                starEls.forEach(s => {
                    const v = parseInt(s.dataset.value, 10);
                    if (v <= value) {
                        s.classList.remove('empty');
                        s.classList.add('filled');
                    } else {
                        s.classList.remove('filled');
                        s.classList.add('empty');
                    }
                });
            }

            // hover preview
            starEls.forEach(s => {
                s.addEventListener('mouseenter', function() {
                    const v = parseInt(this.dataset.value, 10) || 0;
                    setVisual(v);
                });
                s.addEventListener('mouseleave', function() {
                    // restore from hidden input
                    const cur = parseInt(hiddenInput ? hiddenInput.value : 0, 10) || 0;
                    setVisual(cur);
                });
                s.addEventListener('click', function() {
                    const v = parseInt(this.dataset.value, 10) || 0;
                    if (hiddenInput) {
                        hiddenInput.value = String(v);
                        const qp = hiddenInput.closest('.question-item');
                        if (qp) qp.classList.remove('error');
                    }
                    setVisual(v);
                });
            });

            // initialize visual from hidden value if present
            const initial = parseInt(hiddenInput ? hiddenInput.value : 0, 10) || 0;
            setVisual(initial);
        });
    }
    
    function displayUserResponse(responseData) {
        console.log('Displaying user response:', responseData);
        console.log('Answers array:', responseData.answers);
        
        const contentArea = document.getElementById('contentArea');
        currentSurveyContent = 'response';
        
        // Generate the answers HTML
        let answersHtml = '';
        try {
            answersHtml = generateResponseAnswers(responseData.answers);
        } catch (error) {
            console.error('Error generating answers HTML:', error);
            answersHtml = `
                <div class="error-state">
                    <p>Error displaying responses. Raw data:</p>
                    <pre>${JSON.stringify(responseData.answers, null, 2)}</pre>
                </div>
            `;
        }
        
        const surveyContent = `
            <div class="survey-content show">
                <div class="survey-content-header">
                    <h2 class="survey-content-title">Your Response: ${responseData.survey_title}</h2>
                    <p class="survey-content-description">
                        Completed on ${formatDateTime(responseData.submitted_at)}
                    </p>
                </div>
                <div class="survey-content-body">
                    <div class="response-answers">
                        ${answersHtml}
                    </div>
                </div>
                <div class="survey-content-actions">
                    <button class="btn btn-outline back-to-dashboard-btn">
                        <i class="fas fa-arrow-left"></i>
                        Back to Dashboard
                    </button>
                </div>
            </div>
        `;
        
        console.log('Setting content area HTML...');
        contentArea.innerHTML = surveyContent;
        setupContentActions();
        
        // Add mobile back button and show content area on mobile
        addMobileBackButton(contentArea);
        showContentArea();
    }
    
    function generateQuestionsPreview(questions) {
        if (!questions || !Array.isArray(questions)) {
            console.warn('generateQuestionsPreview: unexpected questions payload', questions);
            return `<div class="empty-questions-state"><p>No questions available for this survey.</p></div>`;
        }
        if (questions.length === 0) {
            return `<div class="empty-questions-state"><p>No questions found in this survey.</p></div>`;
        }

        // normalize various option shapes into an array of display strings
        function normalizeOptions(raw) {
            if (!raw) return [];
            if (Array.isArray(raw)) {
                return raw.map(opt => {
                    if (opt === null || opt === undefined) return '';
                    if (typeof opt === 'string') return opt;
                    if (typeof opt === 'number') return String(opt);
                    if (typeof opt === 'object') {
                        // prefer common keys
                        return opt.label || opt.text || opt.name || opt.value || opt.option || JSON.stringify(opt);
                    }
                    return String(opt);
                });
            }
            if (typeof raw === 'string') {
                // comma separated
                if (raw.indexOf(',') !== -1) {
                    return raw.split(',').map(s => s.trim()).filter(Boolean);
                }
                return [raw];
            }
            return [String(raw)];
        }

        // Group consecutive rating scale questions with the same scale
        function groupConsecutiveRatingQuestions(questions) {
            const result = [];
            let i = 0;
            
            while (i < questions.length) {
                const question = questions[i];
                
                // Check if this is a rating scale question
                if (question.type === 'rating_scale') {
                    const min = question.min_value || 1;
                    const max = question.max_value || 5;
                    
                    // Look for consecutive rating scale questions with the same scale
                    const group = [{ question, index: i }];
                    let j = i + 1;
                    
                    while (j < questions.length) {
                        const nextQuestion = questions[j];
                        if (nextQuestion.type === 'rating_scale' &&
                            (nextQuestion.min_value || 1) === min &&
                            (nextQuestion.max_value || 5) === max) {
                            group.push({ question: nextQuestion, index: j });
                            j++;
                        } else {
                            break;
                        }
                    }
                    
                    // If we have 2 or more consecutive rating questions with same scale, group them
                    if (group.length >= 2) {
                        result.push({
                            type: 'rating_matrix',
                            questions: group,
                            startIndex: i,
                            min,
                            max
                        });
                        i = j;
                    } else {
                        // Single rating question, render normally
                        result.push({ type: 'single', question, index: i });
                        i++;
                    }
                } else {
                    result.push({ type: 'single', question, index: i });
                    i++;
                }
            }
            
            return result;
        }

        // Render a single question
        function renderSingleQuestion(question, index) {
            const qid = question.id;
            const qName = `question_${qid}`;
            let control = '';
            const opts = normalizeOptions(question.options);

            switch (question.type) {
                case 'single_choice':
                    control = (opts || []).map(opt => `
                        <label class="radio-option survey-radio-option">
                            <input type="radio" name="${qName}" value="${escapeHtml(opt)}">
                            <span class="radio-circle"></span>
                            <span class="radio-label">${escapeHtml(opt)}</span>
                        </label>
                    `).join('');
                    break;

                case 'multiple_choice':
                    control = (opts || []).map(opt => `
                        <label class="standard-checkbox" style="margin-bottom:12px; display:flex; align-items:center; gap:12px;">
                            <input type="checkbox" name="${qName}" value="${escapeHtml(opt)}">
                            <span class="checkmark"></span>
                            <span>${escapeHtml(opt)}</span>
                        </label>
                    `).join('');
                    break;

                case 'dropdown':
                    control = `
                        <select name="${qName}" class="form-input">
                            <option value="">Select...</option>
                            ${(opts || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                        </select>
                    `;
                    break;

                case 'rating_scale':
                    {
                        const minVal = question.min_value || 1;
                        const maxVal = question.max_value || 5;
                        // Simple rating scale with individual numbers under each star
                        const starsWithNumbers = Array.from({length: maxVal - minVal + 1}, (_, i) => {
                            const value = minVal + i;
                            return `
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                    <i class="fas fa-star rating-star empty" data-value="${value}" aria-hidden="true" style="font-size:24px; cursor:pointer;"></i>
                                    <span style="font-size: 12px; color: #6c757d;">${value}</span>
                                </div>
                            `;
                        }).join('');
                        
                        control = `
                            <div class="rating-scale-container">
                                <div class="rating-scale-simple" style="display:flex; align-items:center; gap:12px; padding:12px;">
                                    <div class="rating-stars" data-question-name="${qName}" style="display:flex; max-width: 50% !important; min-width:20% !important; justify-content: space-evenly;">
                                        ${starsWithNumbers}
                                    </div>
                                    <input type="hidden" name="${qName}" value="">
                                </div>
                            </div>
                        `;
                    }
                    break;

                case 'short_answer':
                    control = `<input type="text" name="${qName}" class="form-input">`;
                    break;

                case 'paragraph':
                    control = `<textarea name="${qName}" class="form-input"></textarea>`;
                    break;

                case 'yes_no':
                    control = `
                        <div class="radio-options-vertical">
                            <label class="radio-option survey-radio-option">
                                <input type="radio" name="${qName}" value="true">
                                <span class="radio-circle"></span>
                                <span class="radio-label">Yes</span>
                            </label>
                            <label class="radio-option survey-radio-option">
                                <input type="radio" name="${qName}" value="false">
                                <span class="radio-circle"></span>
                                <span class="radio-label">No</span>
                            </label>
                        </div>
                    `;
                    break;

                case 'date':
                    control = `<input type="date" name="${qName}" class="form-input">`;
                    break;

                case 'file_upload':
                    control = `<input type="file" name="${qName}" class="form-input">`;
                    break;

                default:
                    control = `<input type="text" name="${qName}" class="form-input">`;
            }

            return `
                <div class="question-preview" data-question-id="${qid}" data-required="${question.required ? '1' : '0'}">
                    <div class="question-number">${index + 1}.</div>
                    <div class="question-text">${escapeHtml(question.text)}</div>   
                    ${question.required ? '<span class="required-indicator">*</span>' : ''}
                    <div class="question-control">
                        ${control}
                    </div>
                </div>
            `;
        }

        // Render a group of rating scale questions as a matrix
        function renderRatingMatrixGroup(groupData) {
            const { questions: groupQuestions, min, max } = groupData;
            const scaleLength = max - min + 1;
            const headerLabels = Array.from({ length: scaleLength }, (_, i) => min + i);
            
            return `
                <div class="rating-matrix-container user-matrix user-survey">
                    <div class="rating-matrix">
                        <table class="rating-matrix-table">
                            <thead>
                                <tr>
                                    <th class="matrix-question-header"></th>
                                    ${headerLabels.map(val => `
                                        <th class="matrix-rating-header">
                                            <span>${val}</span>
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${groupQuestions.map(({ question, index }) => {
                                    const qid = question.id;
                                    const qName = `question_${qid}`;
                                    return `
                                        <tr class="matrix-row" data-question-id="${qid}" data-required="${question.required ? '1' : '0'}">
                                            <td class="matrix-question-cell user-scale-cell">
                                                <div class="matrix-question-number">${index + 1}.</div>
                                                <div class="matrix-question-content">
                                                    <span class="matrix-question-text">
                                                        ${escapeHtml(question.text)}
                                                        ${question.required ? '<span class="required-indicator">*</span>' : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            ${headerLabels.map(val => `
                                                <td class="matrix-rating-cell">
                                                    <i class="fas fa-star matrix-star rating-star empty" 
                                                       data-value="${val}" 
                                                       data-question-name="${qName}"
                                                       aria-hidden="true"></i>
                                                </td>
                                            `).join('')}
                                            <input type="hidden" name="${qName}" value="">
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // Group questions and render
        const groupedQuestions = groupConsecutiveRatingQuestions(questions);
        
        return groupedQuestions.map(item => {
            if (item.type === 'rating_matrix') {
                return renderRatingMatrixGroup(item);
            } else {
                return renderSingleQuestion(item.question, item.index);
            }
        }).join('');
    }
    
    function generateQuestionTypesOverview(questionTypes) {
        return Object.entries(questionTypes).map(([type, count]) => `
            <div class="question-type-item">
                <div class="type-icon">
                    <i class="fas ${getQuestionTypeIcon(type)}"></i>
                </div>
                <div class="type-info">
                    <div class="type-name">${formatQuestionType(type)}</div>
                    <div class="type-count">${count} question${count !== 1 ? 's' : ''}</div>
                </div>
            </div>
        `).join('');
    }
    
    function generateResponseAnswers(answers) {
        console.log('generateResponseAnswers called with:', answers);
        if (!answers || !Array.isArray(answers)) {
            console.error('Invalid answers data:', answers);
            return '<div class="empty-state"><p>No answers data available.</p></div>';
        }
        
        if (answers.length === 0) {
            console.warn('Empty answers array');
            return '<div class="empty-state"><p>No responses found for this survey.</p></div>';
        }
        
        const result = answers.map((answer, index) => {
            console.log(`Processing answer ${index + 1}:`, answer);
            return `
            <div class="response-answer-item">
                <div class="answer-question">
                    <div class="question-number">${index + 1}.</div>
                    <div class="question-text">${answer.question_text || 'Unknown Question'}</div>
                    ${answer.required ? '<span class="required-indicator">*</span>' : ''}
                </div>
                <div class="answer-content">
                    ${formatAnswerDisplay(answer)}
                </div>
            </div>
        `;
        }).join('');
        
        console.log('Generated HTML length:', result.length);
        console.log('Generated HTML preview:', result.substring(0, 200) + '...');
        return result;
    }
    
    function formatAnswerDisplay(answer) {
        console.log('Formatting answer:', answer);
        
        switch (answer.question_type) {
            case 'single_choice':
            case 'dropdown':
                return `<div class="answer-value">${answer.answer || 'No answer'}</div>`;
            
            case 'multiple_choice':
                if (!answer.answer || !Array.isArray(answer.answer)) {
                    return `<div class="answer-value">No answer provided</div>`;
                }
                return `
                    <div class="answer-multiple">
                        ${answer.answer.map(option => `
                            <span class="answer-tag">${option}</span>
                        `).join('')}
                    </div>
                `;
            
            case 'rating_scale':
                const rating = parseInt(answer.answer);
                const minRating = answer.min_value || 1;
                const maxRating = answer.max_value || 5;
                const totalStars = maxRating - minRating + 1;
                
                if (isNaN(rating)) {
                    return `<div class="answer-value">No rating provided</div>`;
                }
                
                return `
                    <div class="answer-rating">
                        <span class="rating-text">${rating}/${maxRating}</span>
                        <div class="rating-stars">
                            ${Array.from({length: totalStars}, (_, i) => {
                                const starValue = minRating + i;
                                return `<i class="fas fa-star ${starValue <= rating ? 'filled' : 'empty'}"></i>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            
            case 'yes_no':
                const isYes = answer.answer === true || answer.answer === 'true';
                return `
                    <div class="answer-boolean">
                        <span class="status-pill status-${isYes ? 'green' : 'red'}">
                            <i class="fas ${isYes ? 'fa-check' : 'fa-times'}" style="padding-right: 8px;"></i>
                            ${isYes ? 'Yes' : 'No'}
                        </span>
                    </div>
                `;
            
            case 'file_upload':
                return answer.file_url ? `
                    <a href="${answer.file_url}" target="_blank" class="answer-file">
                        <i class="fas fa-file-download"></i>
                        View uploaded file
                    </a>
                ` : '<div class="answer-value">No file uploaded</div>';
            
            default:
                return `<div class="answer-value">${answer.answer || 'No answer provided'}</div>`;
        }
    }
    
    function setupContentActions() {
        const backBtn = document.querySelector('.back-to-dashboard-btn');
        const beginBtn = document.querySelector('.begin-survey-btn');
        const closeBtn = document.querySelector('.close-questions-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                showDashboard();
            });
        }
        
        if (beginBtn) {
            beginBtn.addEventListener('click', function() {
                const surveyId = this.dataset.surveyId;
                window.location.href = `/survey/surveys/${surveyId}/take/`;
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                // Close always returns to dashboard/content welcome state
                showDashboard();
            });
        }

        // Submit and Save handlers for interactive preview
        const submitBtn = document.querySelector('.submit-survey-btn');
        const saveBtn = document.querySelector('.save-progress-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                const surveyId = this.dataset.surveyId;
                submitSurvey(surveyId);
            });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const contentArea = document.getElementById('contentArea');
                // Save progress: post without submit flag
                const formElements = contentArea.querySelectorAll('[name^="question_"]');
                const formData = new FormData();
                formElements.forEach(el => {
                    if (!el.name) return;
                    if (el.type === 'checkbox') {
                        if (el.checked) formData.append(el.name, el.value);
                    } else if (el.type === 'radio') {
                        if (el.checked) formData.append(el.name, el.value);
                    } else if (el.tagName.toLowerCase() === 'select') {
                        formData.append(el.name, el.value);
                    } else if (el.type === 'file') {
                        if (el.files && el.files.length) formData.append(el.name, el.files[0]);
                    } else {
                        formData.append(el.name, el.value || '');
                    }
                });
                const csrfToken = getCookie('csrftoken');
                // survey id may be present on submit button; fallback: try data attr on content
                const surveyId = submitBtn ? submitBtn.dataset.surveyId : null;
                fetch(`/survey/surveys/${surveyId || ''}/take/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken },
                    body: formData
                })
                .then(res => {
                    if (!res.ok) throw new Error('Network error');
                    console.info('Progress saved');
                })
                .catch(err => {
                    console.error('Error saving progress:', err);
                    showErrorMessage('Failed to save progress. Please try again.');
                });
            });
        }
    }
    
    function showDashboard() {
        const contentArea = document.getElementById('contentArea');
        
        // Use dynamic survey statistics if available, otherwise fallback to defaults
        const stats = window.SURVEY_STATS || { total: 0, completed: 0, pending: 0 };
        
        contentArea.innerHTML = `
            <div class="welcome-state">
                <div class="welcome-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h3>Welcome to Your Survey Dashboard</h3>
                <p>Select a survey from the left panel to get started. Click "Start Survey" to begin completing your assigned surveys.</p>
                <div class="welcome-stats">
                    <div class="stat-item">
                        <div class="stat-value" id="totalSurveys">${stats.total}</div>
                        <div class="stat-label">Total Surveys</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="completedSurveys">${stats.completed}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="pendingSurveys">${stats.pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `;
        currentSurveyContent = null;
        
        // On mobile, go back to surveys list
        showSurveysList();
    }
    
    function setupFilterFunctionality() {
        const statusFilter = document.getElementById('statusFilter');
        
        statusFilter.addEventListener('change', function() {
            const selectedStatus = this.value;
            filterSurveys(selectedStatus);
        });
    }
    
    function filterSurveys(status) {
        const surveyItems = document.querySelectorAll('.survey-item');
        
        surveyItems.forEach(item => {
            const itemStatus = item.dataset.status;
            
            if (status === 'all' || itemStatus === status) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 50);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 200);
            }
        });
    }
    
    function loadUserSurveys() {
        // This would typically load surveys from the server
        // For now, we'll use the static data in the HTML
        updateDashboardStats();
    }
    
    function updateDashboardStats() {
        const surveyItems = document.querySelectorAll('.survey-item');
        const totalSurveys = surveyItems.length;
        const completedSurveys = document.querySelectorAll('[data-status="completed"]').length;
        const pendingSurveys = document.querySelectorAll('[data-status="pending"]').length;
        
        // Update stats in welcome state
        const totalElement = document.getElementById('totalSurveys');
        const completedElement = document.getElementById('completedSurveys');
        const pendingElement = document.getElementById('pendingSurveys');
        
        if (totalElement) totalElement.textContent = totalSurveys;
        if (completedElement) completedElement.textContent = completedSurveys;
        if (pendingElement) pendingElement.textContent = pendingSurveys;
    }
    
    function showLoadingMessage() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading survey...</p>
            </div>
        `;
    }
    
    function showErrorMessage(message) {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error</h4>
                <p>${message}</p>
                <button class="btn btn-outline back-to-dashboard-btn">
                    <i class="fas fa-arrow-left"></i>
                    Back to Dashboard
                </button>
            </div>
        `;
        
        setupContentActions();
    }
    
    // Utility functions
    function getQuestionTypeIcon(type) {
        const icons = {
            'single_choice': 'fa-dot-circle',
            'multiple_choice': 'fa-check-square',
            'rating_scale': 'fa-star',
            'dropdown': 'fa-chevron-down',
            'short_answer': 'fa-align-left',
            'paragraph': 'fa-align-justify',
            'yes_no': 'fa-toggle-on',
            'date': 'fa-calendar-alt',
            'file_upload': 'fa-file-upload'
        };
        return icons[type] || 'fa-question-circle';
    }
    
    function formatQuestionType(type) {
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
        return types[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    function getStatusColor(status) {
        const colors = {
            'active': 'blue',
            'completed': 'green',
            'expired': 'red',
            'draft': 'gray'
        };
        return colors[status] || 'gray';
    }
    
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    function formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Handle window resize for responsive behavior
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 992 && expandedSurvey) {
            // On mobile, keep surveys expanded for better UX
        }
    });

    function initializeProgressBars() {
        // Ensure all progress bars are properly initialized
        const progressFills = document.querySelectorAll('.progress-fill');
        progressFills.forEach(fill => {
            const progress = parseInt(fill.dataset.progress || '0');
            if (progress === 0) {
                fill.style.width = '0%';
                fill.classList.remove('completed');
            } else if (progress === 100) {
                fill.style.width = '100%';
                fill.classList.add('completed');
            } else {
                fill.style.width = progress + '%';
                fill.classList.remove('completed');
            }
        });
    }
    
    // Initialize animations on load
    setTimeout(() => {
        const surveyItems = document.querySelectorAll('.survey-item');
        surveyItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 100);

    // Function to refresh the survey list to update statuses
    function refreshSurveyList() {
        // Update survey status pills and buttons
        const surveyItems = document.querySelectorAll('.survey-item');
        surveyItems.forEach(item => {
            const surveyId = item.dataset.surveyId;
            
            // Update the survey item to reflect completed status
            const statusPill = item.querySelector('.status-pill');
            const actionButton = item.querySelector('.btn');
            const metaItem = item.querySelector('.survey-meta');
            
            if (statusPill && actionButton) {
                // Update status to completed
                statusPill.className = 'status-pill status-green';
                statusPill.textContent = 'Completed';
                
                // Update action button
                actionButton.className = 'btn btn-outline view-response-btn';
                actionButton.innerHTML = '<i class="fas fa-eye"></i> View Response';
                actionButton.dataset.surveyId = surveyId;
                
                // Update meta information
                const checkIcon = metaItem.querySelector('.fa-check');
                if (!checkIcon) {
                    const completedMeta = document.createElement('div');
                    completedMeta.className = 'meta-item';
                    completedMeta.innerHTML = '<i class="fas fa-check"></i><span>Completed</span>';
                    metaItem.appendChild(completedMeta);
                }
                
                // Update dataset status
                item.dataset.status = 'completed';
            }
        });
        
        // Update welcome stats
        const completedSurveys = document.getElementById('completedSurveys');
        const pendingSurveys = document.getElementById('pendingSurveys');
        
        if (completedSurveys && pendingSurveys) {
            const completedCount = document.querySelectorAll('[data-status="completed"]').length;
            const pendingCount = document.querySelectorAll('[data-status="pending"]').length;
            
            completedSurveys.textContent = completedCount;
            pendingSurveys.textContent = pendingCount;
        }
    }

});