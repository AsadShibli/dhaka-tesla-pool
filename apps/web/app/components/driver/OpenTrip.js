"use client";

import { useState } from "react";
import { Icon } from "../Icons";
import { useCelebrate } from "../Toaster";
import { Card, Empty, Lifecycle, Loading, Notice, Person, Route, Seats, StatusBadge } from "../ui";
import { api, announceChange, errorText } from "../../lib/api";
import { taka } from "../../lib/format";

// accepted -> driver_arrived -> started -> dropped_off -> completed. The API refuses any other jump,
// and refuses to complete while any rider still owes their fare.
const NEXT = {
  accepted: { path: "arrive", label: "Mark arrived at pickup", icon: Icon.Pin, className: "btn-primary" },
  driver_arrived: { path: "start", label: "Start trip", icon: Icon.Bolt, className: "btn-success" },
  started: { path: "drop-off", label: "Drop off riders", icon: Icon.Flag, className: "btn-dark" },
  dropped_off: { path: "complete", label: "Complete trip", icon: Icon.CheckCircle, className: "btn-success" },
};

const SUBTITLE = {
  accepted: "More riders can still join if they fit.",
  driver_arrived: "Seats are locked once you reach the pickup.",
  started: "On the road. Drop riders off at their stops.",
  dropped_off: "Riders are out. Collect every fare, then complete the trip.",
};

function PaymentBadge({ rider, status }) {
  if (rider.paidMethod) {
    return <span className="badge badge-paid"><Icon.Check width="12" height="12" /> {rider.paidMethod === "teslapay" ? "TeslaPay" : "Cash"}</span>;
  }
  if (status === "dropped_off") return <span className="badge badge-unpaid">Unpaid</span>;
  return <span className="muted">After drop-off</span>;
}

export function OpenTrip({ pool, loading, error: loadError, nameOf }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const celebrate = useCelebrate();

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
    if (step.path === "complete") {
      celebrate({
        title: "Trip completed",
        subtitle: "Every fare is in. Bullet is free for the next ride.",
        rows: [
          ["Riders", String(result.body.riders)],
          ["Fares collected", taka(result.body.collectedPoisha)],
        ],
        action: "Back to the dashboard",
      });
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
  const unpaid = riders.filter((rider) => !rider.paidMethod);
  const blocked = pool.status === "dropped_off" && unpaid.length > 0;
  const collected = riders.filter((rider) => rider.paidMethod).reduce((sum, rider) => sum + rider.farePoisha, 0);

  return (
    <Card title="Open trip" subtitle={SUBTITLE[pool.status]} action={<StatusBadge status={pool.status} />}>
      <Lifecycle status={pool.status} />
      <Notice>{loadError || error}</Notice>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>{pool.seatsTaken} of {pool.capacity} seats taken</p>
          <Seats taken={pool.seatsTaken} capacity={pool.capacity} />
        </div>
        {step ? (
          <div style={{ textAlign: "right" }}>
            <button type="button" className={`btn ${blocked ? "btn-light" : step.className}`} onClick={advance} disabled={busy || blocked}>
              <step.icon /> {busy ? "Saving…" : blocked ? `Waiting for ${unpaid.map((rider) => rider.name).join(" and ")} to pay` : step.label}
            </button>
            {pool.status === "dropped_off" ? (
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>
                {riders.length - unpaid.length} of {riders.length} paid · {taka(collected)} of {taka(total)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Rider</th><th>Route</th><th>Seats</th><th>Fare</th><th>Payment</th></tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={`${rider.name}-${rider.destinationCode}`}>
                <td><Person name={rider.name} detail={riders.length > 1 ? "Shared ride" : "Solo so far"} /></td>
                <td><Route from={nameOf(rider.pickupCode)} to={nameOf(rider.destinationCode)} /></td>
                <td>{rider.seats}</td>
                <td className="money">{taka(rider.farePoisha)}</td>
                <td><PaymentBadge rider={rider} status={pool.status} /></td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>Trip total</td>
              <td className="money">{taka(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
