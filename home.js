// ==========================================
// HOME.HTML SPECIFIC LOGIC (Calendar & Feed)
// ==========================================

let currentMonth = 9; // October (0-indexed)
let currentYear = 2026;
let calendarEvents = {};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize the calendar grid if we are on the home page
    if (document.getElementById('calendar-grid')) {
        generateCalendar();
    }
    
    // 2. Initialize ambient falling leaves
    initFallingLeaves();
});

// Re-creates the event dictionary mapped to specific dates
window.updateDynamicCalendar = function() {
    calendarEvents = {};
    for (const [catKey, events] of Object.entries(window.EVENTS_DATA || {})) {
        events.forEach(ev => {
            const d = new Date(ev.date);
            if (!isNaN(d)) {
                const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                if (!calendarEvents[dateKey]) calendarEvents[dateKey] = [];
                
                let emoji = "✨";
                if(catKey==='tech') emoji = "💻";
                else if(catKey==='cultural') emoji = "🎭";
                else if(catKey==='shows') emoji = "🎸";
                else if(catKey==='festivals') emoji = "🎉";
                else if(catKey==='online') emoji = "🎮";
                else if(catKey==='entrepreneurial') emoji = "💼";

                calendarEvents[dateKey].push({
                    title: ev.name,
                    time: "TBA", 
                    location: ev.venue,
                    emoji: emoji,
                    id: ev.id
                });
            }
        });
    }
    // Refresh the view if the user is looking at the calendar
    if (document.getElementById('calendar-grid')) {
        generateCalendar();
    }
};

window.changeMonth = function(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
    const title = document.getElementById("calendar-month-title");
    
    if(title) {
        title.innerText = `${monthName} ${currentYear}`;
        generateCalendar();
    }
};

window.generateCalendar = function() {
    const calGrid = document.getElementById('calendar-grid');
    if (!calGrid) return;
    
    let calHTML = '';
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        calHTML += `<div class="h-10 md:h-14"></div>`;
    }
    
    for (let i = 1; i <= totalDays; i++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEvent = calendarEvents[dateKey];
        
        let iconHTML = '';
        let styleClasses = 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10';
        
        if (hasEvent) {
            styleClasses = 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow hover:bg-cyan-500/20';
            iconHTML = `<span class="absolute bottom-1 right-1 text-xs opacity-80">${hasEvent[0].emoji}</span>`;
        }
        
        calHTML += `<div onclick="selectDate('${dateKey}')" class="flex flex-col justify-center items-center h-10 md:h-14 rounded-lg cursor-pointer transition-all relative ${styleClasses}"><span class="text-xs md:text-sm">${i}</span>${iconHTML}</div>`;
    }
    
    calGrid.innerHTML = calHTML;
};

window.selectDate = function(dateKey) { 
    renderFeed(dateKey); 
};

window.renderFeed = function(dateKey) {
    const container = document.getElementById("feed-container");
    if(!container) return;
    
    const events = dateKey ? calendarEvents[dateKey] : null;
    if (!events || events.length === 0) {
        container.innerHTML = `<div class="group p-4 rounded-2xl bg-black/40 flex items-center gap-4"><p class="text-zinc-500 text-sm italic">No events selected...</p></div>`;
        return;
    }
    
    container.innerHTML = "";
    events.forEach((ev, index) => {
        container.innerHTML += `
            <div onclick="openEventPopup('${dateKey}', ${index})" class="group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition">${ev.emoji}</div>
                <div><h4 class="font-bold text-white">${ev.title}</h4><p class="text-xs text-zinc-400">${ev.time} • ${ev.location}</p></div>
            </div>`;
    });
};

window.openEventPopup = function(dateKey, index) {
    const calEvent = calendarEvents[dateKey][index];
    let fullEvent = null, fullCatKey = null;
    
    for (const [catKey, events] of Object.entries(window.EVENTS_DATA || {})) {
        const found = events.find(e => e.id === calEvent.id);
        if (found) { fullEvent = found; fullCatKey = catKey; break; }
    }
    
    if (fullEvent && fullCatKey) { 
        // Calls the genuinely shared modal function sitting in shared.js
        if(typeof openEventModal === 'function') openEventModal(fullCatKey, fullEvent.id); 
    } else { 
        if(typeof showMessage === 'function') showMessage("Detailed view not available."); 
    }
};

function initFallingLeaves() {
    const container = document.getElementById('heroLeaves');
    if (!container) return;
    const icons = ['🍁', '🍂', '🍃'];
    for (let i = 0; i < 20; i++) {
        const leaf = document.createElement('span');
        leaf.className = 'leaf';
        leaf.textContent = icons[i % 3];
        leaf.style.left = Math.random() * 100 + '%';
        leaf.style.fontSize = (14 + Math.random() * 20) + 'px';
        leaf.style.animationDuration = (8 + Math.random() * 10) + 's';
        leaf.style.animationDelay = (Math.random() * 8) + 's';
        leaf.style.opacity = Math.random() * 0.3 + 0.1;
        leaf.style.textShadow = '0 0 10px rgba(244, 63, 94, 0.4)';
        container.appendChild(leaf);
    }
}