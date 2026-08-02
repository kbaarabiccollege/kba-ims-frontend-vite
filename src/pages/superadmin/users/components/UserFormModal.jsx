// src/pages/superadmin/users/components/UserFormModal.jsx
//
// Handles both "Add New User" and "Edit User".
// Password is only collected here on create — edits go through
// the separate PasswordModal, per the users table having its own
// dedicated /password endpoint.

import { useEffect, useState } from "react";
import Modal from "../../../../components/common/Modal";
import { ROLE_OPTIONS, STATUS_OPTIONS } from "../constants";
import PasswordInput from "../../../../components/common/PasswordInput";
import { capitalizeFirst } from "../../../../components/common/formatError";

const emptyForm = {
  user_id: "",
  email: "",
  role: "student",
  status: "active",
  password: "",
};

const UserFormModal = ({
  mode,
  initialData,
  onClose,
  onSubmit,
  submitting,
  serverError,
  serverFieldErrors,
}) => {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          user_id: initialData?.user_id ?? "",
          email: initialData?.email ?? "",
          role: initialData?.role ?? "student",
          status: initialData?.status ?? "active",
        }
      : { ...emptyForm }
  );
  const [errors, setErrors] = useState({});

  // Field-level errors returned by the backend (e.g. Joi validation
  // messages). Synced from the prop so a fresh submit always shows the
  // latest server response, but cleared per-field as the user edits.
  const [backendErrors, setBackendErrors] = useState(serverFieldErrors || {});
  useEffect(() => {
    setBackendErrors(serverFieldErrors || {});
  }, [serverFieldErrors]);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setBackendErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const fieldError = (field) => capitalizeFirst(errors[field] || backendErrors[field]);

  const validate = () => {
    const next = {};
    if (!form.user_id.trim()) next.user_id = "User ID is required.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = "Enter a valid email address.";
    }
    if (!form.role) next.role = "Role is required.";
    if (!isEdit && !form.status) next.status = "Status is required.";
    if (!isEdit) {
      if (!form.password) next.password = "Password is required.";
      else if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = isEdit
      ? {
          user_id: form.user_id.trim(),
          email: form.email.trim() || null,
          role: form.role,
          status: form.status,
        }
      : {
          user_id: form.user_id.trim(),
          email: form.email.trim() || null,
          role: form.role,
          status: form.status,
          password: form.password,
        };

    onSubmit(payload);
  };

  return (
    <Modal title={isEdit ? "Edit User" : "Add New User"} onClose={onClose} width={480}>
      <form className="um-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="um-form-error-banner">
            <strong className="um-form-error-title">Validation failed</strong>
            {serverError.trim().replace(/\.+$/, "").toLowerCase() !== "validation failed" && (  <span>{serverError}</span>  )}
          </div>
        )}

        <div className="um-field">
          <label htmlFor="user_id">
            User ID <span className="um-required">*</span>
          </label>
          <input
            id="user_id"
            type="text"
            value={form.user_id}
            onChange={setField("user_id")}
            placeholder="e.g. STF004"
            autoFocus
          />
          {fieldError("user_id") && <span className="um-field-error">{fieldError("user_id")}</span>}
        </div>

        <div className="um-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={setField("email")}
            placeholder="name@albukhari.in"
          />
          {fieldError("email") && <span className="um-field-error">{fieldError("email")}</span>}
        </div>

        <div className="um-field-row">
          <div className="um-field">
            <label htmlFor="role">
              Role <span className="um-required">*</span>
            </label>
            <select id="role" value={form.role} onChange={setField("role")}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {fieldError("role") && <span className="um-field-error">{fieldError("role")}</span>}
          </div>

          <div className="um-field">
            <label htmlFor="status">
              Status <span className="um-required">*</span>
            </label>
            <select id="status" value={form.status} onChange={setField("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {fieldError("status") && <span className="um-field-error">{fieldError("status")}</span>}
          </div>
        </div>

        {!isEdit && (
          <div className="um-field">
            <label htmlFor="password">
              Password <span className="um-required">*</span>
            </label>
            <PasswordInput
              id="password"
              value={form.password}
              onChange={setField("password")}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
            {fieldError("password") && <span className="um-field-error">{fieldError("password")}</span>}
          </div>
        )}

        <div className="um-modal-actions">
          <button type="button" className="um-btn um-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="um-btn um-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add User"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;