/**
 * Distance and drive time calculator for route planning
 * Uses Haversine formula for accurate distance calculation between coordinates
 */

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate estimated drive time based on distance
 * Uses conservative field estimate: 2 minutes per mile
 * @param distanceMiles Distance in miles
 * @returns Drive time in minutes
 */
export function calculateDriveTime(distanceMiles: number): number {
  return Math.ceil(distanceMiles * 2); // 2 minutes per mile, rounded up
}

/**
 * Format distance for display
 * @param miles Distance in miles
 * @returns Formatted string (e.g., "12.5 mi")
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return "< 0.1 mi";
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format drive time for display
 * @param minutes Drive time in minutes
 * @returns Formatted string (e.g., "1h 15m" or "25 min")
 */
export function formatDriveTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Check if coordinates are valid
 */
export function hasValidCoordinates(lat?: number | null, lon?: number | null): boolean {
  return lat !== null && lat !== undefined && lon !== null && lon !== undefined &&
         lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}
