// src/pages/admin/academics/components/ClassroomFormModal.jsx
//
// Handles both "Add New Classroom" and "Edit Classroom".
//
// advisor_id / leader_id are plain optional numeric ID inputs (not
// searchable dropdowns) because there's no staff/student search
// endpoint wired up yet — see the same assumption noted in
// AdminClassrooms.jsx. Swap these for SearchableDropdowns fed by a
// staff/student search API once one exists.

import { useEffect, useState } from "react";
import Modal from "../../../../components/common/Modal";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";
import PersonSearchDropdown from "../../../../components/common/PersonSearchDropdown";
import { getStaff } from "../../../../api/staffApi";
import { getStudents } from "../../../../api/studentsApi";
import {
  TERM_OPTIONS,
  SEMESTER_OPTIONS,
  COURSE_OPTIONS,
} from "../../../../utils/classroomConstants";
import { capitalizeFirst } from "../../../../utils/textHelpers";

const extractRows = (res) =>
  res?.data?.data || res?.data?.items || res?.data || (Array.isArray(res) ? res : []);

const termOptions = TERM_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
  id: o.value,
  label: o.label,
}));
const semesterOptions = SEMESTER_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
  id: o.value,
  label: o.label,
}));
const courseOptions = COURSE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
  id: o.value,
  label: o.label,
}));

const emptyForm = {
  name: "",
  room_no: "",
  term: termOptions[0]?.id ?? "",
  semester: semesterOptions[0]?.id ?? "",
  course: courseOptions[0]?.id ?? "",
  batch_id: "",
  advisor_id: "",
  leader_id: "",
  is_active: true,
};

