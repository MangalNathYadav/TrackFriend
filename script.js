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
    grid: document.getElementById("grid-map")
};

let currentUser = null;
let map = null;
let gridCtx = null;
let allData = {};
let userMarkers = {};

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

    // self marker
    gridCtx.fillStyle = "blue";
    gridCtx.fillRect(origin.x - 5, origin.y - 5, 10, 10);

    Object.entries(allData).forEach(([user, d]) => {
        if (user === currentUser) return;
        const dx = (d.longitude - self.longitude) * 111000 * Math.cos(self.latitude * Math.PI / 180);
        const dy = (d.latitude - self.latitude) * 111000;
        const px = origin.x + dx / 500;
        const py = origin.y - dy / 500;

        gridCtx.fillStyle = "green";
        gridCtx.fillRect(px - 5, py - 5, 10, 10);

        gridCtx.beginPath();
        gridCtx.moveTo(origin.x, origin.y);
        gridCtx.lineTo(px, py);
        gridCtx.strokeStyle = "red";
        gridCtx.stroke();
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

    // Update online status and user list in sidebar
    if (locs[currentUser] && typeof locs[currentUser].latitude === 'number' && typeof locs[currentUser].longitude === 'number') {
        ui.status.textContent = "Online";
        ui.list.innerHTML = ""; // Clear previous list

        Object.entries(locs).forEach(([user, d]) => {
            if (user === currentUser) return; // Don't list self
            if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') { // Ensure other user's data is valid
                const km = getDistance(
                    d.latitude, d.longitude,
                    locs[currentUser].latitude, locs[currentUser].longitude
                );
                const li = document.createElement("li");
                li.innerHTML = `<span>${user}</span><span>${convertDist(km)}</span>`;
                ui.list.appendChild(li);
            }
        });
    } else {
        ui.list.innerHTML = ""; // Clear list if current user data is not available
        if (currentUser) { // Only show "Connecting..." if a user is set
            ui.status.textContent = "Connecting...";
        }
    }
    ui.online.textContent = Object.keys(locs).length;


    // Update map markers if map is initialized
    if (map) {
        const currentUsersInFirebase = new Set();

        Object.entries(locs).forEach(([user, d]) => {
            // Ensure location data is valid before creating/updating marker
            if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
                currentUsersInFirebase.add(user);
                const latLng = [d.latitude, d.longitude];

                if (userMarkers[user]) {
                    // Marker exists, update position
                    userMarkers[user].setLatLng(latLng);
                } else {
                    // New user, create marker
                    userMarkers[user] = L.marker(latLng).addTo(map);
                    userMarkers[user].bindPopup(user);
                }
                // Optional: Customize current user's marker, e.g., different color or open popup by default
                if (user === currentUser && userMarkers[user]) {
                    // userMarkers[user].openPopup(); // Example: open current user's popup
                    // Or use a custom icon: userMarkers[user].setIcon(L.icon({ /* ... */ }));
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