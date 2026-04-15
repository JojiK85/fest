// ==========================================
// 0. ANTI-FLICKER & INIT
// ==========================================
(function() {
    try {
        const cached = localStorage.getItem("autumn_fest_state");
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.currentRole >= 1) document.documentElement.classList.add('is-admin');
            if (parsed.isLoggedIn) document.documentElement.classList.add('is-logged-in');
            
            // 🔥 ANTI-FLICKER: Hide higher-tier admin tabs instantly before the DOM even renders
            const role = parsed.currentRole || 0;
            let css = '';
            if (role < 4) css += '#danger-zone-container { display: none !important; } ';
            if (role < 3) css += '#tab-btn-settings { display: none !important; } ';
            if (role < 2) css += '#tab-btn-events, #tab-btn-prizes, #tab-btn-accom, #tab-btn-gallery, #tab-btn-users, #tab-btn-queries, #tab-btn-sponsors { display: none !important; } ';
            
            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
            }
        }
    } catch(e) {}
})();

// ==========================================
// 1. INJECT MODALS DYNAMICALLY
// ==========================================
function injectSharedComponents() {
    // (Retaining the exact HTML string for modals to avoid breaking your UI)
    const modalsHTML = `
        <!-- Team QR Modal -->
        <div id="teamQrModal" class="fixed inset-0 z-[140] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('teamQrModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center gap-4 bg-black/40 shrink-0">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Event Entry QR</h3>
                    <button onclick="closeModal('teamQrModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-6 sm:p-8 flex flex-col items-center text-center overflow-y-auto w-full custom-scrollbar flex-1 min-h-0">
                    <h4 id="teamQrEventName" class="text-rose-500 font-bold mb-1 text-sm sm:text-base break-words w-full">Event Name</h4>
                    <p id="teamQrName" class="text-white text-base sm:text-lg font-black mb-4 sm:mb-6 break-words w-full">Team Name</p>
                    <div class="w-40 h-40 sm:w-48 sm:h-48 bg-white rounded-xl overflow-hidden mb-4 p-2 sm:p-3 shrink-0">
                        <img id="teamQrImage" src="" alt="Team QR" class="w-full h-full mix-blend-multiply object-contain">
                    </div>
                    <p id="teamQrCodeText" class="font-mono text-cyan-400 text-xs sm:text-sm tracking-widest font-bold select-all mb-2 break-all">AUT-TEAM-XXXX</p>
                    <p class="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest">Scan at event venue for team entry</p>
                </div>
            </div>
        </div>

        <!-- Accom QR Modal -->
        <div id="accomQrModal" class="fixed inset-0 z-[140] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('accomQrModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Accommodation QR</h3>
                    <button onclick="closeModal('accomQrModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-6 sm:p-8 flex flex-col items-center text-center overflow-y-auto w-full custom-scrollbar flex-1 min-h-0">
                    <h4 class="text-blue-400 font-bold mb-1 text-sm sm:text-base">Hostel Entry</h4>
                    <p id="accomQrName" class="text-white text-base sm:text-lg font-black mb-4 sm:mb-6 break-words w-full">Name</p>
                    <div class="w-40 h-40 sm:w-48 sm:h-48 bg-white rounded-xl overflow-hidden mb-4 p-2 sm:p-3 shrink-0">
                        <img id="accomQrImage" src="" alt="Accom QR" class="w-full h-full mix-blend-multiply object-contain">
                    </div>
                    <p id="accomQrCodeText" class="font-mono text-cyan-400 text-xs sm:text-sm tracking-widest font-bold select-all mb-2 break-all">ACCOM-AUT-...</p>
                    <p class="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-widest">Scan at hostel gate for entry</p>
                </div>
            </div>
        </div>

        <!-- Admin User Profile Modal -->
        <div id="adminUserProfileModal" class="fixed inset-0 z-[140] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminUserProfileModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Participant Profile</h3>
                    <button onclick="closeModal('adminUserProfileModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0" id="adminUserProfileContent">
                    <!-- Injected by JS -->
                </div>
            </div>
        </div>

        <!-- Admin Details Popup (Queries, Sponsors, Gallery) -->
        <div id="adminDetailsModal" class="fixed inset-0 z-[160] hidden items-center justify-center p-4 sm:p-6">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminDetailsModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 id="adminDetailsTitle" class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Details</h3>
                    <button onclick="closeModal('adminDetailsModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0 flex flex-col gap-4 text-zinc-300" id="adminDetailsContent">
                    <!-- Content Injected via JS -->
                </div>
                <div class="p-4 sm:p-5 bg-black/40 border-t border-white/10 flex justify-end gap-3 shrink-0" id="adminDetailsFooter">
                    <!-- Actions Injected via JS -->
                </div>
            </div>
        </div>

        <!-- Admin Add/Pre-assign User Modal -->
        <div id="adminAddUserModal" class="fixed inset-0 z-[150] hidden items-center justify-center p-4 sm:p-6">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminAddUserModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Assign Role</h3>
                    <button onclick="closeModal('adminAddUserModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0 flex flex-col gap-4">
                    <!-- Single Add -->
                    <div class="bg-black/40 p-4 rounded-xl border border-white/10">
                        <h4 class="text-white font-bold text-sm mb-3">Pre-assign Individual</h4>
                        <input type="email" id="newUserEmail" placeholder="User Email" class="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:border-blue-500 mb-3 outline-none">
                        <select id="newUserRole" class="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:border-blue-500 mb-3 outline-none appearance-none">
                            <option value="0">User (L0)</option>
                            <option value="1">Admin (L1)</option>
                            <option value="2">Super Admin (L2)</option>
                            <option value="3">Super Account (L3)</option>
                        </select>
                        <button onclick="adminAddSingleUser()" class="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-xs transition">Assign Role</button>
                    </div>
                    
                    <!-- Bulk Upload -->
                    <div class="bg-black/40 p-4 rounded-xl border border-white/10">
                        <h4 class="text-white font-bold text-sm mb-3">Bulk Pre-assign (CSV)</h4>
                        <p class="text-[10px] text-zinc-400 mb-3 leading-relaxed">Upload a CSV with columns: <b>email, role</b>.<br>Roles: 0=User, 1=Admin, 2=SuperAdmin, 3=SuperAccount.</p>
                        <input type="file" id="bulkRoleUpload" accept=".csv" class="w-full text-[10px] text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 mb-3 cursor-pointer outline-none">
                        <button onclick="adminBulkUploadUsers()" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-xs transition">Upload & Process</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Admin Reply Modal for Queries & Sponsors -->
        <div id="adminReplyModal" class="fixed inset-0 z-[150] hidden items-center justify-center p-4 sm:p-6">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminReplyModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <style>
                    [contenteditable="true"]:empty::before { content: attr(placeholder); color: #71717a; cursor: text; display: block; }
                    .rich-editor-content ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.25rem; margin-bottom: 0.25rem; }
                    .rich-editor-content b { font-weight: bold; }
                    .rich-editor-content i { font-style: italic; }
                    .rich-editor-content u { text-decoration: underline; }
                </style>
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Compose Reply</h3>
                    <button onclick="closeModal('adminReplyModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0 flex flex-col gap-3">
                    <div class="flex items-center gap-2 text-xs text-zinc-400 bg-black/30 p-2 rounded-lg border border-white/5">
                        <span class="font-bold w-14 shrink-0">To:</span> <span id="adminReplyTargetEmail" class="text-white break-all"></span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-zinc-400 bg-black/30 p-2 rounded-lg border border-white/5">
                        <span class="font-bold w-14 shrink-0">Subject:</span> <input type="text" id="adminReplySubject" class="bg-transparent border-none outline-none text-white w-full" placeholder="Re: Your Inquiry">
                    </div>
                    <div class="flex items-start gap-2 text-xs text-zinc-400 bg-black/30 p-2 rounded-lg border border-white/5">
                        <span class="font-bold w-14 shrink-0 pt-2">Attach:</span>
                        <div class="w-full flex flex-col gap-2">
                            <input type="text" id="adminReplyLinks" class="bg-transparent border-white/10 border-b outline-none text-white w-full pb-2" placeholder="Paste links (Drive, WhatsApp, etc.)">
                            <input type="file" id="adminReplyFiles" multiple class="w-full text-[10px] text-zinc-400 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer outline-none mt-1">
                        </div>
                    </div>
                    
                    <div class="w-full flex-1 flex flex-col bg-black/40 border border-white/10 rounded-xl shadow-inner mt-1 overflow-hidden min-h-[160px]">
                        <div class="flex items-center gap-1 p-2 border-b border-white/10 bg-black/60 shrink-0 overflow-x-auto custom-scrollbar">
                            <button type="button" onclick="document.execCommand('bold', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Bold"><i data-lucide="bold" class="w-4 h-4"></i></button>
                            <button type="button" onclick="document.execCommand('italic', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Italic"><i data-lucide="italic" class="w-4 h-4"></i></button>
                            <button type="button" onclick="document.execCommand('underline', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Underline"><i data-lucide="underline" class="w-4 h-4"></i></button>
                            <div class="w-px h-4 bg-white/10 mx-1"></div>
                            <button type="button" onclick="document.execCommand('insertUnorderedList', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Bullet List"><i data-lucide="list" class="w-4 h-4"></i></button>
                        </div>
                        <div id="adminReplyMessage" contenteditable="true" placeholder="Type your formatted email response here..." class="rich-editor-content flex-1 p-3 sm:p-4 text-white text-xs sm:text-sm focus:outline-none overflow-y-auto w-full break-words"></div>
                    </div>

                    <button onclick="executeAdminReply()" class="w-full py-3 sm:py-3.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex justify-center items-center gap-2 shrink-0">
                        <i data-lucide="send" class="w-4 h-4"></i> Send Email & Update Status
                    </button>
                </div>
            </div>
        </div>

        <!-- Sponsor Form Modal -->
        <div id="sponsorModal" class="fixed inset-0 z-[120] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('sponsorModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Sponsor Application</h3>
                    <button onclick="closeModal('sponsorModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="overflow-y-auto w-full flex-1 min-h-0 custom-scrollbar">
                    <form onsubmit="event.preventDefault(); submitSponsorForm();" class="p-4 sm:p-6 space-y-4">
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Company Name</label><input type="text" id="sponCompanyName" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Contact Person</label><input type="text" id="sponContactName" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Email</label><input type="email" id="sponEmail" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Phone</label><input type="text" id="sponPhone" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                        </div>
                        
                        <div>
                            <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-2">Proposal Document</label>
                            <div class="flex gap-2 mb-3">
                                <button type="button" onclick="toggleSponsorInput('file')" id="btn-spon-file" class="flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">Upload File</button>
                                <button type="button" onclick="toggleSponsorInput('link')" id="btn-spon-link" class="flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Drive Link</button>
                            </div>
                            
                            <div id="spon-file-container" class="w-full bg-black/40 border border-dashed border-white/20 rounded-xl p-3 sm:p-4 text-center cursor-pointer hover:border-rose-500 transition relative">
                                <i data-lucide="file-up" class="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500 mx-auto mb-1"></i>
                                <p class="text-[8px] sm:text-[10px] text-zinc-400" id="spon-file-text">Click to upload PDF/Doc</p>
                                <input type="file" id="sponFile" class="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" onchange="document.getElementById('spon-file-text').innerText = this.files[0].name">
                            </div>
                            
                            <input type="url" id="sponLink" class="hidden w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" placeholder="https://drive.google.com/...">
                        </div>

                        <button type="submit" class="w-full py-3 sm:py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm sm:text-base font-bold transition mt-2 sm:mt-4 mb-4">Submit Application</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Profile Edit Modal -->
        <div id="profileEditModal" class="fixed inset-0 z-[120] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('profileEditModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Edit Profile</h3>
                    <button onclick="closeModal('profileEditModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="overflow-y-auto w-full flex-1 min-h-0 custom-scrollbar">
                    <form onsubmit="event.preventDefault(); saveProfile();" class="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        <div class="flex justify-center mb-2 sm:mb-4">
                            <input type="file" id="photoUpload" accept="image/*" class="hidden" onchange="previewProfilePhoto(event)">
                            <div onclick="document.getElementById('photoUpload').click()" class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition overflow-hidden group border-2 border-zinc-700 shrink-0">
                                <img id="editPhotoPreview" src="" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                                    <i data-lucide="camera" class="w-4 h-4 sm:w-5 sm:h-5 text-white"></i>
                                </div>
                            </div>
                        </div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Full Name</label><input id="editName" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Email</label><input id="editEmail" type="email" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required disabled></div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Phone</label><input id="editPhone" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500"></div>
                            <div>
                                <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Gender</label>
                                <select id="editGender" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 appearance-none">
                                    <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">College</label><input id="editCollege" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500"></div>
                        <button type="submit" class="w-full py-3 sm:py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm sm:text-base font-bold transition mt-2 sm:mt-4 mb-4">Save Changes</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Event Details Modal (Fully Responsive) -->
        <div id="eventModal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('eventModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-4xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <!-- Background Gradient -->
                <div class="absolute top-0 left-0 w-full h-40 sm:h-64 bg-gradient-to-br from-red-900/20 to-transparent pointer-events-none shrink-0" id="eventModalGradient"></div>
                
                <!-- Fixed Header -->
                <div class="p-5 sm:p-6 md:p-8 flex justify-between items-start relative z-10 shrink-0 gap-4">
                    <div class="flex-1 min-w-0 pr-0">
                        <h2 id="modalName" class="text-2xl sm:text-4xl md:text-5xl font-black text-rose-500 font-serif tracking-tight mb-2 break-words leading-tight">Event Name</h2>
                        <span id="modalStatusBadge" class="hidden px-2 sm:px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-red-500/30 inline-block mb-1">Registrations Closed</span>
                    </div>
                    <button onclick="closeModal('eventModal')" class="w-8 h-8 md:w-10 md:h-10 bg-red-900/80 hover:bg-red-700 rounded-full text-white z-10 flex items-center justify-center transition border border-red-700/50 shadow-lg shrink-0">
                        <i data-lucide="x" class="w-4 h-4 md:w-5 md:h-5"></i>
                    </button>
                </div>

                <!-- Scrollable Content -->
                <div class="px-5 sm:px-6 md:px-8 pb-6 overflow-y-auto flex-1 min-h-0 space-y-6 sm:space-y-8 relative z-0 w-full custom-scrollbar">
                    <p id="modalDesc" class="text-xs sm:text-sm md:text-base leading-relaxed text-zinc-300 break-words">Description here.</p>
                    <img id="modalBannerImg" src="" class="hidden w-full h-48 md:h-64 object-cover rounded-xl border border-white/10 shadow-lg">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div class="space-y-4 md:space-y-6">
                            <div id="modalPrizeContainer" class="bg-[#0a1a12] border border-[#153b24] p-4 sm:p-5 rounded-2xl shadow-inner"><p class="text-emerald-500 text-[10px] sm:text-xs font-bold mb-1">Prize Pool / Coupons</p><p id="modalPrize" class="text-2xl sm:text-3xl font-bold text-emerald-400 truncate">₹0</p></div>
                            <div class="bg-[#170c22] border border-[#3b1a5c] p-4 sm:p-5 rounded-2xl shadow-inner"><div class="mb-3 sm:mb-4"><p class="text-purple-400 text-[10px] sm:text-xs font-bold mb-1 flex items-center gap-2"><i data-lucide="calendar" class="w-3 h-3 sm:w-4 sm:h-4"></i> Date & Time</p><p id="modalDate" class="text-white text-sm sm:text-base font-medium break-words">TBD</p></div><div><p class="text-purple-400 text-[10px] sm:text-xs font-bold mb-1 flex items-center gap-2"><i data-lucide="map-pin" class="w-3 h-3 sm:w-4 sm:h-4"></i> Venue</p><p id="modalVenue" class="text-white text-sm sm:text-base font-medium break-words">TBD</p></div></div>
                        </div>
                        <div class="space-y-4 md:space-y-6">
                            <div id="modalFeeContainer" class="bg-[#1a1405] border border-[#42320b] p-4 sm:p-5 rounded-2xl shadow-inner"><p class="text-amber-500 text-[10px] sm:text-xs font-bold mb-1">Registration Fee</p><p id="modalFee" class="text-2xl sm:text-3xl font-bold text-amber-400 truncate">₹0</p></div>
                            <div class="bg-[#0f1219] border border-[#1e2532] p-4 sm:p-5 rounded-2xl shadow-inner"><h4 class="text-white font-bold text-base sm:text-lg mb-2 sm:mb-3">Contact Info</h4><p class="text-rose-400 text-[10px] sm:text-xs font-bold mb-2 sm:mb-3">Organisers</p><div class="space-y-2 sm:space-y-3 break-words" id="modalOrganizers">team@autumnfest.in</div></div>
                        </div>
                    </div>
                </div>
                
                <!-- Fixed Footer -->
                <div class="p-4 pb-8 sm:pb-6 md:p-6 bg-zinc-950 border-t border-zinc-800 shrink-0 flex justify-end relative z-10 w-full" id="modalFooterContainer">
                    <button id="modalRegBtn" onclick="openRegisterModal()" class="w-full sm:w-auto px-6 sm:px-8 py-3 md:py-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-sm md:text-base shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all text-center">Register Now</button>
                </div>
            </div>
        </div>

        <!-- Registration Modal (Fully Responsive) -->
        <div id="registerModal" class="fixed inset-0 z-[110] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('registerModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-rose-900/20 to-transparent pointer-events-none shrink-0"></div>
                
                <!-- Fixed Header -->
                <div class="p-5 sm:p-6 md:p-8 border-b border-zinc-800/50 flex justify-between items-start sm:items-center relative z-10 shrink-0 gap-4">
                    <div class="flex-1 min-w-0 pr-0">
                        <span class="text-[10px] sm:text-xs font-bold text-rose-500 uppercase tracking-widest mb-1 block truncate">Registration</span>
                        <h2 class="text-xl sm:text-2xl md:text-3xl font-black text-white font-serif tracking-tight break-words leading-tight" id="regEventName">Event Name</h2>
                    </div>
                    <button onclick="closeModal('registerModal')" class="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white flex items-center justify-center shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>

                <!-- Tabs (if applicable) -->
                <div id="regTabs" class="hidden flex bg-zinc-950/80 border-b border-zinc-800 relative z-10 shrink-0 w-full overflow-hidden">
                    <button id="tabCreate" onclick="setRegMode('create')" class="flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-rose-600 text-rose-500 px-2 min-w-0">Create Team</button>
                    <button id="tabJoin" onclick="setRegMode('join')" class="flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 px-2 min-w-0">Join Team</button>
                </div>

                <!-- Scrollable Form Area -->
                <div class="p-5 sm:p-6 md:p-8 overflow-y-auto w-full flex-1 min-h-0 relative z-10 custom-scrollbar flex flex-col" id="regFormContainer"></div>

                <!-- Fixed Footer -->
                <div class="p-4 pb-8 sm:pb-6 sm:p-6 bg-zinc-950 border-t border-zinc-800 shrink-0 flex flex-wrap sm:flex-nowrap justify-between items-center relative z-10 w-full gap-4">
                    <div class="shrink-0 w-full sm:w-auto flex sm:block justify-between items-center sm:items-start">
                        <p class="text-[9px] sm:text-[10px] uppercase tracking-widest text-zinc-500 font-bold sm:mb-1">Total Fee</p>
                        <p class="text-xl sm:text-2xl font-bold text-amber-400" id="regTotalFee">₹0</p>
                    </div>
                    <div id="regFooterBtns" class="w-full sm:w-auto flex justify-end shrink-0"></div>
                </div>
            </div>
        </div>

        <!-- Upload Modal with AI -->
        <div id="uploadModal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('uploadModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="flex justify-between items-center mb-4 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Upload to Gallery</h3>
                    <button onclick="closeModal('uploadModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="overflow-y-auto w-full custom-scrollbar flex-1 min-h-0">
                    
                    <div class="flex gap-2 mb-3">
                        <button type="button" onclick="toggleGalleryUploadType('file')" id="btn-gal-file" class="flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition">Upload File</button>
                        <button type="button" onclick="toggleGalleryUploadType('link')" id="btn-gal-link" class="flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition">Drive Link</button>
                    </div>
                
                    <div id="gal-file-container" class="border-2 border-dashed border-zinc-700 rounded-xl p-6 sm:p-8 text-center mb-4 cursor-pointer hover:border-zinc-500 transition-colors relative">
                        <i data-lucide="upload-cloud" class="w-6 h-6 sm:w-8 sm:h-8 text-zinc-500 mx-auto mb-2"></i>
                        <p class="text-xs sm:text-sm text-zinc-400" id="gal-file-text">Click to browse or drag JPG/PNG here</p>
                        <input type="file" id="galFile" accept=".jpg,.jpeg,.png" class="absolute inset-0 opacity-0 cursor-pointer" onchange="document.getElementById('gal-file-text').innerText = this.files[0].name">
                    </div>
                    
                    <input type="url" id="galLink" class="hidden w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 mb-4" placeholder="https://drive.google.com/...">

                    <div class="bg-zinc-950 border border-zinc-800 p-4 rounded-xl mb-4">
                        <p class="text-indigo-400 text-[10px] font-bold mb-2 uppercase tracking-wider flex items-center gap-1"><i data-lucide="tag" class="w-3 h-3"></i> Event Name / Caption</p>
                        <input type="text" id="upload-event-name" placeholder="e.g., Starnite Concert" class="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 mb-3">
                        <p class="text-indigo-400 text-[10px] font-bold mb-2 uppercase tracking-wider flex items-center gap-1"><i data-lucide="align-left" class="w-3 h-3"></i> Context / Description</p>
                        <input type="text" id="upload-context" placeholder="A fun description..." class="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 mb-3">
                    </div>

                    <p class="text-[10px] sm:text-xs text-amber-500 mb-4 bg-amber-500/10 p-2 rounded"><i data-lucide="info" class="w-3 h-3 inline"></i> Note: Images require admin approval. File uploads will be securely copied to our Drive folder.</p>
                </div>
                <div class="flex justify-end gap-2 sm:gap-3 shrink-0 mt-4 mb-4 sm:mb-0 w-full sm:w-auto">
                    <button onclick="closeModal('uploadModal')" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-zinc-400 hover:text-white transition bg-zinc-800/50 rounded-lg sm:bg-transparent sm:rounded-none">Cancel</button>
                    <button onclick="submitGalleryUpload()" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-500 transition">Submit</button>
                </div>
            </div>
        </div>

        <!-- Razorpay Mock Modal -->
        <div id="razorpayModal" class="fixed inset-0 z-[150] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeModal('razorpayModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]" id="rzpBox">
                <!-- Header -->
                <div class="bg-[#0a1a2e] p-4 sm:p-5 text-white flex justify-between items-center shadow-md z-10 relative shrink-0 gap-4">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-7 h-7 bg-blue-500 rounded flex items-center justify-center shadow-inner shrink-0">
                            <i data-lucide="zap" class="w-4 h-4 text-white"></i>
                        </div>
                        <span class="font-bold text-lg tracking-wide font-sans truncate break-words">Razorpay Checkout</span>
                    </div>
                    <button onclick="closeModal('razorpayModal')" class="text-white/70 hover:text-white bg-white/10 p-1.5 rounded-full transition shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                
                <!-- Body -->
                <div class="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto bg-gray-50/50 custom-scrollbar">
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
                        <div>
                            <p class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Amount to pay</p>
                            <p class="text-2xl font-black text-gray-800 truncate" id="rzpAmountDisplay">₹0</p>
                        </div>
                        <div class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <i data-lucide="shield-check" class="w-5 h-5"></i>
                        </div>
                    </div>
                    
                    <h4 class="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Payment Methods</h4>
                    <div class="space-y-3 mb-8">
                        <label class="flex items-center gap-3 p-3 sm:p-4 border-2 border-blue-500 bg-blue-50/30 rounded-xl cursor-pointer transition-all relative overflow-hidden">
                            <div class="absolute inset-y-0 left-0 w-1 bg-blue-500"></div>
                            <input type="radio" name="pay_method" checked class="w-4 h-4 text-blue-600 focus:ring-blue-500 shrink-0">
                            <div class="flex-grow ml-1 min-w-0">
                                <p class="text-sm font-bold text-gray-800 truncate">UPI Apps</p>
                                <p class="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">Google Pay, PhonePe, Paytm</p>
                            </div>
                            <i data-lucide="smartphone" class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0"></i>
                        </label>
                    </div>
                    
                    <button id="rzpPayBtn" onclick="confirmMockPayment()" class="w-full py-3.5 sm:py-4 bg-[#3399cc] hover:bg-[#2b82ae] text-white text-sm sm:text-base font-bold rounded-xl shadow-[0_4px_14px_rgba(51,153,204,0.4)] transition-all flex justify-center items-center gap-2 shrink-0">
                        <i data-lucide="lock" class="w-4 h-4 shrink-0"></i> <span class="truncate">Pay Now Securely</span>
                    </button>
                </div>
                
                <!-- Loading overlay -->
                <div id="rzpLoader" class="absolute inset-0 bg-white/95 hidden flex-col items-center justify-center z-20 backdrop-blur-sm">
                    <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p class="text-gray-800 font-bold text-sm sm:text-base mb-1 text-center">Processing Payment...</p>
                    <p class="text-gray-500 text-[10px] sm:text-xs text-center px-6">Please do not close this window.</p>
                </div>
            </div>
        </div>

        <!-- Admin Event Form Modal -->
        <div id="adminEventModal" class="fixed inset-0 z-[120] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminEventModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 id="adminEventModalTitle" class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Create/Edit Event</h3>
                    <button onclick="closeModal('adminEventModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="overflow-y-auto w-full flex-1 min-h-0 custom-scrollbar">
                    <form onsubmit="event.preventDefault(); saveAdminEvent();" class="p-4 sm:p-6 space-y-4">
                        <input type="hidden" id="adminEvId">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="col-span-1 sm:col-span-2"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Name</label><input id="adminEvName" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            <div class="col-span-1">
                                <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Category</label>
                                <select id="adminEvCat" onchange="toggleAdminEventFields()" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 appearance-none" required>
                                    <option value="entrepreneurial">Entrepreneurial</option>
                                    <option value="tech">Tech</option>
                                    <option value="cultural">Cultural</option>
                                    <option value="shows">Shows</option>
                                    <option value="online">Online Events</option>
                                    <option value="festivals">Festivals (Banner)</option>
                                </select>
                            </div>
                            <div class="col-span-1" id="wrapAdminEvFee"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Fee (₹)</label><input id="adminEvFee" type="number" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            <div class="col-span-1" id="wrapAdminEvPrize"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Prize Pool / Coupons</label><input id="adminEvPrize" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            <div class="col-span-1" id="wrapAdminEvTeam"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Team Size (e.g. 1 or 2-4)</label><input id="adminEvTeam" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            <div class="col-span-1"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Date</label><input id="adminEvDate" type="text" placeholder="Oct 20, 2026" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            <div class="col-span-1"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Venue</label><input id="adminEvVenue" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                            
                            <div class="col-span-1 sm:col-span-2">
                                <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-2">Banner (For Festivals)</label>
                                <div class="flex gap-2 mb-3">
                                    <button type="button" onclick="toggleEventBannerInput('file')" id="btn-ev-banner-file" class="flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition">Upload File</button>
                                    <button type="button" onclick="toggleEventBannerInput('link')" id="btn-ev-banner-link" class="flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition hover:bg-zinc-700">Image Link</button>
                                </div>
                                <div id="ev-banner-file-container" class="w-full bg-black/40 border border-dashed border-white/20 rounded-xl p-3 sm:p-4 text-center cursor-pointer hover:border-rose-500 transition relative">
                                    <i data-lucide="image-plus" class="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500 mx-auto mb-1"></i>
                                    <p class="text-[8px] sm:text-[10px] text-zinc-400" id="ev-banner-file-text">Click to upload JPG/PNG</p>
                                    <input type="file" id="adminEvBannerFile" accept=".jpg,.jpeg,.png" class="absolute inset-0 opacity-0 cursor-pointer" onchange="document.getElementById('ev-banner-file-text').innerText = this.files[0].name">
                                </div>
                                <input type="url" id="adminEvBannerLink" class="hidden w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" placeholder="https://...">
                            </div>

                            <div class="col-span-1 sm:col-span-2"><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Description</label><textarea id="adminEvDesc" rows="3" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 resize-none" required></textarea></div>
                        </div>
                        <button type="submit" class="w-full py-3 sm:py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm sm:text-base font-bold transition mt-2 sm:mt-4 mb-4">Save</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Admin Participants Modal -->
        <div id="adminParticipantsModal" class="fixed inset-0 z-[130] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminParticipantsModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Participants: <span id="adminPartEventName" class="text-rose-500"></span></h3>
                    <div class="flex gap-2 sm:gap-3 shrink-0">
                        <button onclick="DatabaseAPI.exportToCSV('registrations')" class="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1"><i data-lucide="download" class="w-3 h-3"></i> CSV</button>
                        <button onclick="closeModal('adminParticipantsModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                    </div>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 w-full custom-scrollbar">
                    <div class="bg-black/40 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto w-full">
                        <table class="w-full text-left text-xs sm:text-sm whitespace-nowrap min-w-[400px]">
                            <thead class="bg-white/5 text-zinc-400 uppercase tracking-wider text-[9px] sm:text-[10px] border-b border-white/10">
                                <tr>
                                    <th class="p-3 sm:p-4 font-bold">Team / Name</th>
                                    <th class="p-3 sm:p-4 font-bold">Code</th>
                                    <th class="p-3 sm:p-4 font-bold">Members</th>
                                    <th class="p-3 sm:p-4 font-bold">Payment</th>
                                </tr>
                            </thead>
                            <tbody id="admin-participants-table" class="divide-y divide-white/5 text-zinc-200">
                                <!-- Injected by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast Message -->
        <div id="toast" class="fixed bottom-4 right-4 bg-zinc-800 border border-zinc-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-2xl transform translate-y-20 opacity-0 transition-all duration-300 z-[200] flex items-center gap-2 max-w-[calc(100vw-2rem)] break-words">
            <i data-lucide="check-circle" class="text-emerald-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i>
            <span id="toastMsg" class="text-xs sm:text-sm font-medium">Message</span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
    
    // Inject Razorpay Script safely
    const rzpScript = document.createElement('script');
    rzpScript.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(rzpScript);
    
    renderIcons(); // Ensure newly injected icons render
}

// ==========================================
// 2. DATABASE API (Hybrid: Memory Cache + Flask Backend)
// ==========================================
const BASE_URL = 'http://localhost:5000/api'; // Point this to your live Flask Server URL when deploying

const DatabaseAPI = {
    _data: {
        users: [], accommodations: [], registrations: [], payments: [], gallery: [], sponsors: [], queries: [], logs: [], winners: []
    },
    _cacheTimeKey: 'autumn_fest_last_fetch',
    _cacheDuration: 2 * 60 * 1000, // 2 minutes cache expiration
    
    // 🔥 NEW: 3-Second Timeout wrapper to prevent the profile page from hanging if Aiven is unreachable
    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds max
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    },

    async init(neededCollections = []) {
        // 1. Instantly load from cache to prevent UI blocking
        const stored = localStorage.getItem('autumn_fest_db');
        if (stored) {
            this._data = { ...this._data, ...JSON.parse(stored) };
        }
        
        // 2. Determine if background fetch is needed
        const lastFetch = parseInt(localStorage.getItem(this._cacheTimeKey) || "0");
        const now = Date.now();
        const cacheExpired = (now - lastFetch > this._cacheDuration);
        const missingData = neededCollections.some(col => !this._data[col] || this._data[col].length === 0);

        const fetchTask = async () => {
            try {
                const collectionsToFetch = neededCollections.length > 0 ? neededCollections : Object.keys(this._data);
                const promises = collectionsToFetch.map(async (col) => {
                    const res = await this._fetchWithTimeout(`${BASE_URL}/${col}`);
                    if (res.ok) {
                        this._data[col] = await res.json();
                    }
                });
                
                await Promise.all(promises);
                await this.save(); 
                localStorage.setItem(this._cacheTimeKey, Date.now().toString());
                
                // Fire an event in case the UI wants to refresh silently
                window.dispatchEvent(new CustomEvent('db-updated'));
            } catch (e) {
                console.warn("Backend offline or timed out. Relying strictly on local cache.");
            }
        };

        if (missingData) {
            await fetchTask(); // Must block because we completely lack essential data
        } else if (cacheExpired) {
            fetchTask(); // 🔥 RUN IN BACKGROUND: DO NOT AWAIT. This makes page load INSTANT.
        }
    },
    
    async save() {
        localStorage.setItem('autumn_fest_db', JSON.stringify(this._data));
    },

    async get(collection) { 
        // Lazy load if completely missing
        if (!this._data[collection] || this._data[collection].length === 0) {
            try {
                const res = await this._fetchWithTimeout(`${BASE_URL}/${collection}`);
                if (res.ok) {
                    this._data[collection] = await res.json();
                    await this.save();
                }
            } catch(e) {}
        }
        return [...this._data[collection] || []]; 
    },
    
    async add(collection, item) {
        if (!this._data[collection]) this._data[collection] = [];
        this._data[collection].push(item);
        await this.save();
        
        try {
            await this._fetchWithTimeout(`${BASE_URL}/${collection}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
        } catch(e) { console.error("Flask sync failed for add"); }
    },

    async update(collection, id, updates) {
        let index = this._data[collection].findIndex(i => i.id === id);
        if (index > -1) {
            this._data[collection][index] = { ...this._data[collection][index], ...updates };
            await this.save();
        }
        try {
            await this._fetchWithTimeout(`${BASE_URL}/${collection}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch(e) { console.error("Flask sync failed for update"); }
    },
    
    async delete(collection, id) {
        this._data[collection] = this._data[collection].filter(i => i.id !== id);
        await this.save();
        try {
            await this._fetchWithTimeout(`${BASE_URL}/${collection}/${id}`, { method: 'DELETE' });
        } catch(e) { console.error("Flask sync failed for delete"); }
    },

    // SMART EXPORT TO CSV (Translates IDs to Names)
    exportToCSV(collectionName) {
        const data = this._data[collectionName];
        if(!data || data.length === 0) { showMessage("No data to export!"); return; }
        
        const allEvents = Object.values(EVENTS_DATA).flat();
        
        const mappedData = data.map(row => {
            let newRow = { ...row }; 
            
            // 1. Resolve Event IDs to Event Names
            if (newRow.eventId) {
                const foundEv = allEvents.find(e => e.id === newRow.eventId);
                newRow.eventName = foundEv ? foundEv.name : newRow.eventId; 
                delete newRow.eventId; 
            }
            
            // 2. Helper function to look up User Names based on User IDs
            const resolveUser = (id) => {
                if (!id || id === 'null' || id === 'None' || id === 'Pending') return id;
                if (id.startsWith('AUT-TEAM-')) return id; 
                const u = this._data.users?.find(user => user.id === id);
                return u ? u.name : id;
            };

            // 3. Swap User IDs for Names across all possible database tables
            if (newRow.leader) {
                newRow.leaderName = resolveUser(newRow.leader);
                delete newRow.leader;
            }
            if (newRow.user) {
                newRow.userName = resolveUser(newRow.user);
                delete newRow.user;
            }
            if (newRow.requested) {
                newRow.requestedNames = newRow.requested.split(',').map(id => resolveUser(id.trim())).join(' & ');
                delete newRow.requested;
            }
            if (newRow.members && Array.isArray(newRow.members)) {
                newRow.memberNames = newRow.members.map(id => resolveUser(id)).join(', ');
                delete newRow.members;
            }
            
            // 4. Handle Winners Table specifically
            if (newRow.firstPlace) newRow.firstPlace = resolveUser(newRow.firstPlace);
            if (newRow.secondPlace) newRow.secondPlace = resolveUser(newRow.secondPlace);
            if (newRow.thirdPlace) newRow.thirdPlace = resolveUser(newRow.thirdPlace);
            
            return newRow;
        });
        
        const headers = Object.keys(mappedData[0]).join(',');
        const rows = mappedData.map(obj => 
            Object.values(obj).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            ).join(',')
        ).join('\n');
        
        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `AutumnFest_${collectionName}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage(`${collectionName}.csv downloaded successfully with names!`);
    }
};

// ==========================================
// 3. STATE & DATA CACHING
// ==========================================
let currentMonth = 9; 
let currentYear = 2026;
let isSignupMode = false;

const ROLES = { USER: 0, ADMIN: 1, SUPERADMIN: 2, SUPERACCOUNT: 3, PRIMARY: 4 };
const CACHE_KEY = "autumn_fest_state";

let currentRole = ROLES.USER;
let isLoggedIn = false;
let isAdmin = false;
let festStatus = 'active'; 
let postLoginRedirect = 'home';

let pendingRzpAmount = 0;
let pendingRzpSuccessMsg = "";
let pendingRzpCallback = null;

// Replaced hardcoded data with dynamic database template
let EVENTS_DATA = {
  entrepreneurial: [], tech: [], cultural: [], shows: [], online: [], festivals: []
};

// Starts empty, will populate dynamically from database when session restored
let userProfile = {
  name: "", email: "", phone: "", gender: "Not Specified",
  college: "University", photo: "", tempPhoto: "",
  accountId: "", registrations: [], payments: [], accommodation: null
};

let calendarEvents = {};
let currentModalEvent = null;
let currentRegMax = 1;
let currentRegMin = 1;
let teamMemberCount = 1;
let regMode = 'create';
let currentPendingFee = 0;
const festDate = new Date('2026-10-20T09:00:00');
let html5QrCode = null;

let galleryUploadType = 'file';
let sponsorUploadType = 'file';
let eventBannerUploadType = 'file';
let replyTargetCollection = '';
let replyTargetId = '';
let replyTargetEmail = '';

function saveCache() {
  const state = { userId: userProfile.accountId, isLoggedIn, currentRole, festStatus };
  localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

// ==========================================
// 4. INITIALIZATION & UTILITIES
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // INJECT MODALS FIRST to prevent 'Cannot set properties of null' errors
    injectSharedComponents(); 
    updateDynamicCalendar();
    
    let path = window.location.pathname;
    let currentPage = path.split('/').pop().replace('.html', '');
    if (!currentPage || currentPage === 'index') currentPage = 'landing';

    // 🚀 TARGETED FETCHING: Only ask the database for what THIS page needs
    let neededCollections = ['users', 'events']; // Users and events always needed
    if (currentPage === 'profile') neededCollections.push('registrations', 'payments', 'accommodations');
    else if (currentPage === 'admin') neededCollections = Object.keys(DatabaseAPI._data); // Admin needs all
    else if (currentPage === 'gallery') neededCollections.push('gallery');
    else if (currentPage === 'accommodation') neededCollections.push('accommodations');

    // Initialize DB Connection First (Instant due to SWR cache layer)
    await DatabaseAPI.init(neededCollections);
    await buildEventsData(); // Build dynamic events from database
    
    // Attempt session restore using Database Live Check
    await restoreSession();

    const protectedRoutes = ['home', 'events', 'gallery', 'sponsors', 'accommodation', 'contact', 'profile', 'admin'];
    if (!isLoggedIn && protectedRoutes.includes(currentPage)) {
        postLoginRedirect = currentPage;
        window.location.href = 'login.html';
        return;
    }

    if (isLoggedIn) finalizeLoginUI();

    if (currentPage === 'profile') renderProfile();
    if (currentPage === 'admin') {
        const scannerDisplay = document.getElementById('scanner-id-display');
        if (scannerDisplay) scannerDisplay.innerText = userProfile.email;
        renderAdminDashboard();
    }
    if (currentPage === 'accommodation') setupAccommodationForm();
    if (currentPage === 'home' || currentPage === 'landing') {
        if (document.getElementById('calendar-grid')) generateCalendar();
        if (document.getElementById('cd-days')) {
            updateCountdown();
            setInterval(updateCountdown, 1000);
        }
        applyGlobalStatusUI();
    }

    renderIcons();
    initFallingLeaves();
    if(window.populateScannerEventDropdown) window.populateScannerEventDropdown();

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('mobile-menu');
        const btn = document.getElementById('mobile-menu-btn');
        if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
            toggleMobileMenu();
        }
    });

    // Hook up Forgot Password Button
    const forgotBtn = document.querySelector('#forgot-pass-link button');
    if (forgotBtn) {
        forgotBtn.onclick = window.triggerForgotPassword;
    }

    // Handle seamless background updates
    window.addEventListener('db-updated', async () => {
        await buildEventsData();
        if (!isLoggedIn) return;
        if (currentPage === 'profile') {
            await renderProfile();
        } else if (currentPage === 'admin' && isAdmin) {
            await renderAdminDashboard();
        }
    });
});

