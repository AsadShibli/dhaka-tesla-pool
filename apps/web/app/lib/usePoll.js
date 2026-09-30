"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

// Loads a GET route, then again every few seconds and whenever something changes.
// Other people move the ride forward (Jashim accepts, Nusrat cancels), so the screen polls.
// A null path pauses polling, e.g. waiting rides while the Tesla is offline.
export function usePoll(path, intervalMs = 4000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!path) return;
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
    // A new path must not show the previous path's rows while it loads.
    setData(null);
    setError("");
    setLoading(Boolean(path));
    if (!path) return undefined;
    alive.current = true;
    load();
    const timer = setInterval(load, intervalMs);
    window.addEventListener("pool-changed", load);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("pool-changed", load);
    };
  }, [path, load, intervalMs]);

  return { data, error, loading, reload: load };
}
