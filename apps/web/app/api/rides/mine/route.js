// Forwards the signed-in cookie. Express returns that passenger's rows only.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET(request) {
  const response = await fetch(`${API_URL}/rides/mine`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return Response.json(payload, { status: response.status });
}
