import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { wallets } from "../db/schema/wallets.js";
import { hashPassword } from "./passwords.js";

// Creates a passenger account and an empty TeslaPay wallet, then sets the same cookie as login.
// Drivers are not self-serve: a driver needs a Tesla row, so Jashim comes from the seed.
export function registerSignup(app) {
  app.post("/signup", async (req, res, next) => {
    try {
      const { password } = req.body ?? {};
      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const role = req.body?.role ?? "passenger";
      if (!name || !email || !password) {
        return res.status(400).json({ error: "name, email, and password are required" });
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: "email is not valid" });
      }
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "password must be at least 8 characters" });
      }
      if (role !== "passenger") {
        return res.status(400).json({ error: "only passengers can sign up; drivers are added with their tesla" });
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
