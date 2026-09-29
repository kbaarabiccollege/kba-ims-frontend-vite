// src/pages/admin/students/components/PromoteClassModal.jsx
//
// "Promote Class" bulk action on the Students list page: moves the
// selected students into a classroom for a chosen academic year.
// Flow: pick a Course -> pick an Academic Year -> pick a Classroom
// (classrooms are fetched filtered by the chosen course + active
// status, and reset whenever the course changes) -> Promote.
//
// ASSUMPTIONS FLAGGED (I don't have classroomsApi.js / the courses &
// academic-years response shapes, so double-check these):
//   1. getClassrooms is called as { course: courseId, status: 1 }.
//      The only other usage in this codebase (Students.jsx's
//      Classroom filter) calls it as { isActive: 1, q } instead — if
//      that's the real param name, change `status: 1` below to
//      `isActive: 1`.
//   2. getCourses / getAcademicYears / getClassrooms responses are
//      unwrapped defensively (array OR { data: [...] }) via asList().

import { useCallback, useEffect, useRef, useState } from "react";
import { getCourses } from "../../../../api/coursesApi";
import { getAcademicYears } from "../../../../api/academicYearsApi";
import { getClassrooms } from "../../../../api/classroomsApi";
import { promoteStudents } from "../../../../api/studentClassEnrollmentApi";
import { useToast } from "../../../../context/ToastContext";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";

const asList = (res) => (Array.isArray(res) ? res : res?.data ?? []);

const PromoteClassModal = ({ studentIds, onClose, onPromoted }) => {
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [coursesIndex, setCoursesIndex] = useState({});
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearsIndex, setAcademicYearsIndex] = useState({});
  const [yearsLoading, setYearsLoading] = useState(false);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  const [classrooms, setClassrooms] = useState([]);
  const [classroomsIndex, setClassroomsIndex] = useState({});
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classroomId, setClassroomId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Only apply the "select the default course" behavior once, on the
  // very first successful load — later refetches (search-as-you-type)
  // must not override whatever the user has since picked.
  const defaultCourseAppliedRef = useRef(false);

  const searchCourses = useCallback(async (q) => {
    setCoursesLoading(true);
    try {
      const res = await getCourses({ is_active: 1, q });
      const list = asList(res);
      setCourses(list);
      setCoursesIndex((prev) => {
        const next = { ...prev };
        list.forEach((c) => {
          next[c.id] = c.name;
        });
        return next;
      });
      setCoursesLoaded(true);

      if (!defaultCourseAppliedRef.current) {
        defaultCourseAppliedRef.current = true;
        const defaultCourse = list.find((c) => c.is_default === 1 || c.is_default === true);
        if (defaultCourse) setCourseId(String(defaultCourse.id));
      }
    } catch {
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const searchAcademicYears = useCallback(async (q) => {
    setYearsLoading(true);
    try {
      const res = await getAcademicYears({ q });
      const list = asList(res);
      setAcademicYears(list);
      setAcademicYearsIndex((prev) => {
        const next = { ...prev };
        list.forEach((y) => {
          next[y.id] = y.is_current ? `${y.name} (Current)` : y.name;
        });
        return next;
      });
      setYearsLoaded(true);
    } catch {
      setAcademicYears([]);
    } finally {
      setYearsLoading(false);
    }
  }, []);

  // ---- load courses + academic years once, on open ----
  useEffect(() => {
    searchCourses("");
    searchAcademicYears("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchClassrooms = useCallback(
    async (q) => {
      if (!courseId) {
        setClassrooms([]);
        setClassroomsLoaded(true);
        return;
      }
      setClassroomsLoading(true);
      try {
        const res = await getClassrooms({ course: courseId, isActive: 1, q });
        const list = asList(res);
        setClassrooms(list);
        setClassroomsIndex((prev) => {
          const next = { ...prev };
          list.forEach((c) => {
            next[c.id] = c.name;
          });
          return next;
        });
        setClassroomsLoaded(true);
      } catch {
        setClassrooms([]);
      } finally {
        setClassroomsLoading(false);
      }
    },
    [courseId]
  );

  // ---- reload classrooms whenever the chosen course changes ----
  useEffect(() => {
    setClassroomId("");
    setClassroomsLoaded(false);
    searchClassrooms("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const canSubmit =
    courseId && academicYearId && classroomId && studentIds.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await promoteStudents({
        academic_year_id: Number(academicYearId),
        classroom_id: Number(classroomId),
        student_ids: studentIds,
      });
      toast.success(res?.message || "Students promoted successfully.");
      onPromoted();
    } catch (err) {
      const message = err?.response?.data?.message || "Couldn't promote these students.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="st-modal-overlay">
      <div className="st-modal-panel" style={{ backgroundColor: "var(--st-surface-raised, #ffffff)", opacity: 1 }}>
        <div className="st-modal-header">
          <h2>Promote Class</h2>
          <button type="button" className="st-modal-close" onClick={onClose} disabled={submitting}>
            ×
          </button>
        </div>

        <div className="st-modal-body">
          <p className="st-modal-subtext">{studentIds.length} student(s) selected</p>

          {error && <div className="st-error-banner">{error}</div>}

          <div className="st-bulk-form">
            <div className="st-field">
              <label>Course</label>
              <SearchableDropdown
                allLabel="Select course"
                options={courses.map((c) => ({ id: String(c.id), label: c.name }))}
                value={courseId ? String(courseId) : "all"}
                onChange={(v) => setCourseId(v === "all" ? "" : v)}
                searchable
                onFetch={searchCourses}
                loaded={coursesLoaded}
                loading={coursesLoading}
                hideFetchButton
                selectedLabel={coursesIndex[courseId]}
                placeholder="Search courses…"
              />
            </div>

            <div className="st-field">
              <label>Academic Year</label>
              <SearchableDropdown
                allLabel="Select academic year"
                options={academicYears.map((y) => ({
                  id: String(y.id),
                  label: y.name,
                  meta: y.is_current ? "Current" : undefined,
                }))}
                value={academicYearId ? String(academicYearId) : "all"}
                onChange={(v) => setAcademicYearId(v === "all" ? "" : v)}
                searchable
                onFetch={searchAcademicYears}
                loaded={yearsLoaded}
                loading={yearsLoading}
                hideFetchButton
                selectedLabel={academicYearsIndex[academicYearId]}
                placeholder="Search academic years…"
              />
            </div>

            <div className="st-field">
              <label>Classroom</label>
              <SearchableDropdown
                allLabel={!courseId ? "Select a course first" : "Select classroom"}
                options={classrooms.map((c) => ({ id: String(c.id), label: c.name }))}
                value={classroomId ? String(classroomId) : "all"}
                onChange={(v) => setClassroomId(v === "all" ? "" : v)}
                searchable
                onFetch={searchClassrooms}
                loaded={classroomsLoaded}
                loading={classroomsLoading}
                hideFetchButton
                disabled={!courseId}
                selectedLabel={classroomsIndex[classroomId]}
                placeholder="Search classrooms…"
              />
            </div>
          </div>

          <div className="st-modal-actions">
            <button type="button" className="st-btn st-btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="st-btn st-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? "Promoting…" : "Promote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoteClassModal;