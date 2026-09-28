import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { pools } from "../db/schema/pools.js";

const live = ["accepted", "driver_arrived", "started"];

// The driver's current trip, if one is still on the road.
export function registerOpenPool(app) {
  app.get("/pools/open", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can see the open trip" });
      }
      const [pool] = await db.select({
        id: pools.id,
        status: pools.status,
        seatsTaken: pools.seatsTaken,
        capacity: pools.capacity,
      }).from(pools).where(and(
        eq(pools.driverId, req.user.id),
        inArray(pools.status, live),
      ));
      res.json(pool ?? null);
    } catch (err) {
      next(err);
    }
  });
}
