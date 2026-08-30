// src/components/common/ListPageControls.jsx

// Stateless building blocks shared by every list page (Students, Staff,
// and future modules): the avatar cell, header/row checkboxes, the
// action-icon row, the page header, and pagination. Grouped in one file
// since they're always used together and none carries independent logic.

import { initials } from "../../utils/textHelpers";
import { EditIcon, EyeIcon, KeyIcon, TrashIcon } from "./Icons";

// ---- avatar (photo-or-initials) with click-to-preview ----
export const AvatarCell = ({ name, photoUrl, onPreview }) => (
  <div
    className="st-student-avatar"
    role="button"
    tabIndex={0}
    aria-label={`Preview photo of ${name}`}
    onClick={onPreview}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPreview();
      }
    }}
  >
    {photoUrl ? (
      <img
        className="st-student-photo"
        src={photoUrl}
        alt={name}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextSibling.style.display = "flex";
        }}
      />
    ) : null}
    <div className="st-student-photo-fallback" style={{ display: photoUrl ? "none" : "flex" }}>
      {initials(name)}
    </div>
  </div>
);

// ---- header checkbox (indeterminate must be set via ref) ----
export const SelectAllCheckbox = ({ checked, indeterminate, onChange, label = "Select all rows on this page" }) => (
  <input
    type="checkbox"
    checked={checked}
    ref={(el) => el && (el.indeterminate = indeterminate)}
    onChange={onChange}
    aria-label={label}
  />
);

// ---- row number / checkmark cell ----
export const SelectableRowCell = ({ id, index, selected, onToggle, name }) => (
  <td
    className={`st-col-num${selected ? " st-col-num-selected" : ""}`}
    onClick={() => onToggle(id)}
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle(id);
      }
    }}
  >
    {selected ? <span className="st-col-num-check" aria-hidden="true">✓</span> : index}
  </td>
);

// ---- view/edit/password/delete icon row (omit a handler to hide that button) ----
export const ActionButtonsCell = ({ name, onView, onEdit, onPassword, onDelete }) => (
  <div className="st-actions">
    {onView && (
      <button type="button" className="st-icon-btn" title="View" aria-label={`View ${name}`} onClick={onView}>
        <EyeIcon />
      </button>
    )}
    {onEdit && (
      <button type="button" className="st-icon-btn" title="Edit" aria-label={`Edit ${name}`} onClick={onEdit}>
        <EditIcon />
      </button>
    )}
    {onPassword && (
      <button
        type="button"
        className="st-icon-btn st-icon-btn-key"
        title="Change password"
        aria-label={`Change password for ${name}`}
        onClick={onPassword}
      >
        <KeyIcon />
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        className="st-icon-btn st-icon-btn-danger"
        title="Delete"
        aria-label={`Delete ${name}`}
        onClick={onDelete}
      >
        <TrashIcon />
      </button>
    )}
  </div>
);

// ---- title + total + refresh + "+ New" (extra slot for page-specific buttons) ----
export const ListPageHeader = ({ title, total, refreshing, onRefresh, onCreate, createLabel = "New", extra }) => (
  <div className="st-page-header">
    <div className="st-title-block">
      <h1>{title}</h1>
      <p className="st-title-meta">{total} total</p>
    </div>
    <div className="st-header-actions">
      <button
        type="button"
        className={`st-icon-btn st-refresh-btn${refreshing ? " st-refresh-spinning" : ""}`}
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh list"
        title="Refresh list"
      >
        ↻
      </button>
      <button type="button" className="st-btn st-btn-primary st-btn-add" onClick={onCreate}>
        <span aria-hidden="true">+</span>
        <span>{createLabel}</span>
      </button>
      {extra}
    </div>
  </div>
);

