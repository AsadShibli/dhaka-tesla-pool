import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Once the trip has started, the seat stays taken.
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

test("a passenger cannot cancel after the trip starts", { skip: apiUp ? false : "API is not running" }, async () => {
  const created = [];
  let poolId = null;
  try {
    for (const who of ["jashim", "nusrat"]) {
      const login = await call(who, "/login", { email: `${who}@dhaka-tesla.local`, password: "pool-demo" });
      assert.equal(login.status, 200);
    }
    await call("jashim", "/vehicles/online", { online: true });
    const ride = await call("nusrat", "/rides", { pickupCode: "banani", destinationCode: "mohakhali", seats: 1 });
    created.push(ride.body.id);
    assert.equal(ride.status, 201);
    const accepted = await call("jashim", `/rides/${ride.body.id}/accept`, {});
    assert.equal(accepted.status, 201);
    poolId = accepted.body.poolId;
    assert.equal((await call("jashim", `/pools/${poolId}/arrive`, {})).status, 200);
    assert.equal((await call("jashim", `/pools/${poolId}/start`, {})).status, 200);
    const late = await call("nusrat", `/rides/${ride.body.id}/cancel`, {});
    assert.equal(late.status, 409);
    assert.equal(late.body.error, "ride cannot be cancelled from this status");
    const mine = await call("nusrat", "/rides/mine");
    assert.equal(mine.body.find((row) => row.id === ride.body.id).status, "started");
  } finally {
    await call("jashim", "/vehicles/online", { online: false });
    const ids = created.filter(Boolean);
    if (!ids.length) return;
    const list = ids.map((id) => `'${id}'`).join(",");
    const sql = poolId
      ? `DELETE FROM ride_events WHERE pool_id='${poolId}' OR ride_request_id IN (${list}); DELETE FROM pool_members WHERE pool_id='${poolId}'; DELETE FROM ride_requests WHERE id IN (${list}); DELETE FROM pools WHERE id='${poolId}';`
      : `DELETE FROM ride_events WHERE ride_request_id IN (${list}); DELETE FROM ride_requests WHERE id IN (${list});`;
    execFileSync("docker", ["exec", "tesla-project-db-1", "psql", "-U", "tesla", "-d", "tesla_pool", "-c", sql], { stdio: "ignore" });
  }
});
