import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { users } from "../db/schema/users.js";

const live = ["accepted", "driver_arrived", "started"];

// The driver's current trip, if one is still on the road.
export function registerOpenPool(app) {
  app.get("/pools/open", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can see the open trip" });
      }
      const [pool] = await db.select({
        id: pools.id,
        status: pools.status,
        seatsTaken: pools.seatsTaken,
        capacity: pools.capacity,
      }).from(pools).where(and(
        eq(pools.driverId, req.user.id),
        inArray(pools.status, live),
      ));
      // No trip yet. null tells the page to show "No open trip".
      if (!pool) return res.json(null);
      // Names and stops, so Jashim can see who is actually in Bullet.
      const riders = await db.select({
        name: users.name,
        pickupCode: rideRequests.pickupCode,
        destinationCode: rideRequests.destinationCode,
        seats: poolMembers.seats,
        farePoisha: poolMembers.farePoisha,
      }).from(poolMembers)
        .innerJoin(users, eq(users.id, poolMembers.passengerId))
        .innerJoin(rideRequests, eq(rideRequests.id, poolMembers.rideRequestId))
        .where(eq(poolMembers.poolId, pool.id));
      res.json({ ...pool, riders });
    } catch (err) {
      next(err);
    }
  });
}
