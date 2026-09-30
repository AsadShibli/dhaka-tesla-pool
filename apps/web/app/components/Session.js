"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

const SessionContext = createContext(null);

// Who is signed in, from the httpOnly cookie. No cookie sends the visitor to /login.
export function SessionProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [failure, setFailure] = useState("");

  const refresh = useCallback(async () => {
    const result = await api("/me");
    if (result.ok) {
      setUser(result.body);
      setFailure("");
    } else if (result.status === 401 || result.status === 404) {
      router.replace("/login");
    } else {
      setFailure(result.body?.error || "The ride service is not answering.");
    }
    setChecked(true);
  }, [router]);

  useEffect(() => {
    refresh();
    // Wallet balance changes after a TeslaPay payment.
    window.addEventListener("pool-changed", refresh);
    return () => window.removeEventListener("pool-changed", refresh);
  }, [refresh]);

  async function signOut() {
    await api("/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }

  if (!user && failure) {
    return (
      <div className="center-screen">
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <h2 className="card-title">Cannot reach the API</h2>
          <p className="card-sub" style={{ margin: "8px 0 18px" }}>{failure} Is the api container running?</p>
          <button type="button" className="btn btn-primary" onClick={refresh}>Try again</button>
        </div>
      </div>
    );
  }

  if (!checked || !user) {
    return (
      <div className="center-screen">
        <div><div className="spinner" />Loading your dashboard…</div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
