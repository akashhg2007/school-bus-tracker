export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in km

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate bearing between two coordinates
 * @returns bearing in degrees (0-360)
 */
export const calculateBearing = (coord1: Coordinates, coord2: Coordinates): number => {
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const y = Math.sin(dLon) * Math.cos(toRad(coord2.latitude));
  const x =
    Math.cos(toRad(coord1.latitude)) * Math.sin(toRad(coord2.latitude)) -
    Math.sin(toRad(coord1.latitude)) * Math.cos(toRad(coord2.latitude)) * Math.cos(dLon);

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
};

/**
 * Calculate estimated time of arrival
 * @param distance distance in km
 * @param speedKmh speed in km/h
 * @returns time in minutes
 */
export const calculateETA = (distance: number, speedKmh: number = 20): number => {
  if (speedKmh <= 0) return 0;
  return Math.round((distance / speedKmh) * 60);
};

/**
 * Find nearest stop from a list of stops
 */
export const findNearestStop = (
  currentLocation: Coordinates,
  stops: Array<{ id: string; latitude: number; longitude: number }>
): { id: string; distance: number } | null => {
  if (stops.length === 0) return null;

  let nearest = stops[0];
  let minDistance = calculateDistance(currentLocation, { latitude: nearest.latitude, longitude: nearest.longitude });

  for (let i = 1; i < stops.length; i++) {
    const distance = calculateDistance(currentLocation, {
      latitude: stops[i].latitude,
      longitude: stops[i].longitude,
    });

    if (distance < minDistance) {
      minDistance = distance;
      nearest = stops[i];
    }
  }

  return { id: nearest.id, distance: minDistance };
};

/**
 * Check if coordinates are within a certain radius (geofence)
 */
export const isWithinRadius = (
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
};

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

const toDeg = (rad: number): number => {
  return rad * (180 / Math.PI);
};
