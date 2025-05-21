# TrackFriend - Ambulance Traffic Clearing System

A web-based solution to solve the problem of ambulances getting stuck in traffic through real-time communication between ambulances and nearby vehicles.

## Overview

This project consists of two web applications:

1. **Ambulance App**: Allows ambulance drivers to send emergency signals and share their location.
2. **Vehicle App**: Receives alerts from nearby ambulances and suggests optimal actions to clear the path.

## Features

- Real-time communication using Firebase Realtime Database
- Emergency toggle for ambulances
- Location tracking and distance calculation
- Actionable recommendations for vehicles (shift left, slow down, etc.)
- Simple and intuitive interface

## Technology Stack

- HTML, CSS, and Vanilla JavaScript 
- Firebase Realtime Database
- GPS location simulation

## Project Structure

```
TrackFriend/
├── README.md
├── firebase-config.js   # Firebase configuration
├── ambulance/           # Ambulance (sender) application
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── vehicle/             # Vehicle (receiver) application  
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── shared/              # Shared utilities
    └── utils.js         # Common functions like distance calculation
```

## Setup Instructions

1. Clone this repository
2. Set up a Firebase project and add your configuration to `firebase-config.js`
3. Open the ambulance app in one browser window and the vehicle app in others
4. Test the emergency system by activating an alert from the ambulance interface

## Database Schema

```json
{
  "ambulance": {
    "id": "AMB001",
    "status": "EMERGENCY",
    "lat": 28.123,
    "lng": 77.456,
    "timestamp": 17239812300
  },
  "vehicles": {
    "VEH001": {
      "lat": 28.121,
      "lng": 77.453
    }
  }
}
```

## Future Enhancements

- Integration with real GPS data
- Machine learning for optimal path recommendations
- Mobile app versions
- Support for multiple ambulances
- Traffic density analysis

## License

MIT License 