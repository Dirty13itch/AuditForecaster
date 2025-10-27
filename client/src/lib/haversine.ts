export interface Coordinates {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const lat1Rad = toRadians(coord1.lat);
  const lat2Rad = toRadians(coord2.lat);
  const deltaLat = toRadians(coord2.lat - coord1.lat);
  const deltaLon = toRadians(coord2.lon - coord1.lon);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function calculateTotalDistance(points: Coordinates[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistance(points[i - 1], points[i]);
  }

  return totalDistance;
}

export function calculateAverageSpeed(
  distanceMeters: number,
  durationSeconds: number
): number {
  if (durationSeconds === 0) return 0;
  return distanceMeters / durationSeconds;
}

export function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

export function milesToMeters(miles: number): number {
  return miles / 0.000621371;
}

export function metersPerSecondToMph(mps: number): number {
  return mps * 2.23694;
}
