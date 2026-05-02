// Modal Logic
function openModal() { document.getElementById('bookingModal').style.display = 'block'; }
function closeModal() { document.getElementById('bookingModal').style.display = 'none'; }

// Form Submission to Vercel API
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMessage');
    
    btn.innerText = "Processing...";
    
    const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        date: document.getElementById('date').value
    };

    try {
        const response = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if(response.ok) {
            msg.style.display = "block";
            msg.innerText = "Successfully Booked! We will contact you soon.";
            document.getElementById('bookingForm').reset();
            btn.innerText = "CREATE PITCH ACCOUNT";
        }
    } catch (error) {
        msg.style.display = "block";
        msg.style.color = "red";
        msg.innerText = "Something went wrong. Try again.";
        btn.innerText = "CREATE PITCH ACCOUNT";
    }
});
