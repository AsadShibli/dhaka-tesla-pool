"use client";

import { useState } from "react";

// Same neighborhood list as the areas table. The fare is still calculated by the API.
const areas = [
  ["banani", "Banani"],
  ["gulshan-1", "Gulshan 1"],
  ["mohakhali", "Mohakhali"],
  ["dhanmondi", "Dhanmondi"],
  ["mirpur", "Mirpur"],
  ["uttara", "Uttara"],
  ["farmgate", "Farmgate"],
  ["bashundhara", "Bashundhara"],
];

export function RequestRide() {
  const [error, setError] = useState("");
  const [ride, setRide] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/rides", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pickupCode: form.get("pickupCode"),
        destinationCode: form.get("destinationCode"),
        seats: Number(form.get("seats")),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not request a ride");
      return;
    }
    setRide(body);
    window.dispatchEvent(new Event("rides-changed"));
  }

  if (ride) {
    const taka = (ride.farePoisha / 100).toFixed(2);
    return (
      <p>
        Requested {ride.pickupCode} to {ride.destinationCode}. Fare {ride.farePoisha} poisha ({taka} BDT).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>Request a ride</h2>
      <label>
        Pickup
        <select name="pickupCode" required defaultValue="">
          <option value="" disabled>Choose</option>
          {areas.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <label>
        Destination
        <select name="destinationCode" required defaultValue="">
          <option value="" disabled>Choose</option>
          {areas.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <label>
        Seats <input name="seats" type="number" min="1" required defaultValue="1" />
      </label>
      <button type="submit">Request</button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
