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
            
            const role = parsed.currentRole || 0;
            let css = '';
            
            if (role >= 1) {
                css += '#nav-admin { display: inline-block !important; } ';
                css += '#mobile-nav-admin { display: block !important; } ';
            }
            if (parsed.isLoggedIn) {
                css += '#nav-notif-btn, #mobile-nav-notif { display: flex !important; } ';
            }

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
window.injectSharedComponents = function() {
    const modalsHTML = `
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

        <div id="adminUserProfileModal" class="fixed inset-0 z-[140] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminUserProfileModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Participant Profile</h3>
                    <button onclick="closeModal('adminUserProfileModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0" id="adminUserProfileContent">
                </div>
            </div>
        </div>

        <div id="adminDetailsModal" class="fixed inset-0 z-[160] hidden items-center justify-center p-4 sm:p-6">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminDetailsModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 id="adminDetailsTitle" class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Details</h3>
                    <button onclick="closeModal('adminDetailsModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0 flex flex-col gap-4 text-zinc-300" id="adminDetailsContent">
                </div>
                <div class="p-4 sm:p-5 bg-black/40 border-t border-white/10 flex justify-end gap-3 shrink-0" id="adminDetailsFooter">
                </div>
            </div>
        </div>

        <div id="adminAddUserModal" class="fixed inset-0 z-[150] hidden items-center justify-center p-4 sm:p-6">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('adminAddUserModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Assign Role</h3>
                    <button onclick="closeModal('adminAddUserModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="p-4 sm:p-6 overflow-y-auto w-full custom-scrollbar flex-1 min-h-0 flex flex-col gap-4">
                    <div class="bg-black/40 p-4 rounded-xl border border-white/10">
                        <h4 class="text-white font-bold text-sm mb-3">Pre-assign Individual</h4>
                        <input type="email" id="newUserEmail" placeholder="User Email" class="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:border-blue-500 mb-3 outline-none">
                        <select id="newUserRole" class="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:border-blue-500 mb-3 outline-none appearance-none">
                            <option value="0">User (L0)</option><option value="1">Admin (L1)</option><option value="2">Super Admin (L2)</option><option value="3">Super Account (L3)</option>
                        </select>
                        <button onclick="adminAddSingleUser()" class="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold text-xs transition">Assign Role</button>
                    </div>
                    <div class="bg-black/40 p-4 rounded-xl border border-white/10">
                        <h4 class="text-white font-bold text-sm mb-3">Bulk Pre-assign (CSV)</h4>
                        <p class="text-[10px] text-zinc-400 mb-3 leading-relaxed">Upload a CSV with columns: <b>email, role</b>.<br>Roles: 0=User, 1=Admin, 2=SuperAdmin, 3=SuperAccount.</p>
                        <input type="file" id="bulkRoleUpload" accept=".csv" class="w-full text-[10px] text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 mb-3 cursor-pointer outline-none">
                        <button onclick="adminBulkUploadUsers()" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-xs transition">Upload & Process</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="accomSettingsModal" class="fixed inset-0 z-[160] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('accomSettingsModal')"></div>
            <div class="relative w-full max-h-[85dvh] max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2"><i data-lucide="settings" class="w-5 h-5 text-blue-400"></i> Capacity Settings</h3>
                    <button onclick="closeModal('accomSettingsModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
                    <div>
                        <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Max Male Rooms</label>
                        <input type="number" id="adminMaleRooms" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Max Female Rooms</label>
                        <input type="number" id="adminFemaleRooms" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Persons Per Room</label>
                        <input type="number" id="adminPerRoom" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500">
                    </div>
                    <button onclick="window.saveAccomSettings()" class="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)]">Save Configuration</button>
                </div>
            </div>
        </div>

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
                    <div class="flex items-center gap-2 text-xs text-zinc-400 bg-black/30 p-2 rounded-lg border border-white/5"><span class="font-bold w-14 shrink-0">To:</span> <span id="adminReplyTargetEmail" class="text-white break-all"></span></div>
                    <div class="flex items-center gap-2 text-xs text-zinc-400 bg-black/30 p-2 rounded-lg border border-white/5"><span class="font-bold w-14 shrink-0">Subject:</span> <input type="text" id="adminReplySubject" class="bg-transparent border-none outline-none text-white w-full" placeholder="Re: Your Inquiry"></div>
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
                    <button onclick="window.executeAdminReply()" class="w-full py-3 sm:py-3.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-[0_0_15px_rgba(37,99,235,0.4)] flex justify-center items-center gap-2 shrink-0"><i data-lucide="send" class="w-4 h-4"></i> Send Email & Update Status</button>
                </div>
            </div>
        </div>

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
                        
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Proposal Details / Message</label><textarea id="sponMessage" rows="3" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" placeholder="Tell us how you'd like to collaborate..."></textarea></div>

                        <div>
                            <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-2">Proposal Document (Optional)</label>
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

        <div id="forgotPasswordModal" class="fixed inset-0 z-[160] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('forgotPasswordModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col p-6 text-center">
                <div class="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="lock" class="w-8 h-8 text-rose-500"></i></div>
                <h3 class="text-xl font-bold text-white mb-2">Reset Password</h3>
                <p class="text-xs text-zinc-400 mb-6" id="forgotPassDesc">Enter your registered email to receive a 6-digit OTP.</p>
                <div id="forgotPassStep1">
                    <input type="email" id="forgotEmail" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 outline-none mb-4" placeholder="Your Email Address">
                    <button onclick="requestOTP()" class="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition">Send OTP</button>
                </div>
                <div id="forgotPassStep2" class="hidden">
                    <input type="text" id="forgotOtp" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono tracking-widest text-lg focus:border-rose-500 outline-none mb-3" placeholder="------" maxlength="6">
                    <input type="password" id="forgotNewPass" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-rose-500 outline-none mb-4" placeholder="New Password">
                    <button onclick="verifyOTPAndReset()" class="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition">Reset Password</button>
                </div>
                <button onclick="closeModal('forgotPasswordModal')" class="mt-4 text-xs text-zinc-500 hover:text-white">Cancel</button>
            </div>
        </div>

        <div id="signupOtpModal" class="fixed inset-0 z-[160] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('signupOtpModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col p-6 text-center">
                <div class="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="mail-check" class="w-8 h-8 text-blue-500"></i></div>
                <h3 class="text-xl font-bold text-white mb-2">Verify Email</h3>
                <p class="text-xs text-zinc-400 mb-6">Enter the 6-digit OTP sent to your email to securely create your account.</p>
                <input type="text" id="signupOtpInput" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono tracking-widest text-lg focus:border-blue-500 outline-none mb-4" placeholder="------" maxlength="6">
                <button onclick="verifySignupOTP()" class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow">Verify & Create Account</button>
                <button onclick="closeModal('signupOtpModal')" class="mt-4 text-xs text-zinc-500 hover:text-white">Cancel Signup</button>
            </div>
        </div>

        <div id="profileEditModal" class="fixed inset-0 z-[120] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('profileEditModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Edit Profile</h3>
                    <button onclick="closeModal('profileEditModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="overflow-y-auto w-full flex-1 min-h-0 custom-scrollbar">
                    <form onsubmit="event.preventDefault(); window.saveProfile();" class="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        <div class="flex justify-center mb-2 sm:mb-4">
                            <input type="file" id="photoUpload" accept="image/*" class="hidden" onchange="window.previewProfilePhoto(event)">
                            <div onclick="document.getElementById('photoUpload').click()" class="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition overflow-hidden group border-2 border-zinc-700 shrink-0">
                                <img id="editPhotoPreview" src="" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center"><i data-lucide="camera" class="w-4 h-4 sm:w-5 sm:h-5 text-white"></i></div>
                            </div>
                        </div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Full Name</label><input id="editName" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required></div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Email</label><input id="editEmail" type="email" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500" required disabled></div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Phone</label><input id="editPhone" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500"></div>
                            <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">Gender</label><select id="editGender" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 appearance-none"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                        </div>
                        <div><label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1">College</label><input id="editCollege" type="text" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500"></div>
                        <button type="submit" class="w-full py-3 sm:py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm sm:text-base font-bold transition mt-2 sm:mt-4 mb-4">Save Changes</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="eventModal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('eventModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-4xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="absolute top-0 left-0 w-full h-40 sm:h-64 bg-gradient-to-br from-red-900/20 to-transparent pointer-events-none shrink-0" id="eventModalGradient"></div>
                <div class="p-5 sm:p-6 md:p-8 flex justify-between items-start relative z-10 shrink-0 gap-4">
                    <div class="flex-1 min-w-0 pr-0">
                        <h2 id="modalName" class="text-2xl sm:text-4xl md:text-5xl font-black text-rose-500 font-serif tracking-tight mb-2 break-words leading-tight">Event Name</h2>
                        <span id="modalStatusBadge" class="hidden px-2 sm:px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-red-500/30 inline-block mb-1">Registrations Closed</span>
                    </div>
                    <button onclick="closeModal('eventModal')" class="w-8 h-8 md:w-10 md:h-10 bg-red-900/80 hover:bg-red-700 rounded-full text-white z-10 flex items-center justify-center transition border border-red-700/50 shadow-lg shrink-0"><i data-lucide="x" class="w-4 h-4 md:w-5 md:h-5"></i></button>
                </div>
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
                <div class="p-4 pb-8 sm:pb-6 md:p-6 bg-zinc-950 border-t border-zinc-800 shrink-0 flex justify-end relative z-10 w-full" id="modalFooterContainer">
                    <button id="modalRegBtn" onclick="window.openRegisterModal()" class="w-full sm:w-auto px-6 sm:px-8 py-3 md:py-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-sm md:text-base shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all text-center">Register Now</button>
                </div>
            </div>
        </div>

        <div id="registerModal" class="fixed inset-0 z-[110] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('registerModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-rose-900/20 to-transparent pointer-events-none shrink-0"></div>
                <div class="p-5 sm:p-6 md:p-8 border-b border-zinc-800/50 flex justify-between items-start sm:items-center relative z-10 shrink-0 gap-4">
                    <div class="flex-1 min-w-0 pr-0">
                        <span class="text-[10px] sm:text-xs font-bold text-rose-500 uppercase tracking-widest mb-1 block truncate">Registration</span>
                        <h2 class="text-xl sm:text-2xl md:text-3xl font-black text-white font-serif tracking-tight break-words leading-tight" id="regEventName">Event Name</h2>
                    </div>
                    <button onclick="closeModal('registerModal')" class="w-8 h-8 sm:w-10 sm:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white flex items-center justify-center shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div id="regTabs" class="hidden flex bg-zinc-950/80 border-b border-zinc-800 relative z-10 shrink-0 w-full overflow-hidden">
                    <button id="tabCreate" onclick="window.setRegMode('create')" class="flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-rose-600 text-rose-500 px-2 min-w-0">Create Team</button>
                    <button id="tabJoin" onclick="window.setRegMode('join')" class="flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 px-2 min-w-0">Join Team</button>
                </div>
                <div class="p-5 sm:p-6 md:p-8 overflow-y-auto w-full flex-1 min-h-0 relative z-10 custom-scrollbar flex flex-col" id="regFormContainer"></div>
                <div class="p-4 pb-8 sm:pb-6 sm:p-6 bg-zinc-950 border-t border-zinc-800 shrink-0 flex flex-wrap sm:flex-nowrap justify-between items-center relative z-10 w-full gap-4">
                    <div class="shrink-0 w-full sm:w-auto flex sm:block justify-between items-center sm:items-start">
                        <p class="text-[9px] sm:text-[10px] uppercase tracking-widest text-zinc-500 font-bold sm:mb-1">Total Fee</p>
                        <p class="text-xl sm:text-2xl font-bold text-amber-400" id="regTotalFee">₹0</p>
                    </div>
                    <div id="regFooterBtns" class="w-full sm:w-auto flex justify-end shrink-0"></div>
                </div>
            </div>
        </div>

        <div id="uploadModal" class="fixed inset-0 z-[100] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('uploadModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-[fadeInSlide_0.3s_ease-out] flex flex-col">
                <div class="flex justify-between items-center mb-4 shrink-0 gap-4">
                    <h3 class="text-lg sm:text-xl font-bold text-white flex-1 min-w-0 truncate break-words">Upload to Gallery</h3>
                    <button onclick="closeModal('uploadModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
                </div>
                <div class="overflow-y-auto w-full custom-scrollbar flex-1 min-h-0">
                    <div class="flex gap-2 mb-3">
                        <button type="button" onclick="window.toggleGalleryUploadType('file')" id="btn-gal-file" class="flex-1 py-1.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider transition">Upload File</button>
                        <button type="button" onclick="window.toggleGalleryUploadType('link')" id="btn-gal-link" class="flex-1 py-1.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition">Drive Link</button>
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
                    <button onclick="window.submitGalleryUpload()" class="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-500 transition" id="galUploadBtn">Submit</button>
                </div>
            </div>
        </div>

        <div id="razorpayModal" class="fixed inset-0 z-[150] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeModal('razorpayModal')"></div>
            <div class="relative w-full max-h-[85dvh] sm:max-h-[90dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]" id="rzpBox">
                <div class="bg-[#0a1a2e] p-4 sm:p-5 text-white flex justify-between items-center shadow-md z-10 relative shrink-0 gap-4">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-7 h-7 bg-blue-500 rounded flex items-center justify-center shadow-inner shrink-0"><i data-lucide="zap" class="w-4 h-4 text-white"></i></div>
                        <span class="font-bold text-lg tracking-wide font-sans truncate break-words">Razorpay Checkout</span>
                    </div>
                    <button onclick="closeModal('razorpayModal')" class="text-white/70 hover:text-white bg-white/10 p-1.5 rounded-full transition shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto bg-gray-50/50 custom-scrollbar">
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
                        <div>
                            <p class="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Amount to pay</p>
                            <p class="text-2xl font-black text-gray-800 truncate" id="rzpAmountDisplay">₹0</p>
                        </div>
                        <div class="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0"><i data-lucide="shield-check" class="w-5 h-5"></i></div>
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
                    <button id="rzpPayBtn" onclick="window.confirmMockPayment()" class="w-full py-3.5 sm:py-4 bg-[#3399cc] hover:bg-[#2b82ae] text-white text-sm sm:text-base font-bold rounded-xl shadow-[0_4px_14px_rgba(51,153,204,0.4)] transition-all flex justify-center items-center gap-2 shrink-0">
                        <i data-lucide="lock" class="w-4 h-4 shrink-0"></i> <span class="truncate">Pay Now Securely</span>
                    </button>
                </div>
                <div id="rzpLoader" class="absolute inset-0 bg-white/95 hidden flex-col items-center justify-center z-20 backdrop-blur-sm">
                    <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p class="text-gray-800 font-bold text-sm sm:text-base mb-1 text-center">Processing Payment...</p>
                    <p class="text-gray-500 text-[10px] sm:text-xs text-center px-6">Please do not close this window.</p>
                </div>
            </div>
        </div>

        <div id="notificationsModal" class="fixed inset-0 z-[160] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('notificationsModal')"></div>
            <div class="relative w-full max-h-[85dvh] max-w-[calc(100vw-2rem)] sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0 gap-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2"><i data-lucide="bell" class="w-5 h-5 text-rose-500"></i> Notifications</h3>
                    <button onclick="closeModal('notificationsModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full shrink-0"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div id="notifications-list" class="overflow-y-auto w-full custom-scrollbar flex-1 p-4 space-y-3 bg-zinc-950/50"></div>
            </div>
        </div>

        <div id="userReplyModal" class="fixed inset-0 z-[170] hidden items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal('userReplyModal')"></div>
            <div class="relative w-full max-h-[85dvh] max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeInSlide_0.3s_ease-out]">
                <div class="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0">
                    <h3 class="text-lg font-bold text-white">Reply to Admin</h3>
                    <button onclick="closeModal('userReplyModal')" class="text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="p-4 flex-1 overflow-y-auto">
                    <div class="text-xs text-zinc-400 mb-3 flex flex-col w-full" id="userReplyContext">Replying to...</div>
                    <input type="hidden" id="userReplyNotifId">
                    <textarea id="userReplyMessage" rows="4" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Type your reply to the events team..."></textarea>
                    <button onclick="window.sendUserReply()" class="w-full py-3 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg flex justify-center items-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Send Reply</button>
                </div>
            </div>
        </div>

        <div id="toast" class="fixed bottom-4 right-4 bg-zinc-800 border border-zinc-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-2xl transform translate-y-20 opacity-0 transition-all duration-300 z-[200] flex items-center gap-2 max-w-[calc(100vw-2rem)] break-words">
            <i data-lucide="check-circle" class="text-emerald-500 w-4 h-4 sm:w-5 sm:h-5 shrink-0"></i>
            <span id="toastMsg" class="text-xs sm:text-sm font-medium">Message</span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
    
    const rzpScript = document.createElement('script');
    rzpScript.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(rzpScript);
    
    window.renderIcons(); 
};

// ==========================================
// 2. DATABASE API
// ==========================================
window.BASE_URL = 'http://localhost:5000/api'; 

window.DatabaseAPI = {
    _data: {
        users: [], accommodations: [], registrations: [], payments: [], gallery: [], sponsors: [], queries: [], logs: [], winners: [], events: [], notifications: [], settings: []
    },
    
    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); 
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
        const stored = localStorage.getItem('autumn_fest_db');
        if (stored) this._data = { ...this._data, ...JSON.parse(stored) };
        if (!neededCollections.includes('events')) neededCollections.push('events');
        if (!neededCollections.includes('settings')) neededCollections.push('settings'); 

        const fetchTask = async () => {
            try {
                const collectionsToFetch = neededCollections.length > 0 ? neededCollections : Object.keys(this._data);
                const promises = collectionsToFetch.map(async (col) => {
                    const res = await this._fetchWithTimeout(`${window.BASE_URL}/${col}`);
                    if (res.ok) this._data[col] = await res.json();
                });
                
                await Promise.all(promises);
                await this.save(); 
                
                window.EVENTS_DATA = window.groupEventsData(this._data.events || []);
                window.dispatchEvent(new CustomEvent('db-updated'));
            } catch (e) {
                console.warn("Backend offline. Using local cache.");
            }
        };

        if (stored && this._data.users && this._data.users.length > 0) {
            window.EVENTS_DATA = window.groupEventsData(this._data.events || []);
            fetchTask(); 
        } else {
            await fetchTask(); 
        }
    },
    
    async save() { localStorage.setItem('autumn_fest_db', JSON.stringify(this._data)); },

    async get(collection, forceFetch = false) { 
        if (forceFetch || !this._data[collection] || this._data[collection].length === 0) {
            try {
                const res = await this._fetchWithTimeout(`${window.BASE_URL}/${collection}`);
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
        window.dispatchEvent(new CustomEvent('db-updated')); 
        try {
            await this._fetchWithTimeout(`${window.BASE_URL}/${collection}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item)
            });
        } catch(e) {}
    },

    async update(collection, id, updates) {
        let index = this._data[collection].findIndex(i => i.id === id);
        if (index > -1) {
            this._data[collection][index] = { ...this._data[collection][index], ...updates };
            await this.save();
            window.dispatchEvent(new CustomEvent('db-updated'));
        }
        try {
            await this._fetchWithTimeout(`${window.BASE_URL}/${collection}/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates)
            });
        } catch(e) {}
    },
    
    async delete(collection, id) {
        this._data[collection] = this._data[collection].filter(i => i.id !== id);
        await this.save();
        window.dispatchEvent(new CustomEvent('db-updated')); 
        try { await this._fetchWithTimeout(`${window.BASE_URL}/${collection}/${id}`, { method: 'DELETE' }); } catch(e) {}
    },

    exportToCSV(collectionName) {
        const data = this._data[collectionName];
        if(!data || data.length === 0) { window.showMessage("No data to export!"); return; }
        
        const allEvents = Object.values(window.EVENTS_DATA).flat();
        
        const mappedData = data.map(row => {
            let newRow = { ...row }; 
            if (newRow.eventId) {
                const foundEv = allEvents.find(e => e.id === newRow.eventId);
                newRow.eventName = foundEv ? foundEv.name : newRow.eventId; 
                delete newRow.eventId; 
            }
            const resolveUser = (id) => {
                if (!id || id === 'null' || id === 'None' || id === 'Pending') return id;
                if (id.startsWith('AUT-TEAM-')) return id; 
                const u = this._data.users?.find(user => user.id === id);
                return u ? u.name : id;
            };

            if (newRow.leader) { newRow.leaderName = resolveUser(newRow.leader); delete newRow.leader; }
            if (newRow.user) { newRow.userName = resolveUser(newRow.user); delete newRow.user; }
            if (newRow.requested) { newRow.requestedNames = newRow.requested.split(',').map(id => resolveUser(id.trim())).join(' & '); delete newRow.requested; }
            if (newRow.members && Array.isArray(newRow.members)) { newRow.memberNames = newRow.members.map(id => resolveUser(id)).join(', '); delete newRow.members; }
            if (newRow.firstPlace) newRow.firstPlace = resolveUser(newRow.firstPlace);
            if (newRow.secondPlace) newRow.secondPlace = resolveUser(newRow.secondPlace);
            if (newRow.thirdPlace) newRow.thirdPlace = resolveUser(newRow.thirdPlace);
            return newRow;
        });
        
        const headers = Object.keys(mappedData[0]).join(',');
        const rows = mappedData.map(obj => Object.values(obj).map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val).join(',')).join('\n');
        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `AutumnFest_${collectionName}_${new Date().getTime()}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.showMessage(`${collectionName}.csv downloaded successfully with names!`);
    }
};

window.EVENTS_DATA = { entrepreneurial: [], tech: [], cultural: [], shows: [], online: [], festivals: [] };

window.groupEventsData = function(dbEvents) {
    let grouped = { entrepreneurial: [], tech: [], cultural: [], shows: [], online: [], festivals: [] };
    dbEvents.forEach(ev => {
        const cat = ev.category || 'tech';
        if(grouped[cat]) grouped[cat].push(ev); else grouped[cat] = [ev];
    });
    return grouped;
};

window.uploadFileToDrive = async function(file) {
    const formData = new FormData(); formData.append('file', file);
    try {
        const res = await fetch(`${window.BASE_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Upload failed");
        return data.url;
    } catch (e) { throw e; }
};

// ==========================================
// 3. STATE & DATA CACHING
// ==========================================
window.isSignupMode = false;
window.ROLES = { USER: 0, ADMIN: 1, SUPERADMIN: 2, SUPERACCOUNT: 3, PRIMARY: 4 };
window.CACHE_KEY = "autumn_fest_state";

window.currentRole = window.ROLES.USER;
window.isLoggedIn = false;
window.isAdmin = false;
window.festStatus = 'active'; 
window.postLoginRedirect = 'home';

window.pendingRzpAmount = 0;
window.pendingRzpSuccessMsg = "";
window.pendingRzpCallback = null;

window.userProfile = {
  name: "", email: "", phone: "", gender: "Not Specified",
  college: "University", photo: "", tempPhoto: "",
  accountId: "", registrations: [], payments: [], accommodation: null
};

window.currentModalEvent = null;
window.currentRegMax = 1;
window.currentRegMin = 1;
window.teamMemberCount = 1;
window.regMode = 'create';
window.currentPendingFee = 0;
window.festDate = new Date('2026-10-20T09:00:00');
window.html5QrCode = null;

window.galleryUploadType = 'file';
window.sponsorUploadType = 'file';
window.eventBannerUploadType = 'file';
window.replyTargetCollection = '';
window.replyTargetId = '';
window.replyTargetEmail = '';

window.saveCache = function() {
  const state = { userId: window.userProfile.accountId, isLoggedIn: window.isLoggedIn, currentRole: window.currentRole, festStatus: window.festStatus };
  localStorage.setItem(window.CACHE_KEY, JSON.stringify(state));
};

window.getAccomSettings = async function() {
    const settings = await window.DatabaseAPI.get('settings');
    const accomSettings = settings.find(s => s.id === 'accom_capacity');
    if (accomSettings) return accomSettings;
    return { id: 'accom_capacity', maleRooms: 150, femaleRooms: 120, perRoom: 3 };
};

window.checkAccomAvailability = async function(wing, daysArray) {
    let accoms = [];
    try {
        const res = await window.DatabaseAPI._fetchWithTimeout(`${window.BASE_URL}/accommodations`);
        if (res.ok) {
            accoms = await res.json();
            window.DatabaseAPI._data['accommodations'] = accoms; 
        } else {
            accoms = await window.DatabaseAPI.get('accommodations');
        }
    } catch(e) {
        accoms = await window.DatabaseAPI.get('accommodations');
    }

    const settings = await window.getAccomSettings();
    const maxRooms = wing === 'male' ? parseInt(settings.maleRooms || 150) : parseInt(settings.femaleRooms || 120);
    const perRoom = parseInt(settings.perRoom || 3);
    const maxCapacity = maxRooms * perRoom;
    
    for (let day of daysArray) {
        let dbField = day === 'Day 1' ? 'day1' : (day === 'Day 2' ? 'day2' : 'day3');
        const bookedOnDay = accoms.filter(a => a.wing === wing && String(a[dbField]).toLowerCase() === 'yes').length;
        if (bookedOnDay >= maxCapacity) {
            return { available: false, day: day };
        }
    }
    return { available: true };
};

// ==========================================
// 4. INITIALIZATION & UTILITIES
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    window.injectSharedComponents(); 
    
    let path = window.location.pathname;
    let currentPage = path.split('/').pop().replace('.html', '');
    if (!currentPage || currentPage === 'index') currentPage = 'landing';

    window.highlightNavLinks(currentPage);

    if (currentPage === 'profile') {
        const pCont = document.getElementById('profile-container');
        if (pCont) {
            pCont.innerHTML = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center w-full">
                    <div class="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
                    <p class="text-zinc-400 text-sm font-bold uppercase tracking-widest animate-pulse">Loading Profile Data...</p>
                </div>
            `;
        }
    }

    let neededCollections = ['users', 'events']; 
    if (currentPage === 'profile') neededCollections.push('registrations', 'payments', 'accommodations');
    else if (currentPage === 'admin') neededCollections = Object.keys(window.DatabaseAPI._data); 
    else if (currentPage === 'gallery') neededCollections.push('gallery');
    else if (currentPage === 'accommodation') neededCollections.push('accommodations');

    await window.DatabaseAPI.init(neededCollections);
    await window.restoreSession();

    const protectedRoutes = ['home', 'events', 'gallery', 'sponsors', 'accommodation', 'contact', 'profile', 'admin'];
    if (!window.isLoggedIn && protectedRoutes.includes(currentPage)) {
        window.postLoginRedirect = currentPage;
        window.location.href = 'login.html';
        return;
    }

    if (window.isLoggedIn) window.finalizeLoginUI();

    window.renderIcons();

    if (currentPage === 'accommodation') {
        if (window.userProfile && window.userProfile.accountId) {
            window.setupAccommodationForm();
        } else {
            window.addEventListener('db-updated', window.setupAccommodationForm);
        }
    }

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('mobile-menu');
        const btn = document.getElementById('mobile-menu-btn');
        if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
            window.toggleMobileMenu();
        }
    });

    const forgotBtn = document.querySelector('#forgot-pass-link button');
    if (forgotBtn) forgotBtn.onclick = () => { if(typeof window.triggerForgotPassword === 'function') window.triggerForgotPassword(); };

    window.addEventListener('db-updated', async () => {
        if (!window.isLoggedIn) return;
        if (typeof window.updateAdminBadges === 'function') window.updateAdminBadges();
        if (typeof window.refreshNotificationBadges === 'function') window.refreshNotificationBadges();
        
        if (window.isAdmin) {
            const tabs = [
                { id: 'admin-analytics-tab', fn: () => { if(typeof window.renderAnalytics === 'function') window.renderAnalytics(false); } },
                { id: 'admin-accom-tab', fn: window.renderAdminAccomTable },
                { id: 'admin-search-tab', fn: window.renderAdminSearchTable },
                { id: 'admin-queries-tab', fn: window.renderAdminQueries },
                { id: 'admin-sponsors-tab', fn: window.renderAdminSponsors }
            ];
            tabs.forEach(tab => {
                const el = document.getElementById(tab.id);
                if (el && !el.classList.contains('hidden') && typeof tab.fn === 'function') {
                    tab.fn();
                }
            });
        }
    });
});

