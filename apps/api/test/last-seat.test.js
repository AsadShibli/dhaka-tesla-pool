import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Two accepts race for one free seat. The SQL update keeps seats_taken within capacity.
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

test("two riders cannot take Bullet's last seat", { skip: apiUp ? false : "API is not running" }, async () => {
  const created = [];
  let poolId = null;
  try {
    await login("jashim");
    await login("rafiq");
    await login("nusrat");
    await login("shirin");
    await call("jashim", "/vehicles/online", { online: true });

    const holding = await call("rafiq", "/rides", { pickupCode: "banani", destinationCode: "gulshan-1", seats: 2 });
    created.push(holding.body.id);
    assert.equal(holding.status, 201, JSON.stringify(holding.body));
    // An empty body still posts. Accept has no JSON of its own.
    const accepted = await call("jashim", `/rides/${holding.body.id}/accept`, {});
    assert.equal(accepted.status, 201);
    poolId = accepted.body.poolId;
    assert.equal(accepted.body.seatsTaken, 2);

    const nusrat = await call("nusrat", "/rides", { pickupCode: "banani", destinationCode: "mohakhali", seats: 1 });
    const shirin = await call("shirin", "/rides", { pickupCode: "banani", destinationCode: "mohakhali", seats: 1 });
    created.push(nusrat.body.id, shirin.body.id);
    const [first, second] = await Promise.all([
      call("jashim", `/rides/${nusrat.body.id}/accept`, {}),
      call("jashim", `/rides/${shirin.body.id}/accept`, {}),
    ]);
    const results = [first, second].sort((a, b) => a.status - b.status);
    assert.equal(results[0].status, 201);
    assert.equal(results[0].body.seatsTaken, 3);
    assert.equal(results[1].status, 409);
    assert.equal(results[1].body.error, "not enough seats");
  } finally {
    await call("jashim", "/vehicles/online", { online: false });
    const ids = created.filter(Boolean);
    if (!ids.length) return;
    const list = ids.map((id) => `'${id}'`).join(",");
    const poolSql = poolId
      ? `DELETE FROM ride_events WHERE pool_id='${poolId}' OR ride_request_id IN (${list}); DELETE FROM pool_members WHERE pool_id='${poolId}'; DELETE FROM ride_requests WHERE id IN (${list}); DELETE FROM pools WHERE id='${poolId}';`
      : `DELETE FROM ride_events WHERE ride_request_id IN (${list}); DELETE FROM ride_requests WHERE id IN (${list});`;
    execFileSync("docker", ["exec", "tesla-project-db-1", "psql", "-U", "tesla", "-d", "tesla_pool", "-c",
      `${poolSql}`], { stdio: "ignore" });
  }
});
