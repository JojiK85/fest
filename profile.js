// ==========================================
// PROFILE.HTML SPECIFIC LOGIC
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // Only run the initialization if we are on the profile page
    if (document.getElementById('profile-container')) {
        // Slight delay to ensure shared.js has initialized userProfile
        setTimeout(() => {
            if (window.isLoggedIn) window.renderProfile();
        }, 100);
    }
});

window.renderProfile = async function() {
    const container = document.getElementById('profile-container');
    if (!container) return;
    
    const users = await window.DatabaseAPI.get('users');
    const me = users.find(u => u.id === window.userProfile.accountId);
    if(me && typeof window.populateUserProfile === 'function') {
        await window.populateUserProfile(me);
    }
    
    // Dynamically fetch newest accommodation status so the UI directly picks up assigned room numbers
    const accoms = await window.DatabaseAPI.get('accommodations');
    const myAccom = accoms.find(a => a.id === window.userProfile.accountId);
    if(myAccom) {
        window.userProfile.accommodation = {
            type: myAccom.requested && myAccom.requested !== "None" ? "Shared" : "Individual",
            wing: myAccom.wing,
            duration: myAccom.duration,
            roommate: myAccom.requested || "None",
            roomNumber: myAccom.room || "Pending",
            payId: myAccom.payId
        };
    }
    
    const confirmed = window.userProfile.registrations.filter(r => r.payment === 'Success' || r.payment === 'Team Paid');
    const unfinished = window.userProfile.registrations.filter(r => r.payment === 'Incomplete');

    let unfinishedHTML = unfinished.length > 0 ? unfinished.map(r => {
        const event = Object.values(window.EVENTS_DATA || {}).flat().find(e => e.id === r.eventId);
        if(!event) return '';
        const min = event.team.includes('-') ? parseInt(event.team.split('-')[0]) : parseInt(event.team);
        const needsMembers = r.teamCode && (r.members.length + 1) < min;
        return `
            <div class="bg-zinc-900 border border-amber-500/20 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 shadow-xl hover:border-amber-500/40 transition-all">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-amber-500 text-sm sm:text-base break-words w-full">${event.name}</h4>
                        <p class="text-[8px] sm:text-[9px] text-zinc-500 uppercase mt-1 font-bold">Alert: ${needsMembers ? 'Team members need to be updated' : 'Payment not finished'}</p>
                    </div>
                    <span class="text-[8px] sm:text-[9px] font-black bg-amber-500/10 px-1.5 sm:px-2 py-0.5 rounded text-amber-500 uppercase border border-amber-500/20 tracking-widest shrink-0">PENDING</span>
                </div>
                <p class="text-[9px] sm:text-[10px] font-mono text-cyan-400 bg-black/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/5 tracking-widest select-all break-all">${r.teamCode || 'INDIVIDUAL ENTRY'}</p>
                <div class="flex gap-2 mt-1">
                    <button onclick="window.resumeRegistration('${r.eventId}')" class="flex-1 py-2 sm:py-2.5 bg-amber-600 hover:bg-amber-500 text-amber-950 font-black rounded-lg transition text-[9px] sm:text-[10px] uppercase tracking-widest shadow-lg truncate">Complete Process</button>
                    <button onclick="window.dissolveTeam('${r.eventId}')" class="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 font-black rounded-lg transition shadow-lg shrink-0"><i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
                </div>
            </div>`;
    }).join('') : `<div class="p-6 sm:p-8 text-center text-zinc-600 text-[10px] sm:text-xs italic border border-dashed border-zinc-800 rounded-2xl w-full">No pending registrations.</div>`;

    let confirmedHTML = confirmed.length > 0 ? confirmed.map(r => {
        const event = Object.values(window.EVENTS_DATA || {}).flat().find(e => e.id === r.eventId);
        if(!event) return '';
        const memText = r.members && r.members.length > 0 ? 'You, ' + r.members.join(', ') : 'Individual';
        const isLeader = r.leader === window.userProfile.accountId;
        const roleText = isLeader ? "Team Leader" : "Team Member";

        return `
            <div class="bg-zinc-900/50 border border-emerald-500/10 p-3 sm:p-4 rounded-2xl flex items-start justify-between gap-3 sm:gap-4 hover:border-emerald-500/30 transition-all shadow-lg cursor-pointer group" onclick="window.showTeamQr('${r.eventId}')">
                <div class="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0 mt-1 group-hover:scale-110 transition"><i data-lucide="qr-code" class="w-4 h-4 sm:w-5 sm:h-5"></i></div>
                    <div class="min-w-0">
                        <h4 class="font-bold text-white text-xs sm:text-sm group-hover:text-cyan-400 transition truncate break-words">${event.name}</h4>
                        <p class="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 truncate">${event.date} • ${event.venue}</p>
                        <p class="text-[9px] sm:text-[10px] text-cyan-400 uppercase tracking-widest mt-1 sm:mt-1.5 font-bold truncate">Team: ${r.teamName || 'Individual'} <span class="text-zinc-500 font-medium">(${roleText})</span></p>
                        <p class="text-[8px] sm:text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5 truncate">Members: ${memText}</p>
                    </div>
                </div>
                ${isLeader ? `<button onclick="event.stopPropagation(); window.dissolveTeam('${r.eventId}')" class="text-zinc-600 hover:text-red-500 p-1.5 sm:p-2 transition-colors z-10 relative shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
            </div>`;
    }).join('') : `<div class="p-6 sm:p-8 text-center text-zinc-600 text-[10px] sm:text-xs italic border border-dashed border-zinc-800 rounded-2xl w-full">No events registered.</div>`;

    let paymentsHTML = window.userProfile.payments.length > 0 ? window.userProfile.payments.map(p => `
        <div class="flex justify-between items-center p-2.5 sm:p-3 bg-black/40 border border-white/5 rounded-xl gap-2">
            <div class="min-w-0">
                <p class="text-white text-[10px] sm:text-xs font-mono truncate">${p.id}</p>
                <p class="text-[8px] sm:text-[10px] text-zinc-500 truncate">${p.timestamp}</p>
            </div>
            <div class="text-right shrink-0">
                <p class="text-emerald-400 font-bold text-xs sm:text-sm">₹${p.amount}</p>
                <p class="text-[8px] sm:text-[9px] text-emerald-500 uppercase tracking-widest">${p.status}</p>
            </div>
        </div>
    `).join('') : `<p class="text-zinc-600 text-[10px] sm:text-xs italic text-center py-4">No payments recorded.</p>`;

    let accomHTML = window.userProfile.accommodation ? `
        <div class="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
            <div class="flex justify-between items-start mb-2 gap-2">
                <p class="text-white font-bold capitalize text-xs sm:text-sm break-words flex-1">${window.userProfile.accommodation.type} Occupancy</p>
                <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] sm:text-[10px] uppercase tracking-wider font-bold shrink-0">Confirmed</span>
            </div>
            <p class="text-[10px] sm:text-xs text-zinc-400 capitalize mb-1 truncate">${window.userProfile.accommodation.wing} Wing • Duration: ${window.userProfile.accommodation.duration}</p>
            <p class="text-[10px] sm:text-xs text-emerald-400 font-bold mt-2 truncate">Room Assigned: ${window.userProfile.accommodation.roomNumber}</p>
            <p class="text-[10px] sm:text-xs text-zinc-500 mt-2 mb-3 p-2 bg-zinc-900 rounded-lg border border-zinc-800 font-mono break-all">Requested Friends: <span class="text-zinc-300">${window.userProfile.accommodation.roommate}</span></p>
            <button onclick="window.showAccomQr()" class="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-2"><i data-lucide="qr-code" class="w-3 h-3 sm:w-4 sm:h-4"></i> View Entry QR</button>
        </div>` : `<p class="text-zinc-600 text-[10px] sm:text-xs italic text-center py-4">No accommodation booked.</p>`;

    const profileQrData = encodeURIComponent(`https://autumnfest.in/public.html?id=${window.userProfile.accountId}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${profileQrData}&color=f43f5e&bgcolor=000000`;

    container.innerHTML = `
        <div class="lg:col-span-1 rounded-3xl p-5 sm:p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/5 relative overflow-hidden flex flex-col items-center text-center h-fit lg:sticky lg:top-28 shadow-2xl">
            <div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-zinc-800 overflow-hidden mb-4 sm:mb-6 shadow-2xl bg-zinc-950 flex justify-center items-center text-3xl sm:text-5xl shrink-0">
                <img src="${window.userProfile.photo}" class="w-full h-full object-cover">
            </div>
            <h2 class="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 break-words w-full" id="profile-name">${window.userProfile.name}</h2>
            <span class="px-2 sm:px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-wider border border-rose-500/30 mb-4 uppercase inline-block">ACTIVE MEMBER</span>
            <button onclick="window.openProfileEdit()" class="mb-6 sm:mb-8 px-3 sm:px-4 py-1 sm:py-1.5 border border-zinc-700 text-[10px] sm:text-xs text-zinc-300 hover:text-white hover:border-white rounded-lg transition inline-block"><i data-lucide="edit-2" class="w-3 h-3 inline"></i> Edit Profile</button>
            
            <div class="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mb-6 flex flex-col items-center shadow-inner">
                <p class="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-3">Your Fest ID</p>
                <div class="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-xl overflow-hidden mb-3 p-2 shrink-0">
                    <img src="${qrUrl}" alt="QR Code" class="w-full h-full mix-blend-multiply">
                </div>
                <p class="font-mono text-cyan-400 text-xs sm:text-sm tracking-wider font-bold select-all break-all">${window.userProfile.accountId}</p>
            </div>

            <div class="w-full space-y-2 sm:space-y-3 text-left">
                <div class="bg-black/30 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-inner"><p class="text-[9px] sm:text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Contact</p><p class="text-xs sm:text-sm font-medium text-zinc-300 break-words w-full">${window.userProfile.email}<br>${window.userProfile.phone || 'N/A'}</p></div>
                <div class="bg-black/30 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-inner"><p class="text-[9px] sm:text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Details</p><p class="text-xs sm:text-sm font-medium text-zinc-300 break-words w-full">${window.userProfile.college}<br>${window.userProfile.gender}</p></div>
            </div>
        </div>
        <div class="lg:col-span-2 flex flex-col gap-6 sm:gap-8 min-w-0">
            <div class="rounded-3xl p-5 sm:p-6 md:p-8 bg-zinc-900/40 backdrop-blur-md border border-amber-500/20 flex flex-col shadow-2xl min-w-0">
                <h3 class="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 break-words w-full"><i data-lucide="alert-circle" class="text-amber-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i> Unfinished Processes</h3>
                <div class="grid grid-cols-1 gap-4">${unfinishedHTML}</div>
            </div>
            <div class="rounded-3xl p-5 sm:p-6 md:p-8 bg-zinc-900/40 backdrop-blur-md border border-rose-500/20 flex flex-col shadow-2xl min-w-0">
                <h3 class="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3 break-words w-full"><i data-lucide="calendar" class="text-rose-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i> Registered Events & My Teams</h3>
                <p class="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mb-3 sm:mb-4 break-words w-full">Click an event to view entry QR</p>
                <div class="space-y-3 sm:space-y-4">${confirmedHTML}</div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div class="rounded-3xl p-5 sm:p-6 md:p-8 bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col shadow-2xl min-w-0">
                    <h3 class="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 break-words w-full"><i data-lucide="home" class="text-blue-400 w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i> Stay Details</h3>
                    <div class="space-y-3">${accomHTML}</div>
                </div>
                <div class="rounded-3xl p-5 sm:p-6 md:p-8 bg-zinc-900/40 backdrop-blur-md border border-white/5 flex flex-col shadow-2xl min-w-0">
                    <h3 class="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 break-words w-full"><i data-lucide="credit-card" class="text-emerald-400 w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i> Transactions</h3>
                    <div class="space-y-3">${paymentsHTML}</div>
                </div>
            </div>
        </div>`;
        
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.openProfileEdit = function() {
    document.getElementById('editName').value = window.userProfile.name;
    document.getElementById('editEmail').value = window.userProfile.email;
    document.getElementById('editPhone').value = window.userProfile.phone || "";
    document.getElementById('editGender').value = window.userProfile.gender === 'Not Specified' ? 'Male' : window.userProfile.gender;
    document.getElementById('editCollege').value = window.userProfile.college;
    document.getElementById('editPhotoPreview').src = window.userProfile.photo;

    if(typeof openModal === 'function') openModal('profileEditModal');
};

window.previewProfilePhoto = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('editPhotoPreview').src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
};

window.saveProfile = async function() {
    const fileInput = document.getElementById('photoUpload');
    let finalPhotoUrl = window.userProfile.photo;

    if (fileInput && fileInput.files.length > 0) {
        if(typeof showMessage === 'function') showMessage("Uploading profile picture to Drive... Please wait.");
        try {
            finalPhotoUrl = await window.uploadFileToDrive(fileInput.files[0]);
            if(!finalPhotoUrl) throw new Error("Upload failed");
        } catch (e) {
            if(typeof showMessage === 'function') showMessage("Photo upload failed. Changes not saved.");
            return;
        }
    }

    window.userProfile.name = document.getElementById('editName').value;
    window.userProfile.phone = document.getElementById('editPhone').value;
    window.userProfile.gender = document.getElementById('editGender').value;
    window.userProfile.college = document.getElementById('editCollege').value;
    window.userProfile.photo = finalPhotoUrl;
    
    await window.DatabaseAPI.update('users', window.userProfile.accountId, { 
        name: window.userProfile.name, phone: window.userProfile.phone, gender: window.userProfile.gender, college: window.userProfile.college, photo: finalPhotoUrl
    });
    
    if(typeof closeModal === 'function') closeModal('profileEditModal');
    if(typeof saveCache === 'function') saveCache();
    if(typeof showMessage === 'function') showMessage("Profile Updated Successfully!");
    
    window.renderProfile();
};

window.dissolveTeam = async function(eventId) {
    window.userProfile.registrations = window.userProfile.registrations.filter(r => r.eventId !== eventId);
    const allRegs = await window.DatabaseAPI.get('registrations');
    const regDb = allRegs.find(r => r.eventId === eventId && r.leader === window.userProfile.accountId);
    if(regDb) await window.DatabaseAPI.delete('registrations', regDb.id);
    
    if(typeof saveCache === 'function') saveCache();
    if(typeof showMessage === 'function') showMessage(`Registration Removed.`);
    window.renderProfile();
};

window.resumeRegistration = function(eventId) {
    const reg = window.userProfile.registrations.find(r => r.eventId === eventId);
    window.currentModalEvent = Object.values(window.EVENTS_DATA).flat().find(e => e.id === eventId);
    if(typeof openRegisterModal === 'function') openRegisterModal();
    if (reg && reg.teamCode) {
        if(typeof setRegMode === 'function') setRegMode('create');
        setTimeout(() => {
            const inp = document.getElementById('teamNameInput');
            if (inp) inp.value = reg.teamName;
            if(typeof confirmTeamName === 'function') confirmTeamName();
        }, 10);
    }
};

window.showTeamQr = function(eventId) {
    const reg = window.userProfile.registrations.find(r => r.eventId === eventId);
    if (!reg) return;

    const event = Object.values(window.EVENTS_DATA).flat().find(e => e.id === eventId);

    document.getElementById('teamQrEventName').innerText = event.name;
    document.getElementById('teamQrName').innerText = reg.teamName || 'Individual Entry';

    const qrData = reg.teamCode || window.userProfile.accountId;
    document.getElementById('teamQrCodeText').innerText = qrData;

    const fullUrl = `https://autumnfest.in/public.html?id=${qrData}`;
    document.getElementById('teamQrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}&color=06b6d4&bgcolor=000000`;

    if(typeof openModal === 'function') openModal('teamQrModal');
};

window.showAccomQr = function() {
    if (!window.userProfile.accommodation) return;
    document.getElementById('accomQrName').innerText = window.userProfile.name;

    const qrData = `ACCOM-${window.userProfile.accountId}`;
    document.getElementById('accomQrCodeText').innerText = qrData;

    const fullUrl = `https://autumnfest.in/public.html?id=${qrData}`;
    document.getElementById('accomQrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}&color=3b82f6&bgcolor=000000`;

    if(typeof openModal === 'function') openModal('accomQrModal');
};