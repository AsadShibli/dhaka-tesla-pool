"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

// Area names and centers from the API. Loaded once per page.
export function useAreas() {
  const [areas, setAreas] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/areas").then((result) => {
      if (result.ok) setAreas(result.body);
      else setError(result.body?.error || "Could not load areas");
    });
  }, []);

  const byCode = Object.fromEntries(areas.map((area) => [area.code, area]));
  const nameOf = (code) => byCode[code]?.name ?? code;
  return { areas, byCode, nameOf, error };
}
