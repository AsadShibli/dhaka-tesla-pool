import { and, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { pools } from "../db/schema/pools.js";
import { rideRequests } from "../db/schema/rideRequests.js";

const finished = ["completed", "cancelled"];

// Past trips only. Open requests stay on /rides/mine.
export function registerHistory(app) {
  app.get("/rides/history", requireUser, async (req, res, next) => {
    try {
      const rows = req.user.role === "driver"
        ? await poolsOf(req.user.id)
        : await ridesOf(req.user.id);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });
}

// The passenger's own fare and status. Another rider's numbers are not selected.
function ridesOf(passengerId) {
  return db.select({
    id: rideRequests.id,
    status: rideRequests.status,
    seats: rideRequests.seats,
    pickupCode: rideRequests.pickupCode,
    destinationCode: rideRequests.destinationCode,
    farePoisha: rideRequests.farePoisha,
  }).from(rideRequests).where(and(
    eq(rideRequests.passengerId, passengerId),
    inArray(rideRequests.status, finished),
  )).orderBy(desc(rideRequests.createdAt));
}

// Pools this driver finished. Another Tesla's trips are filtered out.
function poolsOf(driverId) {
  return db.select({
    id: pools.id,
    status: pools.status,
    seatsTaken: pools.seatsTaken,
    capacity: pools.capacity,
  }).from(pools).where(and(
    eq(pools.driverId, driverId),
    inArray(pools.status, finished),
  )).orderBy(desc(pools.createdAt));
}
