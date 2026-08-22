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