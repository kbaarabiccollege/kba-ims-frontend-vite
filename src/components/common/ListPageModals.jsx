// Small dialogs shared by list pages, all built on the <Modal> shell:
// photo preview, bulk activate/deactivate confirm, and delete confirm.
// Grouped together since a list page typically needs all three at once.

import Modal from "./Modal";
import { initials } from "../../utils/textHelpers";

// ---- photo preview (zoom) — not built on <Modal>, its centered-photo
// layout differs from the standard title+body dialog ----
export const PhotoPreviewModal = ({ item, onClose, subtitle }) => {
  if (!item) return null;
  return (
    <div className="st-modal-overlay st-preview-overlay" role="presentation" onClick={onClose}>
      <div
        className="st-preview-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Photo of ${item.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="st-modal-close st-preview-close" aria-label="Close preview" onClick={onClose}>
          ×
        </button>
        {item.photo_url ? (
          <img
            className="st-preview-photo"
            src={item.photo_url}
            alt={item.name}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div className="st-preview-photo-fallback" style={{ display: item.photo_url ? "none" : "flex" }}>
          {initials(item.name)}
        </div>
        <div className="st-preview-name">{item.name || "—"}</div>
        <div className="st-preview-roll">{subtitle || "—"}</div>
      </div>
    </div>
  );
};

// ---- bulk "Mark as Active" / "Mark as Inactive" confirm ----
export const BulkStatusConfirmModal = ({ action, count, itemLabel = "item", onClose, onConfirm, submitting = false, error = "" }) => {
  const isActivate = action === "activate";
  return (
    <Modal title={isActivate ? "Mark as Active" : "Mark as Inactive"} onClose={submitting ? () => {} : onClose} width={420}>
      <p className="st-modal-confirm-text">
        Are you sure you want to mark <strong>{count}</strong> {itemLabel}
        {count === 1 ? "" : "s"} as {isActivate ? "active" : "inactive"}?
      </p>
      {error && <div className="st-error-banner">{error}</div>}
      <div className="st-modal-actions">
        <button type="button" className="st-btn st-btn-ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className={`st-btn ${isActivate ? "st-btn-primary" : "st-btn-danger-solid"}`}
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? "Updating…" : "Confirm"}
        </button>
      </div>
    </Modal>
  );
};

// ---- delete confirm — variant switches classes between um- (Users
// page) and st- (Students/Staff/etc.) prefixed stylesheets ----
const DELETE_VARIANT_CLASSES = {
  um: {
    text: "um-modal-subtext",
    actions: "um-modal-actions",
    cancel: "um-btn um-btn-ghost",
    confirm: "um-btn um-btn-danger",
  },
  st: {
    text: "st-modal-confirm-text",
    actions: "st-modal-actions",
    cancel: "st-btn st-btn-ghost",
    confirm: "st-btn st-btn-danger-solid",
  },
};

export const DeleteConfirmModal = ({
  variant = "um",
  title = "Delete User",
  user, // legacy Users-page prop — still supported
  itemName,
  itemLabel = "item",
  onClose,
  onConfirm,
  submitting = false,
  error = "",
  note,
  confirmLabel,
}) => {
  const c = DELETE_VARIANT_CLASSES[variant] || DELETE_VARIANT_CLASSES.um;
  const name = itemName ?? user?.name ?? user?.user_id;

  return (
    <Modal title={title} onClose={submitting ? () => {} : onClose} width={420}>
      <p className={c.text}>
        Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
      </p>
      {note && <div className="um-delete-note">{note}</div>}
      {error && <div className="st-error-banner">{error}</div>}
      <div className={c.actions}>
        <button type="button" className={c.cancel} onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="button" className={c.confirm} onClick={onConfirm} disabled={submitting}>
          {submitting ? "Deleting…" : confirmLabel || `Delete ${itemLabel}`}
        </button>
      </div>
    </Modal>
  );
};