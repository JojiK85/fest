// ==========================================
// HOME.HTML SPECIFIC LOGIC (Calendar & Feed)
// ==========================================

let currentMonth = 9; // October (0-indexed)
let currentYear = 2026;
let calendarEvents = {};

document.addEventListener("DOMContentLoaded", () => {
    // 1. Listen for live updates from the database
    window.addEventListener('db-updated', () => {
        if (document.getElementById('calendar-grid')) {
            window.updateDynamicCalendar();
        }
    });

    // 2. CRITICAL FIX: Immediately read cached events BEFORE drawing the calendar!
    if (document.getElementById('calendar-grid')) {
        window.updateDynamicCalendar(); // This line was missing!
        window.generateCalendar();
    }
    
    // 3. Initialize ambient falling leaves
    initFallingLeaves();
});

// Re-creates the event dictionary mapped to specific dates
window.updateDynamicCalendar = function() {
    calendarEvents = {};
    for (const [catKey, events] of Object.entries(window.EVENTS_DATA || {})) {
        events.forEach(ev => {
            if (!ev.date) return;

            // Clean up the text just in case there are accidental invisible spaces
            let dateString = ev.date.trim();
            let d = new Date(dateString);

            // Smart Fallback: If standard parsing fails, try to aggressively extract the date
            if (isNaN(d)) {
                // If someone typed "20-10-2026", JS fails. Let's fix it manually.
                const cleanDate = dateString.replace(/-/g, ' ').replace(/,/g, ' ');
                d = new Date(cleanDate);
            }
            
            // Only add to calendar if we successfully created a valid date
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

                // Try to safely split the time out if the admin entered "Oct 20, 2026, 10:00 AM"
                let extractedTime = "TBA";
                if (dateString.includes(',')) {
                    let parts = dateString.split(',');
                    extractedTime = parts[parts.length - 1].trim(); // Gets the last part after the comma
                } else if (dateString.includes(':')) {
                    extractedTime = dateString.match(/\d{1,2}:\d{2}\s?(AM|PM|am|pm)?/)?.[0] || "TBA";
                }

                calendarEvents[dateKey].push({
                    title: ev.name,
                    time: extractedTime, 
                    location: ev.venue || "TBA",
                    emoji: emoji,
                    id: ev.id
                });
            }
        });
    }
    
    // Refresh the view if the user is looking at the calendar
    if (document.getElementById('calendar-grid')) {
        window.generateCalendar();
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
        window.generateCalendar();
    }
};

window.generateCalendar = function() {
    const calGrid = document.getElementById('calendar-grid');
    if (!calGrid) return;
    
    let calHTML = '';
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Empty slots for days of the week before the 1st
    for (let i = 0; i < firstDay; i++) {
        calHTML += `<div class="h-10 md:h-14"></div>`;
    }
    
    // Fill in the actual days
    for (let i = 1; i <= totalDays; i++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEvent = calendarEvents[dateKey];
        
        let iconHTML = '';
        let styleClasses = 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10';
        
        if (hasEvent) {
            styleClasses = 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow hover:bg-cyan-500/20';
            iconHTML = `<span class="absolute bottom-1 right-1 text-xs opacity-80">${hasEvent[0].emoji}</span>`;
        }
        
        calHTML += `<div onclick="window.selectDate('${dateKey}')" class="flex flex-col justify-center items-center h-10 md:h-14 rounded-lg cursor-pointer transition-all relative ${styleClasses}"><span class="text-xs md:text-sm">${i}</span>${iconHTML}</div>`;
    }
    
    calGrid.innerHTML = calHTML;
};

window.selectDate = function(dateKey) { 
    window.renderFeed(dateKey); 
};

window.renderFeed = function(dateKey) {
    const container = document.getElementById("feed-container");
    if(!container) return;
    
    const events = dateKey ? calendarEvents[dateKey] : null;
    if (!events || events.length === 0) {
        container.innerHTML = `<div class="group p-4 rounded-2xl bg-black/40 flex items-center gap-4"><p class="text-zinc-500 text-sm italic">No events scheduled on this day...</p></div>`;
        return;
    }
    
    container.innerHTML = "";
    events.forEach((ev, index) => {
        container.innerHTML += `
            <div onclick="window.openEventPopup('${dateKey}', ${index})" class="group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition shrink-0">${ev.emoji}</div>
                <div class="min-w-0">
                    <h4 class="font-bold text-white truncate break-words">${ev.title}</h4>
                    <p class="text-xs text-zinc-400 truncate">${ev.time} • ${ev.location}</p>
                </div>
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
        if(typeof window.openEventModal === 'function') window.openEventModal(fullCatKey, fullEvent.id); 
    } else { 
        if(typeof window.showMessage === 'function') window.showMessage("Detailed view not available."); 
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
}            styleClasses = 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow hover:bg-cyan-500/20';
            iconHTML = `<span class="absolute bottom-1 right-1 text-xs opacity-80">${hasEvent[0].emoji}</span>`;
        }
        
        calHTML += `<div onclick="window.selectDate('${dateKey}')" class="flex flex-col justify-center items-center h-10 md:h-14 rounded-lg cursor-pointer transition-all relative ${styleClasses}"><span class="text-xs md:text-sm">${i}</span>${iconHTML}</div>`;
    }
    
    calGrid.innerHTML = calHTML;
};

window.selectDate = function(dateKey) { 
    window.renderFeed(dateKey); 
};

window.renderFeed = function(dateKey) {
    const container = document.getElementById("feed-container");
    if(!container) return;
    
    const events = dateKey ? calendarEvents[dateKey] : null;
    if (!events || events.length === 0) {
        container.innerHTML = `<div class="group p-4 rounded-2xl bg-black/40 flex items-center gap-4"><p class="text-zinc-500 text-sm italic">No events scheduled on this day...</p></div>`;
        return;
    }
    
    container.innerHTML = "";
    events.forEach((ev, index) => {
        container.innerHTML += `
            <div onclick="window.openEventPopup('${dateKey}', ${index})" class="group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all cursor-pointer flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition shrink-0">${ev.emoji}</div>
                <div class="min-w-0">
                    <h4 class="font-bold text-white truncate break-words">${ev.title}</h4>
                    <p class="text-xs text-zinc-400 truncate">${ev.time} • ${ev.location}</p>
                </div>
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
        if(typeof window.openEventModal === 'function') window.openEventModal(fullCatKey, fullEvent.id); 
    } else { 
        if(typeof window.showMessage === 'function') window.showMessage("Detailed view not available."); 
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
