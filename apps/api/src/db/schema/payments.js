import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { rideRequests } from "./rideRequests.js";

// Cash, or a debit against the passenger's TeslaPay wallet.
export const paymentMethod = pgEnum("payment_method", ["cash", "teslapay"]);

// One settlement per request. Amount is whole poisha.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rideRequestId: uuid("ride_request_id").notNull().references(() => rideRequests.id),
    amountPoisha: integer("amount_poisha").notNull(),
    method: paymentMethod("method").notNull(),
  },
  (table) => [
    check("payments_amount_positive", sql`${table.amountPoisha} > 0`),
    uniqueIndex("payments_ride_request_id_key").on(table.rideRequestId),
  ]
);
