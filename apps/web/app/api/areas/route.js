// Public list of pickup and drop-off areas. No cookie is needed.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET() {
  const response = await fetch(`${API_URL}/areas`, { cache: "no-store" });
  const payload = await response.json().catch(() => ([]));
  return Response.json(payload, { status: response.status });
}
