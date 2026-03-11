const lessonTimes = {
    1: `8:00 - 9:00`, 2: `9:10 - 10:10`, 3: `10:30 - 11:30`,
    4: `11:40 - 12:40`, 5: `12:50 - 13:50`, 6: `14:00 - 15:00`,
    7: `15:10 - 16:10`, 8: `16:20 - 17:20`, 9: `17:30 - 18:30`
};

const weekCycles = [
    {number:1,startDate:`12.01.2026`}, {number:2,startDate:`19.01.2026`},
    {number:3,startDate:`26.01.2026`}, {number:4,startDate:`02.02.2026`},
    {number:1,startDate:`09.02.2026`}, {number:2,startDate:`16.02.2026`},
    {number:3,startDate:`23.02.2026`}, {number:4,startDate:`02.03.2026`},
    {number:1,startDate:`09.03.2026`}, {number:2,startDate:`16.03.2026`},
    {number:3,startDate:`23.03.2026`}, {number:4,startDate:`30.03.2026`},
    {number:1,startDate:`06.04.2026`}, {number:2,startDate:`13.04.2026`},
    {number:3,startDate:`20.04.2026`}, {number:4,startDate:`27.04.2026`},
    {number:1,startDate:`04.05.2026`}, {number:2,startDate:`11.05.2026`},
    {number:3,startDate:`18.05.2026`}, {number:4,startDate:`25.05.2026`},
    {number:1,startDate:`01.06.2026`}, {number:2,startDate:`08.06.2026`},
    {number:3,startDate:`15.06.2026`}, {number:4,startDate:`22.06.2026`}
];

const STANDARD_DAYS_ORDER = ["понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота", "неділя"];

let globalScheduleData = null;
let currentDayIndex = 0;
let availableDays = [];
let activeWeek = 1; 

let liveTimerInterval = null;

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(10); 
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        
        const targetId = btn.dataset.target;
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            void p.offsetWidth; 
        });
        
        btn.classList.add('active');
        document.getElementById(targetId).classList.add('active');

        // Якщо відкрили вкладку "Зараз", оновлюємо одразу
        if(targetId === 'now') updateNowPage();
    });
});

function calculateCurrentWeek() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let cycle of weekCycles) {
        const parts = cycle.startDate.split('.');
        const start = new Date(parts[2], parts[1] - 1, parts[0]);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        if (today >= start && today <= end) return cycle.number;
    }
    return 1;
}

function isWeekActive(weekStr, weekNum) {
    if (!weekStr) return true;
    const parts = weekStr.split(',');
    for (let part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (weekNum >= start && weekNum <= end) return true;
        } else {
            if (Number(part) === weekNum) return true;
        }
    }
    return false;
}

// Парсинг часу "8:00 - 9:00" у мілісекунди поточного дня
function parseLessonTime(lessonNumber) {
    const timeStr = lessonTimes[lessonNumber];
    if (!timeStr) return null;
    const [startStr, endStr] = timeStr.split(' - ');
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0).getTime();
    
    return { start, end };
}

async function initApp() {
    activeWeek = calculateCurrentWeek();
    
    const savedWeekObj = localStorage.getItem('selectedWeek');
    if (savedWeekObj && savedWeekObj !== 'auto') {
        activeWeek = parseInt(savedWeekObj);
        document.getElementById('week-select').value = savedWeekObj;
        document.getElementById('week-badge').textContent = activeWeek + ' (Руч.)';
    } else {
        document.getElementById('week-badge').textContent = activeWeek;
    }

    const cachedData = localStorage.getItem('kepScheduleData');
    if (cachedData) {
        globalScheduleData = JSON.parse(cachedData).schedule || JSON.parse(cachedData); 
        updateUI();
    }
    
    try {
        const response = await fetch('/api/schedule');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        
        globalScheduleData = data.schedule || data; 
        localStorage.setItem('kepScheduleData', JSON.stringify(globalScheduleData));
        updateUI();
    } catch (error) {
        if (!cachedData) {
            document.getElementById('schedule-content').innerHTML = '<div class="glass card"><h2 class="subtitle">Помилка</h2><p class="text-muted">Немає підключення.</p></div>';
            document.getElementById('now-content').innerHTML = '<p class="status-message">Немає підключення</p>';
        }
    }
}

function updateUI() {
    if (!globalScheduleData) return;
    populateGroupSelect();
    setupSwipeAndDays();
    updateNowPage();
}

