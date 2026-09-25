// src/pages/admin/timetable/TimetableForm.jsx
//
// Create + Edit Timetable — one file for both, switching on the :id
// route param (mirrors how Staff/Students share a single form file).
//
// ASSUMPTIONS (please adjust to match your real API contracts —
// flagged the same way staffApi.js/timetableApi.js already do):
//
// 1. Timetable format "periods" shape. getTimetableFormat(id) is
//    assumed to return a `periods` array on `data`, one entry per
//    column in the preview table:
//      { id, period_number, start_time, end_time, type }
//    where `type` is "period" | "break" | "lunch". I read `type` first
//    and fall back to `is_break` / `is_lunch` booleans if that's what
//    your API actually sends — see getPeriodType() below. If the field
//    names differ entirely, that's the one place to edit.
//
// 2. Days of the week / day_id mapping. Hardcoded Monday–Saturday
//    (DAYS below) as { id, name } pairs, since no /days endpoint was
//    given. I've assumed Monday=1 … Saturday=6, but the sample slot in
//    the request spec has `day_id: 7`, which doesn't fit that under a
//    6-day week — PLEASE CONFIRM the real id mapping (e.g. an
//    ISO-style Sunday=1 scheme, or a separate lookup endpoint) and
//    update the ids below.
//
// 3. Saving period assignments. The grid is kept in local state
//    (`periodAssignments`) and sent as a `slots` array inside the
//    create/update payload:
//      { day_id, period_id, subject_id, staff_id, remarks }[]
//    When editing, I read any existing assignments back off
//    `timetable.periods` (falling back to `timetable.slots` if the read
//    endpoint has also switched shapes — see the edit-mode loader
//    below). Adjust both spots together if your backend's real
//    contract differs.
//
// 4. Classroom/format/academic-term lists are filtered to the selected
//    course both via a `course_id` query param AND (for classrooms/
//    formats) a client-side filter, so this keeps working even if the
//    backend doesn't support that param yet.
//
// 5. Effective From/To use a native <input type="date"> with a calendar
//    glyph overlaid on top (not a custom picker component), since none
//    was available to reuse — the browser's native picker opens on
//    click same as the mockup's calendar icon.
//
// 6. Course is a client-side-only filter now. It scopes which
//    classrooms/formats/subjects/academic sessions are shown, but is
//    never sent in the create/update payload — the backend only wants
//    classroom_id + academic_term_id, from which it can presumably
//    derive the course itself.
//
// 7. Academic Session (academic_terms). GET /academic-terms takes
//    course_id, is_current, and is_active. On course change we fetch
//    just the current term (is_current=1) and preselect it. The full
//    active list is fetched lazily the first time the dropdown is
//    opened, via a `loadAllAcademicTerms` callback wired to whatever
//    "opened" event SearchableDropdown exposes — I've assumed `onOpen`;
//    rename if the component uses a different prop (onFocus, etc).
//    Display field is assumed to be `name`; adjust if your API sends
//    `term_name` or similar.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTimetable, createTimetable, updateTimetable } from "../../../api/timetableApi";
import { getTimetableFormats, getTimetableFormat } from "../../../api/timetableFormatApi";
import { getAcademicTerms } from "../../../api/academicTermsApi";
import { getClassrooms } from "../../../api/classroomsApi";
import { getSubjects } from "../../../api/subjectsApi";
import { getStaff } from "../../../api/staffApi";
import { COURSES } from "../../../utils/constants";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/UserList.css";
import "../../../styles/TimetableForm.css";

// ASSUMPTION #2 above — confirm real day_id values against your backend.
const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

const emptyForm = {
  timetable_name: "",
  course: "", // client-side only — scopes classrooms/formats/academic
              // sessions, never sent in the create/update payload
  classroom_id: "",
  academic_term_id: "",
  effective_from: "",
  effective_to: "",
  notes: "",
  is_active: 1,
  format_id: "",
};

function periodKey(day, periodIndex) {
  return `${day}::${periodIndex}`;
}

