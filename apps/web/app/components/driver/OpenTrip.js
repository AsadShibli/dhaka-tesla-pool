"use client";

import { useState } from "react";
import { Icon } from "../Icons";
import { Card, Empty, Lifecycle, Loading, Notice, Person, Route, Seats, StatusBadge } from "../ui";
import { api, announceChange, errorText } from "../../lib/api";
import { taka } from "../../lib/format";

// accepted -> driver_arrived -> started -> completed. The API refuses any other jump.
const NEXT = {
  accepted: { path: "arrive", label: "Mark arrived at pickup", icon: Icon.Pin, className: "btn-primary" },
  driver_arrived: { path: "start", label: "Start trip", icon: Icon.Bolt, className: "btn-success" },
  started: { path: "complete", label: "Complete trip", icon: Icon.Flag, className: "btn-dark" },
};

export function OpenTrip({ pool, loading, error: loadError, nameOf }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function advance() {
    const step = NEXT[pool.status];
    setBusy(true);
    setError("");
    const result = await api(`/pools/${pool.id}/${step.path}`, { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result, "Could not update the trip"));
      return;
    }
    announceChange();
  }

  if (loading) return <Card title="Open trip"><Loading rows={4} /></Card>;

  if (!pool) {
    return (
      <Card title="Open trip" subtitle="Who is in Bullet and what happens next">
        <Notice>{loadError}</Notice>
        <Empty icon={Icon.Car} title="No open trip">Accept a waiting ride below to start one.</Empty>
      </Card>
    );
  }

  const step = NEXT[pool.status];
  const riders = pool.riders ?? [];
  const total = riders.reduce((sum, rider) => sum + rider.farePoisha, 0);

  return (
    <Card
      title="Open trip"
      subtitle={pool.status === "accepted" ? "More riders can still join if they fit." : "Seats are locked once you reach the pickup."}
      action={<StatusBadge status={pool.status} />}
    >
      <Lifecycle status={pool.status} />
      <Notice>{loadError || error}</Notice>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>{pool.seatsTaken} of {pool.capacity} seats taken</p>
          <Seats taken={pool.seatsTaken} capacity={pool.capacity} />
        </div>
        {step ? (
          <button type="button" className={`btn ${step.className}`} onClick={advance} disabled={busy}>
            <step.icon /> {busy ? "Saving…" : step.label}
          </button>
        ) : null}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Rider</th><th>Route</th><th>Seats</th><th>Fare</th></tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={`${rider.name}-${rider.destinationCode}`}>
                <td><Person name={rider.name} detail={riders.length > 1 ? "Shared ride" : "Solo so far"} /></td>
                <td><Route from={nameOf(rider.pickupCode)} to={nameOf(rider.destinationCode)} /></td>
                <td>{rider.seats}</td>
                <td className="money">{taka(rider.farePoisha)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>Trip total</td>
              <td className="money">{taka(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
