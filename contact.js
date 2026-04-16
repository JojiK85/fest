// ==========================================
// CONTACT.HTML SPECIFIC LOGIC
// ==========================================

window.submitContactQuery = async function() {
    const form = document.querySelector('form');
    if(!form) return;
    
    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const msg = form.querySelector('textarea').value;
    
    // Add the query to the shared DatabaseAPI
    await window.DatabaseAPI.add('queries', {
        id: Date.now().toString(),
        name: name, 
        email: email, 
        message: msg, 
        date: new Date().toLocaleString(), 
        status: 'Pending'
    });
    
    form.reset();
    if(typeof showMessage === 'function') {
        showMessage("Query sent to Admin database!");
    }
};