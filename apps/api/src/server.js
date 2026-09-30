import express from "express";
import { registerAreas } from "./areas/list.js";
import { registerAccount } from "./auth/account.js";
import { registerLogin } from "./auth/login.js";
import { registerSignup } from "./auth/signup.js";
import { registerAccept } from "./rides/accept.js";
import { registerArrive } from "./rides/arrive.js";
import { registerMatches } from "./rides/matches.js";
import { registerHistory } from "./rides/history.js";
import { registerMyRides } from "./rides/mine.js";
import { registerCancel } from "./rides/cancel.js";
import { registerComplete } from "./rides/complete.js";
import { registerEvents } from "./rides/events.js";
import { registerPay } from "./rides/pay.js";
import { registerRideRequest } from "./rides/create.js";
import { registerStart } from "./rides/start.js";
import { registerWaiting } from "./rides/waiting.js";
import { registerOnline } from "./vehicles/online.js";
import { registerOpenPool } from "./rides/openPool.js";

// The HTTP app. Ride routes get added in later slices.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
// One line per request: method, path, status, and time taken.
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});
registerAreas(app);
registerSignup(app);
registerLogin(app);
registerAccount(app);
registerRideRequest(app);
registerMyRides(app);
registerHistory(app);
registerWaiting(app);
registerMatches(app);
registerOnline(app);
registerAccept(app);
registerOpenPool(app);
registerArrive(app);
registerStart(app);
registerComplete(app);
registerPay(app);
registerCancel(app);
registerEvents(app);

// Docker and the web app use this to check the process is up.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

// Anything a route did not handle. The stack goes to the log, never to the browser.
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "body must be valid JSON" });
  }
  // Postgres rejects an id that is not a uuid, e.g. /rides/abc/cancel.
  if (err.cause?.code === "22P02") return res.status(400).json({ error: "invalid id" });
  console.error(err);
  res.status(500).json({ error: "something went wrong" });
});

// Falls back to the port in .env.example when API_PORT is unset.
const port = Number(process.env.API_PORT) || 4000;

app.listen(port, () => {
  console.log(`api listening on ${port}`);
});
