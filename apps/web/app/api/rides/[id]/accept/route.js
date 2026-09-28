// Forwards the signed-in cookie. Express checks seats and whether the ride fits the pool.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(request, { params }) {
  const { id } = await params;
  const response = await fetch(`${API_URL}/rides/${id}/accept`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return Response.json(payload, { status: response.status });
}
