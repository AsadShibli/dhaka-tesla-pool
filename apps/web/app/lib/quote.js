import { distanceMeters } from "domain/distance.js";
import { passengerFare } from "domain/fare.js";
import { canShare } from "domain/match.js";

// Same functions the API uses, so the estimate on screen matches what Express charges.
export function quote(byCode, fromCode, toCode) {
  const from = byCode[fromCode];
  const to = byCode[toCode];
  if (!from || !to || fromCode === toCode) return null;
  const meters = distanceMeters(from, to);
  return {
    meters,
    solo: passengerFare({ distanceMeters: meters, pooled: false }),
    pooled: passengerFare({ distanceMeters: meters, pooled: true }),
  };
}

// True when two rides may share one Tesla: same pickup, drop-offs within 2 km.
export function sharesWith(byCode, one, other) {
  const a = byCode[one.destinationCode];
  const b = byCode[other.destinationCode];
  if (!a || !b) return false;
  return canShare(
    { pickupCode: one.pickupCode, destination: a },
    { pickupCode: other.pickupCode, destination: b },
  );
}

export function dropGapMeters(byCode, one, other) {
  const a = byCode[one.destinationCode];
  const b = byCode[other.destinationCode];
  return a && b ? distanceMeters(a, b) : null;
}
