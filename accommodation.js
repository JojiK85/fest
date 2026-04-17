// ==========================================
// ACCOMMODATION.HTML SPECIFIC LOGIC
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('roomWing')) {
        if (window.userProfile && window.userProfile.accountId) {
            window.setupAccommodationForm();
        } else {
            window.addEventListener('db-updated', window.setupAccommodationForm);
        }
    }
});

window.setupAccommodationForm = function() {
    const wingSelect = document.getElementById('roomWing');
    if(!wingSelect) return;
    
    const formContainer = wingSelect.closest('.bg-zinc-900');
    if (formContainer && !formContainer.classList.contains('setup-complete')) {
        formContainer.style.opacity = '0'; 
        
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
        
        const durContainer = document.getElementById('roomDuration')?.parentElement;
        if (durContainer && !document.getElementById('day1Check')) {
            durContainer.innerHTML = `
                <label class="block text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-2">Select Days to Book (₹300/day)</label>
                <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-2 w-full">
                    <label class="flex flex-col items-center justify-center gap-1 sm:gap-2 text-white text-[10px] sm:text-xs bg-black/40 p-2 sm:p-3 rounded-xl border border-white/10 cursor-pointer hover:border-blue-500 transition select-none group">
                        <input type="checkbox" id="day1Check" value="Day 1" class="accom-day-check w-4 h-4 text-blue-500 rounded focus:ring-0 outline-none" onchange="window.calculateRoomCost()"> 
                        <span class="font-bold group-hover:text-blue-400">Day 1</span>
                        <span class="text-[8px] text-zinc-500">Oct 20</span>
                    </label>
                    <label class="flex flex-col items-center justify-center gap-1 sm:gap-2 text-white text-[10px] sm:text-xs bg-black/40 p-2 sm:p-3 rounded-xl border border-white/10 cursor-pointer hover:border-blue-500 transition select-none group">
                        <input type="checkbox" id="day2Check" value="Day 2" class="accom-day-check w-4 h-4 text-blue-500 rounded focus:ring-0 outline-none" onchange="window.calculateRoomCost()"> 
                        <span class="font-bold group-hover:text-blue-400">Day 2</span>
                        <span class="text-[8px] text-zinc-500">Oct 21</span>
                    </label>
                    <label class="flex flex-col items-center justify-center gap-1 sm:gap-2 text-white text-[10px] sm:text-xs bg-black/40 p-2 sm:p-3 rounded-xl border border-white/10 cursor-pointer hover:border-blue-500 transition select-none group">
                        <input type="checkbox" id="day3Check" value="Day 3" class="accom-day-check w-4 h-4 text-blue-500 rounded focus:ring-0 outline-none" onchange="window.calculateRoomCost()"> 
                        <span class="font-bold group-hover:text-blue-400">Day 3</span>
                        <span class="text-[8px] text-zinc-500">Oct 22</span>
                    </label>
                </div>
            `;
        }
        
        window.calculateRoomCost();
        
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
        if(typeof showMessage === 'function') showMessage("Please select at least one day for accommodation.");
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
                    if(typeof showMessage === 'function') showMessage(`Cannot share room with ${fId} (Different gender).`);
                    return;
                }
            } else {
                if(typeof showMessage === 'function') showMessage(`Account ID ${fId} not found.`);
                return;
            }
        }
    }

    if(typeof showMessage === 'function') showMessage("Verifying live room availability...");

    const availability = await window.checkAccomAvailability(wing, daysArray);
    
    if (!availability.available) {
        if(typeof showMessage === 'function') showMessage(`Sorry, ${availability.day} is fully booked for the ${wing} wing!`);
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
                userId: window.userProfile.accountId, // Matches BCNF Definition
                wing: wing, 
                day1: daysArray.includes('Day 1') ? 'yes' : 'no', // Strictly converts to atomic data structures
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