window.highlightNavLinks = function(page) {
    if (!page || page === 'index' || page === 'landing') page = 'home';

    document.querySelectorAll('#desktop-nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if(href && href.includes(page)) {
            link.style.borderBottom = "2px solid #f43f5e";
            link.style.paddingBottom = "2px";
            link.style.color = "white";
        }
    });

    document.querySelectorAll('#mobile-nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if(href && href.includes(page)) {
            link.style.color = "#f43f5e";
        }
    });
};

window.restoreSession = async function() {
    const cached = localStorage.getItem(window.CACHE_KEY);
    if (cached) {
        const parsed = JSON.parse(cached);
        window.festStatus = parsed.festStatus || 'active';
        if (parsed.isLoggedIn && parsed.userId) {
            const users = await window.DatabaseAPI.get('users');
            const foundUser = users.find(u => u.id === parsed.userId);
            if (foundUser) {
                window.isLoggedIn = true;
                window.currentRole = foundUser.role || window.ROLES.USER;
                window.isAdmin = window.currentRole >= window.ROLES.ADMIN;
                await window.populateUserProfile(foundUser);
            } else {
                window.handleLogout(); 
            }
        }
    }
};

window.populateUserProfile = async function(user) {
    if (!user) return;
    window.userProfile.accountId = user.id;
    window.userProfile.name = user.name;
    window.userProfile.email = user.email;
    window.userProfile.phone = user.phone || "";
    window.userProfile.gender = user.gender || "Not Specified";
    window.userProfile.college = user.college || "University";
    window.userProfile.photo = user.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${window.userProfile.name}`;

    const [regs, pays, accoms] = await Promise.all([
        window.DatabaseAPI.get('registrations'),
        window.DatabaseAPI.get('payments'),
        window.DatabaseAPI.get('accommodations')
    ]);

    window.userProfile.registrations = regs.filter(r => r.leader === user.id || (r.members && r.members.includes(user.id)));
    window.userProfile.payments = pays.filter(p => p.user === user.id);
    
    // Convert day mapping back into duration string for UI
    const accomData = accoms.find(a => a.id === user.id) || null;
    if (accomData) {
        let dur = [];
        if(accomData.day1 === 'yes') dur.push('Day 1');
        if(accomData.day2 === 'yes') dur.push('Day 2');
        if(accomData.day3 === 'yes') dur.push('Day 3');
        accomData.duration = dur.join(', ');
    }
    window.userProfile.accommodation = accomData;
};

window.renderIcons = function() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  else setTimeout(window.renderIcons, 100);
};

window.showMessage = function(msg) {
  const toast = document.getElementById('toast');
  if(!toast) return;
  document.getElementById('toastMsg').innerText = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3000);
};

window.navigate = function(pageId) {
    const protectedRoutes = ['home', 'events', 'gallery', 'sponsors', 'accommodation', 'contact', 'profile', 'admin'];
    if (!window.isLoggedIn && protectedRoutes.includes(pageId)) {
        window.postLoginRedirect = pageId;
        window.location.href = 'login.html';
        return;
    }
    if (pageId === 'admin' && !window.isAdmin) {
        window.showMessage("Access Denied: Admin Privileges Required.");
        return;
    }
    const targetFile = (pageId === 'landing' || pageId === 'index') ? 'index.html' : `${pageId}.html`;
    window.location.href = targetFile;
};

window.toggleMobileMenu = function() {
  const menu = document.getElementById('mobile-menu');
  if(menu) {
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
  }
};

window.goToAuth = function(targetRoute) {
  window.postLoginRedirect = targetRoute;
  window.navigate('login');
};

window.finalizeLoginUI = function() {
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
        desktopAuthBtn.onclick = window.handleLogout;
    }

    if (mobileAuthBtn) {
        mobileAuthBtn.innerHTML = `<i data-lucide="log-out" class="w-5 h-5"></i> Logout`;
        mobileAuthBtn.onclick = () => { window.handleLogout(); window.toggleMobileMenu(); };
    }

    if (window.isAdmin) {
        const navAdmin = document.getElementById('nav-admin');
        const mobileNavAdmin = document.getElementById('mobile-nav-admin');
        if (navAdmin) navAdmin.classList.remove('hidden');
        if (mobileNavAdmin) mobileNavAdmin.classList.remove('hidden');
        if (typeof window.updateAdminBadges === 'function') window.updateAdminBadges();
    }
    
    if(typeof renderIcons === 'function') renderIcons();
    window.refreshNotificationBadges();
};

window.handleLogout = function() {
    window.isLoggedIn = false;
    window.isAdmin = false;
    window.currentRole = window.ROLES.USER;
    
    window.userProfile = {
      name: "", email: "", phone: "", gender: "Not Specified",
      college: "University", photo: "", tempPhoto: "",
      accountId: "", registrations: [], payments: [], accommodation: null
    };

    window.saveCache();
    window.location.href = 'index.html';
};

window.updateGlobalStatus = function(status) {
  window.festStatus = status;
  window.saveCache();
  if (typeof window.applyGlobalStatusUI === 'function') window.applyGlobalStatusUI();
  window.showMessage(`Fest status changed to: ${status.toUpperCase()}`);
};

window.updateAdminBadges = async function() {
    if (!window.isAdmin) return;

    try {
        const queries = await window.DatabaseAPI.get('queries');
        const sponsors = await window.DatabaseAPI.get('sponsors');
        const gallery = await window.DatabaseAPI.get('gallery');

        const pendingQueries = queries.filter(q => q.status === 'Pending').length;
        const pendingSponsors = sponsors.filter(s => s.status === 'Pending').length;
        const pendingGallery = gallery.filter(g => g.status === 'Pending').length;

        const totalPending = pendingQueries + pendingSponsors + pendingGallery;

        const updateNavBadge = (navId, count) => {
            const navEl = document.getElementById(navId);
            if (!navEl) return;
            let navBadge = navEl.querySelector('.admin-nav-badge');
            if (!navBadge) {
                navBadge = document.createElement('span');
                navBadge.className = 'admin-nav-badge ml-1.5 px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full shadow-lg';
                navEl.appendChild(navBadge);
            }
            navBadge.innerText = count;
            navBadge.style.display = count > 0 ? 'inline-block' : 'none';
        };

        updateNavBadge('nav-admin', totalPending);
        updateNavBadge('mobile-nav-admin', totalPending);

        const updateTabBadge = (tabId, count) => {
            const btn = document.getElementById(tabId);
            if (!btn) return;
            let badge = btn.querySelector('.admin-tab-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'admin-tab-badge absolute top-1 right-1 sm:static sm:ml-2 px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full min-w-[20px] text-center shadow-lg transition-transform duration-300';
                btn.classList.add('relative');
                btn.appendChild(badge);
            }
            badge.innerText = count;
            if (count > 0) {
                badge.style.display = 'inline-block';
                badge.classList.add('scale-110');
                setTimeout(() => badge.classList.remove('scale-110'), 200);
            } else {
                badge.style.display = 'none';
            }
        };

        updateTabBadge('tab-btn-queries', pendingQueries);
        updateTabBadge('tab-btn-sponsors', pendingSponsors);
        updateTabBadge('tab-btn-gallery', pendingGallery);
    } catch(e) {}
};

window.refreshNotificationBadges = async function() {
    if (!window.isLoggedIn) return;
    try {
        const allNotifs = await window.DatabaseAPI.get('notifications');
        const myUnread = allNotifs.filter(n => (n.userId === window.userProfile.accountId || (window.isAdmin && n.userId === 'admin')) && String(n.isRead) === 'false');
        
        const dBadge = document.getElementById('desktop-notif-badge');
        if(dBadge) {
            dBadge.style.display = myUnread.length > 0 ? 'inline-block' : 'none';
            dBadge.innerText = myUnread.length;
        }
        
        const mBadge = document.getElementById('mobile-notif-badge');
        if(mBadge) {
            mBadge.style.display = myUnread.length > 0 ? 'inline-block' : 'none';
            mBadge.innerText = myUnread.length;
        }
    } catch(e) {}
};

window.openNotifications = async function() {
    const list = document.getElementById('notifications-list');
    list.innerHTML = `<div class="flex justify-center p-8"><div class="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>`;
    openModal('notificationsModal');

    const allNotifs = await window.DatabaseAPI.get('notifications');
    let myNotifs = allNotifs.filter(n => n.userId === window.userProfile.accountId || (window.isAdmin && n.userId === 'admin'));

    if (myNotifs.length === 0) {
        list.innerHTML = `<div class="text-center p-8 text-zinc-500 italic text-sm">No notifications yet.</div>`;
        return;
    }

    const threads = {};
    myNotifs.forEach(n => {
        const tId = n.threadId || n.id;
        if (!threads[tId]) {
            threads[tId] = { messages: [], unreadCount: 0 };
        }
        threads[tId].messages.push(n);
        if (String(n.isRead) === 'false') threads[tId].unreadCount++;
    });

    const sortedThreads = Object.values(threads).map(t => {
        t.messages.sort((a, b) => new Date(a.date) - new Date(b.date)); 
        t.latestMessage = t.messages[t.messages.length - 1];
        return t;
    }).sort((a, b) => new Date(b.latestMessage.date) - new Date(a.latestMessage.date)); 

    list.innerHTML = sortedThreads.map(t => {
        const n = t.latestMessage;
        const msgCount = t.messages.length;
        const unread = t.unreadCount > 0;

        let actionBtn = '';
        if (n.type === 'admin_reply' || n.type === 'user_reply' || n.type === 'chat_message') {
            actionBtn = `<button onclick="event.stopPropagation(); window.prepareUserReply('${n.threadId || n.id}')" class="mt-3 px-4 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-[10px] font-bold border border-blue-500/30 transition">Open Chat (${msgCount} messages)</button>`;
        } else if (n.type === 'team_invite') {
            actionBtn = `<div class="flex gap-2 mt-3">
                <button onclick="event.stopPropagation(); window.acceptTeamInvite('${n.relatedId}', '${n.id}')" class="px-4 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition">Accept</button>
                <button onclick="event.stopPropagation(); window.DatabaseAPI.delete('notifications', '${n.id}'); window.openNotifications();" class="px-4 py-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-lg text-[10px] font-bold transition">Decline</button>
            </div>`;
        } else {
            actionBtn = `<button onclick="event.stopPropagation(); window.DatabaseAPI.delete('notifications', '${n.id}'); window.openNotifications();" class="mt-3 px-4 py-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-lg text-[10px] font-bold transition">Dismiss</button>`;
        }

        return `
        <div class="bg-black/40 border border-white/5 p-3 sm:p-4 rounded-xl relative overflow-hidden group cursor-pointer" onclick="if('${n.type}'.includes('reply') || '${n.type}' === 'chat_message') window.prepareUserReply('${n.threadId || n.id}')">
            ${unread ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></div>' : ''}
            <div class="flex justify-between items-start mb-1 pl-2">
                <h4 class="text-white font-bold text-xs sm:text-sm flex items-center gap-2">
                    ${n.title} 
                    ${msgCount > 1 ? `<span class="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[8px]">${msgCount} msgs</span>` : ''}
                </h4>
                <span class="text-[9px] text-zinc-500 shrink-0 ml-2">${n.date.split(',')[0]}</span>
            </div>
            <div class="text-[10px] sm:text-xs text-zinc-400 pl-2 line-clamp-2">${n.senderId === window.userProfile.accountId ? 'You: ' : ''}${n.message}</div>
            <div class="pl-2">${actionBtn}</div>
        </div>`;
    }).join('');

    myNotifs.filter(n => String(n.isRead) === 'false').forEach(async n => {
        await window.DatabaseAPI.update('notifications', n.id, { isRead: 'true' });
    });
    
    setTimeout(window.refreshNotificationBadges, 1000);
};

