import { sql } from "drizzle-orm";
import { check, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.js";

// One TeslaPay wallet per person. Balance is whole poisha, never a fraction of a taka.
export const wallets = pgTable(
  "wallets",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id),
    balancePoisha: integer("balance_poisha").notNull().default(0),
  },
  (table) => [check("wallets_balance_non_negative", sql`${table.balancePoisha} >= 0`)]
);
