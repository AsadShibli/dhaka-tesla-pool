import { eq } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";
import { areas } from "../db/schema/areas.js";
import { rideEvents } from "../db/schema/rideEvents.js";
import { rideRequests } from "../db/schema/rideRequests.js";
import { distanceMeters } from "../../../../packages/domain/distance.js";
import { passengerFare } from "../../../../packages/domain/fare.js";

// Saves the caller's request and returns only their solo estimate, in poisha.
export function registerRideRequest(app) {
  app.post("/rides", requireUser, async (req, res, next) => {
    try {
      if (req.user.role !== "passenger") {
        return res.status(403).json({ error: "only a passenger can request a ride" });
      }
      const pickupCode = req.body?.pickupCode;
      const destinationCode = req.body?.destinationCode;
      const seats = Number(req.body?.seats);
      if (!pickupCode || !destinationCode || !Number.isInteger(seats) || seats < 1) {
        return res.status(400).json({ error: "pickup, destination, and seats are required" });
      }
      if (pickupCode === destinationCode) {
        return res.status(400).json({ error: "pickup and destination must differ" });
      }

      const pickup = await areaPoint(pickupCode);
      const destination = await areaPoint(destinationCode);
      if (!pickup || !destination) return res.status(400).json({ error: "unknown area" });

      const farePoisha = passengerFare({
        distanceMeters: distanceMeters(pickup, destination),
        pooled: false,
      });
      // The request and its first event are saved together, so history starts at "requested".
      const ride = await db.transaction(async (tx) => {
        const [created] = await tx.insert(rideRequests).values({
          passengerId: req.user.id,
          pickupCode,
          destinationCode,
          seats,
          farePoisha,
        }).returning({
          id: rideRequests.id,
          status: rideRequests.status,
          seats: rideRequests.seats,
          pickupCode: rideRequests.pickupCode,
          destinationCode: rideRequests.destinationCode,
          farePoisha: rideRequests.farePoisha,
        });
        await tx.insert(rideEvents).values({
          actorUserId: req.user.id,
          rideRequestId: created.id,
          toStatus: "requested",
        });
        return created;
      });
      res.status(201).json(ride);
    } catch (err) {
      next(err);
    }
  });
}

function areaPoint(code) {
  return db.select({ lat: areas.lat, lng: areas.lng }).from(areas).where(eq(areas.code, code)).then((rows) => rows[0]);
}
