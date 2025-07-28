// TrackFriend – Island Locator
// Insert your Firebase config below
const firebaseConfig = {
  // TODO: Add your Firebase config here
   apiKey: "AIzaSyAkkGmA4LVvaxDUoWtMs4vVwmZHBVMCgy0",
    authDomain: "trackfriend-e311f.firebaseapp.com",
    databaseURL: "https://trackfriend-e311f-default-rtdb.firebaseio.com",
    projectId: "trackfriend-e311f",
    storageBucket: "trackfriend-e311f.appspot.com",
    messagingSenderId: "58012498625",
    appId: "1:58012498625:web:e92503aea54af303903240"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// --- Auth & Onboarding ---
const authModal = document.getElementById('auth-modal');
const dashboard = document.getElementById('dashboard');
const groupDetail = document.getElementById('group-detail');

const googleBtn = document.getElementById('google-signin');
const emailBtn = document.getElementById('email-signin');
const emailForm = document.getElementById('email-form');

let currentUser = null;

function showModal() {
  authModal.style.display = 'flex';
  dashboard.style.display = 'none';
  groupDetail.style.display = 'none';
}
function showDashboard() {
  authModal.style.display = 'none';
  dashboard.style.display = 'block';
  groupDetail.style.display = 'none';
}
function showGroupDetail() {
  authModal.style.display = 'none';
  dashboard.style.display = 'none';
  groupDetail.style.display = 'flex';
  groupDetail.className = 'group-detail';
}

googleBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};
emailBtn.onclick = () => {
  emailForm.style.display = 'block';
};
emailForm.onsubmit = e => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const username = document.getElementById('username').value.trim();
  auth.signInWithEmailAndPassword(email, password)
    .catch(() => {
      // If sign in fails, try sign up
      return auth.createUserWithEmailAndPassword(email, password).then(cred => {
        // Set displayName if username provided
        if (username) {
          return cred.user.updateProfile({ displayName: username }).then(() => {
            // Also store in /users
            db.ref('users/' + cred.user.uid).set({
              displayName: username,
              email: email,
              photoURL: cred.user.photoURL || '',
              lastSeen: Date.now()
            });
          });
        }
      });
    });
};

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    // Update /users with latest info
    db.ref('users/' + user.uid).update({
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      lastSeen: Date.now()
    });
    showDashboard();
    renderProfilePanel(user);
    startLocationTracking();
    renderGroupPanel();
  } else {
    currentUser = null;
    showModal();
  }
});

// --- Profile Panel ---
function renderProfilePanel(user) {
  const panel = document.getElementById('profile-panel');
  panel.innerHTML = '';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if (user.photoURL) {
    avatar.innerHTML = `<img src="${user.photoURL}" alt="avatar">`;
  } else {
    avatar.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
  }
  const info = document.createElement('div');
  info.className = 'info';
  let uname = user.displayName || (user.email ? user.email.split('@')[0] : '');
  let email = user.email || '';
  info.innerHTML = `<div style="font-weight:600;font-size:1.1em;">${uname}</div><div style="font-size:0.97em;color:#888;">${email}</div>`;
  const signOut = document.createElement('button');
  signOut.textContent = 'Sign Out';
  signOut.onclick = () => auth.signOut();
  panel.appendChild(avatar);
  panel.appendChild(info);
  panel.appendChild(signOut);
}

// --- Location Panel ---
let map, marker, watchId;
function startLocationTracking() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const latlngDiv = document.getElementById('latlng');
      let lastUpdatedDiv = document.getElementById('last-updated');
      if (!lastUpdatedDiv) {
        lastUpdatedDiv = document.createElement('div');
        lastUpdatedDiv.id = 'last-updated';
        latlngDiv.parentNode.appendChild(lastUpdatedDiv);
      }
      latlngDiv.textContent = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`;
      const now = new Date();
      lastUpdatedDiv.textContent = `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
      db.ref('locations/' + currentUser.uid).set({
        lat: latitude,
        lng: longitude,
        timestamp: Date.now()
      });
      // ...existing code for map and graph (removed for brevity)...
    },
    err => {
      document.getElementById('latlng').textContent = 'Location unavailable.';
    },
    { enableHighAccuracy: true }
  );
}

