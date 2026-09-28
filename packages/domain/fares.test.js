import assert from "node:assert/strict";
import test from "node:test";
import { distanceMeters } from "./distance.js";
import { passengerFare } from "./fare.js";

// Neighborhood centers from the areas table. Fare is whole poisha.
const banani = { lat: 23.7937, lng: 90.4066 };
const gulshan = { lat: 23.7806, lng: 90.4167 };
const mohakhali = { lat: 23.7786, lng: 90.3976 };

function fare(from, to, pooled) {
  return passengerFare({ distanceMeters: distanceMeters(from, to), pooled });
}

// Nusrat is Banani to Mohakhali. Rafiq is Banani to Gulshan 1.
test("Nusrat and Rafiq fares", () => {
  assert.equal(fare(banani, mohakhali, false), 8750);
  assert.equal(fare(banani, mohakhali, true), 7437);
  assert.equal(fare(banani, gulshan, false), 8500);
  assert.equal(fare(banani, gulshan, true), 7225);
});
