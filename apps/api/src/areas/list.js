import { asc } from "drizzle-orm";
import { db } from "../db/client.js";
import { areas } from "../db/schema/areas.js";

// The fixed Dhaka places, so the site's dropdown and quote use the same table as the fare.
export function registerAreas(app) {
  app.get("/areas", async (_req, res, next) => {
    try {
      res.json(await db.select().from(areas).orderBy(asc(areas.name)));
    } catch (err) {
      next(err);
    }
  });
}
