// Forwards the signed-in cookie. Express returns only events this person is part of.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET(request) {
  const response = await fetch(`${API_URL}/events/mine`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ([]));
  return Response.json(payload, { status: response.status });
}
