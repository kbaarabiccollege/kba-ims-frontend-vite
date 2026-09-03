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
// 2. Days of the week. Hardcoded Monday–Saturday (DAYS below), same as
//    the mockup. Add/remove entries there if your college also
//    schedules Sunday or runs a 5-day week for some formats.
//
// 3. Saving period assignments. There's no documented endpoint for
//    "assign subject+staff to period X" individually, so the whole grid
//    is kept in local state (`periodAssignments`) and sent as a single
//    `periods` array inside the create/update payload:
//      { day, period_number, subject_id, staff_id }[]
//    When editing, I read any existing assignments back off
//    `timetable.periods` using the same shape. Adjust both spots
//    together if your backend's real contract differs.
//
// 4. Classroom/format lists are filtered to the selected course both
//    via a `course` query param AND a client-side filter, so this
//    keeps working even if the backend doesn't support that param yet.
//
// 5. Effective From/To use a native <input type="date"> with a calendar
//    glyph overlaid on top (not a custom picker component), since none
//    was available to reuse — the browser's native picker opens on
//    click same as the mockup's calendar icon.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTimetable, createTimetable, updateTimetable } from "../../../api/timetableApi";
import { getTimetableFormats, getTimetableFormat } from "../../../api/timetableFormatApi";
import { getClassrooms } from "../../../api/classroomsApi";
import { getSubjects } from "../../../api/subjectsApi";
import { getStaff } from "../../../api/staffApi";
import { COURSES } from "../../../utils/constants";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/UserList.css";
import "../../../styles/TimetableForm.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emptyForm = {
  timetable_name: "",
  course: "",
  classroom_id: "",
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
  const [activeCell, setActiveCell] = useState(null); // { day, period }
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
          effective_from: (tt.effective_from || "").split("T")[0],
          effective_to: (tt.effective_to || "").split("T")[0],
          notes: tt.notes || "",
          is_active: tt.is_active ?? 1,
          format_id: tt.format_id != null ? String(tt.format_id) : "",
        });

        setRawPeriodAssignments(tt.periods || []);
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
      const idx = selectedFormat.periods.findIndex(
        (p, i) => String(p.period_number ?? i + 1) === String(raw.period_number)
      );
      if (idx === -1) return;
      assignments[periodKey(raw.day, idx)] = {
        subjectId: raw.subject_id != null ? String(raw.subject_id) : "",
        staffId: raw.staff_id != null ? String(raw.staff_id) : "",
        day: raw.day,
        periodNumber: raw.period_number,
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

  // ---- course change resets classroom/format + clears the grid, since
  // both are scoped to a course and stale assignments won't line up
  // with a newly-chosen format's periods ----
  const handleCourseChange = (value) => {
    setField("course", value);
    setField("classroom_id", "");
    setField("format_id", "");
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
    const key = periodKey(day, index);
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
    const key = periodKey(activeCell.day, activeCell.index);
    setPeriodAssignments((prev) => ({
      ...prev,
      [key]: {
        subjectId: cellSubjectId,
        staffId: cellStaffId,
        day: activeCell.day,
        periodNumber: activeCell.period.period_number ?? activeCell.index + 1,
      },
    }));
    setActiveCell(null);
  };

  const handleCellRemove = () => {
    const key = periodKey(activeCell.day, activeCell.index);
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

    const periods = Object.values(periodAssignments).map((val) => ({
      day: val.day,
      period_number: val.periodNumber,
      subject_id: val.subjectId,
      staff_id: val.staffId,
    }));

    const payload = {
      timetable_name: form.timetable_name.trim(),
      course: form.course,
      classroom_id: form.classroom_id,
      format_id: form.format_id,
      effective_from: form.effective_from,
      effective_to: form.effective_to,
      notes: form.notes,
      is_active: form.is_active ? 1 : 0,
      periods,
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
        <div className="tf-header">
          <h1>{isEdit ? "Edit Timetable" : "Create Timetable"}</h1>
          <p>
            {isEdit
              ? "Update the details for this timetable."
              : "Create a new timetable for the selected classroom and time period."}
          </p>
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

            <div className="st-field tf-field-status">
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
                    <tr key={day}>
                      <td className="tf-day-cell">{day}</td>
                      {periods.map((p, idx) => {
                        const type = getPeriodType(p);
                        if (type !== "period") {
                          return <td key={p.id ?? `period-${idx}`} className="tf-col-break" />;
                        }
                        const key = periodKey(day, idx);
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
                                aria-label={`Add subject and staff for ${day}, period ${p.period_label ?? p.label ?? p.period_number ?? idx + 1}`}
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
                {activeCell.day} · Period {activeCell.period.period_label ?? activeCell.period.label ?? activeCell.period.period_number ?? activeCell.index + 1}
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
                {periodAssignments[periodKey(activeCell.day, activeCell.index)] && (
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