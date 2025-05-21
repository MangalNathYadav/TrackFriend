/**
 * Utility functions shared between ambulance and vehicle applications
 */

/**
 * Calculate the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1 (in degrees)
 * @param {number} lng1 - Longitude of point 1 (in degrees)
 * @param {number} lat2 - Latitude of point 2 (in degrees)
 * @param {number} lng2 - Longitude of point 2 (in degrees)
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    // Convert degrees to radians
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    // Earth's radius in kilometers
    const R = 6371;

    // Get coordinates in radians
    const radLat1 = toRadians(lat1);
    const radLng1 = toRadians(lng1);
    const radLat2 = toRadians(lat2);
    const radLng2 = toRadians(lng2);

    // Differences in coordinates
    const dLat = radLat2 - radLat1;
    const dLng = radLng2 - radLng1;

    // Haversine formula
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance;
}

/**
 * Determine direction from one point to another
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {string} - Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function getDirection(lat1, lng1, lat2, lng2) {
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;

    const angle = Math.atan2(dLat, dLng) * (180 / Math.PI);

    // Convert angle to 0-360 degrees
    const normalizedAngle = (angle + 360) % 360;

    // Convert angle to cardinal direction
    const directions = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE', 'E'];
    const index = Math.round(normalizedAngle / 45);

    return directions[index];
}

/**
 * Generate action recommendation based on relative positions
 * @param {number} distance - Distance in kilometers
 * @param {string} direction - Direction from vehicle to ambulance
 * @returns {string} - Recommended action
 */
function generateRecommendation(distance, direction) {
    if (distance > 5) {
        return "No action needed";
    }

    if (distance <= 0.2) { // Very close (200m)
        return "URGENT: Pull over immediately!";
    }

    // Based on direction, recommend appropriate action
    switch (direction) {
        case 'N':
        case 'NE':
        case 'NW':
            return "Ambulance approaching from behind - Move to the side";
        case 'S':
        case 'SE':
        case 'SW':
            return "Ambulance ahead - Maintain distance";
        case 'E':
            return "Ambulance approaching from right - Slow down";
        case 'W':
            return "Ambulance approaching from left - Slow down";
        default:
            return "Be alert: Ambulance nearby";
    }
}