function drawGraphCanvas(lat, lng) {
  const canvas = document.getElementById('graph-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw grid
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
  }
  // Draw self at center
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.arc(canvas.width/2, canvas.height/2, 8, 0, 2*Math.PI);
  ctx.fill();
  // Draw other users
  db.ref('locations').once('value', snap => {
    const locs = snap.val() || {};
    Object.entries(locs).forEach(([uid, loc]) => {
      if (uid === currentUser.uid) return;
      // Approximate: 0.00001 deg ~ 1.11m
      const dx = (loc.lng - lng) * 100000 * 1.11;
      const dy = (lat - loc.lat) * 100000 * 1.11;
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(canvas.width/2, canvas.height/2);
      ctx.lineTo(canvas.width/2 + dx, canvas.height/2 + dy);
      ctx.stroke();
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.arc(canvas.width/2 + dx, canvas.height/2 + dy, 8, 0, 2*Math.PI);
      ctx.fill();
    });
  });
}

// --- Group Management Panel ---
function renderGroupPanel() {
  const panel = document.getElementById('group-panel');
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <span style='font-size:1.5em;'>👥</span>
      <h3 style="margin:0;font-size:1.25em;letter-spacing:0.5px;">Your Groups</h3>
      <button id="open-create-group-modal" style="margin-left:auto;padding:7px 18px;font-size:1em;border-radius:8px;background:#4f8cff;color:#fff;font-weight:600;border:none;box-shadow:0 2px 8px #4f8cff22;cursor:pointer;transition:background 0.18s;">➕ Create Group</button>
    </div>
    <div id="create-group-modal" class="modal" style="display:none;align-items:center;justify-content:center;z-index:2002;">
      <div class="modal-content" style="min-width:320px;max-width:95vw;padding:36px 28px 28px 28px;position:relative;">
        <button id="close-create-group-modal" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5em;color:#888;cursor:pointer;">&times;</button>
        <form id="create-group-form">
          <div style='font-size:1.2em;margin-bottom:12px;color:#4f8cff;font-weight:700;text-align:center;'>Create Group</div>
          <input type="text" id="create-group-name" placeholder="Group Name" required class="fluffy-input" style="margin-bottom:10px;" />
          <input type="password" id="create-group-key" placeholder="Private Key" required class="fluffy-input" style="margin-bottom:10px;" />
          <button type="submit" style="width:100%;margin-top:8px;">Create</button>
        </form>
      </div>
    </div>
    <div style="margin-top:18px;">
      <div style="font-size:1.08em;font-weight:600;color:#2d3a4a;margin-bottom:8px;display:flex;align-items:center;gap:7px;">
        <span style='font-size:1.2em;'>📋</span> Joined Groups
      </div>
      <div id="joined-group-cards" style="display:flex;flex-wrap:wrap;gap:16px;"></div>
      <div style="font-size:1.08em;font-weight:600;color:#2d3a4a;margin:18px 0 8px 0;display:flex;align-items:center;gap:7px;">
        <span style='font-size:1.2em;'>🌐</span> All Groups
      </div>
      <div id="all-group-cards" style="display:flex;flex-wrap:wrap;gap:16px;"></div>
    </div>
  `;
  // Modal logic
  const modal = document.getElementById('create-group-modal');
  document.getElementById('open-create-group-modal').onclick = () => { modal.style.display = 'flex'; };
  document.getElementById('close-create-group-modal').onclick = () => { modal.style.display = 'none'; };
  document.getElementById('create-group-form').onsubmit = function(e) {
    createGroup(e);
    modal.style.display = 'none';
  };
  loadGroupsCards();
}

async function hashKey(key) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(key));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function joinGroup(e) {
  e.preventDefault();
  const name = document.getElementById('join-group-name').value;
  const key = document.getElementById('join-group-key').value;
  hashKey(key).then(hash => {
    db.ref('groups/' + name).once('value', snap => {
      const group = snap.val();
      if (!group || group.privateKeyHash !== hash) {
        alert('Group not found or wrong key');
        return;
      }
      db.ref('groups/' + name + '/members/' + currentUser.uid).set(true);
      loadGroups();
    });
  });
}

function createGroup(e) {
  e.preventDefault();
  const name = document.getElementById('create-group-name').value;
  const key = document.getElementById('create-group-key').value;
  hashKey(key).then(hash => {
    db.ref('groups/' + name).transaction(group => {
      if (group) return; // already exists
      return {
        ownerUid: currentUser.uid,
        privateKeyHash: hash,
        createdAt: Date.now(),
        members: { [currentUser.uid]: true }
      };
    }, (err, committed, snap) => {
      if (committed) loadGroups();
      else alert('Group already exists');
    });
  });
}


function loadGroupsCards() {
  db.ref('groups').once('value', snap => {
    const groups = snap.val() || {};
    const joined = [];
    const unjoined = [];
    Object.entries(groups).forEach(([name, group]) => {
      if (group.members && group.members[currentUser.uid]) joined.push([name, group]);
      else unjoined.push([name, group]);
    });
    // Render joined groups as compact cards
    const joinedDiv = document.getElementById('joined-group-cards');
    joinedDiv.innerHTML = '';
    joined.forEach(([name, group]) => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.innerHTML = `
        <div class="group-title" title="${name}">${name}</div>
        <div class="group-members">👥 ${Object.keys(group.members||{}).length} members</div>
        <div class="group-actions">
          <button onclick="leaveGroup('${name}')">Leave</button>
          <button onclick="openGroupDetail('${name}')">Open</button>
        </div>
      `;
      joinedDiv.appendChild(card);
    });
    // Render all groups as compact cards (unjoined)
    const allDiv = document.getElementById('all-group-cards');
    allDiv.innerHTML = '';
    unjoined.forEach(([name, group]) => {
      const card = document.createElement('div');
      card.className = 'group-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="group-title" title="${name}">${name}</div>
        <div class="group-members">👥 ${group.members ? Object.keys(group.members).length : 0} members</div>
        <div class="group-actions">
          <button onclick="event.stopPropagation(); promptJoinGroup('${name}')">Join</button>
        </div>
      `;
      card.onclick = () => promptJoinGroup(name);
      allDiv.appendChild(card);
    });
  });
}

