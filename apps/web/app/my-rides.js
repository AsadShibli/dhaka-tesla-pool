"use client";

import { useEffect, useState } from "react";

// This passenger's rides only. The API does not return anyone else's fare.
export function MyRides() {
  const [rides, setRides] = useState(null);
  const [error, setError] = useState("");

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
          </li>
        ))}
      </ul>
    </section>
  );
}
