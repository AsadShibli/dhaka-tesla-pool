// Same-origin login. Copies Express's httpOnly cookie onto this site.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  const nextResponse = Response.json(payload, { status: response.status });
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    nextResponse.headers.append("set-cookie", cookie);
  }
  return nextResponse;
}
