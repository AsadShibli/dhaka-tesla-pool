import assert from "node:assert/strict";
import test from "node:test";

// Offline Bullet takes no riders, so Jashim is not shown who is waiting until he goes online.
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


test("an offline driver does not see waiting rides", { skip: apiUp ? false : "API is not running" }, async () => {
  const login = await call("jashim", "/login", { email: "jashim@dhaka-tesla.local", password: "pool-demo" });
  assert.equal(login.status, 200);
  try {
    await call("jashim", "/vehicles/online", { online: false });
    const hidden = await call("jashim", "/rides/waiting");
    assert.equal(hidden.status, 409);
    assert.equal(hidden.body.error, "go online to see waiting rides");

    await call("jashim", "/vehicles/online", { online: true });
    const shown = await call("jashim", "/rides/waiting");
    assert.equal(shown.status, 200);
    assert.ok(Array.isArray(shown.body));
  } finally {
    await call("jashim", "/vehicles/online", { online: false });
  }
});
