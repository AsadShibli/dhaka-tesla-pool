"use client";

import { useState } from "react";
import { Icon } from "../Icons";
import { api, announceChange, errorText } from "../../lib/api";

// Cancel is allowed until the trip starts. Payment only after it completes, and only once.
const CANCELLABLE = new Set(["requested", "matched", "driver_arrived"]);

export function RideActions({ ride, onError }) {
  const [busy, setBusy] = useState("");

  async function run(kind, path, body) {
    setBusy(kind);
    onError("");
    const result = await api(path, { method: "POST", body });
    setBusy("");
    if (!result.ok) {
      onError(errorText(result, "That did not work"));
      return;
    }
    announceChange();
  }

  function cancel() {
    if (!window.confirm("Cancel this ride? Your seat goes back to Bullet.")) return;
    run("cancel", `/rides/${ride.id}/cancel`);
  }

  if (CANCELLABLE.has(ride.status)) {
    return (
      <button type="button" className="btn btn-light btn-sm" onClick={cancel} disabled={busy !== ""}>
        <Icon.X /> {busy === "cancel" ? "Cancelling…" : "Cancel"}
      </button>
    );
  }

  if (ride.status === "completed" && !ride.paidMethod) {
    return (
      <div className="row-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy !== ""}
          onClick={() => run("teslapay", `/rides/${ride.id}/pay`, { method: "teslapay" })}>
          <Icon.Wallet /> {busy === "teslapay" ? "Paying…" : "TeslaPay"}
        </button>
        <button type="button" className="btn btn-light btn-sm" disabled={busy !== ""}
          onClick={() => run("cash", `/rides/${ride.id}/pay`, { method: "cash" })}>
          <Icon.Cash /> {busy === "cash" ? "Saving…" : "Cash"}
        </button>
      </div>
    );
  }

  if (ride.paidMethod) {
    return <span className="badge badge-paid"><Icon.Check width="12" height="12" /> Paid by {ride.paidMethod === "teslapay" ? "TeslaPay" : "cash"}</span>;
  }
  return <span className="muted">—</span>;
}
