// — Firebase Configuration (your existing) —
const firebaseConfig = {
    apiKey: "AIzaSyAkkGmA4LVvaxDUoWtMs4vVwmZHBVMCgy0",
    authDomain: "trackfriend-e311f.firebaseapp.com",
    databaseURL: "https://trackfriend-e311f-default-rtdb.firebaseio.com",
    projectId: "trackfriend-e311f",
    storageBucket: "trackfriend-e311f.appspot.com",
    messagingSenderId: "58012498625",
    appId: "1:58012498625:web:e92503aea54af303903240"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// — DOM refs —
const ui = {
    modal: document.getElementById("username-modal"),
    input: document.getElementById("username-input"),
    submit: document.getElementById("username-submit"),
    userName: document.getElementById("current-username"),
    status: document.getElementById("connection-status"),
    lat: document.getElementById("current-latitude"),
    lng: document.getElementById("current-longitude"),
    online: document.getElementById("online-users-count"),
    list: document.getElementById("user-list"),
    refresh: document.getElementById("refresh-button"),
    mapDiv: document.getElementById("street-map"),
    grid: document.getElementById("grid-map"),
    streetMapTab: document.getElementById("street-map-tab"),
    gridMapTab: document.getElementById("grid-map-tab")
};

let currentUser = null;
let map = null;
let gridCtx = null;
let allData = {};
let userMarkers = {};
let userColors = {}; // To store colors for each user

// Helper function to generate a color from a string (username)
function getColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
}

// — formatting helpers —
function formatNumber(x) {
    return x.toString()
        .split(".")
        .map((p, i) => i === 0 ?
            p.replace(/\B(?=(\d{3})+(?!\d))/g, ",") :
            p
        )
        .join(".");
}

function convertDist(km) {
    const m = km * 1e3;
    const cm = km * 1e5;
    return `${formatNumber(km.toFixed(2))} km | ${formatNumber(m.toFixed(0))} m | ${formatNumber(cm.toFixed(0))} cm`;
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const seconds = Math.round((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

// — init Leaflet map at zoom 18 for street-level detail —
function initMap(lat, lng) {
    if (!map) {
        map = L.map(ui.mapDiv).setView([lat, lng], 18);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
    } else {
        map.setView([lat, lng], 18);
    }
}

// — init grid canvas —
function initGrid() {
    const c = ui.grid;
    c.width = c.clientWidth;
    c.height = c.clientHeight;
    gridCtx = c.getContext("2d");
    drawGrid();
}

function drawGrid() {
    const ctx = gridCtx;
    const w = ctx.canvas.width,
        h = ctx.canvas.height,
        step = 25;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#ccc";
    for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
}

function plotPoints() {
    drawGrid();
    if (!allData[currentUser]) return;
    const self = allData[currentUser];
    const origin = { x: gridCtx.canvas.width / 2, y: gridCtx.canvas.height / 2 };
    const currentUserColor = userColors[currentUser] || getColorFromString(currentUser);

    // self marker
    gridCtx.fillStyle = currentUserColor;
    gridCtx.fillRect(origin.x - 5, origin.y - 5, 10, 10);
    gridCtx.fillStyle = "black"; // Color for the username text
    gridCtx.fillText(currentUser, origin.x + 10, origin.y + 5); // Display username

    Object.entries(allData).forEach(([user, d]) => {
        if (user === currentUser) return;
        const userColor = userColors[user] || getColorFromString(user);
        const dx = (d.longitude - self.longitude) * 111000 * Math.cos(self.latitude * Math.PI / 180);
        const dy = (d.latitude - self.latitude) * 111000;
        const px = origin.x + dx / 500;
        const py = origin.y - dy / 500;

        gridCtx.fillStyle = userColor;
        gridCtx.fillRect(px - 5, py - 5, 10, 10);
        gridCtx.fillStyle = "black"; // Color for the username text
        gridCtx.fillText(user, px + 10, py + 5); // Display username

        gridCtx.beginPath();
        gridCtx.moveTo(origin.x, origin.y);
        gridCtx.lineTo(px, py);
        gridCtx.strokeStyle = "red";
        gridCtx.stroke();

        // Calculate and display distance on the line
        const distance = getDistance(self.latitude, self.longitude, d.latitude, d.longitude);
        const midX = (origin.x + px) / 2;
        const midY = (origin.y + py) / 2;
        gridCtx.fillStyle = "black";
        gridCtx.fillText(`${distance.toFixed(2)} km`, midX, midY - 5); // Adjust text position as needed
    });
}

// — haversine (km) —
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// — geolocation & Firebase write —
function handleGeo() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }
    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        ui.lat.textContent = latitude.toFixed(5);
        ui.lng.textContent = longitude.toFixed(5);

        initMap(latitude, longitude);
        if (!gridCtx) initGrid();

        db.ref(`locations/${currentUser}`).set({
            latitude,
            longitude,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }, err => {
        ui.status.textContent = "Error: " + err.message;
    }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
    });
}