// See assumption #1 above — normalizes whichever shape the backend uses
// for marking a column as a break/lunch slot vs. a teachable period.
function getPeriodType(period) {
  if (period.type) return period.type;
  if (period.is_break) return "break";
  if (period.is_lunch) return "lunch";
  return "period";
}

// Shrinks long subject/staff names in filled period cells so they don't
// overflow the fixed cell size — see .tf-text-sm / .tf-text-xs in CSS.
function getTextSizeClass(text) {
  if (!text) return "";
  if (text.length > 18) return "tf-text-xs";
  if (text.length > 12) return "tf-text-sm";
  return "";
}

// Backend sends "HH:MM:SS" — drop the seconds for display (e.g. "09:00").
function formatTimeHM(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

const TimetableForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  usePageTitle(isEdit ? "Edit Timetable" : "Create Timetable");
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [classrooms, setClassrooms] = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);

  const [academicTerms, setAcademicTerms] = useState([]);
  const [academicTermsLoading, setAcademicTermsLoading] = useState(false);
  // Tracks whether we've already fetched the full active list (vs. just
  // the single is_current=1 default), so opening the dropdown twice
  // doesn't refetch.
  const [academicTermsFullyLoaded, setAcademicTermsFullyLoaded] = useState(false);

  const [formats, setFormats] = useState([]);
  const [formatsLoading, setFormatsLoading] = useState(false);

  const [selectedFormat, setSelectedFormat] = useState(null);
  const [formatLoading, setFormatLoading] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const [periodAssignments, setPeriodAssignments] = useState({});
  const [rawPeriodAssignments, setRawPeriodAssignments] = useState(null);
  const [activeCell, setActiveCell] = useState(null); // { day, period, index }
  const [cellSubjectId, setCellSubjectId] = useState("");
  const [cellStaffId, setCellStaffId] = useState("");
  const [cellError, setCellError] = useState("");

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const courseOptions = useMemo(
    () => Object.entries(COURSES).map(([cid, label]) => ({ id: cid, label })),
    []
  );

  // ---- staff: fetched once, not course-dependent ----
  useEffect(() => {
    let cancelled = false;
    setStaffLoading(true);
    getStaff({ page: 1, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setStaffList(res?.data || []);
      })
      .catch(() => !cancelled && setStaffList([]))
      .finally(() => !cancelled && setStaffLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- classrooms + formats + subjects: reloaded whenever course changes ----
  useEffect(() => {
    if (!form.course) {
      setClassrooms([]);
      setFormats([]);
      setSubjects([]);
      return undefined;
    }
    let cancelled = false;

    setClassroomsLoading(true);
    getClassrooms({ page: 1, limit: 100, course: form.course })
      .then((res) => {
        if (cancelled) return;
        const rows = (res?.data || []).filter((c) => String(c.course) === String(form.course));
        setClassrooms(rows);
      })
      .catch(() => !cancelled && setClassrooms([]))
      .finally(() => !cancelled && setClassroomsLoading(false));

    setFormatsLoading(true);
    getTimetableFormats({ page: 1, limit: 100, course: form.course })
      .then((res) => {
        if (cancelled) return;
        const rows = (res?.data || []).filter((f) => String(f.course) === String(form.course));
        setFormats(rows);
      })
      .catch(() => !cancelled && setFormats([]))
      .finally(() => !cancelled && setFormatsLoading(false));

    setSubjectsLoading(true);
    getSubjects({ page: 1, limit: 100, course: form.course })
      .then((res) => !cancelled && setSubjects(res?.data || []))
      .catch(() => !cancelled && setSubjects([]))
      .finally(() => !cancelled && setSubjectsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [form.course]);

  // ---- academic session (academic_terms): fetch only the current term
  // by default (is_current=1, is_active=1) and preselect it. The full
  // active list is only fetched lazily, when the dropdown is opened —
  // see loadAllAcademicTerms below. ----
  useEffect(() => {
    if (!form.course) {
      setAcademicTerms([]);
      setAcademicTermsFullyLoaded(false);
      return undefined;
    }
    let cancelled = false;
    setAcademicTermsLoading(true);
    getAcademicTerms({ course_id: form.course, is_current: 1, is_active: 1 })
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data || [];
        setAcademicTerms(rows);
        // Don't clobber an already-selected value (e.g. one just loaded
        // from an existing timetable in edit mode).
        setForm((f) =>
          f.academic_term_id ? f : { ...f, academic_term_id: rows[0] ? String(rows[0].id) : "" }
        );
      })
      .catch(() => !cancelled && setAcademicTerms([]))
      .finally(() => !cancelled && setAcademicTermsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [form.course]);

  // Lazy full list, fired when the Academic Session dropdown is opened.
  // ASSUMPTION: SearchableDropdown exposes an `onOpen` callback fired the
  // first time its option list is shown — swap for whatever prop name it
  // actually uses (e.g. onFocus / onDropdownOpen) if different.
  const loadAllAcademicTerms = useCallback(() => {
    if (!form.course || academicTermsFullyLoaded || academicTermsLoading) return;
    setAcademicTermsLoading(true);
    getAcademicTerms({ course_id: form.course, is_active: 1 })
      .then((res) => {
        setAcademicTerms(res?.data || []);
        setAcademicTermsFullyLoaded(true);
      })
      .catch(() => {})
      .finally(() => setAcademicTermsLoading(false));
  }, [form.course, academicTermsFullyLoaded, academicTermsLoading]);

  // ---- full format detail (periods grid) whenever format_id changes ----
  useEffect(() => {
    if (!form.format_id) {
      setSelectedFormat(null);
      return undefined;
    }
    let cancelled = false;
    setFormatLoading(true);
    getTimetableFormat(form.format_id)
      .then((res) => !cancelled && setSelectedFormat(res?.data || null))
      .catch(() => !cancelled && setSelectedFormat(null))
      .finally(() => !cancelled && setFormatLoading(false));
    return () => {
      cancelled = true;
    };
  }, [form.format_id]);

  // ---- edit mode: load the existing timetable ----
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    setLoading(true);
    getTimetable(id)
      .then((res) => {
        if (cancelled) return;
        const tt = res?.data || {};
        setForm({
          timetable_name: tt.timetable_name || "",
          course: tt.course != null ? String(tt.course) : "",
          classroom_id: tt.classroom_id != null ? String(tt.classroom_id) : "",
          academic_term_id: tt.academic_term_id != null ? String(tt.academic_term_id) : "",
          effective_from: (tt.effective_from || "").split("T")[0],
          effective_to: (tt.effective_to || "").split("T")[0],
          notes: tt.notes || "",
          is_active: tt.is_active ?? 1,
          format_id: tt.format_id != null ? String(tt.format_id) : "",
        });

        // ASSUMPTION: GET /timetables/:id still returns the slot list as
        // `periods` (day/period_number shaped) rather than the new
        // `slots` (day_id/period_id shaped) format used by create/update.
        // If the read endpoint has also switched to `slots`, prefer
        // `tt.slots` here — the mapping effect below already supports
        // either shape.
        setRawPeriodAssignments(tt.periods || tt.slots || []);
      })
      .catch(() => !cancelled && setFormError("Couldn't load this timetable."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    if (!rawPeriodAssignments || !selectedFormat?.periods?.length) return;
    const assignments = {};
    rawPeriodAssignments.forEach((raw) => {
      // Supports either the legacy `period_number` shape or the new
      // `period_id` (matches selectedFormat.periods[i].id) shape.
      const idx =
        raw.period_id != null
          ? selectedFormat.periods.findIndex((p, i) => String(p.id ?? i) === String(raw.period_id))
          : selectedFormat.periods.findIndex(
              (p, i) => String(p.period_number ?? i + 1) === String(raw.period_number)
            );
      if (idx === -1) return;

      const dayId = raw.day_id ?? DAYS.find((d) => d.name === raw.day)?.id;
      const day = DAYS.find((d) => String(d.id) === String(dayId));
      if (!day) return;

      assignments[periodKey(day.name, idx)] = {
        subjectId: raw.subject_id != null ? String(raw.subject_id) : "",
        staffId: raw.staff_id != null ? String(raw.staff_id) : "",
        day,
        periodId: selectedFormat.periods[idx].id,
        remarks: raw.remarks ?? null,
      };
    });
    setPeriodAssignments(assignments);
    setRawPeriodAssignments(null);
  }, [rawPeriodAssignments, selectedFormat]);

  const classroomOptions = useMemo(
    () => classrooms.map((c) => ({ id: String(c.id), label: c.room_no ? `${c.name} (${c.room_no})` : c.name })),
    [classrooms]
  );
  const classroomLabelsById = useMemo(() => {
    const map = {};
    classrooms.forEach((c) => {
      map[String(c.id)] = c.room_no ? `${c.name} (${c.room_no})` : c.name;
    });
    return map;
  }, [classrooms]);

  // ASSUMPTION: academic_terms rows expose a `name` field for display
  // (e.g. "2026-27 Odd Semester") — swap for `term_name` etc. if that's
  // what the API actually sends.
  const academicTermOptions = useMemo(
    () => academicTerms.map((t) => ({ id: String(t.id), label: t.name })),
    [academicTerms]
  );
  const academicTermLabelsById = useMemo(() => {
    const map = {};
    academicTerms.forEach((t) => {
      map[String(t.id)] = t.name;
    });
    return map;
  }, [academicTerms]);

  const formatOptions = useMemo(
    () => formats.map((f) => ({ id: String(f.id), label: f.format_name })),
    [formats]
  );
  const formatLabelsById = useMemo(() => {
    const map = {};
    formats.forEach((f) => {
      map[String(f.id)] = f.format_name;
    });
    return map;
  }, [formats]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: String(s.id), label: s.short_name ? `${s.short_name} - ${s.name}` : s.name })),
    [subjects]
  );
  const subjectLabelsById = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[String(s.id)] = s.short_name || s.name;
    });
    return map;
  }, [subjects]);

  // Split out for the timetable cell, which shows the code above the
  // display_name (falling back to name) rather than one or the other.
  const subjectCodesById = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      if (s.code) map[String(s.id)] = s.code;
    });
    return map;
  }, [subjects]);

  const subjectNamesById = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[String(s.id)] = s.display_name || s.name;
    });
    return map;
  }, [subjects]);

  const staffOptions = useMemo(
    () => staffList.map((s) => ({ id: String(s.id), label: s.name })),
    [staffList]
  );
  const staffLabelsById = useMemo(() => {
    const map = {};
    staffList.forEach((s) => {
      map[String(s.id)] = s.name;
    });
    return map;
  }, [staffList]);

  // Timetable cell shows the staff's short_name (falls back to full
  // name if a staff record doesn't have one) instead of the full name.
  const staffShortNamesById = useMemo(() => {
    const map = {};
    staffList.forEach((s) => {
      map[String(s.id)] = s.short_name || s.name;
    });
    return map;
  }, [staffList]);

  // ---- course change resets classroom/academic session/format + clears
  // the grid, since all are scoped to a course and stale assignments
  // won't line up with a newly-chosen format's periods ----
  const handleCourseChange = (value) => {
    setField("course", value);
    setField("classroom_id", "");
    setField("academic_term_id", "");
    setField("format_id", "");
    setAcademicTerms([]);
    setAcademicTermsFullyLoaded(false);
    setPeriodAssignments({});
    setRawPeriodAssignments(null);
  };

  const handleFormatChange = (value) => {
    setField("format_id", value);
    setPeriodAssignments({});
    setRawPeriodAssignments(null);
  };

  // ---- period cell popup ----
  const openCell = (day, period, index) => {
    const key = periodKey(day.name, index);
    const existing = periodAssignments[key];
    setCellSubjectId(existing?.subjectId || "");
    setCellStaffId(existing?.staffId || "");
    setCellError("");
    setActiveCell({ day, period, index });
  };
  const closeCell = () => setActiveCell(null);

  const handleCellSave = () => {
    if (!cellSubjectId || !cellStaffId) {
      setCellError("Select both a subject and staff member.");
      return;
    }
    const key = periodKey(activeCell.day.name, activeCell.index);
    setPeriodAssignments((prev) => ({
      ...prev,
      [key]: {
        subjectId: cellSubjectId,
        staffId: cellStaffId,
        day: activeCell.day,
        periodId: activeCell.period.id,
        remarks: prev[key]?.remarks ?? null,
      },
    }));
    setActiveCell(null);
  };

  const handleCellRemove = () => {
    const key = periodKey(activeCell.day.name, activeCell.index);
    setPeriodAssignments((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveCell(null);
  };

  // ---- submit ----
  const validate = () => {
    const errs = {};
    if (!form.timetable_name.trim()) errs.timetable_name = "Timetable name is required.";
    if (!form.course) errs.course = "Course is required.";
    if (!form.classroom_id) errs.classroom_id = "Classroom is required.";
    if (!form.academic_term_id) errs.academic_term_id = "Academic session is required.";
    if (!form.effective_from) errs.effective_from = "Effective from date is required.";
    if (!form.effective_to) errs.effective_to = "Effective to date is required.";
    if (!form.format_id) errs.format_id = "Timetable format is required.";
    if (
      form.effective_from &&
      form.effective_to &&
      new Date(form.effective_to) < new Date(form.effective_from)
    ) {
      errs.effective_to = "Effective to must be on or after effective from.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    const slots = Object.values(periodAssignments).map((val) => ({
      day_id: val.day.id,
      period_id: val.periodId,
      subject_id: val.subjectId,
      staff_id: val.staffId,
      remarks: val.remarks ?? null,
    }));

    const payload = {
      timetable_name: form.timetable_name.trim(),
      // `course` is intentionally left off — it's only used client-side
      // to scope classrooms/formats/academic sessions, never sent to
      // the backend.
      classroom_id: form.classroom_id,
      academic_term_id: form.academic_term_id,
      format_id: form.format_id,
      effective_from: form.effective_from,
      effective_to: form.effective_to,
      notes: form.notes,
      is_active: form.is_active ? 1 : 0,
      slots,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateTimetable(id, payload);
      } else {
        await createTimetable(payload);
      }
      navigate("/admin/timetable");
    } catch (err) {
      setFormError(err?.response?.data?.message || "Couldn't save this timetable.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/admin/timetable");

  const periods = selectedFormat?.periods || [];

  if (loading) {
    return (
      <div className="st-page tf-form-page">
        <div className="tf-outer-card">
          <div className="st-state-cell">Loading timetable…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="st-page tf-form-page">
      <form className="tf-outer-card" onSubmit={handleSubmit}>
        <div className="tf-header tf-header-row">
          <div className="tf-header-text">
            <h1>{isEdit ? "Edit Timetable" : "Create Timetable"}</h1>
            <p>
              {isEdit
                ? "Update the details for this timetable."
                : "Create a new timetable for the selected classroom and time period."}
            </p>
          </div>

          <div className="st-field tf-field-status tf-header-status">
            <label>Status</label>
            <div className="tf-status-row">
              <button
                type="button"
                className={`st-toggle ${form.is_active ? "st-toggle-on" : ""}`}
                onClick={() => setField("is_active", form.is_active ? 0 : 1)}
                aria-pressed={Boolean(form.is_active)}
                aria-label="Toggle status"
              >
                <span className="st-toggle-thumb" />
              </button>
              <span className="tf-status-label">{form.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>

        {formError && <div className="st-error-banner tf-inset">{formError}</div>}

        <div className="tf-panel tf-details-panel">
          <div className="tf-fields-grid">
            <div className="st-field tf-field-name">
              <label>
                Timetable Name <span className="tf-required">*</span>
              </label>
              <input
                type="text"
                value={form.timetable_name}
                onChange={(e) => setField("timetable_name", e.target.value)}
                placeholder="e.g. First Year - Classroom 101"
              />
              {fieldErrors.timetable_name && <span className="tf-field-error">{fieldErrors.timetable_name}</span>}
            </div>

            <div className="st-field tf-field-course">
              <label>
                Course <span className="tf-required">*</span>
              </label>
              <SearchableDropdown
                allLabel="Select Course"
                options={courseOptions}
                value={form.course || "all"}
                onChange={(v) => handleCourseChange(v === "all" ? "" : v)}
              />
              {fieldErrors.course && <span className="tf-field-error">{fieldErrors.course}</span>}
            </div>

            <div className="st-field tf-field-academic-session">
              <label>
                Academic Session <span className="tf-required">*</span>
              </label>
              <SearchableDropdown
                allLabel={form.course ? "Select Academic Session" : "Select a course first"}
                options={academicTermOptions}
                value={form.academic_term_id || "all"}
                onChange={(v) => setField("academic_term_id", v === "all" ? "" : v)}
                selectedLabel={academicTermLabelsById[form.academic_term_id]}
                loading={academicTermsLoading}
                onOpen={loadAllAcademicTerms}
              />
              {fieldErrors.academic_term_id && (
                <span className="tf-field-error">{fieldErrors.academic_term_id}</span>
              )}
            </div>

            <div className="st-field tf-field-classroom">
              <label>
                Classroom <span className="tf-required">*</span>
              </label>
              <SearchableDropdown
                allLabel={form.course ? "Select Classroom" : "Select a course first"}
                options={classroomOptions}
                value={form.classroom_id || "all"}
                onChange={(v) => setField("classroom_id", v === "all" ? "" : v)}
                selectedLabel={classroomLabelsById[form.classroom_id]}
                loading={classroomsLoading}
              />
              {fieldErrors.classroom_id && <span className="tf-field-error">{fieldErrors.classroom_id}</span>}
            </div>

            <div className="st-field tf-field-from">
              <label>
                Effective From <span className="tf-required">*</span>
              </label>
              <div className="tf-date-input">
                <input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setField("effective_from", e.target.value)}
                />
                <span className="tf-date-icon" aria-hidden="true">📅</span>
              </div>
              {fieldErrors.effective_from && <span className="tf-field-error">{fieldErrors.effective_from}</span>}
            </div>

            <div className="st-field tf-field-to">
              <label>
                Effective To <span className="tf-required">*</span>
              </label>
              <div className="tf-date-input">
                <input
                  type="date"
                  value={form.effective_to}
                  onChange={(e) => setField("effective_to", e.target.value)}
                />
                <span className="tf-date-icon" aria-hidden="true">📅</span>
              </div>
              {fieldErrors.effective_to && <span className="tf-field-error">{fieldErrors.effective_to}</span>}
            </div>

            <div className="st-field tf-field-notes">
              <label>Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Optional note about this schedule"
              />
            </div>

            <div className="st-field tf-field-format">
              <label>
                Timetable Format <span className="tf-required">*</span>
              </label>
              <SearchableDropdown
                allLabel={form.course ? "Select Format" : "Select a course first"}
                options={formatOptions}
                value={form.format_id || "all"}
                onChange={(v) => handleFormatChange(v === "all" ? "" : v)}
                selectedLabel={formatLabelsById[form.format_id]}
                loading={formatsLoading}
              />
              {fieldErrors.format_id && <span className="tf-field-error">{fieldErrors.format_id}</span>}
            </div>
          </div>
        </div>

        <div className="tf-preview-header">
          <h2>Timetable Preview</h2>
          <p>Click + to add subject and staff for each period.</p>
        </div>

        <div className="tf-panel tf-table-panel">
          {!form.format_id ? (
            <div className="st-state-cell">Choose a timetable format above to build the schedule.</div>
          ) : formatLoading ? (
            <div className="st-state-cell">Loading periods…</div>
          ) : periods.length === 0 ? (
            <div className="st-state-cell">This format has no periods configured.</div>
          ) : (
            <div className="tf-table-scroll">
              <table className="tf-grid-table">
                <thead>
                  <tr>
                    <th className="tf-day-header">Day / Period</th>
                    {periods.map((p, idx) => {
                      const type = getPeriodType(p);
                      return (
                        <th key={p.id ?? `period-${idx}`} className={type !== "period" ? "tf-col-break" : ""}>
                          {type === "period" ? (
                            <>
                              <div className="tf-period-num">
                                {p.period_label ?? p.label ?? p.period_number ?? idx + 1}
                              </div>
                              <div className="tf-period-time">
                                {formatTimeHM(p.start_time)} – {formatTimeHM(p.end_time)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="tf-period-num">
                                {p.period_label ?? p.label ?? type.toUpperCase()}
                              </div>
                              <div className="tf-period-time">
                                {formatTimeHM(p.start_time)} – {formatTimeHM(p.end_time)}
                              </div>
                            </>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day.id}>
                      <td className="tf-day-cell">{day.name}</td>
                      {periods.map((p, idx) => {
                        const type = getPeriodType(p);
                        if (type !== "period") {
                          return <td key={p.id ?? `period-${idx}`} className="tf-col-break" />;
                        }
                        const key = periodKey(day.name, idx);
                        const assignment = periodAssignments[key];
                        return (
                          <td key={p.id ?? `period-${idx}`}>
                            {assignment ? (
                              <button
                                type="button"
                                className="tf-period-filled"
                                onClick={() => openCell(day, p, idx)}
                                title={`${subjectLabelsById[assignment.subjectId] || ""} — ${staffLabelsById[assignment.staffId] || ""}`}
                              >
                                {subjectCodesById[assignment.subjectId] && (
                                  <span className="tf-period-code">
                                    {subjectCodesById[assignment.subjectId]}
                                  </span>
                                )}
                                <span
                                  className={`tf-period-filled-subject ${getTextSizeClass(
                                    subjectNamesById[assignment.subjectId]
                                  )}`}
                                >
                                  {subjectNamesById[assignment.subjectId] || "—"}
                                </span>
                                <span
                                  className={`tf-period-filled-staff ${getTextSizeClass(
                                    staffShortNamesById[assignment.staffId]
                                  )}`}
                                >
                                  {staffShortNamesById[assignment.staffId] || "—"}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="tf-period-add"
                                onClick={() => openCell(day, p, idx)}
                                aria-label={`Add subject and staff for ${day.name}, period ${p.period_label ?? p.label ?? p.period_number ?? idx + 1}`}
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="tf-footer">
          <button type="button" className="st-btn st-btn-ghost" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="st-btn st-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      {activeCell && (
        <div className="st-modal-overlay" onClick={closeCell}>
          <div className="st-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="st-modal-header">
              <h2>
                {activeCell.day.name} · Period {activeCell.period.period_label ?? activeCell.period.label ?? activeCell.period.period_number ?? activeCell.index + 1}
              </h2>
              <button type="button" className="st-modal-close" onClick={closeCell} aria-label="Close">
                ×
              </button>
            </div>
            <div className="st-modal-body">
              <p className="st-modal-subtext">
                {formatTimeHM(activeCell.period.start_time)} – {formatTimeHM(activeCell.period.end_time)}
              </p>

              <div className="st-bulk-form">
                <div className="st-field">
                  <label>Subject</label>
                  <SearchableDropdown
                    allLabel={subjectsLoading ? "Loading subjects…" : "Select Subject"}
                    options={subjectOptions}
                    value={cellSubjectId || "all"}
                    onChange={(v) => setCellSubjectId(v === "all" ? "" : v)}
                    selectedLabel={subjectLabelsById[cellSubjectId]}
                    loading={subjectsLoading}
                  />
                </div>
                <div className="st-field">
                  <label>Staff</label>
                  <SearchableDropdown
                    allLabel={staffLoading ? "Loading staff…" : "Select Staff"}
                    options={staffOptions}
                    value={cellStaffId || "all"}
                    onChange={(v) => setCellStaffId(v === "all" ? "" : v)}
                    selectedLabel={staffLabelsById[cellStaffId]}
                    loading={staffLoading}
                  />
                </div>
              </div>

              {cellError && <div className="st-error-banner">{cellError}</div>}

              <div className="st-modal-actions tf-cell-actions">
                {periodAssignments[periodKey(activeCell.day.name, activeCell.index)] && (
                  <button type="button" className="st-btn st-btn-danger tf-cell-remove" onClick={handleCellRemove}>
                    Remove
                  </button>
                )}
                <button type="button" className="st-btn st-btn-ghost" onClick={closeCell}>
                  Cancel
                </button>
                <button type="button" className="st-btn st-btn-primary" onClick={handleCellSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableForm;