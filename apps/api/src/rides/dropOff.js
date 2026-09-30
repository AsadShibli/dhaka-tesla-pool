import { and, eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";

// started -> dropped_off. The riders are out of the car; now each one pays their own fare.
export function registerDropOff(app) {
  app.post("/pools/:id/drop-off", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can drop riders off" });
      }
      res.json(await markDroppedOff(req.user.id, req.params.id));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });
}

async function markDroppedOff(driverId, poolId) {
  return db.transaction(async (tx) => {
    const [pool] = await tx.select().from(pools).where(and(
      eq(pools.id, poolId),
      eq(pools.driverId, driverId),
    )).for("update");
    if (!pool) fail(404, "pool not found");
    if (pool.status !== "started") fail(409, "riders can be dropped off only during the trip");

    await tx.update(pools).set({ status: "dropped_off" }).where(eq(pools.id, pool.id));
    const members = await tx.select({ rideRequestId: poolMembers.rideRequestId })
      .from(poolMembers).where(eq(poolMembers.poolId, pool.id));
    for (const member of members) {
      await tx.update(rideRequests).set({ status: "dropped_off" }).where(and(
        eq(rideRequests.id, member.rideRequestId),
        eq(rideRequests.status, "started"),
      ));
    }
    await tx.insert(rideEvents).values({
      actorUserId: driverId,
      poolId: pool.id,
      fromStatus: "started",
      toStatus: "dropped_off",
    });
    return { poolId: pool.id, status: "dropped_off" };
  });
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