// — live sidebar list & map markers —
db.ref("locations").on("value", snap => {
    const locs = snap.val() || {};
    allData = locs; // Used by grid plot and distance calculations

    let onlineUsersCount = 0;
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes

    // Update online status and user list in sidebar
    if (locs[currentUser] && typeof locs[currentUser].latitude === 'number' && typeof locs[currentUser].longitude === 'number') {
        const currentUserIsActive = (now - (locs[currentUser].timestamp || 0)) < activeThreshold;
        ui.status.textContent = currentUserIsActive ? "Online" : "Inactive";
        ui.list.innerHTML = ""; // Clear previous list

        Object.entries(locs).forEach(([user, d]) => {
            if (!userColors[user]) { // Assign a color if not already assigned
                userColors[user] = getColorFromString(user);
            }
            const userColor = userColors[user];

            if (user === currentUser) return; // Don't list self
            if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') { // Ensure other user's data is valid
                const km = getDistance(
                    d.latitude, d.longitude,
                    locs[currentUser].latitude, locs[currentUser].longitude
                );
                const li = document.createElement("li");
                const userIsActive = (now - (d.timestamp || 0)) < activeThreshold;
                if (userIsActive) onlineUsersCount++;

                let lastActiveStr = " (Offline)";
                if (d.timestamp) {
                    lastActiveStr = userIsActive ? " (Online)" : ` (Last active: ${formatTimeAgo(d.timestamp)})`;
                }

                li.innerHTML = `<span style="display: flex; align-items: center;"><span style="width: 10px; height: 10px; background-color: ${userColor}; border-radius: 50%; margin-right: 8px;"></span>${user}${lastActiveStr}</span><span>${convertDist(km)}</span>`;
                ui.list.appendChild(li);

                // Add "Show on map" button
                const showOnMapButton = document.createElement("button");
                showOnMapButton.textContent = "Show on Map";
                showOnMapButton.classList.add("show-on-map-button"); // Add a class for styling
                showOnMapButton.addEventListener("click", () => {
                    if (map && locs[user] && typeof locs[user].latitude === 'number' && typeof locs[user].longitude === 'number') {
                        map.setView([locs[user].latitude, locs[user].longitude], 18); // Zoom to user's location
                    }
                });
                li.appendChild(showOnMapButton);
            }
        });
    } else {
        ui.list.innerHTML = ""; // Clear list if current user data is not available
        if (currentUser) { // Only show "Connecting..." if a user is set
            ui.status.textContent = "Connecting...";
        }
    }
    // Increment for the current user if they are active
    if (locs[currentUser] && (now - (locs[currentUser].timestamp || 0)) < activeThreshold) {
        onlineUsersCount++;
    }
    ui.online.textContent = onlineUsersCount;

    // Update map markers if map is initialized
    if (map) {
        const currentUsersInFirebase = new Set();

        Object.entries(locs).forEach(([user, d]) => {
            if (!userColors[user]) { // Ensure color is assigned
                userColors[user] = getColorFromString(user);
            }
            const userColor = userColors[user];

            // Ensure location data is valid before creating/updating marker
            if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
                currentUsersInFirebase.add(user);

                // Custom icon with user-specific color
                const coloredIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color:${userColor};" class="marker-pin"></div><i class="material-icons">person_pin_circle</i>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42],
                    tooltipAnchor: [0, -35] // Adjust tooltip position relative to the new icon
                });

                if (userMarkers[user]) {
                    userMarkers[user].setLatLng([d.latitude, d.longitude]);
                    userMarkers[user].setIcon(coloredIcon); // Update icon color
                    userMarkers[user].bindTooltip(user, { permanent: true, direction: 'top' }).openTooltip();
                } else {
                    userMarkers[user] = L.marker([d.latitude, d.longitude], { icon: coloredIcon }).addTo(map)
                        .bindTooltip(user, { permanent: true, direction: 'top' }).openTooltip();
                }
            }
        });

        // Remove markers for users who are no longer in locs (went offline or data removed)
        Object.keys(userMarkers).forEach(userInMarkerCache => {
            if (!currentUsersInFirebase.has(userInMarkerCache)) {
                map.removeLayer(userMarkers[userInMarkerCache]);
                delete userMarkers[userInMarkerCache];
            }
        });
    }

    // Update grid plot
    if (gridCtx && locs[currentUser] && typeof locs[currentUser].latitude === 'number' && typeof locs[currentUser].longitude === 'number') {
        plotPoints();
    } else if (gridCtx) {
        // If currentUser data is not available, just draw an empty grid or a specific state
        drawGrid(); // Clears and redraws the basic grid
    }
});

// — username modal logic —
ui.submit.onclick = () => {
    const name = ui.input.value.trim();
    if (!name) return alert("Please enter a name");
    currentUser = name;
    localStorage.setItem("trackFriendUser", name);
    ui.userName.textContent = name;
    ui.modal.style.display = "none";
    handleGeo();
};

window.addEventListener("DOMContentLoaded", () => {
    ui.modal.style.display = "flex";
    ui.input.focus();

    ui.streetMapTab.addEventListener("click", () => {
        ui.streetMapTab.classList.add("active-tab");
        ui.gridMapTab.classList.remove("active-tab");
        ui.mapDiv.style.display = "block";
        ui.grid.style.display = "none";
        if (map) map.invalidateSize(); // Recalculate map size
    });

    ui.gridMapTab.addEventListener("click", () => {
        ui.gridMapTab.classList.add("active-tab");
        ui.streetMapTab.classList.remove("active-tab");
        ui.mapDiv.style.display = "none";
        ui.grid.style.display = "block";
        if (gridCtx) {
            initGrid(); // Re-initialize grid in case of resize
            plotPoints();
        }
    });
});

window.onload = () => {
    const saved = localStorage.getItem("trackFriendUser");
    if (saved) {
        currentUser = saved;
        ui.userName.textContent = saved;
        ui.modal.style.display = "none";
        handleGeo();
    } else {
        ui.modal.style.display = "flex";
    }
    ui.refresh.onclick = () => {
        navigator.geolocation.getCurrentPosition(() => {});
    };
    window.addEventListener("resize", initGrid);
};