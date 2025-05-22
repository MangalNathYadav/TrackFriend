// Firebase Configuration (Replace with your config)
const firebaseConfig = {
    apiKey: "AIzaSyAkkGmA4LVvaxDUoWtMs4vVwmZHBVMCgy0",
    authDomain: "trackfriend-e311f.firebaseapp.com",
    databaseURL: "https://trackfriend-e311f-default-rtdb.firebaseio.com",
    projectId: "trackfriend-e311f",
    storageBucket: "trackfriend-e311f.appspot.com",
    messagingSenderId: "58012498625",
    appId: "1:58012498625:web:e92503aea54af303903240"
};
// Firebase Config (Replace with your values)


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// App State
let currentUser = null;
let map = null;
let userMarkers = {};
let userPolylines = {};
let allUsersData = {};
const USER_INACTIVITY_THRESHOLD = 120000; // 2 minutes

// DOM Elements
const elements = {
    currentUsername: document.getElementById('current-username'),
    connectionStatus: document.getElementById('connection-status'),
    onlineUsersCount: document.getElementById('online-users-count'),
    userList: document.getElementById('user-list'),
    currentLatitude: document.getElementById('current-latitude'),
    currentLongitude: document.getElementById('current-longitude'),
    refreshButton: document.getElementById('refresh-button'),
    calculateDistanceBtn: document.getElementById('calculate-distance-btn'),
    distanceResult: document.getElementById('distance-result'),
    selectedUser1: document.getElementById('selected-user1-name'),
    selectedUser2: document.getElementById('selected-user2-name')
};

// Core Functions
function initMap(lat, lng) {
    map = L.map('map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

function updateUserLocation(lat, lng) {
    database.ref(`locations/${currentUser}`).set({
        latitude: lat,
        longitude: lng,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        username: currentUser
    });
}

function handleGeolocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        initMap(-17.6797, -149.4068); // Default to Tahiti
        return;
    }

    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    const success = position => {
        const { latitude, longitude } = position.coords;
        elements.currentLatitude.textContent = latitude.toFixed(5);
        elements.currentLongitude.textContent = longitude.toFixed(5);

        if (!map) initMap(latitude, longitude);
        updateUserLocation(latitude, longitude);
        updateUserMarker(currentUser, latitude, longitude, true);
    };

    const error = err => {
        console.error('Geolocation error:', err);
        elements.connectionStatus.textContent = `Error: ${err.message}`;
        if (!map) initMap(-17.6797, -149.4068);
    };

    navigator.geolocation.watchPosition(success, error, geoOptions);
    navigator.geolocation.getCurrentPosition(success, error, geoOptions);
}

function updateUserMarker(username, lat, lng, isSelf) {
    const iconColor = isSelf ? 'blue' : 'green';
    const markerHtml = `
        <div style="
            width: 16px;
            height: 16px;
            background: ${iconColor};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 8px rgba(0,0,0,0.3);
        "></div>
    `;

    if (userMarkers[username]) {
        userMarkers[username].setLatLng([lat, lng]);
    } else {
        userMarkers[username] = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'user-marker',
                html: markerHtml,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(map);
    }
}

// Initialize App
function initApp() {
    // Set username
    currentUser = localStorage.getItem('trackFriendUser') ||
        `User${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('trackFriendUser', currentUser);
    elements.currentUsername.textContent = currentUser;

    // Setup Firebase listeners
    database.ref('locations').on('value', snapshot => {
        const locations = snapshot.val() || {};
        allUsersData = locations;

        // Update user list
        elements.userList.innerHTML = '';
        Object.entries(locations).forEach(([username, data]) => {
            if (username === currentUser) return;

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="user-item">
                    <span class="username">${username}</span>
                    <span class="distance">${getDistance(
                        data.latitude, 
                        data.longitude, 
                        locations[currentUser]?.latitude || 0, 
                        locations[currentUser]?.longitude || 0
                    ).toFixed(1)} km</span>
                    <div class="timestamp">${timeAgo(data.timestamp)}</div>
                </div>
            `;
            elements.userList.appendChild(li);
        });

        elements.onlineUsersCount.textContent = Object.keys(locations).length;
    });

    // Setup event listeners
    elements.refreshButton.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            updateUserLocation(latitude, longitude);
            map.setView([latitude, longitude]);
        });
    });

    // Start geolocation
    handleGeolocation();
}

// Helper Functions
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    return `${Math.floor(seconds/3600)}h ago`;
}

// Start Application
document.addEventListener('DOMContentLoaded', initApp);