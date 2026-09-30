import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { wallets } from "../db/schema/wallets.js";
import { requireUser } from "./session.js";

// A person can see their own account. The id in the URL must match the cookie.
export function registerAccount(app) {
  // No id in the URL. The cookie says who this tab still is after a refresh.
  app.get("/me", requireUser, async (req, res, next) => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          balancePoisha: wallets.balancePoisha,
        })
        .from(users)
        .leftJoin(wallets, eq(wallets.userId, users.id))
        .where(eq(users.id, req.user.id));
      if (!user) return res.status(404).json({ error: "account not found" });
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

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
