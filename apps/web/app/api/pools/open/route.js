// Forwards the signed-in cookie. A missing trip is null, not an error.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET(request) {
  const response = await fetch(`${API_URL}/pools/open`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  return Response.json(payload, { status: response.status });
}
