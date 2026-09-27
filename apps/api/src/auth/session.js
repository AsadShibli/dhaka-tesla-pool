import jwt from "jsonwebtoken";

// The login cookie is named token. It is httpOnly, so only the server reads it.
function readToken(req) {
  const raw = req.headers.cookie ?? "";
  const part = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith("token="));
  return part?.slice("token=".length);
}

// Puts the logged-in user on the request. Stops the route if the cookie is missing or bad.
export function requireUser(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "login required" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "login required" });
  }
}
