import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { wallets } from "../db/schema/wallets.js";
import { hashPassword } from "./passwords.js";

const roles = new Set(["passenger", "driver"]);

// Creates the account and an empty TeslaPay wallet, then sets the same cookie as login.
export function registerSignup(app) {
  app.post("/signup", async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body ?? {};
      if (!name || !email || !password || !roles.has(role)) {
        return res.status(400).json({ error: "name, email, password, and role are required" });
      }

      const passwordHash = await hashPassword(password);
      const user = await db.transaction(async (tx) => {
        const [created] = await tx.insert(users).values({ name, email, passwordHash, role }).returning();
        await tx.insert(wallets).values({ userId: created.id });
        return created;
      });

      const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
      res.setHeader("Set-Cookie", `token=${token}; HttpOnly; SameSite=Lax; Path=/`);
      res.status(201).json({ id: user.id, name: user.name, role: user.role });
    } catch (err) {
      if (err.cause?.code === "23505") {
        return res.status(409).json({ error: "email is already registered" });
      }
      next(err);
    }
  });
}
