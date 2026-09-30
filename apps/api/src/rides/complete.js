import { and, eq, isNull } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { payments } from "../db/schema/payments.js";
import { poolMembers } from "../db/schema/poolMembers.js";
import { pools } from "../db/schema/pools.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { users } from "../db/schema/users.js";

// dropped_off -> completed, only once every rider in the pool has paid.
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
    if (pool.status !== "dropped_off") fail(409, "pool cannot complete from this status");

    const unpaid = await tx.select({ name: users.name }).from(poolMembers)
      .innerJoin(users, eq(users.id, poolMembers.passengerId))
      .leftJoin(payments, eq(payments.rideRequestId, poolMembers.rideRequestId))
      .where(and(eq(poolMembers.poolId, pool.id), isNull(payments.id)));
    if (unpaid.length) fail(409, `waiting for payment from ${unpaid.map((rider) => rider.name).join(", ")}`);

    await tx.update(pools).set({ status: "completed" }).where(eq(pools.id, pool.id));
    const members = await tx.select({ rideRequestId: poolMembers.rideRequestId, farePoisha: poolMembers.farePoisha })
      .from(poolMembers).where(eq(poolMembers.poolId, pool.id));
    for (const member of members) {
      await tx.update(rideRequests).set({ status: "completed" }).where(and(
        eq(rideRequests.id, member.rideRequestId),
        eq(rideRequests.status, "dropped_off"),
      ));
    }
    await tx.insert(rideEvents).values({
      actorUserId: driverId,
      poolId: pool.id,
      fromStatus: "dropped_off",
      toStatus: "completed",
    });
    const collectedPoisha = members.reduce((sum, member) => sum + member.farePoisha, 0);
    return { poolId: pool.id, status: "completed", riders: members.length, collectedPoisha };
  });
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
