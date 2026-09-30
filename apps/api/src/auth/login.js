import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { passwordMatches } from "./passwords.js";

// Email and password in, httpOnly cookie out. The JSON body has no token.
export function registerLogin(app) {
  app.post("/login", async (req, res, next) => {
    try {
      // Signup stores emails lower-case, so NUSRAT@... finds the same account.
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const password = req.body?.password;
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      const ok = user && (await passwordMatches(password, user.passwordHash));
      if (!ok) return res.status(401).json({ error: "invalid email or password" });

      const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
      res.setHeader("Set-Cookie", `token=${token}; HttpOnly; SameSite=Lax; Path=/`);
      res.json({ id: user.id, name: user.name, role: user.role });
    } catch (err) {
      // Express does not catch async errors. Pass them on so the process stays up.
      next(err);
    }
  });
}
