"use client";

import { useEffect, useRef } from "react";
import { useSession } from "./Session";
import { useToast } from "./Toaster";
import { taka } from "../lib/format";
import { useAreas } from "../lib/useAreas";
import { usePoll } from "../lib/usePoll";

// What someone else just did, said to this person. Their own clicks already show on screen.
function passengerToast(event, nameOf) {
  const to = nameOf(event.destinationCode);
  if (event.coRider) {
    return event.toStatus === "matched"
      ? { tone: "teal", icon: "Users", title: "A rider joined your Tesla", detail: `Shared ride, 15% off. Your fare is now ${taka(event.farePoisha)}.` }
      : { tone: "orange", icon: "Users", title: "A rider left your Tesla", detail: `Your fare is now ${taka(event.farePoisha)}.` };
  }
  switch (event.toStatus) {
    case "matched": return { tone: "blue", icon: "Car", title: `${event.actorName} accepted your ride`, detail: `${nameOf(event.pickupCode)} → ${to} · ${event.note}` };
    case "driver_arrived": return { tone: "purple", icon: "Pin", title: `${event.actorName} has arrived`, detail: `Waiting for you at ${nameOf(event.pickupCode)}.` };
    case "started": return { tone: "teal", icon: "Bolt", title: "Your trip has started", detail: `On the way to ${to}.` };
    case "completed": return { tone: "dark", icon: "Flag", title: `You've reached ${to}`, detail: `Pay ${taka(event.farePoisha)} by cash or TeslaPay.` };
    default: return null;
  }
}

function driverToast(event, nameOf) {
  const route = event.pickupCode ? `${nameOf(event.pickupCode)} → ${nameOf(event.destinationCode)}` : "";
  switch (event.toStatus) {
    case "cancelled": return { tone: "red", icon: "X", title: `${event.passengerName} cancelled`, detail: `${route} · the seat is free again.` };
    case "paid": {
      const [amount, , method] = (event.note ?? "").split(" ");
      return { tone: "orange", icon: "Cash", title: `${event.passengerName} paid ${taka(Number(amount))}`, detail: method === "teslapay" ? "By TeslaPay." : "In cash." };
    }
    default: return null;
  }
}

// Remembers what was already there on first load, then hands over only what is new.
// `reset` starts over, e.g. when the driver goes online and sees the waiting list again.
function useAnnounce(items, key, reset, onNew) {
  const seen = useRef(null);
  const handler = useRef(onNew);
  handler.current = onNew;
  useEffect(() => { seen.current = null; }, [reset]);
  useEffect(() => {
    if (!Array.isArray(items)) return;
    if (seen.current === null) {
      seen.current = new Set(items.map((item) => item[key]));
      return;
    }
    const fresh = items.filter((item) => !seen.current.has(item[key]));
    fresh.forEach((item) => seen.current.add(item[key]));
    if (fresh.length) handler.current(fresh);
  }, [items, key]);
}

export function Notifier() {
  const { user } = useSession();
  const notify = useToast();
  const { nameOf, byCode } = useAreas();
  const isDriver = user.role === "driver";

  const events = usePoll("/events/mine", 4000);
  const vehicle = usePoll(isDriver ? "/vehicles/online" : null, 5000);
  const online = isDriver && vehicle.data?.isOnline === true;
  const waiting = usePoll(online ? "/rides/waiting" : null, 4000);

  // Area names load once; until then a toast would read "banani" instead of "Banani".
  const ready = Object.keys(byCode ?? {}).length > 0;
  useAnnounce(ready ? events.data : null, "id", user.id, (fresh) => {
    // The feed is newest first; announce in the order things happened.
    for (const event of [...fresh].reverse()) {
      if (event.actorUserId === user.id) continue;
      const toast = isDriver ? driverToast(event, nameOf) : passengerToast(event, nameOf);
      if (toast) notify(toast);
    }
  });

  useAnnounce(ready && online ? waiting.data : null, "id", online, (fresh) => {
    for (const ride of fresh) {
      notify({
        tone: "blue",
        icon: "Bell",
        title: "New ride request",
        detail: `${ride.passengerName}: ${nameOf(ride.pickupCode)} → ${nameOf(ride.destinationCode)} · ${ride.seats} seat${ride.seats === 1 ? "" : "s"}`,
      });
    }
  });

  return null;
}