// ---- per-page select + prev/next + range summary ----
export const Pagination = ({ page, setPage, limit, setLimit, total, totalPages, rangeStart, rangeEnd, pageSizeOptions }) => (
  <div className="st-pagination">
    <span className="st-pagination-summary">
      {total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
    </span>
    <div className="st-pagination-controls">
      <label className="st-per-page">
        Per page:
        <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
          {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button type="button" className="st-page-nav" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
        ‹
      </button>
      <span className="st-page-current">{page}</span>
      <button
        type="button"
        className="st-page-nav"
        disabled={page >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  </div>
);


// --- Reusable card-grid list controls (Classrooms, Subjects, etc.) ---
//
// Styled by src/styles/academic.css. That file uses an "ac-" prefix for
// everything defined here, except .st-icon-btn (shared, identical
// primitive also used by ListPageModals.jsx) — don't rename that one.

export const SegmentedToggle = ({ options, value, onChange, ariaLabel }) => (
  <div className="ac-segmented" role="group" aria-label={ariaLabel}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={`ac-segmented-btn${value === opt.value ? " ac-segmented-btn-active" : ""}`}
        onClick={() => onChange(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const SelectionBar = ({
  total,
  itemLabel = "items",
  allSelected,
  someSelected,
  onToggleSelectAll,
  selectedCount,
  bulkActions = [],
  onBulkAction,
}) => (
  <div className="ac-selection-bar">
    <label className="ac-selection-bar-all">
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
        onChange={onToggleSelectAll}
      />
      Select All ({total} {itemLabel})
    </label>
    <div className="ac-selection-bar-actions">
      <span className="ac-selection-bar-count">{selectedCount} selected</span>
      <div className="ac-selection-bar-buttons">
        {bulkActions.map((a) => (
          <button
            key={a.value}
            type="button"
            className={`st-btn st-btn-ghost${a.tone ? ` st-btn-${a.tone}` : ""}`}
            onClick={() => onBulkAction(a.value)}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const EntityCardGrid = ({ children, loading, empty, emptyMessage = "No items match your search or filters." }) => {
  if (loading) return <div className="ac-state-cell">Loading…</div>;
  if (empty) return <div className="ac-state-cell">{emptyMessage}</div>;
  return <div className="ac-card-grid">{children}</div>;
};

// Builds initials ("Zubair Ahmed" -> "ZA") for the avatar fallback
// shown when the backend doesn't return a photo_url — never render a
// broken-image icon.
const getInitials = (name) => {
  if (!name || name === "—") return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
};

export const EntityCard = ({
  id,
  title,
  meta,
  badges = [],
  footerMeta,
  people = [],
  isInactive,
  selected,
  onToggleSelect,
  onEdit,
}) => (
  <div className={`ac-entity-card${isInactive ? " ac-entity-card-inactive" : ""}`}>
    <div className="ac-entity-card-header">
      {isInactive ? (
        <span
          className="ac-entity-card-check ac-entity-card-check-inactive"
          aria-hidden="true"
          title="Inactive classroom"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
      ) : (
        <input
          type="checkbox"
          className="ac-entity-card-check"
          checked={selected}
          onChange={() => onToggleSelect(id)}
          aria-label={`Select ${title}`}
        />
      )}
      {/* Full name is allowed to wrap onto multiple lines here — the
          room-no meta line sits below it instead of competing for the
          same row. */}
      <span className="ac-entity-card-title">{title || "—"}</span>
    </div>

    {meta && <div className="ac-entity-card-meta">{meta}</div>}

    <div className="ac-entity-card-badges">
      {badges.map((b, i) => (
        <span key={i} className={`ac-badge${b.tone ? ` ac-badge-${b.tone}` : ""}`}>{b.label}</span>
      ))}
    </div>

    {footerMeta && <div className="ac-entity-card-meta ac-entity-card-meta-bottom">{footerMeta}</div>}

    <div className="ac-entity-card-people">
      {people.map((p, i) => {
        const initials = getInitials(p.name);
        return (
          <div className="ac-entity-card-person" key={i}>
            <span className="ac-entity-card-person-label">{p.label}:</span>
            {p.avatarUrl ? (
              <img className="ac-avatar-sm" src={p.avatarUrl} alt="" />
            ) : (
              <span className="ac-avatar-sm ac-avatar-fallback" aria-hidden="true">
                {initials || "—"}
              </span>
            )}
            <span className="ac-entity-card-person-name">{p.name || "—"}</span>
          </div>
        );
      })}
      {isInactive && <span className="ac-badge ac-badge-danger ac-entity-card-inactive-tag">Inactive</span>}
    </div>

    <div className="ac-entity-card-actions">
      <button
        type="button"
        className="st-icon-btn"
        onClick={onEdit}
        aria-label={`Edit ${title}`}
        title="Edit"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>
  </div>
);