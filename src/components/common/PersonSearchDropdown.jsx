// src/components/common/PersonSearchDropdown.jsx
//
// Async, searchable "pick a person" dropdown — shows a photo (or
// initials fallback), name, and a sub-label (roll number / staff UID).
// Used for Advisor (staff) and Leader (student) fields on Classrooms,
// and reusable anywhere else a staff/student picker is needed.
//
// Unlike SearchableDropdown, this one doesn't take a static `options`
// list — it calls `fetchFn({ q, page, limit, ...extraParams })` on
// open and on every debounced keystroke, so it works with paginated
// search endpoints like /api/students/list?q=zubair&batch_id=2.

import { useEffect, useRef, useState } from "react";
import { initials } from "../../utils/textHelpers";
import "../../styles/PersonSearchDropdown.css";

const DEBOUNCE_MS = 300;
const PAGE_LIMIT = 20;

const PersonSearchDropdown = ({
  id,
  value,
  selectedPerson,
  onChange,
  fetchFn,
  getSubLabel,
  extraParams = {},
  disabled = false,
  placeholder = "Select…",
  disabledMessage,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  // Close on outside click.
  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const extraParamsKey = JSON.stringify(extraParams);

  const runSearch = (q) => {
    if (disabled) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    fetchFn({ q, page: 1, limit: PAGE_LIMIT, ...extraParams })
      .then((rows) => {
        if (requestId !== requestIdRef.current) return; // stale response
        setResults(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setError("Couldn't load results.");
        setResults([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  };

  // Fetch on open, and whenever the query or extraParams (e.g. batch_id) change while open.
  useEffect(() => {
    if (!open || disabled) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), query ? DEBOUNCE_MS : 0);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, extraParamsKey, disabled]);

  // If the picker gets disabled (e.g. batch cleared) or its scope
  // changes, close it and drop stale results.
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setResults([]);
      setQuery("");
    }
  }, [disabled]);

  const handleSelect = (person) => {
    onChange(person.id, person);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const displayName = selectedPerson?.name;
  const displayPhoto = selectedPerson?.photo_url;

  return (
    <div className={`psd-root${disabled ? " psd-disabled" : ""}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="psd-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {displayName ? (
          <span className="psd-selected">
            {displayPhoto ? (
              <img className="psd-avatar" src={displayPhoto} alt="" />
            ) : (
              <span className="psd-avatar psd-avatar-fallback">{initials(displayName)}</span>
            )}
            <span className="psd-selected-name">{displayName}</span>
          </span>
        ) : (
          <span className="psd-placeholder">{disabled ? disabledMessage || placeholder : placeholder}</span>
        )}
        <span className="psd-trigger-icons">
          {value != null && !disabled && (
            <span className="psd-clear" role="button" tabIndex={-1} onClick={handleClear} aria-label="Clear selection">
              ×
            </span>
          )}
          <span className="psd-caret" aria-hidden="true">▾</span>
        </span>
      </button>

      {open && !disabled && (
        <div className="psd-panel" role="listbox">
          <input
            type="text"
            className="psd-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            autoFocus
          />
          <div className="psd-results">
            {loading ? (
              <div className="psd-state-row">Searching…</div>
            ) : error ? (
              <div className="psd-state-row psd-state-error">{error}</div>
            ) : results.length === 0 ? (
              <div className="psd-state-row">No matches.</div>
            ) : (
              results.map((person) => (
                <div
                  key={person.id}
                  className={`psd-result-row${person.id === value ? " psd-result-row-active" : ""}`}
                  role="option"
                  aria-selected={person.id === value}
                  onClick={() => handleSelect(person)}
                >
                  {person.photo_url ? (
                    <img className="psd-avatar" src={person.photo_url} alt="" />
                  ) : (
                    <span className="psd-avatar psd-avatar-fallback">{initials(person.name)}</span>
                  )}
                  <span className="psd-result-text">
                    <span className="psd-result-name">{person.name || "—"}</span>
                    {getSubLabel && <span className="psd-result-sub">{getSubLabel(person)}</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonSearchDropdown;