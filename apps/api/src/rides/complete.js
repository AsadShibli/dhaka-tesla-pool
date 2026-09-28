import { and, eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";

// started -> completed. Completing before the trip has started is rejected.
export function registerComplete(app) {
  app.post("/pools/:id/complete", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can complete a trip" });
      }
      res.json(await markCompleted(req.user.id, req.params.id));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });
}

async function markCompleted(driverId, poolId) {
  return db.transaction(async (tx) => {
    const [pool] = await tx.select().from(pools).where(and(
      eq(pools.id, poolId),
      eq(pools.driverId, driverId),
    )).for("update");
    if (!pool) fail(404, "pool not found");
    if (pool.status !== "started") fail(409, "pool cannot complete from this status");

    await tx.update(pools).set({ status: "completed" }).where(eq(pools.id, pool.id));
    const members = await tx.select({ rideRequestId: poolMembers.rideRequestId })
      .from(poolMembers).where(eq(poolMembers.poolId, pool.id));
    for (const member of members) {
      await tx.update(rideRequests).set({ status: "completed" }).where(and(
        eq(rideRequests.id, member.rideRequestId),
        eq(rideRequests.status, "started"),
      ));
    }
    await tx.insert(rideEvents).values({
      actorUserId: driverId,
      poolId: pool.id,
      fromStatus: "started",
      toStatus: "completed",
    });
    return { poolId: pool.id, status: "completed" };
  });
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
