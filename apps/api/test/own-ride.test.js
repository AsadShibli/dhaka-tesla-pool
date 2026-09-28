import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// A passenger sees and cancels only their own request.
const base = process.env.API_URL || "http://localhost:4011";
const apiUp = await fetch(`${base}/health`).then((response) => response.ok).catch(() => false);
const jars = {};

function cookie(who) {
  return [...(jars[who] ?? [])].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function call(who, path, body) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", cookie: cookie(who) },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const item of response.headers.getSetCookie?.() ?? []) {
    const [pair] = item.split(";");
    const index = pair.indexOf("=");
    if (!jars[who]) jars[who] = new Map();
    jars[who].set(pair.slice(0, index), pair.slice(index + 1));
  }
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

test("one passenger cannot open another's ride", { skip: apiUp ? false : "API is not running" }, async () => {
  let rideId = null;
  try {
    for (const who of ["nusrat", "rafiq"]) {
      const login = await call(who, "/login", { email: `${who}@dhaka-tesla.local`, password: "pool-demo" });
      assert.equal(login.status, 200);
    }
    const ride = await call("nusrat", "/rides", { pickupCode: "banani", destinationCode: "mohakhali", seats: 1 });
    assert.equal(ride.status, 201);
    rideId = ride.body.id;
    const mine = await call("rafiq", "/rides/mine");
    assert.equal(mine.status, 200);
    assert.equal(mine.body.some((row) => row.id === rideId), false);
    const cancel = await call("rafiq", `/rides/${rideId}/cancel`, {});
    assert.equal(cancel.status, 403);
    assert.equal(cancel.body.error, "you can only cancel your own ride");
  } finally {
    if (!rideId) return;
    execFileSync("docker", ["exec", "tesla-project-db-1", "psql", "-U", "tesla", "-d", "tesla_pool", "-c",
      `DELETE FROM ride_requests WHERE id='${rideId}';`], { stdio: "ignore" });
  }
});
