/**
 * TrackFriend - Vehicle Panel JavaScript
 * This script handles receiving ambulance alerts and providing recommendations.
 */

// DOM Elements
const vehicleIdSelect = document.getElementById('vehicle-id');
const statusIndicator = document.getElementById('status-indicator');
const alertMessage = document.getElementById('alert-message');
const actionText = document.getElementById('action-text');
const distanceValue = document.getElementById('distance-value');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const updateLocationBtn = document.getElementById('update-location');
const directionButtons = document.querySelectorAll('.simulator-controls button');
const vehicleMarker = document.getElementById('vehicle-marker');
const ambulanceMarker = document.getElementById('ambulance-marker');
const eventLog = document.getElementById('event-log');
const actionDisplay = document.getElementById('action-display');

// Firebase references
const ambulanceRef = database.ref('ambulance');
const vehiclesRef = database.ref('vehicles');

// State management
let currentVehicleId = vehicleIdSelect.value;
let currentLocation = {
    lat: parseFloat(latitudeInput.value),
    lng: parseFloat(longitudeInput.value)
};
let ambulanceData = null;
let isEmergencyActive = false;
let distanceToAmbulance = null;
let directionToAmbulance = null;

// Initialize application
function init() {
    // Set initial vehicle location in Firebase
    updateVehicleLocation();

    // Listen for ambulance updates
    setupAmbulanceListener();

    addToLog('Vehicle tracking system initialized');
}

// Update vehicle location in Firebase
function updateVehicleLocation() {
    vehiclesRef.child(currentVehicleId).set({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        timestamp: Date.now()
    }).then(() => {
        addToLog(`Updated location: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`);
        updateMapMarkers();
    }).catch(error => {
        addToLog(`Error updating location: ${error.message}`);
        console.error('Error updating location:', error);
    });
}

// Set up listener for ambulance data
function setupAmbulanceListener() {
    ambulanceRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            ambulanceData = snapshot.val();

            // Check if there's an active emergency
            isEmergencyActive = ambulanceData.status === 'EMERGENCY';

            // Update UI based on emergency status
            updateEmergencyUI();

            // Calculate distance and direction to ambulance
            if (ambulanceData.lat && ambulanceData.lng) {
                distanceToAmbulance = calculateDistance(
                    currentLocation.lat,
                    currentLocation.lng,
                    ambulanceData.lat,
                    ambulanceData.lng
                );

                directionToAmbulance = getDirection(
                    currentLocation.lat,
                    currentLocation.lng,
                    ambulanceData.lat,
                    ambulanceData.lng
                );

                // Update distance display
                distanceValue.textContent = distanceToAmbulance.toFixed(2) + ' km';

                // Generate and display recommendation
                const recommendation = generateRecommendation(distanceToAmbulance, directionToAmbulance);
                actionText.textContent = recommendation;

                // Log the event
                if (isEmergencyActive) {
                    addToLog(`🚨 Ambulance alert: ${distanceToAmbulance.toFixed(2)} km ${directionToAmbulance} of your position`);
                }

                // Update ambulance position on map
                updateMapMarkers();
            }
        } else {
            // No ambulance data available
            isEmergencyActive = false;
            updateEmergencyUI();
            addToLog('No ambulance data available');
        }
    });
}

// Update UI based on emergency status
function updateEmergencyUI() {
    if (isEmergencyActive) {
        statusIndicator.classList.add('alert');
        alertMessage.textContent = 'EMERGENCY ACTIVE';
        actionDisplay.parentElement.classList.add('emergency-active');
        ambulanceMarker.style.display = 'block';
    } else {
        statusIndicator.classList.remove('alert');
        alertMessage.textContent = 'No active alerts';
        actionDisplay.parentElement.classList.remove('emergency-active');
        actionText.textContent = 'No action needed';
        ambulanceMarker.style.display = 'none';
    }
}

// Update map markers position
function updateMapMarkers() {
    const mapElement = document.getElementById('simplified-map');
    const mapWidth = mapElement.offsetWidth;
    const mapHeight = mapElement.offsetHeight;

    // Position vehicle marker (center of map by default)
    const vehicleX = mapWidth / 2;
    const vehicleY = mapHeight / 2;

    vehicleMarker.style.left = `${vehicleX}px`;
    vehicleMarker.style.top = `${vehicleY}px`;

    // Position ambulance marker if data available
    if (ambulanceData && ambulanceData.lat && ambulanceData.lng) {
        // Calculate relative position (simplified)
        // This is just a visual representation, not geographically accurate
        const latDiff = ambulanceData.lat - currentLocation.lat;
        const lngDiff = ambulanceData.lng - currentLocation.lng;

        // Scale the differences for map display
        // Higher scale factor = closer view
        const scaleFactor = 5000;

        const ambulanceX = vehicleX + (lngDiff * scaleFactor);
        const ambulanceY = vehicleY - (latDiff * scaleFactor);

        // Keep within map bounds
        const boundedX = Math.max(20, Math.min(ambulanceX, mapWidth - 20));
        const boundedY = Math.max(20, Math.min(ambulanceY, mapHeight - 20));

        ambulanceMarker.style.left = `${boundedX}px`;
        ambulanceMarker.style.top = `${boundedY}px`;
    }
}

// Vehicle ID selection
vehicleIdSelect.addEventListener('change', () => {
    // Save old vehicle ID for cleanup
    const oldVehicleId = currentVehicleId;

    // Set new vehicle ID
    currentVehicleId = vehicleIdSelect.value;

    // Remove old vehicle data
    vehiclesRef.child(oldVehicleId).remove();

    // Add new vehicle data
    updateVehicleLocation();

    addToLog(`Switched to vehicle ${currentVehicleId}`);
});

// Update location from inputs
updateLocationBtn.addEventListener('click', () => {
    currentLocation.lat = parseFloat(latitudeInput.value);
    currentLocation.lng = parseFloat(longitudeInput.value);

    updateVehicleLocation();
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

        // Update Firebase and UI
        updateVehicleLocation();
    });
});

// Add message to event log
function addToLog(message) {
    const logEntry = document.createElement('p');
    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;

    eventLog.insertBefore(logEntry, eventLog.firstChild);

    // Trim log if it gets too long
    if (eventLog.children.length > 20) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Initialize the application
init();