function populateGroupSelect() {
    const select = document.getElementById('group-select');
    const savedGroup = localStorage.getItem('selectedGroup');
    select.innerHTML = '<option value="">Оберіть...</option>';
    
    const groups = Object.keys(globalScheduleData).sort();
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        if (group === savedGroup) option.selected = true;
        select.appendChild(option);
    });
}

document.getElementById('group-select').addEventListener('change', (e) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (e.target.value) localStorage.setItem('selectedGroup', e.target.value);
    else localStorage.removeItem('selectedGroup');
    setupSwipeAndDays();
    updateNowPage();
});

document.getElementById('week-select').addEventListener('change', (e) => {
    localStorage.setItem('selectedWeek', e.target.value);
    initApp();
    setupSwipeAndDays();
    updateNowPage();
});

function setupSwipeAndDays() {
    const selectedGroup = localStorage.getItem('selectedGroup');
    const container = document.getElementById('schedule-content');

    if (!selectedGroup || !globalScheduleData[selectedGroup]) {
        document.getElementById('current-day-title').textContent = "Розклад";
        container.innerHTML = '<div class="glass card"><h2 class="subtitle">Групу не обрано</h2><p class="text-muted" style="padding-bottom:10px">Оберіть вашу групу в налаштуваннях.</p></div>';
        return;
    }
    
    const groupData = globalScheduleData[selectedGroup];
    
    availableDays = Object.keys(groupData).sort((a, b) => {
        const indexA = STANDARD_DAYS_ORDER.indexOf(a.toLowerCase().trim());
        const indexB = STANDARD_DAYS_ORDER.indexOf(b.toLowerCase().trim());
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    if (availableDays.length === 0) {
        container.innerHTML = '<div class="glass card"><p class="text-muted" style="padding: 24px;">Розклад порожній</p></div>';
        return;
    }
    
    const today = new Date();
    const currentDayIndexInStandard = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const currentDayName = STANDARD_DAYS_ORDER[currentDayIndexInStandard];

    let targetIndex = availableDays.findIndex(day => day.toLowerCase().trim() === currentDayName);

    if (targetIndex === -1) {
        for (let i = 1; i <= 7; i++) {
            const nextIndex = (currentDayIndexInStandard + i) % 7;
            const nextDayName = STANDARD_DAYS_ORDER[nextIndex];
            const foundIndex = availableDays.findIndex(day => day.toLowerCase().trim() === nextDayName);
            if (foundIndex !== -1) {
                targetIndex = foundIndex;
                break;
            }
        }
    }
    
    currentDayIndex = targetIndex !== -1 ? targetIndex : 0;
    renderCurrentDay();
}

function renderCurrentDay() {
    const container = document.getElementById('schedule-content');
    const selectedGroup = localStorage.getItem('selectedGroup');
    if(!selectedGroup) return;

    container.classList.remove('fade-swipe');
    void container.offsetWidth; 
    container.classList.add('fade-swipe');

    const dayName = availableDays[currentDayIndex];
    document.getElementById('current-day-title').textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    container.innerHTML = '';
    const dayLessons = globalScheduleData[selectedGroup][dayName] || [];
    
    const activeLessons = dayLessons
        .filter(lesson => isWeekActive(lesson.week, activeWeek))
        .sort((a, b) => Number(a.number) - Number(b.number));

    if (activeLessons.length === 0) {
        container.innerHTML = `<div class="glass card"><p class="text-muted" style="padding: 30px; text-align: center;">Пар немає.</p></div>`;
    } else {
        const card = document.createElement('div');
        card.className = 'glass card';
        let htmlStr = '';

        activeLessons.forEach((lesson, index) => {
            const timeStr = lessonTimes[lesson.number] || '—';
            
            // Визначаємо чи активна (для загальної вкладки)
            const timeData = parseLessonTime(lesson.number);
            let isActiveNow = false;
            if(timeData) {
                const now = new Date().getTime();
                const todayName = STANDARD_DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                if(dayName === todayName && now >= timeData.start && now <= timeData.end) {
                    isActiveNow = true;
                }
            }
            
            const userIcon = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            const roomIcon = `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
            
            const animationDelay = index * 0.08;

            htmlStr += `
                <div class="lesson-row ${isActiveNow ? 'active-lesson' : ''}" style="animation: slideFade 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) ${animationDelay}s forwards;">
                    <div class="lesson-time-col">
                        <span class="lesson-num">${lesson.number}</span>
                        <span class="lesson-time">${timeStr}</span>
                    </div>
                    <div class="lesson-info-col">
                        <div class="lesson-subject">${lesson.subject}</div>
                        <div class="lesson-meta">
                            ${lesson.teacher ? `<span>${userIcon} ${lesson.teacher}</span>` : ''}
                            ${lesson.cabinet ? `<span>${roomIcon} Ауд. ${lesson.cabinet}</span>` : ''}
                        </div>
                    </div>
                </div>`;
        });
        card.innerHTML = htmlStr;
        container.appendChild(card);
    }
}

// Функція для форматування картки уроку (перевикористовується)
function createLessonCardHtml(lesson) {
    const timeStr = lessonTimes[lesson.number] || '—';
    const userIcon = `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    const roomIcon = `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    
    return `
        <div class="glass card" style="padding:0;">
            <div class="lesson-row" style="opacity:1;">
                <div class="lesson-time-col">
                    <span class="lesson-num">${lesson.number}</span>
                    <span class="lesson-time">${timeStr}</span>
                </div>
                <div class="lesson-info-col">
                    <div class="lesson-subject">${lesson.subject}</div>
                    <div class="lesson-meta">
                        ${lesson.teacher ? `<span>${userIcon} ${lesson.teacher}</span>` : ''}
                        ${lesson.cabinet ? `<span>${roomIcon} Ауд. ${lesson.cabinet}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

function updateNowPage() {
    if(liveTimerInterval) clearInterval(liveTimerInterval);

    const container = document.getElementById('now-content');
    const selectedGroup = localStorage.getItem('selectedGroup');
    
    if (!selectedGroup || !globalScheduleData[selectedGroup]) {
        container.innerHTML = '<div class="status-message">Оберіть групу в налаштуваннях</div>';
        return;
    }

    const today = new Date();
    const todayName = STANDARD_DAYS_ORDER[today.getDay() === 0 ? 6 : today.getDay() - 1];
    const groupData = globalScheduleData[selectedGroup];
    const dayLessons = groupData[todayName] || [];
    
    const activeLessons = dayLessons
        .filter(lesson => isWeekActive(lesson.week, activeWeek))
        .sort((a, b) => Number(a.number) - Number(b.number));

    if (activeLessons.length === 0) {
        container.innerHTML = '<div class="status-message">Сьогодні пар немає. Відпочивайте! 🎉</div>';
        return;
    }

    // Рендер основи: SVG кільце з маскою для ефекту рисочок
    container.innerHTML = `
        <div class="now-timer-container">
            <div class="timer-wrapper">
                <svg class="progress-ring" width="240" height="240">
                    <defs>
                        <mask id="dash-mask">
                            <circle cx="120" cy="120" r="108" fill="transparent" stroke="white" stroke-width="12" stroke-dasharray="4 6" />
                        </mask>
                    </defs>
                    <circle stroke="rgba(255, 255, 255, 0.1)" stroke-width="12" fill="transparent" r="108" cx="120" cy="120" stroke-dasharray="4 6" />
                    <circle id="timer-circle" class="progress-ring__circle" stroke-width="12" fill="transparent" r="108" cx="120" cy="120" mask="url(#dash-mask)" />
                </svg>
                <div class="timer-content">
                    <div id="timer-label" class="timer-label">Очікування...</div>
                    <div id="timer-countdown" class="timer-countdown">00:00</div>
                    <div id="timer-cabinet" class="timer-cabinet" style="display:none;"></div>
                </div>
            </div>
        </div>
        <div id="next-lesson-container"></div>
    `;

    const circle = document.getElementById('timer-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    // Встановлюємо плавне заповнення (бо маска робить рисочки за нас)
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    function setProgress(percent) {
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    function tick() {
        const now = new Date().getTime();
        let currentState = 'END'; // BEFORE, LESSON, BREAK, END
        let currentLesson = null;
        let nextLesson = null;
        let timeRemaining = 0;
        let totalDuration = 1;

        for (let i = 0; i < activeLessons.length; i++) {
            const lesson = activeLessons[i];
            const times = parseLessonTime(lesson.number);
            if(!times) continue;

            if (now < times.start && i === 0) {
                currentState = 'BEFORE';
                nextLesson = lesson;
                timeRemaining = times.start - now;
                totalDuration = 60 * 60 * 1000; // Візуал до початку
                break;
            }

            if (now >= times.start && now <= times.end) {
                currentState = 'LESSON';
                currentLesson = lesson;
                nextLesson = activeLessons[i + 1] || null;
                timeRemaining = times.end - now;
                totalDuration = times.end - times.start;
                break;
            }

            if (now > times.end && activeLessons[i + 1]) {
                const nextTimes = parseLessonTime(activeLessons[i + 1].number);
                if (now < nextTimes.start) {
                    currentState = 'BREAK';
                    nextLesson = activeLessons[i + 1];
                    timeRemaining = nextTimes.start - now;
                    totalDuration = nextTimes.start - times.end;
                    break;
                }
            }
        }

        const labelEl = document.getElementById('timer-label');
        const countdownEl = document.getElementById('timer-countdown');
        const cabinetEl = document.getElementById('timer-cabinet');
        const nextContainer = document.getElementById('next-lesson-container');

        const totalSeconds = Math.floor(timeRemaining / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        let timeStr = "";
        if(h > 0) timeStr += `${h}:`;
        timeStr += `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        let percent = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));

        if (currentState === 'LESSON') {
            labelEl.textContent = `Пара ${currentLesson.number}`;
            countdownEl.textContent = timeStr;
            setProgress(percent);
            
            if(currentLesson.cabinet) {
                cabinetEl.textContent = `Ауд. ${currentLesson.cabinet}`;
                cabinetEl.style.display = 'inline-block';
            } else {
                cabinetEl.style.display = 'none';
            }

            if(nextLesson) {
                nextContainer.innerHTML = `<div class="next-lesson-header">Наступна пара</div>` + createLessonCardHtml(nextLesson);
            } else {
                nextContainer.innerHTML = `<div class="status-message" style="padding: 20px;">Це остання пара на сьогодні!</div>`;
            }

        } else if (currentState === 'BREAK') {
            labelEl.textContent = "Перерва";
            countdownEl.textContent = timeStr;
            setProgress(percent);
            cabinetEl.style.display = 'none';

            nextContainer.innerHTML = `<div class="next-lesson-header">Наступна пара</div>` + createLessonCardHtml(nextLesson);

        } else if (currentState === 'BEFORE') {
            labelEl.textContent = "До початку";
            countdownEl.textContent = timeStr;
            setProgress(percent);
            cabinetEl.style.display = 'none';

            nextContainer.innerHTML = `<div class="next-lesson-header">Перша пара</div>` + createLessonCardHtml(nextLesson);

        } else {
            labelEl.textContent = "Пари";
            countdownEl.textContent = "Завершено";
            cabinetEl.style.display = 'none';
            setProgress(100); 
            nextContainer.innerHTML = `<div class="status-message">Всі пари на сьогодні завершилися.</div>`;
            clearInterval(liveTimerInterval);
        }
    }

    tick(); 
    liveTimerInterval = setInterval(tick, 1000);
}

document.getElementById('clear-cache').addEventListener('click', () => {
    if(confirm("Видалити збережені дані та групу?")) {
        localStorage.removeItem('kepScheduleData');
        localStorage.removeItem('selectedGroup');
        localStorage.removeItem('selectedWeek');
        location.reload();
    }
});

let touchstartX = 0;
let touchstartY = 0;
const swipeArea = document.querySelector('.swipe-area');

swipeArea.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
}, {passive: true});

swipeArea.addEventListener('touchend', e => {
    const touchendX = e.changedTouches[0].screenX;
    const touchendY = e.changedTouches[0].screenY;
    const deltaX = touchendX - touchstartX;
    const deltaY = touchendY - touchstartY;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 40 && availableDays.length > 0) {
        if (deltaX < 0) document.getElementById('next-day').click(); 
        if (deltaX > 0) document.getElementById('prev-day').click(); 
    }
}, {passive: true});

document.getElementById('prev-day').addEventListener('click', () => {
    if (availableDays.length > 0) {
        if (navigator.vibrate) navigator.vibrate(15);
        currentDayIndex = (currentDayIndex - 1 + availableDays.length) % availableDays.length;
        renderCurrentDay();
    }
});

document.getElementById('next-day').addEventListener('click', () => {
    if (availableDays.length > 0) {
        if (navigator.vibrate) navigator.vibrate(15);
        currentDayIndex = (currentDayIndex + 1) % availableDays.length;
        renderCurrentDay();
    }
});

initApp();