const EARTH_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Straight-line meters between two area centers. Rounded to the nearest meter.
export function distanceMeters(from, to) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLat = lat2 - lat1;
  const dLng = toRadians(to.lng - from.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_METERS * Math.asin(Math.sqrt(h)));
}
