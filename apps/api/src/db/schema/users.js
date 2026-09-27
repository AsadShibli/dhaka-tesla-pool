import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Passenger or driver. One account table, distinguished by this role.
export const userRole = pgEnum("user_role", ["passenger", "driver"]);

// Login account. password_hash is a hash, never the raw password.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
