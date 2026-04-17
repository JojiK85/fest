// ==========================================
// GALLERY.HTML SPECIFIC LOGIC
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById('gallery-grid');
    if (grid) {
        // Instantly wipe HTML images and show a cool loading spinner
        grid.innerHTML = `
            <div class="col-span-full py-12 flex flex-col items-center justify-center w-full">
                <div class="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
                <p class="text-zinc-400 text-xs sm:text-sm font-bold uppercase tracking-widest animate-pulse">Loading moments...</p>
            </div>
        `;

        // Ultimate block against aggressive Chrome email autofill
        const searchInput = document.getElementById('gallery-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.setAttribute('autocomplete', 'new-password');
            searchInput.setAttribute('readonly', 'true'); // Temporarily lock to prevent autofill
            
            // Unlock after initial load or when the user explicitly interacts with it
            setTimeout(() => searchInput.removeAttribute('readonly'), 1000);
            searchInput.addEventListener('focus', () => searchInput.removeAttribute('readonly'));
            searchInput.addEventListener('click', () => searchInput.removeAttribute('readonly'));
        }
        
        // FIX: Ultra-fast polling instead of a hard 300ms delay. Renders instantly from cache!
        const checkReady = setInterval(() => {
            if (window.DatabaseAPI && window.DatabaseAPI._data && window.DatabaseAPI._data.gallery) {
                clearInterval(checkReady);
                window.renderGallery();
            }
        }, 30);
        
        // Update automatically when live data arrives from the server
        window.addEventListener('db-updated', () => {
            window.renderGallery();
        });
    }
});

// Generate both LH3 and UC links to ensure 100% render reliability + Download Link
window.getDirectImageUrls = function(url) {
    if (!url) return { lh3: '', uc: '', download: '' };
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
    if (match) {
        return {
            lh3: `https://lh3.googleusercontent.com/d/${match[1]}`,
            uc: `https://drive.google.com/uc?export=view&id=${match[1]}`,
            download: `https://drive.google.com/uc?export=download&id=${match[1]}`
        };
    }
    return { lh3: url, uc: url, download: url };
};

// Updated Lightbox to accept BOTH lh3 and uc URLs to guarantee it loads
window.openLightbox = function(lh3Url, ucUrl, caption, downloadUrl) {
    let lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'gallery-lightbox';
        lightbox.className = 'fixed inset-0 z-[200] hidden items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-[fadeInSlide_0.2s_ease-out]';
        lightbox.innerHTML = `
            <button onclick="document.getElementById('gallery-lightbox').classList.add('hidden'); document.getElementById('gallery-lightbox').classList.remove('flex');" class="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition z-50 border border-white/10">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
            <div class="relative max-w-5xl w-full flex flex-col items-center mt-8 sm:mt-0">
                <img id="lightbox-img" src="" class="max-w-full max-h-[75vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5">
                <p id="lightbox-caption" class="text-white text-sm sm:text-lg font-medium mt-4 sm:mt-6 text-center max-w-2xl px-4"></p>
                <a id="lightbox-download" href="" target="_blank" download class="mt-4 sm:mt-6 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-full font-bold flex items-center gap-2 transition shadow-xl">
                    <i data-lucide="download" class="w-4 h-4"></i> Download High-Res
                </a>
            </div>
        `;
        document.body.appendChild(lightbox);
        if(typeof window.renderIcons === 'function') window.renderIcons();
    }
    
    // Setup smart fallback for the popup image specifically
    const imgEl = document.getElementById('lightbox-img');
    imgEl.dataset.triedUc = ''; // Reset state
    imgEl.onerror = function() {
        if (!this.dataset.triedUc) {
            this.dataset.triedUc = 'true';
            this.src = ucUrl; // Fallback to UC if LH3 fails
        } else {
            this.src = 'https://placehold.co/800x600/18181b/ffffff?text=Image+Unavailable';
        }
    };
    
    imgEl.src = lh3Url; // Primary fast load
    document.getElementById('lightbox-caption').innerText = caption;
    document.getElementById('lightbox-download').href = downloadUrl || ucUrl;
    
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
};

