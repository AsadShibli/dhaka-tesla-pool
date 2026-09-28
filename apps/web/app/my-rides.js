"use client";

import { useEffect, useState } from "react";

// Cancel stays available until the driver starts the trip.
const canCancel = new Set(["requested", "matched", "driver_arrived"]);

// This passenger's rides only. The API does not return anyone else's fare.
export function MyRides() {
  const [rides, setRides] = useState(null);
  const [error, setError] = useState("");

  const [paid, setPaid] = useState({});

  async function load() {
    const response = await fetch("/api/rides/mine", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setRides([]);
      setError(body.error || "Could not load rides");
      return;
    }
    setError("");
    setRides(body);
  }

  async function cancel(id) {
    const response = await fetch(`/api/rides/${id}/cancel`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not cancel");
      return;
    }
    window.dispatchEvent(new Event("rides-changed"));
  }

  // Cash leaves the wallet alone. TeslaPay debits this passenger only.
  async function pay(id, method) {
    const response = await fetch(`/api/rides/${id}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not pay");
      return;
    }
    setPaid((current) => ({ ...current, [id]: method }));
    setError("");
  }

  useEffect(() => {
    load();
    window.addEventListener("rides-changed", load);
    return () => window.removeEventListener("rides-changed", load);
  }, []);

  if (rides === null) return <p>Loading rides.</p>;

  return (
    <section>
      <h2>Your rides</h2>
      {error ? <p>{error}</p> : null}
      {!error && rides.length === 0 ? <p>No rides yet.</p> : null}
      <ul>
        {rides.map((ride) => (
          <li key={ride.id}>
            {ride.pickupCode} to {ride.destinationCode}: {ride.status}, {ride.farePoisha} poisha
            {canCancel.has(ride.status) ? (
              <button type="button" onClick={() => cancel(ride.id)}>Cancel</button>
            ) : null}
            {ride.status === "completed" && !paid[ride.id] ? (
              <>
                <button type="button" onClick={() => pay(ride.id, "cash")}>Cash</button>
                <button type="button" onClick={() => pay(ride.id, "teslapay")}>TeslaPay</button>
              </>
            ) : null}
            {paid[ride.id] ? <span> Paid with {paid[ride.id]}.</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