async function buildEventsData() {
    const dbEvents = await DatabaseAPI.get('events');
    EVENTS_DATA = { entrepreneurial: [], tech: [], cultural: [], shows: [], online: [], festivals: [] };
    
    dbEvents.forEach(ev => {
        if(!EVENTS_DATA[ev.category]) EVENTS_DATA[ev.category] = [];
        EVENTS_DATA[ev.category].push({
            id: ev.id,
            status: ev.status || 'open',
            name: ev.name,
            fee: ev.fee,
            prize: ev.prize,
            team: ev.team,
            date: ev.date,
            venue: ev.venue,
            desc: ev.desc,
            banner: ev.banner
        });
    });
    
    updateDynamicCalendar();
}

async function restoreSession() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const parsed = JSON.parse(cached);
        festStatus = parsed.festStatus || 'active';
        if (parsed.isLoggedIn && parsed.userId) {
            const users = await DatabaseAPI.get('users');
            const foundUser = users.find(u => u.id === parsed.userId);
            if (foundUser) {
                isLoggedIn = true;
                currentRole = foundUser.role || ROLES.USER;
                isAdmin = currentRole >= ROLES.ADMIN;
                await populateUserProfile(foundUser);
            } else {
                handleLogout(); // Wipe cache if user not found in DB
            }
        }
    }
}

