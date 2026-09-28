"use client";

import { useEffect, useState } from "react";

// Arrival, then start, then complete. Each button matches one status.
export function OpenTrip() {
  const [pool, setPool] = useState(undefined);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/pools/open", { cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      setHidden(true);
      setPool(null);
      return;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error || "Could not load the trip");
      return;
    }
    setHidden(false);
    setError("");
    setPool(body);
  }

  async function arrive() {
    const response = await fetch(`/api/pools/${pool.id}/arrive`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not mark arrival");
      return;
    }
    setError("");
    load();
  }

  async function start() {
    const response = await fetch(`/api/pools/${pool.id}/start`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not start the trip");
      return;
    }
    setError("");
    load();
  }

  async function complete() {
    const response = await fetch(`/api/pools/${pool.id}/complete`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not complete the trip");
      return;
    }
    setError("");
    load();
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
  if (pool === undefined) return <p>Loading the trip.</p>;
  if (!pool) return <p>No open trip.</p>;

  return (
    <section>
      <h2>Open trip</h2>
      <p>{pool.status}, {pool.seatsTaken} of {pool.capacity} seats</p>
      {pool.status === "accepted" ? (
        <button type="button" onClick={arrive}>Mark arrived</button>
      ) : null}
      {pool.status === "driver_arrived" ? (
        <button type="button" onClick={start}>Start trip</button>
      ) : null}
      {pool.status === "started" ? (
        <button type="button" onClick={complete}>Complete trip</button>
      ) : null}
      {error ? <p>{error}</p> : null}
    </section>
  );
}
