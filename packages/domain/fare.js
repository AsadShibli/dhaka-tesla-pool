// 1 BDT = 100 poisha. These stay fixed so a fare can be checked by hand.
export const BASE_POISHA = 4000;
export const POISHA_PER_100M = 250;
export const POOL_PERCENT = 15;

// Half-up, using integers only. 1275.5 poisha becomes 1276.
function percentOf(amount, percent) {
  return Math.floor((amount * percent + 50) / 100);
}

// fare = base + distanceCharge - poolDiscount. Solo riders get no discount.
export function passengerFare({ distanceMeters, pooled }) {
  const billedMeters = Math.round(distanceMeters / 100) * 100;
  const distanceCharge = (billedMeters / 100) * POISHA_PER_100M;
  const subtotal = BASE_POISHA + distanceCharge;
  const poolDiscount = pooled ? percentOf(subtotal, POOL_PERCENT) : 0;
  return subtotal - poolDiscount;
}
