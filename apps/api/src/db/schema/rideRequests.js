import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { areas } from "./areas.js";
import { users } from "./users.js";

// Passenger-visible lifecycle. A pool is attached in a later table.
export const rideStatus = pgEnum("ride_status", [
  "requested", "matched", "driver_arrived", "started", "completed", "cancelled",
]);

// One passenger asking for a seat. Fare stays null until it is quoted.
export const rideRequests = pgTable(
  "ride_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passengerId: uuid("passenger_id").notNull().references(() => users.id),
    pickupCode: text("pickup_code").notNull().references(() => areas.code),
    destinationCode: text("destination_code").notNull().references(() => areas.code),
    seats: smallint("seats").notNull(),
    status: rideStatus("status").notNull().default("requested"),
    // Integer poisha (1 BDT = 100). Null until the quote is stored.
    farePoisha: integer("fare_poisha"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("ride_requests_seats_positive", sql`${table.seats} > 0`),
    check("ride_requests_distinct_areas", sql`${table.pickupCode} <> ${table.destinationCode}`),
  ]
);
