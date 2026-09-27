import { doublePrecision, pgTable, text } from "drizzle-orm/pg-core";

// Fixed Dhaka places. A ride starts and ends at one of these, not a live map pin.
export const areas = pgTable("areas", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
});