window.prepareUserReply = async function(threadId, overrideEmail = null) {
    const notifs = await window.DatabaseAPI.get('notifications');
    
    const threadMsgs = notifs.filter(x => x.threadId === threadId || x.id === threadId).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if (threadMsgs.length === 0) return;
    
    const n = threadMsgs[threadMsgs.length - 1]; 
    
    let targetEmail = 'Admin';
    if (window.isAdmin && overrideEmail) {
        targetEmail = overrideEmail;
    } else if (window.isAdmin && n.senderId !== 'admin') {
        targetEmail = n.senderEmail || 'User';
    } else if (!window.isAdmin) {
        targetEmail = 'Events Team';
    }

    document.getElementById('userReplyNotifId').value = threadId;
    document.getElementById('userReplyContext').innerHTML = `<span class="font-bold text-white">Chat:</span> ${n.title} <span class="text-[10px] text-zinc-500 ml-2">with ${targetEmail}</span>`;

    let chatHtml = `<div id="chatHistoryBox" class="flex flex-col gap-3 mt-3 mb-4 h-64 overflow-y-auto custom-scrollbar p-3 bg-black/50 rounded-xl border border-white/5">`;
    
    threadMsgs.forEach(msg => {
        const isMe = msg.senderId === window.userProfile.accountId || (window.isAdmin && msg.senderId === 'admin');
        
        if (isMe) {
            chatHtml += `
            <div class="self-end bg-rose-600/80 p-3 rounded-xl rounded-tr-none max-w-[85%] text-xs text-white shadow-md whitespace-pre-wrap">
                <span class="text-[9px] text-rose-200 block mb-1 text-right">You • ${msg.date}</span>
                ${msg.message}
            </div>`;
        } else {
            chatHtml += `
            <div class="self-start bg-zinc-800 p-3 rounded-xl rounded-tl-none max-w-[85%] text-xs text-white shadow-md border border-white/5 whitespace-pre-wrap">
                <span class="text-[9px] text-zinc-400 block mb-1">${msg.senderEmail || (msg.senderId === 'admin' ? 'Admin' : 'User')} • ${msg.date}</span>
                ${msg.message}
            </div>`;
        }
    });
    
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

    let receiverId = 'admin'; 
    if (window.isAdmin && lastMsg) {
        receiverId = lastMsg.senderId === 'admin' ? lastMsg.userId : lastMsg.senderId;
    } else if (!window.isAdmin) {
        receiverId = 'admin'; 
    }

    const newMsg = {
        id: "notif_" + Date.now().toString(),
        threadId: threadId,
        userId: receiverId, 
        senderId: window.isAdmin ? 'admin' : window.userProfile.accountId,
        senderEmail: window.isAdmin ? 'admin@autumnfest.in' : window.userProfile.email,
        type: "chat_message",
        title: window.isAdmin ? `Admin Support` : `Reply from ${window.userProfile.name}`,
        message: msg,
        date: new Date().toLocaleString(),
        isRead: "false"
    };

    await window.DatabaseAPI.add('notifications', newMsg);
    
    const chatBox = document.getElementById('chatHistoryBox');
    if (chatBox) {
        chatBox.innerHTML += `
            <div class="self-end bg-rose-600/80 p-3 rounded-xl rounded-tr-none max-w-[85%] text-xs text-white shadow-md mt-2 whitespace-pre-wrap">
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

const parseHTMLtoText = (html) => {
    return html.replace(/<br\s*\/?>/gi, '\n')
               .replace(/<\/p>/gi, '\n')
               .replace(/<\/div>/gi, '\n')
               .replace(/<[^>]*>?/gm, '') 
               .replace(/&nbsp;/gi, ' ')
               .trim();
};

window.executeAdminReply = async function() {
    const msgBox = document.getElementById('adminReplyMessage');
    const textMsg = msgBox ? msgBox.innerHTML.trim() : "";
    if(!textMsg) return window.showMessage("Please type a message before sending.");
    
    const subject = document.getElementById('adminReplySubject')?.value || "Reply from Autumn Fest";
    const rawText = msgBox ? parseHTMLtoText(msgBox.innerHTML) : "";
    
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
    
    const threadId = window.replyTargetId || ("thread_" + Date.now().toString());

    let statusText = window.replyTargetCollection === 'queries' ? 'Replied' : 'Reviewed & Replied';
    if (window.replyTargetCollection !== 'users' && window.replyTargetCollection) {
        const allItems = await window.DatabaseAPI.get(window.replyTargetCollection);
        const item = allItems.find(x => x.id === window.replyTargetId);
        
        const historyEntry = `[Admin Reply - ${new Date().toLocaleString()}]\n${rawText}\n\n`;
        const newReplyText = (item && item.replyText ? item.replyText : '') + historyEntry;
        
        await window.DatabaseAPI.update(window.replyTargetCollection, window.replyTargetId, { status: statusText, replyText: newReplyText });
    }
    
    try {
        const allUsers = await window.DatabaseAPI.get('users');
        const targetUser = allUsers.find(u => u.email && u.email.toLowerCase() === window.replyTargetEmail.toLowerCase());
        if (targetUser) {
            await window.DatabaseAPI.add('notifications', {
                id: "notif_" + Date.now().toString(),
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
            ${q.replyText ? `
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Admin Action History</span>
                 <div class="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 text-blue-300 whitespace-pre-wrap text-[11px] font-mono leading-relaxed">${q.replyText}</div>
            </div>` : ''}
        </div>
    `;
    document.getElementById('adminDetailsFooter').innerHTML = `
        <button onclick="window.closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Close</button>
        <button onclick="window.closeModal('adminDetailsModal'); window.openAdminReplyModal('queries', '${q.id}', '${q.email}', '${q.name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-2"><i data-lucide="reply" class="w-4 h-4"></i> Reply via Email</button>
    `;
    if(typeof window.openModal === 'function') window.openModal('adminDetailsModal');
    if(typeof window.renderIcons === 'function') window.renderIcons();
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
             <div class="bg-black/40 p-4 rounded-xl border border-white/5 break-words text-white whitespace-pre-wrap">
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
            ${s.replyText ? `
            <div><span class="text-zinc-500 text-xs uppercase tracking-widest font-bold block mb-1">Admin Action History</span>
                 <div class="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 text-blue-300 whitespace-pre-wrap text-[11px] font-mono leading-relaxed">${s.replyText}</div>
            </div>` : ''}
        </div>
    `;
    document.getElementById('adminDetailsFooter').innerHTML = `
        <button onclick="window.closeModal('adminDetailsModal')" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition">Close</button>
        <button onclick="window.closeModal('adminDetailsModal'); window.openAdminReplyModal('sponsors', '${s.id}', '${s.email}', '${s.contact.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition shadow flex items-center gap-2"><i data-lucide="reply" class="w-4 h-4"></i> Reply to Proposal</button>
    `;
    if(typeof window.openModal === 'function') window.openModal('adminDetailsModal');
    if(typeof window.renderIcons === 'function') window.renderIcons();
};

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden'; 
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if(modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      
      const anyOpen = Array.from(document.querySelectorAll('[id$="Modal"]')).some(el => el.classList.contains('flex'));
      if (!anyOpen) document.body.style.overflow = '';
  }
};

window.openEventModal = function(catKey, evId) {
  const ev = window.EVENTS_DATA[catKey].find(e => e.id === evId);
  if (ev) {
    window.currentModalEvent = ev;
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

        if (window.festStatus !== 'active' || ev.status === 'closed') {
          if(btn) { btn.classList.add('opacity-50', 'cursor-not-allowed'); btn.innerHTML = "Registrations Closed"; }
          if(badge) badge.classList.remove('hidden');
        } else {
          if(btn) { btn.classList.remove('opacity-50', 'cursor-not-allowed'); btn.innerHTML = "Register Now"; }
          if(badge) badge.classList.add('hidden');
        }
    }

    const modalScroll = document.querySelector('#eventModal .custom-scrollbar');
    if (modalScroll) modalScroll.scrollTop = 0;

    window.openModal('eventModal');
    window.renderIcons();
  }
};

window.openRegisterModal = function() {
  if (window.festStatus !== 'active' || window.currentModalEvent.status === 'closed') {
    window.showMessage("Registrations are closed for this event.");
    return;
  }

  window.closeModal('eventModal');
  const ev = window.currentModalEvent;
  window.currentPendingFee = ev.fee;

  const teamStr = ev.team.toString();
  if (teamStr.includes('-')) {
    const parts = teamStr.split('-');
    window.currentRegMin = parseInt(parts[0]);
    window.currentRegMax = parseInt(parts[1]);
  } else {
    window.currentRegMin = parseInt(teamStr);
    window.currentRegMax = parseInt(teamStr);
  }

  window.teamMemberCount = 1;
  window.regMode = 'create';
  document.getElementById('regEventName').innerText = ev.name;
  document.getElementById('regTotalFee').innerText = `₹${ev.fee}`;

  const tabs = document.getElementById('regTabs');
  if (window.currentRegMax > 1) {
    tabs.classList.remove('hidden'); tabs.classList.add('flex');
    window.setRegMode('create');
  } else {
    tabs.classList.add('hidden'); tabs.classList.remove('flex');
    window.renderIndividualForm();
  }

  const regScroll = document.getElementById('regFormContainer');
  if (regScroll) regScroll.scrollTop = 0;

  window.openModal('registerModal');
  window.renderIcons();
};

window.setRegMode = function(mode) {
  window.regMode = mode;
  const tabCreate = document.getElementById('tabCreate');
  const tabJoin = document.getElementById('tabJoin');
  if (mode === 'create') {
    if(tabCreate) tabCreate.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-rose-600 text-rose-500 px-2 min-w-0";
    if(tabJoin) tabJoin.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 px-2 min-w-0";
    window.renderCreateForm();
  } else {
    if(tabJoin) tabJoin.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-rose-600 text-rose-500 px-2 min-w-0";
    if(tabCreate) tabCreate.className = "flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 px-2 min-w-0";
    window.renderJoinForm();
  }
  
  const regScroll = document.getElementById('regFormContainer');
  if (regScroll) regScroll.scrollTop = 0;

  window.renderIcons();
};

window.renderCreateForm = function() {
  window.teamMemberCount = 1;
  const existingReg = window.userProfile.registrations.find(r => r.eventId === window.currentModalEvent.id);
  if (existingReg && existingReg.teamCode) { window.renderTeamBuildSection(existingReg.teamCode); return; }
  
  const container = document.getElementById('regFormContainer');
  if(container) {
      container.innerHTML = `
            <form id="teamNameSection" onsubmit="event.preventDefault(); window.confirmTeamName();" class="mb-4 sm:mb-6 animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow flex flex-col justify-center min-w-0">
                <div class="w-full max-w-sm mx-auto min-w-0">
                    <p class="text-rose-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 flex items-center justify-center gap-2 w-full"><i data-lucide="shield-plus" class="w-4 h-4 shrink-0"></i> <span class="truncate">Step 1: Create Your Team</span></p>
                    <input type="text" id="teamNameInput" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-center text-sm sm:text-base focus:outline-none focus:border-rose-500 transition mb-4 shadow-inner min-w-0" placeholder="Enter Team Name" required>
                    <button type="submit" class="w-full py-3 sm:py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(225,29,72,0.3)]">Generate Team Code</button>
                </div>
            </form>`;
  }
  
  const footBtns = document.getElementById('regFooterBtns');
  if(footBtns) footBtns.innerHTML = `<p class="text-zinc-500 text-[10px] sm:text-xs font-medium italic w-full text-right sm:text-left truncate">Complete Step 1</p>`;
  window.renderIcons();
};

window.confirmTeamName = function() {
  const name = document.getElementById('teamNameInput').value;
  if (!name) { window.showMessage("Please enter a team name!"); return; }
  let reg = window.userProfile.registrations.find(r => r.eventId === window.currentModalEvent.id);
  if (!reg) {
    const code = `AUT-TEAM-${Math.floor(1000 + Math.random() * 9000)}`;
    reg = { eventId: window.currentModalEvent.id, teamName: name, teamCode: code, members: [], payment: 'Incomplete', leader: window.userProfile.accountId };
    window.userProfile.registrations.push(reg);
  } else { reg.teamName = name; }
  window.saveCache();
  window.renderTeamBuildSection(reg.teamCode);
  window.showMessage("Team Code Generated & Saved!");
};

window.renderTeamBuildSection = function(code) {
  const container = document.getElementById('regFormContainer');
  if(container) {
      container.innerHTML = `
          <div class="mb-4 sm:mb-6 animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow flex flex-col min-w-0">
              <div class="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-center shadow-inner w-full min-w-0"><p class="text-xs sm:text-sm text-cyan-400 uppercase tracking-widest font-bold mb-1 truncate">Your Team Code</p><p class="text-xl sm:text-3xl font-mono font-bold text-white tracking-[0.1em] sm:tracking-[0.2em] break-words">${code}</p></div>
              <div class="mb-3 sm:mb-4 flex justify-between items-center border-b border-zinc-800 pb-2 gap-2 w-full min-w-0"><label class="block text-[9px] sm:text-[10px] uppercase text-zinc-500 font-bold ml-1 flex-1 truncate">Invite Members</label><span class="text-[10px] sm:text-xs text-zinc-400 font-bold shrink-0"><span id="memCountText">1</span> / ${window.currentRegMax}</span></div>
              <div id="teamMembersList" class="space-y-2 sm:space-y-3 mb-4 w-full min-w-0">
                  <div class="bg-zinc-900/50 border border-rose-500/30 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-inner w-full min-w-0">
                      <div class="flex items-center gap-3 sm:gap-4 w-full min-w-0">
                          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0"><i data-lucide="crown" class="w-4 h-4 sm:w-5 sm:h-5"></i></div>
                          <div class="min-w-0 flex-grow"><p class="text-xs sm:text-sm text-white font-bold truncate">You (Leader)</p></div>
                      </div>
                  </div>
              </div>
              <button type="button" id="addMemberBtn" onclick="window.addTeamMemberField(true)" class="mt-4 w-full py-3 sm:py-4 rounded-xl border border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 transition flex items-center justify-center gap-2 text-xs sm:text-sm font-medium shrink-0"><i data-lucide="plus" class="w-4 h-4 shrink-0"></i> <span class="truncate">Add Teammate by ID / Email</span></button>
          </div>`;
  }
  const footBtns = document.getElementById('regFooterBtns');
  if(footBtns) footBtns.innerHTML = `<button onclick="window.processPayment()" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs sm:text-base shadow-[0_0_15px_rgba(37,99,235,0.4)] text-center shrink-0">Pay Now</button>`;
  window.teamMemberCount = 1;
  const reg = window.userProfile.registrations.find(r => r.eventId === window.currentModalEvent.id);
  if (reg && reg.members.length > 0) {
    reg.members.forEach((mId) => {
      if (window.teamMemberCount < window.currentRegMax) window.addTeamMemberField(false, mId);
    });
  } else {
    if(typeof window.updateMemberCount === 'function') window.updateMemberCount();
  }
  window.renderIcons();
};

window.renderJoinForm = function() {
  const container = document.getElementById('regFormContainer');
  if(container) {
      container.innerHTML = `
          <form id="joinTeamForm" onsubmit="event.preventDefault(); window.processJoinTeam();" class="flex flex-col items-center justify-start py-6 sm:py-10 mt-2 sm:mt-6 text-center animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow min-w-0">
              <div class="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 shrink-0 shadow-inner"><i data-lucide="key" class="w-8 h-8 sm:w-10 sm:h-10 text-amber-500"></i></div>
              <h4 class="text-xl sm:text-2xl font-black text-white mb-3 font-sans tracking-wide w-full break-words">Join a Team</h4>
              <p class="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto mb-6 break-words w-full">Enter the team code provided by your team leader.</p>
              <input type="text" id="joinTeamInput" class="w-full max-w-sm bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-center font-mono text-sm sm:text-lg tracking-[0.1em] sm:tracking-[0.2em] focus:outline-none focus:border-amber-500 shadow-inner transition min-w-0" placeholder="AUT-TEAM-XXXX" required>
          </form>`;
  }
  const footBtns = document.getElementById('regFooterBtns');
  if(footBtns) footBtns.innerHTML = `<button type="submit" form="joinTeamForm" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold transition text-xs sm:text-base shadow-[0_0_15px_rgba(245,158,11,0.4)] text-center shrink-0">Join Team</button>`;
  window.renderIcons();
};

window.renderIndividualForm = function() {
  const container = document.getElementById('regFormContainer');
  if(container) {
      container.innerHTML = `
          <div class="flex flex-col items-center justify-start py-8 sm:py-10 text-center animate-[fadeInSlide_0.2s_ease-out] w-full flex-grow min-w-0">
              <div class="w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 shrink-0 shadow-inner">
                  <i data-lucide="user" class="w-10 h-10 sm:w-12 sm:h-12 text-blue-500"></i>
              </div>
              <h4 class="text-2xl sm:text-3xl font-black text-white mb-3 tracking-wide font-sans w-full break-words">Individual Registration</h4>
              <p class="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto break-words w-full">You are registering as an individual. Proceed to pay the fee and confirm your spot.</p>
          </div>`;
  }
  const footBtns = document.getElementById('regFooterBtns');
  if(footBtns) footBtns.innerHTML = `<button onclick="window.processPayment()" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition text-xs sm:text-base shadow-[0_0_15px_rgba(37,99,235,0.4)] text-center shrink-0">Pay Now</button>`;
  window.renderIcons();
};

window.addTeamMemberField = function(pushToArray = true, initialValue = "") {
  if (window.teamMemberCount >= window.currentRegMax) { window.showMessage(`Max size ${window.currentRegMax}.`); return; }
  window.teamMemberCount++;

  const id = `member-${window.teamMemberCount}`;
  const displayVal = initialValue !== "Pending" ? initialValue : "";

  const div = document.createElement('div');
  div.id = id; div.className = 'flex items-center gap-2 sm:gap-3 animate-[fadeInSlide_0.2s_ease-out] w-full min-w-0';
  div.innerHTML = `
      <input type="text" id="input-${id}" placeholder="Email or Account ID" value="${displayVal}" class="team-member-input flex-grow min-w-0 py-3 sm:py-4 bg-black/40 border border-white/10 rounded-xl text-white px-4 text-xs sm:text-sm focus:outline-none focus:border-rose-500 shadow-inner" required onchange="window.saveTeamMembers()">
      <button type="button" onclick="window.sendTeamInvite('input-${id}')" class="w-12 h-12 sm:w-[52px] sm:h-[52px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl flex items-center justify-center shrink-0 transition" title="Send App Invite"><i data-lucide="user-plus" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>
      <button type="button" onclick="window.removeTeamMemberField('${id}')" class="w-12 h-12 sm:w-[52px] sm:h-[52px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center shrink-0 transition"><i data-lucide="trash-2" class="w-4 h-4 sm:w-5 sm:h-5"></i></button>`;
  
  const list = document.getElementById('teamMembersList');
  if(list) list.appendChild(div);

  if (pushToArray) window.saveTeamMembers();
  window.updateMemberCount();
  window.renderIcons();
};

window.updateMemberCount = function() {
  const memCountText = document.getElementById('memCountText');
  if(memCountText) memCountText.innerText = window.teamMemberCount;
  const addBtn = document.getElementById('addMemberBtn');
  if (addBtn) addBtn.style.display = window.teamMemberCount >= window.currentRegMax ? 'none' : 'flex';
};

window.sendTeamInvite = async function(inputId) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl || !inputEl.value) {
        window.showMessage("Please enter an email or Account ID to invite.");
        return;
    }
    const targetVal = inputEl.value.trim().toLowerCase();

    const allUsers = await window.DatabaseAPI.get('users');
    const targetUser = allUsers.find(u => u.email.toLowerCase() === targetVal || u.id.toLowerCase() === targetVal);

    if (!targetUser) return showMessage("User not found. They must sign up for an account first.");

    const reg = window.userProfile.registrations.find(r => r.eventId === window.currentModalEvent.id);
    if (!reg) return;

    await window.DatabaseAPI.add('notifications', {
        id: "notif_" + Date.now().toString(),
        userId: targetUser.id,
        type: 'team_invite',
        title: `Team Invite: ${reg.teamName}`,
        message: `${window.userProfile.name} has invited you to join their team for ${window.currentModalEvent.name}.`,
        date: new Date().toLocaleString(),
        isRead: 'false',
        senderEmail: window.userProfile.email,
        relatedId: reg.teamCode
    });

    inputEl.value = targetUser.id;
    window.saveTeamMembers();
    showMessage(`Invite sent to ${targetUser.name}! They can accept it in their notifications.`);
};

