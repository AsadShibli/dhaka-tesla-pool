"use client";

import { Icon } from "./Icons";
import { Card, Empty, Loading, Notice } from "./ui";
import { usePoll } from "../lib/usePoll";
import { taka, timeAgo } from "../lib/format";
import { useAreas } from "../lib/useAreas";

// Colour and icon per event, like the feed widget on the dashboard mock-up.
const LOOK = {
  requested: { icon: Icon.Bell, color: "bg-blue" },
  matched: { icon: Icon.Users, color: "bg-sky" },
  driver_arrived: { icon: Icon.Pin, color: "bg-purple" },
  started: { icon: Icon.Bolt, color: "bg-teal" },
  dropped_off: { icon: Icon.Pin, color: "bg-orange" },
  completed: { icon: Icon.Flag, color: "bg-dark" },
  cancelled: { icon: Icon.X, color: "bg-red" },
  paid: { icon: Icon.Cash, color: "bg-orange" },
};

function describe(event, nameOf) {
  if (event.coRider) {
    return event.toStatus === "matched"
      ? { title: "A rider joined your Tesla", detail: "Shared ride, 15% off your fare" }
      : { title: "A rider left your Tesla", detail: "Seats and fare updated" };
  }
  const trip = event.pickupCode ? `${nameOf(event.pickupCode)} → ${nameOf(event.destinationCode)}` : "Bullet's trip";
  const who = event.passengerName ? `${event.passengerName}: ` : "";
  switch (event.toStatus) {
    case "requested": return { title: `${who}Ride requested`, detail: trip };
    case "matched": return { title: event.actorName ? `${event.actorName} accepted your ride` : `${who}Matched in Bullet`, detail: event.note ?? trip };
    case "driver_arrived": return { title: "Driver arrived at pickup", detail: trip };
    case "started": return { title: "Trip started", detail: trip };
    case "dropped_off": return { title: "Dropped off, awaiting payment", detail: trip };
    case "completed": return { title: "Trip completed", detail: event.pickupCode ? trip : "Every fare collected" };
    case "cancelled": return { title: `${who}Ride cancelled`, detail: trip };
    case "paid": {
      // The note reads "7437 poisha by teslapay".
      const words = (event.note ?? "").split(" ");
      const [amount, method] = [words[0], words.at(-1)];
      return { title: `${who}Fare paid`, detail: amount ? `${taka(Number(amount))} by ${method === "teslapay" ? "TeslaPay" : "cash"}` : trip };
    }
    default: return { title: event.toStatus, detail: trip };
  }
}

export function Feed() {
  const { data, error, loading } = usePoll("/events/mine", 5000);
  const { nameOf } = useAreas();

  return (
    <Card title="Activity" subtitle="Every step is saved in ride_events">
      <Notice>{error}</Notice>
      {loading ? <Loading rows={5} /> : null}
      {!loading && data?.length === 0 ? (
        <Empty icon={Icon.Bell} title="Nothing yet">Ride requests and trip steps will show up here.</Empty>
      ) : null}
      <ul className="feed">
        {(data ?? []).slice(0, 7).map((event) => {
          const look = LOOK[event.toStatus] ?? LOOK.requested;
          const Shape = look.icon;
          const text = describe(event, nameOf);
          return (
            <li key={event.id}>
              <span className={`feed-dot ${look.color}`}><Shape /></span>
              <div className="feed-text">
                <strong>{text.title}</strong>
                <span>{text.detail}</span>
              </div>
              <time dateTime={event.createdAt}>{timeAgo(event.createdAt)}</time>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