window.promptJoinGroup = function(name) {
  const key = prompt('Enter private key for group "' + name + '":');
  if (!key) return;
  hashKey(key).then(hash => {
    db.ref('groups/' + name).once('value', snap => {
      const group = snap.val();
      if (!group || group.privateKeyHash !== hash) {
        alert('Group not found or wrong key');
        return;
      }
      db.ref('groups/' + name + '/members/' + currentUser.uid).set(true);
      renderGroupPanel();
    });
  });
}

function leaveGroup(name) {
  db.ref('groups/' + name + '/members/' + currentUser.uid).remove();
  loadGroups();
}

// --- Group Detail View ---
function openGroupDetail(name) {
  showGroupDetail();
  db.ref('groups/' + name).once('value', snap => {
    const group = snap.val();
    if (!group) return alert('Group not found');
    renderGroupDetail(name, group);
  });
}

function renderGroupDetail(name, group) {
  groupDetail.innerHTML = `
    <div class="group-detail-left">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
        <span style="font-weight:600;font-size:1.08em;">Map View</span>
        <button id="open-full-map" style="padding:5px 14px;font-size:0.98em;border-radius:7px;background:#10b981;color:#fff;font-weight:600;border:none;box-shadow:0 2px 8px #10b98122;cursor:pointer;">Open Full View</button>
      </div>
      <div id="group-map"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 8px 0;">
        <span style="font-weight:600;font-size:1.08em;">Graph View</span>
        <button id="open-full-graph" style="padding:5px 14px;font-size:0.98em;border-radius:7px;background:#6366f1;color:#fff;font-weight:600;border:none;box-shadow:0 2px 8px #6366f122;cursor:pointer;">Open Full View</button>
      </div>
      <canvas id="group-graph" width="400" height="400"></canvas>
    </div>
    <div class="group-detail-right">
      <h2>${name}</h2>
      <div id="member-list"></div>
      <div class="group-detail-actions">
        <button onclick="refreshLocations('${name}')">Refresh Locations</button>
        <button id="calc-dist-btn">Calculate Distance</button>
        <button onclick="leaveGroup('${name}'); showDashboard();">Leave Group</button>
        <button onclick="showDashboard();">Close Group</button>
        ${group.ownerUid === currentUser.uid ? `<button onclick=\"deleteGroup('${name}')\">Delete Group</button>` : ''}
      </div>
      <div id="distance-results" style="margin-top:10px;font-size:1.05em;color:#222;"></div>
      <div id="group-chat-panel" style="margin-top:18px;">
        <h3 style="margin-bottom:6px;">Group Chat</h3>
        <div id="chat-messages" style="height:180px;overflow-y:auto;background:#f4f6fa;border-radius:8px;padding:8px 10px 8px 8px;margin-bottom:8px;border:1px solid #e0e7ef;"></div>
        <form id="chat-form" style="display:flex;gap:6px; margin-bottom:150px;">
          <input id="chat-input" type="text" placeholder="Type a message..." style="flex:1 1 0;padding:7px 10px;border-radius:6px;border:1px solid #bcd;outline:none;" maxlength="200" autocomplete="off" />
          <button type="submit" style="padding:7px 16px;border-radius:6px;background:#4f8cff;color:#fff;font-weight:600;border:none;">Send</button>
        </form>
      </div>
    </div>
    <div id="full-map-modal" class="modal" style="display:none;position:fixed;z-index:3000;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.65);align-items:center;justify-content:center;">
      <div style="position:relative;width:95vw;max-width:900px;height:80vh;background:#fff;border-radius:14px;box-shadow:0 4px 32px #0003;display:flex;flex-direction:column;">
        <button id="close-full-map" style="position:absolute;top:12px;right:-8px;background:#f87171;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:1.1em;z-index:10;cursor:pointer;">&times; Close</button>
        <div id="full-group-map" style="flex:1 1 0;height:100%;width:100%;border-radius:10px;"></div>
      </div>
    </div>
    <div id="full-graph-modal" class="modal" style="display:none;position:fixed;z-index:3000;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.65);align-items:center;justify-content:center;">
      <div style="position:relative;width:95vw;max-width:900px;height:80vh;background:#fff;border-radius:14px;box-shadow:0 4px 32px #0003;display:flex;flex-direction:column;">
        <button id="close-full-graph" style="position:absolute;top:12px;right:-8px;background:#6366f1;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:1.1em;z-index:10;cursor:pointer;">&times; Close</button>
        <canvas id="full-group-graph" width="800" height="800" style="flex:1 1 0;width:100%;height:100%;border-radius:10px;"></canvas>
      </div>
    </div>
  `;
  // --- Group Chat Logic ---
  setTimeout(() => {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    let chatListener = db.ref('groupChats/' + name);
    // Listen for new messages
    chatListener.off();
    chatListener.on('value', snap => {
      const msgs = snap.val() || {};
      chatMessages.innerHTML = Object.values(msgs).map(m => {
        const safeMsg = (m.text || '').replace(/[<>]/g, '');
        const user = m.username || m.displayName || m.email || 'User';
        const time = m.time ? new Date(m.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
        return `<div style="margin-bottom:4px;"><b style="color:#4f8cff;">${user}</b> <span style="color:#888;font-size:0.9em;">${time}</span><br>${safeMsg}</div>`;
      }).join('');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
    // Send message
    chatForm.onsubmit = e => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      db.ref('groupChats/' + name).push({
        text,
        uid: currentUser.uid,
        username: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        time: Date.now()
      });
    };
  }, 0);
  // Add event listeners for full map modal and distance calculation
  setTimeout(() => {
    // Map modal
    const openMapBtn = document.getElementById('open-full-map');
    const mapModal = document.getElementById('full-map-modal');
    const closeMapBtn = document.getElementById('close-full-map');
    if (openMapBtn && mapModal && closeMapBtn) {
      openMapBtn.onclick = () => {
        mapModal.style.display = 'flex';
        renderFullGroupMap(name);
      };
      closeMapBtn.onclick = () => {
        mapModal.style.display = 'none';
        if (window.fullGroupMapInstance) {
          window.fullGroupMapInstance.remove();
          window.fullGroupMapInstance = null;
        }
      };
    }
    // Graph modal
    const openGraphBtn = document.getElementById('open-full-graph');
    const graphModal = document.getElementById('full-graph-modal');
    const closeGraphBtn = document.getElementById('close-full-graph');
    if (openGraphBtn && graphModal && closeGraphBtn) {
      openGraphBtn.onclick = () => {
        graphModal.style.display = 'flex';
        renderFullGroupGraph(name);
      };
      closeGraphBtn.onclick = () => {
        graphModal.style.display = 'none';
      };
    }
    // Calculate Distance button logic
    const calcBtn = document.getElementById('calc-dist-btn');
    if (calcBtn) {
      calcBtn.onclick = () => calculateDistancesDisplay(name);
    }
  }, 0);
// Render the full screen group graph in the modal
function renderFullGroupGraph(name) {
  db.ref('groups/' + name + '/members').once('value', snap => {
    const members = snap.val() || {};
    db.ref('locations').once('value', locSnap => {
      const locs = locSnap.val() || {};
      db.ref('users').once('value', userSnap => {
        const users = userSnap.val() || {};
        const canvas = document.getElementById('full-group-graph');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Gather all member locations
        const memberUids = Object.keys(members).filter(uid => locs[uid]);
        if (memberUids.length === 0) return;
        const myLoc = locs[currentUser.uid] || locs[memberUids[0]];
        // Compute relative positions in meters
        const rels = memberUids.map(uid => {
          const loc = locs[uid];
          return {
            uid,
            name: users[uid]?.displayName || users[uid]?.email?.split('@')[0] || uid,
            dx: (loc.lng - myLoc.lng) * 100000 * 1.11,
            dy: (myLoc.lat - loc.lat) * 100000 * 1.11,
            color: uid === currentUser.uid ? '#3498db' : '#e67e22',
            loc
          };
        });
        // Find bounds
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        rels.forEach(({dx, dy}) => {
          if (dx < minX) minX = dx;
          if (dx > maxX) maxX = dx;
          if (dy < minY) minY = dy;
          if (dy > maxY) maxY = dy;
        });
        // Add some padding (meters)
        const pad = 30;
        minX -= pad; maxX += pad; minY -= pad; maxY += pad;
        // Compute scale: fit all points in canvas, keep aspect ratio (same scale for x and y)
        const scaleX = canvas.width / (maxX - minX || 1);
        const scaleY = canvas.height / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY);
        // Center offset (use same scale for both axes)
        const drawW = (maxX - minX) * scale;
        const drawH = (maxY - minY) * scale;
        const offsetX = (canvas.width - drawW) / 2 - minX * scale;
        const offsetY = (canvas.height - drawH) / 2 - minY * scale;

        // Draw black graph-paper grid: 1cm gap (in pixels)
        ctx.save();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 0.7;
        // 1cm in px (screen): 1cm = 37.795 px (approx)
        const cmPx = 37.795;
        // Draw vertical lines
        for (let x = 0; x <= canvas.width; x += cmPx) {
          ctx.beginPath();
          ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        // Draw horizontal lines
        for (let y = 0; y <= canvas.height; y += cmPx) {
          ctx.beginPath();
          ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
        ctx.restore();

        // Draw scale bar (bottom left)
        const scaleBarLenMeters = 50; // 50 meters
        const scaleBarPx = scaleBarLenMeters * scale;
        ctx.save();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(18, canvas.height - 18);
        ctx.lineTo(18 + scaleBarPx, canvas.height - 18);
        ctx.stroke();
        ctx.font = '16px Arial';
        ctx.fillStyle = '#222';
        ctx.textAlign = 'left';
        ctx.fillText(`${scaleBarLenMeters} m`, 18, canvas.height - 24);
        ctx.restore();

        // Draw lines between every pair (graph edges) with multiple colors (not black)
        const edgeColors = ['#e67e22', '#10b981', '#6366f1', '#f59e42', '#f43f5e', '#06b6d4', '#facc15', '#a21caf', '#0ea5e9', '#ef4444'];
        let colorIdx = 0;
        for (let i = 0; i < rels.length; i++) {
          for (let j = i + 1; j < rels.length; j++) {
            const a = rels[i], b = rels[j];
            const x1 = a.dx * scale + offsetX;
            const y1 = a.dy * scale + offsetY;
            const x2 = b.dx * scale + offsetX;
            const y2 = b.dy * scale + offsetY;
            ctx.save();
            ctx.strokeStyle = edgeColors[colorIdx % edgeColors.length];
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
            colorIdx++;
          }
        }

        // Draw all members (nodes)
        rels.forEach(({uid, name, dx, dy, color}) => {
          const x = dx * scale + offsetX;
          const y = dy * scale + offsetY;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, 2 * Math.PI);
          ctx.fill();
          // Draw name above dot
          ctx.font = '18px Arial';
          ctx.fillStyle = '#222';
          ctx.textAlign = 'center';
          ctx.fillText(name, x, y - 18);
        });
      });
    });
  });
}
// Render the full screen group map in the modal
function renderFullGroupMap(name) {
  db.ref('groups/' + name + '/members').once('value', snap => {
    const members = snap.val() || {};
    db.ref('locations').once('value', locSnap => {
      const locs = locSnap.val() || {};
      db.ref('users').once('value', userSnap => {
        const users = userSnap.val() || {};
        const mapDiv = document.getElementById('full-group-map');
        mapDiv.innerHTML = '';
        if (window.fullGroupMapInstance) {
          window.fullGroupMapInstance.remove();
        }
        const map = L.map('full-group-map').setView([0,0], 2);
        window.fullGroupMapInstance = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        Object.keys(members).forEach(uid => {
          const loc = locs[uid];
          if (loc) {
            let uname = users[uid]?.displayName;
            if (!uname && users[uid]?.email) {
              uname = users[uid].email.split('@')[0];
            }
            if (!uname) uname = uid;
            const labelIcon = L.divIcon({
              className: 'user-label',
              iconAnchor: [15, 50],
              html: `<div style=\"text-align:center; font-size:13px; font-weight:bold; color:#222; background:#fffbe8; border-radius:6px; padding:2px 6px; margin-bottom:2px; border:1px solid #e1c97a; display:inline-block;\">${uname}</div>`
            });
            L.marker([loc.lat, loc.lng], {icon: labelIcon, interactive: false, zIndexOffset: 1000}).addTo(map);
            L.marker([loc.lat, loc.lng], {zIndexOffset: 0}).addTo(map).bindPopup(uname);
          }
        });
        // Center on current user if possible
        const myLoc = locs[currentUser.uid];
        if (myLoc) map.setView([myLoc.lat, myLoc.lng], 18);
      });
    });
  });
}
  renderMemberList(name, group);
  renderGroupMap(name);
  renderGroupGraph(name);
}

