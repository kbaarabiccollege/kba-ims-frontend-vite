// src/pages/superadmin/users/components/PasswordModal.jsx
//
// Dedicated popup for PUT /users/:id/password.
// Kept separate from the edit form since it's a distinct endpoint
// with its own validation (min 6 characters).

import { useEffect, useState } from "react";
import Modal from "../../../../components/common/Modal";
import PasswordInput from "../../../../components/common/PasswordInput";
import { capitalizeFirst } from "../../../../components/common/formatError";

const PasswordModal = ({ user, onClose, onSubmit, submitting, serverError, serverFieldErrors }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  const [backendErrors, setBackendErrors] = useState(serverFieldErrors || {});
  useEffect(() => {
    setBackendErrors(serverFieldErrors || {});
  }, [serverFieldErrors]);

  const fieldError = (field) => capitalizeFirst(errors[field] || backendErrors[field]);

  const validate = () => {
    const next = {};
    if (!password) next.password = "New password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
    if (confirmPassword !== password) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(password);
  };

  return (
    <Modal title="Change Password" onClose={onClose} width={420}>
      <form className="um-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="um-form-error-banner">
            <strong className="um-form-error-title">Validation failed</strong>
            {serverError.trim().replace(/\.+$/, "").toLowerCase() !== "validation failed" && (  <span>{serverError}</span>  )}
          </div>
        )}

        <p className="um-modal-subtext">
          Set a new password for <strong>{user?.name || user?.user_id}</strong>.
        </p>

        <div className="um-field">
          <label htmlFor="new_password">
            New Password <span className="um-required">*</span>
          </label>
          <PasswordInput
            id="new_password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => ({ ...p, password: undefined }));
              setBackendErrors((p) => ({ ...p, password: undefined }));
            }}
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            autoFocus
          />
          {fieldError("password") && <span className="um-field-error">{fieldError("password")}</span>}
        </div>

        <div className="um-field">
          <label htmlFor="confirm_password">
            Confirm Password <span className="um-required">*</span>
          </label>
          <PasswordInput
            id="confirm_password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="um-field-error">{errors.confirmPassword}</span>
          )}
        </div>

        <div className="um-modal-actions">
          <button type="button" className="um-btn um-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="um-btn um-btn-primary" disabled={submitting}>
            {submitting ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PasswordModal;