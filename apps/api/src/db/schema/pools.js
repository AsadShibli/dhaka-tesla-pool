import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, smallint, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { vehicles } from "./vehicles.js";

// A pool begins when the driver accepts. It is never just "requested".
export const poolStatus = pgEnum("pool_status", [
  "accepted", "driver_arrived", "started", "completed", "cancelled",
]);

// One shared ride on a Tesla. Taken seats must stay within capacity.
export const pools = pgTable(
  "pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
    driverId: uuid("driver_id").notNull().references(() => users.id),
    status: poolStatus("status").notNull().default("accepted"),
    capacity: smallint("capacity").notNull(),
    seatsTaken: smallint("seats_taken").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("pools_capacity_positive", sql`${table.capacity} > 0`),
    check("pools_seats_within_capacity", sql`${table.seatsTaken} >= 0 AND ${table.seatsTaken} <= ${table.capacity}`),
    // Completed and cancelled pools stay in history. Only a live one blocks the Tesla.
    uniqueIndex("pools_one_active_per_vehicle").on(table.vehicleId).where(
      sql`${table.status} IN ('accepted', 'driver_arrived', 'started')`
    ),
  ]
);
