import { sql } from "drizzle-orm";
import { boolean, check, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

// One Tesla per driver. Capacity is fixed; a pool must never exceed it.
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    driverId: uuid("driver_id").notNull().unique().references(() => users.id),
    name: text("name").notNull(),
    capacity: smallint("capacity").notNull(),
    isOnline: boolean("is_online").notNull().default(false),
  },
  (table) => [check("vehicles_capacity_positive", sql`${table.capacity} > 0`)]
);
