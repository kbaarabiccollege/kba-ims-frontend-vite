// src/pages/admin/academics/components/SubjectFormModal.jsx
//
// Create/Edit modal for Subjects — same st-modal-overlay/panel/header/
// body shell and ac-field-row-* grid classes that academic.css already
// ships (built for ClassroomFormModal), just laid out for the subject
// fields instead of classroom fields. No course_staff / handling_staff
// UI at all, per product request.
//
// ASSUMPTIONS:
// - Uses plain <select> elements for course/sem/classroom rather than
//   SearchableDropdown: SearchableDropdown's public API (as used
//   elsewhere) is filter-shaped — it always renders an "All ..." entry
//   and reports back through an onChange(value) that's designed for a
//   list-page filter, not a required single-value form field. Rather
//   than guess at an undocumented second mode, this uses native
//   selects styled to match the rest of the form (see the CSS
//   addendum: .ac-field select). Swap in SearchableDropdown if it does
//   support a no-"All" required mode in your actual codebase.
// - credits / univ_credits are kept as free-text (not <input
//   type="number">) since the sample payload sends them as strings
//   ("3.0") — this avoids the browser's number input silently
//   stripping a trailing ".0" a user typed on blur/re-render.
// - is_active defaults to true for new subjects, and to the incoming
//   record's value when editing.
// - Required fields: name, code, course, sem, term. short_name,
//   display_name, book_name, description, credits, univ_credits,
//   classroom_id are optional — adjust required[] below if your
//   backend disagrees.

import { useMemo, useState } from "react";
import {
  TERM_OPTIONS,
  SEMESTER_OPTIONS,
  COURSE_OPTIONS,
} from "../../../../utils/classroomConstants";
import { SegmentedToggle } from "../../../../components/common/ListPageControls";

const REQUIRED_FIELDS = ["name", "code", "course", "sem", "term"];

const emptyForm = {
  name: "",
  code: "",
  short_name: "",
  display_name: "",
  book_name: "",
  description: "",
  course: "",
  sem: "",
  term: "",
  credits: "",
  univ_credits: "",
  classroom_id: "",
  is_active: true,
};

const toFormState = (subject) => {
  if (!subject) return { ...emptyForm };
  return {
    name: subject.name || "",
    code: subject.code || "",
    short_name: subject.short_name || "",
    display_name: subject.display_name || "",
    book_name: subject.book_name || "",
    description: subject.description || "",
    course: subject.course ?? "",
    sem: subject.sem ?? "",
    term: subject.term ?? "",
    credits: subject.credits ?? "",
    univ_credits: subject.univ_credits ?? "",
    classroom_id: subject.classroom_id ?? "",
    is_active: subject.is_active === undefined ? true : !!subject.is_active,
  };
};

