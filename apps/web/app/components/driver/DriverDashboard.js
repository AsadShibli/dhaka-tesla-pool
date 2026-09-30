"use client";

import { Icon } from "../Icons";
import { Feed } from "../Feed";
import { useSession } from "../Session";
import { StatCard } from "../ui";
import { OnlineSwitch } from "./OnlineSwitch";
import { OpenTrip } from "./OpenTrip";
import { WaitingRides } from "./WaitingRides";
import { taka } from "../../lib/format";
import { useAreas } from "../../lib/useAreas";
import { usePoll } from "../../lib/usePoll";

// Jashim's cockpit: is Bullet online, who is in it, and who is waiting.
export function DriverDashboard() {
  const { user } = useSession();
  const { byCode, nameOf } = useAreas();
  const vehicle = usePoll("/vehicles/online", 5000);
  const pool = usePoll("/pools/open", 3000);
  const online = vehicle.data?.isOnline === true;
  // Offline Bullet takes no riders, so it does not ask who is waiting.
  const waiting = usePoll(online ? "/rides/waiting" : null, 3000);
  const history = usePoll("/rides/history", 10000);

  const trips = (history.data ?? []).filter((trip) => trip.status === "completed");
  const earned = trips.reduce((sum, trip) => sum + (trip.fareTotalPoisha ?? 0), 0);
  const open = pool.data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Good to see you, {user.name}</h1>
          <p>Accept riders who fit, then take the trip from pickup to drop-off.</p>
        </div>
      </div>

      <div className="stats">
        <StatCard icon={Icon.Power} tone={vehicle.data?.isOnline ? "green" : "dark"}
          value={vehicle.loading ? "…" : vehicle.data?.isOnline ? "Online" : "Offline"} label={`${vehicle.data?.name ?? "Tesla"} status`} />
        <StatCard icon={Icon.Seat} tone="blue" value={open ? `${open.seatsTaken}/${open.capacity}` : `0/${vehicle.data?.capacity ?? 3}`} label="Seats taken" />
        <StatCard icon={Icon.Users} tone="orange" value={!online ? "–" : waiting.loading ? "…" : (waiting.data ?? []).length} label={online ? "Waiting requests" : "Go online to see requests"} />
        <StatCard icon={Icon.Cash} tone="teal" value={taka(earned)} label={`Earned in ${trips.length} trip${trips.length === 1 ? "" : "s"}`} />
      </div>

      <div className="grid-2-1">
        <OpenTrip pool={open} loading={pool.loading} error={pool.error} nameOf={nameOf} />
        <div className="stack">
          <OnlineSwitch vehicle={vehicle.data} loading={vehicle.loading} error={vehicle.error} reload={vehicle.reload} />
          <Feed />
        </div>
      </div>

      <WaitingRides
        rides={waiting.data}
        loading={waiting.loading}
        error={waiting.error}
        vehicle={vehicle.data}
        vehicleLoading={vehicle.loading}
        pool={open}
        byCode={byCode}
        nameOf={nameOf}
      />
    </>
  );
}
