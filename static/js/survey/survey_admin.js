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
    this.initTableAjax();
        // editor / sortable are optional: keep stubs
        this.initQuestionEditor();
        this.initSortable();
    }

    initTabs() {
        const container = document.querySelector('.tabs-horizontal');
        if (!container) return;

        const tabs = container.querySelectorAll('.tab');
        const panels = document.querySelectorAll('.tab-panel');

        const activate = (name) => {
            tabs.forEach(t => {
                if (t.dataset.tab === name) t.classList.add('active'); else t.classList.remove('active');
            });
            panels.forEach(p => {
                // panel id pattern: `${name}-tab`
                if (p.id === `${name}-tab`) p.classList.add('active'); else p.classList.remove('active');
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

        // Initialize: if one tab already active, ensure corresponding panel visible; otherwise activate first
        let initial = Array.from(tabs).find(t => t.classList.contains('active')) || tabs[0];
        if (initial) activate(initial.dataset.tab);
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
        const searchForm = document.getElementById('surveySearchForm');
        const searchInput = document.getElementById('surveySearchInput');
        const tableBody = document.getElementById('surveyTableBody');
        const paginationContainer = document.getElementById('ticketsPaginationContainer');

        if (!searchForm || !searchInput || !tableBody) return;

        const load = (page = 1) => {
            const params = new URLSearchParams();
            const q = searchInput.value.trim();
            if (q) params.append('search', q);
            params.append('page', page);

            fetch(`/survey/admin/table/?${params.toString()}`, {
                headers: { 'Accept': 'application/json' }
            })
            .then(r => r.json())
            .then(j => {
                if (!j.success) return;
                if (j.table_html) tableBody.innerHTML = j.table_html;
                if (j.pagination_html && paginationContainer) paginationContainer.outerHTML = j.pagination_html;
            })
            .catch(console.error);
        };

        // Submit search without reloading page
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            load(1);
        });

        // Live search on enter key (form submission handles it). Also add clear button handler
        const clearBtn = document.getElementById('clearSurveySearch');
        if (clearBtn) clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.value = '';
            load(1);
        });

        // Pagination click delegation
        document.addEventListener('click', (e) => {
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