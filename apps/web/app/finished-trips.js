"use client";

import { useEffect, useState } from "react";

// Finished pools for this driver. A passenger already sees their own rides elsewhere.
export function FinishedTrips() {
  const [trips, setTrips] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const who = await fetch("/api/vehicles/online", { cache: "no-store" });
    if (who.status === 401 || who.status === 403) {
      setHidden(true);
      setTrips([]);
      return;
    }
    const response = await fetch("/api/rides/history", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not load finished trips");
      return;
    }
    setHidden(false);
    setError("");
    setTrips(body);
  }

  useEffect(() => {
    load();
    window.addEventListener("signed-in", load);
    window.addEventListener("trip-changed", load);
    return () => {
      window.removeEventListener("signed-in", load);
      window.removeEventListener("trip-changed", load);
    };
  }, []);

  if (hidden) return null;
  if (!trips) return <p>Loading finished trips.</p>;

  return (
    <section>
      <h2>Finished trips</h2>
      {error ? <p>{error}</p> : null}
      {trips.length === 0 ? <p>No finished trips.</p> : null}
      <ul>
        {trips.map((trip) => (
          <li key={trip.id}>
            {trip.status}, {trip.seatsTaken} of {trip.capacity} seats
          </li>
        ))}
      </ul>
    </section>
  );
}
