const form = document.getElementById('salesForm');
const getLocationBtn = document.getElementById('getLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const latInput = document.getElementById('latitude');
const longInput = document.getElementById('longitude');
const linkInput = document.getElementById('locationLink');
const locYes = document.getElementById('locYes');
const locNo = document.getElementById('locNo');

// Handle Location Capture
getLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser');
        return;
    }

    locationStatus.textContent = 'Acquiring location...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const long = position.coords.longitude;

            // Validate lat/long
            if (lat && long) {
                latInput.value = lat;
                longInput.value = long;
                linkInput.value = `https://maps.google.com/?q=${lat},${long}`;

                locationStatus.textContent = `Captured: ${lat.toFixed(4)}, ${long.toFixed(4)}`;
                locationStatus.classList.add('success');

                // Auto-select YES
                locYes.checked = true;
                showToast('Location captured successfully!');
            }
        },
        (error) => {
            console.error(error);
            locationStatus.textContent = 'Failed to get location.';
            showToast('Error capturing location: ' + error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

// Enforce Location Logic
locYes.addEventListener('change', () => {
    if (!latInput.value) {
        showToast('Please click "Record Location Now" button first!');
        // Ideally we might want to uncheck this but let's just warn
        // locYes.checked = false; 
    }
});

// Handle Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Check if Location says YES but no coords
    if (locYes.checked && !latInput.value) {
        showToast('You selected Location: YES but performed no capture. Please capture location.');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const formData = new FormData(form);

        // Handle Products Multi-select
        // FormData handles checkboxes with same name by default but we want a clean string maybe?
        // Actually the backend might receive array or single value.
        // Let's manually aggregate checkboxes to be safe.
        const productCheckboxes = document.querySelectorAll('input[name="products"]:checked');
        const products = Array.from(productCheckboxes).map(cb => cb.value).join(', ');

        // Remove individual entries and append the joined string
        formData.delete('products');
        formData.append('products', products);

        const response = await fetch('/api/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showToast('Form submitted successfully!');
            form.reset();
            locationStatus.textContent = 'Not recorded';
            locationStatus.classList.remove('success');
        } else {
            showToast('Error: ' + result.message);
        }

    } catch (error) {
        showToast('Network error or server offline.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Form';
    }
});

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}
