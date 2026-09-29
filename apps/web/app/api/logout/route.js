// Drops the login cookie so another person can sign in in this tab.
export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", "token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return response;
}
