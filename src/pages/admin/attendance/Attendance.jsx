// src/pages/admin/attendance/Attendance.jsx
//
// Header: [Attendance title] [stats: Total / Pending / Completed / Cancelled] [refresh] [Additional Attendance]
// Row 1: [Date + Day] [Course] [Academic session] [Group by: Classroom | Staff | Status] [filter icon]
// Row 2 (opens from the filter icon): Classroom · Staff · Session type · Status
// Then a paginated table of that day's sessions, grouped by the chosen
// field (sub-header row inserted wherever the group changes, showing the
// group title and its number of sessions).
//
// ASSUMPTIONS — adjust if yours differ:
//   * coursesApi.js exports `getCourses({ page, limit, is_active })`.
//   * The sessions endpoint accepts classroom_id, staff_id, session_type,
//     status, group_by, page and limit (see attendancesApi.js) and
//     paginates the flattened session list via the top-level `pagination`
//     object. `group_by` is driven by the "Group by" segmented control
//     (Classroom / Staff / Status).
//   * Stats: `total` comes from `pagination.total`. Pending / completed /
//     cancelled are read from `res.data.summary` ({ pending, completed,
//     cancelled }) when the API sends it; otherwise they fall back to
//     counting the sessions on the current page.
//   * Group session count: read from `group.count` when the API sends it;
//     otherwise it is the number of sessions in that group on the current page.
//   * Routing uses react-router-dom's `useNavigate` directly (the
//     sessions here aren't a plain id-based CRUD resource the way
//     Timetable/Staff/Students are, so `useModuleNav` wasn't a clean
//     fit). Three routes are assumed and will need registering in your
//     router config, mirroring the Timetable convention
//     (create / :id/edit / :id-as-view):
//       - "/admin/attendance/new"                -> AttendanceNewForm.jsx
//       - "/admin/attendance/:sessionKey/edit"    -> AttendanceForm.jsx  (Mark + Edit)
//       - "/admin/attendance/:sessionKey"         -> view page (row click)
//     A dedicated read-only "view" page file wasn't provided alongside
//     AttendanceForm/AttendanceNewForm, so the third route currently has
//     nowhere to render — point it at whatever view component you add,
//     or repoint VIEW_PATH below to reuse AttendanceForm in a read-only
//     mode if that's the intended design.
//   * "Attendance" column = `${attendance.present}/${attendance.total}`.
//     Swap the field names in `formatAttendance()` below if your payload
//     names them differently.

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { getAcademicTerms } from "../../../api/academicTermsApi";
import { getCourses } from "../../../api/coursesApi";
import { getClassrooms } from "../../../api/classroomsApi";
import { getStaff } from "../../../api/staffApi";
import { getAttendanceSessions } from "../../../api/attendancesApi";
import { PAGE_SIZE_OPTIONS } from "../../../utils/constants";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/Attendance.css";

const SESSION_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "extra", label: "Extra" },
  { value: "makeup", label: "Makeup" },
];
const STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "pending", label: "Pending" },
];
const GROUP_BY_OPTIONS = [
  { value: "classroom", label: "Classroom" },
  { value: "staff", label: "Staff" },
  { value: "status", label: "Status" },
];
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const pad = (n) => String(n).padStart(2, "0");
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISODate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const dayNameOf = (iso) => (iso ? DAYS[parseISODate(iso).getDay()] : "");
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
const formatAttendance = (a) => (a ? `${a.present ?? 0}/${a.total ?? 0}` : "—");
const sessionsLabel = (n) => `${n} ${n === 1 ? "session" : "sessions"}`;

const EMPTY_STATS = { total: 0, pending: 0, completed: 0, cancelled: 0 };

// ---- routes (see assumptions above) ----
// Regular sessions are identified by their timetable slot; makeup/extra by their additional class.
const buildSessionRef = (s) =>
  s.session_type === "regular"
    ? `slot-${s.timetable_slot_id}`
    : `class-${s.additional_class_id}`;

const attendanceEditPath = (sessionRef, date) =>
  `/admin/attendance/${encodeURIComponent(sessionRef)}/edit?date=${encodeURIComponent(date)}`;
const attendanceMarkPath = (sessionRef, date) =>
  `/admin/attendance/${encodeURIComponent(sessionRef)}/mark?date=${encodeURIComponent(date)}`;
const attendanceViewPath = (sessionKey) => `/admin/attendance/${encodeURIComponent(sessionKey)}`;

const Icon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const CalendarIcon = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>;
const FilterIcon = () => <Icon><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" /></Icon>;
const RefreshIcon = () => <Icon size={17}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Icon>;

