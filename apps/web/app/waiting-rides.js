"use client";

import { useEffect, useState } from "react";

// Waiting requests a driver can accept. A second rider joins only if the drop-off is close.
export function WaitingRides() {
  const [rides, setRides] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/rides/waiting", { cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      setHidden(true);
      setRides([]);
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not load waiting rides");
      return;
    }
    setHidden(false);
    setError("");
    setRides(body);
  }

  async function accept(id) {
    const response = await fetch(`/api/rides/${id}/accept`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not accept");
      return;
    }
    setError("");
    window.dispatchEvent(new Event("trip-changed"));
    load();
  }

  useEffect(() => {
    load();
    window.addEventListener("signed-in", load);
    return () => window.removeEventListener("signed-in", load);
  }, []);

  if (hidden) return null;
  if (!rides) return <p>Loading waiting rides.</p>;

  return (
    <section>
      <h2>Waiting rides</h2>
      {error ? <p>{error}</p> : null}
      {rides.length === 0 ? <p>No rides waiting.</p> : null}
      <ul>
        {rides.map((ride) => (
          <li key={ride.id}>
            {ride.passengerName}: {ride.pickupCode} to {ride.destinationCode}, {ride.seats} seats, {ride.farePoisha} poisha
            <button type="button" onClick={() => accept(ride.id)}>Accept</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
