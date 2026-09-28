// Forwards the signed-in cookie and the method, cash or teslapay.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_URL}/rides/${id}/pay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ method: body.method }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return Response.json(payload, { status: response.status });
}
