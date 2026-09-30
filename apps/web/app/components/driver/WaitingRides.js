"use client";

import { useState } from "react";
import { Icon } from "../Icons";
import { Card, Empty, Loading, Notice, Person, Route } from "../ui";
import { api, announceChange, errorText } from "../../lib/api";
import { kilometers, taka } from "../../lib/format";
import { dropGapMeters, sharesWith } from "../../lib/quote";

// Why a ride can or cannot join Bullet right now. The API checks the same rules again on accept.
function fitFor(ride, { vehicle, pool, byCode }) {
  if (!vehicle?.isOnline) return { ok: false, text: "Go online first" };
  if (!pool) return { ok: ride.seats <= (vehicle.capacity ?? 3), text: "Starts a new trip" };
  if (pool.status !== "accepted") return { ok: false, text: "Finish the current trip first" };
  const free = pool.capacity - pool.seatsTaken;
  if (ride.seats > free) return { ok: false, text: `Needs ${ride.seats}, ${free} free` };
  const riders = pool.riders ?? [];
  const clash = riders.find((rider) => !sharesWith(byCode, ride, rider));
  if (clash) {
    if (clash.pickupCode !== ride.pickupCode) return { ok: false, text: `Pickup differs from ${clash.name}` };
    return { ok: false, text: `${kilometers(dropGapMeters(byCode, ride, clash))} from ${clash.name}'s drop-off` };
  }
  const near = riders[0];
  return { ok: true, pooled: true, text: near ? `Shares with ${near.name} · ${kilometers(dropGapMeters(byCode, ride, near))} apart` : "Fits" };
}

export function WaitingRides({ rides, loading, error: loadError, vehicle, pool, byCode, nameOf }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function accept(id) {
    setBusy(id);
    setError("");
    const result = await api(`/rides/${id}/accept`, { method: "POST", body: {} });
    setBusy("");
    if (!result.ok) {
      setError(errorText(result, "Could not accept the ride"));
    }
    announceChange();
  }

  return (
    <Card title="Waiting rides" subtitle="Requests nobody has accepted yet. Shared riders need the same pickup and drop-offs within 2 km.">
      <Notice>{loadError || error}</Notice>
      {loading ? <Loading rows={3} /> : !rides?.length ? (
        <Empty icon={Icon.Users} title="No one is waiting">New requests from Nusrat, Rafiq, or Shirin appear here within a few seconds.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Passenger</th><th>Route</th><th>Seats</th><th>Solo fare</th><th>Fit</th><th /></tr>
            </thead>
            <tbody>
              {rides.map((ride) => {
                const fit = fitFor(ride, { vehicle, pool, byCode });
                return (
                  <tr key={ride.id}>
                    <td><Person name={ride.passengerName} /></td>
                    <td><Route from={nameOf(ride.pickupCode)} to={nameOf(ride.destinationCode)} /></td>
                    <td>{ride.seats}</td>
                    <td className="money">{taka(ride.farePoisha)}</td>
                    <td>
                      <span className={`badge ${fit.ok ? (fit.pooled ? "badge-pool" : "badge-completed") : "badge-offline"}`}>{fit.text}</span>
                    </td>
                    <td>
                      <button type="button" className={`btn btn-sm ${fit.ok ? "btn-primary" : "btn-light"}`}
                        onClick={() => accept(ride.id)} disabled={busy !== ""}
                        title={fit.ok ? "Accept this ride" : "The API will check this and explain why it does not fit"}>
                        <Icon.Check /> {busy === ride.id ? "Accepting…" : "Accept"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
