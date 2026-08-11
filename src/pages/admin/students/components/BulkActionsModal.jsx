// src/pages/admin/students/components/BulkActionsModal.jsx
//
// One modal, three modes, driven by the `action` prop:
//   - "update"     -> "Bulk Update" button: optionally re-assign fields for
//                     every selected student. Only fields the user actually
//                     touches are sent as real values; everything else goes
//                     as null (studentsApi.bulkUpdateStudents fills the
//                     rest), per the PATCH /students/bulk contract.
//                     Status is intentionally NOT included here — it's
//                     handled by the separate "Mark as Active" /
//                     "Mark as Inactive" actions below.
//   - "activate"   -> "Mark as Active" button: simple confirm.
//   - "deactivate" -> "Mark as Inactive" button: simple confirm.
//
// Each dropdown/input is wrapped in its own .st-field with an explicit
// <label> — SearchableDropdown's own `label` prop wasn't rendering
// visibly, so labels are handled here instead, same pattern as
// BulkAddModal.
//
// NOTE on Madhab: no madhab-list API was provided in the spec, so the
// options below are a placeholder set matching the sample payload
// (madhab_id). Swap MADHAB_OPTIONS for a real fetched list once that
// endpoint exists.
// NOTE on Academic Status: no enum was provided in the spec either;
// the options below are a reasonable placeholder — adjust to match the
// backend's actual values.

import { useEffect, useRef, useState } from "react";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";

const MADHAB_OPTIONS = [
  { id: 1, label: "Hanafi" },
  { id: 2, label: "Shafi'i" },
  { id: 3, label: "Maliki" },
  { id: 4, label: "Hanbali" },
];

const ACADEMIC_STATUS_OPTIONS = [
  { id: "studying", label: "Studying" },
  { id: "graduated", label: "Graduated" },
  { id: "discontinued", label: "Discontinued" },
  { id: "on_leave", label: "On Leave" },
];

const HOSTEL_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

const BulkActionsModal = ({
  action, // 'update' | 'activate' | 'deactivate'
  count,
  classroomOptions,
  classroomsIndex,
  classroomsLoading,
  classroomsLoaded,
  onFetchClassrooms,
  batchOptions,
  batchesIndex,
  batchesLoading,
  batchesLoaded,
  onFetchBatches,
  onClose,
  onConfirm, // (changes) => void   — changes is {} for activate/deactivate
  submitting,
  error,
}) => {
  const [batchId, setBatchId] = useState("all");
  const [classroomId, setClassroomId] = useState("all");
  const [academicStatus, setAcademicStatus] = useState("all");
  const [hostel, setHostel] = useState("all"); // 'all' | 'yes' | 'no'
  const [madhabId, setMadhabId] = useState("all");
  const [yoj, setYoj] = useState("");
  const [madrasCourse, setMadrasCourse] = useState("");
  const [madrasJoiningYear, setMadrasJoiningYear] = useState("");

  const panelRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  // Ref/contains-based outside-click close (not stopPropagation) so
  // SearchableDropdown's own document-level "click outside" listener
  // still fires and closes its menu correctly.
  const handleOverlayMouseDown = (e) => {
    if (submitting) return;
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

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
      if (batchId !== "all") changes.batch_id = Number(batchId);
      if (classroomId !== "all") changes.classroom_id = Number(classroomId);
      if (academicStatus !== "all") changes.academic_status = academicStatus;
      if (hostel !== "all") changes.is_hostel = hostel === "yes";
      if (madhabId !== "all") changes.madhab_id = Number(madhabId);
      if (yoj.trim() !== "") changes.yoj = Number(yoj);
      if (madrasCourse.trim() !== "") changes.madras_course = madrasCourse.trim();
      if (madrasJoiningYear.trim() !== "") changes.madras_joining_year = Number(madrasJoiningYear);
      onConfirm(changes);
    } else {
      onConfirm({ status: isActivate ? "active" : "inactive" });
    }
  };

  return (
    <div className="st-modal-overlay" role="presentation" onMouseDown={handleOverlayMouseDown}>
      <div
        className="st-modal-panel st-modal-panel-wide"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
            <div className="st-bulk-form st-bulk-form-grid">
              <div className="st-field">
                <label htmlFor="bulk-batch">Batch</label>
                <SearchableDropdown
                  id="bulk-batch"
                  label=""
                  allLabel="--"
                  options={batchOptions}
                  value={batchId}
                  onChange={setBatchId}
                  searchable
                  onFetch={onFetchBatches}
                  loaded={batchesLoaded}
                  loading={batchesLoading}
                  hideFetchButton
                  selectedLabel={batchesIndex[batchId]}
                  placeholder="Search batches…"
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-classroom">Classroom</label>
                <SearchableDropdown
                  id="bulk-classroom"
                  label=""
                  allLabel="--"
                  options={classroomOptions}
                  value={classroomId}
                  onChange={setClassroomId}
                  searchable
                  onFetch={onFetchClassrooms}
                  loaded={classroomsLoaded}
                  loading={classroomsLoading}
                  hideFetchButton
                  selectedLabel={classroomsIndex[classroomId]}
                  placeholder="Search classrooms…"
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-academic-status">Academic Status</label>
                <SearchableDropdown
                  id="bulk-academic-status"
                  label=""
                  allLabel="--"
                  options={ACADEMIC_STATUS_OPTIONS}
                  value={academicStatus}
                  onChange={setAcademicStatus}
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-hostel">Hostel Student</label>
                <SearchableDropdown
                  id="bulk-hostel"
                  label=""
                  allLabel="--"
                  options={HOSTEL_OPTIONS}
                  value={hostel}
                  onChange={setHostel}
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-madhab">Madhab</label>
                <SearchableDropdown
                  id="bulk-madhab"
                  label=""
                  allLabel="--"
                  options={MADHAB_OPTIONS}
                  value={madhabId}
                  onChange={setMadhabId}
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-yoj">Year of Joining</label>
                <input
                  id="bulk-yoj"
                  type="number"
                  value={yoj}
                  onChange={(e) => setYoj(e.target.value)}
                  placeholder=""
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-madras-course">Madras Course</label>
                <input
                  id="bulk-madras-course"
                  type="text"
                  value={madrasCourse}
                  onChange={(e) => setMadrasCourse(e.target.value)}
                  placeholder=""
                />
              </div>

              <div className="st-field">
                <label htmlFor="bulk-madras-year">Madras Joining Year</label>
                <input
                  id="bulk-madras-year"
                  type="number"
                  value={madrasJoiningYear}
                  onChange={(e) => setMadrasJoiningYear(e.target.value)}
                  placeholder=""
                />
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