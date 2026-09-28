import { eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { areas } from "../db/schema/areas.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { distanceMeters } from "../../../../packages/domain/distance.js";
import { passengerFare } from "../../../../packages/domain/fare.js";

const open = new Set(["requested", "matched", "driver_arrived"]);

// A passenger can leave before the trip starts. Seats return in this same transaction.
export function registerCancel(app) {
  app.post("/rides/:id/cancel", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "passenger") {
        return res.status(403).json({ error: "only a passenger can cancel a ride" });
      }
      res.json(await cancelRide(req.user.id, req.params.id));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });
}

async function cancelRide(passengerId, rideId) {
  return db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rideRequests).where(eq(rideRequests.id, rideId)).for("update");
    if (!ride) fail(404, "ride not found");
    if (ride.passengerId !== passengerId) fail(403, "you can only cancel your own ride");
    if (!open.has(ride.status)) fail(409, "ride cannot be cancelled from this status");

    let seatsTaken = null;
    if (ride.poolId) seatsTaken = await releaseSeats(tx, ride);

    await tx.update(rideRequests).set({ status: "cancelled" }).where(eq(rideRequests.id, ride.id));
    await tx.insert(rideEvents).values({
      actorUserId: passengerId,
      poolId: ride.poolId,
      rideRequestId: ride.id,
      fromStatus: ride.status,
      toStatus: "cancelled",
    });
    return { id: ride.id, status: "cancelled", seatsTaken };
  });
}

// Lock the pool, give the seats back, and drop the membership so it no longer shares a fare.
async function releaseSeats(tx, ride) {
  const [pool] = await tx.select().from(pools).where(eq(pools.id, ride.poolId)).for("update");
  if (!pool) fail(404, "pool not found");
  const seatsTaken = pool.seatsTaken - ride.seats;
  if (seatsTaken < 0) fail(409, "not enough seats");
  await tx.update(pools).set({
    seatsTaken,
    status: seatsTaken === 0 ? "cancelled" : pool.status,
  }).where(eq(pools.id, pool.id));
  await tx.delete(poolMembers).where(eq(poolMembers.rideRequestId, ride.id));
  if (seatsTaken > 0) await soloIfAlone(tx, pool.id);
  return seatsTaken;
}

// One rider left is no longer pooled, so the 15% share discount comes off.
async function soloIfAlone(tx, poolId) {
  const members = await tx.select({
    id: poolMembers.id,
    rideRequestId: poolMembers.rideRequestId,
    pickupCode: rideRequests.pickupCode,
    destinationCode: rideRequests.destinationCode,
  }).from(poolMembers).innerJoin(rideRequests, eq(rideRequests.id, poolMembers.rideRequestId))
    .where(eq(poolMembers.poolId, poolId));
  if (members.length !== 1) return;
  const places = await tx.select().from(areas);
  const point = Object.fromEntries(places.map((area) => [area.code, area]));
  const member = members[0];
  const meters = distanceMeters(point[member.pickupCode], point[member.destinationCode]);
  const farePoisha = passengerFare({ distanceMeters: meters, pooled: false });
  await tx.update(poolMembers).set({ farePoisha }).where(eq(poolMembers.id, member.id));
  await tx.update(rideRequests).set({ farePoisha }).where(eq(rideRequests.id, member.rideRequestId));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
