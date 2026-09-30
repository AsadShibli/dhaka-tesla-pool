import assert from "node:assert/strict";
import test from "node:test";
import { canShare } from "./match.js";

// Area centers from the areas table.
const mohakhali = { lat: 23.7786, lng: 90.3976 };
const gulshan = { lat: 23.7806, lng: 90.4167 };
const dhanmondi = { lat: 23.7465, lng: 90.3760 };

test("nusrat and rafiq can share: same pickup, drop-offs 1.96 km apart", () => {
  assert.equal(canShare({ pickupCode: "banani", destination: mohakhali }, { pickupCode: "banani", destination: gulshan }), true);
});

test("a drop-off 4 km away does not share", () => {
  assert.equal(canShare({ pickupCode: "banani", destination: mohakhali }, { pickupCode: "banani", destination: dhanmondi }), false);
});

test("a different pickup does not share even with the same destination", () => {
  assert.equal(canShare({ pickupCode: "banani", destination: mohakhali }, { pickupCode: "gulshan-1", destination: mohakhali }), false);
});
