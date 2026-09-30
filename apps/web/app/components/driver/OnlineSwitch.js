"use client";

import { useState } from "react";
import { Icon } from "../Icons";
import { useToast } from "../Toaster";
import { Card, Loading, Notice } from "../ui";
import { api, announceChange, errorText } from "../../lib/api";

// Offline Bullet gets no new rides. A trip already on the road can still be finished.
export function OnlineSwitch({ vehicle, loading, error: loadError, reload }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useToast();

  async function flip() {
    setBusy(true);
    setError("");
    const result = await api("/vehicles/online", { method: "POST", body: { online: !vehicle.isOnline } });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result, "Could not change status"));
      return;
    }
    reload();
    announceChange();
    if (!result.body.isOnline) {
      notify({ tone: "dark", icon: "Power", title: "You're offline", detail: "New requests are hidden. A trip on the road can still be finished." });
      return;
    }
    const waiting = await api("/rides/waiting");
    const count = waiting.ok ? waiting.body.length : 0;
    notify({
      tone: "green",
      icon: "Power",
      title: "You're online",
      detail: count ? `${count} rider${count === 1 ? " is" : "s are"} waiting. Accept the ones that fit.` : "No one is waiting yet. New requests will pop up here.",
    });
  }

  return (
    <Card title={vehicle?.name ?? "Your Tesla"} subtitle="Three seats, battery powered">
      <Notice>{loadError || error}</Notice>
      {loading ? <Loading rows={2} /> : vehicle ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <span className={`stat-icon ${vehicle.isOnline ? "tone-green" : "tone-dark"}`} style={{ width: 56, height: 56 }}>
              <Icon.Power />
            </span>
            <div>
              <strong style={{ fontSize: "1.15rem", fontWeight: 500 }}>{vehicle.isOnline ? "Online" : "Offline"}</strong>
              <p className="muted" style={{ fontSize: "0.88rem" }}>
                {vehicle.isOnline ? "New requests can be accepted." : "Go online to accept new requests."}
              </p>
            </div>
          </div>
          <button type="button" className={`btn btn-block ${vehicle.isOnline ? "btn-dark" : "btn-success"}`} onClick={flip} disabled={busy}>
            <Icon.Power /> {busy ? "Updating…" : vehicle.isOnline ? "Go offline" : "Go online"}
          </button>
        </>
      ) : null}
    </Card>
  );
}
