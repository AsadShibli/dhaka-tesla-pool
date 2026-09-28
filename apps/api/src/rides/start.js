import { and, eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";

// driver_arrived -> started. Starting from accepted is rejected.
export function registerStart(app) {
  app.post("/pools/:id/start", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can start a trip" });
      }
      res.json(await markStarted(req.user.id, req.params.id));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });
}

async function markStarted(driverId, poolId) {
  return db.transaction(async (tx) => {
    const [pool] = await tx.select().from(pools).where(and(
      eq(pools.id, poolId),
      eq(pools.driverId, driverId),
    )).for("update");
    if (!pool) fail(404, "pool not found");
    if (pool.status !== "driver_arrived") fail(409, "pool cannot start from this status");

    await tx.update(pools).set({ status: "started" }).where(eq(pools.id, pool.id));
    const members = await tx.select({ rideRequestId: poolMembers.rideRequestId })
      .from(poolMembers).where(eq(poolMembers.poolId, pool.id));
    for (const member of members) {
      await tx.update(rideRequests).set({ status: "started" }).where(and(
        eq(rideRequests.id, member.rideRequestId),
        eq(rideRequests.status, "driver_arrived"),
      ));
    }
    await tx.insert(rideEvents).values({
      actorUserId: driverId,
      poolId: pool.id,
      fromStatus: "driver_arrived",
      toStatus: "started",
    });
    return { poolId: pool.id, status: "started" };
  });
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
