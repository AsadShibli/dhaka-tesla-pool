// Forwards the signed-in cookie. Only a driver receives the Tesla's online flag.
const API_URL = process.env.API_URL || "http://localhost:4000";

async function forward(request, method, body) {
  const response = await fetch(`${API_URL}/vehicles/online`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return Response.json(payload, { status: response.status });
}

export function GET(request) {
  return forward(request, "GET");
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  return forward(request, "POST", { online: body.online });
}
