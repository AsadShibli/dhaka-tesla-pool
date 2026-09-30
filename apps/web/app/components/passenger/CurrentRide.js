"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../Icons";
import { Card, Empty, Lifecycle, Notice, Route, StatusBadge } from "../ui";
import { RideActions } from "./RideActions";
import { taka } from "../../lib/format";

const HINT = {
  requested: "Waiting for Jashim to accept. A rider going near your drop-off may share Bullet with you.",
  matched: "You have a seat in Bullet. Jashim is on the way to the pickup.",
  driver_arrived: "Bullet is at the pickup. You can still cancel until the trip starts.",
  started: "On the road. Cancelling is closed now.",
  dropped_off: "You're at your drop-off. Pay your fare so Jashim can close the trip.",
  completed: "Trip complete. Thanks for riding Bullet.",
};
const PAID_HINT = "Paid, thank you. Jashim closes the trip once every rider has paid.";

// The newest ride that still needs something: a seat, the trip, or payment.
export function CurrentRide({ ride, nameOf }) {
  const [error, setError] = useState("");

  if (!ride) {
    return (
      <Card title="Current ride" subtitle="Track it from request to drop-off">
        <Empty icon={Icon.Car} title="No ride in progress">
          <p style={{ marginBottom: 14 }}>Book a seat and it will show up here.</p>
          <Link href="/book" className="btn btn-primary"><Icon.Plus /> Book a ride</Link>
        </Empty>
      </Card>
    );
  }

  return (
    <Card
      title="Current ride"
      subtitle={ride.status === "dropped_off" && ride.paidMethod ? PAID_HINT : HINT[ride.status]}
      action={<StatusBadge status={ride.status} />}
    >
      <Lifecycle status={ride.status} />
      <Notice>{error}</Notice>
      <div className="quote">
        <div>
          <span>Route</span>
          <strong style={{ fontSize: "1.05rem" }}><Route from={nameOf(ride.pickupCode)} to={nameOf(ride.destinationCode)} /></strong>
        </div>
        <div>
          <span>Seats · sharing</span>
          <strong>{ride.seats} · {ride.poolRiders > 1 ? `${ride.poolRiders} riders` : "just you"}</strong>
        </div>
        <div>
          <span>Your fare</span>
          <strong className={ride.poolRiders > 1 ? "good" : ""}>{taka(ride.farePoisha)}</strong>
        </div>
      </div>
      <RideActions ride={ride} onError={setError} />
    </Card>
  );
}
