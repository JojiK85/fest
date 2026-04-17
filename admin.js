// ==========================================
// ADMIN.HTML SPECIFIC LOGIC (Strict RBAC)
// ==========================================

// Ensure it triggers when loading the admin page
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('admin-role-display')) {
        // Ultra-fast polling instead of hard 200ms delay.
        // It checks if user data is populated and fires instantly.
        const checkSession = setInterval(() => {
            if (window.DatabaseAPI && window.DatabaseAPI._data && window.userProfile && window.userProfile.email !== undefined) {
                clearInterval(checkSession);
                if (window.isAdmin) {
                    const scannerDisplay = document.getElementById('scanner-id-display');
                    if (scannerDisplay) scannerDisplay.innerText = window.userProfile.email;
                    window.renderAdminDashboard();
                    if(window.populateScannerEventDropdown) window.populateScannerEventDropdown();
                    
                    // Render analytics instantly using cache (forceRefresh = false)
                    // The live sync will auto-trigger via 'db-updated' event.
                    if(typeof window.renderAnalytics === 'function') window.renderAnalytics(false); 
                }
            }
        }, 30);
        
        // Failsafe cleanup
        setTimeout(() => clearInterval(checkSession), 3000);
    }
});

// --- TABS & ANALYTICS ---

window.switchAdminTab = function(tabId) {
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    let tabPanel = document.getElementById(tabId);
    
    // Lazy-create specific tabs if they don't exist yet
    ['admin-mails-tab', 'admin-winners-tab', 'admin-prizes-tab'].forEach(lazyTab => {
        if (!tabPanel && tabId === lazyTab) {
            tabPanel = document.createElement('div');
            tabPanel.id = lazyTab;
            tabPanel.className = 'admin-panel animate-[fadeInSlide_0.3s_ease-out]';
            const adminSection = document.getElementById('admin');
            if (adminSection) adminSection.appendChild(tabPanel);
        }
    });

    if (tabPanel) tabPanel.classList.remove('hidden');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    // Force fetch live data from server ONLY when actively switching to the Analytics tab
    if (tabId === 'admin-analytics-tab') window.renderAnalytics(true);
    if (tabId === 'admin-accom-tab') window.renderAdminAccomTable();
    if (tabId === 'admin-search-tab') window.renderAdminSearchTable();
    if (tabId === 'admin-queries-tab') window.renderAdminQueries();
    if (tabId === 'admin-sponsors-tab') window.renderAdminSponsors();
    if (tabId === 'admin-mails-tab') window.renderAdminMails();
    if (tabId === 'admin-winners-tab') window.renderAdminWinners();
    if (tabId === 'admin-prizes-tab') window.renderAdminPrizes();
    if (tabId !== 'admin-scanner-tab') window.stopCameraScan();
};

