"use client";

import Link from "next/link";
import { Icon } from "../Icons";
import { Feed } from "../Feed";
import { useSession } from "../Session";
import { Card, Empty, Loading, Notice, StatCard } from "../ui";
import { CurrentRide } from "./CurrentRide";
import { RidesTable } from "./RidesTable";
import { taka } from "../../lib/format";
import { quote } from "../../lib/quote";
import { useAreas } from "../../lib/useAreas";
import { usePoll } from "../../lib/usePoll";

const OPEN = new Set(["requested", "matched", "driver_arrived", "started", "dropped_off"]);

// Still needs attention: on the road, waiting for payment, or an older trip completed before paying.
function needsAttention(ride) {
  return OPEN.has(ride.status) || (ride.status === "completed" && !ride.paidMethod);
}

export function PassengerDashboard() {
  const { user } = useSession();
  const { byCode, nameOf } = useAreas();
  const { data: rides, error, loading } = usePoll("/rides/mine", 3000);

  const list = rides ?? [];
  const active = list.filter(needsAttention);
  const completed = list.filter((ride) => ride.status === "completed");
  const saved = completed.reduce((sum, ride) => {
    const fare = quote(byCode, ride.pickupCode, ride.destinationCode);
    return fare && ride.farePoisha < fare.solo ? sum + (fare.solo - ride.farePoisha) : sum;
  }, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hello, {user.name}</h1>
          <p>Your rides, your fare, your status. Nobody else&apos;s.</p>
        </div>
        <Link href="/book" className="btn btn-primary"><Icon.Plus /> Book a ride</Link>
      </div>

      <div className="stats">
        <StatCard icon={Icon.Wallet} tone="teal" value={taka(user.balancePoisha)} label="TeslaPay balance" />
        <StatCard icon={Icon.Car} tone="red" value={loading ? "…" : active.length} label="Open rides" />
        <StatCard icon={Icon.Flag} tone="orange" value={loading ? "…" : completed.length} label="Completed trips" />
        <StatCard icon={Icon.Tag} tone="blue" value={taka(saved)} label="Saved by sharing" />
      </div>

      <div className="grid-2-1">
        {loading ? <Card title="Current ride"><Loading rows={4} /></Card> : <CurrentRide ride={active[0]} nameOf={nameOf} />}
        <Feed />
      </div>

      <Card title="Open rides" subtitle="Cancel before the trip starts. Pay once you are dropped off.">
        <Notice>{error}</Notice>
        {loading ? <Loading rows={3} /> : active.length === 0 ? (
          <Empty title="No open rides">Finished trips are in your ride history.</Empty>
        ) : (
          <RidesTable rides={active} nameOf={nameOf} />
        )}
      </Card>
    </>
  );
}
