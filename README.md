# TrackFriend – Island Locator
<div align="center">
  <a href="https://shipwrecked.hackclub.com/?t=ghrm" target="_blank">
    <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png" 
         alt="This project is part of Shipwrecked, the world's first hackathon on an island!" 
         style="width: 35%;">
  </a>
</div>
## Setup Instructions

## Overview

TrackFriend is a web application that helps users track and manage groups of friends, view their locations on a map, and visualize group data. The app is mobile-friendly and features a modern, responsive UI.

## Features
- Group detail view with map and graph visualizations
- Member list management (add/remove members)
- Full-screen map modal for detailed location viewing
- Responsive design for both desktop and mobile devices
- Styled with custom CSS for a clean, modern look

## File Structure
- `index.html` - Main HTML file for the app
- `script.js` - JavaScript logic for interactivity and data handling
- `group.css` - Main stylesheet for group and modal UI
- `firebase.rules.json` - Firebase security rules (if using Firebase backend)
- `README.md` - This documentation file

## Customization
- Update the CSS in `group.css` to change the look and feel.
- Modify `script.js` to connect to your backend or add new features.

## License
This project is for educational and demonstration purposes. Please check with the repository owner for licensing details.
1. **Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/), create a new project.
   - Enable **Authentication** (Google + Email/Password).
   - Create a **Realtime Database** (in test mode, then apply `firebase.rules.json`).
   - Add a web app, copy your config to `script.js`.

2. **Local Development**
   - Place your Firebase config in `script.js`.
   - Run a local server (e.g., `npx serve` or VS Code Live Server).

3. **Deployment**
   - Deploy to Firebase Hosting, Netlify, or any static host.
   - Ensure HTTPS for geolocation and auth.

4. **Security Rules**
   - Copy `firebase.rules.json` to the Firebase Console > Database > Rules.

5. **Demo Video**
   - Show login, group creation/join, real-time map, owner actions.

---

## Firebase Database Structure

```
/users/{uid} → { displayName, email, photoURL, lastSeen }
/locations/{uid} → { lat, lng, timestamp }
/groups/{groupName} → { ownerUid, privateKeyHash, createdAt, members: { [uid]: true } }
```
