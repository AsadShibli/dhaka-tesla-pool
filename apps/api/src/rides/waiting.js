import { eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { users } from "../db/schema/users.js";

// Every ride still waiting. Accept decides which of these can share the open Tesla.
export function registerWaiting(app) {
  app.get("/rides/waiting", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can see waiting rides" });
      }
      const rides = await db.select({
        id: rideRequests.id,
        passengerName: users.name,
        seats: rideRequests.seats,
        pickupCode: rideRequests.pickupCode,
        destinationCode: rideRequests.destinationCode,
        farePoisha: rideRequests.farePoisha,
      }).from(rideRequests).innerJoin(users, eq(users.id, rideRequests.passengerId)).where(
        eq(rideRequests.status, "requested"),
      );
      res.json(rides);
    } catch (err) {
      next(err);
    }
  });
}
