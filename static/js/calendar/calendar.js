class CalendarManager {
    constructor(year, month, holidays, today) {
        this.currentYear = parseInt(year) || new Date().getFullYear();
        this.currentMonth = parseInt(month) || (new Date().getMonth() + 1);
        this.holidays = holidays || {};
        this.today = today || this.getTodayString();
        this.selectedDate = this.today;
        this.tooltip = null;
        this.isNavigating = false;
        this.init();
    }

    async init() {
        this.validateCurrentDate();
        this.tooltip = document.getElementById('holidayTooltip');
        this.setupEventListeners();
        this.renderHolidays();
        this.markToday();
        this.restoreTimelogStatus();
        this.renderTimelogIndicators();
        setTimeout(async () => {
            await this.refreshTimelogIndicators();
        }, 100);
        await this.selectDate(this.getInitialSelectedDate(), true);
        this.setupTabs();
        this.updateCalendarHeader();
    }

    validateCurrentDate() {
        if (this.currentMonth < 1 || this.currentMonth > 12) {
            this.currentMonth = new Date().getMonth() + 1;
        }
        if (this.currentYear < 1900 || this.currentYear > 2100) {
            this.currentYear = new Date().getFullYear();
        }
    }

    getTodayString() {
        const today = new Date();
        return today.getFullYear() + '-' + 
               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
               String(today.getDate()).padStart(2, '0');
    }

    getInitialSelectedDate() {
        const storedDate = localStorage.getItem('calendar_last_viewed_date');
        if (storedDate && this.isValidDate(storedDate)) {
            const dateObj = new Date(storedDate);
            const dateYear = dateObj.getFullYear();
            const dateMonth = dateObj.getMonth() + 1;
            if (dateYear === this.currentYear && dateMonth === this.currentMonth) {
                return storedDate;
            }
        }
        return this.today;
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    updateCalendarHeader() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const headerElement = document.querySelector('.calendar-header h2, .month-year-display');
        if (headerElement) {
            headerElement.textContent = `${monthNames[this.currentMonth - 1]} ${this.currentYear}`;
        }
    }

    setupEventListeners() {
        const prevButton = document.getElementById('prevMonth');
        const nextButton = document.getElementById('nextMonth');
        const todayButton = document.getElementById('todayBtn');
        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isNavigating) {
                    this.navigateMonth(-1);
                }
            });
        }
        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isNavigating) {
                    this.navigateMonth(1);
                }
            });
        }
        if (todayButton) {
            todayButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToToday();
            });
        }
        this.setupCalendarDayEvents();
        
        window.addEventListener('focus', async () => {
            await this.refreshTimelogIndicators();
        });
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                await this.refreshTimelogIndicators();
            }
        });
        window.addEventListener('beforeunload', () => {
            if (window.CALENDAR_TIMELOG_STATUS) {
                localStorage.setItem('calendar_timelog_status', JSON.stringify(window.CALENDAR_TIMELOG_STATUS));
            }
        });
        setInterval(async () => {
            await this.refreshTimelogIndicators();
        }, 5 * 60 * 1000);
    }

    setupCalendarDayEvents() {
        const calendarDays = document.querySelectorAll('.calendar-day:not(.empty)');
        calendarDays.forEach(day => {
            const clonedDay = day.cloneNode(true);
            day.parentNode.replaceChild(clonedDay, day);
            clonedDay.addEventListener('click', async (e) => {
                const date = e.currentTarget.dataset.date;
                if (date && this.isValidDate(date)) {
                    await this.selectDate(date);
                }
            });
            clonedDay.addEventListener('mouseenter', (e) => {
                this.showHolidayTooltip(e.currentTarget);
            });
            clonedDay.addEventListener('mouseleave', () => {
                this.hideHolidayTooltip();
            });
        });
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.target, tab);
                this.renderSidebarActions(tab.dataset.target);
            });
        });
        const activeTab = document.querySelector('.tab.active');
        this.renderSidebarActions(activeTab ? activeTab.dataset.target : 'events-panel');
    }

    renderSidebarActions(panelId) {
        const sidebarActions = document.getElementById('sidebarActions');
        if (!sidebarActions) return;
        sidebarActions.innerHTML = '';
        const isHR = window.hr_admin === true || window.hr_admin === 'true';
        if (panelId === 'events-panel' && isHR) {
            const addBtn = document.createElement('button');
            addBtn.id = 'add-event-btn';
            addBtn.className = 'btn btn-primary btn-sm add-event-btn';
            addBtn.innerHTML = '<i class="far fa-plus"></i> Add Event';
            addBtn.onclick = () => {
                if (window.openModal) {
                    window.openModal('addHolidayModal');
                    // Set the selected date in the form
                    const dateInput = document.querySelector('#addHolidayModal input[name="date"]');
                    if (dateInput) {
                        dateInput.value = this.selectedDate;
                    }
                }
            };
            sidebarActions.appendChild(addBtn);
        } else if (panelId === 'timelogs-panel') {
            if (isHR) {
                const goBtn = document.createElement('button');
                goBtn.className = 'btn btn-primary btn-sm add-event-btn';
                goBtn.style.width = '100%';
                goBtn.innerHTML = '<i class="far fa-clock"></i> Go to Timelogs';
                goBtn.onclick = () => window.location.href = '/calendar/timelogs/';
                sidebarActions.appendChild(goBtn);
            }
        } else if (panelId === 'todos-panel') {
            const addTodoBtn = document.createElement('button');
            addTodoBtn.className = 'btn btn-primary btn-sm add-event-btn';
            addTodoBtn.style.width = '100%';
            addTodoBtn.innerHTML = '<i class="far fa-plus"></i> Add To-Do List';
            addTodoBtn.onclick = () => {
                window.openModal && window.openModal('addTodoModal');
                const todoDateField = document.getElementById('todo-date');
                if (todoDateField) todoDateField.value = this.selectedDate;
            };
            sidebarActions.appendChild(addTodoBtn);
        }
    }

    switchTab(targetPanel, activeTab) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const targetPanelEl = document.getElementById(targetPanel);
        if (targetPanelEl) {
            targetPanelEl.classList.add('active');
            // No need to load panel content here, it's loaded on date selection
        }
        this.renderSidebarActions(targetPanel);
    }

    switchView(view, activeToggle) {
        document.querySelectorAll('.view-toggle').forEach(toggle => toggle.classList.remove('active'));
        activeToggle.classList.add('active');
    }

    async selectDate(dateString, isInitialLoad = false) {
        if (!this.isValidDate(dateString)) {
            return;
        }
        const normalizedDate = this.normalizeDate(dateString);
        this.selectedDate = normalizedDate;
        localStorage.setItem('calendar_last_viewed_date', normalizedDate);
        
        document.querySelectorAll('.calendar-day.selected').forEach(day => day.classList.remove('selected'));
        const selectedDay = document.querySelector(`[data-date="${normalizedDate}"]`);
        if (selectedDay) {
            selectedDay.classList.add('selected');
        }
        
        this.updateSelectedDateDisplay(normalizedDate);
        
        const [events, timelogs, todos] = await Promise.all([
            this.getDataForDate('events-panel', normalizedDate),
            this.getDataForDate('timelogs-panel', normalizedDate),
            this.getDataForDate('todos-panel', normalizedDate)
        ]);

        this.renderPanelData(this.getPanelContentDiv('events-panel'), events, 'events-panel');
        this.renderPanelData(this.getPanelContentDiv('timelogs-panel'), timelogs, 'timelogs-panel');
        this.renderPanelData(this.getPanelContentDiv('todos-panel'), todos, 'todos-panel');
        
        if (isInitialLoad) {
            this.renderTimelogIndicators();
        }
        
        this.updateTimelogsTabDot();
        this.updateSingleTimelogIndicator(normalizedDate, timelogs);
    }

    updateTimelogsTabDot() {
        const timelogStatus = window.CALENDAR_TIMELOG_STATUS || {};
        const selectedDate = this.selectedDate;
        const tabBtn = document.querySelector('.tab[data-target="timelogs-panel"]');
        let dot = tabBtn ? tabBtn.querySelector('.timelog-tab-dot') : null;
        if (!tabBtn) return;
        if (dot) dot.remove();
        if (timelogStatus[selectedDate] === 'incomplete') {
            dot = document.createElement('span');
            dot.className = 'timelog-tab-dot';
            dot.innerHTML = '<i class="fas fa-exclamation"></i>';
            tabBtn.appendChild(dot);
        }
    }

    updateSingleTimelogIndicator(date, timelogs) {
        const dayElement = document.querySelector(`.calendar-day[data-date="${date}"]`);
        if (!dayElement) return;

        const indicator = dayElement.querySelector('.timelog-indicator');
        if (!indicator) return;

        const hasTimeIn = timelogs.some(log => log.entry === 'timein' && log.time && log.time.trim() !== '');
        const hasTimeOut = timelogs.some(log => log.entry === 'timeout' && log.time && log.time.trim() !== '');
        let status = 'none';
        
        if ((hasTimeIn || hasTimeOut) && !(hasTimeIn && hasTimeOut)) {
            status = 'incomplete';
        }
        if (!window.CALENDAR_TIMELOG_STATUS) window.CALENDAR_TIMELOG_STATUS = {};
        window.CALENDAR_TIMELOG_STATUS[date] = status;

        indicator.innerHTML = '';
        if (status === 'incomplete') {
            indicator.className = 'timelog-indicator timelog-incomplete';
            indicator.title = 'Missing Time In or Out';
            indicator.innerHTML = '<span class="timelog-warning-icon">⚠️</span>';
        } else {
            // Both complete and empty dates show no icon
            indicator.className = 'timelog-indicator';
            indicator.title = '';
        }
    }

    renderTimelogIndicators() {
        const timelogStatus = window.CALENDAR_TIMELOG_STATUS || {};

        document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            const date = day.dataset.date;
            if (!date) return;

            const indicator = day.querySelector('.timelog-indicator');
            if (!indicator) return;

            indicator.innerHTML = '';
            const status = timelogStatus[date];

            if (status === 'incomplete') {
                indicator.className = 'timelog-indicator timelog-incomplete';
                indicator.title = 'Missing Time In or Out';
                indicator.innerHTML = '<span class="timelog-warning-icon">⚠️</span>';
            } else {
                indicator.className = 'timelog-indicator';
                indicator.title = '';
            }
        });
    }

    async refreshTimelogIndicators() {
        const visibleDates = Array.from(document.querySelectorAll('.calendar-day:not(.empty)'))
            .map(day => day.dataset.date)
            .filter(date => date);
        if (!window.CALENDAR_TIMELOG_STATUS) {
            window.CALENDAR_TIMELOG_STATUS = {};
        }
        const fetchPromises = visibleDates.map(async (date) => {
            try {
                const resp = await fetch(`/calendar/api/timelogs/?date=${date}`);
                if (resp.ok) {
                    const data = await resp.json();
                    const logs = data.timelogs || [];
                    const hasTimeIn = logs.some(log => log.entry === 'timein' && log.time && log.time.trim() !== '');
                    const hasTimeOut = logs.some(log => log.entry === 'timeout' && log.time && log.time.trim() !== '');
                    let status = 'none';
                    if ((hasTimeIn || hasTimeOut) && !(hasTimeIn && hasTimeOut)) {
                        status = 'incomplete';
                    }
                    window.CALENDAR_TIMELOG_STATUS[date] = status;
                    return { date, logs, status };
                }
            } catch (e) {
            }
            return { date, logs: [], status: 'none' };
        });
        const results = await Promise.all(fetchPromises);
        results.forEach(({ date, logs, status }) => {
            this.updateSingleTimelogIndicator(date, logs);
        });
    }

    updateSelectedDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const dateNumber = document.getElementById('selectedDateNumber');
        const dateMonth = document.getElementById('selectedDateMonth');
        const dateWeekday = document.getElementById('selectedDateWeekday');
        if (dateNumber) {
            dateNumber.textContent = date.getDate();
        }
        if (dateMonth) {
            dateMonth.textContent = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        }
        if (dateWeekday) {
            dateWeekday.textContent = date.toLocaleDateString('en-US', { weekday: 'long' });
        }
    }

    getActivePanel() {
        const activeTab = document.querySelector('.tab.active');
        return activeTab ? activeTab.dataset.target : 'events-panel';
    }

    async loadPanelContent(panelId) {
        const contentDiv = this.getPanelContentDiv(panelId);
        if (!contentDiv) return;
    }

    getPanelContentDiv(panelId) {
        switch (panelId) {
            case 'events-panel':
                return document.getElementById('eventsContent');
            case 'timelogs-panel':
                return document.getElementById('timelogsContent');
            case 'todos-panel':
                return document.getElementById('todosContent');
            default:
                return null;
        }
    }

    async getDataForDate(panelId, dateString) {
        if (!this.isValidDate(dateString)) return [];
        const normalizedDate = this.normalizeDate(dateString);

        if (panelId === 'timelogs-panel') {
            try {
                const resp = await fetch(`/calendar/api/timelogs/?date=${normalizedDate}`);
                if (resp.ok) {
                    const data = await resp.json();
                    const logs = data.timelogs || [];
                    let hasTimeIn = false, hasTimeOut = false;
                    logs.forEach(log => {
                        if (log.entry === 'timein' && log.time && log.time.trim() !== '') {
                            hasTimeIn = true;
                        }
                        if (log.entry === 'timeout' && log.time && log.time.trim() !== '') {
                            hasTimeOut = true;
                        }
                    });

                    if (!window.CALENDAR_TIMELOG_STATUS) window.CALENDAR_TIMELOG_STATUS = {};
                    if ((hasTimeIn || hasTimeOut) && !(hasTimeIn && hasTimeOut)) {
                        window.CALENDAR_TIMELOG_STATUS[normalizedDate] = 'incomplete';
                    } else {
                        window.CALENDAR_TIMELOG_STATUS[normalizedDate] = 'none';
                    }

                    return logs;
                }
            } catch (e) { /* ignore */ }
            return [];
        } else if (panelId === 'events-panel') {
            return this.holidays && this.holidays[normalizedDate] ? this.holidays[normalizedDate] : [];
        } else if (panelId === 'todos-panel') {
            try {
                const resp = await fetch(`/calendar/api/todos/?date=${normalizedDate}`);
                if (resp.ok) {
                    const data = await resp.json();
                    return data.todos || [];
                }
            } catch (e) { /* ignore */ }
            return [];
        }
        return [];
    }

    async renderPanelData(contentDiv, data, panelId) {
        contentDiv.innerHTML = '';
        switch (panelId) {
            case 'events-panel':
                this.renderEvents(contentDiv, data);
                break;
            case 'timelogs-panel':
                this.renderTimeLogs(contentDiv, data);
                break;
            case 'todos-panel':
                this.renderTodos(contentDiv, data);
                break;
        }
    }

    renderEvents(contentDiv, events) {
        contentDiv.innerHTML = '';
        if (!events || events.length === 0) {
            this.showNoData(contentDiv, 'events-panel');
            return;
        }
        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            let bgColor = '';
            switch (event.type) {
                case 'legal':
                    bgColor = '#ffeaea';
                    break;
                case 'special':
                    bgColor = '#fffbe6';
                    break;
                case 'day_off':
                    bgColor = '#eaffea';
                    break;
                case 'company':
                    bgColor = '#eaf4ff';
                    break;
                default:
                    bgColor = '#f7f7f7';
            }
            eventCard.style.background = bgColor;
            eventCard.innerHTML = `
                <div class="event-info">
                    <div class="event-title">${event.name || 'Event'}</div>
                    <div class="event-description">${event.description || ''}</div>
                    <div class="event-type">${this.getTypeLabel(event.type)}</div>
                </div>
            `;
            contentDiv.appendChild(eventCard);
        });
    }

    renderTimeLogs(contentDiv, timelogs) {
        contentDiv.innerHTML = '';

        // If no timelogs at all, show "No Time Logs" message
        if (!timelogs || timelogs.length === 0) {
            this.showNoData(contentDiv, 'timelogs-panel');
            return;
        }

        const logMap = {};
        timelogs.forEach(log => {
            logMap[log.entry] = log;
        });

        const entries = [
            { key: 'timein', label: 'Time In' },
            { key: 'timeout', label: 'Time Out' }
        ];

        let hasMissing = false;
        let missingType = '';

        // Show both cards (existing and missing) for dates with at least one entry
        entries.forEach(entry => {
            const log = logMap[entry.key];
            const logCard = document.createElement('div');
            logCard.className = 'event-card';
            logCard.style.display = 'flex';
            logCard.style.alignItems = 'center';
            logCard.style.gap = '16px';

            let iconHtml = '';
            let timeHtml = '';

            if (log && log.time) {
                // Entry exists - show with check icon, no pulsing
                iconHtml = '<span style="color:#10b981;margin-right:8px;font-size:1.5em;">✅</span>';
                timeHtml = new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                // Entry missing - show with warning icon and pulsing animation
                iconHtml = '<span style="color:#ef4444;margin-right:8px;font-size:1.5em;">⚠️</span>';
                timeHtml = '<span style="color:#ef4444;">Missing</span>';
                logCard.style.background = '#ffeaea';
                logCard.classList.add('pulsing-missing');
                hasMissing = true;
                missingType = entry.label;
            }

            logCard.innerHTML = `
                <div style="display:flex;align-items:center;">
                    ${iconHtml}
                </div>
                <div>
                    <div class="event-title">${entry.label}</div>
                    <div class="event-description">${timeHtml}</div>
                </div>
            `;
            contentDiv.appendChild(logCard);
        });

        // Show reminder card only if there are missing entries
        if (hasMissing) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'noteDiv';
            noteDiv.style.background = '#fff8e1';
            noteDiv.style.border = '1px solid #ffe0b2';
            noteDiv.style.borderRadius = '8px';
            noteDiv.style.padding = '16px';
            noteDiv.style.marginTop = '16px';
            noteDiv.style.color = '#b45309';
            noteDiv.style.fontSize = '15px';
            noteDiv.style.display = 'flex';
            noteDiv.style.flexDirection = 'column';
            noteDiv.style.gap = '12px';
            noteDiv.innerHTML = `
                <div><b>Note:</b> You didn't <b>${missingType}</b> on this date. You need to file a <b>Personal Request Form (PRF)</b> in the HR department using the button below.<br><br>
                <b>Reminder:</b> Please do not forget to time in and time out. Repeated failure to do so will have consequences in HR. After filing the PRF, you must go to HR to fill up the counseling form.</div>
                <button id="prf-btn" style="margin-top:8px;padding:10px 18px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;width:max-content;align-self:flex-start;">
                    Go to PR-Form
                </button>
            `;
            contentDiv.appendChild(noteDiv);
            const prfBtn = noteDiv.querySelector('#prf-btn');
            if (prfBtn) {
                prfBtn.onclick = function() {
                    window.location.href = '/prf/';
                };
            }
        }
    }

    renderTodos(contentDiv, todos) {
        contentDiv.innerHTML = '';
        if (!todos || todos.length === 0) {
            contentDiv.innerHTML = '<div class="todos-placeholder">No to-do items for this date.</div>';
            return;
        }
        const todosContainer = document.createElement('div');
        todosContainer.className = 'todos-list';
        todos.forEach(todo => {
            const todoCard = document.createElement('div');
            todoCard.className = 'event-card todo-card';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = !!todo.completed;
            const descSpan = document.createElement('span');
            descSpan.className = 'todo-desc';
            descSpan.textContent = todo.description;
            if (todo.completed) descSpan.classList.add('todo-completed');
            checkbox.addEventListener('change', async () => {
                const resp = await fetch('/calendar/api/todos/toggle/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: JSON.stringify({ id: todo.id })
                });
                const data = await resp.json();
                if (data.success) {
                    if (checkbox.checked) {
                        descSpan.classList.add('todo-completed');
                    } else {
                        descSpan.classList.remove('todo-completed');
                    }
                }
            });
            todoCard.appendChild(checkbox);
            const timeSpan = document.createElement('span');
            timeSpan.className = 'todo-time';
            timeSpan.textContent = todo.time ? todo.time : '';
            todoCard.appendChild(timeSpan);
            todoCard.appendChild(descSpan);
            todosContainer.appendChild(todoCard);
        });
        contentDiv.appendChild(todosContainer);
    }

    getTypeLabel(type) {
        const typeLabels = {
            'legal': 'Legal Holiday',
            'special': 'Special Holiday',
            'day_off': 'Day Off',
            'company': 'Company Holiday'
        };
        return typeLabels[type] || type || 'Event';
    }

    showNoData(contentDiv, panelId) {
        const noDataMessages = {
            'events-panel': {
                icon: 'fas fa-calendar-alt',
                title: 'No Events',
                description: 'No events scheduled for this date'
            },
            'timelogs-panel': {
                icon: 'fas fa-clock',
                title: 'No Time Logs',
                description: 'No time logs recorded for this date'
            },
            'todos-panel': {
                icon: 'fas fa-tasks',
                title: 'No Tasks',
                description: 'No tasks scheduled for this date'
            }
        };
        const message = noDataMessages[panelId];
        if (!message) return;
        contentDiv.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="${message.icon}"></i>
                </div>
                <div class="no-data-text">
                    <h4>${message.title}</h4>
                    <p>${message.description}</p>
                </div>
            </div>
        `;
    }

    goToToday() {
        const today = new Date();
        const targetYear = today.getFullYear();
        const targetMonth = today.getMonth() + 1;
        if (targetYear !== this.currentYear || targetMonth !== this.currentMonth) {
            this.navigateToMonth(targetYear, targetMonth);
        } else {
            this.selectDate(this.today);
        }
    }

    navigateMonth(direction) {
        if (this.isNavigating) return;
        this.isNavigating = true;
        let newYear = this.currentYear;
        let newMonth = this.currentMonth + direction;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        this.navigateToMonth(newYear, newMonth, direction);
    }

    navigateToMonth(year, month, direction = 0) {
        localStorage.setItem('calendar_last_viewed_month', month);
        localStorage.setItem('calendar_last_viewed_year', year);
        const url = new URL(window.location);
        url.searchParams.set('year', year);
        url.searchParams.set('month', month);
        const grid = document.getElementById('calendarDays');
        const title = document.getElementById('calendarTitle');
        const outOffset = direction > 0 ? -20 : 20;
        const inOffset = direction > 0 ? 20 : -20;
        if (grid) {
            grid.style.transition = 'opacity 200ms ease, transform 200ms ease';
            grid.style.opacity = '0';
            grid.style.transform = `translateX(${outOffset}px)`;
        }
        if (title) {
            title.style.transition = 'opacity 200ms ease, transform 200ms ease';
            title.style.opacity = '0.2';
            title.style.transform = `translateX(${outOffset/2}px)`;
        }
        fetch(url.toString(), { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newDays = doc.getElementById('calendarDays');
                const newTitle = doc.getElementById('calendarTitle');
                const scripts = Array.from(doc.querySelectorAll('script')).map(s => s.textContent || '');
                const getJson = (name) => {
                    const re = new RegExp(`window\\.${name}\\s*=\\s*(.*?);`);
                    for (const txt of scripts) {
                        const m = txt.match(re);
                        if (m) {
                            try { return JSON.parse(m[1]); } catch (e) { try { return eval('(' + m[1] + ')'); } catch (_) { return null; } }
                        }
                    }
                    return null;
                };
                const newHolidays = getJson('CALENDAR_HOLIDAYS');
                const newTimelogStatus = getJson('CALENDAR_TIMELOG_STATUS');
                const newToday = (() => {
                    const re = /window\.CALENDAR_DEFAULT_TODAY\s*=\s*'([^']+)'/;
                    for (const txt of scripts) { const m = txt.match(re); if (m) return m[1]; }
                    return this.today;
                })();
                if (grid && newDays) grid.innerHTML = newDays.innerHTML;
                if (title && newTitle) title.textContent = newTitle.textContent;
                this.currentYear = year;
                this.currentMonth = month;
                if (newHolidays) window.CALENDAR_HOLIDAYS = this.holidays = newHolidays;
                if (newTimelogStatus) window.CALENDAR_TIMELOG_STATUS = newTimelogStatus;
                if (newToday) window.CALENDAR_DEFAULT_TODAY = this.today = newToday;
                this.setupCalendarDayEvents();
                this.renderHolidays();
                this.markToday();
                this.renderTimelogIndicators();
                this.updateCalendarHeader();
                if (grid) {
                    grid.style.transition = 'none';
                    grid.style.opacity = '0';
                    grid.style.transform = `translateX(${inOffset}px)`;
                    void grid.offsetWidth;
                    grid.style.transition = 'opacity 220ms ease, transform 220ms ease';
                    grid.style.opacity = '1';
                    grid.style.transform = 'translateX(0)';
                }
                if (title) {
                    title.style.transition = 'none';
                    title.style.opacity = '0.2';
                    title.style.transform = `translateX(${inOffset/2}px)`;
                    void title.offsetWidth;
                    title.style.transition = 'opacity 220ms ease, transform 220ms ease';
                    title.style.opacity = '1';
                    title.style.transform = 'translateX(0)';
                }
            })
            .catch(() => { window.location.href = url.toString(); })
            .finally(() => { this.isNavigating = false; });
    }

    renderHolidays() {
        const calendarDays = document.querySelectorAll('.calendar-day:not(.empty)');
        calendarDays.forEach(day => {
            day.classList.remove('has-holiday', 'legal', 'special', 'day_off', 'company');
            const date = day.dataset.date;
            if (this.holidays && this.holidays[date]) {
                day.classList.add('has-holiday');
                this.holidays[date].forEach(holiday => {
                    if (holiday.type) {
                        day.classList.add(holiday.type);
                    }
                });
            }
        });
    }

    markToday() {
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('today');
        });
        const realToday = window.CALENDAR_DEFAULT_TODAY;
        const todayElement = document.querySelector(`[data-date="${realToday}"]`);
        if (todayElement) {
            todayElement.classList.add('today');
        }
    }

    showHolidayTooltip(dayElement) {
        const date = dayElement.dataset.date;
        if (!this.holidays || !this.holidays[date] || !this.tooltip) {
            return;
        }
        const holidays = this.holidays[date];
        if (!holidays || holidays.length === 0) {
            return;
        }
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const tooltipDate = document.getElementById('tooltipDate');
        if (tooltipDate) {
            tooltipDate.textContent = formattedDate;
        }
        const tooltipHolidays = document.getElementById('tooltipHolidays');
        if (tooltipHolidays) {
            tooltipHolidays.innerHTML = '';
            holidays.forEach(holiday => {
                const holidayItem = document.createElement('div');
                holidayItem.className = 'holiday-item';
                const dot = document.createElement('div');
                dot.className = `holiday-type-dot ${holiday.type || 'default'}`;
                const content = document.createElement('div');
                content.className = 'holiday-content';
                const name = document.createElement('div');
                name.className = 'holiday-name';
                name.textContent = holiday.name;
                content.appendChild(name);
                if (holiday.description) {
                    const description = document.createElement('div');
                    description.className = 'holiday-description';
                    description.textContent = holiday.description;
                    content.appendChild(description);
                }
                holidayItem.appendChild(dot);
                holidayItem.appendChild(content);
                tooltipHolidays.appendChild(holidayItem);
            });
        }
        this.tooltip.classList.add('show');
        const rect = dayElement.getBoundingClientRect();
        const tRect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const gap = 8;
        let left = rect.right + gap;
        let top = rect.top;
        if (left + tRect.width > viewportWidth - gap) {
            left = rect.left - tRect.width - gap;
        }
        if (top + tRect.height > window.innerHeight - gap) {
            top = window.innerHeight - tRect.height - gap;
        }
        if (top < gap) {
            top = gap;
        }
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }

    hideHolidayTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('show');
        }
    }

    updateTooltipPosition(e) {}

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (window.portalUI && window.portalUI.openModalPublic) {
            window.portalUI.openModalPublic(modalId);
        } else if (modal) {
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        if (window.portalUI && window.portalUI.closeModalPublic) {
            window.portalUI.closeModalPublic(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
            }
        }
    }

    getTimeLogsForDate(dateString) {
        if (!window.CALENDAR_TIMELOGS) return [];
        return window.CALENDAR_TIMELOGS[dateString] || [];
    }

    normalizeDate(dateString) {
        const d = new Date(dateString + 'T00:00:00');
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    restoreTimelogStatus() {
        const storedStatus = localStorage.getItem('calendar_timelog_status');
        if (storedStatus) {
            const status = JSON.parse(storedStatus);
            if (window.CALENDAR_TIMELOG_STATUS) {
                window.CALENDAR_TIMELOG_STATUS = status;
            }
        }
    }
}

async function initializeCalendar(year, month, holidays, today) {
    const calendarManager = new CalendarManager(year, month, holidays, today);
    window.calendarManager = calendarManager;
    await calendarManager.init();
}

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        await initializeCalendar(
            window.CALENDAR_DEFAULT_YEAR,
            window.CALENDAR_DEFAULT_MONTH,
            window.CALENDAR_HOLIDAYS,
            window.CALENDAR_DEFAULT_TODAY
        );
    })();
});

function openModal(modalId) {
    if (window.calendarManager) {
        window.calendarManager.openModal(modalId);
    }
}

function closeModal(modalId) {
    if (window.calendarManager) {
        window.calendarManager.closeModal(modalId);
    }
}