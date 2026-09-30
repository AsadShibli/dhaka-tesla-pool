// The top bar shows whether Express answers. Down is a normal answer, not a crash.
const API_URL = process.env.API_URL || "http://localhost:4000";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/health`, { cache: "no-store" });
    const body = await response.json();
    return Response.json({ ok: Boolean(body.ok) });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
