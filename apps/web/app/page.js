import { SignIn } from "./sign-in";

// Server page. It asks Express if the API is up, then shows that one line.
const API_URL = process.env.API_URL || "http://localhost:4000";

export default async function HomePage() {
  let apiStatus = "down";

  try {
    // no-store so a refresh sees the API after it restarts.
    const response = await fetch(`${API_URL}/health`, { cache: "no-store" });
    const body = await response.json();
    if (body.ok) apiStatus = "up";
  } catch {
    apiStatus = "down";
  }

  return (
    <main>
      <h1>Dhaka Tesla Pool</h1>
      <p>API is {apiStatus}.</p>
      <SignIn />
    </main>
  );
}
