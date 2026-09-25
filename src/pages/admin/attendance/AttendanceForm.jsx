// src/pages/admin/attendance/AttendanceForm.jsx
//
// "Mark Attendance" / "Edit Attendance" page. Responsive (table -> cards on
// mobile), styled via AttendanceForm.css ("af-" prefixed).
//
// ROUTES:
//   "/admin/attendance/:sessionKey/mark" -> AttendanceForm
//   "/admin/attendance/:sessionKey/edit" -> AttendanceForm
//   sessionKey = "slot-<timetable_slot_id>"      -> type=regular
//              = "class-<additional_class_id>"   -> type=extra (extra OR makeup)
//   Date is passed as ?date=YYYY-MM-DD
//
// On load:
//   1) GET /attendances/slot/:id?type=regular|extra&date=...   (session details)
//   2) getStudents({ classroom_id })                            (student list)
// Save is still a stub (handleSave logs the payload).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getAttendanceSlotDetail, saveAttendance } from "../../../api/attendancesApi";
import { getStudents } from "../../../api/studentsApi";
import usePageTitle from "../../../hooks/usePageTitle";
import { useToast } from "../../../context/ToastContext";
import { SelectAllCheckbox } from "../../../components/common/ListPageControls";
import { PhotoPreviewModal } from "../../../components/common/ListPageModals";
import "../../../styles/UserList.css";
import "../../../styles/AttendanceForm.css";

// ---- session key parsing ----
const parseSessionKey = (key) => {
  if (!key) return { id: null, type: null };
  if (key.startsWith("slot-")) return { id: key.slice(5), type: "regular" };
  if (key.startsWith("class-")) return { id: key.slice(6), type: "extra" };
  return { id: null, type: null };
};

// Finds the "slot-13" / "class-2" segment regardless of what the route param
// is named (:sessionKey, :id, :key ...), falling back to the URL path itself.
const resolveSessionKey = (params, pathname) => {
  const fromParams = Object.values(params || {}).find(
    (v) => typeof v === "string" && /^(slot|class)-/.test(v)
  );
  if (fromParams) return fromParams;
  const m = (pathname || "").match(/\/((?:slot|class)-[^/]+)/);
  return m ? m[1] : "";
};

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Present", short: "P" },
  { value: "absent", label: "Absent", short: "A" },
  { value: "od", label: "OD", short: "OD" },
  { value: "late", label: "Late", short: "L" },
  { value: "leave", label: "Leave", short: "LV" },
  { value: "excused", label: "Excused", short: "EX" },
];

const STATUS_META = {
  pending: { label: "Pending", cls: "af-status-pending" },
  ongoing: { label: "Ongoing", cls: "af-status-ongoing" },
  completed: { label: "Completed", cls: "af-status-completed" },
  cancelled: { label: "Cancelled", cls: "af-status-cancelled" },
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "—");

// student photo can come back under different keys depending on the API
const studentPhoto = (s) => s?.photo_url || s?.avatar_url || s?.photo || "";