function renderMemberList(name, group) {
  db.ref('groups/' + name + '/members').once('value', snap => {
    const members = snap.val() || {};
    let html = '<ul>';
    // Fetch usernames for all members
    const uids = Object.keys(members);
    db.ref('users').once('value', userSnap => {
      const users = userSnap.val() || {};
      uids.forEach(uid => {
        const uname = users[uid]?.displayName || users[uid]?.email || uid;
        html += `<li>${uname} ${group.ownerUid === currentUser.uid && uid !== currentUser.uid ? `<button  style="width: 150px;"  onclick=\"removeMember('${name}','${uid}')\">Remove</button>` : ''}</li>`;
      });
      html += '</ul>';
      document.getElementById('member-list').innerHTML = html;
    });
  });
}

function removeMember(name, uid) {
  db.ref('groups/' + name + '/members/' + uid).remove();
  renderMemberList(name, {});
}

function deleteGroup(name) {
  db.ref('groups/' + name).remove();
  showDashboard();
  loadGroups();
}

function refreshLocations(name) {
  renderGroupMap(name);
  renderGroupGraph(name);
}

function renderGroupMap(name) {
  db.ref('groups/' + name + '/members').once('value', snap => {
    const members = snap.val() || {};
    db.ref('locations').once('value', locSnap => {
      const locs = locSnap.val() || {};
      db.ref('users').once('value', userSnap => {
        const users = userSnap.val() || {};
        const mapDiv = document.getElementById('group-map');
        mapDiv.innerHTML = '';
        const map = L.map('group-map').setView([0,0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        Object.keys(members).forEach(uid => {
          const loc = locs[uid];
          if (loc) {
            let uname = users[uid]?.displayName;
            if (!uname && users[uid]?.email) {
              uname = users[uid].email.split('@')[0];
            }
            if (!uname) uname = uid;
            // Add label above pin (offset upwards)
            const labelIcon = L.divIcon({
              className: 'user-label',
              iconAnchor: [15, 50], // move label up
              html: `<div style=\"text-align:center; font-size:13px; font-weight:bold; color:#222; background:#fffbe8; border-radius:6px; padding:2px 6px; margin-bottom:2px; border:1px solid #e1c97a; display:inline-block;\">${uname}</div>`
            });
            L.marker([loc.lat, loc.lng], {icon: labelIcon, interactive: false, zIndexOffset: 1000}).addTo(map);
            // Add default pin marker
            L.marker([loc.lat, loc.lng], {zIndexOffset: 0}).addTo(map).bindPopup(uname);
          }
        });
        // Center on current user if possible
        const myLoc = locs[currentUser.uid];
        if (myLoc) map.setView([myLoc.lat, myLoc.lng], 18);
      });
    });
  });
}

function renderGroupGraph(name) {
  db.ref('groups/' + name + '/members').once('value', snap => {
    const members = snap.val() || {};
    db.ref('locations').once('value', locSnap => {
      const locs = locSnap.val() || {};
      db.ref('users').once('value', userSnap => {
        const users = userSnap.val() || {};
        const canvas = document.getElementById('group-graph');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Gather all member locations
        const memberUids = Object.keys(members).filter(uid => locs[uid]);
        if (memberUids.length === 0) return;
        const myLoc = locs[currentUser.uid] || locs[memberUids[0]];
        // Compute relative positions in meters
        const rels = memberUids.map(uid => {
          const loc = locs[uid];
          return {
            uid,
            name: users[uid]?.displayName || users[uid]?.email?.split('@')[0] || uid,
            dx: (loc.lng - myLoc.lng) * 100000 * 1.11,
            dy: (myLoc.lat - loc.lat) * 100000 * 1.11,
            color: uid === currentUser.uid ? '#3498db' : '#e67e22',
            loc
          };
        });
        // Find bounds
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        rels.forEach(({dx, dy}) => {
          if (dx < minX) minX = dx;
          if (dx > maxX) maxX = dx;
          if (dy < minY) minY = dy;
          if (dy > maxY) maxY = dy;
        });
        // Add some padding (meters)
        const pad = 30;
        minX -= pad; maxX += pad; minY -= pad; maxY += pad;
        // Compute scale: fit all points in canvas, keep aspect ratio (same scale for x and y)
        const scaleX = canvas.width / (maxX - minX || 1);
        const scaleY = canvas.height / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY);
        // Center offset (use same scale for both axes)
        const drawW = (maxX - minX) * scale;
        const drawH = (maxY - minY) * scale;
        const offsetX = (canvas.width - drawW) / 2 - minX * scale;
        const offsetY = (canvas.height - drawH) / 2 - minY * scale;

        // Draw black graph-paper grid: 1cm gap (in pixels)
        ctx.save();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 0.7;
        // 1cm in px (screen): 1cm = 37.795 px (approx)
        const cmPx = 37.795;
        // Draw vertical lines
        for (let x = 0; x <= canvas.width; x += cmPx) {
          ctx.beginPath();
          ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        // Draw horizontal lines
        for (let y = 0; y <= canvas.height; y += cmPx) {
          ctx.beginPath();
          ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
        ctx.restore();

        // Draw scale bar (bottom left)
        const scaleBarLenMeters = 50; // 50 meters
        const scaleBarPx = scaleBarLenMeters * scale;
        ctx.save();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(18, canvas.height - 18);
        ctx.lineTo(18 + scaleBarPx, canvas.height - 18);
        ctx.stroke();
        ctx.font = '12px Arial';
        ctx.fillStyle = '#222';
        ctx.textAlign = 'left';
        ctx.fillText(`${scaleBarLenMeters} m`, 18, canvas.height - 24);
        ctx.restore();

        // Draw lines between every pair (graph edges)
        for (let i = 0; i < rels.length; i++) {
          for (let j = i + 1; j < rels.length; j++) {
            const a = rels[i], b = rels[j];
            const x1 = a.dx * scale + offsetX;
            const y1 = a.dy * scale + offsetY;
            const x2 = b.dx * scale + offsetX;
            const y2 = b.dy * scale + offsetY;
            ctx.save();
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Draw all members (nodes)
        rels.forEach(({uid, name, dx, dy, color}) => {
          const x = dx * scale + offsetX;
          const y = dy * scale + offsetY;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fill();
          // Draw name above dot
          ctx.font = '12px Arial';
          ctx.fillStyle = '#222';
          ctx.textAlign = 'center';
          ctx.fillText(name, x, y - 12);
        });
      });
    });
  });
}


// Show distances below the button, using names
function calculateDistancesDisplay(name) {
  const resultsDiv = document.getElementById('distance-results');
  resultsDiv.textContent = 'Calculating...';
  db.ref('groups/' + name + '/members').once('value', snap => {
    const members = Object.keys(snap.val() || {});
    db.ref('locations').once('value', locSnap => {
      const locs = locSnap.val() || {};
      db.ref('users').once('value', userSnap => {
        const users = userSnap.val() || {};
        let msg = '';
        for (let i = 0; i < members.length; i++) {
          for (let j = i+1; j < members.length; j++) {
            const a = locs[members[i]], b = locs[members[j]];
            if (a && b) {
              const nameA = users[members[i]]?.displayName || users[members[i]]?.email?.split('@')[0] || members[i];
              const nameB = users[members[j]]?.displayName || users[members[j]]?.email?.split('@')[0] || members[j];
              const d = haversine(a.lat, a.lng, b.lat, b.lng);
              msg += `<div style='margin-bottom:4px;'>${nameA} ↔ ${nameB}: <b>${d.toFixed(2)} m</b></div>`;
            }
          }
        }
        resultsDiv.innerHTML = msg || '<span style="color:#888">No locations available.</span>';
      });
    });
  });
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2-lat1);
  const dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
