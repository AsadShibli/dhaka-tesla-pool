import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// Jashim drops Nusrat and Rafiq off, and the trip completes only after both have paid.
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

test("a trip completes only after every rider has paid", { skip: apiUp ? false : "API is not running" }, async () => {
  const created = [];
  let poolId = null;
  let teslapaid = 0;
  try {
    for (const who of ["jashim", "nusrat", "rafiq"]) {
      const login = await call(who, "/login", { email: `${who}@dhaka-tesla.local`, password: "pool-demo" });
      assert.equal(login.status, 200);
    }
    await call("jashim", "/vehicles/online", { online: true });
    const nusrat = await call("nusrat", "/rides", { pickupCode: "banani", destinationCode: "mohakhali", seats: 1 });
    const rafiq = await call("rafiq", "/rides", { pickupCode: "banani", destinationCode: "gulshan-1", seats: 1 });
    created.push(nusrat.body.id, rafiq.body.id);
    poolId = (await call("jashim", `/rides/${nusrat.body.id}/accept`, {})).body.poolId;
    assert.equal((await call("jashim", `/rides/${rafiq.body.id}/accept`, {})).status, 201);
    assert.equal((await call("jashim", `/pools/${poolId}/arrive`, {})).status, 200);
    assert.equal((await call("jashim", `/pools/${poolId}/start`, {})).status, 200);

    // Still in the car: no paying yet, and the trip cannot be completed.
    const early = await call("nusrat", `/rides/${nusrat.body.id}/pay`, { method: "cash" });
    assert.equal(early.status, 409);
    assert.equal(early.body.error, "pay after you are dropped off");
    assert.equal((await call("jashim", `/pools/${poolId}/complete`, {})).status, 409);

    assert.equal((await call("jashim", `/pools/${poolId}/drop-off`, {})).status, 200);
    const open = (await call("jashim", "/pools/open")).body;
    assert.equal(open.status, "dropped_off");
    assert.ok(open.riders.every((rider) => rider.paidMethod === null));

    const paid = await call("nusrat", `/rides/${nusrat.body.id}/pay`, { method: "teslapay" });
    assert.equal(paid.status, 201);
    teslapaid = paid.body.amountPoisha;
    const waiting = await call("jashim", `/pools/${poolId}/complete`, {});
    assert.equal(waiting.status, 409);
    assert.equal(waiting.body.error, "waiting for payment from Rafiq");

    assert.equal((await call("rafiq", `/rides/${rafiq.body.id}/pay`, { method: "cash" })).status, 201);
    const done = await call("jashim", `/pools/${poolId}/complete`, {});
    assert.equal(done.status, 200);
    assert.equal(done.body.riders, 2);
    assert.equal(done.body.collectedPoisha, 7437 + 7225);
    assert.equal((await call("jashim", "/pools/open")).body, null);
  } finally {
    await call("jashim", "/vehicles/online", { online: false });
    const ids = created.filter(Boolean);
    if (!ids.length) return;
    const list = ids.map((id) => `'${id}'`).join(",");
    const sql = [
      `UPDATE wallets SET balance_poisha = balance_poisha + ${teslapaid} WHERE user_id = (SELECT id FROM users WHERE email = 'nusrat@dhaka-tesla.local');`,
      `DELETE FROM payments WHERE ride_request_id IN (${list});`,
      `DELETE FROM ride_events WHERE ride_request_id IN (${list})${poolId ? ` OR pool_id='${poolId}'` : ""};`,
      poolId ? `DELETE FROM pool_members WHERE pool_id='${poolId}';` : "",
      `DELETE FROM ride_requests WHERE id IN (${list});`,
      poolId ? `DELETE FROM pools WHERE id='${poolId}';` : "",
    ].join(" ");
    execFileSync("docker", ["exec", "tesla-project-db-1", "psql", "-U", "tesla", "-d", "tesla_pool", "-c", sql], { stdio: "ignore" });
  }
});