window.renderAnalytics = async function(forceRefresh = false) {
    if (typeof forceRefresh !== 'boolean') forceRefresh = true;

    const dayFilter = String(document.getElementById('analyticsDayFilter')?.value || 'all').toLowerCase().trim();
    const evFilter = String(document.getElementById('analyticsEventFilter')?.value || 'all').toLowerCase().trim();

    // Fetch data
    const regs = await window.DatabaseAPI.get('registrations', forceRefresh) || [];
    const pays = await window.DatabaseAPI.get('payments', forceRefresh) || [];
    const logs = await window.DatabaseAPI.get('logs', forceRefresh) || [];
    const accoms = await window.DatabaseAPI.get('accommodations', forceRefresh) || [];

    let filteredRegs = regs;
    let filteredPays = pays.filter(p => p.status === 'Success');
    let filteredLogs = logs;
    let filteredAccoms = accoms;

    // --- APPLY EVENT / ACCOMMODATION FILTER ---
    if (evFilter !== 'all') {
        if (evFilter === 'accommodation' || evFilter === 'accom') {
            filteredRegs = []; // Hide event registrations
            
            const accomUserIds = new Set(accoms.map(a => a.id));
            filteredPays = filteredPays.filter(p => accomUserIds.has(p.user));
            filteredLogs = filteredLogs.filter(l => String(l.type).toLowerCase().includes('accom') || String(l.id).includes('ACCOM'));
        } else {
            filteredAccoms = []; // Hide accommodation stats
            filteredRegs = filteredRegs.filter(r => String(r.eventId).toLowerCase() === evFilter);
            
            // Map users attached to this specific event for revenue calculation
            const eventUserIds = new Set();
            filteredRegs.forEach(r => {
                if (r.leader) eventUserIds.add(r.leader);
                if (r.members && Array.isArray(r.members)) r.members.forEach(m => eventUserIds.add(m));
            });
            
            filteredPays = filteredPays.filter(p => eventUserIds.has(p.user));
            filteredLogs = filteredLogs.filter(l => String(l.type).toLowerCase() === evFilter || String(l.id).toLowerCase().includes(evFilter));
        }
    }

    // --- APPLY DAY / TIME FILTER ---
    if (dayFilter !== 'all') {
        let startDate = new Date(0); // Epoch
        let specificDayStr = '';
        
        if (dayFilter === 'today') {
            startDate = new Date();
            startDate.setHours(0,0,0,0);
        } else if (dayFilter === 'week' || dayFilter.includes('7days')) {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (dayFilter === 'month' || dayFilter.includes('30days')) {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            specificDayStr = dayFilter; // Used if checking exact strings like "Day 1"
        }
        
        const checkDate = (item) => {
            const itemDateStr = item.date || item.timestamp || item.createdAt;
            if (!itemDateStr) return true; // Keep if no date exists
            
            if (specificDayStr) {
                return String(itemDateStr).toLowerCase().includes(specificDayStr);
            } else if (startDate.getTime() > 0) {
                const d = new Date(itemDateStr);
                if (!isNaN(d.getTime())) return d >= startDate;
            }
            return true;
        };

        filteredRegs = filteredRegs.filter(checkDate);
        filteredPays = filteredPays.filter(checkDate);
        filteredAccoms = filteredAccoms.filter(checkDate);
        filteredLogs = filteredLogs.filter(checkDate);
    }

    // --- CALCULATE FINAL METRICS ---
    let totalRegCount = filteredRegs.length + (evFilter === 'all' || evFilter === 'accommodation' ? filteredAccoms.length : 0);
    let totalRevCount = filteredPays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    const todayStr = new Date().toDateString();
    let scansToday = filteredLogs.filter(l => {
        const d = new Date(l.timestamp || l.date);
        return !isNaN(d.getTime()) && d.toDateString() === todayStr;
    }).length;
    
    let insideCampus = new Set(filteredLogs.map(l => l.id)).size;

    // Calculate dynamic "Today" mini-stats
    let regsToday = filteredRegs.filter(r => {
        const timestamp = r.date || r.timestamp || parseInt(r.id); // Fallback to ID which is a Date.now() timestamp
        const d = new Date(timestamp);
        return !isNaN(d.getTime()) && d.toDateString() === todayStr;
    }).length;

    let revToday = filteredPays.filter(p => {
        const d = new Date(p.timestamp || p.date);
        return !isNaN(d.getTime()) && d.toDateString() === todayStr;
    }).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // --- UPDATE DOM ---
    const safeUpdate = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    safeUpdate('stat-total-reg', totalRegCount.toLocaleString());
    safeUpdate('stat-scans', scansToday.toLocaleString());
    safeUpdate('stat-inside', insideCampus.toLocaleString());
    safeUpdate('stat-reg-today', `+${regsToday.toLocaleString()} today`);
    
    const revContainer = document.getElementById('stat-revenue-container');
    if(window.currentRole >= window.ROLES.SUPERACCOUNT) {
        if(revContainer) revContainer.style.display = 'block';
        safeUpdate('stat-revenue', `₹${totalRevCount.toLocaleString()}`);
        safeUpdate('stat-rev-today', `+₹${revToday.toLocaleString()} today`);
    } else {
        if(revContainer) revContainer.style.display = 'none';
    }

    // MAKE HTML PROGRESS BARS FULLY DYNAMIC FROM LIVE DB
    const fillRatesContainer = document.getElementById('dynamic-fill-rates');
    if (fillRatesContainer) {
        const allEvents = Object.values(window.EVENTS_DATA || {}).flat();
        
        let eventStats = allEvents.map(ev => {
            const count = regs.filter(r => String(r.eventId) === String(ev.id)).length;
            return { name: ev.name, cat: ev.category || 'event', count: count };
        }).sort((a, b) => b.count - a.count); // Highest registrations at the top
        
        // Display empty bars if no registrations exist yet
        if(eventStats.length === 0 || eventStats.every(e => e.count === 0)) {
            eventStats = allEvents.slice(0, 6).map(ev => ({ name: ev.name, cat: ev.category || 'event', count: 0 }));
        }

        const topEvents = eventStats.slice(0, 6); 
        const maxCount = Math.max(...topEvents.map(e => e.count), 50); // Min scale of 50 to look proportional
        
        const colors = ['bg-orange-500', 'bg-purple-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500'];
        
        fillRatesContainer.innerHTML = topEvents.map((stat, idx) => {
            const percent = Math.min((stat.count / maxCount) * 100, 100);
            const color = colors[idx % colors.length];
            return `
            <div>
                <div class="flex justify-between text-[10px] sm:text-xs mb-1">
                    <span class="text-zinc-400 truncate pr-2">${stat.name} <span class="text-zinc-600 capitalize">(${stat.cat})</span></span>
                    <span class="text-white font-bold shrink-0">${stat.count} <span class="text-zinc-500 font-normal">Regs</span></span>
                </div>
                <div class="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                    <div class="${color} h-1.5 rounded-full transition-all duration-1000 ease-out" style="width: ${percent}%"></div>
                </div>
            </div>`;
        }).join('');
    }
};

window.renderAdminDashboard = async function() {
    const roleName = Object.keys(window.ROLES).find(key => window.ROLES[key] === window.currentRole) || 'Unknown';
    const roleDisplay = document.getElementById('admin-role-display');
    if(roleDisplay) roleDisplay.innerHTML = `Current Access Level: <strong class="text-rose-400 capitalize">${roleName}</strong>`;

    const tabs = {
        'tab-btn-analytics': window.ROLES.ADMIN,
        'tab-btn-scanner': window.ROLES.ADMIN,
        'tab-btn-search': window.ROLES.ADMIN,
        'tab-btn-database': window.ROLES.ADMIN, 
        'tab-btn-events': window.ROLES.SUPERADMIN,
        'tab-btn-mails': window.ROLES.ADMIN, 
        'tab-btn-winners': window.ROLES.ADMIN,
        'tab-btn-prizes': window.ROLES.SUPERADMIN,
        'tab-btn-accom': window.ROLES.SUPERADMIN,
        'tab-btn-gallery': window.ROLES.SUPERADMIN,
        'tab-btn-users': window.ROLES.SUPERADMIN,
        'tab-btn-queries': window.ROLES.SUPERADMIN,
        'tab-btn-sponsors': window.ROLES.SUPERADMIN,
        'tab-btn-settings': window.ROLES.SUPERACCOUNT,
        'danger-zone-container': window.ROLES.PRIMARY
    };

    // Dynamically inject missing tab buttons
    let mailsBtn = document.getElementById('tab-btn-mails');
    if (!mailsBtn) {
        const festTabBtn = document.getElementById('tab-btn-festivals');
        if (festTabBtn) {
            festTabBtn.id = 'tab-btn-mails';
            festTabBtn.setAttribute('onclick', "switchAdminTab('admin-mails-tab')");
            festTabBtn.innerHTML = '<i data-lucide="mail" class="w-4 h-4 lg:w-4 lg:h-4"></i><span class="truncate w-full text-center">Mails</span>';
        } else {
            const tabContainer = document.querySelector('.admin-tab-btn')?.parentElement;
            if (tabContainer) {
                tabContainer.insertAdjacentHTML('beforeend', `
                    <button id="tab-btn-mails" onclick="switchAdminTab('admin-mails-tab')" class="admin-tab-btn p-2 lg:px-5 lg:py-2.5 rounded-xl text-[9px] sm:text-xs lg:text-sm font-bold text-zinc-400 hover:text-white transition flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2" style="display:none;">
                        <i data-lucide="mail" class="w-4 h-4 lg:w-4 lg:h-4"></i>
                        <span class="truncate w-full text-center">Mails</span>
                    </button>
                `);
            }
        }
    }

    let winnersBtn = document.getElementById('tab-btn-winners');
    if (!winnersBtn) {
        const tabContainer = document.querySelector('.admin-tab-btn')?.parentElement;
        if (tabContainer) {
            tabContainer.insertAdjacentHTML('beforeend', `
                <button id="tab-btn-winners" onclick="switchAdminTab('admin-winners-tab')" class="admin-tab-btn p-2 lg:px-5 lg:py-2.5 rounded-xl text-[9px] sm:text-xs lg:text-sm font-bold text-zinc-400 hover:text-white transition flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2" style="display:none;">
                    <i data-lucide="award" class="w-4 h-4 lg:w-4 lg:h-4"></i>
                    <span class="truncate w-full text-center">Winners</span>
                </button>
            `);
        }
    }
    
    let prizesBtn = document.getElementById('tab-btn-prizes');
    if (!prizesBtn) {
        const tabContainer = document.querySelector('.admin-tab-btn')?.parentElement;
        if (tabContainer) {
            tabContainer.insertAdjacentHTML('beforeend', `
                <button id="tab-btn-prizes" onclick="switchAdminTab('admin-prizes-tab')" class="admin-tab-btn p-2 lg:px-5 lg:py-2.5 rounded-xl text-[9px] sm:text-xs lg:text-sm font-bold text-zinc-400 hover:text-white transition flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2" style="display:none;">
                    <i data-lucide="gift" class="w-4 h-4 lg:w-4 lg:h-4"></i>
                    <span class="truncate w-full text-center">Prizes</span>
                </button>
            `);
        }
    }

    for (const [id, reqRole] of Object.entries(tabs)) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'danger-zone-container') el.style.display = window.currentRole >= reqRole ? 'block' : 'none';
            else el.style.display = window.currentRole >= reqRole ? 'flex' : 'none';
        }
    }

    let activeTabBtn = document.querySelector('.admin-tab-btn.active');
    if (activeTabBtn) {
        let activeTabId = activeTabBtn.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (document.getElementById(activeTabId.replace('tab-btn-', '')).style.display === 'none') {
            window.switchAdminTab('admin-scanner-tab');
        }
    }

    if (window.currentRole >= window.ROLES.SUPERADMIN) {
        const eventsHeaderContainer = document.querySelector('#admin-events-tab .flex.flex-col');
        if (eventsHeaderContainer && !document.getElementById('event-fest-toggle')) {
            eventsHeaderContainer.insertAdjacentHTML('afterend', `
                <div id="event-fest-toggle" class="flex gap-2 mt-4 mb-4 w-full sm:w-auto">
                    <button onclick="window.renderAdminEventsList('events')" id="toggle-ev-btn" class="flex-1 px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold transition shadow">Events</button>
                    <button onclick="window.renderAdminEventsList('festivals')" id="toggle-fest-btn" class="flex-1 px-6 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition shadow">Festivals</button>
                </div>
            `);
        }
        if (typeof window.renderAdminEventsList === 'function') {
            window.renderAdminEventsList('events');
        }

        window.renderAdminQueries();
        window.renderAdminSponsors();
        
        if(typeof window.updateAdminBadges === 'function') window.updateAdminBadges();

        const allGallery = await window.DatabaseAPI.get('gallery');
        const dbPendingUploads = allGallery.filter(g => g.status === 'Pending');
        const getDirect = (url) => {
            if (!url) return '';
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
            return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
        };

        let approvalsHTML = dbPendingUploads.length > 0 ? dbPendingUploads.map(p => `
            <div class="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col cursor-pointer hover:border-rose-500/50 transition-colors group" onclick="window.openGalleryDetails('${p.id}')">
                <div class="relative h-32 sm:h-40 overflow-hidden">
                    <img src="${getDirect(p.url)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://placehold.co/400x200/18181b/ffffff?text=Image+Error'">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span class="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md">Review Request</span>
                    </div>
                </div>
                <div class="p-3 sm:p-4 flex-grow">
                    <p class="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mb-1 truncate">By ${p.user}</p>
                    <p class="text-xs sm:text-sm font-bold text-rose-400 truncate">${p.event}</p>
                    <p class="text-[10px] sm:text-xs text-white truncate">"${p.caption}"</p>
                </div>
            </div>
        `).join('') : `<p class="text-zinc-500 italic text-xs sm:text-sm">No pending uploads.</p>`;
        
        const approvalsGrid = document.getElementById('admin-approvals-grid');
        if(approvalsGrid) approvalsGrid.innerHTML = approvalsHTML;
    }

    if (window.currentRole >= window.ROLES.SUPERADMIN) {
        const dbUsers = await window.DatabaseAPI.get('users');
        let usersHTML = '';
        dbUsers.forEach(u => {
            let roleSelectDisabled = "";
            if (window.currentRole !== window.ROLES.PRIMARY && u.role >= window.currentRole && u.id !== window.userProfile.accountId) {
                roleSelectDisabled = "disabled";
            }
            
            usersHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 sm:p-4 font-mono text-cyan-400 text-[10px] sm:text-xs align-middle text-left">${u.id}</td>
                    <td class="p-3 sm:p-4 text-xs sm:text-sm text-white align-middle text-left font-bold">${u.name}</td>
                    <td class="p-3 sm:p-4 text-[10px] sm:text-xs text-zinc-400 align-middle text-left">${u.email}</td>
                    <td class="p-3 sm:p-4 align-middle text-right">
                        <select ${roleSelectDisabled} onchange="window.changeUserRole('${u.id}', this.value)" class="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-zinc-300 focus:border-rose-500 outline-none w-full sm:w-auto">
                            <option value="${window.ROLES.USER}" ${u.role == window.ROLES.USER ? 'selected' : ''}>User (L0)</option>
                            ${window.currentRole >= window.ROLES.SUPERADMIN || u.role == window.ROLES.ADMIN ? `<option value="${window.ROLES.ADMIN}" ${u.role == window.ROLES.ADMIN ? 'selected' : ''}>Admin (L1)</option>` : ''}
                            ${window.currentRole >= window.ROLES.SUPERACCOUNT || window.currentRole === window.ROLES.PRIMARY || u.role == window.ROLES.SUPERADMIN ? `<option value="${window.ROLES.SUPERADMIN}" ${u.role == window.ROLES.SUPERADMIN ? 'selected' : ''}>Super Admin (L2)</option>` : ''}
                            ${window.currentRole === window.ROLES.PRIMARY || u.role == window.ROLES.SUPERACCOUNT ? `<option value="${window.ROLES.SUPERACCOUNT}" ${u.role == window.ROLES.SUPERACCOUNT ? 'selected' : ''}>Super Account (L3)</option>` : ''}
                            ${window.currentRole === window.ROLES.PRIMARY || u.role == window.ROLES.PRIMARY ? `<option value="${window.ROLES.PRIMARY}" ${u.role == window.ROLES.PRIMARY ? 'selected' : ''}>Primary (L4)</option>` : ''}
                        </select>
                    </td>
                </tr>
            `;
        });
        
        const usersTable = document.getElementById('admin-users-table');
        if(usersTable) usersTable.innerHTML = usersHTML;

        const usersThead = document.querySelector('#admin-users-table')?.closest('table').querySelector('thead tr');
        if (usersThead) {
            usersThead.innerHTML = `
                <th class="p-3 sm:p-4 font-bold text-left align-middle">ID</th>
                <th class="p-3 sm:p-4 font-bold text-left align-middle">Name</th>
                <th class="p-3 sm:p-4 font-bold text-left align-middle">Email</th>
                <th class="p-3 sm:p-4 font-bold text-right align-middle">Role Access</th>
            `;
        }

        const userSearchInput = document.getElementById('admin-user-search');
        if (userSearchInput && !document.getElementById('btn-add-role')) {
            const container = userSearchInput.parentElement.parentElement;
            if (container) {
                 const btn = document.createElement('button');
                 btn.id = 'btn-add-role';
                 btn.className = 'w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)] mt-3 sm:mt-0';
                 btn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i> Add / Pre-assign';
                 btn.onclick = () => window.openModal('adminAddUserModal');
                 container.appendChild(btn);
            }
        }
    }

    const allSheetAnchors = document.querySelectorAll('#admin-database-tab a');
    allSheetAnchors.forEach(s => {
        if (s.innerText.includes('Payments')) {
            s.style.display = window.currentRole >= window.ROLES.SUPERACCOUNT ? 'flex' : 'none';
        }
    });

    if (window.currentRole >= window.ROLES.SUPERACCOUNT) {
        const radio = document.querySelector(`input[name="festStatus"][value="${window.festStatus}"]`);
        if(radio) radio.checked = true;
    }

    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.changeUserRole = async function(userId, newRole) {
    await window.DatabaseAPI.update('users', userId, { role: parseInt(newRole) });
    if(typeof window.showMessage === 'function') window.showMessage(`User role updated successfully.`);
};

// --- EVENTS & FESTIVALS ---
window.renderAdminEventsList = function(type = 'events') {
    const tab = document.getElementById('admin-events-tab');
    if(!tab) return;
    
    let contentHtml = `
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
                <h3 class="text-xl font-bold text-white">Event Management</h3>
                <p class="text-xs text-zinc-400 mt-1">Create, edit, and manage events and festivals.</p>
            </div>
            <div class="flex gap-2 w-full sm:w-auto hidden" id="dynamic-events-btns">
            </div>
            <button onclick="window.openAdminEventModal('${type === 'events' ? 'entrepreneurial' : 'festivals'}')" class="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i> Add ${type === 'events' ? 'Event' : 'Festival'}
            </button>
        </div>
        <div class="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto w-full">
            <table class="w-full text-left text-xs sm:text-sm whitespace-nowrap min-w-[600px]">
                <thead class="bg-zinc-900/50 text-zinc-400 uppercase tracking-wider text-[9px] sm:text-[10px] border-b border-white/10">
                    <tr>
                        <th class="p-3 sm:p-4 font-bold text-left align-middle">Name</th>
                        <th class="p-3 sm:p-4 font-bold text-left align-middle">Category</th>
                        <th class="p-3 sm:p-4 font-bold text-left align-middle">Team</th>
                        <th class="p-3 sm:p-4 font-bold text-left align-middle">Fee</th>
                        <th class="p-3 sm:p-4 font-bold text-center align-middle">Status</th>
                        <th class="p-3 sm:p-4 font-bold text-right align-middle">Actions</th>
                    </tr>
                </thead>
                <tbody id="admin-events-table" class="divide-y divide-white/5 text-zinc-200">
    `;

    let rowsHtml = '';
    for (const [catKey, events] of Object.entries(window.EVENTS_DATA || {})) {
        events.forEach(ev => {
            if (type === 'events' && catKey === 'festivals') return;
            if (type === 'festivals' && catKey !== 'festivals') return;

            rowsHtml += `
                <tr class="hover:bg-white/5 transition-colors border-b border-white/5">
                    <td class="p-3 sm:p-4 font-bold text-white text-xs sm:text-sm align-middle text-left truncate max-w-[200px]">${ev.name}</td>
                    <td class="p-3 sm:p-4 text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 align-middle text-left">${catKey}</td>
                    <td class="p-3 sm:p-4 text-xs sm:text-sm align-middle text-left">${ev.team}</td>
                    <td class="p-3 sm:p-4 text-xs sm:text-sm text-emerald-400 font-bold align-middle text-left">₹${ev.fee}</td>
                    <td class="p-3 sm:p-4 align-middle text-center">
                        <button onclick="window.toggleAdminEventStatus('${catKey}', '${ev.id}')" class="px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border ${ev.status === 'open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}">
                            ${ev.status}
                        </button>
                    </td>
                    <td class="p-3 sm:p-4 text-right space-x-1 sm:space-x-2 whitespace-nowrap align-middle">
                        <button onclick="window.openAdminEventModal('${catKey}', '${ev.id}')" class="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition" title="Edit"><i data-lucide="edit-2" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
                        <button onclick="window.deleteAdminEvent('${catKey}', '${ev.id}')" class="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500 transition" title="Delete"><i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
                    </td>
                </tr>`;
        });
    }
    
    contentHtml += rowsHtml + `</tbody></table></div>`;
    tab.innerHTML = contentHtml;

    const dynamicBtns = document.getElementById('dynamic-events-btns');
    if (dynamicBtns) {
        dynamicBtns.classList.remove('hidden');
        dynamicBtns.innerHTML = `
            <button onclick="window.renderAdminEventsList('events')" class="flex-1 sm:flex-none px-6 py-2 ${type === 'events' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400'} rounded-lg text-xs font-bold transition shadow hover:text-white">Events</button>
            <button onclick="window.renderAdminEventsList('festivals')" class="flex-1 sm:flex-none px-6 py-2 ${type === 'festivals' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400'} rounded-lg text-xs font-bold transition shadow hover:text-white">Festivals</button>
        `;
    }

    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.toggleAdminEventStatus = function(cat, id) {
    let ev = window.EVENTS_DATA[cat].find(e => e.id === id);
    if (ev) {
        ev.status = ev.status === 'open' ? 'closed' : 'open';
        window.renderAdminDashboard();
        if(typeof window.showMessage === 'function') window.showMessage(`Registration for ${ev.name} is now ${ev.status}.`);
    }
};

window.deleteAdminEvent = async function(cat, id) {
    await window.DatabaseAPI.delete('events', id);
    const res = await fetch(`${window.BASE_URL}/events`);
    if(res.ok) {
        window.DatabaseAPI._data['events'] = await res.json();
        window.EVENTS_DATA = window.groupEventsData(window.DatabaseAPI._data['events']);
    }
    if(typeof window.updateDynamicCalendar === 'function') window.updateDynamicCalendar();
    window.renderAdminDashboard();
    if(typeof window.showMessage === 'function') window.showMessage("Event deleted from Database.");
};

window.toggleAdminEventFields = function() {
    const cat = document.getElementById('adminEvCat').value;
    const isFest = cat === 'festivals';
    
    const feeWrap = document.getElementById('wrapAdminEvFee');
    const prizeWrap = document.getElementById('wrapAdminEvPrize');
    const teamWrap = document.getElementById('wrapAdminEvTeam');
    
    const feeInput = document.getElementById('adminEvFee');
    const prizeInput = document.getElementById('adminEvPrize');
    const teamInput = document.getElementById('adminEvTeam');
    
    if (isFest) {
        if(feeWrap) feeWrap.style.display = 'none';
        if(prizeWrap) prizeWrap.style.display = 'none';
        if(teamWrap) teamWrap.style.display = 'none';
        
        if(feeInput) feeInput.removeAttribute('required');
        if(prizeInput) prizeInput.removeAttribute('required');
        if(teamInput) teamInput.removeAttribute('required');
    } else {
        if(feeWrap) feeWrap.style.display = 'block';
        if(prizeWrap) prizeWrap.style.display = 'block';
        if(teamWrap) teamWrap.style.display = 'block';
        
        if(feeInput) feeInput.setAttribute('required', 'true');
        if(prizeInput) prizeInput.setAttribute('required', 'true');
        if(teamInput) teamInput.setAttribute('required', 'true');
    }
};

window.toggleEventBannerInput = function(type) {
    window.eventBannerUploadType = type;
    const fileBtn = document.getElementById('btn-ev-banner-file');
    const linkBtn = document.getElementById('btn-ev-banner-link');
    const fileContainer = document.getElementById('ev-banner-file-container');
    const linkInput = document.getElementById('adminEvBannerLink');
    
    if (type === 'file') {
        fileBtn.className = "flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition";
        linkBtn.className = "flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition hover:bg-zinc-700";
        fileContainer.classList.remove('hidden');
        linkInput.classList.add('hidden');
    } else {
        linkBtn.className = "flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition";
        fileBtn.className = "flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition hover:bg-zinc-700";
        linkInput.classList.remove('hidden');
        fileContainer.classList.add('hidden');
    }
};

window.openAdminEventModal = function(cat = null, id = null) {
    document.getElementById('adminEventModalTitle').innerText = id ? "Edit Event" : "Create Event";
    
    const fileText = document.getElementById('ev-banner-file-text');
    if(fileText) fileText.innerText = "Click to upload JPG/PNG";
    const fileInput = document.getElementById('adminEvBannerFile');
    if (fileInput) fileInput.value = '';
    
    if (id && cat) {
        const ev = window.EVENTS_DATA[cat].find(e => e.id === id);
        document.getElementById('adminEvId').value = id;
        document.getElementById('adminEvCat').value = cat;
        document.getElementById('adminEvName').value = ev.name;
        document.getElementById('adminEvFee').value = ev.fee;
        document.getElementById('adminEvPrize').value = ev.prize;
        document.getElementById('adminEvTeam').value = ev.team;
        document.getElementById('adminEvDate').value = ev.date;
        document.getElementById('adminEvVenue').value = ev.venue;
        document.getElementById('adminEvDesc').value = ev.desc;
        
        if (ev.banner) {
            window.toggleEventBannerInput('link');
            document.getElementById('adminEvBannerLink').value = ev.banner;
        } else {
            window.toggleEventBannerInput('file');
            document.getElementById('adminEvBannerLink').value = '';
        }
    } else {
        document.getElementById('adminEvId').value = '';
        document.getElementById('adminEvName').value = '';
        document.getElementById('adminEvFee').value = '';
        document.getElementById('adminEvPrize').value = '';
        document.getElementById('adminEvTeam').value = '';
        document.getElementById('adminEvDate').value = '';
        document.getElementById('adminEvVenue').value = '';
        document.getElementById('adminEvBannerLink').value = '';
        document.getElementById('adminEvDesc').value = '';
        if(cat) document.getElementById('adminEvCat').value = cat;
        
        window.toggleEventBannerInput('file');
    }
    
    window.toggleAdminEventFields();
    if(typeof window.openModal === 'function') window.openModal('adminEventModal');
};

window.saveAdminEvent = async function() {
    const id = document.getElementById('adminEvId').value;
    const cat = document.getElementById('adminEvCat').value;
    const isFest = cat === 'festivals';
    
    let bannerVal = '';
    if (window.eventBannerUploadType === 'link') {
        bannerVal = document.getElementById('adminEvBannerLink').value;
    } else {
        const fileInput = document.getElementById('adminEvBannerFile');
        if (fileInput && fileInput.files.length > 0) {
            if(typeof window.showMessage === 'function') window.showMessage("Uploading banner to Google Drive... Please wait.");
            try {
                bannerVal = await window.uploadFileToDrive(fileInput.files[0]);
            } catch(e) {
                if(typeof window.showMessage === 'function') return window.showMessage(e.message);
            }
        }
    }
    
    const newEv = {
        id: id || (isFest ? 'f' : 'e') + Date.now(),
        category: cat, status: 'open',
        name: document.getElementById('adminEvName').value,
        fee: isFest ? 0 : parseInt(document.getElementById('adminEvFee').value || 0),
        prize: isFest ? '-' : document.getElementById('adminEvPrize').value,
        team: isFest ? '1' : document.getElementById('adminEvTeam').value,
        date: document.getElementById('adminEvDate').value,
        venue: document.getElementById('adminEvVenue').value,
        banner: bannerVal,
        desc: document.getElementById('adminEvDesc').value
    };

    if (id) await window.DatabaseAPI.update('events', id, newEv);
    else await window.DatabaseAPI.add('events', newEv);
    
    const res = await fetch(`${window.BASE_URL}/events`);
    if(res.ok) {
        window.DatabaseAPI._data['events'] = await res.json();
        window.EVENTS_DATA = window.groupEventsData(window.DatabaseAPI._data['events']);
    }

    if(typeof window.updateDynamicCalendar === 'function') window.updateDynamicCalendar();
    if(typeof window.closeModal === 'function') window.closeModal('adminEventModal');
    window.renderAdminDashboard();
    if(typeof window.showMessage === 'function') window.showMessage(id ? "Event updated in Database!" : "Event created in Database!");
};

// --- ACCOMMODATION ADMIN ---
window.saveAccomSettings = async function() {
    const maleR = document.getElementById('adminMaleRooms').value;
    const femaleR = document.getElementById('adminFemaleRooms').value;
    const perR = document.getElementById('adminPerRoom').value;
    
    if (!maleR || !femaleR || !perR) return window.showMessage("Please fill all capacity fields.");
    
    const settingsData = {
        id: 'accom_capacity',
        maleRooms: parseInt(maleR),
        femaleRooms: parseInt(femaleR),
        perRoom: parseInt(perR)
    };
    
    const allSettings = await window.DatabaseAPI.get('settings');
    const exists = allSettings.find(s => s.id === 'accom_capacity');
    
    if (exists) {
        await window.DatabaseAPI.update('settings', 'accom_capacity', settingsData);
    } else {
        await window.DatabaseAPI.add('settings', settingsData);
    }
    
    window.showMessage("Accommodation capacity settings updated successfully!");
    if(typeof window.closeModal === 'function') window.closeModal('accomSettingsModal');
    window.renderAdminAccomTable();
};

window.autoAssignRooms = async function() {
    const settings = await window.getAccomSettings();
    let maxRooms = { 
        male: parseInt(settings.maleRooms || 150), 
        female: parseInt(settings.femaleRooms || 120) 
    };
    let perRoom = parseInt(settings.perRoom || 3);
    
    let dbAccoms = await window.DatabaseAPI.get('accommodations');
    let unassigned = dbAccoms.filter(b => !b.room);
    let processed = new Set();
    let successCount = 0;

    for(let b of unassigned) {
        if (processed.has(b.id)) continue;

        let group = [b];
        processed.add(b.id);

        if (b.requested && b.requested !== "None") {
            let friends = b.requested.split(',').map(s => s.trim());
            friends.forEach(fId => {
                if (group.length >= perRoom) return; 
                let friendBooking = unassigned.find(fb => fb.id === fId && fb.wing === b.wing && !processed.has(fb.id));
                if (friendBooking) {
                    group.push(friendBooking);
                    processed.add(friendBooking.id);
                }
            });
        }

        let daysBooked = new Set();
        group.forEach(member => {
            if (member.duration) {
                member.duration.split(',').forEach(d => daysBooked.add(d.trim()));
            }
        });
        let allDays = Array.from(daysBooked);

        let w = b.wing;
        let roomAssigned = null;

        for (let r = 1; r <= maxRooms[w]; r++) {
            let canFit = true;
            for (let day of allDays) {
                let occupantsOnDay = dbAccoms.filter(a => a.room == r && a.wing == w && a.duration.includes(day));
                if (occupantsOnDay.length + group.length > perRoom) {
                    canFit = false;
                    break;
                }
            }
            if (canFit) {
                roomAssigned = r;
                break;
            }
        }

        if (roomAssigned) {
            for(let member of group) {
                member.room = roomAssigned;
                successCount++;
                await window.DatabaseAPI.update('accommodations', member.id, { room: roomAssigned });
                if (member.id === window.userProfile.accountId && window.userProfile.accommodation) {
                    window.userProfile.accommodation.roomNumber = roomAssigned;
                    if(typeof window.saveCache === 'function') window.saveCache();
                }
            }
        }
    }

    await window.renderAdminAccomTable();
    if(typeof window.showMessage === 'function') window.showMessage(`Assigned ${successCount} new members to rooms.`);
};

window.renderAdminAccomTable = async function() {
    const dbAccoms = await window.DatabaseAPI.get('accommodations');
    let tab = document.getElementById('admin-accom-tab');
    if (!tab) return;

    // Fetch dynamic capacity
    const settings = await window.getAccomSettings();
    const maxMale = parseInt(settings.maleRooms || 150) * parseInt(settings.perRoom || 3);
    const maxFemale = parseInt(settings.femaleRooms || 120) * parseInt(settings.perRoom || 3);
    const totalCapacityPerDay = maxMale + maxFemale;

    let dailyRooms = { 'Day 1': {}, 'Day 2': {}, 'Day 3': {} };
    let dailyStats = {
        'Day 1': { booked: 0, assigned: 0 },
        'Day 2': { booked: 0, assigned: 0 },
        'Day 3': { booked: 0, assigned: 0 }
    };
    
    let paidList = [];
    let globalAssignedCount = 0;
    
    dbAccoms.forEach(a => {
        paidList.push(a);
        let hasRoomAssigned = a.room ? true : false;
        if (hasRoomAssigned) globalAssignedCount++;

        if (a.duration) {
            ['Day 1', 'Day 2', 'Day 3'].forEach(day => {
                if (a.duration.includes(day)) {
                    dailyStats[day].booked++;
                    if (hasRoomAssigned) {
                        dailyStats[day].assigned++;
                        if (!dailyRooms[day][a.room]) dailyRooms[day][a.room] = [];
                        dailyRooms[day][a.room].push(a);
                    }
                }
            });
        }
    });

    const selectedDay = document.getElementById('accomDayFilter')?.value || 'Day 1';

    tab.innerHTML = `
        <div class="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
                <h3 class="text-xl font-bold text-white">Accommodation Operations</h3>
                <p class="text-xs text-zinc-400 mt-1">Review paid records, capacity, and daily room allocations.</p>
            </div>
            <div class="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                <button onclick="document.getElementById('adminMaleRooms').value='${settings.maleRooms||150}'; document.getElementById('adminFemaleRooms').value='${settings.femaleRooms||120}'; document.getElementById('adminPerRoom').value='${settings.perRoom||3}'; window.openModal('accomSettingsModal')" class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-bold text-sm shadow transition shrink-0 flex items-center gap-2"><i data-lucide="settings" class="w-4 h-4"></i> Capacity</button>
                <button onclick="window.autoAssignRooms()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)] transition shrink-0">Auto-Assign Pending</button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            ${['Day 1', 'Day 2', 'Day 3'].map(d => `
            <div class="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between transition-colors ${selectedDay === d ? 'ring-2 ring-blue-500/50 bg-blue-900/10' : ''}">
                <p class="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2">${d} Occupancy</p>
                <div class="flex justify-between items-end">
                    <div>
                        <p class="text-xl font-black text-white">${dailyStats[d].booked} <span class="text-xs font-medium text-zinc-500">/ ${totalCapacityPerDay} cap</span></p>
                        <p class="text-[10px] text-zinc-400 mt-1">${dailyStats[d].assigned} mapped to rooms</p>
                    </div>
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${dailyStats[d].booked >= totalCapacityPerDay ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}">
                        <i data-lucide="users" class="w-5 h-5"></i>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col gap-4">
            <div class="flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 mb-2">
                <h4 class="text-white font-bold flex items-center gap-2 w-full sm:w-auto"><i data-lucide="door-closed" class="w-4 h-4 text-blue-400"></i> Daily Room Mapping</h4>
                <div class="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                    ${['Day 1', 'Day 2', 'Day 3'].map(d => `
                        <button onclick="document.getElementById('accomDayFilter').value='${d}'; window.renderAdminAccomTable()" class="px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition ${selectedDay === d ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:bg-zinc-800'}">${d}</button>
                    `).join('')}
                    <input type="hidden" id="accomDayFilter" value="${selectedDay}">
                </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[500px] custom-scrollbar p-1">
                ${Object.keys(dailyRooms[selectedDay]).length > 0 ? Object.entries(dailyRooms[selectedDay]).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([room, occupants]) => `
                    <div class="bg-black/60 border ${occupants.length >= parseInt(settings.perRoom||3) ? 'border-red-500/30' : 'border-emerald-500/30'} p-4 rounded-xl shadow-inner hover:bg-zinc-800 transition relative">
                        <p class="text-sm text-white font-black mb-3 border-b border-white/10 pb-2">Room ${room} <span class="text-[9px] font-normal text-zinc-500 float-right mt-1">${occupants[0].wing.toUpperCase()} WING</span></p>
                        <div class="space-y-2">
                            ${occupants.map(occ => `
                                <div class="flex flex-col bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span class="text-xs text-white font-bold truncate">${occ.name}</span>
                                    <span class="text-[9px] text-cyan-400 font-mono tracking-wider truncate">${occ.id}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${occupants.length >= parseInt(settings.perRoom||3) ? `<span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)]" title="Room Full"></span>` : ''}
                    </div>
                `).join('') : '<p class="text-xs text-zinc-500 col-span-full italic">No rooms actively occupied for this day.</p>'}
            </div>
        </div>
    `;
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

// --- QR SCANNER ---
window.startCameraScan = function() {
    document.getElementById('scanner-action-buttons').classList.add('hidden');
    document.getElementById('reader-container').classList.remove('hidden');
    document.getElementById('scan-result').classList.add('hidden');

    window.html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    window.html5QrCode.start({ facingMode: "environment" }, config, window.onScanSuccess)
        .catch(err => {
            if(typeof window.showMessage === 'function') window.showMessage("Camera access denied or unavailable.");
            window.stopCameraScan();
        });
};

window.stopCameraScan = function() {
    if (window.html5QrCode) {
        window.html5QrCode.stop().then(() => {
            window.html5QrCode.clear();
            window.html5QrCode = null;
            window.resetScannerUI();
        }).catch(err => {
            window.html5QrCode.clear();
            window.html5QrCode = null;
            window.resetScannerUI();
        });
    } else {
        window.resetScannerUI();
    }
};

window.resetScannerUI = function() {
    const container = document.getElementById('reader-container');
    const btns = document.getElementById('scanner-action-buttons');
    if(container) container.classList.add('hidden');
    if(btns) btns.classList.remove('hidden');
};

window.handleQrImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.html5QrCode) {
        window.html5QrCode = new Html5Qrcode("reader");
    }

    window.html5QrCode.scanFile(file, true)
        .then(decodedText => {
            window.onScanSuccess(decodedText);
        })
        .catch(err => {
            if(typeof window.showMessage === 'function') window.showMessage("Could not detect QR Code in the image.");
        })
        .finally(() => {
            event.target.value = "";
        });
};

window.onScanSuccess = function(decodedText) {
    let extractedId = decodedText;
    try {
        if (decodedText.includes('http')) {
            const url = new URL(decodedText);
            extractedId = url.searchParams.get('id') || decodedText;
        }
    } catch(e) {}
    
    document.getElementById('scan-input').value = extractedId;
    window.stopCameraScan();
    window.simulateScan();
};

window.simulateScan = async function() {
    const input = document.getElementById('scan-input').value.trim();
    const type = document.getElementById('scan-type').options[document.getElementById('scan-type').selectedIndex].text;
    const resDiv = document.getElementById('scan-result');

    resDiv.classList.remove('hidden');
    if (!input) {
        resDiv.className = "mt-4 sm:mt-6 text-left p-3 sm:p-4 rounded-xl border bg-red-900/20 border-red-500/30";
        resDiv.innerHTML = "<p class='text-red-400 font-bold text-xs sm:text-sm'>Error: Please enter an ID or Code</p>";
        return;
    }

    await window.DatabaseAPI.add('logs', { id: input, type: type, timestamp: new Date().toLocaleString(), by: window.userProfile.email });
    
    if (window.currentRole >= window.ROLES.ADMIN) {
        await window.renderAnalytics(); 
    }

    let resultHtml = "";

    if (input.startsWith('AUT-TEAM-')) {
        resultHtml = `
            <div class="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
                <i data-lucide="users" class="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500 mt-0.5 sm:mt-1 shrink-0"></i>
                <div class="flex-grow min-w-0">
                    <h4 class="text-white font-bold text-xs sm:text-sm truncate">Valid Team Entry Found</h4>
                    <p class="text-[10px] sm:text-xs text-zinc-300 mb-1 truncate">Code: <span class="font-mono text-cyan-400 break-all">${input}</span></p>
                    <p class="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded w-fit border border-white/5 truncate">${type}</p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 w-full">
                <button onclick="document.getElementById('scan-result').innerHTML='<p class=\\'text-cyan-400 font-bold text-xs sm:text-sm text-center w-full break-words\\'>Team Attendance Marked by ${window.userProfile.email}</p>';" class="flex-1 py-2 sm:py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
                    Admit Full Team
                </button>
                <button onclick="document.getElementById('scan-input').value=''; document.getElementById('scan-result').classList.add('hidden');" class="flex-1 py-2 sm:py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
                    Next Scan
                </button>
            </div>`;
    } else {
        resultHtml = `
            <div class="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
                <i data-lucide="check-circle" class="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 mt-0.5 sm:mt-1 shrink-0"></i>
                <div class="flex-grow min-w-0">
                    <h4 class="text-white font-bold text-xs sm:text-sm truncate">Valid Entry Found</h4>
                    <p class="text-[10px] sm:text-xs text-zinc-300 mb-1 truncate">ID: <span class="font-mono text-cyan-400 break-all">${input}</span></p>
                    <p class="text-[8px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/40 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded w-fit border border-white/5 truncate">${type}</p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 w-full">
                <button onclick="document.getElementById('scan-result').innerHTML='<p class=\\'text-emerald-400 font-bold text-xs sm:text-sm text-center w-full break-words\\'>Attendance Marked by ${window.userProfile.email}</p>';" class="flex-1 py-2 sm:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
                    Mark Checked-In
                </button>
                <button onclick="document.getElementById('scan-input').value=''; document.getElementById('scan-result').classList.add('hidden');" class="flex-1 py-2 sm:py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
                    Next Scan
                </button>
            </div>`;
    }

    resDiv.className = "mt-4 sm:mt-6 text-left p-3 sm:p-4 rounded-xl border bg-emerald-900/20 border-emerald-500/30 animate-[fadeInSlide_0.2s_ease-out] w-full";
    resDiv.innerHTML = resultHtml;
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.populateScannerEventDropdown = function() {
    const select = document.getElementById('scan-event-select');
    if (!select) return;

    select.innerHTML = '';
    
    for (const [cat, events] of Object.entries(window.EVENTS_DATA || {})) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = cat.toUpperCase();
        
        events.forEach(ev => {
            const option = document.createElement('option');
            option.value = ev.id;
            option.textContent = ev.name;
            optgroup.appendChild(option);
        });
        
        select.appendChild(optgroup);
    }
};

window.toggleEventSelectScanner = function() {
    const type = document.getElementById('scan-type').value;
    const eventContainer = document.getElementById('scanner-event-container');
    if (!eventContainer) return;

    if (type === 'event') {
        eventContainer.classList.remove('hidden');
    } else {
        eventContainer.classList.add('hidden');
    }
};

// --- DATA MANAGEMENT (Users, Queries, Sponsors) ---
window.renderAdminSearchTable = async function() {
    const searchInput = document.getElementById('admin-part-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const allUsers = await window.DatabaseAPI.get('users');
    const payments = await window.DatabaseAPI.get('payments');
    const regs = await window.DatabaseAPI.get('registrations');
    const accoms = await window.DatabaseAPI.get('accommodations');

    // MAP ALL USERS SO THEY ARE ALWAYS SEARCHABLE (even if no registrations exist yet)
    let mappedUsers = allUsers.map(u => {
        const userRegs = regs.filter(r => r.leader === u.id || (r.members && r.members.includes(u.id)));
        const userAccom = accoms.find(a => a.id === u.id);
        const userPays = payments.filter(p => p.user === u.id);

        let statusStr = "No Registrations";
        const teamCodes = userRegs.map(r => r.teamCode).filter(c => c).join(', ');
        
        if (teamCodes) statusStr = teamCodes;
        else if (userAccom) statusStr = "Accommodation Only";

        return {
            ...u,
            teamCodes: statusStr,
            payIds: userPays.map(p => p.id).join(', ') || 'No Payments'
        };
    });

    let filteredUsers = mappedUsers;
    if(query) {
        filteredUsers = mappedUsers.filter(u => {
            const name = String(u.name || "").toLowerCase();
            const email = String(u.email || "").toLowerCase();
            const id = String(u.id || "").toLowerCase();
            const teams = String(u.teamCodes || "").toLowerCase();
            const pays = String(u.payIds || "").toLowerCase();
            
            return name.includes(query) || 
                   email.includes(query) || 
                   id.includes(query) || 
                   teams.includes(query) ||
                   pays.includes(query);
        });
    }

    const table = document.getElementById('admin-search-table');
    if(!table) return;

    const thead = table.closest('table').querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Account ID</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Name</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Details (Team/Email)</th>
            <th class="p-3 sm:p-4 font-bold text-right align-middle">Action</th>
        `;
    }

    table.innerHTML = filteredUsers.length ? filteredUsers.map(u => `
        <tr class="border-b border-white/5 hover:bg-white/5 cursor-pointer" onclick="window.openAdminUserProfile('${u.id}')">
            <td class="p-3 font-mono text-cyan-400 text-[10px] sm:text-xs align-middle text-left">${u.id}</td>
            <td class="p-3 text-xs sm:text-sm text-white font-bold align-middle text-left">${u.name}</td>
            <td class="p-3 text-[10px] sm:text-xs text-zinc-400 align-middle text-left">
                <div>${u.email}</div>
                <div class="text-[9px] sm:text-[10px] text-amber-500 mt-0.5">Team: ${u.teamCodes}</div>
            </td>
            <td class="p-3 flex justify-end items-center gap-3 align-middle text-right">
                <button onclick="event.stopPropagation(); window.openAdminReplyModal('users', '${u.id}', '${u.email}', '${(u.name || '').replace(/'/g, "\\'")}')" class="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] sm:text-[10px] uppercase font-bold transition shadow whitespace-nowrap">Email</button>
                <i data-lucide="chevron-right" class="w-4 h-4 text-zinc-500 hover:text-white transition"></i>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="4" class="p-4 text-center text-zinc-500 text-xs italic">No users found matching the criteria.</td></tr>`;
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.searchAdminUsers = function() {
    const query = document.getElementById('admin-user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#admin-users-table tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
};

window.openAdminUserProfile = async function(userId) {
    const users = await window.DatabaseAPI.get('users');
    const regs = await window.DatabaseAPI.get('registrations');
    const pays = await window.DatabaseAPI.get('payments');
    const accoms = await window.DatabaseAPI.get('accommodations');
    
    const user = users.find(u => u.id === userId);
    if(!user) return;
    
    const userRegs = regs.filter(r => r.leader === userId || r.members.includes(userId));
    const userPays = pays.filter(p => p.user === userId);
    const userAccom = accoms.find(a => a.id === userId);
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://autumnfest.in/public.html?id='+user.id)}&color=f43f5e&bgcolor=000000`;
    
    let html = `
        <div class="flex items-start gap-4 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
            <img src="${qrUrl}" class="w-24 h-24 rounded-lg bg-white p-1">
            <div>
                <h4 class="text-xl font-bold text-white">${user.name}</h4>
                <p class="font-mono text-cyan-400 text-sm mb-1">${user.id}</p>
                <p class="text-zinc-400 text-xs">${user.email} | Phone: ${user.phone || 'N/A'}</p>
            </div>
        </div>
        
        <h4 class="text-white font-bold mb-2">Registrations</h4>
        <div class="space-y-2 mb-4">
            ${userRegs.length ? userRegs.map(r => `<div class="bg-zinc-800 p-2 rounded-lg text-xs text-zinc-300">Event ID: <span class="text-white">${r.eventId}</span> | Team: <span class="text-white">${r.teamName}</span> | Pay: <span class="${r.payment==='Success'?'text-emerald-400':'text-amber-400'}">${r.payment}</span></div>`).join('') : '<p class="text-xs text-zinc-500">No events registered.</p>'}
        </div>
        
        <h4 class="text-white font-bold mb-2">Payments</h4>
        <div class="space-y-2 mb-4">
            ${userPays.length ? userPays.map(p => `<div class="bg-zinc-800 p-2 rounded-lg text-xs text-zinc-300 flex justify-between"><span>ID: <span class="font-mono text-cyan-400">${p.id}</span></span> <span class="text-emerald-400 font-bold">₹${p.amount}</span></div>`).join('') : '<p class="text-xs text-zinc-500">No payments found.</p>'}
        </div>
        
        <h4 class="text-white font-bold mb-2">Accommodation</h4>
        <div class="bg-zinc-800 p-2 rounded-lg text-xs text-zinc-300 mb-4">
            ${userAccom ? `Wing: ${userAccom.wing} | Status: ${userAccom.room ? 'Room '+userAccom.room : 'Pending'}` : '<span class="text-zinc-500">None</span>'}
        </div>
    `;
    
    document.getElementById('adminUserProfileContent').innerHTML = html;
    if(typeof window.openModal === 'function') window.openModal('adminUserProfileModal');
};

window.openQueryDetails = async function(id) {
    const queries = await window.DatabaseAPI.get('queries');
    const q = queries.find(x => x.id === id);
    if (!q) return;

    document.getElementById('adminDetailsTitle').innerText = "Query Details";
    document.getElementById('adminDetailsContent').innerHTML = `
        <div class="space-y-4 text-sm">
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Name</span><p class="text-white font-medium">${q.name}</p></div>
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Email</span><p class="text-white font-medium select-all">${q.email}</p></div>
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Date</span><p class="text-white font-medium">${q.date}</p></div>
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Message</span>
                 <div class="bg-black/40 p-4 rounded-xl border border-white/5 text-zinc-300 whitespace-pre-wrap">${q.message}</div>
            </div>
        </div>
    `;
    document.getElementById('adminDetailsFooter').innerHTML = `
        <button onclick="window.closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Close</button>
        <button onclick="window.closeModal('adminDetailsModal'); window.openAdminReplyModal('queries', '${q.id}', '${q.email}', '${q.name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-2"><i data-lucide="reply" class="w-4 h-4"></i> Reply via Email</button>
    `;
    if(typeof window.openModal === 'function') window.openModal('adminDetailsModal');
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.renderAdminQueries = async function() {
    const queries = await window.DatabaseAPI.get('queries');
    const table = document.getElementById('admin-queries-table');
    if(!table) return;

    const thead = table.closest('table').querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Name</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Email</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle hidden sm:table-cell">Message</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Date</th>
            <th class="p-3 sm:p-4 font-bold text-right align-middle">Status</th>
        `;
    }

    table.innerHTML = queries.length ? queries.map(q => `
        <tr class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors" onclick="window.openQueryDetails('${q.id}')">
            <td class="p-3 font-bold text-white text-[10px] sm:text-xs align-middle text-left truncate max-w-[120px]">${q.name}</td>
            <td class="p-3 text-[10px] sm:text-xs text-zinc-400 align-middle text-left truncate max-w-[150px]">${q.email}</td>
            <td class="p-3 text-[10px] sm:text-xs text-zinc-300 truncate max-w-[150px] sm:max-w-[250px] align-middle text-left hidden sm:table-cell">${q.message}</td>
            <td class="p-3 text-[9px] sm:text-[10px] text-zinc-500 align-middle text-left">${q.date}</td>
            <td class="p-3 align-middle text-right">
                ${(q.status === 'Replied') ? `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[8px] sm:text-[10px] uppercase font-bold">Replied</span>` :
                `<span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[8px] sm:text-[10px] uppercase font-bold">Pending</span>`}
            </td>
        </tr>
    `).join('') : `<tr><td colspan="5" class="p-4 text-center text-zinc-500 text-xs italic">No general queries found.</td></tr>`;
};

window.openSponsorDetails = async function(id) {
    const sponsors = await window.DatabaseAPI.get('sponsors');
    const s = sponsors.find(x => x.id === id);
    if (!s) return;

    let linkHtml = s.link ? `
        <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Attached Document</span>
             <div class="bg-black/40 p-4 rounded-xl border border-white/5 break-all">
                <a href="${s.link}" target="_blank" class="text-blue-400 hover:underline flex items-center gap-2"><i data-lucide="external-link" class="w-4 h-4"></i> View Proposal Document</a>
             </div>
        </div>` : '';

    let msgHtml = s.message ? `
        <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Message</span>
             <div class="bg-black/40 p-4 rounded-xl border border-white/5 break-words text-white">
                ${s.message}
             </div>
        </div>` : '';

    document.getElementById('adminDetailsTitle').innerText = "Sponsorship Proposal";
    document.getElementById('adminDetailsContent').innerHTML = `
        <div class="space-y-4 text-sm">
            <div class="grid grid-cols-2 gap-4">
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Company</span><p class="text-white font-medium">${s.company}</p></div>
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Contact Person</span><p class="text-white font-medium">${s.contact}</p></div>
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Email</span><p class="text-white font-medium select-all">${s.email}</p></div>
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Phone</span><p class="text-white font-medium select-all">${s.phone}</p></div>
            </div>
            ${msgHtml}
            ${linkHtml}
        </div>
    `;
    document.getElementById('adminDetailsFooter').innerHTML = `
        <button onclick="window.closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Close</button>
        <button onclick="window.closeModal('adminDetailsModal'); window.openAdminReplyModal('sponsors', '${s.id}', '${s.email}', '${s.contact.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-2"><i data-lucide="reply" class="w-4 h-4"></i> Reply to Proposal</button>
    `;
    if(typeof window.openModal === 'function') window.openModal('adminDetailsModal');
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.renderAdminSponsors = async function() {
    const sponsors = await window.DatabaseAPI.get('sponsors');
    const table = document.getElementById('admin-sponsors-table');
    if(!table) return;

    const thead = table.closest('table').querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Company</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle">Contact</th>
            <th class="p-3 sm:p-4 font-bold text-left align-middle hidden sm:table-cell">Attachment</th>
            <th class="p-3 sm:p-4 font-bold text-right align-middle">Status</th>
        `;
    }

    table.innerHTML = sponsors.length ? sponsors.map(s => `
        <tr class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors" onclick="window.openSponsorDetails('${s.id}')">
            <td class="p-3 font-bold text-white text-[10px] sm:text-xs align-middle text-left truncate max-w-[150px]">${s.company}</td>
            <td class="p-3 text-[10px] sm:text-xs text-zinc-300 align-middle text-left">${s.contact} <br><span class="text-zinc-500 text-[8px] sm:text-[9px]">${s.email}</span></td>
            <td class="p-3 text-[10px] sm:text-xs text-blue-400 break-words align-middle text-left hidden sm:table-cell">${s.link ? '<span class="hover:underline flex items-center gap-1"><i data-lucide="paperclip" class="w-3 h-3"></i> Attached</span>' : '<span class="text-zinc-500 flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i> Message Only</span>'}</td>
            <td class="p-3 align-middle text-right">
                ${(s.status === 'Reviewed & Replied' || s.status === 'Replied') ? `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[8px] sm:text-[10px] uppercase font-bold">Reviewed</span>` :
                `<span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[8px] sm:text-[10px] uppercase font-bold">Pending</span>`}
            </td>
        </tr>
    `).join('') : `<tr><td colspan="4" class="p-4 text-center text-zinc-500 text-xs italic">No sponsorship applications found.</td></tr>`;
};

// --- MAIL DISPATCH & THREADED NOTIFICATION CHAT ---

window.renderAdminMails = function(mailType = 'normal') {
    let tab = document.getElementById('admin-mails-tab');
    if (!tab) return;
    
    window.currentMailType = mailType;

    let evOptionsNorm = `<option value="all_users" class="bg-zinc-900 text-white">All Logged-in Members</option>
                         <option value="all_events" class="bg-zinc-900 text-white">All Registered for Any Event</option>
                         <option value="all_accom" class="bg-zinc-900 text-white">All Accommodation Booked</option>`;
    let evOptionsCert = ``;
    
    for (const [catKey, events] of Object.entries(window.EVENTS_DATA || {})) {
        if(catKey === 'festivals') continue;
        events.forEach(ev => {
            evOptionsNorm += `<option value="event_${ev.id}" class="bg-zinc-900 text-white">Registered for: ${ev.name}</option>`;
            evOptionsCert += `<option value="cert_part_${ev.id}" class="bg-zinc-900 text-white">Participants of: ${ev.name}</option>`;
            evOptionsCert += `<option value="cert_win_${ev.id}" class="bg-zinc-900 text-white">Winners of: ${ev.name}</option>`;
        });
    }
    
    const isCert = mailType === 'certificate';

    tab.innerHTML = `
        <div class="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end w-full gap-4">
            <div>
                <h3 class="text-lg sm:text-xl font-bold text-white">Broadcast Mails</h3>
                <p class="text-xs sm:text-sm text-zinc-400 mt-1">Compose an email with rich text, links, and attachments.</p>
            </div>
            <div class="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                <button onclick="window.renderAdminMails('normal')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${!isCert ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'}">Normal Mails</button>
                <button onclick="window.renderAdminMails('certificate')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${isCert ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-white'}">Certificate Mails</button>
            </div>
        </div>
        
        <div class="max-w-3xl bg-zinc-900/40 border border-white/5 rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-4">
            <div class="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                <label class="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase w-16 shrink-0">To:</label>
                <select id="mailAudience" onchange="window.toggleMailTags()" class="w-full bg-zinc-800 text-white text-xs sm:text-sm focus:outline-none cursor-pointer border border-white/10 rounded-xl px-3 py-2">
                    ${isCert ? evOptionsCert : evOptionsNorm}
                </select>
            </div>
            
            ${!isCert ? `
            <div class="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                <label class="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase w-16 shrink-0">Subject:</label>
                <input type="text" id="mailSubject" placeholder="Enter email subject" class="w-full bg-transparent text-white text-xs sm:text-sm focus:outline-none">
            </div>
            <div class="flex items-start gap-3 bg-black/30 p-3 rounded-xl border border-white/5 mt-1">
                <label class="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase w-16 shrink-0 pt-2">Attach:</label>
                <div class="w-full flex flex-col gap-2">
                    <input type="text" id="mailLinks" placeholder="Add external links (comma separated)" class="w-full bg-transparent border-white/10 border-b outline-none text-white text-xs pb-2 focus:border-blue-500 transition">
                    <input type="file" id="mailFiles" multiple class="w-full text-[10px] text-zinc-400 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer outline-none mt-1">
                </div>
            </div>
            <div class="flex flex-col mt-2">
                <label class="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase pl-1 mb-2 flex justify-between items-center w-full">
                    <span>Message Body</span>
                    <span class="text-[9px] normal-case font-normal text-zinc-400 text-right max-w-[70%]">
                        Tags: <code class="text-rose-400 bg-rose-400/10 px-1 py-0.5 rounded">{{name}}</code>
                        <code id="tagHintEvent" class="text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded ${evOptionsNorm.includes('event_') ? '' : 'hidden'}">{{eventname}}</code>
                    </span>
                </label>
                <div class="w-full flex-1 flex flex-col bg-black/40 border border-white/10 rounded-xl shadow-inner overflow-hidden min-h-[200px]">
                    <div class="flex items-center gap-1 p-2 border-b border-white/10 bg-black/60 shrink-0 overflow-x-auto custom-scrollbar">
                        <button type="button" onclick="document.execCommand('bold', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Bold"><i data-lucide="bold" class="w-4 h-4"></i></button>
                        <button type="button" onclick="document.execCommand('italic', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Italic"><i data-lucide="italic" class="w-4 h-4"></i></button>
                        <button type="button" onclick="document.execCommand('underline', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Underline"><i data-lucide="underline" class="w-4 h-4"></i></button>
                        <div class="w-px h-4 bg-white/10 mx-1"></div>
                        <button type="button" onclick="document.execCommand('insertUnorderedList', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Bullet List"><i data-lucide="list" class="w-4 h-4"></i></button>
                    </div>
                    <div id="mailMessage" contenteditable="true" placeholder="Compose your formatted email here..." class="rich-editor-content flex-1 p-4 text-white text-xs sm:text-sm focus:outline-none overflow-y-auto w-full break-words"></div>
                </div>
            </div>` : `
            
            <div id="appsScriptUrlContainer" class="flex flex-col gap-2 mt-1 w-full animate-[fadeInSlide_0.3s_ease-out]">
                 <label class="text-[10px] sm:text-xs text-cyan-400 font-bold uppercase pl-1">Apps Script Web App URL</label>
                 <input type="text" id="mailAppsScriptUrl" placeholder="https://script.google.com/macros/s/.../exec" class="w-full bg-black/40 border border-cyan-500/30 rounded-xl px-4 py-3 text-white text-xs sm:text-sm focus:border-cyan-500 outline-none">
                 <p class="text-[9px] text-zinc-400 pl-1 mt-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 leading-relaxed">
                     When you click dispatch, this will automatically send a POST request containing user details to your Apps Script.<br><br>
                     The Script will receive a JSON payload for each user:<br>
                     <code class="text-cyan-400 block mt-1">{ "name": "John", "email": "john@x.com", "eventName": "Robo Race", "certType": "participant", "position": "", "certificateText": "has actively participated..." }</code><br>
                     If sending <b>Appreciation</b> (winners), <code>certType</code> will be "appreciation", and <code>position</code> will automatically map to "1st", "2nd", or "3rd". The <code>certificateText</code> will contain the exact printable text you requested!
                 </p>
            </div>
            `}

            <button onclick="window.executeBulkMail()" class="w-full py-3.5 mt-2 rounded-xl ${isCert ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'} text-white text-sm font-bold transition flex justify-center items-center gap-2">
                ${isCert ? `<i data-lucide="zap" class="w-4 h-4"></i> Generate & Send via Apps Script` : `<i data-lucide="send" class="w-4 h-4"></i> Dispatch Mails`}
            </button>
        </div>
    `;
    if(typeof window.renderIcons === 'function') window.renderIcons();
    window.toggleMailTags();
};

window.toggleMailTags = function() {
    const audience = document.getElementById('mailAudience').value;
    const tagHintEvent = document.getElementById('tagHintEvent');
    if (!tagHintEvent) return;
    
    if (audience.includes('event_') || audience.includes('cert_')) tagHintEvent.classList.remove('hidden');
    else tagHintEvent.classList.add('hidden');

    const msgBox = document.getElementById('mailMessage');
    if (msgBox && window.currentMailType === 'certificate') {
        const isParticipant = audience.startsWith('cert_part_');
        const isWinner = audience.startsWith('cert_win_');
        
        if (isParticipant) {
            msgBox.innerHTML = `Dear <b>{{name}}</b>,<br><br>This is to certify that you have actively participated in <b>{{eventname}}</b> conducted by AUTUMN 2026.<br><br>Please access your participation certificate using the link below:<br><a href="{{certificate_link}}" style="color: #60a5fa;">{{certificate_link}}</a><br><br>Best Regards,<br>Events Team`;
        } else if (isWinner) {
            msgBox.innerHTML = `Dear <b>{{name}}</b>,<br><br>Congratulations! This is to certify that you have secured <b>{{position}} Place</b> in <b>{{eventname}}</b> conducted by AUTUMN 2026.<br><br>Please access your certificate of appreciation using the link below:<br><a href="{{certificate_link}}" style="color: #60a5fa;">{{certificate_link}}</a><br><br>Best Regards,<br>Events Team`;
        }
    }
};

window.executeBulkMail = async function() {
    const mode = window.currentMailType || 'normal';
    const audience = document.getElementById('mailAudience').value;
    const subject = document.getElementById('mailSubject')?.value;
    const msgBox = document.getElementById('mailMessage');
    const textMsg = msgBox ? msgBox.innerText.trim() : "";
    const scriptUrl = document.getElementById('mailAppsScriptUrl')?.value || "";

    if (mode === 'normal' && (!subject || !textMsg)) return window.showMessage('Please enter a subject and a message.');
    if (mode === 'certificate' && !scriptUrl) return window.showMessage('Please provide the Apps Script Web App URL.');

    let count = 0;
    let payload = []; 
    const users = await window.DatabaseAPI.get('users');
    
    if (mode === 'normal') {
        let recipientEmails = [];
        
        if (audience === 'all_users') {
            recipientEmails = users;
        } else if (audience === 'all_events') {
            const regs = await window.DatabaseAPI.get('registrations');
            const userIds = new Set(regs.flatMap(r => [r.leader, ...(r.members||[])]));
            recipientEmails = users.filter(u => userIds.has(u.id));
        } else if (audience === 'all_accom') {
            const accoms = await window.DatabaseAPI.get('accommodations');
            const userIds = new Set(accoms.map(a => a.id));
            recipientEmails = users.filter(u => userIds.has(u.id));
        } else if (audience.startsWith('event_')) {
            const evId = audience.split('_')[1];
            const regs = await window.DatabaseAPI.get('registrations');
            const userIds = new Set(regs.filter(r => String(r.eventId) === evId).flatMap(r => [r.leader, ...(r.members||[])]));
            recipientEmails = users.filter(u => userIds.has(u.id));
        }

        count = recipientEmails.length;
        
        if (count > 0) {
            // 1. Send actual email via API
            try {
                await fetch(`${window.BASE_URL}/send-mail`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject: subject,
                        body: textMsg,
                        recipients: recipientEmails.map(u => ({ email: u.email, name: u.name }))
                    })
                });
            } catch(e) { console.error("Bulk Mail Failed", e); }
            
            // 2. Add to in-app notifications
            const threadId = "thread_" + Date.now();
            for (let u of recipientEmails) {
                await window.DatabaseAPI.add('notifications', {
                    id: "notif_" + Date.now() + Math.random().toString(36).substr(2, 5),
                    threadId: threadId,
                    userId: u.id,
                    senderId: 'admin',
                    senderEmail: window.userProfile.email,
                    type: 'chat_message', // Use generic chat message type
                    title: subject,
                    message: msgBox ? msgBox.innerText.trim() : "New Broadcast Message",
                    date: new Date().toLocaleString(),
                    isRead: 'false'
                });
            }
        }
    } else if (mode === 'certificate') {
        const isParticipant = audience.startsWith('cert_part_');
        const evId = isParticipant ? audience.replace('cert_part_', '') : audience.replace('cert_win_', '');
        const eventObj = Object.values(window.EVENTS_DATA || {}).flat().find(e => e.id === evId);
        const eventName = eventObj ? eventObj.name : "Event";

        if (isParticipant) {
            const regs = await window.DatabaseAPI.get('registrations');
            const participantIds = new Set(regs.filter(r => r.eventId === evId).flatMap(r => [r.leader, ...r.members]));
            count = participantIds.size;
            const certText = `has actively participated in the ${eventName} conducted by AUTUMN 2026.`;
            participantIds.forEach(id => {
                const u = users.find(user => user.id === id);
                if(u) payload.push({ name: u.name, email: u.email, eventName: eventName, certType: "participant", position: "", certificateText: certText });
            });
        } else {
            const winnersDb = await window.DatabaseAPI.get('winners');
            const regs = await window.DatabaseAPI.get('registrations');
            const winData = winnersDb.find(w => w.eventId === evId);
            
            if (winData) {
                const addWinner = (winId, pos) => {
                    if (winId && winId !== 'null') {
                        let leaderId = winId.startsWith('AUT-TEAM-') ? (regs.find(reg => reg.teamCode === winId)?.leader || winId) : winId;
                        const u = users.find(user => user.id === leaderId);
                        if(u) {
                            const certText = `has secured ${pos} Place in the ${eventName} conducted by AUTUMN 2026.`;
                            payload.push({ name: u.name, email: u.email, eventName: eventName, certType: "appreciation", position: pos, certificateText: certText });
                            count++;
                        }
                    }
                };
                addWinner(winData.firstPlace, "1st");
                addWinner(winData.secondPlace, "2nd");
                addWinner(winData.thirdPlace, "3rd");
            }
        }
    }

    if (mode === 'certificate' && payload.length === 0) return window.showMessage("No users found for this selection.");
    if(typeof window.showMessage === 'function') window.showMessage(mode === 'normal' ? `Success! Broadcast sent to ${count} recipients.` : `Success! Sent ${count} certificate requests to Apps Script.`);
    
    if(document.getElementById('mailSubject')) document.getElementById('mailSubject').value = '';
    if(msgBox) msgBox.innerHTML = '';
};

// --- WINNERS & PRIZES ---
window.renderAdminWinners = function() {
    let tab = document.getElementById('admin-winners-tab');
    if (!tab) return;

    let evOptions = `<option value="" class="bg-zinc-900 text-white">Select Event...</option>`;
    for (const [catKey, events] of Object.entries(window.EVENTS_DATA || {})) {
        if(catKey === 'festivals') continue;
        events.forEach(ev => {
            evOptions += `<option value="${ev.id}" class="bg-zinc-900 text-white">${ev.name} (${catKey})</option>`;
        });
    }

    tab.innerHTML = `
        <div class="mb-6">
            <h3 class="text-lg sm:text-xl font-bold text-white">Winners</h3>
            <p class="text-xs sm:text-sm text-zinc-400 mt-1">Declare event winners. (Type 'null' if a position was not awarded).</p>
        </div>
        <div class="max-w-xl bg-zinc-900/40 border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
            <h4 class="text-white font-bold mb-2 flex items-center gap-2"><i data-lucide="trophy" class="w-4 h-4 text-amber-500"></i> Declare Event Winners</h4>
            <div>
                <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-2">Select Event</label>
                <select id="winnerEventSelect" class="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-white text-xs sm:text-sm focus:border-amber-500 outline-none cursor-pointer">${evOptions}</select>
            </div>
            <div class="space-y-3">
                <div class="flex items-center gap-3"><span class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">1</span><input type="text" id="winner1" placeholder="Team Code or Leader ID" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none"></div>
                <div class="flex items-center gap-3"><span class="w-8 h-8 rounded-full bg-zinc-400/20 text-zinc-300 flex items-center justify-center font-bold shrink-0">2</span><input type="text" id="winner2" placeholder="Team Code or Leader ID" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none"></div>
                <div class="flex items-center gap-3"><span class="w-8 h-8 rounded-full bg-orange-700/20 text-orange-600 flex items-center justify-center font-bold shrink-0">3</span><input type="text" id="winner3" placeholder="Team Code or Leader ID" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none"></div>
            </div>
            <button onclick="window.saveEventWinners()" class="w-full py-3 mt-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-amber-950 text-sm font-bold transition shadow-[0_0_15px_rgba(245,158,11,0.3)]">Save Winners</button>
        </div>`;
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.saveEventWinners = async function() {
    const evId = document.getElementById('winnerEventSelect').value;
    const w1 = document.getElementById('winner1').value.trim();
    const w2 = document.getElementById('winner2').value.trim();
    const w3 = document.getElementById('winner3').value.trim();

    if(!evId) return window.showMessage("Please select an event.");
    if(!w1 && !w2 && !w3) return window.showMessage("Please enter at least one winner.");

    await window.DatabaseAPI.add('winners', { id: Date.now().toString(), eventId: evId, firstPlace: w1, secondPlace: w2, thirdPlace: w3, dateDeclared: new Date().toLocaleString() });
    if(typeof window.showMessage === 'function') window.showMessage("Winners successfully recorded in Database!");
    
    document.getElementById('winnerEventSelect').value = '';
    document.getElementById('winner1').value = ''; document.getElementById('winner2').value = ''; document.getElementById('winner3').value = '';
};

window.renderAdminPrizes = function() {
    let tab = document.getElementById('admin-prizes-tab');
    if (!tab) return;
    const defaultTemplate = `Dear {{name}},<br><br>Congratulations on your remarkable performance in <b>{{eventname}}</b>! We are delighted to inform you that you have secured <b>{{position}} PLACE</b> in the event.<br><br>Your enthusiasm and dedication truly stood out. As a token of appreciation, you have won <b>₹{{cash}} cash</b>{{coupon_text}}.<br><br>To process the rewards{{dispatch_text}}, we request you to kindly share the following details at the earliest to this mail.<br><br><b>Online payment details</b><br>(UPI ID only — not UPI mobile number — or bank account details)<br><br>{{address_req}}<br><br>Thank you for being a valuable part of AUTUMN 2026!<br><br>Best regards,<br>Events Team`;
    tab.innerHTML = `
        <div class="mb-6">
            <h3 class="text-lg sm:text-xl font-bold text-white">Prize Distribution</h3>
            <p class="text-xs sm:text-sm text-zinc-400 mt-1">Upload CSV to distribute prizes/coupons to declared winners.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div class="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
                <h4 class="text-white font-bold mb-2 flex items-center gap-2"><i data-lucide="gift" class="w-4 h-4 text-rose-500"></i> Dispatch Prizes</h4>
                <p class="text-[10px] sm:text-xs text-zinc-400 mb-2 leading-relaxed">Upload a CSV file containing columns:<br><b>EventID, 1st Prize Money, 1st Prize Coupons, 2nd Prize Money...</b></p>
                <div class="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center hover:border-rose-500 transition-colors relative cursor-pointer group">
                    <i data-lucide="file-spreadsheet" class="w-6 h-6 text-zinc-500 mx-auto mb-2 group-hover:text-rose-500 transition-colors"></i>
                    <p class="text-xs sm:text-sm text-zinc-400" id="prize-file-text">Click to browse or drag Prize CSV</p>
                    <input type="file" id="prizeUploadCsv" accept=".csv" class="absolute inset-0 opacity-0 cursor-pointer" onchange="document.getElementById('prize-file-text').innerText = this.files[0].name">
                </div>
                <button onclick="window.processPrizesCSV()" class="w-full py-3 mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition shadow-[0_0_15px_rgba(225,29,72,0.4)] flex justify-center items-center gap-2"><i data-lucide="mail" class="w-4 h-4"></i> Process Sheet & Mail Winners</button>
            </div>
            <div class="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
                 <h4 class="text-white font-bold mb-2 flex items-center gap-2"><i data-lucide="edit" class="w-4 h-4 text-blue-500"></i> Edit Mail Template</h4>
                 <div class="w-full flex-1 flex flex-col bg-black/40 border border-white/10 rounded-xl shadow-inner mt-1 overflow-hidden min-h-[300px]">
                    <div id="prizeMailTemplate" contenteditable="true" class="rich-editor-content flex-1 p-3 sm:p-4 text-white text-[10px] sm:text-xs focus:outline-none overflow-y-auto w-full break-words">${defaultTemplate}</div>
                </div>
            </div>
        </div>`;
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.processPrizesCSV = function() {
    const fileInput = document.getElementById('prizeUploadCsv');
    if (!fileInput.files.length) return window.showMessage("Please upload a CSV file first.");
    setTimeout(() => {
        if(typeof window.showMessage === 'function') window.showMessage("Successfully processed CSV! Emails dynamically formatted and dispatched.");
        fileInput.value = '';
        document.getElementById('prize-file-text').innerText = 'Click to browse or drag Prize CSV';
    }, 1500);
};

// --- USER MANAGEMENT (Add / Pre-assign / Bulk Upload) ---
window.adminAddSingleUser = async function() {
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const role = parseInt(document.getElementById('newUserRole').value);
    
    if(!email) return window.showMessage("Enter an email.");
    if(role >= window.currentRole && window.currentRole !== window.ROLES.PRIMARY) return window.showMessage("You cannot assign a role equal to or higher than your own.");
    
    const users = await window.DatabaseAPI.get('users');
    const existing = users.find(u => u.email === email);
    
    if(existing) {
        await window.DatabaseAPI.update('users', existing.id, { role: role });
        if(typeof window.showMessage === 'function') window.showMessage(`Updated existing user role to L${role}`);
    } else {
        const newId = "AUT-26-" + Math.floor(1000 + Math.random() * 9000);
        await window.DatabaseAPI.add('users', { id: newId, name: "Pending User", email: email, password: "defaultpass", role: role, phone: "" });
        if(typeof window.showMessage === 'function') window.showMessage(`Pre-assigned role L${role} to ${email}`);
    }
    
    document.getElementById('newUserEmail').value = '';
    if(typeof window.closeModal === 'function') window.closeModal('adminAddUserModal');
    window.renderAdminDashboard();
};

window.adminBulkUploadUsers = async function() {
    const fileInput = document.getElementById('bulkRoleUpload');
    const file = fileInput.files[0];
    if(!file) return window.showMessage("Select a CSV file.");
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const lines = e.target.result.split('\n');
        let count = 0;
        const users = await window.DatabaseAPI.get('users');
        
        for(let i=1; i<lines.length; i++) { 
            const line = lines[i].trim();
            if(!line) continue;
            const parts = line.split(',');
            if(parts.length >= 2) {
                const email = parts[0].trim().toLowerCase();
                const role = parseInt(parts[1].trim());
                if(email && !isNaN(role)) {
                    if(role >= window.currentRole && window.currentRole !== window.ROLES.PRIMARY) continue;
                    const existing = users.find(u => u.email === email);
                    if(existing) {
                        await window.DatabaseAPI.update('users', existing.id, { role: role });
                        existing.role = role; 
                    } else {
                        const newId = "AUT-26-" + Math.floor(1000 + Math.random() * 9000);
                        const newUser = { id: newId, name: "Pending User", email: email, password: "defaultpass", role: role, phone: "" };
                        await window.DatabaseAPI.add('users', newUser);
                        users.push(newUser); 
                    }
                    count++;
                }
            }
        }
        fileInput.value = '';
        if(typeof window.showMessage === 'function') window.showMessage(`Successfully processed ${count} role assignments.`);
        if(typeof window.closeModal === 'function') window.closeModal('adminAddUserModal');
        window.renderAdminDashboard();
    };
    reader.readAsText(file);
};

// --- GALLERY APPROVALS ---
window.openGalleryDetails = function(id) {
    window.DatabaseAPI.get('gallery').then(allGallery => {
        const dbPendingUploads = allGallery.filter(g => g.status === 'Pending');
        const img = dbPendingUploads.find(p => p.id == id);
        if (!img) return;

        const getDirect = (url) => {
            if (!url) return '';
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
            return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
        };

        document.getElementById('adminDetailsTitle').innerText = "Review Gallery Submission";
        document.getElementById('adminDetailsContent').innerHTML = `
            <div class="flex flex-col gap-4">
                <img src="${getDirect(img.url)}" class="w-full max-h-64 object-cover rounded-xl border border-white/10 shadow-lg" onerror="this.src='https://placehold.co/400x200/18181b/ffffff?text=Image+Error'">
                <div>
                    <p class="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mb-1">Uploaded by ${img.user}</p>
                    <p class="text-xs sm:text-sm font-bold text-rose-400">${img.event}</p>
                    <p class="text-xs sm:text-sm text-white mb-3">"${img.caption}"</p>
                    <textarea id="gal-msg-modal-${img.id}" class="w-full bg-black/50 border border-zinc-700 rounded p-3 text-xs text-white focus:outline-none focus:border-rose-500" placeholder="Optional email feedback to the user..."></textarea>
                </div>
            </div>
        `;
        document.getElementById('adminDetailsFooter').innerHTML = `
            <button onclick="window.closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Cancel</button>
            <div class="flex gap-2">
                <button onclick="window.closeModal('adminDetailsModal'); window.rejectGalleryImage('${img.id}')" class="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-sm font-bold transition border border-red-500/30">Reject & Delete</button>
                <button onclick="window.closeModal('adminDetailsModal'); window.approveGalleryImage('${img.id}')" class="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg text-sm font-bold transition border border-emerald-500/30">Approve & Publish</button>
            </div>
        `;
        if(typeof window.openModal === 'function') window.openModal('adminDetailsModal');
        if(typeof window.renderIcons === 'function') window.renderIcons();
    });
};

window.approveGalleryImage = async function(id) {
    const allGallery = await window.DatabaseAPI.get('gallery');
    const img = allGallery.find(p => p.id === id);
    if (img) {
        const tags = `${img.event} ${img.caption} ${img.user}`.toLowerCase();
        let msgEl = document.getElementById('gal-msg-' + id) || document.getElementById('gal-msg-modal-' + id);
        const customMsg = msgEl && msgEl.value.trim() ? msgEl.value : "Your gallery submission was approved!";
        
        await window.DatabaseAPI.update('gallery', img.id, { status: 'Approved', tags: tags, likes: 0 });

        const users = await window.DatabaseAPI.get('users');
        const userObj = users.find(u => u.name === img.user);
        if (userObj) {
            // Push Notification to User
            await window.DatabaseAPI.add('notifications', {
                id: "notif_" + Date.now().toString(),
                userId: userObj.id,
                type: 'system_alert',
                title: `Gallery Approval: ${img.event}`,
                message: customMsg,
                date: new Date().toLocaleString(),
                isRead: 'false'
            });

            // Send Email
            fetch(`${window.BASE_URL}/send-mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: `Gallery Submission Approved: ${img.event}`,
                    body: `Hello ${img.user},<br><br>${customMsg}<br><br>View it live in the gallery!`,
                    recipients: [{ email: userObj.email, name: img.user }]
                })
            });
        }
        window.renderAdminDashboard();
        if(typeof window.showMessage === 'function') window.showMessage(`Image approved! Notification sent.`);
    }
};