window.acceptTeamInvite = async function(teamCode, notifId) {
    const allRegs = await window.DatabaseAPI.get('registrations');
    const targetReg = allRegs.find(r => r.teamCode === teamCode);
    
    if (!targetReg) {
        showMessage("This team no longer exists.");
        await window.DatabaseAPI.delete('notifications', notifId);
        window.openNotifications();
        return;
    }

    const event = Object.values(window.EVENTS_DATA).flat().find(e => e.id === targetReg.eventId);
    const maxMembers = event.team.includes('-') ? parseInt(event.team.split('-')[1]) : parseInt(event.team);

    if (targetReg.members.length + 1 >= maxMembers) {
        showMessage("Sorry, this team is already full!");
        await window.DatabaseAPI.delete('notifications', notifId);
        window.openNotifications();
        return;
    }

    if (!targetReg.members.includes(window.userProfile.accountId) && targetReg.leader !== window.userProfile.accountId) {
        let pendingIdx = targetReg.members.findIndex(m => m === 'Pending');
        if(pendingIdx > -1) {
            targetReg.members[pendingIdx] = window.userProfile.accountId;
        } else {
            targetReg.members.push(window.userProfile.accountId);
        }
        await window.DatabaseAPI.update('registrations', targetReg.id, { members: targetReg.members });
    }

    await window.DatabaseAPI.delete('notifications', notifId);
    showMessage(`Successfully joined ${targetReg.teamName}!`);
    
    const users = await window.DatabaseAPI.get('users');
    await window.populateUserProfile(users.find(u => u.id === window.userProfile.accountId));
    window.saveCache();
    
    if (window.location.pathname.includes('profile') && typeof window.renderProfile === 'function') window.renderProfile();
    window.openNotifications();
};

