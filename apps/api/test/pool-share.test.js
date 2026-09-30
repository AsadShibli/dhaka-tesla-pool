import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Nusrat and Rafiq share Bullet from Banani. Shirin's Dhanmondi drop-off is too far to join.
// When Rafiq cancels, Nusrat loses the pool discount and gets her seat count back to one.
const base = process.env.API_URL || "http://localhost:4000";
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

async function login(who) {
  const result = await call(who, "/login", { email: `${who}@dhaka-tesla.local`, password: "pool-demo" });
  assert.equal(result.status, 200);
}

function mine(rides, id) {
  return rides.find((ride) => ride.id === id);
}

test("nusrat and rafiq share bullet, shirin does not fit, a cancel restores the solo fare",
  { skip: apiUp ? false : "API is not running" }, async () => {
    const created = [];
    let poolId = null;
    try {
      for (const who of ["jashim", "nusrat", "rafiq", "shirin"]) await login(who);
      await call("jashim", "/vehicles/online", { online: true });

      const nusrat = await call("nusrat", "/rides", { pickupCode: "banani", destinationCode: "mohakhali", seats: 1 });
      const rafiq = await call("rafiq", "/rides", { pickupCode: "banani", destinationCode: "gulshan-1", seats: 1 });
      const shirin = await call("shirin", "/rides", { pickupCode: "banani", destinationCode: "dhanmondi", seats: 1 });
      created.push(nusrat.body.id, rafiq.body.id, shirin.body.id);
      // The quote at request time is the solo fare.
      assert.equal(nusrat.body.farePoisha, 8750);
      assert.equal(rafiq.body.farePoisha, 8500);

      const first = await call("jashim", `/rides/${nusrat.body.id}/accept`, {});
      assert.equal(first.status, 201, JSON.stringify(first.body));
      poolId = first.body.poolId;
      const second = await call("jashim", `/rides/${rafiq.body.id}/accept`, {});
      assert.equal(second.status, 201, JSON.stringify(second.body));
      assert.equal(second.body.poolId, poolId);
      assert.equal(second.body.seatsTaken, 2);

      // Mohakhali to Dhanmondi is about 4 km, over the 2 km limit.
      const third = await call("jashim", `/rides/${shirin.body.id}/accept`, {});
      assert.equal(third.status, 409);
      assert.equal(third.body.error, "ride does not fit this pool");

      // Each passenger sees only their own pooled fare.
      const nusratRides = (await call("nusrat", "/rides/mine")).body;
      assert.equal(mine(nusratRides, nusrat.body.id).farePoisha, 7437);
      assert.equal(mine(nusratRides, nusrat.body.id).poolRiders, 2);
      assert.equal(mine(nusratRides, rafiq.body.id), undefined);
      assert.equal(mine((await call("rafiq", "/rides/mine")).body, rafiq.body.id).farePoisha, 7225);

      const cancelled = await call("rafiq", `/rides/${rafiq.body.id}/cancel`, {});
      assert.equal(cancelled.status, 200);
      assert.equal(cancelled.body.seatsTaken, 1);
      const after = mine((await call("nusrat", "/rides/mine")).body, nusrat.body.id);
      assert.equal(after.farePoisha, 8750);
      assert.equal(after.poolRiders, 1);
    } finally {
      await call("jashim", "/vehicles/online", { online: false });
      const ids = created.filter(Boolean);
      if (!ids.length) return;
      const list = ids.map((id) => `'${id}'`).join(",");
      const poolSql = poolId
        ? `DELETE FROM ride_events WHERE pool_id='${poolId}' OR ride_request_id IN (${list}); DELETE FROM pool_members WHERE pool_id='${poolId}'; DELETE FROM ride_requests WHERE id IN (${list}); DELETE FROM pools WHERE id='${poolId}';`
        : `DELETE FROM ride_events WHERE ride_request_id IN (${list}); DELETE FROM ride_requests WHERE id IN (${list});`;
      execFileSync("docker", ["exec", "tesla-project-db-1", "psql", "-U", "tesla", "-d", "tesla_pool", "-c", poolSql], { stdio: "ignore" });
    }
  });
