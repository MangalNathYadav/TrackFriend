/**
 * TrackFriend - Ambulance Panel JavaScript
 * This script handles the emergency toggle and location updates for the ambulance.
 */

// DOM Elements
const emergencyToggle = document.getElementById('emergency-toggle');
const statusText = document.getElementById('status-text');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const updateLocationBtn = document.getElementById('update-location');
const directionButtons = document.querySelectorAll('.simulator-controls button');
const statusLog = document.getElementById('status-log');
const ambulanceId = document.getElementById('ambulance-id').textContent;

// Firebase reference to ambulance data
const ambulanceRef = database.ref(`ambulance`);

// State management
let emergencyActive = false;
let currentLocation = {
    lat: parseFloat(latitudeInput.value),
    lng: parseFloat(longitudeInput.value)
};

// Initialize application
function init() {
    // Load any existing data from Firebase
    ambulanceRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();

            // Update UI with existing data
            if (data.status === 'EMERGENCY') {
                emergencyToggle.checked = true;
                emergencyActive = true;
                statusText.textContent = 'EMERGENCY ACTIVE';
                statusText.style.color = '#e74c3c';
            }

            if (data.lat && data.lng) {
                latitudeInput.value = data.lat;
                longitudeInput.value = data.lng;
                currentLocation.lat = data.lat;
                currentLocation.lng = data.lng;
            }

            addToLog(`Loaded existing ambulance data: Status ${data.status}`);
        } else {
            // Initialize with default data
            updateAmbulanceData();
            addToLog('No existing data found. Initialized with default values.');
        }
    });
}

// Update ambulance data in Firebase
function updateAmbulanceData() {
    const status = emergencyActive ? 'EMERGENCY' : 'INACTIVE';

    ambulanceRef.set({
        id: ambulanceId,
        status: status,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        timestamp: Date.now()
    }).then(() => {
        addToLog(`Updated ambulance data: Status ${status}, Location: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`);
    }).catch(error => {
        addToLog(`Error updating data: ${error.message}`);
        console.error('Error updating data:', error);
    });
}

// Toggle emergency status
emergencyToggle.addEventListener('change', () => {
    emergencyActive = emergencyToggle.checked;

    if (emergencyActive) {
        statusText.textContent = 'EMERGENCY ACTIVE';
        statusText.style.color = '#e74c3c';
        addToLog('🚨 EMERGENCY MODE ACTIVATED');
    } else {
        statusText.textContent = 'INACTIVE';
        statusText.style.color = '#333';
        addToLog('Emergency mode deactivated');
    }

    updateAmbulanceData();
});

// Update location from inputs
updateLocationBtn.addEventListener('click', () => {
    currentLocation.lat = parseFloat(latitudeInput.value);
    currentLocation.lng = parseFloat(longitudeInput.value);

    updateAmbulanceData();
});

// Location simulator controls
directionButtons.forEach(button => {
    button.addEventListener('click', () => {
        const direction = button.getAttribute('data-direction');

        // Update latitude/longitude based on direction
        // Using small increments for simulation purposes
        const increment = 0.001; // Roughly 100 meters

        switch (direction) {
            case 'north':
                currentLocation.lat += increment;
                break;
            case 'south':
                currentLocation.lat -= increment;
                break;
            case 'east':
                currentLocation.lng += increment;
                break;
            case 'west':
                currentLocation.lng -= increment;
                break;
        }

        // Update input fields
        latitudeInput.value = currentLocation.lat;
        longitudeInput.value = currentLocation.lng;

        // Update Firebase
        updateAmbulanceData();

        addToLog(`Moved ${direction}: New location: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`);
    });
});

// Add message to status log
function addToLog(message) {
    const logEntry = document.createElement('p');
    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;

    statusLog.insertBefore(logEntry, statusLog.firstChild);

    // Trim log if it gets too long
    if (statusLog.children.length > 20) {
        statusLog.removeChild(statusLog.lastChild);
    }
}

// Initialize the application
init();