const SubjectFormModal = ({
  mode, // 'create' | 'edit'
  initialData,
  classroomOptions = [],
  onClose,
  onSubmit,
  submitting,
  serverError,
  serverFieldErrors = {},
}) => {
  const [form, setForm] = useState(() => toFormState(initialData));
  const [localErrors, setLocalErrors] = useState({});

  const courseOptions = useMemo(() => COURSE_OPTIONS.filter((o) => o.value !== "all"), []);
  const semesterOptions = useMemo(() => SEMESTER_OPTIONS.filter((o) => o.value !== "all"), []);
  const termOptions = useMemo(
    () => TERM_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const fieldErrors = { ...localErrors, ...serverFieldErrors };

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (localErrors[name]) {
      setLocalErrors((e) => {
        const next = { ...e };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const value = form[field];
      if (value === "" || value === null || value === undefined) {
        errors[field] = "This field is required.";
      }
    });
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    onSubmit({
      name: form.name.trim(),
      code: form.code.trim(),
      short_name: form.short_name.trim() || null,
      display_name: form.display_name.trim() || null,
      book_name: form.book_name.trim() || null,
      description: form.description.trim() || null,
      course: form.course,
      sem: form.sem,
      term: form.term,
      credits: form.credits === "" ? null : form.credits,
      univ_credits: form.univ_credits === "" ? null : form.univ_credits,
      classroom_id: form.classroom_id === "" ? null : form.classroom_id,
      is_active: form.is_active ? 1 : 0,
    });
  };

  const isEdit = mode === "edit";

  return (
    <div className="st-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal-panel">
        <div className="st-modal-header">
          <div className="ac-modal-header-content">
            <span className="ac-modal-header-icon" aria-hidden="true">📘</span>
            <div className="ac-modal-header-text">
              <h2>{isEdit ? "Edit Subject" : "New Subject"}</h2>
              <p>{isEdit ? "Update this subject's details." : "Add a subject to the catalog."}</p>
            </div>
          </div>
          <button type="button" className="st-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="st-modal-body">
          {serverError && (
            <div className="ac-form-error-banner">
              <span className="ac-form-error-title">Couldn't save</span>
              <span>{serverError}</span>
            </div>
          )}

          <form className="ac-form" onSubmit={handleSubmit}>
            {/* Row 1: Name 60% / Code 20% / Course 20% */}
            <div className="ac-field-row-primary">
              <div className="ac-field">
                <label htmlFor="subject-name">
                  Subject Name<span className="ac-required">*</span>
                </label>
                <input
                  id="subject-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Dawah and Communication"
                />
                {fieldErrors.name && <span className="ac-field-error">{fieldErrors.name}</span>}
              </div>
              <div className="ac-field">
                <label htmlFor="subject-code">
                  Code<span className="ac-required">*</span>
                </label>
                <input
                  id="subject-code"
                  type="text"
                  value={form.code}
                  onChange={(e) => setField("code", e.target.value)}
                  placeholder="DA1-C12"
                />
                {fieldErrors.code && <span className="ac-field-error">{fieldErrors.code}</span>}
              </div>
              <div className="ac-field">
                <label htmlFor="subject-course">
                  Course<span className="ac-required">*</span>
                </label>
                <select
                  id="subject-course"
                  value={form.course}
                  onChange={(e) => setField("course", Number(e.target.value))}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {courseOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.course && <span className="ac-field-error">{fieldErrors.course}</span>}
              </div>
            </div>

            {/* Row 2: Term / Semester / Classroom */}
            <div className="ac-field-row-triple-even">
              <div className="ac-field">
                <label>
                  Term<span className="ac-required">*</span>
                </label>
                <SegmentedToggle
                  ariaLabel="Term"
                  options={termOptions}
                  value={form.term}
                  onChange={(v) => setField("term", v)}
                />
                {fieldErrors.term && <span className="ac-field-error">{fieldErrors.term}</span>}
              </div>
              <div className="ac-field">
                <label htmlFor="subject-sem">
                  Semester<span className="ac-required">*</span>
                </label>
                <select
                  id="subject-sem"
                  value={form.sem}
                  onChange={(e) => setField("sem", Number(e.target.value))}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {semesterOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.sem && <span className="ac-field-error">{fieldErrors.sem}</span>}
              </div>
              <div className="ac-field">
                <label htmlFor="subject-classroom">Classroom</label>
                <select
                  id="subject-classroom"
                  value={form.classroom_id}
                  onChange={(e) => setField("classroom_id", e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">None</option>
                  {classroomOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Short Name / Display Name */}
            <div className="ac-field-row">
              <div className="ac-field">
                <label htmlFor="subject-short-name">Short Name</label>
                <input
                  id="subject-short-name"
                  type="text"
                  value={form.short_name}
                  onChange={(e) => setField("short_name", e.target.value)}
                  placeholder="Dawah"
                />
              </div>
              <div className="ac-field">
                <label htmlFor="subject-display-name">Display Name</label>
                <input
                  id="subject-display-name"
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setField("display_name", e.target.value)}
                  placeholder="Dawah wal Ittisal"
                />
              </div>
            </div>

            {/* Row 4: Book Name (full width) */}
            <div className="ac-field">
              <label htmlFor="subject-book-name">Book Name</label>
              <input
                id="subject-book-name"
                type="text"
                value={form.book_name}
                onChange={(e) => setField("book_name", e.target.value)}
                placeholder="Fiqh al-Dawah"
              />
            </div>

            {/* Row 5: Description (full width) */}
            <div className="ac-field">
              <label htmlFor="subject-description">Description</label>
              <textarea
                id="subject-description"
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Islamic outreach and communication skills"
              />
            </div>

            {/* Row 6: Credits / Univ. Credits / Active toggle */}
            <div className="ac-field-row-triple">
              <div className="ac-field">
                <label htmlFor="subject-credits">Credits</label>
                <input
                  id="subject-credits"
                  type="text"
                  inputMode="decimal"
                  value={form.credits}
                  onChange={(e) => setField("credits", e.target.value)}
                  placeholder="3.0"
                />
              </div>
              <div className="ac-field">
                <label htmlFor="subject-univ-credits">Univ. Credits</label>
                <input
                  id="subject-univ-credits"
                  type="text"
                  inputMode="decimal"
                  value={form.univ_credits}
                  onChange={(e) => setField("univ_credits", e.target.value)}
                  placeholder="3.0"
                />
              </div>
              <div className="ac-field ac-field-active">
                <label className="ac-switch">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setField("is_active", e.target.checked)}
                  />
                  <span className="ac-switch-slider" aria-hidden="true" />
                  <span className="ac-switch-label">{form.is_active ? "Active" : "Inactive"}</span>
                </label>
              </div>
            </div>

            <div className="ac-modal-actions">
              <button type="button" className="st-btn st-btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="st-btn st-btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Subject"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubjectFormModal;