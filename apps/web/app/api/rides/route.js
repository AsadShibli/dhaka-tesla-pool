// Forwards the signed-in cookie so Express can store the passenger's request.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_URL}/rides`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      pickupCode: body.pickupCode,
      destinationCode: body.destinationCode,
      seats: body.seats,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return Response.json(payload, { status: response.status });
}
