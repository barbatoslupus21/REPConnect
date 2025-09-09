class SurveyAdmin {
    constructor() {
        this.init();
    }

    init() {
        this.initDropdowns();
        this.initExportModal();
        this.initDuplicateHandlers();
        this.initAnalytics();
        this.initTabs();
    this.initModalCloseHandlers();
    this.initTableAjax();
        this.initCreateSurveyModal();
        this.initCreateSurveyBehavior();
        // editor / sortable are optional: keep stubs
        this.initQuestionEditor();
        this.initSortable();
    }

    initModalCloseHandlers() {
        // Global handler for closing any modal via overlay, .modal-close or [data-action="cancel"].
        // Ensures the CSS 'modalZoomOut' animation is played before hiding the modal.
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action="cancel"], .modal-close, .modal-overlay');
            if (!el) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const modal = el.closest('.modal');
            if (!modal) return;
            
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
            // wait slightly less than animation duration then hide
            setTimeout(() => {
                modal.classList.remove('show');
                document.body.classList.remove('modal-open');
                if (modalContent) modalContent.style.animation = '';
            }, 260);
        });

        // ESC key closes the top-most open modal
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const modal = document.querySelector('.modal.show');
            if (!modal) return;
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
            setTimeout(() => {
                modal.classList.remove('show');
                document.body.classList.remove('modal-open');
                if (modalContent) modalContent.style.animation = '';
            }, 260);
        });
    }

    initCreateSurveyBehavior() {
        const modal = document.getElementById('createSurveyModal');
        if (!modal) return;

        const visibilitySelect = modal.querySelector('#id_visibility');
        const userSelectionGroup = modal.querySelector('#userSelectionGroup');
        const userSearch = modal.querySelector('#userSearch');
        const userList = modal.querySelector('#userList');
        const selectedUsers = modal.querySelector('#selectedUsers');
        const surveyForm = modal.querySelector('#surveyForm');

        function updateSelectedUsers() {
            if (!selectedUsers || !userList) return;
            const checked = userList.querySelectorAll('input[type="checkbox"]:checked');
            selectedUsers.innerHTML = '';
            if (checked.length > 0) {
                selectedUsers.classList.add('has-users');
                checked.forEach(cb => {
                    const item = cb.closest('.user-item');
                    if (!item) return;
                    const name = item.dataset.userName || '';
                    const uid = item.dataset.userId || '';
                    const span = document.createElement('span');
                    span.className = 'selected-user';
                    span.innerHTML = name + ' <span class="remove-user" data-remove="' + uid + '">&times;</span>';
                    selectedUsers.appendChild(span);
                });
            } else {
                selectedUsers.classList.remove('has-users');
            }
        }

        window.removeUser = function(userId) {
            if (!userList) return;
            const cb = userList.querySelector('#user_' + userId);
            if (cb) {
                cb.checked = false;
                updateSelectedUsers();
            }
        };

        if (visibilitySelect) {
            const toggleUserSelection = () => {
                const v = visibilitySelect.value;
                if (v === 'selected') {
                    if (userSelectionGroup) userSelectionGroup.style.display = 'block';
                } else {
                    if (userSelectionGroup) userSelectionGroup.style.display = 'none';
                    if (userList) {
                        userList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    }
                    updateSelectedUsers();
                }
            };
            visibilitySelect.addEventListener('change', toggleUserSelection);
            // initialize based on current value
            toggleUserSelection();
        }

        if (userSearch && userList) {
            userSearch.addEventListener('input', function() {
                const term = this.value.trim().toLowerCase();
                userList.querySelectorAll('.user-item').forEach(item => {
                    const name = (item.dataset.userName || '').toLowerCase();
                    const email = (item.dataset.userEmail || '').toLowerCase();
                    if (!term || name.includes(term) || email.includes(term)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }

        if (userList) {
            userList.addEventListener('change', function(e) {
                if (e.target && e.target.type === 'checkbox') updateSelectedUsers();
            });

            // delegate remove clicks from selected-users UI
            if (selectedUsers) {
                selectedUsers.addEventListener('click', function(e) {
                    const rem = e.target.closest('[data-remove]');
                    if (!rem) return;
                    const id = rem.getAttribute('data-remove');
                    if (!id) return;
                    const cb = userList.querySelector('#user_' + id);
                    if (cb) cb.checked = false;
                    updateSelectedUsers();
                });
            }
        }

        if (surveyForm) {
            surveyForm.addEventListener('submit', function(e) {
                const titleEl = surveyForm.querySelector('#id_title');
                const descEl = surveyForm.querySelector('#id_description');
                const title = titleEl ? titleEl.value.trim() : '';
                const desc = descEl ? descEl.value.trim() : '';
                if (!title) {
                    e.preventDefault();
                    (window.portalUI && window.portalUI.showNotification) ? window.portalUI.showNotification('Please enter a survey title', 'error') : alert('Please enter a survey title');
                    if (titleEl) titleEl.focus();
                    return;
                }
                if (!desc) {
                    e.preventDefault();
                    (window.portalUI && window.portalUI.showNotification) ? window.portalUI.showNotification('Please enter a survey description', 'error') : alert('Please enter a survey description');
                    if (descEl) descEl.focus();
                    return;
                }
                if (visibilitySelect && visibilitySelect.value === 'selected') {
                    const checked = userList ? userList.querySelectorAll('input[type="checkbox"]:checked') : [];
                    if (!checked || checked.length === 0) {
                        e.preventDefault();
                        (window.portalUI && window.portalUI.showNotification) ? window.portalUI.showNotification('Please select at least one user for the survey', 'error') : alert('Please select at least one user for the survey');
                        return;
                    }
                }
            });
        }
    }

    initCreateSurveyModal() {
        const createBtn = document.getElementById('createSurveyBtn');
        const modal = document.getElementById('createSurveyModal');
        if (!createBtn || !modal) return;

        const openModal = (mode = 'create', surveyId = '') => {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.style.animation = 'modalZoomIn 0.28s ease-out';

            // update header and submit button based on mode
            const headerTitle = modal.querySelector('.modal-header h4');
            const submitBtn = modal.querySelector('button[type="submit"]');
            const editingField = modal.querySelector('#editing_survey_id');
            const formEl = modal.querySelector('#surveyForm');
            if (mode === 'edit') {
                if (headerTitle) headerTitle.textContent = 'Edit Survey';
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                if (editingField) editingField.value = surveyId || '';
                if (formEl) formEl.action = `/survey/surveys/${surveyId}/edit/`;
            } else {
                if (headerTitle) headerTitle.textContent = 'Create New Survey';
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Survey';
                if (editingField) editingField.value = '';
                if (formEl) formEl.action = formEl.getAttribute('data-create-action') || formEl.action;
            }

            if (!modal._closeBound) {
                modal.querySelectorAll('[data-action="cancel"], .modal-close, .modal-overlay').forEach(el => el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
                    setTimeout(() => {
                        modal.classList.remove('show');
                        document.body.classList.remove('modal-open');
                        if (modalContent) modalContent.style.animation = '';
                    }, 260);
                }));
                modal._closeBound = true;
            }
        };

    // expose helper so other code can open this modal in a specific mode
    window.openCreateSurveyModal = (mode = 'create', surveyId = '') => openModal(mode, surveyId);

        // store original create action on the form for reset
        const formEl = modal.querySelector('#surveyForm');
        if (formEl && !formEl.getAttribute('data-create-action')) {
            formEl.setAttribute('data-create-action', formEl.action);
        }

        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('create');
        });
    }

    initTabs() {
        // Initialize every tabs-horizontal group independently
        document.querySelectorAll('.tabs-horizontal').forEach(container => {
            const tabs = container.querySelectorAll('.tab');
            if (!tabs || tabs.length === 0) return;

            // panels are expected to be sibling .tab-panel elements; find panels within the same parent
            // For modal-scoped tabs the panels are directly after the tabs-horizontal; otherwise use global panels
            let panelsParent = container.parentElement;
            let panels = panelsParent ? panelsParent.querySelectorAll('.tab-panel') : document.querySelectorAll('.tab-panel');

            const activate = (name) => {
                tabs.forEach(t => {
                    if (t.dataset.tab === name) t.classList.add('active'); else t.classList.remove('active');
                });
                panels.forEach(p => {
                    // panel id pattern: `${name}-tab` or exact match
                    if (p.id === `${name}-tab` || p.dataset.tab === name) p.classList.add('active'); else p.classList.remove('active');
                });
            };

            tabs.forEach(t => {
                t.addEventListener('click', (e) => {
                    e.preventDefault();
                    const name = t.dataset.tab;
                    if (!name) return;
                    activate(name);
                });
            });

            // Initialize the group's active tab
            let initial = Array.from(tabs).find(t => t.classList.contains('active')) || tabs[0];
            if (initial) activate(initial.dataset.tab);
        });
    }

    initDropdowns() {
        document.querySelectorAll('.action-dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            if (!toggle || !menu) return;

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.action-dropdown.open').forEach(d => {
                    if (d === dropdown) return;
                    d.classList.remove('open');
                    const m = d.querySelector('.dropdown-menu');
                    if (m) m.classList.remove('show');
                });
                menu.classList.toggle('show');
                dropdown.classList.toggle('open');
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.action-dropdown.open').forEach(d => {
                d.classList.remove('open');
                const m = d.querySelector('.dropdown-menu');
                if (m) m.classList.remove('show');
            });
        });
    }

    // Lightweight stubs so missing admin UI doesn't break
    initQuestionEditor() {}
    initSortable() {}

    getCSRF() {
        const name = 'csrftoken';
        const cookies = document.cookie.split(';').map(c => c.trim());
        for (const c of cookies) {
            if (c.startsWith(name + '=')) return decodeURIComponent(c.split('=')[1]);
        }
        const el = document.querySelector('[name=csrfmiddlewaretoken]');
        return el ? el.value : '';
    }

    initDuplicateHandlers() {
        document.querySelectorAll('.duplicate').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                if (!id) return;
                btn.disabled = true;
                fetch(`/survey/duplicate/${id}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.getCSRF(),
                        'Accept': 'application/json'
                    }
                })
                .then(resp => resp.json())
                .then(j => { if (j && j.success) window.location.reload(); else console.warn('duplicate failed', j); })
                .catch(err => console.error(err))
                .finally(() => btn.disabled = false);
            });
        });
    }

    initTableAjax() {
        const panel = document.getElementById('survey-tab');
        if (!panel) return;

        const searchForm = panel.querySelector('#surveySearchForm');
        const searchInput = panel.querySelector('#surveySearchInput');
        const tableBody = panel.querySelector('#surveyTableBody');
        let paginationContainer = panel.querySelector('#ticketsPaginationContainer');

        if (!searchForm || !searchInput || !tableBody) return;

        // Debounce helper
        const debounce = (fn, wait) => {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn(...args), wait);
            };
        };

        const load = (page = 1) => {
            const params = new URLSearchParams();
            const q = searchInput.value.trim();
            if (q) params.append('search', q);
            params.append('page', page);

            // show simple loading state
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

            fetch(`/survey/admin/table/?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            })
            .then(r => r.json())
            .then(j => {
                if (!j.success) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading data</td></tr>';
                    return;
                }
                if (j.table_html) tableBody.innerHTML = j.table_html;
                if (j.pagination_html) {
                    // replace pagination container inside the panel
                    const newNode = document.createElement('div');
                    newNode.innerHTML = j.pagination_html;
                    const newPag = newNode.firstElementChild;
                    if (paginationContainer && paginationContainer.parentNode) {
                        paginationContainer.parentNode.replaceChild(newPag, paginationContainer);
                    } else if (paginationContainer) {
                        paginationContainer.outerHTML = j.pagination_html;
                    }
                    paginationContainer = panel.querySelector('#ticketsPaginationContainer');
                }
            })
            .catch(err => {
                console.error(err);
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading data</td></tr>';
            });
        };

        // expose compatibility global used by old inline handlers
        window.loadTicketsPage = (p) => { load(p); };

        // Submit search without reloading page
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            load(1);
        });

        // Live search on typing (debounced)
        const debouncedLoad = debounce(() => load(1), 400);
        searchInput.addEventListener('input', (e) => {
            const clearBtn = panel.querySelector('#clearSurveySearch');
            if (clearBtn) clearBtn.style.display = searchInput.value.trim() ? 'inline-block' : 'none';
            debouncedLoad();
        });

        // Clear button handler
        const clearBtn = panel.querySelector('#clearSurveySearch');
        if (clearBtn) clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.value = '';
            clearBtn.style.display = 'none';
            load(1);
        });

        // Pagination click delegation inside the panel
        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('#ticketsPaginationControls .pagination-btn');
            if (!btn) return;
            if (btn.classList.contains('disabled')) return;
            const page = btn.getAttribute('data-page') || null;
            if (page) {
                e.preventDefault();
                load(page);
            }
        });

        // Initial load for the table on page ready
        load(1);

        // Delegate edit/delete buttons for survey rows
        panel.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.survey-edit-btn');
            const delBtn = e.target.closest('.survey-delete-btn');
            if (editBtn) {
                const id = editBtn.getAttribute('data-survey-id');
                if (!id) return;
                // fetch survey JSON then populate modal
                fetch(`/survey/surveys/${id}/json/`, { headers: { 'Accept': 'application/json' } })
                .then(r => r.json())
                .then(j => {
                    if (!j.success) return;
                    const s = j.survey;
                    const modal = document.getElementById('createSurveyModal');
                    if (!modal) return;
                    // populate fields
                    modal.querySelector('#id_title') && (modal.querySelector('#id_title').value = s.title || '');
                    modal.querySelector('#id_description') && (modal.querySelector('#id_description').value = s.description || '');
                    if (modal.querySelector('#id_category')) modal.querySelector('#id_category').value = s.category || '';
                    if (modal.querySelector('#id_template')) modal.querySelector('#id_template').value = s.template || '';
                    if (modal.querySelector('#id_deadline')) modal.querySelector('#id_deadline').value = s.deadline || '';
                    if (modal.querySelector('#id_visibility')) modal.querySelector('#id_visibility').value = s.visibility || '';
                    if (modal.querySelector('#id_status')) modal.querySelector('#id_status').value = s.status || '';

                    // settings checkboxes
                    Object.keys(s.settings || {}).forEach(k => {
                        const el = modal.querySelector(`#id_${k}`);
                        if (el && (el.type === 'checkbox' || el.type === 'radio')) el.checked = !!s.settings[k];
                    });

                    // selected users
                    if (modal.querySelector('#userList')) {
                        modal.querySelectorAll('#userList input[type="checkbox"]').forEach(cb => cb.checked = false);
                        (s.selected_users || []).forEach(uid => {
                            const cb = modal.querySelector(`#user_${uid}`);
                            if (cb) cb.checked = true;
                        });
                        // ensure visibility shows the group
                        if (modal.querySelector('#id_visibility') && modal.querySelector('#id_visibility').value === 'selected') {
                            const userSelectionGroup = modal.querySelector('#userSelectionGroup');
                            if (userSelectionGroup) userSelectionGroup.style.display = 'block';
                        }
                        // update selected users UI
                        const ev = new Event('change');
                        modal.querySelector('#userList').dispatchEvent(ev);
                    }

                    // open modal in edit mode (use existing modal initializer behavior)
                    // find the create modal's openModal function by dispatching a custom event
                    // fallback to direct open if not available
                    if (typeof window.openCreateSurveyModal === 'function') {
                        window.openCreateSurveyModal('edit', s.id);
                    } else {
                        modal.classList.add('show');
                        document.body.classList.add('modal-open');
                        const modalContent = modal.querySelector('.modal-content');
                        if (modalContent) modalContent.style.animation = 'modalZoomIn 0.28s ease-out';
                        // set header & submit
                        const headerTitle = modal.querySelector('.modal-header h4');
                        const submitBtn = modal.querySelector('button[type="submit"]');
                        const editingField = modal.querySelector('#editing_survey_id');
                        const formEl = modal.querySelector('#surveyForm');
                        if (headerTitle) headerTitle.textContent = 'Edit Survey';
                        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                        if (editingField) editingField.value = s.id || '';
                        if (formEl) formEl.action = `/survey/surveys/${s.id}/edit/`;
                    }
                })
                .catch(console.error);
            }

            if (delBtn) {
                const id = delBtn.getAttribute('data-survey-id');
                if (!id) return;
                const modal = document.getElementById('confirmDeleteSurveyModal');
                if (!modal) return;
                const nameEl = document.getElementById('confirmDeleteSurveyName');
                // find survey title in the row
                const row = delBtn.closest('tr');
                const title = row ? row.querySelector('.survey-info strong') && row.querySelector('.survey-info strong').textContent : '';
                if (nameEl) nameEl.textContent = title || '';

                modal.classList.add('show');
                document.body.classList.add('modal-open');
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) modalContent.style.animation = 'modalZoomIn 0.28s ease-out';

                // bind confirm
                const confirmBtn = document.getElementById('confirmDeleteSurveyBtn');
                const handler = () => {
                    confirmBtn.disabled = true;
                    fetch(`/survey/surveys/${id}/delete/`, {
                        method: 'POST',
                        headers: { 'X-CSRFToken': this.getCSRF(), 'Accept': 'application/json' }
                    })
                    .then(r => r.json())
                    .then(j => {
                        if (j && j.success) {
                            window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification('Survey deleted', 'success');
                            // refresh table
                            load(1);
                        } else {
                            window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification(j.error || 'Delete failed', 'error');
                        }
                    })
                    .catch(err => {
                        console.error('Delete survey error', err);
                        window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification('Delete failed', 'error');
                    })
                    .finally(() => {
                        confirmBtn.disabled = false;
                        if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
                        setTimeout(() => {
                            modal.classList.remove('show');
                            document.body.classList.remove('modal-open');
                            if (modalContent) modalContent.style.animation = '';
                        }, 260);
                        confirmBtn.removeEventListener('click', handler);
                    });
                };

                confirmBtn.addEventListener('click', handler);
            }
        });

        // Template tab: setup search/pagination to match survey tab behavior
        const templatePanel = document.getElementById('template-tab');
        if (templatePanel) {
            const templateSearchForm = templatePanel.querySelector('#templateSearchForm');
            const templateSearchInput = templatePanel.querySelector('#templateSearchInput');
            const templateTableBody = templatePanel.querySelector('#templateTableBody');
            let templatePagination = templatePanel.querySelector('#ticketsPaginationContainer');
            
            if (templateSearchForm && templateSearchInput && templateTableBody) {
                const tplDebounced = debounce(() => loadTemplates(1), 400);
                
                // Submit search without reloading page
                templateSearchForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    loadTemplates(1);
                });
                
                // Live search on typing (debounced)
                templateSearchInput.addEventListener('input', (e) => {
                    const clearBtn = templatePanel.querySelector('#clearTemplateSearch');
                    if (clearBtn) clearBtn.style.display = templateSearchInput.value.trim() ? 'inline-block' : 'none';
                    tplDebounced();
                });
                
                // Clear button handler
                const clearBtn = templatePanel.querySelector('#clearTemplateSearch');
                if (clearBtn) clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    templateSearchInput.value = '';
                    clearBtn.style.display = 'none';
                    loadTemplates(1);
                });
            }

            function loadTemplates(page = 1) {
                const params = new URLSearchParams();
                const q = templatePanel.querySelector('#templateSearchInput').value.trim();
                if (q) params.append('search', q);
                params.append('templates_page', page);
                
                // Show simple loading state
                templateTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

                fetch(`/survey/admin/?${params.toString()}`, { 
                    headers: { 'Accept': 'application/json' } 
                })
                .then(r => r.json())
                .then(j => {
                    if (!j.success) {
                        templateTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading data</td></tr>';
                        return;
                    }
                    if (j.templates_html) templateTableBody.innerHTML = j.templates_html;
                    if (j.templates_pagination_html) {
                        // Replace pagination container inside the panel
                        const newNode = document.createElement('div');
                        newNode.innerHTML = j.templates_pagination_html;
                        const newPag = newNode.firstElementChild;
                        if (templatePagination && templatePagination.parentNode) {
                            templatePagination.parentNode.replaceChild(newPag, templatePagination);
                        } else if (templatePagination) {
                            templatePagination.outerHTML = j.templates_pagination_html;
                        }
                        templatePagination = templatePanel.querySelector('#ticketsPaginationContainer');
                    }
                })
                .catch(err => {
                    console.error(err);
                    templateTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading data</td></tr>';
                });
            }

            // Expose compatibility global used by old inline handlers
            window.loadTemplatesPage = (p) => loadTemplates(p);
            
            // Pagination click delegation inside the panel
            templatePanel.addEventListener('click', (e) => {
                const paginationBtn = e.target.closest('.pagination-btn');
                if (paginationBtn && !paginationBtn.classList.contains('disabled')) {
                    const page = paginationBtn.getAttribute('data-page') || paginationBtn.textContent.trim();
                    if (page && /^\d+$/.test(page)) {
                        e.preventDefault();
                        loadTemplates(parseInt(page));
                    }
                }
            });

            // Delegate delete button clicks for templates
            templatePanel.addEventListener('click', (e) => {
                const btn = e.target.closest('.template-delete-btn');
                if (!btn) return;
                const templateId = btn.getAttribute('data-template-id');
                if (!templateId) return;
                // open modal
                const modal = document.getElementById('confirmDeleteTemplateModal');
                if (!modal) return;
                // show modal using site convention
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) modalContent.style.animation = 'modalZoomIn 0.28s ease-out';

                // bind close handlers once
                if (!modal._closeBound) {
                    modal.querySelectorAll('[data-action="cancel"], .modal-close, .modal-overlay').forEach(el => el.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // animate out
                        if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
                        setTimeout(() => {
                            modal.classList.remove('show');
                            document.body.classList.remove('modal-open');
                            if (modalContent) modalContent.style.animation = '';
                        }, 260);
                    }));
                    modal._closeBound = true;
                }

                const confirmBtn = document.getElementById('confirmDeleteTemplateBtn');
                const handler = () => {
                    confirmBtn.disabled = true;
                    fetch(`/survey/templates/${templateId}/delete/`, {
                        method: 'POST',
                        headers: { 'X-CSRFToken': this.getCSRF(), 'Accept': 'application/json' }
                    })
                    .then(r => r.json())
                    .then(j => {
                        if (j && j.success) {
                            window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification('Template deleted', 'success');
                            // reload templates list
                            loadTemplates(1);
                        } else {
                            window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification(j.error || 'Delete failed', 'error');
                        }
                    })
                    .catch(err => {
                        console.error('Delete template error', err);
                        window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification('Delete failed', 'error');
                    })
                    .finally(() => {
                        confirmBtn.disabled = false;
                        // close modal
                        if (modalContent) modalContent.style.animation = 'modalZoomOut 0.28s ease-out';
                        setTimeout(() => {
                            modal.classList.remove('show');
                            document.body.classList.remove('modal-open');
                            if (modalContent) modalContent.style.animation = '';
                        }, 260);
                        confirmBtn.removeEventListener('click', handler);
                    });
                };

                confirmBtn.addEventListener('click', handler);
            });
        }
    }

    initExportModal() {
        const exportBtn = document.getElementById('export-btn');
        const exportModal = document.getElementById('export-modal');
        const exportCancel = document.getElementById('export-cancel');
        const exportForm = document.getElementById('export-form');

        if (!exportBtn || !exportModal || !exportForm) return;

        exportBtn.addEventListener('click', () => exportModal.setAttribute('aria-hidden', 'false'));
        exportCancel && exportCancel.addEventListener('click', () => exportModal.setAttribute('aria-hidden', 'true'));
        exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.setAttribute('aria-hidden', 'true'); });

        exportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(exportForm);
            const action = exportForm.getAttribute('action') || window.location.href;
            fetch(action, { method: 'POST', body: formData, headers: { 'X-CSRFToken': this.getCSRF() } })
                .then(r => {
                    if (!r.ok) throw new Error('Export failed');
                    return r.blob();
                })
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'survey_export.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                })
                .catch(err => {
                    console.error(err);
                    window.portalUI && window.portalUI.showNotification && window.portalUI.showNotification('Export failed', 'error');
                })
                .finally(() => exportModal.setAttribute('aria-hidden', 'true'));
        });
    }

    initAnalytics() {
        const dashboard = document.getElementById('dashboard-summary');
        if (!dashboard) return;
        dashboard.innerHTML = '<div class="chart-placeholder">Loading charts...</div>';
        setTimeout(() => {
            dashboard.innerHTML = '\n              <div class="chart-row">\n                <div class="chart card">Survey Completion</div>\n                <div class="chart card">Top Responses</div>\n              </div>';
        }, 500);
    }

}

document.addEventListener('DOMContentLoaded', () => new SurveyAdmin());