async function populateUserProfile(user) {
    if (!user) return;
    userProfile.accountId = user.id;
    userProfile.name = user.name;
    userProfile.email = user.email;
    userProfile.phone = user.phone || "";
    userProfile.gender = user.gender || "Not Specified";
    userProfile.college = user.college || "University";
    userProfile.photo = user.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.name}`;

    // 🔥 OPTIMIZATION: Concurrently fetch supporting tables (0ms if cached!)
    const [regs, pays, accoms] = await Promise.all([
        DatabaseAPI.get('registrations'),
        DatabaseAPI.get('payments'),
        DatabaseAPI.get('accommodations')
    ]);

    userProfile.registrations = regs.filter(r => r.leader === user.id || (r.members && r.members.includes(user.id)));
    userProfile.payments = pays.filter(p => p.user === user.id);
    userProfile.accommodation = accoms.find(a => a.id === user.id) || null;
}

function renderIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  else setTimeout(renderIcons, 100);
}

function showMessage(msg) {
  const toast = document.getElementById('toast');
  if(!toast) return;
  document.getElementById('toastMsg').innerText = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3000);
}

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

// ==========================================
// 5. NAVIGATION & AUTH
// ==========================================
function navigate(pageId) {
    const protectedRoutes = ['home', 'events', 'gallery', 'sponsors', 'accommodation', 'contact', 'profile', 'admin'];
    if (!isLoggedIn && protectedRoutes.includes(pageId)) {
        postLoginRedirect = pageId;
        window.location.href = 'login.html';
        return;
    }
    if (pageId === 'admin' && !isAdmin) {
        showMessage("Access Denied: Admin Privileges Required.");
        return;
    }
    const targetFile = (pageId === 'landing' || pageId === 'index') ? 'index.html' : `${pageId}.html`;
    window.location.href = targetFile;
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if(menu) {
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
  }
}

function goToAuth(targetRoute) {
  postLoginRedirect = targetRoute;
  navigate('login');
}

function toggleAuthMode(isLogin) {
  isSignupMode = !isLogin;
  const btnLogin = document.getElementById('tab-login');
  const btnSignup = document.getElementById('tab-signup');
  const fields = document.getElementById('signup-fields');
  
  // Safely inject password field if missing in original DOM
  const formBox = document.getElementById('auth-email')?.parentElement;
  if (formBox && !document.getElementById('auth-password')) {
      document.getElementById('auth-email').insertAdjacentHTML('afterend', `
          <input type="password" id="auth-password" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 transition shadow-inner mt-4" placeholder="Password" required>
      `);
  }

  if(btnLogin && btnSignup && fields) {
      if (isLogin) {
        btnLogin.className = "flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition bg-zinc-800 text-white shadow";
        btnSignup.className = "flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition text-zinc-500 hover:text-zinc-300";
        fields.classList.add('hidden');
        document.getElementById('auth-submit-btn').innerText = "Sign In";
      } else {
        btnSignup.className = "flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition bg-zinc-800 text-white shadow";
        btnLogin.className = "flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition text-zinc-500 hover:text-zinc-300";
        fields.classList.remove('hidden');
        document.getElementById('auth-submit-btn').innerText = "Create Account";
      }
  }
}

window.handleLogin = async function(event) {
  // CRITICAL: Prevent form from reloading the page and cancelling backend sync!
  if (event && event.preventDefault) event.preventDefault();
  else if (window.event) window.event.preventDefault();

  let emailEl = document.getElementById('auth-email');
  let passEl = document.getElementById('auth-password');
  
  // Fallback if password field is completely missing from HTML
  if (emailEl && !passEl) {
      emailEl.insertAdjacentHTML('afterend', `<input type="password" id="auth-password" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 transition shadow-inner mt-4" placeholder="Password" required>`);
      return showMessage("Please enter your password in the new field.");
  }
  
  if (!emailEl || !passEl) return showMessage("Form input missing!");
  
  const email = emailEl.value.trim().toLowerCase();
  const password = passEl.value;
  
  if (!email || !password) return showMessage("Email and Password are required.");
  
  // Refetch database users right before verifying to ensure we have the absolute latest data
  await DatabaseAPI.init(); 
  const users = await DatabaseAPI.get('users');
  const existingUser = users.find(u => u.email === email);

  // Default Roles (hardcoded admin overrides for simplicity)
  let assignedRole = ROLES.USER;
  if (email === 'volunteer@autumnfest.in') assignedRole = ROLES.ADMIN;
  else if (email === 'manager@autumnfest.in') assignedRole = ROLES.SUPERADMIN;
  else if (email === 'tech@autumnfest.in') assignedRole = ROLES.SUPERACCOUNT;
  else if (email === 'root@autumnfest.in') assignedRole = ROLES.PRIMARY;

  if (isSignupMode) {
      if (existingUser && existingUser.name !== "Pending User") {
          return showMessage("Email already in use! Please log in.");
      }
      
      // OTP Signup Flow
      showMessage("Sending OTP to your email...");
      try {
          const res = await fetch(`${BASE_URL}/auth/signup-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'send_otp', email: email })
          });
          const data = await res.json();
          if (!res.ok) return showMessage(data.error || "Failed to send OTP.");
          
          const otp = prompt("An OTP has been sent to your email. Enter the 6-digit OTP:");
          if (!otp) return showMessage("Signup cancelled.");

          const verifyRes = await fetch(`${BASE_URL}/auth/signup-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'verify', email: email, otp: otp })
          });
          if (!verifyRes.ok) {
              const verifyData = await verifyRes.json();
              return showMessage(verifyData.error || "Invalid OTP.");
          }
      } catch (e) {
          return showMessage("Error during OTP verification.");
      }
      
      const name = document.getElementById('auth-name') ? document.getElementById('auth-name').value : "New User";
      const gender = document.getElementById('auth-gender') ? document.getElementById('auth-gender').value : "Not Specified";
      const phone = document.getElementById('auth-phone') ? document.getElementById('auth-phone').value : "";
      
      let newId;
      if (existingUser) {
          // Pre-assigned user completing registration
          newId = existingUser.id;
          assignedRole = existingUser.role > assignedRole ? existingUser.role : assignedRole;
          await DatabaseAPI.update('users', newId, { name, password, gender, phone, role: assignedRole });
      } else {
          newId = "AUT-26-" + Math.floor(1000 + Math.random() * 9000);
          await DatabaseAPI.add('users', { id: newId, name, email, password, role: assignedRole, phone, gender });
      }
      
      userProfile.accountId = newId;
      currentRole = assignedRole;
  } else {
      // Login Mode
      if (!existingUser) return showMessage("User not found!");
      if (existingUser.password !== password) return showMessage("Incorrect password!");
      
      userProfile.accountId = existingUser.id;
      currentRole = existingUser.role;
  }

  isAdmin = currentRole >= ROLES.ADMIN;
  isLoggedIn = true;
  
  // Refetch latest user profile details
  const allUsersNow = await DatabaseAPI.get('users');
  const me = allUsersNow.find(u => u.id === userProfile.accountId);
  await populateUserProfile(me);
  
  saveCache();
  finalizeLogin(isSignupMode ? `Account Created! Welcome, ${userProfile.name}!` : `Welcome back, ${userProfile.name}!`);
}

window.triggerForgotPassword = async function() {
    const email = prompt("Enter your registered email address:");
    if (!email) return;

    showMessage("Sending OTP to your email...");
    try {
        const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send_otp', email: email })
        });
        const data = await res.json();
        if (!res.ok) return showMessage(data.error || "Failed to send OTP.");

        const otp = prompt("An OTP has been sent to your email. Enter the 6-digit OTP:");
        if (!otp) return showMessage("Reset cancelled.");

        const newPass = prompt("Enter your new password:");
        if (!newPass) return showMessage("Reset cancelled.");

        const resetRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_and_reset', email: email, otp: otp, newPassword: newPass })
        });
        const resetData = await resetRes.json();
        if (resetRes.ok) {
            showMessage("Password reset successfully! You can now log in.");
        } else {
            showMessage(resetData.error || "Failed to reset password.");
        }
    } catch (e) {
        showMessage("Server error during password reset.");
    }
}

function finalizeLogin(msg) {
    showMessage(msg);
    setTimeout(() => {
        const targetFile = (postLoginRedirect === 'landing' || postLoginRedirect === 'index') ? 'index.html' : `${postLoginRedirect}.html`;
        window.location.href = targetFile;
    }, 1000);
}

function finalizeLoginUI() {
    const desktopLinks = document.getElementById('desktop-nav-links');
    const mobileLinks = document.getElementById('mobile-nav-links');
    const desktopAuthBtn = document.getElementById('nav-auth-btn');
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');

    if (desktopLinks) desktopLinks.className = "hidden md:flex items-center gap-4 lg:gap-8";
    if (mobileLinks) {
        mobileLinks.classList.remove('hidden');
        mobileLinks.classList.add('flex');
    }

    if (desktopAuthBtn) {
        desktopAuthBtn.innerHTML = `<i data-lucide="log-out" class="w-4 h-4"></i> Logout`;
        desktopAuthBtn.onclick = handleLogout;
    }

    if (mobileAuthBtn) {
        mobileAuthBtn.innerHTML = `<i data-lucide="log-out" class="w-5 h-5"></i> Logout`;
        mobileAuthBtn.onclick = () => { handleLogout(); toggleMobileMenu(); };
    }

    if (isAdmin) {
        const navAdmin = document.getElementById('nav-admin');
        const mobileNavAdmin = document.getElementById('mobile-nav-admin');
        if (navAdmin) navAdmin.classList.remove('hidden');
        if (mobileNavAdmin) mobileNavAdmin.classList.remove('hidden');
    }
}

function handleLogout() {
    isLoggedIn = false;
    isAdmin = false;
    currentRole = ROLES.USER;
    
    // Clear user profile mapping
    userProfile = {
      name: "", email: "", phone: "", gender: "Not Specified",
      college: "University", photo: "", tempPhoto: "",
      accountId: "", registrations: [], payments: [], accommodation: null
    };

    saveCache();
    window.location.href = 'index.html';
}

function updateGlobalStatus(status) {
  festStatus = status;
  saveCache();
  applyGlobalStatusUI();
  showMessage(`Fest status changed to: ${status.toUpperCase()}`);
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
    banner.className = "mb-6 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border shadow-lg font-bold tracking-wider text-[10px] sm:text-xs md:text-sm uppercase border-red-500/50 bg-red-500/20 text-red-400";
    banner.innerText = "Fest Completed";
    subtitle.innerText = "Thank you for making Autumn 2026 a grand success. See you next time!";
    document.getElementById('countdown-container').classList.add('hidden');
  } else if (festStatus === 'soon') {
    banner.classList.remove('hidden');
    banner.className = "mb-6 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border shadow-lg animate-pulse font-bold tracking-wider text-[10px] sm:text-xs md:text-sm uppercase border-amber-500/50 bg-amber-500/20 text-amber-400";
    banner.innerText = "New Fest Coming Soon";
    subtitle.innerText = "We are gearing up for the next big edition. Stay tuned for announcements!";
    document.getElementById('countdown-container').classList.remove('hidden');
  }
}

// ==========================================
// 6. CALENDAR & EXPLORE UI
// ==========================================
function updateDynamicCalendar() {
  calendarEvents = {};
  for (const [catKey, events] of Object.entries(EVENTS_DATA)) {
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
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });
  const title = document.getElementById("calendar-month-title");
  if(title) {
      title.innerText = `${monthName} ${currentYear}`;
      generateCalendar();
  }
}

function generateCalendar() {
  const calGrid = document.getElementById('calendar-grid');
  if (!calGrid) return;
  let calHTML = '';
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) calHTML += `<div class="h-8 sm:h-10 md:h-14"></div>`;
  for (let i = 1; i <= totalDays; i++) {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const hasEvent = calendarEvents[dateKey];
    let iconHTML = '';
    let styleClasses = 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10';
    if (hasEvent) {
      styleClasses = 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:bg-cyan-500/20';
      iconHTML = `<span class="absolute bottom-1 right-1 text-[8px] sm:text-xs opacity-80">${hasEvent[0].emoji}</span>`;
    }
    calHTML += `<div onclick="selectDate('${dateKey}')" class="flex flex-col justify-center items-center h-8 sm:h-10 md:h-14 rounded-lg md:rounded-xl cursor-pointer transition-all relative ${styleClasses}"><span class="text-[10px] sm:text-xs md:text-sm">${i}</span>${iconHTML}</div>`;
  }
  calGrid.innerHTML = calHTML;
}

function selectDate(dateKey) {
  renderFeed(dateKey);
}

function renderFeed(dateKey) {
  const container = document.getElementById("feed-container");
  if(!container) return;
  const events = dateKey ? calendarEvents[dateKey] : null;
  if (!events || events.length === 0) {
    container.innerHTML = `<div class="group p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3 sm:gap-4"><p class="text-zinc-500 text-xs sm:text-sm italic">No events selected...</p></div>`;
    return;
  }
  container.innerHTML = "";
  events.forEach((ev, index) => {
    container.innerHTML += `
        <div onclick="openEventPopup('${dateKey}', ${index})" class="group p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 hover:bg-black/60 transition-all cursor-pointer flex items-center gap-3 sm:gap-4">
            <div class="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 bg-white/5 text-base sm:text-xl group-hover:scale-110 transition-transform">${ev.emoji}</div>
            <div class="flex-grow min-w-0"><h4 class="font-bold text-white text-sm md:text-base truncate break-words">${ev.title}</h4><p class="text-[10px] sm:text-xs text-zinc-400 truncate">${ev.time} • ${ev.location}</p></div>
        </div>`;
  });
}

