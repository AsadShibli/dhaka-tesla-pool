import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { requireUser } from "./session.js";

// A person can see their own account. The id in the URL must match the cookie.
export function registerAccount(app) {
  app.get("/users/:id", requireUser, async (req, res, next) => {
    try {
      if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: "you can only view your own account" });
      }

      const [user] = await db
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, req.user.id));
      if (!user) return res.status(404).json({ error: "account not found" });

      res.json(user);
    } catch (err) {
      next(err);
    }
  });
}
