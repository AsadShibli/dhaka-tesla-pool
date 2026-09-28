"use client";

import { useState } from "react";

// The form posts to this site. The route below talks to Express and keeps the cookie.
export function SignIn() {
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not sign in");
      return;
    }
    setName(body.name);
    window.dispatchEvent(new Event("rides-changed"));
    window.dispatchEvent(new Event("signed-in"));
  }

  if (name) return <p>Signed in as {name}.</p>;

  return (
    <form onSubmit={onSubmit}>
      <h2>Sign in</h2>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <label>
        Password <input name="password" type="password" required />
      </label>
      <button type="submit">Sign in</button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