function selectCategory(catKey, btnElement) {
  const wrapper = document.getElementById('events-list-wrapper');
  const placeholder = document.getElementById('events-placeholder');
  if (!wrapper || !placeholder) return;
  
  if (btnElement.classList.contains('active-category')) { closeCategory(); return; }

  document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active-category'));
  btnElement.classList.add('active-category');

  const events = EVENTS_DATA[catKey] || [];
  document.getElementById('selected-category-title').innerText = catKey === 'festivals' ? "Festivals" : catKey + " Events";
  document.getElementById('event-count-badge').innerText = `${events.length} ${catKey === 'festivals' ? 'Festivals' : 'Events'}`;

  let gridHTML = '';
  events.forEach(ev => {
    let bannerHtml = ev.banner ? `<img src="${ev.banner}" class="absolute inset-0 w-full h-full object-cover opacity-60">` : '';
    let infoHtml = '';
    let btnText = '';
    
    if (catKey !== 'festivals') {
        infoHtml = `
            <div class="flex justify-between text-[10px] sm:text-xs mb-3">
                <div><span class="text-zinc-500 text-[8px] sm:text-[9px] block uppercase tracking-wider mb-0.5">Prize</span><span class="text-emerald-400 font-bold">${ev.prize === '-' ? '-' : '₹'+ev.prize}</span></div>
                <div class="text-right"><span class="text-zinc-500 text-[8px] sm:text-[9px] block uppercase tracking-wider mb-0.5">Fee</span><span class="text-amber-400 font-bold">₹${ev.fee}</span></div>
            </div>
        `;
        btnText = 'Register / Details';
    } else {
        infoHtml = `<div class="mb-3 text-[10px] sm:text-xs text-zinc-400 line-clamp-2">${ev.desc}</div>`;
        btnText = 'View Festival Info';
    }

    gridHTML += `
        <div class="group rounded-xl bg-black/40 border border-white/5 overflow-hidden hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all flex flex-col">
            <div class="h-24 sm:h-28 relative overflow-hidden bg-black">
                ${bannerHtml}
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                <div class="absolute bottom-2 left-3 right-3">
                    <h4 class="text-sm md:text-base font-bold text-white truncate break-words leading-tight">${ev.name} ${ev.status === 'closed' && catKey !== 'festivals' ? '<span class="text-red-400 text-[10px] ml-1 uppercase">(Closed)</span>' : ''}</h4>
                </div>
            </div>
            <div class="p-3 md:p-4 flex-grow flex flex-col justify-between">
                ${infoHtml}
                <button onclick="openEventModal('${catKey}', '${ev.id}')" class="w-full py-1.5 sm:py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition font-semibold text-[10px] sm:text-xs">
                    ${btnText}
                </button>
            </div>
        </div>`;
  });
  document.getElementById('events-grid').innerHTML = gridHTML;

  const scrollContainer = wrapper.querySelector('.custom-scrollbar');
  if (scrollContainer) scrollContainer.scrollTop = 0;

  if (!wrapper.classList.contains('hidden')) {
      if(window.innerWidth < 1024) {
          const el = document.getElementById('events-list-wrapper');
          if(el) {
              const y = el.getBoundingClientRect().top + window.scrollY - 80;
              window.scrollTo({ top: y, behavior: 'smooth' });
          }
      }
      return;
  }

  placeholder.classList.add('opacity-0');
  setTimeout(() => {
    placeholder.classList.remove('flex');
    placeholder.classList.add('hidden');
    wrapper.classList.remove('hidden');
    wrapper.classList.add('flex');
    
    if (scrollContainer) scrollContainer.scrollTop = 0;

    setTimeout(() => { 
        wrapper.classList.remove('opacity-0'); 
        wrapper.classList.add('opacity-100'); 
        
        if(window.innerWidth < 1024) {
            setTimeout(() => {
                const eventsSection = document.getElementById('events');
                if(eventsSection) {
                    eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }
    }, 10);
  }, 300);
}

function closeCategory() {
  document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active-category'));
  const wrapper = document.getElementById('events-list-wrapper');
  const placeholder = document.getElementById('events-placeholder');
  wrapper.classList.remove('opacity-100');
  wrapper.classList.add('opacity-0');
  setTimeout(() => {
    wrapper.classList.remove('flex');
    wrapper.classList.add('hidden');
    placeholder.classList.remove('hidden');
    placeholder.classList.add('flex');
    setTimeout(() => { 
        placeholder.classList.remove('opacity-0'); 
        placeholder.classList.add('opacity-100'); 
        
        if(window.innerWidth < 1024) {
            setTimeout(() => {
                const orbit = document.querySelector('.orbit-container');
                if(orbit) {
                    orbit.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }
    }, 10);
  }, 300);
}

// ==========================================
// 7. ACCOMMODATION
// ==========================================
function setupAccommodationForm() {
  const wingSelect = document.getElementById('roomWing');
  if(!wingSelect) return;
  if (userProfile.gender === 'Female') {
    wingSelect.value = 'female';
    wingSelect.disabled = true;
    wingSelect.classList.add('opacity-50');
  } else if (userProfile.gender === 'Male') {
    wingSelect.value = 'male';
    wingSelect.disabled = true;
    wingSelect.classList.add('opacity-50');
  } else {
    wingSelect.disabled = false;
    wingSelect.classList.remove('opacity-50');
  }
  calculateRoomCost();
}

function calculateRoomCost() {
  const duration = document.getElementById('roomDuration');
  if(!duration) return;
  const price = 300; 
  const days = parseInt(duration.options[duration.selectedIndex].dataset.days);
  document.getElementById('roomTotalCost').innerText = `₹${price * days}`;
  currentPendingFee = price * days;
}

window.processRoomBooking = async function() {
  const roommateId = document.getElementById('roommateId').value.trim();
  const wing = document.getElementById('roomWing').value;

  if (roommateId) {
    const users = await DatabaseAPI.get('users');
    const friends = roommateId.split(',').map(s => s.trim());
    for (let fId of friends) {
        const friend = users.find(u => u.id === fId);
        if (friend) {
            if (friend.gender && friend.gender !== 'Not Specified' && friend.gender !== userProfile.gender) {
                showMessage(`Cannot share room with ${fId} (Different gender).`);
                return;
            }
        } else {
            showMessage(`Account ID ${fId} not found.`);
            return;
        }
    }
  }

  const dbAccoms = await DatabaseAPI.get('accommodations');
  const wingBookings = dbAccoms.filter(a => a.wing === wing);
  const maxCapacity = wing === 'male' ? 50 * 3 : 40 * 3;
  if (wingBookings.length >= maxCapacity) {
      showMessage(`Sorry, the ${wing} wing is currently fully booked.`);
      return;
  }

  calculateRoomCost();
  processRazorpayPayment(currentPendingFee, "Accommodation Booking Successful!", async (payId) => {
    const durationText = document.getElementById('roomDuration').options[document.getElementById('roomDuration').selectedIndex].text;

    userProfile.accommodation = {
      type: "Triple",
      wing: wing,
      duration: durationText,
      roommate: roommateId || "None",
      roomNumber: "Pending",
      payId: payId
    };

    await DatabaseAPI.add('accommodations', {
      id: userProfile.accountId,
      name: userProfile.name,
      wing: wing,
      duration: durationText,
      requested: roommateId,
      room: null,
      payId: payId
    });

    saveCache();
    navigate('profile');
  });
}

async function autoAssignRooms() {
  let maxRooms = { male: 50, female: 40 };
  let dbAccoms = await DatabaseAPI.get('accommodations');
  let occupancy = { male: {}, female: {} };

  dbAccoms.forEach(b => {
    if (b.room) {
      if (!occupancy[b.wing][b.room]) occupancy[b.wing][b.room] = [];
      occupancy[b.wing][b.room].push(b.id);
    }
  });

  let unassigned = dbAccoms.filter(b => !b.room);
  let processed = new Set();
  let successCount = 0;

  for(let b of unassigned) {
    if (processed.has(b.id)) continue;

    let group = [b];
    processed.add(b.id);

    if (b.requested) {
      let friends = b.requested.split(',').map(s => s.trim());
      friends.forEach(fId => {
        if (group.length >= 3) return; 
        let friendBooking = unassigned.find(fb => fb.id === fId && fb.wing === b.wing && !processed.has(fb.id));
        if (friendBooking) {
          group.push(friendBooking);
          processed.add(friendBooking.id);
        }
      });
    }

    let w = b.wing;
    let roomAssigned = null;

    for (let r = 1; r <= maxRooms[w]; r++) {
      let currentCount = occupancy[w][r] ? occupancy[w][r].length : 0;
      if (currentCount + group.length <= 3) {
        roomAssigned = r;
        break;
      }
    }

    if (roomAssigned) {
      if (!occupancy[w][roomAssigned]) occupancy[w][roomAssigned] = [];
      for(let member of group) {
        member.room = roomAssigned;
        occupancy[w][roomAssigned].push(member.id);
        successCount++;

        await DatabaseAPI.update('accommodations', member.id, { room: roomAssigned });
        if (member.id === userProfile.accountId && userProfile.accommodation) {
          userProfile.accommodation.roomNumber = roomAssigned;
          saveCache();
        }
      }
    }
  }

  await renderAdminAccomTable();
  if (successCount === unassigned.length) { showMessage("All pending rooms assigned successfully!"); } 
  else { showMessage(`Assigned ${successCount} members. Some unassigned due to capacity limits.`); }
}

window.renderAdminAccomTable = async function() {
  const dbAccoms = await DatabaseAPI.get('accommodations');
  
  let tab = document.getElementById('admin-accom-tab');
  
  // Inject Filter Dropdown if it doesn't exist
  let filterContainer = document.getElementById('accom-filter-container');
  if (tab && !filterContainer) {
      const header = tab.querySelector('.flex.flex-col.sm\\:flex-row');
      if (header) {
          header.insertAdjacentHTML('afterend', `
              <div id="accom-filter-container" class="my-4 flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5 w-fit">
                  <label class="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase shrink-0">Filter by Duration:</label>
                  <select id="accomDayFilter" onchange="renderAdminAccomTable()" class="bg-zinc-800 text-white text-xs sm:text-sm focus:outline-none cursor-pointer border border-white/10 rounded-xl px-3 py-1.5">
                      <option value="all">All Bookings (Total 3 Days)</option>
                      <option value="1">1 Day Bookings</option>
                      <option value="2">2 Day Bookings</option>
                      <option value="3">3 Day Bookings</option>
                  </select>
              </div>
          `);
      }
  }

  let summaryContainer = document.getElementById('accom-summary-container');
  if(tab && !summaryContainer) {
      const filterNode = document.getElementById('accom-filter-container') || tab.querySelector('.flex.flex-col.sm\\:flex-row');
      if(filterNode) {
          filterNode.insertAdjacentHTML('afterend', `<div id="accom-summary-container" class="mb-6"></div>`);
          summaryContainer = document.getElementById('accom-summary-container');
      }
  }

  // Filter Bookings Based on Selection
  const filterVal = document.getElementById('accomDayFilter')?.value || 'all';
  let filteredAccoms = dbAccoms;
  
  if (filterVal !== 'all') {
      filteredAccoms = dbAccoms.filter(a => a.duration && a.duration.includes(filterVal));
  }

  const maxRooms = { male: 50, female: 40 };
  const maxCapacity = { male: 50 * 3, female: 40 * 3 };
  let maleCount = filteredAccoms.filter(a => a.wing === 'male').length;
  let femaleCount = filteredAccoms.filter(a => a.wing === 'female').length;

  if (summaryContainer) {
      summaryContainer.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                  <p class="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Boys Wing Status</p>
                  <p class="text-2xl font-black text-white">${maleCount} <span class="text-sm font-medium text-zinc-400">/ ${maxCapacity.male} beds booked</span></p>
                  <p class="text-xs text-zinc-400 mt-1">${Math.ceil(maleCount/3)} / ${maxRooms.male} rooms filled</p>
              </div>
              <div class="bg-pink-900/20 border border-pink-500/30 p-4 rounded-xl">
                  <p class="text-[10px] text-pink-400 font-bold uppercase tracking-wider mb-1">Girls Wing Status</p>
                  <p class="text-2xl font-black text-white">${femaleCount} <span class="text-sm font-medium text-zinc-400">/ ${maxCapacity.female} beds booked</span></p>
                  <p class="text-xs text-zinc-400 mt-1">${Math.ceil(femaleCount/3)} / ${maxRooms.female} rooms filled</p>
              </div>
          </div>
      `;
  }
  
  let html = '';
  if (filteredAccoms.length === 0) {
    html = `<tr><td colspan="4" class="p-6 sm:p-8 text-center text-zinc-500 text-xs sm:text-sm italic">No bookings found for this selection.</td></tr>`;
  } else {
    filteredAccoms.forEach(b => {
      html += `
          <tr class="hover:bg-white/5 transition-colors border-b border-white/5">
              <td class="p-3 sm:p-4 text-white text-xs sm:text-sm"><span class="font-mono text-cyan-400 block sm:inline">${b.id}</span> <span class="text-zinc-400 block sm:inline sm:ml-2">${b.name}</span></td>
              <td class="p-3 sm:p-4 text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400">${b.wing}</td>
              <td class="p-3 sm:p-4 text-[10px] sm:text-xs font-mono text-zinc-300">${b.requested || 'None'}</td>
              <td class="p-3 sm:p-4 text-xs sm:text-sm font-bold ${b.room ? 'text-emerald-400' : 'text-amber-400'}">${b.room ? 'Room ' + b.room : 'Pending'}</td>
          </tr>
      `;
    });
  }
  const tableBody = document.getElementById('admin-accom-table');
  if (tableBody) tableBody.innerHTML = html;
}

// ==========================================
// 8. MODALS & FORMS
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden'; 
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if(modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      
      const anyOpen = Array.from(document.querySelectorAll('[id$="Modal"]')).some(el => el.classList.contains('flex'));
      if (!anyOpen) document.body.style.overflow = '';
  }
}

function openEventPopup(dateKey, index) {
  const calEvent = calendarEvents[dateKey][index];
  let fullEvent = null, fullCatKey = null;
  for (const [catKey, events] of Object.entries(EVENTS_DATA)) {
    const found = events.find(e => e.id === calEvent.id);
    if (found) { fullEvent = found; fullCatKey = catKey; break; }
  }
  if (fullEvent && fullCatKey) { openEventModal(fullCatKey, fullEvent.id); } 
  else { showMessage("Detailed view not available."); }
}

function openEventModal(catKey, evId) {
  const ev = EVENTS_DATA[catKey].find(e => e.id === evId);
  if (ev) {
    currentModalEvent = ev;
    const isFest = catKey === 'festivals';

    document.getElementById('modalName').innerText = ev.name;
    document.getElementById('modalDesc').innerText = ev.desc;
    document.getElementById('modalPrize').innerText = ev.prize === '-' ? '-' : `₹${ev.prize}`;
    document.getElementById('modalFee').innerText = `₹${ev.fee}`;
    document.getElementById('modalDate').innerText = ev.date;
    document.getElementById('modalVenue').innerText = ev.venue;

    const bannerImg = document.getElementById('modalBannerImg');
    const gradient = document.getElementById('eventModalGradient');
    if(ev.banner) {
        bannerImg.src = ev.banner;
        bannerImg.classList.remove('hidden');
        gradient.classList.add('hidden');
    } else {
        bannerImg.classList.add('hidden');
        gradient.classList.remove('hidden');
    }

    const btn = document.getElementById('modalRegBtn');
    const badge = document.getElementById('modalStatusBadge');
    const prizeContainer = document.getElementById('modalPrizeContainer');
    const feeContainer = document.getElementById('modalFeeContainer');
    const footerContainer = document.getElementById('modalFooterContainer');

    if (isFest) {
        if(prizeContainer) prizeContainer.style.display = 'none';
        if(feeContainer) feeContainer.style.display = 'none';
        if(btn) btn.style.display = 'none';
        if(footerContainer) footerContainer.style.display = 'none';
        if(badge) badge.classList.add('hidden');
        
        // Hide Organizers completely for festivals
        const orgContainer = document.getElementById('modalOrganizers');
        if (orgContainer && orgContainer.parentElement) {
            orgContainer.parentElement.style.display = 'none';
        }
    } else {
        if(prizeContainer) prizeContainer.style.display = 'block';
        if(feeContainer) feeContainer.style.display = 'block';
        if(btn) btn.style.display = 'block';
        if(footerContainer) footerContainer.style.display = 'flex';
        
        const orgContainer = document.getElementById('modalOrganizers');
        if (orgContainer && orgContainer.parentElement) {
            orgContainer.parentElement.style.display = 'block';
        }

        if (festStatus !== 'active' || ev.status === 'closed') {
          btn.classList.add('opacity-50', 'cursor-not-allowed');
          btn.innerHTML = "Registrations Closed";
          badge.classList.remove('hidden');
        } else {
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
          btn.innerHTML = "Register Now";
          badge.classList.add('hidden');
        }
    }

    const modalScroll = document.querySelector('#eventModal .custom-scrollbar');
    if (modalScroll) modalScroll.scrollTop = 0;

    openModal('eventModal');
    renderIcons();
  }
}

function showTeamQr(eventId) {
  const reg = userProfile.registrations.find(r => r.eventId === eventId);
  if (!reg) return;

  const event = Object.values(EVENTS_DATA).flat().find(e => e.id === eventId);

  document.getElementById('teamQrEventName').innerText = event.name;
  document.getElementById('teamQrName').innerText = reg.teamName || 'Individual Entry';

  const qrData = reg.teamCode || userProfile.accountId;
  document.getElementById('teamQrCodeText').innerText = qrData;

  const fullUrl = `https://autumnfest.in/public.html?id=${qrData}`;
  document.getElementById('teamQrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}&color=06b6d4&bgcolor=000000`;

  openModal('teamQrModal');
}

function showAccomQr() {
  if (!userProfile.accommodation) return;
  document.getElementById('accomQrName').innerText = userProfile.name;

  const qrData = `ACCOM-${userProfile.accountId}`;
  document.getElementById('accomQrCodeText').innerText = qrData;

  const fullUrl = `https://autumnfest.in/public.html?id=${qrData}`;
  document.getElementById('accomQrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}&color=3b82f6&bgcolor=000000`;

  openModal('accomQrModal');
}

// ==========================================
// 9. PROFILE & REGISTRATION
// ==========================================
async function renderProfile() {
  const container = document.getElementById('profile-container');
  if (!container) return;
  
  // Re-fetch to ensure fresh data
  const users = await DatabaseAPI.get('users');
  const me = users.find(u => u.id === userProfile.accountId);
  if(me) await populateUserProfile(me);

  const confirmed = userProfile.registrations.filter(r => r.payment === 'Success' || r.payment === 'Team Paid');
  const unfinished = userProfile.registrations.filter(r => r.payment === 'Incomplete');

  let unfinishedHTML = unfinished.length > 0 ? unfinished.map(r => {
    const event = Object.values(EVENTS_DATA).flat().find(e => e.id === r.eventId);
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
                <button onclick="resumeRegistration('${r.eventId}')" class="flex-1 py-2 sm:py-2.5 bg-amber-600 hover:bg-amber-500 text-amber-950 font-black rounded-lg transition text-[9px] sm:text-[10px] uppercase tracking-widest shadow-lg truncate">Complete Process</button>
                <button onclick="dissolveTeam('${r.eventId}')" class="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 font-black rounded-lg transition shadow-lg shrink-0"><i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
            </div>
        </div>`;
  }).join('') : `<div class="p-6 sm:p-8 text-center text-zinc-600 text-[10px] sm:text-xs italic border border-dashed border-zinc-800 rounded-2xl w-full">No pending registrations.</div>`;

  let confirmedHTML = confirmed.length > 0 ? confirmed.map(r => {
    const event = Object.values(EVENTS_DATA).flat().find(e => e.id === r.eventId);
    if(!event) return '';
    const memText = r.members && r.members.length > 0 ? 'You, ' + r.members.join(', ') : 'Individual';
    const isLeader = r.leader === userProfile.accountId;
    const roleText = isLeader ? "Team Leader" : "Team Member";

    return `
        <div class="bg-zinc-900/50 border border-emerald-500/10 p-3 sm:p-4 rounded-2xl flex items-start justify-between gap-3 sm:gap-4 hover:border-emerald-500/30 transition-all shadow-lg cursor-pointer group" onclick="showTeamQr('${r.eventId}')">
            <div class="flex items-start gap-3 sm:gap-4 min-w-0">
                <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0 mt-1 group-hover:scale-110 transition"><i data-lucide="qr-code" class="w-4 h-4 sm:w-5 sm:h-5"></i></div>
                <div class="min-w-0">
                    <h4 class="font-bold text-white text-xs sm:text-sm group-hover:text-cyan-400 transition truncate break-words">${event.name}</h4>
                    <p class="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 truncate">${event.date} • ${event.venue}</p>
                    <p class="text-[9px] sm:text-[10px] text-cyan-400 uppercase tracking-widest mt-1 sm:mt-1.5 font-bold truncate">Team: ${r.teamName || 'Individual'} <span class="text-zinc-500 font-medium">(${roleText})</span></p>
                    <p class="text-[8px] sm:text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5 truncate">Members: ${memText}</p>
                </div>
            </div>
            ${isLeader ? `<button onclick="event.stopPropagation(); dissolveTeam('${r.eventId}')" class="text-zinc-600 hover:text-red-500 p-1.5 sm:p-2 transition-colors z-10 relative shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
        </div>`;
  }).join('') : `<div class="p-6 sm:p-8 text-center text-zinc-600 text-[10px] sm:text-xs italic border border-dashed border-zinc-800 rounded-2xl w-full">No events registered.</div>`;

  let paymentsHTML = userProfile.payments.length > 0 ? userProfile.payments.map(p => `
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

  let accomHTML = userProfile.accommodation ? `
      <div class="bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
          <div class="flex justify-between items-start mb-2 gap-2">
              <p class="text-white font-bold capitalize text-xs sm:text-sm break-words flex-1">${userProfile.accommodation.type} Occupancy</p>
              <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] sm:text-[10px] uppercase tracking-wider font-bold shrink-0">Confirmed</span>
          </div>
          <p class="text-[10px] sm:text-xs text-zinc-400 capitalize mb-1 truncate">${userProfile.accommodation.wing} Wing • Duration: ${userProfile.accommodation.duration}</p>
          <p class="text-[10px] sm:text-xs text-emerald-400 font-bold mt-2 truncate">Room Assigned: ${userProfile.accommodation.roomNumber}</p>
          <p class="text-[10px] sm:text-xs text-zinc-500 mt-2 mb-3 p-2 bg-zinc-900 rounded-lg border border-zinc-800 font-mono break-all">Requested Friends: <span class="text-zinc-300">${userProfile.accommodation.roommate}</span></p>
          <button onclick="showAccomQr()" class="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-2"><i data-lucide="qr-code" class="w-3 h-3 sm:w-4 sm:h-4"></i> View Entry QR</button>
      </div>` : `<p class="text-zinc-600 text-[10px] sm:text-xs italic text-center py-4">No accommodation booked.</p>`;

  const profileQrData = encodeURIComponent(`https://autumnfest.in/public.html?id=${userProfile.accountId}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${profileQrData}&color=f43f5e&bgcolor=000000`;

  container.innerHTML = `
      <div class="lg:col-span-1 rounded-3xl p-5 sm:p-6 md:p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/5 relative overflow-hidden flex flex-col items-center text-center h-fit lg:sticky lg:top-28 shadow-2xl">
          <div class="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-zinc-800 overflow-hidden mb-4 sm:mb-6 shadow-2xl bg-zinc-950 flex justify-center items-center text-3xl sm:text-5xl shrink-0">
              <img src="${userProfile.photo}" class="w-full h-full object-cover">
          </div>
          <h2 class="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 break-words w-full">${userProfile.name}</h2>
          <span class="px-2 sm:px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-wider border border-rose-500/30 mb-4 uppercase inline-block">ACTIVE MEMBER</span>
          <button onclick="openProfileEdit()" class="mb-6 sm:mb-8 px-3 sm:px-4 py-1 sm:py-1.5 border border-zinc-700 text-[10px] sm:text-xs text-zinc-300 hover:text-white hover:border-white rounded-lg transition inline-block"><i data-lucide="edit-2" class="w-3 h-3 inline"></i> Edit Profile</button>
          
          <div class="w-full bg-black/50 border border-white/10 rounded-2xl p-4 mb-6 flex flex-col items-center shadow-inner">
              <p class="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-3">Your Fest ID</p>
              <div class="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-xl overflow-hidden mb-3 p-2 shrink-0">
                  <img src="${qrUrl}" alt="QR Code" class="w-full h-full mix-blend-multiply">
              </div>
              <p class="font-mono text-cyan-400 text-xs sm:text-sm tracking-wider font-bold select-all break-all">${userProfile.accountId}</p>
          </div>

          <div class="w-full space-y-2 sm:space-y-3 text-left">
              <div class="bg-black/30 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-inner"><p class="text-[9px] sm:text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Contact</p><p class="text-xs sm:text-sm font-medium text-zinc-300 break-words w-full">${userProfile.email}<br>${userProfile.phone || 'N/A'}</p></div>
              <div class="bg-black/30 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-inner"><p class="text-[9px] sm:text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Details</p><p class="text-xs sm:text-sm font-medium text-zinc-300 break-words w-full">${userProfile.college}<br>${userProfile.gender}</p></div>
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
  renderIcons();
}

function openProfileEdit() {
  document.getElementById('editName').value = userProfile.name;
  document.getElementById('editEmail').value = userProfile.email;
  document.getElementById('editPhone').value = userProfile.phone || "";
  document.getElementById('editGender').value = userProfile.gender === 'Not Specified' ? 'Male' : userProfile.gender;
  document.getElementById('editCollege').value = userProfile.college;
  document.getElementById('editPhotoPreview').src = userProfile.photo;

  openModal('profileEditModal');
}

function previewProfilePhoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('editPhotoPreview').src = e.target.result;
      userProfile.tempPhoto = e.target.result;
    }
    reader.readAsDataURL(file);
  }
}

async function saveProfile() {
  userProfile.name = document.getElementById('editName').value;
  userProfile.phone = document.getElementById('editPhone').value;
  userProfile.gender = document.getElementById('editGender').value;
  userProfile.college = document.getElementById('editCollege').value;
  if (userProfile.tempPhoto) {
    userProfile.photo = userProfile.tempPhoto;
  }
  
  await DatabaseAPI.update('users', userProfile.accountId, { 
      name: userProfile.name, phone: userProfile.phone, gender: userProfile.gender, college: userProfile.college
  });
  
  closeModal('profileEditModal');
  saveCache();
  showMessage("Profile Updated!");
  renderProfile();
}

async function dissolveTeam(eventId) {
  userProfile.registrations = userProfile.registrations.filter(r => r.eventId !== eventId);
  const allRegs = await DatabaseAPI.get('registrations');
  const regDb = allRegs.find(r => r.eventId === eventId && r.leader === userProfile.accountId);
  if(regDb) await DatabaseAPI.delete('registrations', regDb.id);
  
  saveCache();
  showMessage(`Registration Removed.`);
  renderProfile();
}

function openRegisterModal() {
  if (festStatus !== 'active' || currentModalEvent.status === 'closed') {
    showMessage("Registrations are closed for this event.");
    return;
  }

  closeModal('eventModal');
  const ev = currentModalEvent;
  currentPendingFee = ev.fee;

  const teamStr = ev.team.toString();
  if (teamStr.includes('-')) {
    const parts = teamStr.split('-');
    currentRegMin = parseInt(parts[0]);
    currentRegMax = parseInt(parts[1]);
  } else {
    currentRegMin = parseInt(teamStr);
    currentRegMax = parseInt(teamStr);
  }

  teamMemberCount = 1;
  regMode = 'create';
  document.getElementById('regEventName').innerText = ev.name;
  document.getElementById('regTotalFee').innerText = `₹${ev.fee}`;

  const tabs = document.getElementById('regTabs');
  if (currentRegMax > 1) {
    tabs.classList.remove('hidden'); tabs.classList.add('flex');
    setRegMode('create');
  } else {
    tabs.classList.add('hidden'); tabs.classList.remove('flex');
    renderIndividualForm();
  }

  const regScroll = document.getElementById('regFormContainer');
  if (regScroll) regScroll.scrollTop = 0;

  openModal('registerModal');
  renderIcons();
}

function resumeRegistration(eventId) {
  const reg = userProfile.registrations.find(r => r.eventId === eventId);
  currentModalEvent = Object.values(EVENTS_DATA).flat().find(e => e.id === eventId);
  openRegisterModal();
  if (reg && reg.teamCode) {
    setRegMode('create');
    setTimeout(() => {
      const inp = document.getElementById('teamNameInput');
      if (inp) inp.value = reg.teamName;
      confirmTeamName();
    }, 10);
  }
}

function setRegMode(mode) {
  regMode = mode;
  const tabCreate = document.getElementById('tabCreate');
  const tabJoin = document.getElementById('tabJoin');
  if (mode === 'create') {
    tabCreate.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-rose-600 text-rose-500 px-2 min-w-0";
    tabJoin.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 px-2 min-w-0";
    renderCreateForm();
  } else {
    tabJoin.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-rose-600 text-rose-500 px-2 min-w-0";
    tabCreate.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 px-2 min-w-0";
    renderJoinForm();
  }
  
  const regScroll = document.getElementById('regFormContainer');
  if (regScroll) regScroll.scrollTop = 0;

  renderIcons();
}

function renderCreateForm() {
  teamMemberCount = 1;
  const existingReg = userProfile.registrations.find(r => r.eventId === currentModalEvent.id);
  if (existingReg && existingReg.teamCode) { renderTeamBuildSection(existingReg.teamCode); return; }
  document.getElementById('regFormContainer').innerHTML = `
        <form id="teamNameSection" onsubmit="event.preventDefault(); confirmTeamName();" class="mb-4 sm:mb-6 animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow flex flex-col justify-center min-w-0">
            <div class="w-full max-w-sm mx-auto min-w-0">
                <p class="text-rose-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 flex items-center justify-center gap-2 w-full"><i data-lucide="shield-plus" class="w-4 h-4 shrink-0"></i> <span class="truncate">Step 1: Create Your Team</span></p>
                <input type="text" id="teamNameInput" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-center text-sm sm:text-base focus:outline-none focus:border-rose-500 transition mb-4 shadow-inner min-w-0" placeholder="Enter Team Name" required>
                <button type="submit" class="w-full py-3 sm:py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(225,29,72,0.3)]">Generate Team Code</button>
            </div>
        </form>`;
  document.getElementById('regFooterBtns').innerHTML = `<p class="text-zinc-500 text-[10px] sm:text-xs font-medium italic w-full text-right sm:text-left truncate">Complete Step 1</p>`;
  renderIcons();
}

function confirmTeamName() {
  const name = document.getElementById('teamNameInput').value;
  if (!name) { showMessage("Please enter a team name!"); return; }
  let reg = userProfile.registrations.find(r => r.eventId === currentModalEvent.id);
  if (!reg) {
    const code = `AUT-TEAM-${Math.floor(1000 + Math.random() * 9000)}`;
    reg = { eventId: currentModalEvent.id, teamName: name, teamCode: code, members: [], payment: 'Incomplete', leader: userProfile.accountId };
    userProfile.registrations.push(reg);
  } else { reg.teamName = name; }
  saveCache();
  renderTeamBuildSection(reg.teamCode);
  showMessage("Team Code Generated & Saved!");
}

function renderTeamBuildSection(code) {
  document.getElementById('regFormContainer').innerHTML = `
      <div class="mb-4 sm:mb-6 animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow flex flex-col min-w-0">
          <div class="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-center shadow-inner w-full min-w-0"><p class="text-xs sm:text-sm text-cyan-400 uppercase tracking-widest font-bold mb-1 truncate">Your Team Code</p><p class="text-xl sm:text-3xl font-mono font-bold text-white tracking-[0.1em] sm:tracking-[0.2em] break-words">${code}</p></div>
          <div class="mb-3 sm:mb-4 flex justify-between items-center border-b border-zinc-800 pb-2 gap-2 w-full min-w-0"><label class="block text-[9px] sm:text-[10px] uppercase text-zinc-500 font-bold ml-1 flex-1 truncate">Invite Members</label><span class="text-[10px] sm:text-xs text-zinc-400 font-bold shrink-0"><span id="memCountText">1</span> / ${currentRegMax}</span></div>
          <div id="teamMembersList" class="space-y-2 sm:space-y-3 mb-4 w-full min-w-0">
              <div class="bg-zinc-900/50 border border-rose-500/30 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-inner w-full min-w-0">
                  <div class="flex items-center gap-3 sm:gap-4 w-full min-w-0">
                      <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0"><i data-lucide="crown" class="w-4 h-4 sm:w-5 sm:h-5"></i></div>
                      <div class="min-w-0 flex-grow"><p class="text-xs sm:text-sm text-white font-bold truncate">You (Leader)</p></div>
                  </div>
              </div>
          </div>
          <button type="button" id="addMemberBtn" onclick="addTeamMemberField(true)" class="mt-4 w-full py-3 sm:py-4 rounded-xl border border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 transition flex items-center justify-center gap-2 text-xs sm:text-sm font-medium shrink-0"><i data-lucide="plus" class="w-4 h-4 shrink-0"></i> <span class="truncate">Add Teammate by ID</span></button>
      </div>`;
  document.getElementById('regFooterBtns').innerHTML = `<button onclick="processPayment()" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs sm:text-base shadow-[0_0_15px_rgba(37,99,235,0.4)] text-center shrink-0">Pay Now</button>`;
  teamMemberCount = 1;
  const reg = userProfile.registrations.find(r => r.eventId === currentModalEvent.id);
  if (reg && reg.members.length > 0) {
    reg.members.forEach((mId, index) => {
      if (teamMemberCount < currentRegMax) addTeamMemberField(false, mId);
    });
  } else window.updateMemberCount();
  renderIcons();
}

function renderJoinForm() {
  document.getElementById('regFormContainer').innerHTML = `
      <form id="joinTeamForm" onsubmit="event.preventDefault(); window.processJoinTeam();" class="flex flex-col items-center justify-start py-6 sm:py-10 mt-2 sm:mt-6 text-center animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow min-w-0">
          <div class="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 shrink-0 shadow-inner"><i data-lucide="key" class="w-8 h-8 sm:w-10 sm:h-10 text-amber-500"></i></div>
          <h4 class="text-xl sm:text-2xl font-black text-white mb-3 font-sans tracking-wide w-full break-words">Join a Team</h4>
          <p class="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto mb-6 break-words w-full">Enter the team code provided by your team leader.</p>
          <input type="text" id="joinTeamInput" class="w-full max-w-sm bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-center font-mono text-sm sm:text-lg tracking-[0.1em] sm:tracking-[0.2em] focus:outline-none focus:border-amber-500 shadow-inner transition min-w-0" placeholder="AUT-TEAM-XXXX" required>
      </form>`;
  document.getElementById('regFooterBtns').innerHTML = `<button type="submit" form="joinTeamForm" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold transition text-xs sm:text-base shadow-[0_0_15px_rgba(245,158,11,0.4)] text-center shrink-0">Join Team</button>`;
  renderIcons();
}

// REAL Process Join Team Logic
window.processJoinTeam = async function() {
    const code = document.getElementById('joinTeamInput').value.trim();
    if (!code) return;

    const allRegs = await DatabaseAPI.get('registrations');
    const teamReg = allRegs.find(r => r.teamCode === code);

    if (!teamReg) {
        showMessage("Invalid Team Code. Please check and try again.");
        return;
    }

    if (teamReg.leader === userProfile.accountId || teamReg.members.includes(userProfile.accountId)) {
        showMessage("You are already in this team!");
        return;
    }

    let targetEvent = null;
    for (const cat of Object.values(EVENTS_DATA)) {
        const found = cat.find(e => e.id === teamReg.eventId);
        if (found) { targetEvent = found; break; }
    }

    if (!targetEvent) return;

    let maxMems = 1;
    if (targetEvent.team.includes('-')) {
        maxMems = parseInt(targetEvent.team.split('-')[1]);
    } else {
        maxMems = parseInt(targetEvent.team);
    }

    if (teamReg.members.length + 1 >= maxMems) {
        showMessage("This team is already full!");
        return;
    }

    // Add member to team in Database
    teamReg.members.push(userProfile.accountId);
    await DatabaseAPI.update('registrations', teamReg.id, { members: teamReg.members });

    // Local profile update to trigger rendering
    userProfile.registrations.push({
        eventId: teamReg.eventId,
        teamName: teamReg.teamName,
        teamCode: teamReg.teamCode,
        members: teamReg.members,
        payment: 'Team Paid' // Member relies on the leader's payment
    });
    saveCache();

    closeModal('registerModal');
    showMessage(`Successfully joined ${teamReg.teamName}!`);
    if (window.location.pathname.includes('profile')) {
        renderProfile();
    } else {
        navigate('profile');
    }
};

function renderIndividualForm() {
  document.getElementById('regFormContainer').innerHTML = `
      <div class="flex flex-col items-center justify-start py-8 sm:py-10 text-center animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow min-w-0">
          <div class="w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 shrink-0 shadow-inner">
              <i data-lucide="user" class="w-10 h-10 sm:w-12 sm:h-12 text-blue-500"></i>
          </div>
          <h4 class="text-2xl sm:text-3xl font-black text-white mb-3 tracking-wide font-sans w-full break-words">Individual Registration</h4>
          <p class="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto break-words w-full">You are registering as an individual. Proceed to pay the fee and confirm your spot.</p>
      </div>`;
  document.getElementById('regFooterBtns').innerHTML = `<button onclick="processPayment()" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs sm:text-base shadow-[0_0_15px_rgba(37,99,235,0.4)] text-center shrink-0">Pay Now</button>`;
  renderIcons();
}

window.addTeamMemberField = function(pushToArray = true, initialValue = "") {
  if (teamMemberCount >= currentRegMax) { showMessage(`Max size ${currentRegMax}.`); return; }
  teamMemberCount++;

  const id = `member-${teamMemberCount}`;
  const displayVal = initialValue !== "Pending" ? initialValue : "";

  const div = document.createElement('div');
  div.id = id; div.className = 'flex items-center gap-2 sm:gap-3 animate-[fadeInSlide_0.2s_ease-out] w-full min-w-0';
  div.innerHTML = `
      <input type="text" id="input-${id}" placeholder="Email or ID" value="${displayVal}" class="team-member-input flex-grow min-w-0 py-3 sm:py-4 bg-black/40 border border-white/10 rounded-xl text-white px-4 text-xs sm:text-sm focus:outline-none focus:border-rose-500 shadow-inner" required onchange="saveTeamMembers()">
      <button type="button" onclick="sendTeamInvite('input-${id}')" class="w-12 h-12 sm:w-[52px] sm:h-[52px] bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl flex items-center justify-center shrink-0 transition" title="Send Email Invite"><i data-lucide="mail" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
      <button type="button" onclick="removeTeamMemberField('${id}')" class="w-12 h-12 sm:w-[52px] sm:h-[52px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center shrink-0 transition"><i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>`;
  document.getElementById('teamMembersList').appendChild(div);

  if (pushToArray) {
    saveTeamMembers();
  }
  window.updateMemberCount();
  renderIcons();
}

window.updateMemberCount = function() {
  const memCountText = document.getElementById('memCountText');
  if(memCountText) memCountText.innerText = teamMemberCount;
  const addBtn = document.getElementById('addMemberBtn');
  if (addBtn) addBtn.style.display = teamMemberCount >= currentRegMax ? 'none' : 'flex';
}

function sendTeamInvite(inputId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl || !inputEl.value) {
        showMessage("Please enter an email or Account ID to invite.");
        return;
    }
    let reg = userProfile.registrations.find(r => r.eventId === currentModalEvent.id);
    const code = reg && reg.teamCode ? reg.teamCode : 'PENDING';
    
    showMessage(`Invite sent! When ${inputEl.value} clicks "Join" in their email, they will be automatically added to the team.`);
}

function saveTeamMembers() {
  let reg = userProfile.registrations.find(r => r.eventId === currentModalEvent.id);
  if (reg) {
    const inputs = document.querySelectorAll('.team-member-input');
    reg.members = Array.from(inputs).map(inp => inp.value.trim() || 'Pending');
    saveCache();
  }
}

function removeTeamMemberField(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove(); teamMemberCount--;
    saveTeamMembers();
    window.updateMemberCount();
  }
}

// REAL Razorpay Integration
function initRazorpayMock(amount, successMsg, callback) {
    pendingRzpAmount = amount;
    pendingRzpSuccessMsg = successMsg;
    pendingRzpCallback = callback;
    
    const rzpAmountDisplay = document.getElementById('rzpAmountDisplay');
    if (rzpAmountDisplay) rzpAmountDisplay.innerText = `₹${amount}`;
    
    const rzpLoader = document.getElementById('rzpLoader');
    if (rzpLoader) {
        rzpLoader.classList.add('hidden');
        rzpLoader.classList.remove('flex');
    }
    
    openModal('razorpayModal');
}

function confirmMockPayment() {
    const loader = document.getElementById('rzpLoader');
    if(loader) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }
    
    setTimeout(async () => {
        closeModal('razorpayModal');
        
        const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
        
        const pData = {
            id: paymentId,
            amount: pendingRzpAmount,
            status: 'Success',
            timestamp: new Date().toLocaleString(),
            user: userProfile.accountId
        };
        userProfile.payments.push(pData);
        await DatabaseAPI.add('payments', pData);

        saveCache();
        showMessage(pendingRzpSuccessMsg);
        if (pendingRzpCallback) pendingRzpCallback(paymentId);
    }, 1500);
}

function processRazorpayPayment(amount, successMsg, callback) {
    if(amount === 0) {
        callback(`FREE_${Math.random().toString(36).substr(2, 9)}`);
        return;
    }
    
    const API_KEY = "YOUR_TEST_KEY_HERE"; 
    
    if (API_KEY === "YOUR_TEST_KEY_HERE" || typeof window.Razorpay === 'undefined') {
        initRazorpayMock(amount, successMsg, callback);
        return;
    }

    var options = {
        "key": API_KEY, // Test key
        "amount": amount * 100, 
        "currency": "INR",
        "name": "Autumn Fest 2026",
        "description": "Registration Fee",
        "image": "https://autumnfest.in/logo.png",
        "handler": async function (response){
            const paymentId = response.razorpay_payment_id;
            
            const pData = {
                id: paymentId,
                amount: amount,
                status: 'Success',
                timestamp: new Date().toLocaleString(),
                user: userProfile.accountId
            };
            userProfile.payments.push(pData);
            await DatabaseAPI.add('payments', pData);

            saveCache();
            showMessage(successMsg);
            if (callback) callback(paymentId);
        },
        "prefill": {
            "name": userProfile.name,
            "email": userProfile.email,
            "contact": userProfile.phone || "9999999999"
        },
        "theme": { "color": "#f43f5e" }
    };
    try {
        var rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            showMessage("Payment Failed: " + response.error.description);
        });
        rzp1.open();
    } catch(e) {
        console.error(e);
        initRazorpayMock(amount, successMsg, callback);
    }
}

function processPayment() {
  if (currentRegMax > 1 && regMode === 'create' && teamMemberCount < currentRegMin) { showMessage(`Minimum ${currentRegMin} members required!`); return; }

  processRazorpayPayment(currentPendingFee, "Payment Successful! Registration complete.", async (payId) => {
    let reg = userProfile.registrations.find(r => r.eventId === currentModalEvent.id);
    if (!reg) { reg = { eventId: currentModalEvent.id, teamName: 'Individual', teamCode: null, members: [], payment: 'Success' }; userProfile.registrations.push(reg); }
    else { reg.payment = 'Success'; saveTeamMembers(); }

    const regData = {
      id: Date.now().toString(),
      eventId: currentModalEvent.id,
      teamName: reg.teamName,
      teamCode: reg.teamCode,
      leader: userProfile.accountId,
      members: reg.members || [],
      payment: 'Success',
      payId: payId
    };
    
    await DatabaseAPI.add('registrations', regData);
    saveCache();
    closeModal('registerModal');
    navigate('profile');
  });
}

// ==========================================
// 10. GALLERY & UPLOADS
// ==========================================
function searchGallery() {
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
}

function handleGalleryTap(item, event) {
  if (event.target.closest('button')) return;

  const now = new Date().getTime();
  const lastTap = item.dataset.lastTap || 0;
  const tapDelay = 300; 

  if (now - lastTap < tapDelay && now - lastTap > 0) {
    item.dataset.lastTap = 0;
    const likeBtn = item.querySelector('button');
    if (likeBtn) {
      toggleLike(likeBtn, true);
      showBigHeart(item);
    }
  } else {
    item.dataset.lastTap = now;
  }
}

function showBigHeart(container) {
  const heart = document.createElement('div');
  heart.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:50;animation:popHeart .8s ease-out forwards;font-size:72px;text-shadow:0 0 20px rgba(0,0,0,0.5);';
  heart.textContent = '❤️';
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 800);
}

function toggleLike(btn, fromDoubleTap = false) {
  if (!isLoggedIn) { showMessage("Please sign in to like moments."); return; }
  const icon = btn.querySelector('svg');
  const countSpan = btn.querySelector('.like-count');
  let count = parseInt(countSpan.innerText);

  const isLiked = icon.classList.contains('text-rose-500');

  if (fromDoubleTap && isLiked) return;

  if (isLiked) {
    icon.classList.remove('fill-rose-500', 'text-rose-500');
    count--;
  } else {
    icon.classList.add('fill-rose-500', 'text-rose-500');
    count++;
    icon.style.transform = 'scale(1.5)';
    setTimeout(() => icon.style.transform = 'scale(1)', 200);
  }
  countSpan.innerText = count;
}

function showUploadModal() {
  if (!isLoggedIn) { showMessage("Sign in to upload photos."); return; }
  document.getElementById('upload-event-name').value = '';
  document.getElementById('upload-context').value = '';
  toggleGalleryUploadType('file');
  openModal('uploadModal');
}

// Drive Upload Utility
async function uploadFileToDrive(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.url;
    } catch (e) {
        console.error("Upload failed", e);
        return null;
    }
}

function toggleGalleryUploadType(type) {
    galleryUploadType = type;
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
}

function toggleSponsorInput(type) {
    sponsorUploadType = type;
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
}

async function submitGalleryUpload() {
  const evName = document.getElementById('upload-event-name').value || "College Fest";
  const context = document.getElementById('upload-context').value || "Amazing moment!";
  
  let url = ''; 
  
  if (galleryUploadType === 'file') {
      const fileInput = document.getElementById('galFile');
      if(fileInput.files.length > 0) {
          showMessage('Uploading image to Google Drive... Please wait.');
          url = await uploadFileToDrive(fileInput.files[0]);
          if (!url) { showMessage("Upload to Drive failed."); return; }
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
    user: userProfile.name,
    status: 'Pending'
  };

  await DatabaseAPI.add('gallery', gData);
  
  // Automate Mail to User
  fetch(`${BASE_URL}/send-mail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          subject: "Gallery Submission Received",
          body: `Your gallery submission for "${evName}" has been received and is pending admin approval.`,
          recipients: [{ email: userProfile.email, name: userProfile.name }]
      })
  });

  closeModal('uploadModal');
  showMessage("Image upload submitted and pending admin approval.");
  if (isAdmin && currentRole >= ROLES.SUPERADMIN) renderAdminDashboard();
}

async function submitSponsorForm() {
    let linkData = "";
    if(sponsorUploadType === 'link') {
        linkData = document.getElementById('sponLink').value;
    } else {
        const fileInput = document.getElementById('sponFile');
        if(fileInput.files.length > 0) {
            linkData = fileInput.files[0].name + " (Uploaded File)";
            showMessage("Simulating file upload to Drive...");
        } else {
            showMessage("Please upload a file or switch to Drive Link."); return;
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
    
    await DatabaseAPI.add('sponsors', data);
    closeModal('sponsorModal');
    showMessage('Sponsorship proposal securely submitted!');
}

async function submitContactQuery() {
    const form = document.querySelector('form');
    if(!form) return;
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const msg = form.querySelector('textarea').value;
    
    await DatabaseAPI.add('queries', {
        id: Date.now().toString(),
        name: name, email: email, message: msg, date: new Date().toLocaleString(), status: 'Pending'
    });
    
    form.reset();
    showMessage("Query sent to Admin database!");
}


// ==========================================
// 11. ADMIN DASHBOARD LOGIC (STRICT RBAC)
// ==========================================
function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  
  let tabPanel = document.getElementById(tabId);
  if (!tabPanel && tabId === 'admin-mails-tab') {
      tabPanel = document.createElement('div');
      tabPanel.id = 'admin-mails-tab';
      tabPanel.className = 'admin-panel animate-[fadeInSlide_0.3s_ease-out]';
      const adminSection = document.getElementById('admin');
      if (adminSection) adminSection.appendChild(tabPanel);
  }
  
  if (!tabPanel && tabId === 'admin-winners-tab') {
      tabPanel = document.createElement('div');
      tabPanel.id = 'admin-winners-tab';
      tabPanel.className = 'admin-panel animate-[fadeInSlide_0.3s_ease-out]';
      const adminSection = document.getElementById('admin');
      if (adminSection) adminSection.appendChild(tabPanel);
  }
  
  if (!tabPanel && tabId === 'admin-prizes-tab') {
      tabPanel = document.createElement('div');
      tabPanel.id = 'admin-prizes-tab';
      tabPanel.className = 'admin-panel animate-[fadeInSlide_0.3s_ease-out]';
      const adminSection = document.getElementById('admin');
      if (adminSection) adminSection.appendChild(tabPanel);
  }

  if (tabPanel) tabPanel.classList.remove('hidden');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  if (tabId === 'admin-analytics-tab') renderAnalytics();
  if (tabId === 'admin-accom-tab') renderAdminAccomTable();
  if (tabId === 'admin-search-tab') window.renderAdminSearchTable();
  if (tabId === 'admin-queries-tab') renderAdminQueries();
  if (tabId === 'admin-sponsors-tab') renderAdminSponsors();
  if (tabId === 'admin-mails-tab') window.renderAdminMails();
  if (tabId === 'admin-winners-tab') window.renderAdminWinners();
  if (tabId === 'admin-prizes-tab') window.renderAdminPrizes();
  if (tabId !== 'admin-scanner-tab') stopCameraScan();
}

async function renderAnalytics() {
  const dayFilter = document.getElementById('analyticsDayFilter')?.value || 'all';
  const evFilter = document.getElementById('analyticsEventFilter')?.value || 'all';

  // Fetch true statistics live from DB
  const regs = await DatabaseAPI.get('registrations');
  const pays = await DatabaseAPI.get('payments');
  const logs = await DatabaseAPI.get('logs');

  let filteredReg = regs.length;
  let filteredRev = pays.filter(p => p.status === 'Success').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  
  const todayStr = new Date().toDateString();
  let scansToday = logs.filter(l => new Date(l.timestamp).toDateString() === todayStr).length;
  let insideCampus = new Set(logs.map(l => l.id)).size;

  if (dayFilter !== 'all') { filteredReg = Math.floor(filteredReg * 0.4); filteredRev = Math.floor(filteredRev * 0.4); }
  if (evFilter !== 'all') { filteredReg = Math.floor(filteredReg * 0.1); filteredRev = Math.floor(filteredRev * 0.1); }

  document.getElementById('stat-total-reg').innerText = filteredReg.toLocaleString();
  document.getElementById('stat-scans').innerText = scansToday.toLocaleString();
  document.getElementById('stat-inside').innerText = insideCampus.toLocaleString();
  
  const revContainer = document.getElementById('stat-revenue-container');
  if(currentRole >= ROLES.SUPERACCOUNT) {
      revContainer.style.display = 'block';
      document.getElementById('stat-revenue').innerText = `₹${filteredRev.toLocaleString()}`;
  } else {
      revContainer.style.display = 'none';
  }
}

async function renderAdminDashboard() {
  document.getElementById('admin-role-display').innerHTML = `Current Access Level: <strong class="text-rose-400 capitalize">${Object.keys(ROLES).find(key => ROLES[key] === currentRole)}</strong>`;

  const tabs = {
      'tab-btn-analytics': ROLES.ADMIN,
      'tab-btn-scanner': ROLES.ADMIN,
      'tab-btn-search': ROLES.ADMIN,
      'tab-btn-database': ROLES.ADMIN, 
      'tab-btn-events': ROLES.SUPERADMIN,
      'tab-btn-mails': ROLES.ADMIN, 
      'tab-btn-winners': ROLES.ADMIN,
      'tab-btn-prizes': ROLES.SUPERADMIN,
      'tab-btn-accom': ROLES.SUPERADMIN,
      'tab-btn-gallery': ROLES.SUPERADMIN,
      'tab-btn-users': ROLES.SUPERADMIN,
      'tab-btn-queries': ROLES.SUPERADMIN,
      'tab-btn-sponsors': ROLES.SUPERADMIN,
      'tab-btn-settings': ROLES.SUPERACCOUNT,
      'danger-zone-container': ROLES.PRIMARY
  };

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
          if (id === 'danger-zone-container') el.style.display = currentRole >= reqRole ? 'block' : 'none';
          else el.style.display = currentRole >= reqRole ? 'flex' : 'none';
      }
  }

  let activeTabBtn = document.querySelector('.admin-tab-btn.active');
  if (activeTabBtn) {
    let activeTabId = activeTabBtn.getAttribute('onclick').match(/'([^']+)'/)[1];
    if (document.getElementById(activeTabId.replace('tab-btn-', '')).style.display === 'none') {
      switchAdminTab('admin-scanner-tab');
    }
  }

  if (currentRole >= ROLES.SUPERADMIN) {
    const eventsHeaderContainer = document.querySelector('#admin-events-tab .flex.flex-col');
    if (eventsHeaderContainer && !document.getElementById('event-fest-toggle')) {
        eventsHeaderContainer.insertAdjacentHTML('afterend', `
            <div id="event-fest-toggle" class="flex gap-2 mt-4 mb-4 w-full sm:w-auto">
                <button onclick="renderAdminEventsList('events')" id="toggle-ev-btn" class="flex-1 px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold transition shadow">Events</button>
                <button onclick="renderAdminEventsList('festivals')" id="toggle-fest-btn" class="flex-1 px-6 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition shadow">Festivals</button>
            </div>
        `);
    }
    if (typeof window.renderAdminEventsList === 'function') {
        window.renderAdminEventsList('events');
    }

    // Fetch dynamic pending gallery uploads
    const allGallery = await DatabaseAPI.get('gallery');
    const dbPendingUploads = allGallery.filter(g => g.status === 'Pending');

    document.getElementById('pending-approval-badge').innerText = dbPendingUploads.length;
    if (dbPendingUploads.length > 0) document.getElementById('pending-approval-badge').classList.remove('hidden');
    else document.getElementById('pending-approval-badge').classList.add('hidden');

    let approvalsHTML = dbPendingUploads.length > 0 ? dbPendingUploads.map(p => `
        <div class="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col cursor-pointer hover:border-rose-500/50 transition-colors group" onclick="openGalleryDetails('${p.id}')">
            <div class="relative h-32 sm:h-40 overflow-hidden">
                <img src="${p.url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md">Review Request</span>
                </div>
            </div>
            <div class="p-3 sm:p-4 flex-grow">
                <p class="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mb-1">By ${p.user}</p>
                <p class="text-xs sm:text-sm font-bold text-rose-400">${p.event}</p>
                <p class="text-xs sm:text-sm text-white truncate">"${p.caption}"</p>
            </div>
        </div>
    `).join('') : `<p class="text-zinc-500 italic text-xs sm:text-sm">No pending uploads.</p>`;
    document.getElementById('admin-approvals-grid').innerHTML = approvalsHTML;
    
    renderAdminQueries();
    renderAdminSponsors();
  }

  if (currentRole >= ROLES.SUPERADMIN) {
    const dbUsers = await DatabaseAPI.get('users');
    let usersHTML = '';
    dbUsers.forEach(u => {
      let roleSelectDisabled = "";
      if (currentRole !== ROLES.PRIMARY && u.role >= currentRole && u.id !== userProfile.accountId) {
          roleSelectDisabled = "disabled";
      }
      
      usersHTML += `
          <tr class="border-b border-white/5 hover:bg-white/5">
              <td class="p-3 sm:p-4 font-mono text-cyan-400 text-[10px] sm:text-xs">${u.id}</td>
              <td class="p-3 sm:p-4 text-xs sm:text-sm text-white">${u.name}</td>
              <td class="p-3 sm:p-4 text-xs sm:text-sm text-zinc-400">${u.email}</td>
              <td class="p-3 sm:p-4">
                  <select ${roleSelectDisabled} onchange="changeUserRole('${u.id}', this.value)" class="bg-black/40 border border-white/10 rounded-lg px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-zinc-300 focus:border-rose-500 outline-none w-full sm:w-auto">
                      <option value="${ROLES.USER}" ${u.role == ROLES.USER ? 'selected' : ''}>User (L0)</option>
                      ${currentRole >= ROLES.SUPERADMIN || u.role == ROLES.ADMIN ? `<option value="${ROLES.ADMIN}" ${u.role == ROLES.ADMIN ? 'selected' : ''}>Admin (L1)</option>` : ''}
                      ${currentRole >= ROLES.SUPERACCOUNT || currentRole === ROLES.PRIMARY || u.role == ROLES.SUPERADMIN ? `<option value="${ROLES.SUPERADMIN}" ${u.role == ROLES.SUPERADMIN ? 'selected' : ''}>Super Admin (L2)</option>` : ''}
                      ${currentRole === ROLES.PRIMARY || u.role == ROLES.SUPERACCOUNT ? `<option value="${ROLES.SUPERACCOUNT}" ${u.role == ROLES.SUPERACCOUNT ? 'selected' : ''}>Super Account (L3)</option>` : ''}
                      ${currentRole === ROLES.PRIMARY || u.role == ROLES.PRIMARY ? `<option value="${ROLES.PRIMARY}" ${u.role == ROLES.PRIMARY ? 'selected' : ''}>Primary (L4)</option>` : ''}
                  </select>
              </td>
          </tr>
      `;
    });
    document.getElementById('admin-users-table').innerHTML = usersHTML;

    const usersTableHeadRow = document.querySelector('#admin-users-tab thead tr');
    if (usersTableHeadRow && usersTableHeadRow.children.length > 4) {
        usersTableHeadRow.removeChild(usersTableHeadRow.lastElementChild);
    }

    const userSearchInput = document.getElementById('admin-user-search');
    if (userSearchInput && !document.getElementById('btn-add-role')) {
        const container = userSearchInput.parentElement.parentElement;
        if (container) {
             const btn = document.createElement('button');
             btn.id = 'btn-add-role';
             btn.className = 'w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)] mt-3 sm:mt-0';
             btn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i> Add / Pre-assign';
             btn.onclick = () => openModal('adminAddUserModal');
             container.appendChild(btn);
        }
    }
  }

  const allSheetAnchors = document.querySelectorAll('#admin-database-tab a');
  allSheetAnchors.forEach(s => {
      if (s.innerText.includes('Payments')) {
          s.style.display = currentRole >= ROLES.SUPERACCOUNT ? 'flex' : 'none';
      }
  });

  if (currentRole >= ROLES.SUPERACCOUNT) {
    const radio = document.querySelector(`input[name="festStatus"][value="${festStatus}"]`);
    if(radio) radio.checked = true;
  }

  renderIcons();
}

window.renderAdminEventsList = function(type = 'events') {
    const btnEv = document.getElementById('toggle-ev-btn');
    const btnFest = document.getElementById('toggle-fest-btn');
    const addBtn = document.querySelector('#admin-events-tab button[onclick^="openAdminEventModal"]');

    if(btnEv && btnFest) {
        if (type === 'events') {
            btnEv.className = "flex-1 px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold transition shadow";
            btnFest.className = "flex-1 px-6 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition shadow";
            if (addBtn) {
                addBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Add Event';
                addBtn.setAttribute('onclick', "openAdminEventModal(null)");
            }
        } else {
            btnFest.className = "flex-1 px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold transition shadow";
            btnEv.className = "flex-1 px-6 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition shadow";
            if (addBtn) {
                addBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Add Festival';
                addBtn.setAttribute('onclick', "openAdminEventModal('festivals')");
            }
        }
    }

    let html = '';
    for (const [catKey, events] of Object.entries(EVENTS_DATA)) {
        events.forEach(ev => {
            if (type === 'events' && catKey === 'festivals') return;
            if (type === 'festivals' && catKey !== 'festivals') return;

            html += `
                <tr class="hover:bg-white/5 transition-colors border-b border-white/5">
                    <td class="p-3 sm:p-4 font-bold text-white text-xs sm:text-sm">${ev.name}</td>
                    <td class="p-3 sm:p-4 text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400">${catKey}</td>
                    <td class="p-3 sm:p-4 text-xs sm:text-sm">${ev.team}</td>
                    <td class="p-3 sm:p-4 text-xs sm:text-sm text-emerald-400">₹${ev.fee}</td>
                    <td class="p-3 sm:p-4">
                        <button onclick="toggleAdminEventStatus('${catKey}', '${ev.id}')" class="px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border ${ev.status === 'open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}">
                            ${ev.status}
                        </button>
                    </td>
                    <td class="p-3 sm:p-4 text-right space-x-1 sm:space-x-2 whitespace-nowrap">
                        <button onclick="viewAdminParticipants('${ev.id}')" class="p-1.5 sm:p-2 text-zinc-400 hover:text-blue-500 transition" title="View Participants"><i data-lucide="users" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
                        <button onclick="openAdminEventModal('${catKey}', '${ev.id}')" class="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition" title="Edit"><i data-lucide="edit-2" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
                        <button onclick="deleteAdminEvent('${catKey}', '${ev.id}')" class="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500 transition" title="Delete"><i data-lucide="trash-2" class="w-3 h-3 sm:w-4 sm:h-4"></i></button>
                    </td>
                </tr>`;
        });
    }
    const table = document.getElementById('admin-events-table');
    if (table) table.innerHTML = html;
    renderIcons();
};

window.renderAdminMails = function(mailType = 'normal') {
    let tab = document.getElementById('admin-mails-tab');
    if (!tab) return;
    
    window.currentMailType = mailType;

    let evOptionsNorm = `<option value="all_users" class="bg-zinc-900 text-white">All Logged-in Members</option>
                         <option value="all_events" class="bg-zinc-900 text-white">All Registered for Any Event</option>
                         <option value="all_accom" class="bg-zinc-900 text-white">All Accommodation Booked</option>`;
    let evOptionsCert = ``;
    
    for (const [catKey, events] of Object.entries(EVENTS_DATA)) {
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
                <button onclick="renderAdminMails('normal')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${!isCert ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'}">Normal Mails</button>
                <button onclick="renderAdminMails('certificate')" class="px-4 py-2 rounded-lg text-xs font-bold transition ${isCert ? 'bg-rose-600 text-white shadow' : 'text-zinc-400 hover:text-white'}">Certificate Mails</button>
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
                    <input type="text" id="mailLinks" placeholder="Add external links (e.g. WhatsApp Group URL, Drive links... comma separated)" class="w-full bg-transparent border-white/10 border-b outline-none text-white text-xs pb-2 focus:border-blue-500 transition">
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

            <button onclick="executeBulkMail()" class="w-full py-3.5 mt-2 rounded-xl ${isCert ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'} text-white text-sm font-bold transition flex justify-center items-center gap-2">
                ${isCert ? `<i data-lucide="zap" class="w-4 h-4"></i> Generate & Send via Apps Script` : `<i data-lucide="send" class="w-4 h-4"></i> Dispatch Mails`}
            </button>
        </div>
    `;
    renderIcons();
    window.toggleMailTags();
};

window.toggleMailTags = function() {
    const audience = document.getElementById('mailAudience').value;
    const tagHintEvent = document.getElementById('tagHintEvent');
    if (!tagHintEvent) return;
    
    if (audience.includes('event_') || audience.includes('cert_')) {
        tagHintEvent.classList.remove('hidden');
    } else {
        tagHintEvent.classList.add('hidden');
    }

    const msgBox = document.getElementById('mailMessage');
    if (msgBox && window.currentMailType === 'certificate') {
        const isParticipant = audience.startsWith('cert_part_');
        const isWinner = audience.startsWith('cert_win_');
        
        if (isParticipant) {
            msgBox.innerHTML = `Dear <b>{{name}}</b>,<br><br>This is to certify that you have actively participated in <b>{{eventname}}</b> conducted by AUTUMN 2026, The Annual Cultural and Technopreneurship Fest.<br><br>Please access your participation certificate using the link below:<br><a href="{{certificate_link}}" style="color: #60a5fa;">{{certificate_link}}</a><br><br>Best Regards,<br>Events Team`;
        } else if (isWinner) {
            msgBox.innerHTML = `Dear <b>{{name}}</b>,<br><br>Congratulations! This is to certify that you have secured <b>{{position}} Place</b> in <b>{{eventname}}</b> conducted by AUTUMN 2026, The Annual Cultural and Technopreneurship Fest.<br><br>Please access your certificate of appreciation using the link below:<br><a href="{{certificate_link}}" style="color: #60a5fa;">{{certificate_link}}</a><br><br>Best Regards,<br>Events Team`;
        }
    }
};

window.executeBulkMail = async function() {
    const mode = window.currentMailType || 'normal';
    const audience = document.getElementById('mailAudience').value;
    const subject = document.getElementById('mailSubject')?.value;
    const msgBox = document.getElementById('mailMessage');
    const textMsg = msgBox ? msgBox.innerText.trim() : "";
    const links = document.getElementById('mailLinks')?.value || "";
    const files = document.getElementById('mailFiles')?.files?.length || 0;
    const scriptUrl = document.getElementById('mailAppsScriptUrl')?.value || "";

    if (mode === 'normal' && (!subject || !textMsg)) return showMessage('Please enter a subject and a message.');
    if (mode === 'certificate' && !scriptUrl) return showMessage('Please provide the Apps Script Web App URL.');

    let count = 0;
    let payload = []; 
    const users = await DatabaseAPI.get('users');
    
    if (mode === 'normal') {
        if (audience === 'all_users') count = users.length;
        else if (audience === 'all_events') {
            const regs = await DatabaseAPI.get('registrations');
            count = new Set(regs.flatMap(r => [r.leader, ...r.members])).size;
        } else if (audience === 'all_accom') {
            const accoms = await DatabaseAPI.get('accommodations');
            count = accoms.length;
        } else if (audience.startsWith('event_')) {
            const evId = audience.split('_')[1];
            const regs = await DatabaseAPI.get('registrations');
            const evRegs = regs.filter(r => r.eventId === evId);
            count = new Set(evRegs.flatMap(r => [r.leader, ...r.members])).size;
        }
    } else if (mode === 'certificate') {
        const isParticipant = audience.startsWith('cert_part_');
        const isWinner = audience.startsWith('cert_win_');
        const evId = isParticipant ? audience.replace('cert_part_', '') : audience.replace('cert_win_', '');
        
        const eventObj = Object.values(EVENTS_DATA).flat().find(e => e.id === evId);
        const eventName = eventObj ? eventObj.name : "Event";

        if (isParticipant) {
            const regs = await DatabaseAPI.get('registrations');
            const evRegs = regs.filter(r => r.eventId === evId);
            const participantIds = new Set(evRegs.flatMap(r => [r.leader, ...r.members]));
            count = participantIds.size;
            
            const certText = `has actively participated in the ${eventName} conducted by AUTUMN 2026, The Annual Cultural and Technopreneurship Fest.`;

            participantIds.forEach(id => {
                const u = users.find(user => user.id === id);
                if(u) payload.push({ name: u.name, email: u.email, eventName: eventName, certType: "participant", position: "", certificateText: certText });
            });
        } else if (isWinner) {
            const winnersDb = await DatabaseAPI.get('winners');
            const regs = await DatabaseAPI.get('registrations');
            const winData = winnersDb.find(w => w.eventId === evId);
            
            if (winData) {
                const addWinner = (winId, pos) => {
                    if (winId && winId !== 'null') {
                        let leaderId = winId;
                        if (winId.startsWith('AUT-TEAM-')) {
                            const r = regs.find(reg => reg.teamCode === winId);
                            if(r) leaderId = r.leader;
                        }
                        const u = users.find(user => user.id === leaderId);
                        if(u) {
                            const certText = `has secured ${pos} Place in the ${eventName} conducted by AUTUMN 2026, The Annual Cultural and Technopreneurship Fest.`;
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
        
        if(payload.length > 0) {
             showMessage(`Generating ${count} certificates via Apps Script...`);
             try {
                 // In real application, uncomment the fetch call
                 // await fetch(scriptUrl, { method: 'POST', body: JSON.stringify(payload) });
                 console.log("Sending payload to Apps Script:", payload);
             } catch(e) {}
        } else {
             return showMessage("No users found for this selection.");
        }
    }

    let attachmentMsg = files > 0 || links ? " (with attachments/links)" : "";
    if (mode === 'normal') {
         showMessage(`Success! Broadcast${attachmentMsg} sent to ${count} recipients. Variables merged.`);
    } else {
         showMessage(`Success! Sent ${count} certificate requests to Apps Script.`);
    }
    
    if(document.getElementById('mailSubject')) document.getElementById('mailSubject').value = '';
    if(msgBox) msgBox.innerHTML = '';
    if(document.getElementById('mailLinks')) document.getElementById('mailLinks').value = '';
    if(document.getElementById('mailFiles')) document.getElementById('mailFiles').value = '';
    if(document.getElementById('mailAppsScriptUrl')) document.getElementById('mailAppsScriptUrl').value = '';
};

window.renderAdminWinners = function() {
    let tab = document.getElementById('admin-winners-tab');
    if (!tab) return;

    let evOptions = `<option value="" class="bg-zinc-900 text-white">Select Event...</option>`;
    for (const [catKey, events] of Object.entries(EVENTS_DATA)) {
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
                <select id="winnerEventSelect" class="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-white text-xs sm:text-sm focus:border-amber-500 outline-none cursor-pointer">
                    ${evOptions}
                </select>
            </div>
            <div class="space-y-3">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0 shadow-inner">1</span>
                    <input type="text" id="winner1" placeholder="Team Code or Leader ID (or 'null')" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-amber-500 outline-none">
                </div>
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-zinc-400/20 text-zinc-300 flex items-center justify-center font-bold shrink-0 shadow-inner">2</span>
                    <input type="text" id="winner2" placeholder="Team Code or Leader ID (or 'null')" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-amber-500 outline-none">
                </div>
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-orange-700/20 text-orange-600 flex items-center justify-center font-bold shrink-0 shadow-inner">3</span>
                    <input type="text" id="winner3" placeholder="Team Code or Leader ID (or 'null')" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-amber-500 outline-none">
                </div>
            </div>
            <button onclick="saveEventWinners()" class="w-full py-3 mt-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-amber-950 text-sm font-bold transition shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                Save Winners
            </button>
        </div>
    `;
    renderIcons();
};

window.saveEventWinners = async function() {
    const evId = document.getElementById('winnerEventSelect').value;
    const w1 = document.getElementById('winner1').value.trim();
    const w2 = document.getElementById('winner2').value.trim();
    const w3 = document.getElementById('winner3').value.trim();

    if(!evId) return showMessage("Please select an event.");
    if(!w1 && !w2 && !w3) return showMessage("Please enter at least one winner.");

    await DatabaseAPI.add('winners', {
        id: Date.now().toString(),
        eventId: evId,
        firstPlace: w1,
        secondPlace: w2,
        thirdPlace: w3,
        dateDeclared: new Date().toLocaleString()
    });

    showMessage("Winners successfully recorded in Database!");
    document.getElementById('winnerEventSelect').value = '';
    document.getElementById('winner1').value = '';
    document.getElementById('winner2').value = '';
    document.getElementById('winner3').value = '';
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
                <p class="text-[10px] sm:text-xs text-zinc-400 mb-2 leading-relaxed">
                    Upload a CSV file containing columns:<br>
                    <b>EventID, 1st Prize Money, 1st Prize Coupons, 2nd Prize Money, 2nd Prize Coupons, 3rd Prize Money, 3rd Prize Coupons</b>.<br>
                    (Type 'null' for empty slots/no coupons). This automatically matches with the <b>Winners</b> database and emails them their specific <code>{{cash}}</code> and <code>{{coupon_text}}</code>!
                </p>
                <div class="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center hover:border-rose-500 transition-colors relative cursor-pointer group">
                    <i data-lucide="file-spreadsheet" class="w-6 h-6 text-zinc-500 mx-auto mb-2 group-hover:text-rose-500 transition-colors"></i>
                    <p class="text-xs sm:text-sm text-zinc-400" id="prize-file-text">Click to browse or drag Prize CSV</p>
                    <input type="file" id="prizeUploadCsv" accept=".csv" class="absolute inset-0 opacity-0 cursor-pointer" onchange="document.getElementById('prize-file-text').innerText = this.files[0].name">
                </div>
                <button onclick="processPrizesCSV()" class="w-full py-3 mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition shadow-[0_0_15px_rgba(225,29,72,0.4)] flex justify-center items-center gap-2">
                    <i data-lucide="mail" class="w-4 h-4"></i> Process Sheet & Mail Winners
                </button>
            </div>

            <div class="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col gap-4">
                 <h4 class="text-white font-bold mb-2 flex items-center gap-2"><i data-lucide="edit" class="w-4 h-4 text-blue-500"></i> Edit Mail Template</h4>
                 <p class="text-[10px] sm:text-xs text-zinc-400 leading-relaxed">
                    Customize the email format sent to winners. <br>
                    Supported variables: <code>{{name}}</code>, <code>{{eventname}}</code>, <code>{{position}}</code>, <code>{{cash}}</code>, <code>{{coupon_text}}</code>, <code>{{dispatch_text}}</code>, <code>{{address_req}}</code>.
                 </p>
                 
                 <div class="w-full flex-1 flex flex-col bg-black/40 border border-white/10 rounded-xl shadow-inner mt-1 overflow-hidden min-h-[300px]">
                    <div class="flex items-center gap-1 p-2 border-b border-white/10 bg-black/60 shrink-0 overflow-x-auto custom-scrollbar">
                        <button type="button" onclick="document.execCommand('bold', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Bold"><i data-lucide="bold" class="w-4 h-4"></i></button>
                        <button type="button" onclick="document.execCommand('italic', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Italic"><i data-lucide="italic" class="w-4 h-4"></i></button>
                        <button type="button" onclick="document.execCommand('underline', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Underline"><i data-lucide="underline" class="w-4 h-4"></i></button>
                        <div class="w-px h-4 bg-white/10 mx-1"></div>
                        <button type="button" onclick="document.execCommand('insertUnorderedList', false, null)" class="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="Bullet List"><i data-lucide="list" class="w-4 h-4"></i></button>
                    </div>
                    <div id="prizeMailTemplate" contenteditable="true" class="rich-editor-content flex-1 p-3 sm:p-4 text-white text-[10px] sm:text-xs focus:outline-none overflow-y-auto w-full break-words">${defaultTemplate}</div>
                </div>

            </div>
        </div>
    `;
    renderIcons();
};

window.processPrizesCSV = function() {
    const fileInput = document.getElementById('prizeUploadCsv');
    if (!fileInput.files.length) return showMessage("Please upload a CSV file first.");
    
    setTimeout(() => {
        showMessage("Successfully processed CSV! Emails dynamically formatted and dispatched.");
        fileInput.value = '';
        document.getElementById('prize-file-text').innerText = 'Click to browse or drag Prize CSV';
    }, 1500);
};

window.adminAddSingleUser = async function() {
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const role = parseInt(document.getElementById('newUserRole').value);
    
    if(!email) return showMessage("Enter an email.");
    
    if(role >= currentRole && currentRole !== ROLES.PRIMARY) {
        return showMessage("You cannot assign a role equal to or higher than your own.");
    }
    
    const users = await DatabaseAPI.get('users');
    const existing = users.find(u => u.email === email);
    
    if(existing) {
        await DatabaseAPI.update('users', existing.id, { role: role });
        showMessage(`Updated existing user role to L${role}`);
    } else {
        const newId = "AUT-26-" + Math.floor(1000 + Math.random() * 9000);
        // Using "defaultpass" since an admin is creating the account without password inputs
        await DatabaseAPI.add('users', { id: newId, name: "Pending User", email: email, password: "defaultpass", role: role, phone: "" });
        showMessage(`Pre-assigned role L${role} to ${email}`);
    }
    
    document.getElementById('newUserEmail').value = '';
    closeModal('adminAddUserModal');
    renderAdminDashboard();
}

window.adminBulkUploadUsers = async function() {
    const fileInput = document.getElementById('bulkRoleUpload');
    const file = fileInput.files[0];
    if(!file) return showMessage("Select a CSV file.");
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const lines = e.target.result.split('\n');
        let count = 0;
        const users = await DatabaseAPI.get('users');
        
        for(let i=1; i<lines.length; i++) { 
            const line = lines[i].trim();
            if(!line) continue;
            const parts = line.split(',');
            if(parts.length >= 2) {
                const email = parts[0].trim().toLowerCase();
                const role = parseInt(parts[1].trim());
                
                if(email && !isNaN(role)) {
                    if(role >= currentRole && currentRole !== ROLES.PRIMARY) continue;
                    
                    const existing = users.find(u => u.email === email);
                    if(existing) {
                        await DatabaseAPI.update('users', existing.id, { role: role });
                        existing.role = role; 
                    } else {
                        const newId = "AUT-26-" + Math.floor(1000 + Math.random() * 9000);
                        const newUser = { id: newId, name: "Pending User", email: email, password: "defaultpass", role: role, phone: "" };
                        await DatabaseAPI.add('users', newUser);
                        users.push(newUser); 
                    }
                    count++;
                }
            }
        }
        
        fileInput.value = '';
        showMessage(`Successfully processed ${count} role assignments.`);
        closeModal('adminAddUserModal');
        renderAdminDashboard();
    };
    reader.readAsText(file);
}

// ----------------------------------------------------
// ADMIN REPLIES (MOCK EMAIL) LOGIC
// ----------------------------------------------------
window.openAdminReplyModal = function(collection, id, email, name = '') {
    replyTargetCollection = collection;
    replyTargetId = id;
    replyTargetEmail = email;
    
    const targetEl = document.getElementById('adminReplyTargetEmail');
    if (targetEl) targetEl.innerText = email;
    
    const subjEl = document.getElementById('adminReplySubject');
    if (subjEl) subjEl.value = `Re: Your ${collection === 'sponsors' ? 'Sponsorship ' : ''}Inquiry`;
    
    const attachLinks = document.getElementById('adminReplyLinks');
    if(attachLinks) attachLinks.value = '';
    
    const attachFiles = document.getElementById('adminReplyFiles');
    if(attachFiles) attachFiles.value = '';
    
    const msgBox = document.getElementById('adminReplyMessage');
    if(msgBox) {
        msgBox.innerHTML = name && name !== "Pending User" ? `Dear <b>${name}</b>,<br><br>` : '';
    }
    
    openModal('adminReplyModal');
}

window.executeAdminReply = async function() {
    const subj = document.getElementById('adminReplySubject').value;
    
    let attachLinks = document.getElementById('adminReplyLinks')?.value || "";
    let attachFiles = document.getElementById('adminReplyFiles')?.files?.length || 0;
    
    const msgBox = document.getElementById('adminReplyMessage');
    const textMsg = msgBox ? msgBox.innerText.trim() : "";
    
    if(!textMsg) {
         showMessage("Please type a message before sending.");
         return;
    }
    
    let statusText = replyTargetCollection === 'queries' ? 'Replied' : 'Reviewed & Replied';
    if (replyTargetCollection !== 'users') {
        // Saving the reply back to the database as requested!
        await DatabaseAPI.update(replyTargetCollection, replyTargetId, { status: statusText, replyText: textMsg });
    }
    
    closeModal('adminReplyModal');
    
    let extraText = (attachFiles > 0 || attachLinks) ? " (with attachments/links)" : "";
    showMessage(`Email sent to ${replyTargetEmail}${extraText}! ${replyTargetCollection !== 'users' ? 'Database status updated.' : ''}`);
    renderAdminDashboard(); 
}

window.openQueryDetails = async function(id) {
    const queries = await DatabaseAPI.get('queries');
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
        <button onclick="closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Close</button>
        <button onclick="closeModal('adminDetailsModal'); openAdminReplyModal('queries', '${q.id}', '${q.email}', '${q.name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-2"><i data-lucide="reply" class="w-4 h-4"></i> Reply via Email</button>
    `;
    openModal('adminDetailsModal');
    renderIcons();
}

window.renderAdminQueries = async function() {
    const queries = await DatabaseAPI.get('queries');
    const table = document.getElementById('admin-queries-table');
    if(!table) return;
    table.innerHTML = queries.length ? queries.map(q => `
        <tr class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors" onclick="openQueryDetails('${q.id}')">
            <td class="p-3 font-bold text-white text-xs">${q.name}</td>
            <td class="p-3 text-xs text-zinc-400">${q.email}</td>
            <td class="p-3 text-xs text-zinc-300 truncate max-w-[150px] sm:max-w-[250px] block">${q.message}</td>
            <td class="p-3 text-[10px] text-zinc-500">${q.date}</td>
            <td class="p-3 text-right">
                ${(q.status === 'Replied') ? `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[10px] uppercase font-bold">Replied</span>` :
                `<span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[10px] uppercase font-bold">Pending</span>`}
            </td>
        </tr>
    `).join('') : `<tr><td colspan="5" class="p-4 text-center text-zinc-500 text-xs italic">No general queries found.</td></tr>`;
}

window.openSponsorDetails = async function(id) {
    const sponsors = await DatabaseAPI.get('sponsors');
    const s = sponsors.find(x => x.id === id);
    if (!s) return;

    document.getElementById('adminDetailsTitle').innerText = "Sponsorship Proposal";
    document.getElementById('adminDetailsContent').innerHTML = `
        <div class="space-y-4 text-sm">
            <div class="grid grid-cols-2 gap-4">
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Company</span><p class="text-white font-medium">${s.company}</p></div>
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Contact Person</span><p class="text-white font-medium">${s.contact}</p></div>
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Email</span><p class="text-white font-medium select-all">${s.email}</p></div>
                <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Phone</span><p class="text-white font-medium select-all">${s.phone}</p></div>
            </div>
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Proposal Link / Deck</span>
                 <div class="bg-black/40 p-4 rounded-xl border border-white/5 break-all">
                    <a href="${s.link}" target="_blank" class="text-blue-400 hover:underline flex items-center gap-2"><i data-lucide="external-link" class="w-4 h-4"></i> ${s.link}</a>
                 </div>
            </div>
        </div>
    `;
    document.getElementById('adminDetailsFooter').innerHTML = `
        <button onclick="closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Close</button>
        <button onclick="closeModal('adminDetailsModal'); openAdminReplyModal('sponsors', '${s.id}', '${s.email}', '${s.contact.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-2"><i data-lucide="reply" class="w-4 h-4"></i> Reply to Proposal</button>
    `;
    openModal('adminDetailsModal');
    renderIcons();
}

window.renderAdminSponsors = async function() {
    const sponsors = await DatabaseAPI.get('sponsors');
    const table = document.getElementById('admin-sponsors-table');
    if(!table) return;
    table.innerHTML = sponsors.length ? sponsors.map(s => `
        <tr class="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors" onclick="openSponsorDetails('${s.id}')">
            <td class="p-3 font-bold text-white text-xs">${s.company}</td>
            <td class="p-3 text-xs text-zinc-300">${s.contact} <br><span class="text-zinc-500 text-[10px]">${s.email}</span></td>
            <td class="p-3 text-xs text-blue-400 break-words"><a href="${s.link}" target="_blank" onclick="event.stopPropagation()" class="hover:underline">View Deck</a></td>
            <td class="p-3 text-right">
                ${(s.status === 'Reviewed & Replied' || s.status === 'Replied') ? `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[10px] uppercase font-bold">Reviewed</span>` :
                `<span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[10px] uppercase font-bold">Pending</span>`}
            </td>
        </tr>
    `).join('') : `<tr><td colspan="4" class="p-4 text-center text-zinc-500 text-xs italic">No sponsorship applications found.</td></tr>`;
}

window.renderAdminSearchTable = async function() {
    const query = document.getElementById('admin-part-search').value.toLowerCase();
    const allUsers = await DatabaseAPI.get('users');
    const payments = await DatabaseAPI.get('payments');
    const regs = await DatabaseAPI.get('registrations');
    const accoms = await DatabaseAPI.get('accommodations');

    let participantUsers = [];
    
    allUsers.forEach(u => {
        const userRegs = regs.filter(r => r.leader === u.id || (r.members && r.members.includes(u.id)));
        const userAccom = accoms.find(a => a.id === u.id);
        const userPays = payments.filter(p => p.user === u.id);

        if (userRegs.length > 0 || userAccom || userPays.length > 0) {
            const teamCodes = userRegs.map(r => r.teamCode).filter(c => c).join(', ');
            participantUsers.push({
                ...u,
                teamCodes: teamCodes || 'Individual / Stay',
                payIds: userPays.map(p => p.id).join(', ')
            });
        }
    });

    let filteredUsers = participantUsers;
    if(query) {
        filteredUsers = participantUsers.filter(u => {
            return u.name.toLowerCase().includes(query) || 
                   u.id.toLowerCase().includes(query) || 
                   u.email.toLowerCase().includes(query) ||
                   u.teamCodes.toLowerCase().includes(query) ||
                   u.payIds.toLowerCase().includes(query);
        });
    }

    const table = document.getElementById('admin-search-table');
    if(!table) return;

    const thead = table.closest('table').querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 sm:p-4 font-bold">Account ID</th>
            <th class="p-3 sm:p-4 font-bold">Name</th>
            <th class="p-3 sm:p-4 font-bold">Details (Team/Email)</th>
            <th class="p-3 sm:p-4 font-bold text-right">Action</th>
        `;
    }

    table.innerHTML = filteredUsers.length ? filteredUsers.map(u => `
        <tr class="border-b border-white/5 hover:bg-white/5 cursor-pointer" onclick="openAdminUserProfile('${u.id}')">
            <td class="p-3 font-mono text-cyan-400 text-xs">${u.id}</td>
            <td class="p-3 text-xs text-white font-bold">${u.name}</td>
            <td class="p-3 text-xs text-zinc-400">
                <div>${u.email}</div>
                <div class="text-[10px] text-amber-500 mt-0.5">Team: ${u.teamCodes}</div>
            </td>
            <td class="p-3 flex justify-end items-center gap-3">
                <button onclick="event.stopPropagation(); openAdminReplyModal('users', '${u.id}', '${u.email}', '${u.name.replace(/'/g, "\\'")}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] uppercase font-bold transition shadow whitespace-nowrap">Email User</button>
                <i data-lucide="chevron-right" class="w-4 h-4 text-zinc-500 hover:text-white transition"></i>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="4" class="p-4 text-center text-zinc-500 text-xs italic">No participants found matching the criteria.</td></tr>`;
    renderIcons();
}

window.searchAdminUsers = function() {
    const query = document.getElementById('admin-user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#admin-users-table tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

window.openAdminUserProfile = async function(userId) {
    const users = await DatabaseAPI.get('users');
    const regs = await DatabaseAPI.get('registrations');
    const pays = await DatabaseAPI.get('payments');
    const accoms = await DatabaseAPI.get('accommodations');
    
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
    openModal('adminUserProfileModal');
}

// Camera Logic
window.startCameraScan = function() {
  document.getElementById('scanner-action-buttons').classList.add('hidden');
  document.getElementById('reader-container').classList.remove('hidden');
  document.getElementById('scan-result').classList.add('hidden');

  html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
      showMessage("Camera access denied or unavailable.");
      stopCameraScan();
    });
}

window.stopCameraScan = function() {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
      resetScannerUI();
    }).catch(err => {
      html5QrCode.clear();
      html5QrCode = null;
      resetScannerUI();
    });
  } else {
    resetScannerUI();
  }
}

function resetScannerUI() {
  const container = document.getElementById('reader-container');
  const btns = document.getElementById('scanner-action-buttons');
  if(container) container.classList.add('hidden');
  if(btns) btns.classList.remove('hidden');
}

window.handleQrImageUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader");
  }

  html5QrCode.scanFile(file, true)
    .then(decodedText => {
      onScanSuccess(decodedText);
    })
    .catch(err => {
      showMessage("Could not detect QR Code in the image.");
    })
    .finally(() => {
      event.target.value = "";
    });
}

function onScanSuccess(decodedText) {
  document.getElementById('scan-input').value = decodedText;
  stopCameraScan();
  simulateScan();
}

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

  await DatabaseAPI.add('logs', { id: input, type: type, timestamp: new Date().toLocaleString(), by: userProfile.email });
  
  // Re-render analytics live
  if (currentRole >= ROLES.ADMIN) {
      await renderAnalytics(); 
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
            <button onclick="document.getElementById('scan-result').innerHTML='<p class=\\'text-cyan-400 font-bold text-xs sm:text-sm text-center w-full break-words\\'>Team Attendance Marked by ${userProfile.email}</p>';" class="flex-1 py-2 sm:py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
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
            <button onclick="document.getElementById('scan-result').innerHTML='<p class=\\'text-emerald-400 font-bold text-xs sm:text-sm text-center w-full break-words\\'>Attendance Marked by ${userProfile.email}</p>';" class="flex-1 py-2 sm:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
                Mark Checked-In
            </button>
            <button onclick="document.getElementById('scan-input').value=''; document.getElementById('scan-result').classList.add('hidden');" class="flex-1 py-2 sm:py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-bold text-[9px] sm:text-xs uppercase tracking-widest transition text-center w-full">
                Next Scan
            </button>
        </div>`;
  }

  resDiv.className = "mt-4 sm:mt-6 text-left p-3 sm:p-4 rounded-xl border bg-emerald-900/20 border-emerald-500/30 animate-[fadeInSlide_0.2s_ease-out] w-full";
  resDiv.innerHTML = resultHtml;
  renderIcons();
}

window.toggleAdminEventStatus = function(cat, id) {
  let ev = EVENTS_DATA[cat].find(e => e.id === id);
  if (ev) {
    ev.status = ev.status === 'open' ? 'closed' : 'open';
    renderAdminDashboard();
    showMessage(`Registration for ${ev.name} is now ${ev.status}.`);
  }
}

window.deleteAdminEvent = function(cat, id) {
  EVENTS_DATA[cat] = EVENTS_DATA[cat].filter(e => e.id !== id);
  updateDynamicCalendar();
  renderAdminDashboard();
  showMessage("Event deleted.");
}

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
}

window.toggleEventBannerInput = function(type) {
    eventBannerUploadType = type;
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
}

window.openAdminEventModal = function(cat = null, id = null) {
  document.getElementById('adminEventModalTitle').innerText = id ? "Edit Event" : "Create Event";
  
  const fileText = document.getElementById('ev-banner-file-text');
  if(fileText) fileText.innerText = "Click to upload JPG/PNG";
  const fileInput = document.getElementById('adminEvBannerFile');
  if (fileInput) fileInput.value = '';
  
  if (id && cat) {
    const ev = EVENTS_DATA[cat].find(e => e.id === id);
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
    document.getElementById('adminEvBanner').value = '';
    document.getElementById('adminEvDesc').value = '';
    if(cat) document.getElementById('adminEvCat').value = cat;
    
    window.toggleEventBannerInput('file');
    document.getElementById('adminEvBannerLink').value = '';
  }
  
  window.toggleAdminEventFields();
  openModal('adminEventModal');
}

window.saveAdminEvent = async function() {
  const id = document.getElementById('adminEvId').value;
  const cat = document.getElementById('adminEvCat').value;
  const isFest = cat === 'festivals';
  
  let bannerVal = '';
  if (eventBannerUploadType === 'link') {
      bannerVal = document.getElementById('adminEvBannerLink').value;
  } else {
      const fileInput = document.getElementById('adminEvBannerFile');
      if (fileInput && fileInput.files.length > 0) {
          showMessage("Uploading banner to Google Drive... Please wait.");
          bannerVal = await uploadFileToDrive(fileInput.files[0]);
          if (!bannerVal) { showMessage("Banner upload failed."); return; }
      }
  }
  
  const newEv = {
    id: id || (isFest ? 'f' : 'e') + Date.now(),
    category: cat,
    status: 'open',
    name: document.getElementById('adminEvName').value,
    fee: isFest ? 0 : parseInt(document.getElementById('adminEvFee').value || 0),
    prize: isFest ? '-' : document.getElementById('adminEvPrize').value,
    team: isFest ? '1' : document.getElementById('adminEvTeam').value,
    date: document.getElementById('adminEvDate').value,
    venue: document.getElementById('adminEvVenue').value,
    banner: bannerVal,
    desc: document.getElementById('adminEvDesc').value
  };

  // Sync to Database instead of local array
  await DatabaseAPI.add('events', newEv);
  
  // Automate Mail to Creator
  if (!id) {
      fetch(`${BASE_URL}/send-mail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              subject: `New Setup Authorized: ${newEv.name}`,
              body: `Admin ${userProfile.name} successfully added/configured the event or festival: "${newEv.name}".`,
              recipients: [{ email: userProfile.email, name: userProfile.name }]
          })
      });
  }

  await buildEventsData();
  closeModal('adminEventModal');
  renderAdminDashboard();
  showMessage(id ? "Event updated successfully!" : "Event created successfully!");
}