window.saveTeamMembers = function() {
  let reg = window.userProfile.registrations.find(r => r.eventId === window.currentModalEvent.id);
  if (reg) {
    const inputs = document.querySelectorAll('.team-member-input');
    reg.members = Array.from(inputs).map(inp => inp.value.trim() || 'Pending');
    window.saveCache();
  }
};

window.removeTeamMemberField = function(id) {
  const el = document.getElementById(id);
  if (el) {
    el.remove(); window.teamMemberCount--;
    window.saveTeamMembers();
    window.updateMemberCount();
  }
};

window.initRazorpayMock = function(amount, successMsg, callback) {
    window.pendingRzpAmount = amount;
    window.pendingRzpSuccessMsg = successMsg;
    window.pendingRzpCallback = callback;
    document.getElementById('rzpAmountDisplay').innerText = `₹${amount}`;
    
    const rzpLoader = document.getElementById('rzpLoader');
    if (rzpLoader) {
        rzpLoader.classList.add('hidden');
        rzpLoader.classList.remove('flex');
    }
    
    window.openModal('razorpayModal');
};

window.confirmMockPayment = function() {
    const loader = document.getElementById('rzpLoader');
    if(loader) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }
    
    setTimeout(async () => {
        window.closeModal('razorpayModal');
        
        const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
        
        const pData = {
            id: paymentId,
            amount: window.pendingRzpAmount,
            status: 'Success',
            timestamp: new Date().toLocaleString(),
            user: window.userProfile.accountId
        };
        window.userProfile.payments.push(pData);
        await window.DatabaseAPI.add('payments', pData);

        window.saveCache();
        window.showMessage(window.pendingRzpSuccessMsg);
        if (window.pendingRzpCallback) window.pendingRzpCallback(paymentId);
    }, 1500);
};

