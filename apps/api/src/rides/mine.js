import { desc, eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
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
        })
        .from(rideRequests)
        .where(eq(rideRequests.passengerId, req.user.id))
        .orderBy(desc(rideRequests.createdAt));
      res.json(rides);
    } catch (err) {
      next(err);
    }
  });
}
