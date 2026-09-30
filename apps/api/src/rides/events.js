import { sql } from "drizzle-orm";
import { requireUser } from "../auth/session.js";
import { db } from "../db/client.js";

// The latest ride events this person is part of. Feeds the activity list on the dashboard.
export function registerEvents(app) {
  app.get("/events/mine", requireUser, async (req, res, next) => {
    try {
      const result = req.user.role === "driver"
        ? await driverEvents(req.user.id)
        : await passengerEvents(req.user.id);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  });
}

// Events on this passenger's own requests, plus trip-wide steps (arrive, start, complete)
// of a pool they are still in. Another rider's accept or payment is not included.
function passengerEvents(passengerId) {
  return db.execute(sql`
    SELECT e.id, e.from_status AS "fromStatus", e.to_status AS "toStatus", e.note,
           to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
           r.pickup_code AS "pickupCode", r.destination_code AS "destinationCode"
    FROM ride_events e
    JOIN ride_requests r
      ON e.ride_request_id = r.id
      OR (e.ride_request_id IS NULL AND e.pool_id = r.pool_id AND r.status <> 'cancelled')
    WHERE r.passenger_id = ${passengerId}
    ORDER BY e.created_at DESC
    LIMIT 20
  `);
}

// Everything that happened on this driver's pools, with the rider's name when there is one.
function driverEvents(driverId) {
  return db.execute(sql`
    SELECT e.id, e.from_status AS "fromStatus", e.to_status AS "toStatus", e.note,
           to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
           r.pickup_code AS "pickupCode", r.destination_code AS "destinationCode",
           u.name AS "passengerName"
    FROM ride_events e
    JOIN pools p ON p.id = e.pool_id
    LEFT JOIN ride_requests r ON r.id = e.ride_request_id
    LEFT JOIN users u ON u.id = r.passenger_id
    WHERE p.driver_id = ${driverId}
    ORDER BY e.created_at DESC
    LIMIT 20
  `);
}