window.processRazorpayPayment = function(amount, successMsg, callback) {
    if(amount === 0) {
        callback(`FREE_${Math.random().toString(36).substr(2, 9)}`);
        return;
    }
    
    const API_KEY = "YOUR_TEST_KEY_HERE"; 
    
    if (API_KEY === "YOUR_TEST_KEY_HERE" || typeof window.Razorpay === 'undefined') {
        window.initRazorpayMock(amount, successMsg, callback);
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
                user: window.userProfile.accountId
            };
            window.userProfile.payments.push(pData);
            await window.DatabaseAPI.add('payments', pData);

            window.saveCache();
            window.showMessage(successMsg);
            if (callback) callback(paymentId);
        },
        "prefill": {
            "name": window.userProfile.name,
            "email": window.userProfile.email,
            "contact": window.userProfile.phone || "9999999999"
        },
        "theme": { "color": "#f43f5e" }
    };
    try {
        var rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            window.showMessage("Payment Failed: " + response.error.description);
        });
        rzp1.open();
    } catch(e) {
        console.error(e);
        window.initRazorpayMock(amount, successMsg, callback);
    }
};

window.processPayment = function() {
  if (window.currentRegMax > 1 && window.regMode === 'create' && window.teamMemberCount < window.currentRegMin) { 
      window.showMessage(`Minimum ${window.currentRegMin} members required!`); return; 
  }

  window.processRazorpayPayment(window.currentPendingFee, "Payment Successful! Registration complete.", async (payId) => {
    let reg = window.userProfile.registrations.find(r => r.eventId === window.currentModalEvent.id);
    if (!reg) { 
        reg = { eventId: window.currentModalEvent.id, teamName: 'Individual', teamCode: null, members: [], payment: 'Success' }; 
        window.userProfile.registrations.push(reg); 
    } else { 
        reg.payment = 'Success'; window.saveTeamMembers(); 
    }

    const regData = {
      id: Date.now().toString(),
      eventId: window.currentModalEvent.id,
      teamName: reg.teamName,
      teamCode: reg.teamCode,
      leader: window.userProfile.accountId,
      members: reg.members || [],
      payment: 'Success',
      payId: payId
    };
    
    await window.DatabaseAPI.add('registrations', regData);
    window.saveCache();
    window.closeModal('registerModal');
    window.navigate('profile');
  });
};

