// ==========================================
// INDEX.HTML SPECIFIC LOGIC
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize ambient falling leaves
    initFallingLeaves();

    // 2. Initialize and start the countdown
    if (document.getElementById('cd-days')) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // 3. Apply the global Fest Status UI (Active, Completed, Soon)
    applyGlobalStatusUI();
});

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

function updateCountdown() {
    // festDate and festStatus come from shared.js global scope
    const diff = festDate - new Date();
    
    if (diff <= 0 || festStatus === 'completed') {
        ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = id === 'cd-days' ? '000' : '00';
        });
        return;
    }
    
    const d = Math.floor(diff / (86400000));
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const cdDays = document.getElementById('cd-days');
    if(cdDays) {
        cdDays.textContent = String(d).padStart(3, '0');
        document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
        document.getElementById('cd-mins').textContent = String(m).padStart(2, '0');
        document.getElementById('cd-secs').textContent = String(s).padStart(2, '0');
    }
}

function applyGlobalStatusUI() {
    const banner = document.getElementById('global-status-banner');
    const subtitle = document.getElementById('landing-subtitle');
    if(!banner || !subtitle) return; 

    if (festStatus === 'active') {
        banner.classList.add('hidden');
        subtitle.innerText = "Where creativity meets competition. Step into a world of mesmerizing events, thrilling e-sports, and unforgettable cultural nights.";
        document.getElementById('countdown-container').classList.remove('hidden');
    } else if (festStatus === 'completed') {
        banner.classList.remove('hidden');
        banner.className = "mb-6 px-4 py-2 rounded-full border shadow-lg font-bold tracking-wider text-xs uppercase border-red-500/50 bg-red-500/20 text-red-400";
        banner.innerText = "Fest Completed";
        subtitle.innerText = "Thank you for making Autumn 2026 a grand success. See you next time!";
        document.getElementById('countdown-container').classList.add('hidden');
    } else if (festStatus === 'soon') {
        banner.classList.remove('hidden');
        banner.className = "mb-6 px-4 py-2 rounded-full border shadow-lg animate-pulse font-bold tracking-wider text-xs uppercase border-amber-500/50 bg-amber-500/20 text-amber-400";
        banner.innerText = "New Fest Coming Soon";
        subtitle.innerText = "We are gearing up for the next big edition. Stay tuned for announcements!";
        document.getElementById('countdown-container').classList.remove('hidden');
    }
}