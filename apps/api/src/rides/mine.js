import { desc, eq, sql } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { payments } from "../db/schema/payments.js";
import { rideRequests } from "../db/schema/rideRequests.js";

// A passenger's own rows only. Fare and status are theirs, never another rider's.
export function registerMyRides(app) {
  app.get("/rides/mine", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "passenger") {
        return res.status(403).json({ error: "only a passenger can view their rides" });
      }

      const rides = await db
        .select({
          id: rideRequests.id,
          status: rideRequests.status,
          seats: rideRequests.seats,
          pickupCode: rideRequests.pickupCode,
          destinationCode: rideRequests.destinationCode,
          farePoisha: rideRequests.farePoisha,
          createdAt: rideRequests.createdAt,
          // How many riders share this Tesla. A count, not their names or fares.
          poolRiders: sql`(SELECT count(*)::int FROM pool_members pm WHERE pm.pool_id = ride_requests.pool_id)`,
          // Null until the passenger pays, so a refresh does not offer payment twice.
          paidMethod: payments.method,
        })
        .from(rideRequests)
        .leftJoin(payments, eq(payments.rideRequestId, rideRequests.id))
        .where(eq(rideRequests.passengerId, req.user.id))
        .orderBy(desc(rideRequests.createdAt));
      res.json(rides);
    } catch (err) {
      next(err);
    }
  });
}
