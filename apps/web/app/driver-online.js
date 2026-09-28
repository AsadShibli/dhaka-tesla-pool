"use client";

import { useEffect, useState } from "react";

// Shown only for a driver. Passengers get no Tesla row.
export function DriverOnline() {
  const [vehicle, setVehicle] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/vehicles/online", { cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      setHidden(true);
      setVehicle(null);
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not load the Tesla");
      return;
    }
    setHidden(false);
    setError("");
    setVehicle(body);
  }

  async function setOnline(online) {
    const response = await fetch("/api/vehicles/online", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ online }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not update");
      return;
    }
    setError("");
    setVehicle(body);
  }

  useEffect(() => {
    load();
    window.addEventListener("signed-in", load);
    return () => window.removeEventListener("signed-in", load);
  }, []);

  if (hidden) return null;
  if (!vehicle) return <p>Loading the Tesla.</p>;

  return (
    <section>
      <h2>{vehicle.name}</h2>
      <p>{vehicle.isOnline ? "Online" : "Offline"}</p>
      <button type="button" onClick={() => setOnline(true)}>Go online</button>
      <button type="button" onClick={() => setOnline(false)}>Go offline</button>
      {error ? <p>{error}</p> : null}
    </section>
  );
}
