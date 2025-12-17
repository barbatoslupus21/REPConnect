class CalendarManager {
    constructor(year, month, holidays, today) {
        // Check for stored calendar state first
        const storedMonth = localStorage.getItem('calendar_last_viewed_month');
        const storedYear = localStorage.getItem('calendar_last_viewed_year');
        
        this.currentYear = parseInt(storedYear) || parseInt(year) || new Date().getFullYear();
        this.currentMonth = parseInt(storedMonth) || parseInt(month) || (new Date().getMonth() + 1);
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
        
        // If we have a stored month/year different from URL, navigate to it
        const urlParams = new URLSearchParams(window.location.search);
        const urlYear = parseInt(urlParams.get('year'));
        const urlMonth = parseInt(urlParams.get('month'));
        
        if ((this.currentYear !== urlYear || this.currentMonth !== urlMonth) && 
            (this.currentYear !== new Date().getFullYear() || this.currentMonth !== (new Date().getMonth() + 1))) {
            // Navigate to the stored month/year to update the calendar view
            this.navigateToMonth(this.currentYear, this.currentMonth);
            return; // navigateToMonth will reload the page with correct parameters
        }
        
        this.renderHolidays();
        this.markToday();
        this.restoreTimelogStatus();
        this.renderTimelogIndicators();
        setTimeout(async () => {
            await this.refreshTimelogIndicators();
        }, 100);
        await this.selectDate(this.getInitialSelectedDate(), true);
        
        // Setup tabs with a small delay to ensure DOM is ready
        setTimeout(() => {
            this.setupTabs();
        }, 100);
        
        this.updateCalendarHeader();
        
        // Show success message if there's one stored from a refresh
        this.showStoredSuccessMessage();
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
            // If the stored date matches the current calendar view (month/year), use it
            if (dateYear === this.currentYear && dateMonth === this.currentMonth) {
                return storedDate;
            }
        }
        
        // Check if today is in the current month being viewed
        const todayDate = new Date(this.today);
        const todayInCurrentMonth = todayDate.getFullYear() === this.currentYear && 
                                   (todayDate.getMonth() + 1) === this.currentMonth;
        
        // Return today if it's in the current month, otherwise return the 1st of the month
        return todayInCurrentMonth 
            ? this.today 
            : `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
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

    showStoredSuccessMessage() {
        const successMessage = localStorage.getItem('calendar_success_message');
        if (successMessage) {
            // Remove the stored message
            localStorage.removeItem('calendar_success_message');
            
            // Show the success message using available toast system
            setTimeout(() => {
                if (window.portalUI && window.portalUI.showNotification) {
                    window.portalUI.showNotification(successMessage, 'success');
                } else if (window.showToast) {
                    window.showToast('success', successMessage);
                } else {
                    showCalendarToast(successMessage, 'success');
                }
            }, 500); // Small delay to ensure UI is ready
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
        // Add debugging
        console.log('Setting up tabs...');
        
        const tabs = document.querySelectorAll('.tab');
        console.log('Found tabs:', tabs.length);
        
        tabs.forEach((tab, index) => {
            console.log(`Tab ${index}:`, tab.dataset.target);
            
            // Remove any existing listeners to prevent duplicates
            tab.removeEventListener('click', tab._tabClickHandler);
            
            // Create and store the click handler
            tab._tabClickHandler = () => {
                console.log('Tab clicked:', tab.dataset.target);
                this.switchTab(tab.dataset.target, tab);
                this.renderSidebarActions(tab.dataset.target);
            };
            
            tab.addEventListener('click', tab._tabClickHandler);
        });
        
        const activeTab = document.querySelector('.tab.active');
        console.log('Active tab:', activeTab ? activeTab.dataset.target : 'none');
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
        console.log('Switching to tab:', targetPanel);
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanelEl = document.getElementById(targetPanel);
        if (targetPanelEl) {
            targetPanelEl.classList.add('active');
            console.log('Panel switched to:', targetPanel);
        } else {
            console.error('Target panel not found:', targetPanel);
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
                    const prevDayLogs = data.prev_day_timelogs || [];
                    const logs = data.timelogs || [];
                    const nextDayLogs = data.next_day_timelogs || [];
                    
                    // Helper function to check if time is night shift (>= 4:00 PM)
                    const isNightShiftTime = (isoTime) => {
                        if (!isoTime) return false;
                        const timeObj = new Date(isoTime);
                        return timeObj.getHours() >= 16; // 4:00 PM or later
                    };
                    
                    // Find time-ins and time-outs
                    const prevDayTimeIns = prevDayLogs.filter(log => log.entry === 'timein' && log.time && log.time.trim() !== '');
                    const prevDayTimeOuts = prevDayLogs.filter(log => log.entry === 'timeout' && log.time && log.time.trim() !== '');
                    const currentTimeIns = logs.filter(log => log.entry === 'timein' && log.time && log.time.trim() !== '');
                    const currentTimeOuts = logs.filter(log => log.entry === 'timeout' && log.time && log.time.trim() !== '');
                    const nextDayTimeOuts = nextDayLogs.filter(log => log.entry === 'timeout' && log.time && log.time.trim() !== '');
                    
                    // Check if current day has early morning timeout that belongs to previous night shift
                    let earlyMorningTimeoutClaimed = false;
                    for (const timeout of currentTimeOuts) {
                        const timeoutDate = new Date(timeout.time);
                        if (timeoutDate.getHours() < 8) { // Before 8 AM
                            // Check if there's a night shift time-in on previous day
                            for (const prevTimeIn of prevDayTimeIns) {
                                if (isNightShiftTime(prevTimeIn.time)) {
                                    // Check if previous day's night shift doesn't already have same-day timeout
                                    let hasSameDayTimeout = false;
                                    const prevTimeInDate = new Date(prevTimeIn.time);
                                    for (const prevTimeOut of prevDayTimeOuts) {
                                        const prevTimeOutDate = new Date(prevTimeOut.time);
                                        if (prevTimeOutDate > prevTimeInDate) {
                                            hasSameDayTimeout = true;
                                            break;
                                        }
                                    }
                                    
                                    // Only claim this timeout if previous night shift doesn't have same-day timeout
                                    if (!hasSameDayTimeout) {
                                        earlyMorningTimeoutClaimed = true;
                                        break;
                                    }
                                }
                            }
                            if (earlyMorningTimeoutClaimed) break;
                        }
                    }
                    
                    // Filter out early morning timeouts that belong to previous night shift
                    let filteredCurrentTimeOuts = currentTimeOuts;
                    if (earlyMorningTimeoutClaimed) {
                        filteredCurrentTimeOuts = currentTimeOuts.filter(log => {
                            const timeoutDate = new Date(log.time);
                            return timeoutDate.getHours() >= 8;
                        });
                    }
                    
                    // Check if there's a night shift time-in (>= 4:00 PM)
                    const nightShiftTimeIn = currentTimeIns.find(log => isNightShiftTime(log.time));
                    
                    let status = 'none';
                    
                    if (nightShiftTimeIn) {
                        // Night shift: Check for timeout on current day (after time-in) or next day (before 8:00 AM)
                        let hasTimeout = false;
                        
                        // Check current day timeouts (after the night shift time-in)
                        const nightShiftTimeInDate = new Date(nightShiftTimeIn.time);
                        for (const timeout of filteredCurrentTimeOuts) {
                            const timeoutDate = new Date(timeout.time);
                            if (timeoutDate > nightShiftTimeInDate) {
                                hasTimeout = true;
                                break;
                            }
                        }
                        
                        // If no timeout on current day, check next day (before 8:00 AM)
                        if (!hasTimeout) {
                            for (const timeout of nextDayTimeOuts) {
                                const timeoutDate = new Date(timeout.time);
                                if (timeoutDate.getHours() < 8) { // Before 8:00 AM
                                    hasTimeout = true;
                                    break;
                                }
                            }
                        }
                        
                        status = hasTimeout ? 'none' : 'incomplete';
                    } else {
                        // Day shift: Both time-in and time-out should be on same day (after filtering)
                        const hasTimeIn = currentTimeIns.length > 0;
                        const hasTimeOut = filteredCurrentTimeOuts.length > 0;
                        
                        if ((hasTimeIn || hasTimeOut) && !(hasTimeIn && hasTimeOut)) {
                            status = 'incomplete';
                        }
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

            // If current user is HR admin, add an ellipsis actions button and popover
            try {
                const isHR = window.hr_admin === true || window.hr_admin === 'true' || window.hr_admin === 1;
                if (isHR) {
                    // ensure the card can be a positioning context
                    eventCard.style.position = 'relative';

                    // ellipsis button (hidden by default, shown on hover or focus)
                    const actionsWrap = document.createElement('div');
                    actionsWrap.className = 'event-actions-wrap';
                    actionsWrap.style.position = 'absolute';
                    actionsWrap.style.top = '8px';
                    actionsWrap.style.right = '8px';
                    actionsWrap.style.zIndex = '30';

                    const ellipsisBtn = document.createElement('button');
                    ellipsisBtn.className = 'btn btn-icon btn-sm event-ellipsis-btn';
                    ellipsisBtn.setAttribute('aria-label', 'More actions');
                    ellipsisBtn.style.display = 'none';
                    ellipsisBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';

                    // popover containing edit/delete
                    const popover = document.createElement('div');
                    popover.className = 'event-popover';
                    popover.style.position = 'absolute';
                    popover.style.top = '32px';
                    popover.style.right = '0px';
                    popover.style.minWidth = '140px';
                    popover.style.background = '#fff';
                    popover.style.border = '1px solid rgba(0,0,0,0.08)';
                    popover.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                    popover.style.borderRadius = '6px';
                    popover.style.padding = '6px';
                    popover.style.display = 'none';
                    popover.style.flexDirection = 'column';
                    popover.style.gap = '6px';
                    popover.style.zIndex = '40';

                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn btn-outline btn-sm event-edit-btn';
                    editBtn.textContent = 'Edit';
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-error btn-sm event-delete-btn';
                    deleteBtn.textContent = 'Delete';

                    popover.appendChild(editBtn);
                    popover.appendChild(deleteBtn);

                    actionsWrap.appendChild(ellipsisBtn);
                    actionsWrap.appendChild(popover);
                    eventCard.appendChild(actionsWrap);

                    // show ellipsis on hover/focus (desktop) and always show on focus for accessibility
                    eventCard.addEventListener('mouseenter', () => {
                        ellipsisBtn.style.display = 'block';
                    });
                    eventCard.addEventListener('mouseleave', () => {
                        // only hide if popover not open
                        if (!popover.classList.contains('open')) ellipsisBtn.style.display = 'none';
                    });

                    ellipsisBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        // toggle popover
                        const isOpen = popover.classList.toggle('open');
                        popover.style.display = isOpen ? 'flex' : 'none';
                        // keep ellipsis visible while open
                        if (isOpen) ellipsisBtn.style.display = 'block';
                    });

                    // Edit action: open edit modal and try to prefill fields
                    editBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        
                        // Debug: log the event object to see what data is available
                        console.log('Event object for editing:', event);
                        console.log('Selected date:', window.calendarManager ? window.calendarManager.selectedDate : 'No calendar manager');
                        
                        // Prefill fields if present
                        const nameEl = document.getElementById('edit-event-name');
                        if (nameEl) nameEl.value = event.name || '';
                        const typeEl = document.getElementById('edit-event-type');
                        if (typeEl) typeEl.value = event.type || '';
                        const repEl = document.getElementById('edit-event-repetition');
                        if (repEl) repEl.value = event.repetition || 'none';
                        
                        // Set the date - use event date or fall back to selected date
                        const dateEl = document.getElementById('edit-event-date');
                        if (dateEl) {
                            let eventDate = event.date || event.event_date || '';
                            // If no event date, use the currently selected calendar date
                            if (!eventDate && window.calendarManager && window.calendarManager.selectedDate) {
                                eventDate = window.calendarManager.selectedDate;
                            }
                            console.log('Setting date field to:', eventDate);
                            dateEl.value = eventDate;
                        }
                        
                        const descEl = document.getElementById('edit-event-description');
                        if (descEl) descEl.value = event.description || '';

                        // Set form action and event ID
                        const editForm = document.getElementById('edit-event-form');
                        if (editForm && event.id) {
                            editForm.action = `/calendar/edit-holiday/${event.id}/`;
                            editForm.dataset.eventId = event.id;
                        }

                        // Show modal using proper modal helper
                        if (window.openModal) {
                            window.openModal('editEventModal');
                        } else {
                            const editModal = document.getElementById('editEventModal');
                            if (editModal) {
                                editModal.style.display = 'block';
                                editModal.classList.add('open');
                            }
                        }
                        // close popover
                        popover.classList.remove('open');
                        popover.style.display = 'none';
                    });

                    // Delete action: open delete modal and set hidden id
                    deleteBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const deleteForm = document.getElementById('delete-event-form');
                        if (deleteForm) {
                            let hidden = deleteForm.querySelector('input[name="event_id"]');
                            if (!hidden) {
                                hidden = document.createElement('input');
                                hidden.type = 'hidden';
                                hidden.name = 'event_id';
                                deleteForm.appendChild(hidden);
                            }
                            hidden.value = event.id || '';
                        }
                        
                        // Show modal using proper modal helper
                        if (window.openModal) {
                            window.openModal('deleteEventModal');
                        } else {
                            const deleteModal = document.getElementById('deleteEventModal');
                            if (deleteModal) {
                                deleteModal.style.display = 'block';
                                deleteModal.classList.add('open');
                            }
                        }
                        
                        popover.classList.remove('open');
                        popover.style.display = 'none';
                    });
                }
            } catch (e) {
                // If any error with admin controls, don't block rendering
                console.warn('Failed to add HR actions to event card', e);
            }
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
                // Clear timelog status - it will be refreshed with accurate data shortly
                window.CALENDAR_TIMELOG_STATUS = {};
                if (newToday) window.CALENDAR_DEFAULT_TODAY = this.today = newToday;
                this.setupCalendarDayEvents();
                this.renderHolidays();
                this.markToday();
                // Don't render old indicators - they'll be refreshed with fresh data
                // this.renderTimelogIndicators();
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
                
                // Select an appropriate date in the new month and refresh timelog indicators
                setTimeout(async () => {
                    // Check if today is in the current month
                    const todayDate = new Date(this.today);
                    const todayInCurrentMonth = todayDate.getFullYear() === year && 
                                               (todayDate.getMonth() + 1) === month;
                    
                    // Select today if it's in the current month, otherwise select the 1st
                    const dateToSelect = todayInCurrentMonth 
                        ? this.today 
                        : `${year}-${String(month).padStart(2, '0')}-01`;
                    
                    await this.selectDate(dateToSelect);
                    
                    // Re-setup tabs to ensure event listeners are attached
                    this.setupTabs();
                    
                    // Refresh timelog indicators to get accurate status for the new month
                    await this.refreshTimelogIndicators();
                }, 50);
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

// Global click listener to close event popovers when clicking outside
document.addEventListener('click', function(e) {
    document.querySelectorAll('.event-popover.open').forEach(pop => {
        if (!pop.contains(e.target) && !pop.previousElementSibling?.contains(e.target)) {
            pop.classList.remove('open');
            pop.style.display = 'none';
            // hide ellipsis if not hovered
            const wrap = pop.parentElement;
            if (wrap) {
                const ell = wrap.querySelector('.event-ellipsis-btn');
                if (ell && !wrap.parentElement.matches(':hover')) {
                    ell.style.display = 'none';
                }
            }
        }
    });
});

// AJAX form submission for edit event form
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('edit-event-form');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }
            
            try {
                const formData = new FormData(editForm);
                console.log('Submitting to:', editForm.action);
                console.log('Form data:', Object.fromEntries(formData));
                
                const response = await fetch(editForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                // Backend redirects on success, so any 200-level response means success
                if (response.ok) {
                    // Save current calendar state before refresh
                    if (window.calendarManager) {
                        localStorage.setItem('calendar_last_viewed_date', window.calendarManager.selectedDate);
                        localStorage.setItem('calendar_last_viewed_month', window.calendarManager.currentMonth);
                        localStorage.setItem('calendar_last_viewed_year', window.calendarManager.currentYear);
                    }
                    
                    // Set success message in localStorage to show after refresh
                    localStorage.setItem('calendar_success_message', 'Event updated successfully!');
                    
                    // Refresh the page to ensure all data is up-to-date
                    window.location.reload();
                } else {
                    throw new Error('Server returned an error');
                }
            } catch (error) {
                console.error('Error updating event:', error);
                if (window.portalUI && window.portalUI.showNotification) {
                    window.portalUI.showNotification('Failed to update event. Please try again.', 'error');
                } else if (window.showToast) {
                    window.showToast('error', 'Failed to update event. Please try again.');
                } else {
                    showCalendarToast('Failed to update event. Please try again.', 'error');
                }
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }
    
    // Delete event form submission with confirmation
    const deleteForm = document.getElementById('delete-event-form');
    if (deleteForm) {
        deleteForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = deleteForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            }
            
            try {
                // Get event ID from hidden input
                const eventIdInput = deleteForm.querySelector('input[name="event_id"]');
                const eventId = eventIdInput ? eventIdInput.value : '';
                
                if (!eventId) {
                    throw new Error('Event ID not found');
                }
                
                const response = await fetch(`/calendar/delete-holiday/${eventId}/`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': deleteForm.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                    }
                });
                
                // Backend redirects on success, so any 200-level response means success
                if (response.ok) {
                    // Save current calendar state before refresh
                    if (window.calendarManager) {
                        localStorage.setItem('calendar_last_viewed_date', window.calendarManager.selectedDate);
                        localStorage.setItem('calendar_last_viewed_month', window.calendarManager.currentMonth);
                        localStorage.setItem('calendar_last_viewed_year', window.calendarManager.currentYear);
                    }
                    
                    // Set success message in localStorage to show after refresh
                    localStorage.setItem('calendar_success_message', 'Event deleted successfully!');
                    
                    // Refresh the page to ensure all data is up-to-date
                    window.location.reload();
                } else {
                    throw new Error('Server returned an error');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
                if (window.portalUI && window.portalUI.showNotification) {
                    window.portalUI.showNotification('Failed to delete event. Please try again.', 'error');
                } else if (window.showToast) {
                    window.showToast('error', 'Failed to delete event. Please try again.');
                } else {
                    showCalendarToast('Failed to delete event. Please try again.', 'error');
                }
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }
});

// Simple toast function for calendar
function showCalendarToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `calendar-toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

async function initializeCalendar(year, month, holidays, today) {
    const calendarManager = new CalendarManager(year, month, holidays, today);
    window.calendarManager = calendarManager;
    await calendarManager.init();
}

document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit more to ensure all DOM elements are ready
    setTimeout(async () => {
        console.log('Initializing calendar...');
        await initializeCalendar(
            window.CALENDAR_DEFAULT_YEAR,
            window.CALENDAR_DEFAULT_MONTH,
            window.CALENDAR_HOLIDAYS,
            window.CALENDAR_DEFAULT_TODAY
        );
        console.log('Calendar initialized successfully');
    }, 50);
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