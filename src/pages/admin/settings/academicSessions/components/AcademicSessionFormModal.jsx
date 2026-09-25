// src/pages/admin/settings/academicSessions/components/AcademicSessionFormModal.jsx
//
// Handles both "Add New Academic Session" and "Edit Academic Session".
// Mirrors BatchFormModal.jsx structure/behaviour. Fields: name, course,
// term_type (ODD/EVEN), start_date, end_date, is_current, is_active.
// is_current and is_active stay as toggles (checkboxes) per spec.

import { useEffect, useState } from "react";
import Modal from "../../../../../components/common/Modal";
import SearchableDropdown from "../../../../../components/common/SearchableDropdown";
import { COURSES } from "../../../../../utils/constants";
import { capitalizeFirst } from "../../../../../utils/textHelpers";

const COURSE_OPTIONS = Object.entries(COURSES).map(([id, label]) => ({
  value: Number(id),
  label,
}));

const TERM_OPTIONS = [
  { value: "ODD", label: "Odd" },
  { value: "EVEN", label: "Even" },
];

const emptyForm = {
  name: "",
  course: COURSE_OPTIONS[0]?.value ?? "",
  term_type: TERM_OPTIONS[0]?.value ?? "",
  start_date: "",
  end_date: "",
  is_current: false,
  is_active: true,
};

const AcademicSessionFormModal = ({
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
          name: initialData?.name ?? "",
          course: initialData?.course ?? COURSE_OPTIONS[0]?.value ?? "",
          term_type: initialData?.term_type ?? TERM_OPTIONS[0]?.value ?? "",
          start_date: initialData?.start_date ?? "",
          end_date: initialData?.end_date ?? "",
          is_current: !!initialData?.is_current,
          is_active: initialData?.is_active != null ? !!initialData.is_active : true,
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

  const setCheckboxField = (field) => (e) => {
    const checked = e.target.checked;
    setForm((prev) => ({ ...prev, [field]: checked }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setBackendErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const fieldError = (field) => capitalizeFirst(errors[field] || backendErrors[field]);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.course) next.course = "Course is required.";
    if (!form.term_type) next.term_type = "Term is required.";

    if (!form.start_date) next.start_date = "Start date is required.";
    if (!form.end_date) next.end_date = "End date is required.";
    else if (form.start_date && new Date(form.end_date) < new Date(form.start_date)) {
      next.end_date = "End date must be after start date.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      course: form.course,
      term_type: form.term_type,
      start_date: form.start_date,
      end_date: form.end_date,
      is_current: form.is_current ? 1 : 0,
      is_active: form.is_active ? 1 : 0,
    };

    onSubmit(payload);
  };

  return (
    <Modal
      title={isEdit ? "Edit Academic Session" : "Add New Academic Session"}
      onClose={onClose}
      width={480}
    >
      <form className="as-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="as-form-error-banner">
            <strong className="as-form-error-title">Validation failed</strong>
            {serverError.trim().replace(/\.+$/, "").toLowerCase() !== "validation failed" && (
              <span>{serverError}</span>
            )}
          </div>
        )}

        <div className="as-field">
          <label htmlFor="name">
            Name <span className="as-required">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={setField("name")}
            placeholder="e.g. 2025-26 Odd Semester"
            autoFocus
          />
          {fieldError("name") && <span className="as-field-error">{fieldError("name")}</span>}
        </div>

        <div className="as-field-row">
          <div className="as-field">
            <label htmlFor="course">
              Course <span className="as-required">*</span>
            </label>
            <SearchableDropdown
              id="course"
              label=""
              allLabel="Select course"
              options={COURSE_OPTIONS.map((c) => ({ id: c.value, label: c.label }))}
              value={form.course}
              onChange={setDropdownField("course")}
            />
            {fieldError("course") && <span className="as-field-error">{fieldError("course")}</span>}
          </div>

          <div className="as-field">
            <label htmlFor="term_type">
              Term <span className="as-required">*</span>
            </label>
            <SearchableDropdown
              id="term_type"
              label=""
              allLabel="Select term"
              options={TERM_OPTIONS.map((t) => ({ id: t.value, label: t.label }))}
              value={form.term_type}
              onChange={setDropdownField("term_type")}
            />
            {fieldError("term_type") && <span className="as-field-error">{fieldError("term_type")}</span>}
          </div>
        </div>

        <div className="as-field-row">
          <div className="as-field">
            <label htmlFor="start_date">
              Start Date <span className="as-required">*</span>
            </label>
            <input
              id="start_date"
              type="date"
              value={form.start_date}
              onChange={setField("start_date")}
            />
            {fieldError("start_date") && (
              <span className="as-field-error">{fieldError("start_date")}</span>
            )}
          </div>

          <div className="as-field">
            <label htmlFor="end_date">
              End Date <span className="as-required">*</span>
            </label>
            <input id="end_date" type="date" value={form.end_date} onChange={setField("end_date")} />
            {fieldError("end_date") && <span className="as-field-error">{fieldError("end_date")}</span>}
          </div>
        </div>

        <div className="as-field-row as-field-row-toggles">
          <label className="as-toggle-field" htmlFor="is_current">
            <input
              id="is_current"
              type="checkbox"
              checked={form.is_current}
              onChange={setCheckboxField("is_current")}
            />
            <span>Mark as current session</span>
          </label>

          <label className="as-toggle-field" htmlFor="is_active">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={setCheckboxField("is_active")}
            />
            <span>Active</span>
          </label>
        </div>

        <div className="as-modal-actions">
          <button type="button" className="as-btn as-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="as-btn as-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Session"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AcademicSessionFormModal;