const ClassroomFormModal = ({
  mode,
  initialData,
  batchOptions = [], // [{ id, label }] — pass list(batchMap) down from AdminClassrooms
  initialAdvisor = null, // { id, name, photo_url, staff_uid } — resolved staff record for edit mode
  initialLeader = null, // { id, name, photo_url, roll_number } — resolved student record for edit mode
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
          room_no: initialData?.room_no ?? "",
          term: initialData?.term ?? termOptions[0]?.id ?? "",
          semester: initialData?.semester ?? semesterOptions[0]?.id ?? "",
          course: initialData?.course ?? courseOptions[0]?.id ?? "",
          batch_id: initialData?.batch_id ?? "",
          advisor_id: initialData?.advisor_id ?? "",
          leader_id: initialData?.leader_id ?? "",
          is_active: initialData?.is_active !== 0,
        }
      : { ...emptyForm }
  );
  const [errors, setErrors] = useState({});

  // Display objects for the Advisor/Leader pickers — PersonSearchDropdown
  // needs the full {id, name, photo_url, ...} record to render the
  // closed-state avatar+name, not just the raw id stored in `form`.
  const [advisorPerson, setAdvisorPerson] = useState(isEdit ? initialAdvisor : null);
  const [leaderPerson, setLeaderPerson] = useState(isEdit ? initialLeader : null);

  const [backendErrors, setBackendErrors] = useState(serverFieldErrors || {});
  useEffect(() => {
    setBackendErrors(serverFieldErrors || {});
  }, [serverFieldErrors]);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setBackendErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // SearchableDropdown's onChange passes the selected id directly.
  const setDropdownField = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setBackendErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleActive = () => setForm((prev) => ({ ...prev, is_active: !prev.is_active }));

  const fieldError = (field) => capitalizeFirst(errors[field] || backendErrors[field]);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Classroom name is required.";
    if (!form.course) next.course = "Course is required.";
    if (!form.term) next.term = "Term is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Leader options are scoped to the selected batch, so switching
  // batch invalidates whatever leader was picked before.
  const handleBatchChange = (batchId) => {
    setForm((prev) => ({ ...prev, batch_id: batchId, leader_id: "" }));
    setLeaderPerson(null);
    setErrors((prev) => ({ ...prev, batch_id: undefined, leader_id: undefined }));
    setBackendErrors((prev) => ({ ...prev, batch_id: undefined, leader_id: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      room_no: form.room_no.toString().trim() || null,
      term: Number(form.term),
      semester: form.semester ? Number(form.semester) : null,
      course: Number(form.course),
      batch_id: form.batch_id ? Number(form.batch_id) : null,
      advisor_id: form.advisor_id ? Number(form.advisor_id) : null,
      leader_id: form.leader_id ? Number(form.leader_id) : null,
      is_active: form.is_active ? 1 : 0,
    };

    onSubmit(payload);
  };

  const modalHeader = (
    <div className="ac-modal-header-content">
      <span className="ac-modal-header-icon" aria-hidden="true">🏫</span>
      <div className="ac-modal-header-text">
        <h2>{isEdit ? "Edit Classroom" : "Add New Classroom"}</h2>
        <p>{isEdit ? "Update the classroom details" : "Fill in the details to add a new classroom"}</p>
      </div>
    </div>
  );

  return (
    <Modal header={modalHeader} title={isEdit ? "Edit Classroom" : "Add New Classroom"} onClose={onClose} width={920}>
      <form className="ac-form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="ac-form-error-banner">
            <strong className="ac-form-error-title">Validation failed</strong>
            {serverError.trim().replace(/\.+$/, "").toLowerCase() !== "validation failed" && (
              <span>{serverError}</span>
            )}
          </div>
        )}

        <div className="ac-field-row-primary">
          <div className="ac-field ac-field-name">
            <label htmlFor="cr_name">
              Classroom Name <span className="ac-required">*</span>
            </label>
            <input
              id="cr_name"
              type="text"
              value={form.name}
              onChange={setField("name")}
              placeholder="e.g. 2nd Year A Section"
              autoFocus
            />
            {fieldError("name") && <span className="ac-field-error">{fieldError("name")}</span>}
          </div>

          <div className="ac-field ac-field-room">
            <label htmlFor="cr_room_no">Room No</label>
            <input
              id="cr_room_no"
              type="text"
              value={form.room_no}
              onChange={setField("room_no")}
              placeholder="e.g. 101"
            />
            {fieldError("room_no") && <span className="ac-field-error">{fieldError("room_no")}</span>}
          </div>

          <div className="ac-field ac-field-course">
            <label htmlFor="cr_course">
              Course <span className="ac-required">*</span>
            </label>
            <SearchableDropdown
              id="cr_course"
              label=""
              allLabel="Select course"
              options={courseOptions}
              value={form.course}
              onChange={setDropdownField("course")}
            />
            {fieldError("course") && <span className="ac-field-error">{fieldError("course")}</span>}
          </div>
        </div>

        <div className="ac-field-row-triple-even">
          <div className="ac-field">
            <label htmlFor="cr_term">
              Term <span className="ac-required">*</span>
            </label>
            <SearchableDropdown
              id="cr_term"
              label=""
              allLabel="Select term"
              options={termOptions}
              value={form.term}
              onChange={setDropdownField("term")}
            />
            {fieldError("term") && <span className="ac-field-error">{fieldError("term")}</span>}
          </div>

          <div className="ac-field">
            <label htmlFor="cr_semester">Semester</label>
            <SearchableDropdown
              id="cr_semester"
              label=""
              allLabel="Select semester"
              options={semesterOptions}
              value={form.semester}
              onChange={setDropdownField("semester")}
            />
            {fieldError("semester") && <span className="ac-field-error">{fieldError("semester")}</span>}
          </div>

          <div className="ac-field">
            <label htmlFor="cr_batch">Batch</label>
            <SearchableDropdown
              id="cr_batch"
              label=""
              allLabel="Select batch"
              options={batchOptions}
              value={form.batch_id}
              onChange={handleBatchChange}
            />
            {fieldError("batch_id") && <span className="ac-field-error">{fieldError("batch_id")}</span>}
          </div>
        </div>

        <div className="ac-field-row-triple">
          <div className="ac-field">
            <label htmlFor="cr_advisor">Advisor</label>
            <PersonSearchDropdown
              id="cr_advisor"
              placeholder="Select advisor"
              value={form.advisor_id || null}
              selectedPerson={advisorPerson}
              onChange={(id, person) => {
                setForm((prev) => ({ ...prev, advisor_id: id || "" }));
                setAdvisorPerson(person);
                setErrors((prev) => ({ ...prev, advisor_id: undefined }));
                setBackendErrors((prev) => ({ ...prev, advisor_id: undefined }));
              }}
              fetchFn={(params) => getStaff(params).then(extractRows)}
              getSubLabel={(p) => (p.staff_uid ? `ID: ${p.staff_uid}` : "")}
            />
            {fieldError("advisor_id") && <span className="ac-field-error">{fieldError("advisor_id")}</span>}
          </div>

          <div className="ac-field">
            <label htmlFor="cr_leader">Leader</label>
            <PersonSearchDropdown
              id="cr_leader"
              placeholder="Select leader"
              disabled={!form.batch_id}
              disabledMessage="Select a batch first"
              extraParams={{ batch_id: form.batch_id }}
              value={form.leader_id || null}
              selectedPerson={leaderPerson}
              onChange={(id, person) => {
                setForm((prev) => ({ ...prev, leader_id: id || "" }));
                setLeaderPerson(person);
                setErrors((prev) => ({ ...prev, leader_id: undefined }));
                setBackendErrors((prev) => ({ ...prev, leader_id: undefined }));
              }}
              fetchFn={(params) => getStudents(params).then(extractRows)}
              getSubLabel={(p) => (p.roll_number ? `Roll: ${p.roll_number}` : "")}
            />
            {fieldError("leader_id") && <span className="ac-field-error">{fieldError("leader_id")}</span>}
          </div>

          <div className="ac-field ac-field-active">
            <label>Active</label>
            <label className="ac-switch">
              <input type="checkbox" checked={form.is_active} onChange={toggleActive} />
              <span className="ac-switch-slider" aria-hidden="true"></span>
              <span className="ac-switch-label">{form.is_active ? "Yes" : "No"}</span>
            </label>
          </div>
        </div>

        <div className="ac-modal-actions">
          <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="st-btn st-btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Classroom"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClassroomFormModal;