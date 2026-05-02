const ALL_SLOTS = [
    "07:00 AM - 09:00 AM", "09:00 AM - 11:00 AM", "11:00 AM - 01:00 PM",
    "01:00 PM - 03:00 PM", "03:00 PM - 05:00 PM", "06:00 PM - 08:00 PM",
    "08:00 PM - 10:00 PM", "10:00 PM - 12:00 AM"
];

let selectedSlotToBook = null;

// Initialize Date Picker to Today
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').value = today;
    document.getElementById('admin-date').value = today;
    fetchSlots();
    
    // Live Clock
    setInterval(() => {
        document.getElementById('current-time-display').innerText = `IST: ${new Date().toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute:'2-digit'})}`;
    }, 1000);
});

// Smooth Scroll
function smoothScroll(e, targetId) {
    e.preventDefault();
    document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
}

// Hamburger Menu
function toggleMenu() {
    document.getElementById('menuLinks').classList.toggle('active');
}

// Check if a slot is expired based on current time
function isSlotExpired(slotStr, dateStr) {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    if (dateStr < todayStr) return true; // Past dates are entirely expired
    if (dateStr > todayStr) return false; // Future dates are not expired

    // If today, check exact time. "07:00 AM - 09:00 AM"
    const startTime = slotStr.split(" - ")[0];
    const match = startTime.match(/(\d+):(\d+)\s(AM|PM)/);
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (match[3] === "PM" && hours !== 12) hours += 12;
    if (match[3] === "AM" && hours === 12) hours = 0;

    const slotDate = new Date();
    slotDate.setHours(hours, minutes, 0, 0);

    return new Date() > slotDate;
}

// Fetch and Render Slots
async function fetchSlots() {
    const date = document.getElementById('booking-date').value;
    const slotsArea = document.getElementById('slots-area');
    slotsArea.innerHTML = `<div class="loader">Loading availability...</div>`;

    try {
        const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "getSlots", date: date })
        });
        const response = await res.json();
        const bookings = response.data || [];

        slotsArea.innerHTML = "";
        
        ALL_SLOTS.forEach(slot => {
            const bookingForSlot = bookings.find(b => b.slot === slot);
            let status = "AVAILABLE";
            let statusClass = "status-available";
            let btnDisabled = false;
            let btnText = "BOOK";

            // Determine state
            if (isSlotExpired(slot, date) && !bookingForSlot) {
                status = "EXPIRED"; statusClass = "status-expired"; btnDisabled = true; btnText = "--";
            } else if (bookingForSlot) {
                if(bookingForSlot.status === 'confirmed') {
                    status = "BOOKED"; statusClass = "status-booked"; btnDisabled = true; btnText = "FULL";
                } else if(bookingForSlot.status === 'pending') {
                    status = "PENDING"; statusClass = "status-pending"; btnDisabled = true; btnText = "WAIT";
                }
            }

            // Render Card
            slotsArea.innerHTML += `
                <div class="slot-card">
                    <div>
                        <div class="slot-time">${slot}</div>
                        <div class="slot-price">₹2400 / 2HRS</div>
                    </div>
                    <div style="text-align:right;">
                        <span class="slot-badge ${statusClass}">${status}</span><br>
                        <button class="btn-book" ${btnDisabled ? "disabled" : ""} onclick="initiateBooking('${slot}')" style="margin-top:10px;">${btnText}</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        slotsArea.innerHTML = `<div style="color:red;">Error loading slots.</div>`;
    }
}

// Modal & Booking Logic
function initiateBooking(slot) {
    selectedSlotToBook = slot;
    document.getElementById('selected-slot-text').innerText = `Slot: ${slot} on ${document.getElementById('booking-date').value}`;
    document.getElementById('bookingModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMessage');
    btn.innerText = "Processing...";
    
    const payload = {
        action: "book",
        date: document.getElementById('booking-date').value,
        slot: selectedSlotToBook,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value
    };

    try {
        await fetch('/api/db', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        msg.style.color = "green"; msg.style.display = "block";
        msg.innerText = "Request sent! Waiting for Admin approval.";
        setTimeout(() => { closeModal(); fetchSlots(); btn.innerText = "REQUEST SLOT"; msg.style.display="none"; }, 2000);
    } catch(e) {
        msg.style.color = "red"; msg.style.display = "block"; msg.innerText = "Failed.";
        btn.innerText = "REQUEST SLOT";
    }
});

// Admin Logic
function openAuthModal(type) {
    if(type === 'admin') {
        const pass = prompt("Enter Admin Password (type: admin123)");
        if(pass === "admin123") {
            document.getElementById('home').style.display = 'none';
            document.getElementById('booking-section').style.display = 'none';
            document.getElementById('admin-dashboard').style.display = 'block';
            fetchAdminSlots();
        } else {
            alert("Incorrect Password");
        }
    }
}

function closeAdmin() {
    document.getElementById('home').style.display = 'flex';
    document.getElementById('booking-section').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
}

async function fetchAdminSlots() {
    const date = document.getElementById('admin-date').value;
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    try {
        const res = await fetch('/api/db', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "getSlots", date: date })
        });
        const response = await res.json();
        
        tbody.innerHTML = "";
        response.data.forEach(b => {
            tbody.innerHTML += `
                <tr>
                    <td>${b.slot}</td>
                    <td>${b.name} <br> <small>${b.email}</small></td>
                    <td><strong>${b.status.toUpperCase()}</strong></td>
                    <td>
                        ${b.status === 'pending' ? `
                            <button class="btn-approve" onclick="updateStatus('${b.id}', 'confirmed')">Approve</button>
                            <button class="btn-deny" onclick="updateStatus('${b.id}', 'denied')">Deny</button>
                        ` : '--'}
                    </td>
                </tr>
            `;
        });
        if(response.data.length === 0) tbody.innerHTML = "<tr><td colspan='4'>No bookings for this date.</td></tr>";
    } catch (e) {
        tbody.innerHTML = "<tr><td colspan='4'>Error loading data.</td></tr>";
    }
}

async function updateStatus(id, newStatus) {
    if(!confirm(`Are you sure you want to ${newStatus} this booking?`)) return;
    
    await fetch('/api/db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "updateStatus", id: id, status: newStatus })
    });
    fetchAdminSlots(); // Refresh table
}
