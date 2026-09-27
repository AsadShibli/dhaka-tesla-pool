import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pools } from "./pools.js";
import { rideRequests } from "./rideRequests.js";
import { users } from "./users.js";

// Insert-only history. Rows are not edited after they are written.
export const rideEvents = pgTable(
  "ride_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
    poolId: uuid("pool_id").references(() => pools.id),
    rideRequestId: uuid("ride_request_id").references(() => rideRequests.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("ride_events_has_subject", sql`${table.poolId} IS NOT NULL OR ${table.rideRequestId} IS NOT NULL`),
    index("ride_events_pool_id_idx").on(table.poolId),
    index("ride_events_ride_request_id_idx").on(table.rideRequestId),
  ]
);