window.renderGallery = async function() {
    const container = document.getElementById('gallery-grid');
    if (!container) return;

    const allGallery = await window.DatabaseAPI.get('gallery');
    const approved = allGallery.filter(g => g.status === 'Approved');

    if (approved.length === 0) {
        container.className = "w-full"; 
        container.innerHTML = `<div class="col-span-full p-8 text-center text-zinc-500 italic border border-dashed border-zinc-800 rounded-2xl">No gallery images approved yet. Be the first to upload!</div>`;
        return;
    }
    
    // Forces mobile-responsive, perfectly equal-sized square boxes
    container.className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6 w-full";

    container.innerHTML = approved.map(img => {
        const urls = window.getDirectImageUrls(img.url);
        
        // Strip @gmail.com or other domains if username was accidentally saved as an email
        let displayName = img.user || 'Participant';
        if (displayName.includes('@')) {
            displayName = displayName.split('@')[0];
        }

        // Track likes using the strict, unique accountId instead of the user's name
        let likedByArray = [];
        try { likedByArray = typeof img.likedBy === 'string' ? JSON.parse(img.likedBy) : (img.likedBy || []); } catch(e){}
        const hasLiked = window.isLoggedIn && likedByArray.includes(window.userProfile.accountId);

        return `
        <div class="gallery-item group relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-white/20 transition-all shadow-xl aspect-square cursor-pointer w-full h-full" data-tags="${img.tags || ''}" data-id="${img.id}" onclick="window.handleGalleryTap(this, event)">
            
            <!-- Try LH3 first. If it fails, fallback to UC. If both fail, hide the card. -->
            <img src="${urls.lh3}" onerror="if(!this.dataset.triedUc){ this.dataset.triedUc='true'; this.src='${urls.uc}'; } else { this.closest('.gallery-item').style.display='none'; }" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy">
            
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4">
                <p class="text-[10px] sm:text-xs font-bold text-rose-400 mb-0.5 sm:mb-1 truncate">${img.event}</p>
                <p class="text-xs sm:text-sm text-white font-medium drop-shadow-md line-clamp-2">"${img.caption}"</p>
                <p class="text-[8px] sm:text-[10px] text-zinc-400 mt-1 uppercase tracking-widest truncate">By ${displayName}</p>
            </div>
            
            <!-- Expand Pop-up Button -->
            <button onclick="event.stopPropagation(); window.openLightbox('${urls.lh3}', '${urls.uc}', '${img.caption.replace(/'/g, "\\'")}', '${urls.download}')" 
                class="absolute top-2 left-2 sm:top-3 sm:left-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 z-20 hover:bg-white/20 hover:scale-110 shadow-lg">
                <i data-lucide="expand" class="w-4 h-4"></i>
            </button>

            <!-- Clean, Unified Pill-Shaped Likes UI (Persistent via Account ID) -->
            <button class="like-btn-container absolute top-2 right-2 sm:top-3 sm:right-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 flex items-center justify-center gap-1.5 text-white hover:bg-rose-500/30 hover:border-rose-500/60 transition-all z-20 shadow-lg" onclick="window.toggleLike(this, false, event)">
                <i data-lucide="heart" class="w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-white/80'}"></i>
                <span class="text-xs font-bold like-count tracking-wider">${likedByArray.length}</span>
            </button>
        </div>
    `}).join('');

    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.searchGallery = function() {
    const query = document.getElementById('gallery-search').value.toLowerCase();
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        const tags = item.getAttribute('data-tags') || '';
        if (tags.toLowerCase().includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
};

window.handleGalleryTap = function(item, event) {
    // If they clicked the like button specifically, let it handle itself
    if (event.target.closest('button')) return;

    const now = new Date().getTime();
    const lastTap = item.dataset.lastTap || 0;
    const tapDelay = 300; 

    if (now - lastTap < tapDelay && now - lastTap > 0) {
        item.dataset.lastTap = 0;
        // Find the unified like button
        const likeBtn = item.querySelector('.like-btn-container'); 
        if (likeBtn) {
            window.toggleLike(likeBtn, true, event);
            window.showBigHeart(item);
        }
    } else {
        item.dataset.lastTap = now;
    }
};

window.showBigHeart = function(container) {
    const heart = document.createElement('div');
    heart.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:50;animation:popHeart .8s ease-out forwards;font-size:72px;text-shadow:0 0 20px rgba(0,0,0,0.5);';
    heart.textContent = '❤️';
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 800);
};

window.toggleLike = async function(btn, fromDoubleTap = false, event = null) {
    if (event) event.stopPropagation(); 
    
    if (!window.isLoggedIn) { 
        if(typeof showMessage === 'function') showMessage("Please sign in to like moments."); 
        return; 
    }
    
    const item = btn.closest('.gallery-item');
    const imgId = item ? item.dataset.id : null;
    if(!imgId) return;

    const icon = btn.querySelector('svg') || btn.querySelector('i');
    const countSpan = btn.querySelector('.like-count');
    
    // Fetch live data so multiple users don't overwrite each other
    const allGallery = await window.DatabaseAPI.get('gallery');
    const imgObj = allGallery.find(g => g.id === imgId);
    if(!imgObj) return;

    let likedBy = [];
    try { likedBy = typeof imgObj.likedBy === 'string' ? JSON.parse(imgObj.likedBy) : (imgObj.likedBy || []); } catch(e){}

    const userId = window.userProfile.accountId;
    const isCurrentlyLikedByMe = likedBy.includes(userId);

    if (fromDoubleTap && isCurrentlyLikedByMe) return;

    if (isCurrentlyLikedByMe) {
        icon.classList.remove('fill-rose-500', 'text-rose-500', 'drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]');
        icon.classList.add('text-white/80');
        likedBy = likedBy.filter(id => id !== userId);
    } else {
        icon.classList.remove('text-white/80');
        icon.classList.add('fill-rose-500', 'text-rose-500', 'drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]');
        icon.style.transform = 'scale(1.5)';
        setTimeout(() => icon.style.transform = 'scale(1)', 200);
        likedBy.push(userId);
    }
    
    countSpan.innerText = likedBy.length;
    imgObj.likes = likedBy.length;
    imgObj.likedBy = JSON.stringify(likedBy);

    // Sync to DB seamlessly
    await window.DatabaseAPI.update('gallery', imgId, { likes: likedBy.length, likedBy: imgObj.likedBy });
};

window.showUploadModal = function() {
    if (!window.isLoggedIn) { 
        if(typeof showMessage === 'function') showMessage("Sign in to upload photos."); 
        return; 
    }
    document.getElementById('upload-event-name').value = '';
    document.getElementById('upload-context').value = '';
    window.toggleGalleryUploadType('file');
    if(typeof openModal === 'function') openModal('uploadModal');
};

window.toggleGalleryUploadType = function(type) {
    window.galleryUploadType = type;
    const fileBtn = document.getElementById('btn-gal-file');
    const linkBtn = document.getElementById('btn-gal-link');
    const fileContainer = document.getElementById('gal-file-container');
    const linkInput = document.getElementById('galLink');
    
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

window.submitGalleryUpload = async function() {
    const evName = document.getElementById('upload-event-name').value || "College Fest";
    const context = document.getElementById('upload-context').value || "Amazing moment!";
    
    let url = ''; 
    
    if (window.galleryUploadType === 'file') {
        const fileInput = document.getElementById('galFile');
        if(fileInput.files.length > 0) {
            showMessage('Uploading image to Google Drive... Please wait.');
            try {
                url = await window.uploadFileToDrive(fileInput.files[0]);
            } catch(e) {
                return showMessage(e.message);
            }
        } else {
            showMessage('Please select a file.'); return;
        }
    } else {
        const linkInput = document.getElementById('galLink').value;
        if(!linkInput) { showMessage('Please provide a link.'); return; }
        url = linkInput; 
        showMessage('Drive link copied to database.');
    }

    const gData = {
        id: Date.now().toString(),
        url: url,
        event: evName,
        caption: context,
        user: window.userProfile.name,
        status: 'Pending'
    };

    await window.DatabaseAPI.add('gallery', gData);
    
    fetch(`${window.BASE_URL}/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subject: "Gallery Submission Received",
            body: `Your gallery submission for "${evName}" has been received and is pending admin approval.`,
            recipients: [{ email: window.userProfile.email, name: window.userProfile.name }]
        })
    });

    closeModal('uploadModal');
    showMessage("Image upload submitted and pending admin approval.");
    
    if (window.isAdmin && window.currentRole >= window.ROLES.SUPERADMIN && typeof renderAdminDashboard === 'function') {
        renderAdminDashboard();
    }
};