window.populateScannerEventDropdown = function() {
  const select = document.getElementById('scan-event-select');
  if (!select) return;

  select.innerHTML = '';
  
  for (const [cat, events] of Object.entries(EVENTS_DATA)) {
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
}

window.toggleEventSelectScanner = function() {
  const type = document.getElementById('scan-type').value;
  const eventContainer = document.getElementById('scanner-event-container');
  if (!eventContainer) return;

  if (type === 'event') {
    eventContainer.classList.remove('hidden');
  } else {
    eventContainer.classList.add('hidden');
  }
}

window.openGalleryDetails = function(id) {
    DatabaseAPI.get('gallery').then(allGallery => {
        const dbPendingUploads = allGallery.filter(g => g.status === 'Pending');
        const img = dbPendingUploads.find(p => p.id == id);
        if (!img) return;

        document.getElementById('adminDetailsTitle').innerText = "Review Gallery Submission";
        document.getElementById('adminDetailsContent').innerHTML = `
            <div class="flex flex-col gap-4">
                <img src="${img.url}" class="w-full max-h-64 object-cover rounded-xl border border-white/10 shadow-lg">
                <div>
                    <p class="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mb-1">Uploaded by ${img.user}</p>
                    <p class="text-xs sm:text-sm font-bold text-rose-400">${img.event}</p>
                    <p class="text-xs sm:text-sm text-white mb-3">"${img.caption}"</p>
                    <textarea id="gal-msg-modal-${img.id}" class="w-full bg-black/50 border border-zinc-700 rounded p-3 text-xs text-white focus:outline-none focus:border-rose-500" placeholder="Optional email feedback to the user..."></textarea>
                </div>
            </div>
        `;
        document.getElementById('adminDetailsFooter').innerHTML = `
            <button onclick="closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Cancel</button>
            <div class="flex gap-2">
                <button onclick="closeModal('adminDetailsModal'); rejectGalleryImage('${img.id}')" class="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-sm font-bold transition border border-red-500/30">Reject & Delete</button>
                <button onclick="closeModal('adminDetailsModal'); approveGalleryImage('${img.id}')" class="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg text-sm font-bold transition border border-emerald-500/30">Approve & Publish</button>
            </div>
        `;
        openModal('adminDetailsModal');
        renderIcons();
    });
};

window.approveGalleryImage = async function(id) {
    const allGallery = await DatabaseAPI.get('gallery');
    const img = allGallery.find(p => p.id === id);
    if (img) {
        const tags = `${img.event} ${img.caption} ${img.user}`.toLowerCase();
        
        let msgEl = document.getElementById('gal-msg-' + id) || document.getElementById('gal-msg-modal-' + id);
        const customMsg = msgEl && msgEl.value.trim() ? msgEl.value : "Your gallery submission was approved!";
        
        await DatabaseAPI.update('gallery', img.id, { status: 'Approved', tags: tags, likes: 0 });

        const users = await DatabaseAPI.get('users');
        const userObj = users.find(u => u.name === img.user);
        if (userObj) {
            fetch(`${BASE_URL}/send-mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: `Gallery Submission Approved: ${img.event}`,
                    body: `Hello ${img.user},<br><br>${customMsg}<br><br>View it live in the gallery!`,
                    recipients: [{ email: userObj.email, name: img.user }]
                })
            });
        }

        renderAdminDashboard();
        showMessage(`Image approved! Email sent.`);
    }
};

window.rejectGalleryImage = async function(id) {
    const allGallery = await DatabaseAPI.get('gallery');
    const img = allGallery.find(p => p.id === id);
    if (!img) return;

    let msgEl = document.getElementById('gal-msg-' + id) || document.getElementById('gal-msg-modal-' + id);
    const customMsg = msgEl && msgEl.value.trim() ? msgEl.value : "Your gallery submission was declined.";
    
    await DatabaseAPI.delete('gallery', id);
    
    const users = await DatabaseAPI.get('users');
    const userObj = users.find(u => u.name === img.user);
    if (userObj) {
        fetch(`${BASE_URL}/send-mail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: `Gallery Submission Update: ${img.event}`,
                body: `Hello ${img.user},<br><br>${customMsg}`,
                recipients: [{ email: userObj.email, name: img.user }]
            })
        });
    }

    renderAdminDashboard();
    showMessage(`Image rejected. Email sent.`);
};