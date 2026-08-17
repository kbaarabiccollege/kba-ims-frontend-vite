// src/pages/admin/students/components/BulkAddModal.jsx
//
// "Bulk Add Students" modal (from the Students page "…" menu). Creates a
// contiguous range of students in one go: pick Course -> Class (Classroom)
// -> Batch, optionally mark them all as hostel students, then give a
// starting roll number + how many to create.
//
// POST /api/students/bulk
//   { classroom_id, batch_id, is_hostel, starting_roll_number, total_students }
//
// NOTE: the Class dropdown is scoped to the selected Course
// (GET /api/classrooms?is_active=1&course=<id>), so it stays empty until a
// course is chosen, and re-searches whenever the course changes. The Batch
// dropdown isn't course-scoped, so it loads all batches up front just like
// the list-page filter.
//
// NOTE on validation: the Create Students button is NOT disabled by
// default — it's always clickable. Missing/invalid fields are caught on
// click and shown as an inline error instead, so the button never looks
// "stuck".
//
// Self-contained overlay (mirrors BulkActionsModal's pattern) rather than
// the shared Modal.jsx, so spacing/icons can match the design exactly.

import { useCallback, useEffect, useRef, useState } from "react";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";
import { getClassrooms } from "../../../../api/classroomsApi";
import { getBatches } from "../../../../api/batchesApi";
import { bulkCreateStudents } from "../../../../api/studentsApi";
import { COURSES } from "../../../../components/common/courses";
import { useToast } from "../../../../context/ToastContext";

const COURSE_OPTIONS = Object.entries(COURSES).map(([id, label]) => ({ id, label }));

/* ---- small inline icons (kept local so this modal has no extra deps) ---- */

const PeopleIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M15.5 5.3c1.3.4 2.2 1.6 2.2 3s-.9 2.6-2.2 3M18 19c0-2.6-1.9-4.6-4.3-5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5.5c2-1 5-1 8 .5 3-1.5 6-1.5 8-.5v13c-2-1-5-1-8 .5-3-1.5-6-1.5-8-.5v-13z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M12 6v13" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const ClassIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M6.5 10v5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M21 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 9h10M7 13h10M7 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill="currentColor" />
  </svg>
);

const PeoplePlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M18 8v5M15.5 10.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const BulkAddModal = ({ onClose, onCreated }) => {
  const toast = useToast();

  const [course, setCourse] = useState("");

  const [classroomOptions, setClassroomOptions] = useState([]);
  const [classroomsIndex, setClassroomsIndex] = useState({});
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);
  const [classroomId, setClassroomId] = useState("");

  const [batchOptions, setBatchOptions] = useState([]);
  const [batchesIndex, setBatchesIndex] = useState({});
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [batchId, setBatchId] = useState("");

  const [isHostel, setIsHostel] = useState(false);
  const [startingRoll, setStartingRoll] = useState("");
  const [totalStudents, setTotalStudents] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const panelRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, submitting]);

  // Close only when the mousedown actually started outside the panel,
  // checked via ref.contains() rather than calling stopPropagation() on
  // the panel. stopPropagation() was swallowing the native mousedown
  // before it ever reached the document-level "click outside" listener
  // SearchableDropdown uses to close its own open menu — which is why
  // the Class/Batch dropdowns weren't closing when clicked away from.
  const handleOverlayMouseDown = (e) => {
    if (submitting) return;
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

  // ---- classroom search, scoped to the currently selected course ----
  const searchClassrooms = useCallback(
    async (q) => {
      if (!course) return;
      setClassroomsLoading(true);
      try {
        const res = await getClassrooms({ isActive: 1, q, course });
        const list = res?.data ?? [];
        setClassroomOptions(list.map((c) => ({ id: c.id, label: c.name })));
        setClassroomsIndex((prev) => {
          const next = { ...prev };
          list.forEach((c) => {
            next[c.id] = c.name;
          });
          return next;
        });
        setClassroomsLoaded(true);
      } catch {
        setClassroomOptions([]);
      } finally {
        setClassroomsLoading(false);
      }
    },
    [course]
  );

  // Re-fetch classrooms whenever the course changes; clear any previously
  // chosen classroom since it may not belong to the new course.
  useEffect(() => {
    setClassroomId("");
    setClassroomOptions([]);
    setClassroomsLoaded(false);
    if (course) searchClassrooms("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);

  // ---- batch search (not course-scoped, loaded up front) ----
  const searchBatches = useCallback(async (q) => {
    setBatchesLoading(true);
    try {
      const res = await getBatches({ limit: 100, q });
      const list = res?.data ?? [];
      setBatchOptions(list.map((b) => ({ id: b.id, label: b.batch_name })));
      setBatchesIndex((prev) => {
        const next = { ...prev };
        list.forEach((b) => {
          next[b.id] = b.batch_name;
        });
        return next;
      });
      setBatchesLoaded(true);
    } catch {
      setBatchOptions([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    searchBatches("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNum = Number(startingRoll);
  const totalNum = Number(totalStudents);
  const showRangePreview =
    startingRoll !== "" && totalStudents !== "" && startNum > 0 && totalNum > 0;
  const endNum = showRangePreview ? startNum + totalNum - 1 : null;

  const handleCreate = async () => {
    if (!course) return setError("Please select a course.");
    if (!classroomId) return setError("Please select a class.");
    if (!batchId) return setError("Please select a batch.");
    if (!startingRoll || startNum <= 0) return setError("Please enter a valid starting roll number.");
    if (!totalStudents || totalNum <= 0) return setError("Please enter a valid total number of students.");

    setSubmitting(true);
    setError("");
    try {
      const res = await bulkCreateStudents({
        classroom_id: Number(classroomId),
        batch_id: Number(batchId),
        is_hostel: isHostel,
        starting_roll_number: startNum,
        total_students: totalNum,
      });
      // NOTE: adjust `res?.message` if the backend nests it differently
      // (e.g. res?.data?.message).
      toast.success(res?.message || "Students created successfully.");
      onCreated?.();
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || "Couldn't create students.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ba-overlay" role="presentation" onMouseDown={handleOverlayMouseDown}>
      <div
        className="ba-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bulk Add Students"
      >
        <div className="ba-header">
          <div className="ba-header-icon">
            <PeopleIcon />
          </div>
          <div className="ba-header-text">
            <h2>Bulk Add Students</h2>
            <p>Quickly create multiple students</p>
          </div>
          <button
            type="button"
            className="ba-close"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="ba-body">
          {error && <div className="st-error-banner">{error}</div>}

          <div className="ba-fields-row">
            <div className="ba-field">
              <label htmlFor="ba-course">
                <BookIcon /> Course
              </label>
              <SearchableDropdown
                id="ba-course"
                label=""
                allLabel="Select Course"
                options={COURSE_OPTIONS}
                value={course || "all"}
                onChange={(v) => setCourse(v === "all" ? "" : v)}
              />
            </div>

            <div className="ba-field">
              <label htmlFor="ba-class">
                <ClassIcon /> Class
              </label>
              <SearchableDropdown
                id="ba-class"
                label=""
                allLabel="Select Class"
                options={classroomOptions}
                value={classroomId || "all"}
                onChange={(v) => setClassroomId(v === "all" ? "" : v)}
                searchable
                onFetch={searchClassrooms}
                loaded={classroomsLoaded}
                loading={classroomsLoading}
                hideFetchButton
                selectedLabel={classroomsIndex[classroomId]}
                placeholder="Search classes…"
              />
            </div>

            <div className="ba-field">
              <label htmlFor="ba-batch">
                <CalendarIcon /> Batch
              </label>
              <SearchableDropdown
                id="ba-batch"
                label=""
                allLabel="Select Batch"
                options={batchOptions}
                value={batchId || "all"}
                onChange={(v) => setBatchId(v === "all" ? "" : v)}
                searchable
                onFetch={searchBatches}
                loaded={batchesLoaded}
                loading={batchesLoading}
                hideFetchButton
                selectedLabel={batchesIndex[batchId]}
                placeholder="Search batches…"
              />
            </div>

            <div className="ba-field ba-field-toggle">
              <label htmlFor="ba-hostel">Hostel Student</label>
              <div className="ba-toggle-row">
                <button
                  type="button"
                  id="ba-hostel"
                  role="switch"
                  aria-checked={isHostel}
                  className={`ba-toggle${isHostel ? " ba-toggle-on" : ""}`}
                  onClick={() => setIsHostel((v) => !v)}
                >
                  <span className="ba-toggle-thumb" />
                </button>
                <span className="ba-toggle-label">{isHostel ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          <div className="ba-range-box">
            <div className="ba-range-title">
              <ListIcon /> Roll Number Range
            </div>
            <div className="ba-range-fields">
              <div className="ba-field">
                <label htmlFor="ba-start-roll">Starting Roll Number</label>
                <input
                  id="ba-start-roll"
                  type="number"
                  min="1"
                  value={startingRoll}
                  onChange={(e) => setStartingRoll(e.target.value)}
                  placeholder="e.g. 2601"
                />
              </div>
              <div className="ba-field">
                <label htmlFor="ba-total">Total Students</label>
                <input
                  id="ba-total"
                  type="number"
                  min="1"
                  value={totalStudents}
                  onChange={(e) => setTotalStudents(e.target.value)}
                  placeholder="e.g. 52"
                />
              </div>
            </div>

            <div
              className={`ba-range-preview${
                showRangePreview ? "" : " ba-range-preview-hidden"
              }`}
              aria-hidden={!showRangePreview}
            >
              <InfoIcon />
              <span>
                {showRangePreview
                  ? `Students will be created from ${startNum} to ${endNum}`
                  : "\u00A0"}
              </span>
            </div>
          </div>
        </div>

        <div className="ba-footer">
          <button type="button" className="st-btn st-btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="st-btn st-btn-primary" onClick={handleCreate} disabled={submitting}>
            <PeoplePlusIcon />
            {submitting ? "Creating…" : "Create Students"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAddModal;