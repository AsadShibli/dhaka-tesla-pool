import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { areas } from "../db/schema/areas.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { vehicles } from "../db/schema/vehicles.js";
import { distanceMeters } from "../../../../packages/domain/distance.js";
import { passengerFare } from "../../../../packages/domain/fare.js";
import { canShare } from "../../../../packages/domain/match.js";

// One waiting ride joins the driver's open pool, or starts that pool.
export function registerAccept(app) {
  app.post("/rides/:id/accept", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can accept a ride" });
      }
      const pool = await acceptRide(req.user.id, req.params.id);
      res.status(201).json(pool);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      if (err.cause?.code === "23505") {
        return res.status(409).json({ error: "this tesla already has an open pool" });
      }
      next(err);
    }
  });
}

async function acceptRide(driverId, rideId) {
  return db.transaction(async (tx) => {
    const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.driverId, driverId));
    if (!vehicle) fail(404, "driver has no tesla");
    // An open trip can still finish. A new ride waits until the Tesla is online.
    if (!vehicle.isOnline) fail(409, "driver is offline");
    const [ride] = await tx.select().from(rideRequests).where(and(
      eq(rideRequests.id, rideId),
      eq(rideRequests.status, "requested"),
    ));
    if (!ride) fail(404, "waiting ride not found");

    const places = await tx.select().from(areas);
    const point = Object.fromEntries(places.map((area) => [area.code, area]));
    let [pool] = await tx.select().from(pools).where(and(
      eq(pools.vehicleId, vehicle.id),
      eq(pools.status, "accepted"),
    )).for("update");

    const members = pool ? await membersOf(tx, pool.id) : [];
    const fits = members.every((member) => canShare(trip(ride, point), trip(member, point)));
    if (!fits) fail(409, "ride does not fit this pool");

    const pooled = members.length > 0;
    if (!pool) {
      if (ride.seats > vehicle.capacity) fail(409, "not enough seats");
      [pool] = await tx.insert(pools).values({
        vehicleId: vehicle.id,
        driverId,
        capacity: vehicle.capacity,
        seatsTaken: ride.seats,
      }).returning();
    } else {
      const [updated] = await tx.update(pools).set({
        seatsTaken: sql`${pools.seatsTaken} + ${ride.seats}`,
      }).where(and(
        eq(pools.id, pool.id),
        sql`${pools.seatsTaken} + ${ride.seats} <= ${pools.capacity}`,
      )).returning();
      if (!updated) fail(409, "not enough seats");
      pool = updated;
    }

    const farePoisha = quote(ride, point, pooled);
    await tx.insert(poolMembers).values({
      poolId: pool.id,
      rideRequestId: ride.id,
      passengerId: ride.passengerId,
      seats: ride.seats,
      farePoisha,
    });
    await tx.update(rideRequests).set({
      status: "matched",
      poolId: pool.id,
      farePoisha,
    }).where(eq(rideRequests.id, ride.id));
    if (pooled) await discountMembers(tx, members, point);

    return { poolId: pool.id, seatsTaken: pool.seatsTaken, capacity: pool.capacity, farePoisha };
  });
}

function trip(ride, point) {
  return { pickupCode: ride.pickupCode, destination: point[ride.destinationCode] };
}

function quote(ride, point, pooled) {
  const meters = distanceMeters(point[ride.pickupCode], point[ride.destinationCode]);
  return passengerFare({ distanceMeters: meters, pooled });
}

function membersOf(tx, poolId) {
  return tx.select({
    id: poolMembers.id,
    rideRequestId: poolMembers.rideRequestId,
    pickupCode: rideRequests.pickupCode,
    destinationCode: rideRequests.destinationCode,
  }).from(poolMembers).innerJoin(
    rideRequests,
    eq(rideRequests.id, poolMembers.rideRequestId),
  ).where(eq(poolMembers.poolId, poolId));
}

async function discountMembers(tx, members, point) {
  for (const member of members) {
    const farePoisha = quote(member, point, true);
    await tx.update(poolMembers).set({ farePoisha }).where(eq(poolMembers.id, member.id));
    await tx.update(rideRequests).set({ farePoisha }).where(eq(rideRequests.id, member.rideRequestId));
  }
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
