function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', () => {
    let queryYear = getQueryParam('year');
    let queryMonth = getQueryParam('month');
    let queryDate = getQueryParam('date');
    let lastYear = localStorage.getItem('calendarYear');
    let lastMonth = localStorage.getItem('calendarMonth');
    let lastDate = localStorage.getItem('calendarDate');
    let year = queryYear ? parseInt(queryYear) : (lastYear ? parseInt(lastYear) : window.CALENDAR_DEFAULT_YEAR);
    let month = queryMonth ? parseInt(queryMonth) : (lastMonth ? parseInt(lastMonth) : window.CALENDAR_DEFAULT_MONTH);
    let selectedDate = queryDate || lastDate || window.CALENDAR_DEFAULT_TODAY;

    if (queryYear) localStorage.setItem('calendarYear', queryYear);
    if (queryMonth) localStorage.setItem('calendarMonth', queryMonth);
    if (queryDate) localStorage.setItem('calendarDate', queryDate);

    const calendarData = {
        year: year,
        month: month,
        holidays: window.CALENDAR_HOLIDAYS,
        today: selectedDate
    };

    if (typeof initializeCalendar === 'function') {
        initializeCalendar(
            calendarData.year,
            calendarData.month,
            calendarData.holidays,
            calendarData.today
        );
    }
    if (typeof setupHolidayImageDropzone === 'function') {
        setupHolidayImageDropzone();
    }

    function saveCalendarState(year, month, date) {
        localStorage.setItem('calendarYear', year);
        localStorage.setItem('calendarMonth', month);
        if (date) localStorage.setItem('calendarDate', date);
    }

    const prevBtn = document.getElementById('prevMonth');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            let newMonth = month - 1;
            let newYear = year;
            if (newMonth < 1) {
                newMonth = 12;
                newYear--;
            }
            saveCalendarState(newYear, newMonth, null);
        });
    }
    const nextBtn = document.getElementById('nextMonth');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            let newMonth = month + 1;
            let newYear = year;
            if (newMonth > 12) {
                newMonth = 1;
                newYear++;
            }
            saveCalendarState(newYear, newMonth, null);
        });
    }
    document.querySelectorAll('.calendar-day[data-date]').forEach(day => {
        day.addEventListener('click', function() {
            const selectedDate = this.getAttribute('data-date');
            const dateInput = document.getElementById('selected-date-input');
            if (dateInput) {
                dateInput.value = selectedDate;
            }
            saveCalendarState(year, month, selectedDate);
        });
    });
});
