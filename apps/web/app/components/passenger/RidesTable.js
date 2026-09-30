"use client";

import { useState } from "react";
import { Notice, Route, StatusBadge } from "../ui";
import { RideActions } from "./RideActions";
import { taka } from "../../lib/format";

// One passenger's rides. The fare is theirs only; a shared ride shows a head count, not names.
export function RidesTable({ rides, nameOf }) {
  const [error, setError] = useState("");
  return (
    <>
      <Notice>{error}</Notice>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Seats</th>
              <th>Sharing</th>
              <th>Status</th>
              <th>Your fare</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((ride) => (
              <tr key={ride.id}>
                <td>
                  <Route from={nameOf(ride.pickupCode)} to={nameOf(ride.destinationCode)} />
                  <small className="muted" style={{ display: "block", marginTop: 2 }}>{new Date(ride.createdAt).toLocaleString()}</small>
                </td>
                <td>{ride.seats}</td>
                <td>
                  {ride.status === "cancelled" ? <span className="muted">—</span> : ride.poolRiders > 1
                    ? <span className="badge badge-pool">Pooled · {ride.poolRiders} riders</span>
                    : <span className="muted">{ride.poolRiders === 1 ? "Solo so far" : "Not matched"}</span>}
                </td>
                <td><StatusBadge status={ride.status} /></td>
                <td className="money">{taka(ride.farePoisha)}</td>
                <td><RideActions ride={ride} onError={setError} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
