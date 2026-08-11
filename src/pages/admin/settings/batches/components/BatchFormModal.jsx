// src/pages/admin/settings/batches/components/BatchFormModal.jsx
//
// Handles both "Add New Batch" and "Edit Batch".
// No status field — batches have no status on the backend.

import { useEffect, useState } from "react";
import Modal from "../../../../../components/common/Modal";
import SearchableDropdown from "../../../../../components/common/SearchableDropdown";
import { COURSE_OPTIONS } from "../constants";
import { capitalizeFirst } from "../../../../../components/common/formatError";

const emptyForm = {
  batch_name: "",
  course: COURSE_OPTIONS[0]?.value ?? "",
  start_year: "",
  end_year: "",
};

const BatchFormModal = ({
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
          batch_name: initialData?.batch_name ?? "",
          course: initialData?.course ?? COURSE_OPTIONS[0]?.value ?? "",
          start_year: initialData?.start_year ?? "",
          end_year: initialData?.end_year ?? "",
        }
      : { ...emptyForm }
  );
  const [errors, setErrors] = useState({});

  const [backendErrors, setBackendErrors] = useState(serverFieldErrors || {});
  useEffect(() => {
    setBackendErrors(serverFieldErrors || {});
  }, [serverFieldErrors]);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setBackendErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // SearchableDropdown's onChange passes the selected id directly
  // (not an event), so it needs its own setter shape.
  const setDropdownField = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setBackendErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const fieldError = (field) => capitalizeFirst(errors[field] || backendErrors[field]);

  const validate = () => {
    const next = {};
    if (!form.batch_name.trim()) next.batch_name = "Batch name is required.";
    if (!form.course) next.course = "Course is required.";

    const start = Number(form.start_year);
    const end = Number(form.end_year);

    if (!form.start_year) next.start_year = "Start year is required.";
    else if (!Number.isInteger(start)) next.start_year = "Enter a valid year.";

    if (!form.end_year) next.end_year = "End year is required.";
    else if (!Number.isInteger(end)) next.end_year = "Enter a valid year.";
    else if (form.start_year && end < start) next.end_year = "End year must be after start year.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      batch_name: form.batch_name.trim(),
      course: form.course,
      start_year: Number(form.start_year),
      end_year: Number(form.end_year),
    };

    onSubmit(payload);
  };

  return (
    <Modal title={isEdit ? "Edit Batch" : "Add New Batch"} onClose={onClose} width={480}>
      <form className="bm-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="bm-form-error-banner">
            <strong className="bm-form-error-title">Validation failed</strong>
            {serverError.trim().replace(/\.+$/, "").toLowerCase() !== "validation failed" && (
              <span>{serverError}</span>
            )}
          </div>
        )}

        <div className="bm-field">
          <label htmlFor="batch_name">
            Batch Name <span className="bm-required">*</span>
          </label>
          <input
            id="batch_name"
            type="text"
            value={form.batch_name}
            onChange={setField("batch_name")}
            placeholder="e.g. CSE 2023-27"
            autoFocus
          />
          {fieldError("batch_name") && <span className="bm-field-error">{fieldError("batch_name")}</span>}
        </div>

        <div className="bm-field">
          <label htmlFor="course">
            Course <span className="bm-required">*</span>
          </label>
          <SearchableDropdown
            id="course"
            label=""
            allLabel="Select course"
            options={COURSE_OPTIONS.map((c) => ({ id: c.value, label: c.label }))}
            value={form.course || "all"}
            onChange={(v) => setDropdownField("course")(v === "all" ? "" : v)}
          />
          {fieldError("course") && <span className="bm-field-error">{fieldError("course")}</span>}
        </div>

        <div className="bm-field-row">
          <div className="bm-field">
            <label htmlFor="start_year">
              Start Year <span className="bm-required">*</span>
            </label>
            <input
              id="start_year"
              type="number"
              value={form.start_year}
              onChange={setField("start_year")}
              placeholder="e.g. 2023"
            />
            {fieldError("start_year") && (
              <span className="bm-field-error">{fieldError("start_year")}</span>
            )}
          </div>

          <div className="bm-field">
            <label htmlFor="end_year">
              End Year <span className="bm-required">*</span>
            </label>
            <input
              id="end_year"
              type="number"
              value={form.end_year}
              onChange={setField("end_year")}
              placeholder="e.g. 2027"
            />
            {fieldError("end_year") && <span className="bm-field-error">{fieldError("end_year")}</span>}
          </div>
        </div>

        <div className="bm-modal-actions">
          <button type="button" className="bm-btn bm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="bm-btn bm-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Batch"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BatchFormModal;