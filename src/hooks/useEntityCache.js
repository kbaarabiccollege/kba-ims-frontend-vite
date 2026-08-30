// src/hooks/useEntityCache.js
//
// Generic id -> entity cache for resolving foreign keys (advisor_id,
// leader_id, etc.) client-side when the list endpoint doesn't return
// them pre-joined. Dedupes concurrent/repeated requests for the same id.
//
// LONG-TERM NOTE: this does one HTTP request per unique id (N+1). Fine
// for a page of ~12-25 classrooms with a handful of unique advisors,
// but if this list grows or advisors/leaders repeat less, the better
// fix is having getClassrooms() return advisor_name/advisor_avatar
// (and leader_*) directly via a backend join, and deleting this hook.

import { useCallback, useRef, useState } from "react";

export function useEntityCache(fetchFn) {
  const [cache, setCache] = useState({}); // id -> { loading, data, error }
  const inFlight = useRef(new Set());

  const ensure = useCallback(
    (id) => {
      if (id === null || id === undefined) return;
      const key = String(id);
      if (cache[key] || inFlight.current.has(key)) return;

      inFlight.current.add(key);
      setCache((prev) => ({ ...prev, [key]: { loading: true } }));

      fetchFn(id)
        .then((data) => {
          setCache((prev) => ({ ...prev, [key]: { loading: false, data } }));
        })
        .catch(() => {
          setCache((prev) => ({ ...prev, [key]: { loading: false, error: true } }));
        })
        .finally(() => {
          inFlight.current.delete(key);
        });
    },
    [cache, fetchFn]
  );

  return { cache, ensure };
}