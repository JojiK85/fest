// ==========================================
// EVENTS.HTML SPECIFIC LOGIC (Orbit UI & Grid)
// ==========================================

window.selectCategory = function(catKey, btnElement) {
    const wrapper = document.getElementById('events-list-wrapper');
    const placeholder = document.getElementById('events-placeholder');
    if (!wrapper || !placeholder) return;
    
    // If clicking the currently active category, close it
    if (btnElement.classList.contains('active-category')) { 
        window.closeCategory(); 
        return; 
    }

    // Highlight the selected category button
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active-category'));
    btnElement.classList.add('active-category');

    // Access EVENTS_DATA from the shared global scope
    const events = window.EVENTS_DATA[catKey] || [];
    
    const titleEl = document.getElementById('selected-category-title');
    if (titleEl) titleEl.innerText = catKey === 'festivals' ? "Festivals" : catKey + " Events";
    
    const badgeEl = document.getElementById('event-count-badge');
    if (badgeEl) badgeEl.innerText = `${events.length} ${catKey === 'festivals' ? 'Festivals' : 'Events'}`;

    // Build the grid HTML
    let gridHTML = '';
    events.forEach(ev => {
        let bannerHtml = ev.banner ? `<img src="${ev.banner}" class="absolute inset-0 w-full h-full object-cover opacity-60">` : '';
        let infoHtml = '';
        let btnText = '';
        
        if (catKey !== 'festivals') {
            infoHtml = `
                <div class="grid grid-cols-2 gap-2 text-[10px] sm:text-xs mb-2 w-full">
                    <div class="min-w-0 bg-black/40 p-2 rounded-lg border border-white/5">
                        <span class="text-zinc-500 text-[8px] sm:text-[9px] block uppercase tracking-wider mb-0.5">Prize</span>
                        <span class="text-emerald-400 font-bold truncate block">${ev.prize === '-' ? '-' : '₹'+ev.prize}</span>
                    </div>
                    <div class="min-w-0 bg-black/40 p-2 rounded-lg border border-white/5 text-right">
                        <span class="text-zinc-500 text-[8px] sm:text-[9px] block uppercase tracking-wider mb-0.5">Fee</span>
                        <span class="text-amber-400 font-bold truncate block">₹${ev.fee}</span>
                    </div>
                </div>
            `;
            btnText = 'Register / Details';
        } else {
            infoHtml = `<div class="mb-2 text-[10px] sm:text-xs text-zinc-400 line-clamp-2 break-words w-full">${ev.desc}</div>`;
            btnText = 'View Festival Info';
        }

        gridHTML += `
            <div class="group rounded-xl bg-black/40 border border-white/5 overflow-hidden hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all flex flex-col min-w-0">
                <div class="h-32 sm:h-40 relative overflow-hidden bg-black shrink-0">
                    ${bannerHtml}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                    <div class="absolute bottom-2 left-3 right-3">
                        <h4 class="text-sm sm:text-base font-bold text-white truncate break-words leading-tight">${ev.name} ${ev.status === 'closed' && catKey !== 'festivals' ? '<span class="text-red-400 text-[10px] ml-1 uppercase">(Closed)</span>' : ''}</h4>
                    </div>
                </div>
                <div class="p-3 sm:p-4 flex-grow flex flex-col justify-between min-w-0">
                    ${infoHtml}
                    <button onclick="window.openEventModal('${catKey}', '${ev.id}')" class="w-full py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition font-semibold text-[10px] sm:text-xs shrink-0 mt-2">
                        ${btnText}
                    </button>
                </div>
            </div>`;
    });
    
    document.getElementById('events-grid').innerHTML = gridHTML;

    // --- FIX: Smoothly cross-fade the placeholder and the wrapper ---
    placeholder.classList.remove('opacity-100');
    placeholder.classList.add('opacity-0'); // Fade out placeholder
    
    setTimeout(() => {
        placeholder.classList.add('hidden'); // Hide completely
        
        wrapper.classList.remove('hidden');
        wrapper.classList.add('flex'); // Display grid
        
        // Short delay to allow 'flex' display to render before fading in
        setTimeout(() => {
            wrapper.classList.remove('opacity-0');
            wrapper.classList.add('opacity-100'); // Fade in wrapper
        }, 10);
    }, 150); // Wait for placeholder to fade out
};

window.closeCategory = function() {
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active-category'));
    const wrapper = document.getElementById('events-list-wrapper');
    const placeholder = document.getElementById('events-placeholder');
    
    if(wrapper) {
        // Fade out grid
        wrapper.classList.remove('opacity-100');
        wrapper.classList.add('opacity-0');
        
        setTimeout(() => {
            wrapper.classList.add('hidden');
            wrapper.classList.remove('flex');
            
            if(placeholder) {
                // Fade in placeholder
                placeholder.classList.remove('hidden');
                setTimeout(() => {
                    placeholder.classList.remove('opacity-0');
                    placeholder.classList.add('opacity-100');
                }, 10);
            }
        }, 150);
    }
};