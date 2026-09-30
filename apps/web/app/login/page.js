"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "../components/Shell";
import { Notice } from "../components/ui";
import { api, errorText } from "../lib/api";
import { colorFor, initials } from "../lib/format";

// The seeded cast. Each shares the demo password from the README.
const CAST = [
  { name: "Jashim", email: "jashim@dhaka-tesla.local", note: "Driver · Bullet" },
  { name: "Nusrat", email: "nusrat@dhaka-tesla.local", note: "Banani → Mohakhali" },
  { name: "Rafiq", email: "rafiq@dhaka-tesla.local", note: "Banani → Gulshan 1" },
  { name: "Shirin", email: "shirin@dhaka-tesla.local", note: "Wants the last seat" },
];
const DEMO_PASSWORD = "pool-demo";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = mode === "signin"
      ? await api("/login", { method: "POST", body: { email, password } })
      : await api("/signup", { method: "POST", body: { name, email, password, role: "passenger" } });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result, mode === "signin" ? "Could not sign in" : "Could not create the account"));
      return;
    }
    router.replace("/");
  }

  function pick(person) {
    setMode("signin");
    setEmail(person.email);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <div className="auth">
      <div className="auth-side">
        <Brand />
        <div>
          <h1>Share a seat.<br />Split the fare.<br />Survive Dhaka traffic.</h1>
          <p>
            Nusrat and Rafiq both leave Banani at 8:41. Jashim can carry them together in Bullet
            when their drop-offs are within 2 km, and each one sees only their own fare.
          </p>
        </div>
        <div className="auth-facts">
          <div><strong>3</strong><span>seats in Bullet</span></div>
          <div><strong>2 km</strong><span>max drop-off gap to share</span></div>
          <div><strong>15%</strong><span>off when pooled</span></div>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-card card">
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""}
              onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""}
              onClick={() => { setMode("signup"); setError(""); }}>Create passenger account</button>
          </div>

          <form onSubmit={submit}>
            {mode === "signup" ? (
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            <Notice>{error}</Notice>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            {mode === "signup" ? (
              <p className="muted mt" style={{ fontSize: "0.82rem" }}>
                New passengers start with an empty TeslaPay wallet and can pay cash. Drivers are added with their Tesla.
              </p>
            ) : null}
          </form>

          <div className="divider">or use the story cast</div>
          <div className="demo-list">
            {CAST.map((person) => (
              <button key={person.email} type="button" className="demo" onClick={() => pick(person)}>
                <span className="avatar" style={{ background: colorFor(person.name) }}>{initials(person.name)}</span>
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.note}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
