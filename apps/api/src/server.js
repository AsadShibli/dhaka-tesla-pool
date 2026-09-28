import express from "express";
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
import { registerPay } from "./rides/pay.js";
import { registerRideRequest } from "./rides/create.js";
import { registerStart } from "./rides/start.js";

// The HTTP app. Ride routes get added in later slices.
const app = express();
app.use(express.json());
registerSignup(app);
registerLogin(app);
registerAccount(app);
registerRideRequest(app);
registerMyRides(app);
registerHistory(app);
registerMatches(app);
registerAccept(app);
registerArrive(app);
registerStart(app);
registerComplete(app);
registerPay(app);
registerCancel(app);

// Docker and the web app use this to check the process is up.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Falls back to the port in .env.example when API_PORT is unset.
const port = Number(process.env.API_PORT) || 4000;

app.listen(port, () => {
  console.log(`api listening on ${port}`);
});
