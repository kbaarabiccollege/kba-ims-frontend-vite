// src/hooks/useDebouncedValue.jsx
//
// Generic debounce hook. Used so the search box doesn't fire a
// network request on every keystroke.

import { useEffect, useState } from "react";

export default function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}