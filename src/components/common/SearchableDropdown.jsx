// src/components/common/SearchableDropdown.jsx
//
// Reusable custom (non-native <select>) dropdown. Two modes:
//
//   1. Static list  -> pass `options` only. Good for small, fixed lists
//      (e.g. a Status filter). No search box is shown unless `searchable`.
//
//   2. Server-searched list -> pass `searchable` + `onFetch`. The panel
//      keeps the original "Fetch"/"↻ Refresh" button (nothing loads on
//      page mount — it's on-demand, per the original spec) and now also
//      shows a search input. Typing does NOT call the API by itself;
//      hitting Fetch/Refresh calls `onFetch(query)`, which the parent
//      uses to hit its API with a `q` param, e.g. `/api/batches?q=2026`.
//      Once the list has been loaded at least once (`loaded` is true),
//      further typing auto-refreshes it (debounced) without needing
//      another click, so search still feels live once you've opened it.
//
// Because the visible `options` list can change as the person searches,
// the currently selected item might not be present in it any more. Pass
// `selectedLabel` (e.g. from a parent-side id->label cache) so the trigger
// button can keep showing the right text even then.
//
// Usage:
//   <SearchableDropdown
//     label="Classroom"
//     allLabel="All Classrooms"
//     options={classroomOptions}       // [{ id, label }]
//     value={classroomId}
//     onChange={setClassroomId}
//     searchable
//     onFetch={searchClassrooms}       // (q) => void — Fetch/Refresh button + auto after first load
//     loaded={classroomsLoaded}
//     loading={classroomsLoading}
//     selectedLabel={classroomsIndex[classroomId]}
//   />

import { useEffect, useRef, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import "../../styles/SearchableDropdown.css";

const SearchableDropdown = ({
  label,
  allLabel = "All",
  options = [], // [{ id, label }]
  value, // selected id, or 'all'
  onChange,
  searchable = false,
  onFetch, // (query: string) => void — used for live search-as-you-type; parent now loads the initial list on mount
  loaded = true, // set to false for on-demand lists (classroom/batch) until the parent's initial load resolves
  loading = false,
  hideFetchButton = false, // true for lists the parent auto-loads on page mount (classroom/batch)
  placeholder = "Search…",
  className = "",
  searchDebounceMs = 350,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, searchDebounceMs);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickAway = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [open]);

  // Once the list has been loaded at least once (via the Fetch/Refresh
  // button), keep it live-searched as the person types. Before that
  // first load, typing does nothing — you still need to hit Fetch.
  useEffect(() => {
    if (!searchable || !onFetch || !open || !loaded) return;
    onFetch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchable, open, loaded, debouncedQuery]);

  // Reset the search text each time the dropdown closes, so reopening
  // starts from the default (unfiltered) list again.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selectedOption = options.find((o) => String(o.id) === String(value));
  const triggerLabel =
    value === "all" || value === undefined || value === null
      ? allLabel
      : selectedOption?.label ?? "";

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className={`sd-dropdown ${className}`} ref={ref}>
      <button
        type="button"
        className={`sd-trigger${open ? " sd-trigger-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="sd-trigger-label">{triggerLabel || allLabel}</span>
        <span className="sd-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="sd-panel" role="menu">
          {(label || (onFetch && !hideFetchButton)) && (
            <div className="sd-panel-header">
              <span>{label}</span>
              {onFetch && !hideFetchButton && (
                <button
                  type="button"
                  className="sd-fetch-btn"
                  onClick={() => onFetch(query)}
                  disabled={loading}
                  title={loaded ? `Refresh ${(label || "list").toLowerCase()}s` : `Fetch ${(label || "list").toLowerCase()}s`}
                >
                  {loading ? "Fetching…" : loaded ? "↻ Refresh" : "⇩ Fetch"}
                </button>
              )}
              {onFetch && hideFetchButton && loading && (
                <span className="sd-fetch-status">Refreshing…</span>
              )}
            </div>
          )}

          {searchable && (
            <div className="sd-search">
              <span className="sd-search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                aria-label={`Search ${label ? label.toLowerCase() : "options"}`}
              />
            </div>
          )}

          <div className="sd-options">
            <button
              type="button"
              className={`sd-option${value === "all" ? " sd-option-active" : ""}`}
              onClick={() => handleSelect("all")}
            >
              {allLabel}
            </button>

            {!loaded && !loading && onFetch && (
              <div className="sd-empty">
                {hideFetchButton
                  ? `Loading ${(label || "options").toLowerCase()}s…`
                  : `Hit fetch to load ${(label || "options").toLowerCase()}s`}
              </div>
            )}

            {loading && <div className="sd-empty">Loading…</div>}

            {loaded && !loading && options.length === 0 && (
              <div className="sd-empty">No results found</div>
            )}

            {loaded &&
              !loading &&
              options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className={`sd-option${
                    String(value) === String(o.id) ? " sd-option-active" : ""
                  }`}
                  onClick={() => handleSelect(o.id)}
                >
                  <span className="sd-option-label">{o.label}</span>
                  {o.meta && <span className="sd-option-meta">{o.meta}</span>}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;