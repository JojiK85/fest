// ==========================================
// SPONSORS.HTML SPECIFIC LOGIC
// ==========================================

window.toggleSponsorInput = function(type) {
    window.sponsorUploadType = type; // Tracked globally in shared.js
    const fileBtn = document.getElementById('btn-spon-file');
    const linkBtn = document.getElementById('btn-spon-link');
    const fileContainer = document.getElementById('spon-file-container');
    const linkInput = document.getElementById('sponLink');
    
    if (type === 'file') {
        fileBtn.className = "flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition";
        linkBtn.className = "flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition hover:bg-zinc-700";
        fileContainer.classList.remove('hidden');
        linkInput.classList.add('hidden');
        linkInput.removeAttribute('required');
    } else {
        linkBtn.className = "flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition";
        fileBtn.className = "flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition hover:bg-zinc-700";
        linkInput.classList.remove('hidden');
        linkInput.setAttribute('required', 'true');
        fileContainer.classList.add('hidden');
    }
};

window.submitSponsorForm = async function() {
    let linkData = "";
    if(window.sponsorUploadType === 'link') {
        linkData = document.getElementById('sponLink').value;
    } else {
        const fileInput = document.getElementById('sponFile');
        if(fileInput.files.length > 0) {
            if(typeof showMessage === 'function') showMessage("Uploading proposal to Drive... Please wait.");
            try {
                linkData = await window.uploadFileToDrive(fileInput.files[0]);
            } catch(e) {
                if(typeof showMessage === 'function') return showMessage(e.message);
            }
        } else {
            if(typeof showMessage === 'function') return showMessage("Please upload a file or switch to Drive Link.");
            return;
        }
    }

    const data = {
        id: Date.now().toString(),
        company: document.getElementById('sponCompanyName').value,
        contact: document.getElementById('sponContactName').value,
        email: document.getElementById('sponEmail').value,
        phone: document.getElementById('sponPhone').value,
        link: linkData, 
        status: 'Pending'
    };
    
    await window.DatabaseAPI.add('sponsors', data);
    
    if(typeof closeModal === 'function') closeModal('sponsorModal');
    if(typeof showMessage === 'function') showMessage('Sponsorship proposal securely submitted!');
};