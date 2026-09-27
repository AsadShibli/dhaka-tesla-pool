import { distanceMeters } from "./distance.js";

// After the first drop-off, the second one must be at most this far.
export const MAX_DROP_GAP_METERS = 2000;

// Same pickup, and the hop between the two destinations is within the limit.
export function canShare(one, other) {
  if (one.pickupCode !== other.pickupCode) return false;
  const gap = distanceMeters(one.destination, other.destination);
  return gap <= MAX_DROP_GAP_METERS;
}
