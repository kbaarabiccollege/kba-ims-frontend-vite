// src/pages/superadmin/additional-class/components/AdditionalClassDeleteModal.jsx

import Modal from "../../../../components/common/Modal";
import { fmtDate } from "../helpers";

const AdditionalClassDeleteModal = ({ row, subject, onClose, onConfirm, submitting, error }) => (
  <Modal title="Delete Additional Class" onClose={onClose} width={440} disableOverlayClose={submitting}>
    {error && (
      <div className="um-form-error-banner" role="alert" style={{ marginBottom: "1rem" }}>
        <strong className="um-form-error-title">{error}</strong>
      </div>
    )}
    <p className="um-modal-subtext">
      Are you sure you want to delete the <strong>{subject}</strong> class on{" "}
      <strong>{fmtDate(row.class_date)}</strong>? This action can't be undone.
    </p>
    <div className="um-modal-actions">
      <button type="button" className="um-btn um-btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
      <button type="button" className="um-btn um-btn-danger" onClick={onConfirm} disabled={submitting}>
        {submitting ? "Deleting…" : "Delete"}
      </button>
    </div>
  </Modal>
);

export default AdditionalClassDeleteModal;