window.toggleSponsorInput = function(type) {
    window.sponsorUploadType = type;
    const fileBtn = document.getElementById('btn-spon-file');
    const linkBtn = document.getElementById('btn-spon-link');
    const fileContainer = document.getElementById('spon-file-container');
    const linkInput = document.getElementById('sponLink');
    
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

window.submitSponsorForm = async function() {
    let linkData = "";
    let messageData = document.getElementById('sponMessage') ? document.getElementById('sponMessage').value.trim() : "";

    if(window.sponsorUploadType === 'link') {
        linkData = document.getElementById('sponLink').value.trim();
    } else {
        const fileInput = document.getElementById('sponFile');
        if(fileInput && fileInput.files.length > 0) {
            if(typeof showMessage === 'function') showMessage("Uploading proposal to Drive... Please wait.");
            try {
                linkData = await window.uploadFileToDrive(fileInput.files[0]);
            } catch(e) {
                if(typeof showMessage === 'function') return showMessage(e.message);
            }
        }
    }

    if (!linkData && !messageData) {
        if(typeof showMessage === 'function') return showMessage("Please provide a message or upload a proposal document.");
        return;
    }

    const data = {
        id: Date.now().toString(),
        company: document.getElementById('sponCompanyName').value,
        contact: document.getElementById('sponContactName').value,
        email: document.getElementById('sponEmail').value,
        phone: document.getElementById('sponPhone').value,
        link: linkData, 
        message: messageData,
        status: 'Pending'
    };
    
    await window.DatabaseAPI.add('sponsors', data);
    
    if(typeof closeModal === 'function') closeModal('sponsorModal');
    if(typeof showMessage === 'function') showMessage('Sponsorship proposal securely submitted!');
};

// ==========================================
// 5. ACCOMMODATION SPECIFIC LOGIC
// ==========================================

window.setupAccommodationForm = function() {
    const wingSelect = document.getElementById('roomWing');
    if(!wingSelect) return;
    
    if (window.userProfile && window.userProfile.gender === 'Female') {
        wingSelect.value = 'female';
        wingSelect.disabled = true;
        wingSelect.classList.add('opacity-50');
    } else if (window.userProfile && window.userProfile.gender === 'Male') {
        wingSelect.value = 'male';
        wingSelect.disabled = true;
        wingSelect.classList.add('opacity-50');
    } else {
        wingSelect.disabled = false;
        wingSelect.classList.remove('opacity-50');
    }
    
    window.calculateRoomCost();
    
    const formContainer = document.getElementById('bookingFormContainer') || wingSelect.closest('.bg-zinc-900');
    if (formContainer && !formContainer.classList.contains('setup-complete')) {
        formContainer.classList.add('setup-complete');
        setTimeout(() => {
            formContainer.style.transition = 'opacity 0.4s ease-in-out';
            formContainer.style.opacity = '1';
        }, 50);
    }
};

window.calculateRoomCost = function() {
    const checks = document.querySelectorAll('.accom-day-check:checked');
    const days = checks.length;
    const price = 300; 
    const costBox = document.getElementById('roomTotalCost');
    if(costBox) costBox.innerText = `₹${price * days}`;
    
    window.currentPendingFee = price * days;
};

window.processRoomBooking = async function() {
    const roommateId = document.getElementById('roommateId') ? document.getElementById('roommateId').value.trim() : "";
    const wing = document.getElementById('roomWing').value;
    const checks = document.querySelectorAll('.accom-day-check:checked');
    
    if (checks.length === 0) {
        if(typeof window.showMessage === 'function') window.showMessage("Please select at least one day for accommodation.");
        return;
    }
    
    const daysArray = Array.from(checks).map(c => c.value);
    const selectedDays = daysArray.join(', ');

    if (roommateId) {
        const users = await window.DatabaseAPI.get('users');
        const friends = roommateId.split(',').map(s => s.trim());
        for (let fId of friends) {
            const friend = users.find(u => u.id === fId);
            if (friend) {
                if (friend.gender && friend.gender !== 'Not Specified' && friend.gender !== window.userProfile.gender) {
                    if(typeof window.showMessage === 'function') window.showMessage(`Cannot share room with ${fId} (Different gender).`);
                    return;
                }
            } else {
                if(typeof window.showMessage === 'function') window.showMessage(`Account ID ${fId} not found.`);
                return;
            }
        }
    }

    if(typeof window.showMessage === 'function') window.showMessage("Verifying live room availability...");

    const availability = await window.checkAccomAvailability(wing, daysArray);
    
    if (!availability.available) {
        if(typeof window.showMessage === 'function') window.showMessage(`Sorry, ${availability.day} is fully booked for the ${wing} wing!`);
        return;
    }

    window.calculateRoomCost();
    
    if (typeof window.processRazorpayPayment === 'function') {
        window.processRazorpayPayment(window.currentPendingFee, "Accommodation Booking Successful!", async (payId) => {
            window.userProfile.accommodation = {
                type: roommateId ? "Shared" : "Individual", 
                wing: wing, 
                duration: selectedDays, 
                roommate: roommateId || "None", 
                roomNumber: "Pending", 
                payId: payId
            };

            await window.DatabaseAPI.add('accommodations', {
                id: window.userProfile.accountId, 
                userId: window.userProfile.accountId, // Matches BCNF
                wing: wing, 
                day1: daysArray.includes('Day 1') ? 'yes' : 'no', // Maps array to physical BCNF columns
                day2: daysArray.includes('Day 2') ? 'yes' : 'no',
                day3: daysArray.includes('Day 3') ? 'yes' : 'no',
                requested: roommateId || "None", 
                room: null, 
                payId: payId
            });

            if (typeof window.saveCache === 'function') window.saveCache();
            if (typeof window.navigate === 'function') window.navigate('profile');
        });
    }
};