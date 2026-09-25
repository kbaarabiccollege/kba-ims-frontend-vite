// src/pages/superadmin/additional-class/components/AdditionalClassFormModal.jsx
//
// Create / Edit modal. Class type toggle comes first:
//   extra  -> no original class fields
//   makeup -> original class date + original period are shown and sent
// Reuses the .um-* form classes (Users.css) since the modal renders inside .um-page.

import { useState } from "react";
import Modal from "../../../../components/common/Modal";

const toSeconds = (t) => (t && t.length === 5 ? `${t}:00` : t);

const buildInitial = (d) => ({
  class_type: d?.class_type || "extra",
  academic_term_id: d?.academic_term_id ?? "",
  classroom_id: d?.classroom_id ?? "",
  subject_id: d?.subject_id ?? "",
  staff_id: d?.staff_id ?? "",
  class_date: d?.class_date ? d.class_date.slice(0, 10) : "",
  start_time: d?.start_time ? d.start_time.slice(0, 5) : "",
  end_time: d?.end_time ? d.end_time.slice(0, 5) : "",
  original_class_date: d?.original_class_date ? d.original_class_date.slice(0, 10) : "",
  original_period_no: d?.original_period_no ?? "",
  reason: d?.reason ?? "",
});

const AdditionalClassFormModal = ({
  mode,
  initialData,
  options, // { academicTerms, classrooms, subjects, staff }
  onClose,
  onSubmit,
  submitting,
  serverError,
  serverFieldErrors,
}) => {
  const [form, setForm] = useState(() => buildInitial(initialData));
  const [clientErrors, setClientErrors] = useState({});
  const isMakeup = form.class_type === "makeup";
  const errors = { ...(serverFieldErrors || {}), ...clientErrors };

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setClientErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const e = {};
    const req = (key, msg) => { if (!String(form[key]).trim()) e[key] = msg; };
    req("academic_term_id", "Select an academic term.");
    req("classroom_id", "Select a classroom.");
    req("subject_id", "Select a subject.");
    req("staff_id", "Select a staff member.");
    req("class_date", "Select the class date.");
    req("start_time", "Select a start time.");
    req("end_time", "Select an end time.");
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      e.end_time = "End time must be after start time.";
    }
    if (isMakeup) {
      req("original_class_date", "Select the original class date.");
      if (!String(form.original_period_no).trim()) e.original_period_no = "Enter the original period number.";
      else if (Number(form.original_period_no) < 1) e.original_period_no = "Period must be 1 or more.";
    }
    setClientErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      academic_term_id: Number(form.academic_term_id),
      classroom_id: Number(form.classroom_id),
      subject_id: Number(form.subject_id),
      staff_id: Number(form.staff_id),
      class_date: form.class_date,
      start_time: toSeconds(form.start_time),
      end_time: toSeconds(form.end_time),
      class_type: form.class_type,
    };
    if (isMakeup) {
      payload.original_class_date = form.original_class_date;
      payload.original_period_no = Number(form.original_period_no);
    }
    if (form.reason.trim()) payload.reason = form.reason.trim();
    onSubmit(payload);
  };

  const renderSelect = ({ name, label, opts, placeholder }) => (
    <div className="um-field" key={name}>
      <label htmlFor={`ac-${name}`}>{label} <span className="um-required">*</span></label>
      <select id={`ac-${name}`} value={form[name]} onChange={set(name)} disabled={submitting}>
        <option value="">{placeholder}</option>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {errors[name] && <span className="um-field-error">{errors[name]}</span>}
    </div>
  );

  const renderInput = ({ name, label, type = "text", required = true, ...rest }) => (
    <div className="um-field" key={name}>
      <label htmlFor={`ac-${name}`}>{label} {required && <span className="um-required">*</span>}</label>
      <input id={`ac-${name}`} type={type} value={form[name]} onChange={set(name)} disabled={submitting} {...rest} />
      {errors[name] && <span className="um-field-error">{errors[name]}</span>}
    </div>
  );

  return (
    <Modal
      title={mode === "edit" ? "Edit Additional Class" : "Add Additional Class"}
      onClose={onClose}
      width={620}
      disableOverlayClose={submitting}
    >
      <form className="um-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="um-form-error-banner" role="alert">
            <strong className="um-form-error-title">{serverError}</strong>
          </div>
        )}

        {/* Class type toggle — always first */}
        <div className="um-field">
          <label>Class Type <span className="um-required">*</span></label>
          <div className="ac-seg" role="radiogroup" aria-label="Class type">
            {[{ id: "extra", label: "Extra" }, { id: "makeup", label: "Makeup" }].map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={form.class_type === t.id}
                className={`ac-seg-btn ${form.class_type === t.id ? "ac-seg-btn-on" : ""}`}
                onClick={() => setForm((f) => ({ ...f, class_type: t.id }))}
                disabled={submitting}
              >
                {t.label}
              </button>
            ))}
          </div>
          {errors.class_type && <span className="um-field-error">{errors.class_type}</span>}
        </div>

        {isMakeup && (
          <div className="um-field-row">
            {renderInput({ name: "original_class_date", label: "Original Class Date", type: "date" })}
            {renderInput({ name: "original_period_no", label: "Original Period", type: "number", min: "1", placeholder: "e.g. 4" })}
          </div>
        )}

        <div className="um-field-row">
          {renderSelect({ name: "academic_term_id", label: "Academic Term", opts: options.academicTerms, placeholder: "Select term" })}
          {renderSelect({ name: "classroom_id", label: "Classroom", opts: options.classrooms, placeholder: "Select classroom" })}
        </div>
        <div className="um-field-row">
          {renderSelect({ name: "subject_id", label: "Subject", opts: options.subjects, placeholder: "Select subject" })}
          {renderSelect({ name: "staff_id", label: "Staff", opts: options.staff, placeholder: "Select staff" })}
        </div>

        <div className="um-field-row ac-row-3">
          {renderInput({ name: "class_date", label: "Class Date", type: "date" })}
          {renderInput({ name: "start_time", label: "Start Time", type: "time" })}
          {renderInput({ name: "end_time", label: "End Time", type: "time" })}
        </div>

        <div className="um-field">
          <label htmlFor="ac-reason">Reason</label>
          <textarea
            id="ac-reason"
            className="ac-textarea"
            rows={3}
            value={form.reason}
            onChange={set("reason")}
            disabled={submitting}
            placeholder={isMakeup ? "e.g. Class missed due to staff meeting." : "e.g. Extra revision class before unit test."}
          />
          {errors.reason && <span className="um-field-error">{errors.reason}</span>}
        </div>

        <div className="um-modal-actions">
          <button type="button" className="um-btn um-btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="um-btn um-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AdditionalClassFormModal;