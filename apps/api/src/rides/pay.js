import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { payments } from "../db/schema/payments.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { wallets } from "../db/schema/wallets.js";

const methods = new Set(["cash", "teslapay"]);

// Records one fare once the rider is dropped off. TeslaPay debits that wallet.
// The driver can complete the trip only after every rider has paid.
export function registerPay(app) {
  app.post("/rides/:id/pay", requireUser, async (req, res, next) => {
    try {
      const method = req.body?.method;
      if (!methods.has(method)) return res.status(400).json({ error: "method must be cash or teslapay" });
      res.status(201).json(await payRide(req.user.id, req.params.id, method));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      if (err.cause?.code === "23505") return res.status(409).json({ error: "ride is already paid" });
      next(err);
    }
  });
}

async function payRide(passengerId, rideId, method) {
  return db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rideRequests).where(eq(rideRequests.id, rideId)).for("update");
    if (!ride) fail(404, "ride not found");
    if (ride.passengerId !== passengerId) fail(403, "you can only pay your own ride");
    if (ride.status !== "dropped_off") fail(409, "pay after you are dropped off");
    if (!ride.farePoisha) fail(409, "ride has no fare");

    if (method === "teslapay") {
      const [wallet] = await tx.update(wallets).set({
        balancePoisha: sql`${wallets.balancePoisha} - ${ride.farePoisha}`,
      }).where(and(
        eq(wallets.userId, passengerId),
        sql`${wallets.balancePoisha} >= ${ride.farePoisha}`,
      )).returning({ balancePoisha: wallets.balancePoisha });
      if (!wallet) fail(409, "not enough teslapay balance");
    }

    const [payment] = await tx.insert(payments).values({
      rideRequestId: ride.id,
      amountPoisha: ride.farePoisha,
      method,
    }).returning({
      rideRequestId: payments.rideRequestId,
      amountPoisha: payments.amountPoisha,
      method: payments.method,
    });
    // Status stays dropped_off until the driver completes the trip. The event records who paid, how, and how much.
    await tx.insert(rideEvents).values({
      actorUserId: passengerId,
      poolId: ride.poolId,
      rideRequestId: ride.id,
      fromStatus: "dropped_off",
      toStatus: "paid",
      note: `${ride.farePoisha} poisha by ${method}`,
    });
    return payment;
  });
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
