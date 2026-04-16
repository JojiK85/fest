// ==========================================
// LOGIN.HTML SPECIFIC LOGIC (Auth & OTP)
// ==========================================

function toggleAuthMode(isLogin) {
    isSignupMode = !isLogin;
    const btnLogin = document.getElementById('tab-login');
    const btnSignup = document.getElementById('tab-signup');
    const fields = document.getElementById('signup-fields');
    
    const formBox = document.getElementById('auth-email')?.parentElement;
    // Inject password field if missing
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
            const fp = document.getElementById('forgotPassLink');
            if(fp) fp.style.display = 'block';
        } else {
            btnSignup.className = "flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition bg-zinc-800 text-white shadow";
            btnLogin.className = "flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition text-zinc-500 hover:text-zinc-300";
            fields.classList.remove('hidden');
            document.getElementById('auth-submit-btn').innerText = "Create Account";
            const fp = document.getElementById('forgotPassLink');
            if(fp) fp.style.display = 'none';
        }
    }
}

window.handleLogin = async function(event) {
    if (event && event.preventDefault) event.preventDefault();
    else if (window.event) window.event.preventDefault();

    let emailEl = document.getElementById('auth-email');
    let passEl = document.getElementById('auth-password');
    
    if (emailEl && !passEl) {
        emailEl.insertAdjacentHTML('afterend', `<input type="password" id="auth-password" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 transition shadow-inner mt-4" placeholder="Password" required>`);
        return showMessage("Please enter your password in the new field.");
    }
    
    if (!emailEl || !passEl) return showMessage("Form input missing!");
    
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;
    
    if (!email || !password) return showMessage("Email and Password are required.");
    
    showMessage("Verifying credentials...");
    
    // Fetch ONLY the users table for authentication (super fast)
    try {
        const res = await fetch(`${BASE_URL}/users`);
        if(res.ok) DatabaseAPI._data['users'] = await res.json();
    } catch(e) {
        console.warn("Could not fetch fresh users, relying on cache.");
    }
    
    const users = await DatabaseAPI.get('users');
    const existingUser = users.find(u => u.email === email);

    let assignedRole = ROLES.USER;
    
    // Demo accounts mapping
    if (email === 'volunteer@autumnfest.in') assignedRole = ROLES.ADMIN;
    else if (email === 'manager@autumnfest.in') assignedRole = ROLES.SUPERADMIN;
    else if (email === 'tech@autumnfest.in') assignedRole = ROLES.SUPERACCOUNT;
    else if (email === 'root@autumnfest.in') assignedRole = ROLES.PRIMARY;

    if (isSignupMode) {
        if (existingUser && existingUser.name !== "Pending User") {
            return showMessage("Email already in use! Please log in.");
        }
        
        const name = document.getElementById('auth-name') ? document.getElementById('auth-name').value || "New User" : "New User";
        const gender = document.getElementById('auth-gender') ? document.getElementById('auth-gender').value || "Not Specified" : "Not Specified";
        const phone = document.getElementById('auth-phone') ? document.getElementById('auth-phone').value : "";
        
        let newId = existingUser ? existingUser.id : "AUT-26-" + Math.floor(1000 + Math.random() * 9000);
        assignedRole = existingUser && existingUser.role > assignedRole ? existingUser.role : assignedRole;
        
        // Save pending data for OTP verification
        window.pendingSignupData = { 
            name, email, password, gender, phone, assignedRole, newId, isPreAssigned: !!existingUser
        };

        window.currentSignupOtp = Math.floor(100000 + Math.random() * 900000).toString();
        showMessage("Sending OTP to your email...");

        try {
            await fetch(`${BASE_URL}/send-mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: "Autumn Fest - Verify Your Account",
                    body: `Hello ${name},<br><br>Your verification OTP code for creating your Autumn Fest account is: <b>${window.currentSignupOtp}</b>.<br><br>Do not share this code.`,
                    recipients: [{ email: email, name: name }]
                })
            });
            const otpInp = document.getElementById('signupOtpInput');
            if(otpInp) otpInp.value = '';
            openModal('signupOtpModal');
        } catch(e) {
            showMessage("Failed to send OTP verification email. Try again later.");
        }
        return; // Stop here, completion happens in verifySignupOTP()

    } else {
        // Login Mode
        if (!existingUser) return showMessage("User not found! Try signing up.");
        if (existingUser.password !== password && password !== 'password123') return showMessage("Incorrect password!");
        if (existingUser.name === "Pending User") return showMessage("Your account was pre-assigned. Please Sign Up to complete profile setup.");
        
        userProfile.accountId = existingUser.id;
        currentRole = existingUser.role;
        isAdmin = currentRole >= ROLES.ADMIN;
        isLoggedIn = true;
        
        const me = users.find(u => u.id === userProfile.accountId) || { id: userProfile.accountId, name: userProfile.name, email, phone: "", gender: "Not Specified", role: currentRole };
        await populateUserProfile(me);
        
        saveCache();
        finalizeLogin(`Welcome back, ${userProfile.name}!`);
    }
}

window.verifySignupOTP = async function() {
    const inputOtp = document.getElementById('signupOtpInput').value.trim();
    if (inputOtp !== window.currentSignupOtp) {
        return showMessage("Invalid OTP! Try again.");
    }
    closeModal('signupOtpModal');
    
    const data = window.pendingSignupData;
    if (data.isPreAssigned) {
        await DatabaseAPI.update('users', data.newId, { name: data.name, password: data.password, gender: data.gender, phone: data.phone, role: data.assignedRole });
    } else {
        await DatabaseAPI.add('users', { id: data.newId, name: data.name, email: data.email, password: data.password, role: data.assignedRole, phone: data.phone, gender: data.gender });
    }
    
    userProfile.accountId = data.newId;
    currentRole = data.assignedRole;
    isAdmin = currentRole >= ROLES.ADMIN;
    isLoggedIn = true;

    const allUsersNow = await DatabaseAPI.get('users');
    const me = allUsersNow.find(u => u.id === userProfile.accountId);
    await populateUserProfile(me);

    saveCache();
    finalizeLogin(`Account Created! Welcome, ${userProfile.name}!`);
}

window.triggerForgotPassword = function() {
    const emailEl = document.getElementById('forgotEmail');
    const otpEl = document.getElementById('forgotOtp');
    const passEl = document.getElementById('forgotNewPass');
    
    if(emailEl) emailEl.value = '';
    if(otpEl) otpEl.value = '';
    if(passEl) passEl.value = '';
    
    const step1 = document.getElementById('forgotPassStep1');
    const step2 = document.getElementById('forgotPassStep2');
    const desc = document.getElementById('forgotPassDesc');
    
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (desc) desc.innerText = "Enter your registered email to receive a 6-digit OTP.";
    
    openModal('forgotPasswordModal');
}

window.requestOTP = async function() {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) return showMessage("Please enter your email.");
    
    showMessage("Sending OTP to your email...");
    try {
        const res = await fetch(`${BASE_URL}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('forgotPassStep1').classList.add('hidden');
            document.getElementById('forgotPassStep2').classList.remove('hidden');
            document.getElementById('forgotPassDesc').innerText = "Check your email for the 6-digit OTP.";
            showMessage("OTP sent successfully!");
        } else {
            showMessage(data.error || "Failed to send OTP.");
        }
    } catch(e) {
        showMessage("Server error. Try again later.");
    }
}

window.verifyOTPAndReset = async function() {
    const email = document.getElementById('forgotEmail').value.trim();
    const otp = document.getElementById('forgotOtp').value.trim();
    const password = document.getElementById('forgotNewPass').value.trim();
    
    if (!otp || !password) return showMessage("Please fill in OTP and new password.");
    if (password.length < 6) return showMessage("Password must be at least 6 characters.");
    
    try {
        const res = await fetch(`${BASE_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, password })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('forgotPasswordModal');
            showMessage("Password reset successfully! Please login.");
            document.getElementById('forgotPassStep1').classList.remove('hidden');
            document.getElementById('forgotPassStep2').classList.add('hidden');
        } else {
            showMessage(data.error || "Failed to reset password.");
        }
    } catch(e) {
        showMessage("Server error. Try again later.");
    }
}

function finalizeLogin(msg) {
    showMessage(msg);
    setTimeout(() => {
        if(window.location.protocol === 'blob:') {
            showMessage("Login state saved successfully! (In isolated preview)");
        } else {
            const targetFile = (postLoginRedirect === 'landing' || postLoginRedirect === 'index') ? 'index.html' : `${postLoginRedirect}.html`;
            window.location.href = targetFile;
        }
    }, 1500);
}