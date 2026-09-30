// Every browser call goes to this site's /api routes. They forward the cookie to Express.
// Returns { ok, status, body } so a page can show the API's own error message.
export async function api(path, { method = "GET", body } = {}) {
  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body: data };
  } catch {
    return { ok: false, status: 0, body: { error: "Cannot reach the server. Check your connection." } };
  }
}

export function errorText(result, fallback) {
  return result.body?.error || fallback;
}

// Pages call this after a change so every panel reloads at once, not only the one clicked.
export function announceChange() {
  window.dispatchEvent(new Event("pool-changed"));
}
