import { sql } from "drizzle-orm";
import { check, integer, pgTable, smallint, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pools } from "./pools.js";
import { rideRequests } from "./rideRequests.js";
import { users } from "./users.js";

// One passenger inside a pool. Their fare is theirs alone, in poisha.
export const poolMembers = pgTable(
  "pool_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id").notNull().references(() => pools.id),
    rideRequestId: uuid("ride_request_id").notNull().references(() => rideRequests.id),
    passengerId: uuid("passenger_id").notNull().references(() => users.id),
    seats: smallint("seats").notNull(),
    farePoisha: integer("fare_poisha").notNull(),
  },
  (table) => [
    check("pool_members_seats_positive", sql`${table.seats} > 0`),
    // A request joins at most one pool.
    uniqueIndex("pool_members_ride_request_id_key").on(table.rideRequestId),
  ]
);
