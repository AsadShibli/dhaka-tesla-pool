// Forwards the signed-in cookie. Express allows this only after arrival.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(request, { params }) {
  const { id } = await params;
  const response = await fetch(`${API_URL}/pools/${id}/start`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return Response.json(payload, { status: response.status });
}