// <input type="time"> gives "HH:MM"; the API wants "HH:MM:SS"
const toApiTime = (t) => (t ? (t.length === 5 ? `${t}:00` : t) : null);
// "14:05" -> "2:05 PM"
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = Number(h);
  return `${((hr + 11) % 12) + 1}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

// Accepts { data: [...] }, { data: { items: [...] } } or { data: { data: [...] } }
const extractList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

// ---- icons ----
const Icon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const CalendarIcon = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>;
const ClockIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></Icon>;
const UserIcon = () => <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></Icon>;
const BookIcon = () => <Icon><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 17h16" /></Icon>;
const TagIcon = () => <Icon><path d="M20.6 12.4 12 21 2 11V2h9l9.6 9.4a2 2 0 0 1 0 3Z" /><circle cx="6.5" cy="6.5" r="1" /></Icon>;
const ListIcon = () => <Icon><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>;
const HourglassIcon = () => <Icon><path d="M5 2h14M5 22h14M6 2c0 5 12 5 12 0M6 22c0-5 12-5 12 0" /></Icon>;
const CheckCircleIcon = () => <Icon size={14}><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></Icon>;
const NoteIcon = () => <Icon size={17}><path d="M9 3h6l4 4v14H5V3Z" /><path d="M9 3v4H5" /><path d="M9 13h6M9 17h6" /></Icon>;
const InfoIcon = () => <Icon size={16}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></Icon>;
const RewindIcon = () => <Icon><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Icon>;

const Detail = ({ label, value }) => (
  <div className="af-detail">
    <span className="af-detail-label">{label}</span>
    <span className="af-detail-value">{value ?? "—"}</span>
  </div>
);

  const AttendanceForm = () => {
  usePageTitle("Mark Attendance");
  const navigate = useNavigate();
  const toast = useToast();
  const params = useParams();
  const { pathname } = useLocation();
  const sessionKey = resolveSessionKey(params, pathname);
  const [searchParams] = useSearchParams();
  const date = searchParams.get("date") || "";
  const { id: refId, type: refType } = useMemo(() => parseSessionKey(sessionKey), [sessionKey]);

  // e.g. "/admin/attendance/slot-13/mark" -> "/admin/attendance"
  const attendanceListPath = useMemo(() => {
    const idx = pathname.indexOf("/attendance");
    return idx !== -1 ? pathname.slice(0, idx + "/attendance".length) : "/admin/attendance";
  }, [pathname]);

  // ---- session detail ----
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");

  // ---- remarks (session-level) ----
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [remarksDraft, setRemarksDraft] = useState("");

  // ---- students ----
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  // ---- per-student attendance state ----
  const [attendance, setAttendance] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isMakeup = session?.session_type === "makeup";
  const isRegular = session?.session_type === "regular";

  // invalid URL guard
  useEffect(() => {
    if (!refId || !refType) setSessionError("Invalid session link.");
    else if (!date) setSessionError("Attendance date is missing from the link.");
    else setSessionError("");
  }, [refId, refType, date]);

  // 1) fetch session detail
  useEffect(() => {
    if (!refId || !refType || !date) return;
    let off = false;
    (async () => {
      setSessionLoading(true);
      setSessionError("");
      try {
        const res = await getAttendanceSlotDetail({ id: refId, type: refType, date });
        if (off) return;
        const data = res?.data ?? null;
        setSession(data);
        setRemarks(data?.remarks || "");
      } catch (err) {
        if (!off) setSessionError(err?.response?.data?.message || "Couldn't load session details.");
      } finally {
        if (!off) setSessionLoading(false);
      }
    })();
    return () => { off = true; };
  }, [refId, refType, date]);

  // 2) fetch students once we know the classroom
  const classroomId = session?.classroom?.id;
  useEffect(() => {
    if (!classroomId) return;
    let off = false;
    (async () => {
      setStudentsLoading(true);
      setStudentsError("");
      try {
        const res = await getStudents({ classroomId, is_active: 1, page: 1, limit: 200 });
        if (off) return;
        const list = extractList(res);
        setStudents(list);
        setSelected(new Set());
        setAttendance((prev) => {
          const next = { ...prev };
          list.forEach((s) => {
            if (!next[s.id]) {
              next[s.id] = { status: null, remarks: "", check_in_time: "" };
            }
          });
          return next;
        });
      } catch (err) {
        if (!off) setStudentsError(err?.response?.data?.message || "Couldn't load students for this classroom.");
      } finally {
        if (!off) setStudentsLoading(false);
      }
    })();
    return () => { off = true; };
  }, [classroomId]);

  // ---- selection ----
  const allSelected = students.length > 0 && selected.size === students.length;
  const someSelected = selected.size > 0 && !allSelected;

  // ---- profile picture preview (zoom) ----
  const [previewStudent, setPreviewStudent] = useState(null);
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  };
  const toggleSelectOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- per-row updates ----
  const setStatus = (id, status) =>
    setAttendance((prev) => ({ ...prev, [id]: { ...prev[id], status: prev[id]?.status === status ? null : status } }));

  const setRowRemarks = (id, value) =>
    setAttendance((prev) => ({ ...prev, [id]: { ...prev[id], remarks: value } }));

  // ---- bulk actions (selected rows, or every row if none selected) ----
  const targetIds = useCallback(
    () => (selected.size > 0 ? Array.from(selected) : students.map((s) => s.id)),
    [selected, students]
  );
  const bulkSetStatus = (status) => {
    const ids = targetIds();
    setAttendance((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = { ...next[id], status }; });
      return next;
    });
    setSelected(new Set()); // clear the selection once a status is applied
  };


  // ---- stats ----
  const stats = useMemo(() => {
    const total = students.length;
    let present = 0, absent = 0, od = 0;
    students.forEach((s) => {
      const st = attendance[s.id]?.status;
      if (st === "present") present += 1;
      else if (st === "absent") absent += 1;
      else if (st === "od") od += 1;
    });
    const pct = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));
    return { total, present, absent, od, presentPct: pct(present), absentPct: pct(absent), odPct: pct(od) };
  }, [students, attendance]);

  // ---- remarks modal ----
  const openRemarks = () => { setRemarksDraft(remarks); setRemarksOpen(true); };
  const saveRemarks = () => { setRemarks(remarksDraft); setRemarksOpen(false); };

  useEffect(() => {
    if (!remarksOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setRemarksOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [remarksOpen]);

  // ---- mobile "more" menu + per-student remarks modal ----
  const [menu, setMenu] = useState(null);       // { id, right, top, bottom }
  const [rowModal, setRowModal] = useState(null); // { id, name, draft }

  const openMenu = (e, id) => {
    if (menu?.id === id) { setMenu(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const openUp = window.innerHeight - r.bottom < 220;
    setMenu({
      id,
      right: Math.max(8, window.innerWidth - r.right),
      top: openUp ? null : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : null,
    });
  };
  const openRowRemarks = (id) => {
    const st = students.find((x) => x.id === id);
    setRowModal({ id, name: st?.name || "", draft: attendance[id]?.remarks || "" });
    setMenu(null);
  };
  const saveRowRemarks = () => {
    setRowRemarks(rowModal.id, rowModal.draft);
    setRowModal(null);
  };

  // ---- check-in time modal (desktop clock button + mobile ⋮ menu) ----
  const [timeModal, setTimeModal] = useState(null); // { id, name, draft }
  const openCheckIn = (id) => {
    const st = students.find((x) => x.id === id);
    setTimeModal({ id, name: st?.name || "", draft: attendance[id]?.check_in_time || "" });
    setMenu(null);
  };
  const applyCheckIn = (value) => {
    setAttendance((prev) => ({ ...prev, [timeModal.id]: { ...prev[timeModal.id], check_in_time: value } }));
    setTimeModal(null);
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDown = (e) => { if (!e.target.closest?.(".af-menu, .af-more")) setMenu(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  useEffect(() => {
    if (!rowModal) return;
    const onKey = (e) => { if (e.key === "Escape") setRowModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rowModal]);

  useEffect(() => {
    if (!timeModal) return;
    const onKey = (e) => { if (e.key === "Escape") setTimeModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timeModal]);

  useEffect(() => {
    if (!saveError) return;
    const onKey = (e) => { if (e.key === "Escape") setSaveError(""); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveError]);

  // ---- unsaved-changes guard ----
  const [leaveOpen, setLeaveOpen] = useState(false);
  const dirtyRef = useRef(false);
  const bypassRef = useRef(false);       // set true right before an allowed navigation
  const guardPushedRef = useRef(false);
  const pendingHrefRef = useRef(null);   // null => go back in history

  const isDirty = useMemo(
    () =>
      remarks !== (session?.remarks || "") ||
      Object.values(attendance).some((r) => r.status || r.remarks || r.check_in_time),
    [attendance, remarks, session]
  );
  dirtyRef.current = isDirty;

  // Call this after a successful save to leave without the prompt.
  const leaveNow = () => {
    bypassRef.current = true;
    setLeaveOpen(false);
    if (pendingHrefRef.current) navigate(pendingHrefRef.current);
    else navigate(-2); // -2 because the guard below pushes one extra history entry
  };
  const stayHere = () => { pendingHrefRef.current = null; setLeaveOpen(false); };

  useEffect(() => {
    // extra history entry so the browser Back button can be intercepted
    if (!guardPushedRef.current) {
      window.history.pushState({ afGuard: true }, "", window.location.href);
      guardPushedRef.current = true;
    }
    const onPopState = () => {
      if (bypassRef.current) return;
      if (!dirtyRef.current) { bypassRef.current = true; navigate(-1); return; }
      window.history.pushState({ afGuard: true }, "", window.location.href);
      pendingHrefRef.current = null;
      setLeaveOpen(true);
    };
    // sidebar / in-app links
    const onClick = (e) => {
      if (!dirtyRef.current || bypassRef.current) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const a = e.target.closest?.("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      pendingHrefRef.current = url.pathname + url.search + url.hash;
      setLeaveOpen(true);
    };
    // refresh / tab close (browser shows its own native dialog; text can't be customised)
    const onBeforeUnload = (e) => {
      if (!dirtyRef.current || bypassRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [navigate]);

  const handleCancel = () => {
    pendingHrefRef.current = null;  
    if (isDirty) setLeaveOpen(true);
    else leaveNow();
  };
  const handleSave = async () => {
    setSaveError("");
    const fail = (msg) => setSaveError(msg);

    if (!session) return fail("Session details haven't loaded yet.");
    if (students.length === 0) return fail("There are no students to save attendance for.");
    const unmarked = students.filter((s) => !attendance[s.id]?.status).length;
    if (unmarked > 0) {
      return fail(`Please mark attendance for every student (${unmarked} not marked).`);
    }

    const sessionType = session.session_type || (refType === "regular" ? "regular" : "extra");
    const idNum = Number(refId);

    const payload = {
      academic_term_id: session.academic_term?.id,
      session_type: sessionType,
      // regular -> timetable_slot_id ; makeup & extra -> additional_class_id
      ...(sessionType === "regular"
        ? { timetable_slot_id: idNum }
        : { additional_class_id: idNum }),
      attendance_date: date,
      classroom_id: session.classroom?.id,
      subject_id: session.subject?.id,
      staff_id: session.staff?.id,
    };
    if (sessionType !== "extra") payload.session_status = "completed";
    if (remarks.trim()) payload.remarks = remarks.trim();

    payload.students = students.map((s) => {
      const row = attendance[s.id];
      const entry = { student_id: s.id, attendance_status: row.status };
      if (row.check_in_time) entry.check_in_time = toApiTime(row.check_in_time);
      if (row.remarks?.trim()) entry.remarks = row.remarks.trim();
      return entry;
    });

    setSaving(true);
    try {
      await saveAttendance(payload);
      toast.success("Attendance saved successfully.");
      bypassRef.current = true; // skip the "unsaved changes" guard
      navigate(attendanceListPath, { replace: true });
    } catch (err) {
      toast.error("Failed to save attendance.");
      fail(err?.response?.data?.message || err?.message || "Couldn't save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const statusMeta = STATUS_META[session?.status] ?? STATUS_META.pending;

  return (
    <div className="af-page">
      {/* ---------- header ---------- */}
      <div className="af-header">
        <h1>{session?.attendance_session_id ? "Edit Attendance" : "Mark Attendance"}</h1>
        <button type="button" className="af-btn af-btn-primary" onClick={openRemarks}>
          <NoteIcon /> <span>Add Remarks</span>
        </button>
      </div>

      {sessionError && <div className="af-error-banner">{sessionError}</div>}




      {sessionLoading ? (
        <div className="af-skeleton">Loading session details…</div>
      ) : (
        <>
          <div className="af-details">
            <Detail label="Academic Term" value={session?.academic_term?.name} />
            <Detail label="Attendance Date" value={session ? `${session.attendance_date} (${session.day})` : date} />
            <Detail label="Classroom" value={session?.classroom?.name} />
            <Detail label="Subject" value={session?.subject?.name} />
            <Detail label="Staff Name" value={session?.staff?.name} />
            <Detail label="Session Type" value={capitalize(session?.session_type)} />
            {isRegular && <Detail label="Period" value={session?.period?.name} />}
            {isMakeup && <Detail label="Original Class Date" value={session?.original_class_date} />}
            {isMakeup && <Detail label="Original Period No." value={session?.original_period_no} />}
            <Detail label="Start Time" value={session?.start_time} />
            <Detail label="End Time" value={session?.end_time} />
            <Detail label="Duration" value={session?.duration?.label} />
            <Detail
              label="Status"
              value={<span className={`af-status-pill ${statusMeta.cls}`}>{statusMeta.label}</span>}
            />
          </div>

          {!isMakeup && session?.remarks && (
            <div className="af-info-banner">
              <InfoIcon /> <span>{session.remarks}</span>
            </div>
          )}
        </>
      )}

      <div className="af-card af-main-card">
        {/* ---------- bulk action bar ---------- */}
        <div className="af-toolbar">
          {selected.size > 0 && <span className="af-selected-count">{selected.size} selected</span>}

          <div className="af-bulk-status">
            {ATTENDANCE_OPTIONS.map((o) => (
              <button key={o.value} type="button" className={`af-bulk-btn af-bulk-${o.value}`} onClick={() => bulkSetStatus(o.value)}>
                {o.label}
              </button>
            ))}
          </div>



          <div className="af-stats">
            <div className="af-stat af-stat-total"><UserIcon /><span>{stats.total}</span><small>Total</small></div>
            <div className="af-stat af-stat-present"><CheckCircleIcon /><span>{stats.present}</span><small>Present ({stats.presentPct}%)</small></div>
            <div className="af-stat af-stat-absent"><CheckCircleIcon /><span>{stats.absent}</span><small>Absent ({stats.absentPct}%)</small></div>
            <div className="af-stat af-stat-od"><CheckCircleIcon /><span>{stats.od}</span><small>OD ({stats.odPct}%)</small></div>
          </div>
        </div>

        {studentsError && <div className="af-error-banner">{studentsError}</div>}

        {/* ---------- students table (cards on mobile) ---------- */}
        <div className="af-table-wrap">
          <table className="af-table">
            <thead>
              <tr>
                <th className="af-col-num">
                  <SelectAllCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                    label="Select all students"
                  />
                </th>
                <th className="af-col-left">Student Name</th>
                <th className="af-col-roll">Roll No. &amp; RRN</th>
                <th>Attendance</th>
                <th className="af-col-checkin">Check-in</th>
                <th className="af-col-left af-col-remarks">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                <tr className="af-state-row"><td colSpan={6} className="af-state-cell">Loading students…</td></tr>
              ) : !classroomId ? (
                <tr className="af-state-row"><td colSpan={6} className="af-state-cell">{sessionLoading ? "Waiting for session details…" : "No classroom found for this session."}</td></tr>
              ) : students.length === 0 ? (
                <tr className="af-state-row"><td colSpan={6} className="af-state-cell">No students found in this classroom.</td></tr>
              ) : (
                students.map((s, idx) => {
                  const row = attendance[s.id] || {};
                  return (
                    <tr
                      key={s.id}
                      className={[
                        selected.has(s.id) ? "af-row-selected" : "",
                        row.status ? `af-row-${row.status}` : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <td
                        className={`af-col-num af-col-num-select${selected.has(s.id) ? " af-col-num-selected" : ""}`}
                        onClick={() => toggleSelectOne(s.id)}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected.has(s.id)}
                        aria-label={selected.has(s.id) ? `Deselect ${s.name}` : `Select ${s.name}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSelectOne(s.id);
                          }
                        }}
                      >
                        {selected.has(s.id) ? <span className="af-col-num-check" aria-hidden="true">✓</span> : idx + 1}
                      </td>

                      <td className="af-col-left af-col-name">
                        <div className="af-student">
                          <button
                            type="button"
                            className="af-avatar-btn"
                            aria-label={`Preview photo of ${s.name}`}
                            onClick={() => setPreviewStudent(s)}
                          >
                            {studentPhoto(s) ? (
                              <img src={studentPhoto(s)} alt="" className="af-avatar" />
                            ) : (
                              <span className="af-avatar af-avatar-initials">{initials(s.name)}</span>
                            )}
                          </button>
                          <div className="af-student-text">
                            <span className="af-student-name">{s.name}</span>
                            <span className="af-student-sub">
                              {s.roll_number ?? s.roll_no ?? "—"} | {s.rrn ?? "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="af-col-roll">
                        <div className="af-roll">
                          <span className="af-roll-no">{s.roll_number ?? s.roll_no ?? "—"}</span>
                          <span className="af-roll-rrn">{s.rrn ?? "—"}</span>
                        </div>
                      </td>
                      <td className="af-col-status">
                        <div className="af-row-status">
                          {ATTENDANCE_OPTIONS.map((o, i) => (
                            <button
                              key={o.value}
                              type="button"
                              title={o.label}
                              className={`af-bulk-btn af-bulk-btn-sm af-bulk-${o.value}${row.status === o.value ? " af-bulk-active" : ""}${i > 2 ? " af-opt-extra" : ""}`}
                              onClick={() => setStatus(s.id, o.value)}
                            >
                              <span className="af-lbl-full">{o.label}</span>
                              <span className="af-lbl-short">{o.short}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`af-more${["late", "leave", "excused"].includes(row.status) || row.remarks || row.check_in_time ? " af-more-active" : ""}`}
                            aria-label="More options"
                            aria-haspopup="menu"
                            onClick={(e) => openMenu(e, s.id)}
                          >
                            ⋮
                          </button>
                        </div>
                      </td>

                      <td className="af-col-checkin">
                        <button
                          type="button"
                          className={`af-time-btn${row.check_in_time ? " af-time-btn-set" : ""}`}
                          title={row.check_in_time ? "Edit check-in time" : "Add check-in time"}
                          aria-label="Check-in time"
                          onClick={() => openCheckIn(s.id)}
                        >
                          <ClockIcon />
                          {row.check_in_time && <span>{fmtTime(row.check_in_time)}</span>}
                        </button>
                      </td>

                      <td className="af-col-left af-col-remarks">
                        <input
                          type="text"
                          className="af-remarks-input"
                          placeholder="Add remarks…"
                          value={row.remarks || ""}
                          onChange={(e) => setRowRemarks(s.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- footer ---------- */}
      <div className="af-footer">

        <div className="af-footer-actions">
          <button type="button" className="af-btn af-btn-ghost" onClick={handleCancel}>Cancel</button>
          <button type="button" className="af-btn af-btn-primary" onClick={handleSave} disabled={saving || studentsLoading}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {/* ---------- mobile row menu ---------- */}
      {menu && (
        <div
          className="af-menu"
          role="menu"
          style={{ right: menu.right, top: menu.top ?? "auto", bottom: menu.bottom ?? "auto" }}
        >
          {ATTENDANCE_OPTIONS.slice(3).map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitem"
              className={`af-menu-item${attendance[menu.id]?.status === o.value ? " af-menu-item-active" : ""}`}
              onClick={() => { setStatus(menu.id, o.value); setMenu(null); }}
            >
              {o.label}
            </button>
          ))}
          <div className="af-menu-sep" />
          <button type="button" role="menuitem" className="af-menu-item" onClick={() => openCheckIn(menu.id)}>
            Check-in time{attendance[menu.id]?.check_in_time ? ` • ${fmtTime(attendance[menu.id].check_in_time)}` : ""}
          </button>
          <button type="button" role="menuitem" className="af-menu-item" onClick={() => openRowRemarks(menu.id)}>
            Remarks{attendance[menu.id]?.remarks ? " •" : ""}
          </button>
        </div>
      )}

      {/* ---------- per-student remarks modal ---------- */}
      {rowModal && (
        <div className="af-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setRowModal(null); }}>
          <div className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-row-remarks-title">
            <div className="af-modal-head">
              <h2 id="af-row-remarks-title">Remarks{rowModal.name ? ` – ${rowModal.name}` : ""}</h2>
              <button type="button" className="af-modal-x" onClick={() => setRowModal(null)} aria-label="Close">×</button>
            </div>
            <textarea
              autoFocus
              rows={4}
              placeholder="Add remarks for this student…"
              value={rowModal.draft}
              onChange={(e) => setRowModal((m) => ({ ...m, draft: e.target.value }))}
            />
            <div className="af-modal-actions">
              <button type="button" className="af-btn af-btn-ghost" onClick={() => setRowModal(null)}>Cancel</button>
              <button type="button" className="af-btn af-btn-primary" onClick={saveRowRemarks}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- check-in time modal ---------- */}
      {timeModal && (
        <div className="af-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setTimeModal(null); }}>
          <div className="af-modal af-modal-sm" role="dialog" aria-modal="true" aria-labelledby="af-time-title">
            <div className="af-modal-head">
              <h2 id="af-time-title">Check-in Time{timeModal.name ? ` – ${timeModal.name}` : ""}</h2>
              <button type="button" className="af-modal-x" onClick={() => setTimeModal(null)} aria-label="Close">×</button>
            </div>
            <input
              type="time"
              autoFocus
              className="af-remarks-input af-time-input"
              value={timeModal.draft}
              onChange={(e) => setTimeModal((m) => ({ ...m, draft: e.target.value }))}
            />
            <div className="af-modal-actions">
              <button type="button" className="af-btn af-btn-ghost" onClick={() => applyCheckIn("")}>Clear</button>
              <button type="button" className="af-btn af-btn-primary" onClick={() => applyCheckIn(timeModal.draft)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- remarks modal ---------- */}
      {remarksOpen && (
        <div className="af-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setRemarksOpen(false); }}>
          <div className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-remarks-title">
            <div className="af-modal-head">
              <h2 id="af-remarks-title">Session Remarks</h2>
              <button type="button" className="af-modal-x" onClick={() => setRemarksOpen(false)} aria-label="Close">×</button>
            </div>
            <textarea
              autoFocus
              rows={4}
              placeholder="Add remarks for this session…"
              value={remarksDraft}
              onChange={(e) => setRemarksDraft(e.target.value)}
            />
            <div className="af-modal-actions">
              <button type="button" className="af-btn af-btn-ghost" onClick={() => setRemarksOpen(false)}>Cancel</button>
              <button type="button" className="af-btn af-btn-primary" onClick={saveRemarks}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- save error popup ---------- */}
      {saveError && (
        <div className="af-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSaveError(""); }}>
          <div className="af-modal af-modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="af-error-title">
            <div className="af-modal-head">
              <h2 id="af-error-title" className="af-modal-error">Unable to save attendance</h2>
              <button type="button" className="af-modal-x" onClick={() => setSaveError("")} aria-label="Close">×</button>
            </div>
            <p className="af-modal-text af-modal-error-msg">{saveError}</p>
            <div className="af-modal-actions">
              <button type="button" className="af-btn af-btn-primary" autoFocus onClick={() => setSaveError("")}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- profile picture preview ---------- */}
      {previewStudent && (
        <PhotoPreviewModal
          item={{
            ...previewStudent,
            photo_url: studentPhoto(previewStudent),
          }}
          onClose={() => setPreviewStudent(null)}
          subtitle={previewStudent.roll_number ?? previewStudent.roll_no ?? ""}
        />
      )}

      {/* ---------- leave-page confirmation ---------- */}
      {leaveOpen && (
        <div className="af-modal-backdrop">
          <div className="af-modal af-modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="af-leave-title">
            <div className="af-modal-head">
              <h2 id="af-leave-title">Leave this page?</h2>
            </div>
            <p className="af-modal-text">
              The attendance data you entered will be lost if you leave. Only the Save button keeps your changes.
            </p>
            <div className="af-modal-actions">
              <button type="button" className="af-btn af-btn-ghost" onClick={stayHere}>Stay on page</button>
              <button type="button" className="af-btn af-btn-danger" onClick={leaveNow}>Leave anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default AttendanceForm;