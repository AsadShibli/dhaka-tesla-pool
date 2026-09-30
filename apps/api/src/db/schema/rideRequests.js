import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { areas } from "./areas.js";
import { pools } from "./pools.js";
import { users } from "./users.js";

// Passenger-visible lifecycle. pool_id stays empty until a driver accepts the request.
export const rideStatus = pgEnum("ride_status", [
  "requested", "matched", "driver_arrived", "started", "dropped_off", "completed", "cancelled",
]);

// One passenger asking for a seat. Fare stays null until it is quoted.
export const rideRequests = pgTable(
  "ride_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passengerId: uuid("passenger_id").notNull().references(() => users.id),
    pickupCode: text("pickup_code").notNull().references(() => areas.code),
    destinationCode: text("destination_code").notNull().references(() => areas.code),
    poolId: uuid("pool_id").references(() => pools.id),
    seats: smallint("seats").notNull(),
    status: rideStatus("status").notNull().default("requested"),
    // Solo estimate in poisha (1 BDT = 100). A pool may change it later.
    farePoisha: integer("fare_poisha"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("ride_requests_seats_positive", sql`${table.seats} > 0`),
    check("ride_requests_distinct_areas", sql`${table.pickupCode} <> ${table.destinationCode}`),
    index("ride_requests_pool_id_idx").on(table.poolId),
  ]
);
