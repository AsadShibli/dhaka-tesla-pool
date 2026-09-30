"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

// Loads a GET route, then again every few seconds and whenever something changes.
// Other people move the ride forward (Jashim accepts, Nusrat cancels), so the screen polls.
export function usePoll(path, intervalMs = 4000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const result = await api(path);
    if (!alive.current) return;
    if (result.ok) {
      setData(result.body);
      setError("");
    } else {
      setError(result.body?.error || "Could not load");
    }
    setLoading(false);
  }, [path]);

  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(load, intervalMs);
    window.addEventListener("pool-changed", load);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("pool-changed", load);
    };
  }, [load, intervalMs]);

  return { data, error, loading, reload: load };
}