const EditIcon = () => <Icon size={15}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /></Icon>;

const TOTAL_COLS = 10; // S.No., Classroom, Period, Subject, Duration, Staff name, Session type, Status, Attendance, Actions

const Attendance = () => {
  usePageTitle("Attendance");
  const navigate = useNavigate();

  // ---- lookups ----
  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [staff, setStaff] = useState([]);

  // ---- filters ----
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");
  const [classroomId, setClassroomId] = useState("all");
  const [staffId, setStaffId] = useState("all");
  const [sessionType, setSessionType] = useState("all");
  const [status, setStatus] = useState("all");
  const [groupBy, setGroupBy] = useState("classroom");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ---- list ----
  const [rows, setRows] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const dayName = useMemo(() => dayNameOf(date), [date]);
  const activeFilterCount = [classroomId, staffId, sessionType, status].filter((v) => v !== "all").length;

  // Courses (once) — preselect the default course.
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await getCourses({ page: 1, limit: 100, is_active: 1 });
        if (off) return;
        const list = res?.data ?? [];
        setCourses(list);
        const def = list.find((c) => c.is_default) ?? list[0];
        if (def) setCourseId(String(def.id));
      } catch { if (!off) setError("Couldn't load courses."); }
    })();
    return () => { off = true; };
  }, []);

  // Active staff (once).
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await getStaff({ status: "active", page: 1, limit: 100 });
        if (!off) setStaff(res?.data ?? []);
      } catch { if (!off) setStaff([]); }
    })();
    return () => { off = true; };
  }, []);

  // Academic sessions + classrooms depend on the selected course.
  useEffect(() => {
    if (!courseId) return;
    let off = false;
    (async () => {
      setTermsLoading(true);
      try {
        const res = await getAcademicTerms({ course_id: courseId, is_active: 1, page: 1, limit: 100 });
        if (off) return;
        const list = res?.data ?? [];
        setTerms(list);
        const current = list.find((t) => t.is_current) ?? list[0];
        setTermId(current ? String(current.id) : "");
      } catch { if (!off) { setTerms([]); setTermId(""); } }
      finally { if (!off) setTermsLoading(false); }
    })();
    (async () => {
      try {
        const res = await getClassrooms({ course: courseId, isActive: 1, page: 1, limit: 100 });
        if (!off) setClassrooms(res?.data ?? []);
      } catch { if (!off) setClassrooms([]); }
    })();
    return () => { off = true; };
  }, [courseId]);

  const fetchSessions = useCallback(async () => {
    if (!termId || !date) { setRows([]); setTotal(0); setStats(EMPTY_STATS); return; }
    setLoading(true);
    setError("");
    try {
      const res = await getAttendanceSessions({
        group_by: groupBy,
        academic_term_id: termId,
        date,
        day: dayNameOf(date),
        classroom_id: classroomId,
        staff_id: staffId,
        session_type: sessionType,
        status,
        page,
        limit,
      });
      const groups = res?.data?.groups ?? [];
      const flat = groups.flatMap((g) =>
        (g.sessions ?? []).map((s) => ({
          ...s,
          _group: g.label,
          _groupCount: g.count ?? (g.sessions ?? []).length,
        }))
      );
      const totalCount = res?.pagination?.total ?? flat.length;
      const summary = res?.data?.summary ?? {};
      const countBy = (st) => flat.filter((s) => s.status === st).length;

      setRows(flat);
      setCalendar(res?.data?.calendar ?? null);
      setTotal(totalCount);
      setStats({
        total: totalCount,
        pending: summary.pending ?? countBy("pending"),
        completed: summary.completed ?? countBy("completed"),
        cancelled: summary.cancelled ?? countBy("cancelled"),
      });
    } catch (err) {
      setRows([]); setTotal(0); setStats(EMPTY_STATS);
      setError(err?.response?.data?.message || "Couldn't load attendance sessions. Please try again.");
    } finally { setLoading(false); }
  }, [termId, date, classroomId, staffId, sessionType, status, groupBy, page, limit]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleRefresh = async () => { setRefreshing(true); await fetchSessions(); setRefreshing(false); };

  // Filter handlers — every change goes back to page 1.
  const onFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };
  const onCourse = (e) => {
    setCourseId(e.target.value);
    setClassroomId("all"); // classrooms belong to a course
    setPage(1);
  };
  const onGroupBy = (value) => { setGroupBy(value); setPage(1); };
  const clearFilters = () => {
    setClassroomId("all"); setStaffId("all"); setSessionType("all"); setStatus("all"); setPage(1);
    // groupBy is a display setting, not a narrowing filter — left as-is on clear.
  };

  // ---- navigation ----
  const goToAttendance = (s, pathBuilder) => {
    const idField = s.session_type === "regular" ? "timetable_slot_id" : "additional_class_id";
    navigate(pathBuilder(buildSessionRef(s), date), {
      state: { session: s, [idField]: s[idField], date },
    });
  };
  const handleEdit = (s) => goToAttendance(s, attendanceEditPath);
  const handleMark = (s) => goToAttendance(s, attendanceMarkPath);
  const handleViewRow = (s) => navigate(attendanceViewPath(s.key), { state: { session: s } });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  let lastGroup = null;

  return (
    <div className="at-page">
      {/* ---------- header ---------- */}
      <div className="at-header">
        <div className="at-title-block">
          <h1>Attendance</h1>
        </div>

        <div className="at-stats" aria-label="Session statistics">
          <div className="at-stat at-stat-total">
            <span className="at-stat-value">{stats.total}</span>
            <span className="at-stat-label">Total sessions</span>
          </div>
          <div className="at-stat at-stat-pending">
            <span className="at-stat-value">{stats.pending}</span>
            <span className="at-stat-label">Pending</span>
          </div>
          <div className="at-stat at-stat-completed">
            <span className="at-stat-value">{stats.completed}</span>
            <span className="at-stat-label">Completed</span>
          </div>
          <div className="at-stat at-stat-cancelled">
            <span className="at-stat-value">{stats.cancelled}</span>
            <span className="at-stat-label">Cancelled</span>
          </div>
        </div>

        <div className="at-header-actions">
          <button type="button" className="at-btn at-btn-ghost at-icon-only"
            onClick={handleRefresh} disabled={loading || refreshing} aria-label="Refresh">
            <span className={refreshing ? "at-spin" : ""}><RefreshIcon /></span>
          </button>

        </div>
      </div>

      <div className="at-card">
        {/* ---------- toolbar ---------- */}
        <div className="at-toolbar">
          <div className="at-toolbar-row at-row-main">
            {/* Date and day share one field */}
            <div className="at-field at-field-date">
              <label htmlFor="at-date">Date</label>
              <div className="at-date-box">
                <span className="at-date-icon"><CalendarIcon /></span>
                <input id="at-date" type="date" value={date}
                  onChange={(e) => { if (e.target.value) { setDate(e.target.value); setPage(1); } }} />
                <span className="at-date-day" aria-live="polite">{titleCase(dayName)}</span>
              </div>
            </div>

            <div className="at-field at-field-course">
              <label htmlFor="at-course">Course</label>
              <select id="at-course" value={courseId} onChange={onCourse}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="at-field at-field-term">
              <label htmlFor="at-term">Academic session</label>
              <select id="at-term" value={termId} onChange={onFilter(setTermId)}
                disabled={termsLoading || terms.length === 0}>
                {terms.length === 0 && <option value="">{termsLoading ? "Loading…" : "No sessions"}</option>}
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Group by — segmented control */}
            <div className="at-field at-field-group">
              <span className="at-field-label" id="at-groupby-label">Group by</span>
              <div className="at-segmented" role="radiogroup" aria-labelledby="at-groupby-label">
                {GROUP_BY_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    role="radio"
                    aria-checked={groupBy === g.value}
                    className={`at-segment${groupBy === g.value ? " at-segment-active" : ""}`}
                    onClick={() => onGroupBy(g.value)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {/* mobile only (toggled in CSS) */}
              <select
                className="at-groupby-select"
                value={groupBy}
                onChange={(e) => onGroupBy(e.target.value)}
                aria-labelledby="at-groupby-label"
              >
                {GROUP_BY_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            <button type="button"
              className={`at-btn at-btn-ghost at-icon-only at-filter-btn${filtersOpen ? " at-filter-btn-active" : ""}`}
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen} aria-controls="at-filters" aria-label="Toggle filters">
              <FilterIcon />
              {activeFilterCount > 0 && <span className="at-filter-count">{activeFilterCount}</span>}
            </button>
          </div>

          {filtersOpen && (
            <div className="at-toolbar-row at-filters" id="at-filters">
              <div className="at-field">
                <label htmlFor="at-classroom">Classroom</label>
                <select id="at-classroom" value={classroomId} onChange={onFilter(setClassroomId)}>
                  <option value="all">All classrooms</option>
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="at-field">
                <label htmlFor="at-staff">Staff</label>
                <select id="at-staff" value={staffId} onChange={onFilter(setStaffId)}>
                  <option value="all">All staff</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="at-field">
                <label htmlFor="at-type">Session type</label>
                <select id="at-type" value={sessionType} onChange={onFilter(setSessionType)}>
                  <option value="all">All types</option>
                  {SESSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="at-field">
                <label htmlFor="at-status">Status</label>
                <select id="at-status" value={status} onChange={onFilter(setStatus)}>
                  <option value="all">All statuses</option>
                  {STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button type="button" className="at-clear-btn" onClick={clearFilters}>Clear</button>
              )}
            </div>
          )}
        </div>

        {error && <div className="at-error-banner">{error}</div>}
        {calendar?.is_holiday && (
          <div className="at-holiday-banner">
            Holiday{calendar.events?.length ? ": " + calendar.events.map((e) => e.title || e.name || String(e)).join(", ") : ""}
          </div>
        )}
        {!calendar?.is_holiday && calendar?.events?.length > 0 && (
          <div className="at-event-banner">{calendar.events.map((e) => e.title || e.name || String(e)).join(" • ")}</div>
        )}

        {/* ---------- table ---------- */}
        <div className="at-table-wrap">
          <table className="at-table">
            <thead>
              <tr>
                <th className="at-col-num">S.No.</th>
                <th className="at-col-left">Classroom</th>
                <th>Period</th>
                <th className="at-col-left">Subject</th>
                <th>Duration</th>
                <th className="at-col-left">Staff Name</th>
                <th>Session type</th>
                <th>Status</th>
                <th>Attendance</th>
                <th className="at-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={TOTAL_COLS} className="at-state-cell">Loading sessions…</td></tr>
              ) : !termId ? (
                <tr><td colSpan={TOTAL_COLS} className="at-state-cell">Select an academic session to view attendance.</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={TOTAL_COLS} className="at-state-cell">No sessions match your date or filters.</td></tr>
              ) : (
                rows.map((s, idx) => {
                  const showGroupHeader = s._group !== lastGroup;
                  lastGroup = s._group;
                  const isCompleted = s.status === "completed";
                  const isCancelled = s.status === "cancelled";

                  return (
                    <Fragment key={s.key}>
                      {showGroupHeader && (
                        <tr className="at-group-row">
                          <td colSpan={TOTAL_COLS}>
                            <span className="at-group-title">{s._group}</span>
                            <span className="at-group-count">{sessionsLabel(s._groupCount)}</span>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={isCompleted ? "at-row-clickable" : ""}
                        onClick={isCompleted ? () => handleViewRow(s) : undefined}
                        role={isCompleted ? "button" : undefined}
                        tabIndex={isCompleted ? 0 : undefined}
                        onKeyDown={
                          isCompleted
                            ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleViewRow(s); } }
                            : undefined
                        }
                      >
                        <td className="at-col-num">{(page - 1) * limit + idx + 1}</td>
                        <td className="at-col-left">{s.classroom?.name}</td>
                        <td className="at-nowrap">{s.period?.label}</td>
                        <td className="at-col-left at-strong">{s.subject?.name}</td>
                        <td className="at-nowrap">{s.start_time} – {s.end_time}</td>
                        <td className="at-col-left">{s.staff?.name}</td>
                        <td><span className={`at-tag at-type-${s.session_type}`}>{titleCase(s.session_type)}</span></td>
                        <td><span className={`at-status at-status-${s.status}`}>{titleCase(s.status)}</span></td>
                        <td className="at-nowrap at-strong">{formatAttendance(s.attendance)}</td>
                        <td className="at-col-actions">
                          {isCancelled ? (
                            <span className="at-muted">—</span>
                          ) : isCompleted ? (
                            <button
                              type="button"
                              className="at-btn at-btn-icon-edit"
                              onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                              aria-label="Edit attendance"
                              title="Edit attendance"
                            >
                              <EditIcon />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="at-btn at-btn-sm at-btn-primary"
                              onClick={(e) => { e.stopPropagation(); handleMark(s); }}
                            >
                              Mark
                            </button>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- pagination ---------- */}
        <div className="at-pagination">
          <div className="at-pagination-summary">
            {total === 0 ? "No results" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
          </div>
          <div className="at-pagination-controls">
            <label className="at-per-page">
              <span>Rows</span>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {(PAGE_SIZE_OPTIONS ?? [10, 25, 50, 100]).map((o) => {
                  const v = typeof o === "object" ? o.value : o;
                  return <option key={v} value={v}>{v}</option>;
                })}
              </select>
            </label>
            <button type="button" className="at-page-nav" onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1} aria-label="Previous page">‹</button>
            <span className="at-page-current">{page}</span>
            <button type="button" className="at-page-nav" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages} aria-label="Next page">›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;