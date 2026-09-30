import { eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { vehicles } from "../db/schema/vehicles.js";

// Jashim flips Bullet on or off. A new ride is offered only while this is true.
export function registerOnline(app) {
  app.get("/vehicles/online", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can go online" });
      }
      const [vehicle] = await db.select({
        name: vehicles.name,
        isOnline: vehicles.isOnline,
        capacity: vehicles.capacity,
      }).from(vehicles).where(eq(vehicles.driverId, req.user.id));
      if (!vehicle) return res.status(404).json({ error: "driver has no tesla" });
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  });

  app.post("/vehicles/online", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "driver") {
        return res.status(403).json({ error: "only a driver can go online" });
      }
      if (typeof req.body?.online !== "boolean") {
        return res.status(400).json({ error: "online must be true or false" });
      }
      res.json(await setOnline(req.user.id, req.body.online));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });
}

async function setOnline(driverId, online) {
  const [vehicle] = await db.update(vehicles).set({ isOnline: online }).where(
    eq(vehicles.driverId, driverId),
  ).returning({ name: vehicles.name, isOnline: vehicles.isOnline, capacity: vehicles.capacity });
  if (!vehicle) fail(404, "driver has no tesla");
  return vehicle;
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
