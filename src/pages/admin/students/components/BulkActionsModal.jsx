// src/pages/admin/students/components/BulkActionsModal.jsx
//
// One modal, three modes, driven by the `action` prop:
//   - "update"     -> "Bulk Update" button: optionally re-assign
//                     batch / classroom / status for every selected student.
//                     Only fields the user actually touches are sent, so an
//                     untouched field doesn't overwrite existing data.
//   - "activate"   -> "Mark as Active" button: simple confirm.
//   - "deactivate" -> "Mark as Inactive" button: simple confirm.
//
// This is a self-contained overlay/panel (doesn't depend on the shared
// Modal.jsx used elsewhere) so it renders correctly even if that
// component's prop API differs. Swap it out for the shared <Modal> if you'd
// rather keep everything on one implementation.

import { useState } from "react";

const BulkActionsModal = ({
  action, // 'update' | 'activate' | 'deactivate'
  count,
  classrooms,
  batches,
  onClose,
  onConfirm, // (changes) => void   — changes is {} for activate/deactivate
  submitting,
  error,
}) => {
  const [batchId, setBatchId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [status, setStatus] = useState("");

  const isUpdate = action === "update";
  const isActivate = action === "activate";

  const title = isUpdate
    ? "Bulk Update Students"
    : isActivate
    ? "Mark Students as Active"
    : "Mark Students as Inactive";

  const handleConfirm = () => {
    if (isUpdate) {
      const changes = {};
      if (batchId) changes.batch_id = Number(batchId);
      if (classroomId) changes.classroom_id = Number(classroomId);
      if (status) changes.status = status;
      onConfirm(changes);
    } else {
      onConfirm({ status: isActivate ? "active" : "inactive" });
    }
  };

  return (
    <div className="st-modal-overlay" role="presentation" onClick={submitting ? undefined : onClose}>
      <div
        className="st-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="st-modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="st-modal-close"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="st-modal-body">
          <p className="st-modal-subtext">
            This will apply to <strong>{count}</strong> selected student{count === 1 ? "" : "s"}.
          </p>

          {error && <div className="st-error-banner">{error}</div>}

          {isUpdate ? (
            <div className="st-bulk-form">
              <div className="st-field">
                <label htmlFor="bulk-batch">Batch</label>
                <select id="bulk-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">Leave unchanged</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="st-field">
                <label htmlFor="bulk-classroom">Classroom</label>
                <select
                  id="bulk-classroom"
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                >
                  <option value="">Leave unchanged</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="st-field">
                <label htmlFor="bulk-status">Status</label>
                <select id="bulk-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Leave unchanged</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          ) : (
            <p className="st-modal-confirm-text">
              Are you sure you want to mark these students as{" "}
              <strong>{isActivate ? "active" : "inactive"}</strong>?
            </p>
          )}

          <div className="st-modal-actions">
            <button type="button" className="st-btn st-btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className={
                !isUpdate && !isActivate ? "st-btn st-btn-danger" : "st-btn st-btn-primary"
              }
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "Saving…" : isUpdate ? "Update" : isActivate ? "Mark as Active" : "Mark as Inactive"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsModal;