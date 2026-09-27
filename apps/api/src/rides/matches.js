import { and, eq, ne } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { areas } from "../db/schema/areas.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { users } from "../db/schema/users.js";
import { canShare } from "../../../../packages/domain/match.js";

const rideColumns = {
  id: rideRequests.id,
  seats: rideRequests.seats,
  pickupCode: rideRequests.pickupCode,
  destinationCode: rideRequests.destinationCode,
  farePoisha: rideRequests.farePoisha,
};

// Other waiting rides that can share a Tesla with this one. Driver only.
export function registerMatches(app) {
  app.get("/rides/:id/matches", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can see matching rides" });
      }
      const [anchor] = await db.select(rideColumns).from(rideRequests).where(and(
        eq(rideRequests.id, req.params.id),
        eq(rideRequests.status, "requested"),
      ));
      if (!anchor) return res.status(404).json({ error: "waiting ride not found" });

      const places = await db.select().from(areas);
      const point = Object.fromEntries(places.map((area) => [area.code, area]));
      const others = await db
        .select({ ...rideColumns, passengerName: users.name })
        .from(rideRequests)
        .innerJoin(users, eq(users.id, rideRequests.passengerId))
        .where(and(
          eq(rideRequests.status, "requested"),
          eq(rideRequests.pickupCode, anchor.pickupCode),
          ne(rideRequests.id, anchor.id),
        ));

      const anchorTrip = { pickupCode: anchor.pickupCode, destination: point[anchor.destinationCode] };
      res.json(others.filter((ride) => canShare(anchorTrip, {
        pickupCode: ride.pickupCode,
        destination: point[ride.destinationCode],
      })));
    } catch (err) {
      next(err);
    }
  });
}