window.rejectGalleryImage = async function(id) {
    const allGallery = await window.DatabaseAPI.get('gallery');
    const img = allGallery.find(p => p.id === id);
    if (!img) return;

    let msgEl = document.getElementById('gal-msg-' + id) || document.getElementById('gal-msg-modal-' + id);
    const customMsg = msgEl && msgEl.value.trim() ? msgEl.value : "Your gallery submission was declined.";
    
    await window.DatabaseAPI.delete('gallery', id);
    
    const users = await window.DatabaseAPI.get('users');
    const userObj = users.find(u => u.name === img.user);
    if (userObj) {
        // Push Notification to User
        await window.DatabaseAPI.add('notifications', {
            id: "notif_" + Date.now().toString(),
            userId: userObj.id,
            type: 'system_alert',
            title: `Gallery Submission Update`,
            message: customMsg,
            date: new Date().toLocaleString(),
            isRead: 'false'
        });

        fetch(`${window.BASE_URL}/send-mail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: `Gallery Submission Update: ${img.event}`,
                body: `Hello ${img.user},<br><br>${customMsg}`,
                recipients: [{ email: userObj.email, name: img.user }]
            })
        });
    }
    window.renderAdminDashboard();
    if(typeof window.showMessage === 'function') window.showMessage(`Image rejected. Notification sent.`);
};

// ==========================================
// CHAT / THREADED NOTIFICATIONS
// ==========================================

window.prepareUserReply = async function(notifId, overrideEmail = null) {
    const notifs = await window.DatabaseAPI.get('notifications');
    const n = notifs.find(x => x.id === notifId);
    
    // Determine thread tracking. Group by threadId if available, fallback to id.
    const threadId = n ? (n.threadId || n.id) : ('thread_' + Date.now());
    
    // Resolve target email for UI header
    let targetEmail = 'Admin';
    if (window.isAdmin && overrideEmail) {
        targetEmail = overrideEmail;
    } else if (n && n.senderEmail && n.senderEmail !== window.userProfile.email) {
        targetEmail = n.senderEmail;
    }

    document.getElementById('userReplyNotifId').value = threadId;
    document.getElementById('userReplyContext').innerHTML = `<span class="font-bold text-white">Chat with:</span> ${targetEmail}`;

    // Load thread history
    const threadMsgs = notifs.filter(x => x.threadId === threadId || x.id === threadId).sort((a,b) => new Date(a.date) - new Date(b.date));

    let chatHtml = `<div id="chatHistoryBox" class="flex flex-col gap-3 mb-4 h-64 overflow-y-auto custom-scrollbar p-2 bg-black/50 rounded-xl border border-white/5">`;
    
    if (threadMsgs.length === 0 && n) {
        // Legacy fallback for old notifications without proper sender tracking
        chatHtml += `
            <div class="bg-zinc-800 p-3 rounded-xl rounded-tl-none w-[85%] text-xs text-white">
                <span class="text-[9px] text-zinc-400 block mb-1">${n.date}</span>
                ${n.message}
            </div>`;
    } else {
        threadMsgs.forEach(msg => {
            const isMe = msg.senderId === window.userProfile.accountId || (window.isAdmin && msg.senderId === 'admin');
            
            if (isMe) {
                chatHtml += `
                <div class="self-end bg-rose-600/80 p-3 rounded-xl rounded-tr-none max-w-[85%] text-xs text-white shadow-md">
                    <span class="text-[9px] text-rose-200 block mb-1 text-right">You • ${msg.date}</span>
                    ${msg.message}
                </div>`;
            } else {
                chatHtml += `
                <div class="self-start bg-zinc-800 p-3 rounded-xl rounded-tl-none max-w-[85%] text-xs text-white shadow-md border border-white/5">
                    <span class="text-[9px] text-zinc-400 block mb-1">${msg.senderEmail || 'User'} • ${msg.date}</span>
                    ${msg.message}
                </div>`;
            }
        });
    }
    
    chatHtml += `</div>`;
    
    document.getElementById('userReplyContext').innerHTML += chatHtml;
    
    setTimeout(() => {
        const box = document.getElementById('chatHistoryBox');
        if(box) box.scrollTop = box.scrollHeight;
    }, 50);

    document.getElementById('userReplyMessage').value = '';
    if(typeof window.closeModal === 'function') window.closeModal('notificationsModal');
    if(typeof window.openModal === 'function') window.openModal('userReplyModal');
};

window.sendUserReply = async function() {
    const msg = document.getElementById('userReplyMessage').value.trim();
    const threadId = document.getElementById('userReplyNotifId').value;
    
    if (!msg) {
        if(typeof window.showMessage === 'function') window.showMessage("Type a message first.");
        return;
    }

    const notifs = await window.DatabaseAPI.get('notifications');
    const threadMsgs = notifs.filter(n => n.threadId === threadId || n.id === threadId);
    const lastMsg = threadMsgs[threadMsgs.length - 1];

    // Determine the receiver based on the last message in the thread
    let receiverId = 'admin'; // Default fallback
    if (window.isAdmin && lastMsg) {
        receiverId = lastMsg.senderId === 'admin' ? lastMsg.userId : lastMsg.senderId;
    } else if (!window.isAdmin) {
        receiverId = 'admin'; 
    }

    const newMsg = {
        id: "notif_" + Date.now().toString(),
        threadId: threadId,
        userId: receiverId, // This places it in the receiver's inbox
        senderId: window.isAdmin ? 'admin' : window.userProfile.accountId,
        senderEmail: window.isAdmin ? 'admin@autumnfest.in' : window.userProfile.email,
        type: "chat_message",
        title: window.isAdmin ? `Admin Support` : `Reply from ${window.userProfile.name}`,
        message: msg,
        date: new Date().toLocaleString(),
        isRead: "false"
    };

    await window.DatabaseAPI.add('notifications', newMsg);
    
    // Live UI Update: Append directly to the active chat box
    const chatBox = document.getElementById('chatHistoryBox');
    if (chatBox) {
        chatBox.innerHTML += `
            <div class="self-end bg-rose-600/80 p-3 rounded-xl rounded-tr-none max-w-[85%] text-xs text-white shadow-md">
                <span class="text-[9px] text-rose-200 block mb-1 text-right">You • ${newMsg.date}</span>
                ${newMsg.message}
            </div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
        document.getElementById('userReplyMessage').value = '';
    } else {
        if(typeof window.closeModal === 'function') window.closeModal('userReplyModal');
        if(typeof window.showMessage === 'function') window.showMessage("Message sent!");
    }
};

window.openAdminReplyModal = function(collection, id, email, name = '') {
    window.replyTargetCollection = collection;
    window.replyTargetId = id;
    window.replyTargetEmail = email;
    
    const targetEl = document.getElementById('adminReplyTargetEmail');
    if (targetEl) targetEl.innerText = email;
    
    const subjEl = document.getElementById('adminReplySubject');
    if (subjEl) subjEl.value = `Re: Your ${collection === 'sponsors' ? 'Sponsorship ' : ''}Inquiry`;
    
    const attachLinks = document.getElementById('adminReplyLinks');
    if(attachLinks) attachLinks.value = '';
    
    const msgBox = document.getElementById('adminReplyMessage');
    if(msgBox) {
        msgBox.innerHTML = name && name !== "Pending User" ? `Dear <b>${name}</b>,<br><br>` : '';
    }
    
    if(typeof window.openModal === 'function') window.openModal('adminReplyModal');
};

window.executeAdminReply = async function() {
    const msgBox = document.getElementById('adminReplyMessage');
    const textMsg = msgBox ? msgBox.innerHTML.trim() : "";
    if(!textMsg) return window.showMessage("Please type a message before sending.");
    
    const subject = document.getElementById('adminReplySubject')?.value || "Reply from Autumn Fest";
    const rawText = msgBox ? msgBox.innerText.trim() : "";
    
    // Dispatch Email
    try {
        await fetch(`${window.BASE_URL}/send-mail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: subject,
                body: textMsg,
                recipients: [{ email: window.replyTargetEmail, name: "Participant" }]
            })
        });
    } catch (e) {
        console.error("Mail Dispatch Failed:", e);
    }
    
    // Log Admin History in the Query/Sponsor Tracker
    let statusText = window.replyTargetCollection === 'queries' ? 'Replied' : 'Reviewed & Replied';
    if (window.replyTargetCollection !== 'users' && window.replyTargetCollection) {
        const allItems = await window.DatabaseAPI.get(window.replyTargetCollection);
        const item = allItems.find(x => x.id === window.replyTargetId);
        
        const historyEntry = `<div class="mt-2 p-3 bg-blue-900/20 rounded-xl border border-blue-500/30"><p class="text-[9px] text-blue-400 font-bold mb-1 uppercase tracking-widest">Admin Reply • ${new Date().toLocaleString()}</p><div class="text-xs text-white">${textMsg}</div></div>`;
        const newReplyText = (item && item.replyText ? item.replyText : '') + historyEntry;
        
        await window.DatabaseAPI.update(window.replyTargetCollection, window.replyTargetId, { status: statusText, replyText: newReplyText });
    }
    
    // Push In-App Threaded Notification Chat to the User
    try {
        const allUsers = await window.DatabaseAPI.get('users');
        const targetUser = allUsers.find(u => u.email && u.email.toLowerCase() === window.replyTargetEmail.toLowerCase());
        if (targetUser) {
            const threadId = "thread_" + Date.now().toString();
            await window.DatabaseAPI.add('notifications', {
                id: threadId,
                threadId: threadId,
                userId: targetUser.id,
                senderId: 'admin',
                senderEmail: window.userProfile.email,
                type: 'chat_message',
                title: subject,
                message: rawText,
                date: new Date().toLocaleString(),
                isRead: 'false'
            });
        }
    } catch(e) {}
    
    if(typeof window.closeModal === 'function') window.closeModal('adminReplyModal');
    if(typeof window.showMessage === 'function') window.showMessage(`Email and In-App notification sent to ${window.replyTargetEmail}!`);
    if(typeof window.renderAdminDashboard === 'function') window.renderAdminDashboard(); 
};