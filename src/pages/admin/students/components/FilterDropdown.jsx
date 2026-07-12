// src/pages/admin/students/components/FilterDropdown.jsx
//
// Custom (non-native <select>) dropdown used for the Classroom and Batch
// filters. Unlike a normal filter, this one does NOT load its options on
// page mount — the parent page keeps `loaded=false` until the person hits
// "Fetch" inside the panel (or the refresh icon once already loaded), at
// which point `onFetch` runs (in Students.jsx this calls both the
// classrooms API and the batches API together, per the spec).

import { useEffect, useRef, useState } from "react";

const FilterDropdown = ({
  label, // e.g. "Classroom"
  allLabel, // e.g. "All Classrooms"
  options, // [{ id, label }]
  value, // selected id, or 'all'
  onChange,
  loaded,
  loading,
  onFetch,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickAway = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [open]);

  const selectedOption = options.find((o) => String(o.id) === String(value));
  const triggerLabel = value === "all" || !selectedOption ? allLabel : selectedOption.label;

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="st-filter-dropdown" ref={ref}>
      <button
        type="button"
        className={`st-filter-trigger${open ? " st-filter-trigger-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="st-filter-trigger-label">{triggerLabel}</span>
        <span className="st-filter-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="st-filter-panel" role="menu">
          <div className="st-filter-panel-header">
            <span>{label}</span>
            <button
              type="button"
              className="st-filter-fetch-btn"
              onClick={onFetch}
              disabled={loading}
              title={loaded ? `Refresh ${label.toLowerCase()}s` : `Fetch ${label.toLowerCase()}s`}
            >
              {loading ? "Fetching…" : loaded ? "↻ Refresh" : "⇩ Fetch"}
            </button>
          </div>

          <div className="st-filter-options">
            <button
              type="button"
              className={`st-filter-option${value === "all" ? " st-filter-option-active" : ""}`}
              onClick={() => handleSelect("all")}
            >
              {allLabel}
            </button>

            {!loaded && !loading && (
              <div className="st-filter-empty">Hit fetch to load {label.toLowerCase()}s</div>
            )}
            {loading && <div className="st-filter-empty">Loading…</div>}

            {loaded &&
              !loading &&
              options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className={`st-filter-option${
                    String(value) === String(o.id) ? " st-filter-option-active" : ""
                  }`}
                  onClick={() => handleSelect(o.id)}
                >
                  {o.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;