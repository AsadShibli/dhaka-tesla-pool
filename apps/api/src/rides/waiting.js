import { asc, eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { users } from "../db/schema/users.js";
import { vehicles } from "../db/schema/vehicles.js";

// Every ride still waiting, oldest first so the first request is offered first. Accept decides which of these can share the open Tesla.
// An offline Tesla is not taking riders, so its driver is not shown who is waiting.
export function registerWaiting(app) {
  app.get("/rides/waiting", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can see waiting rides" });
      }
      const [vehicle] = await db.select({ isOnline: vehicles.isOnline }).from(vehicles).where(eq(vehicles.driverId, req.user.id));
      if (!vehicle?.isOnline) {
        return res.status(409).json({ error: "go online to see waiting rides" });
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
      ).orderBy(asc(rideRequests.createdAt));
      res.json(rides);
    } catch (err) {
      next(err);
    }
  });
}
