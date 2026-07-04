// src/components/common/DeleteConfirmModal.jsx
//
// Intentionally NOT wired to a delete endpoint yet (none was given).
// Confirming just closes the dialog so the icon + flow are ready
// to connect once a DELETE /users/:id endpoint exists.

import Modal from "./Modal";

const DeleteConfirmModal = ({ user, onClose, onConfirm }) => {
  return (
    <Modal title="Delete User" onClose={onClose} width={420}>
      <div className="um-form">
        <p className="um-modal-subtext">
          Are you sure you want to delete <strong>{user?.name || user?.user_id}</strong>? This
          action cannot be undone.
        </p>
        <div className="um-delete-note">
          Note: delete isn't connected to the backend yet — this is a placeholder confirmation.
        </div>
        <div className="um-modal-actions">
          <button type="button" className="um-btn um-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="um-btn um-btn-danger" onClick={onConfirm}>
            Delete User
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;