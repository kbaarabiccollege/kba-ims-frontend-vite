// src/pages/admin/settings/TimetableFormatForm.jsx
//
// Reusable Create/Edit form for Timetable Formats. Mode is derived from
// the route param the same way StaffForm.jsx does it (id present =>
// edit). One component, one piece of state — only the page title,
// initial data load, submit handler, and primary button label differ
// between the two modes (per the spec).
//
// Reused from the app's existing conventions (see StaffForm.jsx):
// - useAuth() for the role-based basePath / navigation target
// - useToast() + crudMessage() for success/error notifications
// - usePageTitle() for the browser tab title
// - .tf-* tokens/classes from TimetableFormat.css (buttons, error
//   banner, page header, card shadow/radius) — NOT re-declared here.
// New, form-specific styling (day cards, period rows, BREAK/LUNCH row
// tinting, the Active toggle) lives in TimetableFormatForm.css.
//
// ASSUMPTIONS (adjust to match your actual backend/routes):
// - Route is something like /admin/settings/timetable-format/new and
//   /admin/settings/timetable-format/:id/edit — update ROLE_BASE_PATHS'
//   usage below (the `${basePath}/settings/timetable-format` target)
//   if your actual route differs.
// - GET /api/timetable-formats/:id returns `data.days` (each with
//   day_order/day_name) and `data.periods` (each with period_order,
//   period_key, period_label, start_time, end_time, is_break, is_lunch)
//   alongside the flat fields shown in your list-endpoint sample.
// - `course` is a numeric FK — COURSE_OPTIONS is stubbed the same way
//   the list page stubs it; wire it to the real courses endpoint.
// - On update, the full current form state is sent as the PATCH body
//   (same shape as create). Your PATCH example only showed a single
//   changed field, but nothing in the contract suggests partial-only
//   updates are required — trim this down to a diff if your backend
//   needs strictly-partial PATCH bodies.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getTimetableFormat,
  createTimetableFormat,
  updateTimetableFormat,
} from "../../../api/timetableFormatApi";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import usePageTitle from "../../../hooks/usePageTitle";
import { COURSES } from "../../../utils/constants";
import "../../../styles/TimetableFormat.css";
import "../../../styles/TimetableFormatForm.css";

const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

// Course options are derived from the shared COURSES map in
// utils/constants.js so this stays in sync with the rest of the app.
const COURSE_OPTIONS = Object.entries(COURSES).map(([id, label]) => ({
  id: Number(id),
  label,
}));

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

// Regular period keys. Extend this list (or swap for a generated range)
// if formats with more than 12 periods are needed.
const REGULAR_PERIOD_KEYS = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);

const emptyPeriodRow = (localId) => ({
  id: localId,
  serverId: null, // populated in edit mode so PATCH can update existing period rows in place
  period_key: "",
  period_label: "",
  start_time: "",
  end_time: "",
});

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const TimetableFormatForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";
  const isEdit = Boolean(id);

  usePageTitle(isEdit ? ["Edit", "Timetable Format"] : ["Create", "Timetable Format"]);

  const rowIdRef = useRef(0);
  const nextRowId = () => {
    rowIdRef.current += 1;
    return `row-${rowIdRef.current}`;
  };
  // Maps day_name -> existing day row id (edit mode only), so
  // buildPayload can attach ids for in-place updates. Not state — it
  // never needs to trigger a re-render on its own.
  const dayIdMapRef = useRef({});

  const [format, setFormat] = useState({
    format_name: "",
    description: "",
    course: "",
    is_active: true,
  });
  // Selection order IS the array order — no separate "order" field needed.
  const [selectedDays, setSelectedDays] = useState([]);
  const [periods, setPeriods] = useState(() => [emptyPeriodRow(nextRowId())]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState({});

  // ---- load existing format in edit mode ----
  const loadFormat = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await getTimetableFormat(id);
      const d = res?.data;
      if (!d) return;

      setFormat({
        format_name: d.format_name ?? "",
        description: d.description ?? "",
        course: d.course ?? "",
        is_active: d.is_active === 1 || d.is_active === true,
      });

      const sortedDays = [...(d.days || [])].sort((a, b) => a.day_order - b.day_order);
      const dayNames = sortedDays.map((day) => String(day.day_name).toUpperCase());
      setSelectedDays(dayNames);
      // Remember each day's row id so an edit PATCH can update existing
      // day rows in place instead of the backend having to diff by name.
      dayIdMapRef.current = sortedDays.reduce((acc, day) => {
        acc[String(day.day_name).toUpperCase()] = day.id;
        return acc;
      }, {});

      // Times come back as "HH:mm:ss" (e.g. "09:00:00"); the native
      // <input type="time"> only accepts "HH:mm", so trim the seconds
      // when loading. Submission still sends "HH:mm" per the API
      // contract — adjust here (and in buildPayload) if the backend
      // ever starts requiring seconds back on write.
      const toHm = (value) => (value ? value.slice(0, 5) : "");

      const sortedPeriods = [...(d.periods || [])].sort((a, b) => a.period_order - b.period_order);
      setPeriods(
        sortedPeriods.length
          ? sortedPeriods.map((p) => ({
              id: nextRowId(),
              serverId: p.id ?? null,
              // BREAK/LUNCH are re-derived from period_key on the way back
              // out, but on the way in we trust period_key directly (it's
              // the single source of truth either way — is_break/is_lunch
              // on the response just confirm the same thing).
              period_key: p.period_key || "",
              period_label: p.period_label || "",
              start_time: toHm(p.start_time),
              end_time: toHm(p.end_time),
            }))
          : [emptyPeriodRow(nextRowId())]
      );
    } catch (err) {
      setLoadError(
        err?.response?.data?.message || "Couldn't load this timetable format. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadFormat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // ---- days: multi-select, numbered by selection order ----
  const toggleDay = (dayValue) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  // ---- periods: add / update / delete (auto re-numbered by position) ----
  const addPeriodRow = () => {
    setPeriods((prev) => [...prev, emptyPeriodRow(nextRowId())]);
  };

  const updatePeriodRow = (rowId, key, value) => {
    setPeriods((prev) => prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  };

  const deletePeriodRow = (rowId) => {
    setPeriods((prev) => prev.filter((row) => row.id !== rowId));
  };

  const rowHighlightClass = (periodKey) => {
    if (periodKey === "BREAK") return "tff-row-break";
    if (periodKey === "LUNCH") return "tff-row-lunch";
    return "";
  };

  // ---- validation ----
  const validate = () => {
    const errs = {};

    if (!format.format_name.trim()) errs.format_name = "Format name is required.";
    if (!format.course) errs.course = "Course is required.";
    if (selectedDays.length === 0) errs.days = "Select at least one day.";
    if (periods.length === 0) errs.periods_general = "Add at least one period.";

    const periodErrors = {};
    const validTimeRows = [];

    periods.forEach((row) => {
      const rowErr = {};
      if (!row.period_key) rowErr.period_key = "Required.";
      if (!row.period_label.trim()) rowErr.period_label = "Required.";
      if (!row.start_time) rowErr.start_time = "Required.";
      if (!row.end_time) rowErr.end_time = "Required.";
      if (row.start_time && row.end_time && row.end_time <= row.start_time) {
        rowErr.end_time = "End time must be after start time.";
      }
      if (Object.keys(rowErr).length) periodErrors[row.id] = rowErr;
      if (row.start_time && row.end_time && row.end_time > row.start_time) {
        validTimeRows.push(row);
      }
    });

    // Overlap check across rows with valid, complete time ranges.
    for (let i = 0; i < validTimeRows.length; i += 1) {
      for (let j = i + 1; j < validTimeRows.length; j += 1) {
        const a = validTimeRows[i];
        const b = validTimeRows[j];
        const overlaps = a.start_time < b.end_time && b.start_time < a.end_time;
        if (overlaps) {
          periodErrors[a.id] = { ...periodErrors[a.id], start_time: "Overlaps with another period." };
          periodErrors[b.id] = { ...periodErrors[b.id], start_time: "Overlaps with another period." };
        }
      }
    }

    if (Object.keys(periodErrors).length) errs.periods = periodErrors;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---- payload ----
  const buildPayload = () => ({
    format_name: format.format_name.trim(),
    description: format.description.trim(),
    course: Number(format.course),
    is_active: format.is_active ? 1 : 0,
    days: selectedDays.map((day_name, idx) => {
      const base = { day_order: idx + 1, day_name };
      // Attach the existing day row's id (edit mode, when this day was
      // already part of the format) so the backend can update it in
      // place instead of treating every save as delete+recreate.
      const existingId = dayIdMapRef.current[day_name];
      if (isEdit && existingId) base.id = existingId;
      return base;
    }),
    periods: periods.map((row, idx) => {
      const base = {
        period_order: idx + 1,
        period_key: row.period_key,
        period_label: row.period_label.trim(),
        start_time: row.start_time,
        end_time: row.end_time,
      };
      if (row.period_key === "BREAK") base.is_break = 1;
      if (row.period_key === "LUNCH") base.is_lunch = 1;
      if (isEdit && row.serverId) base.id = row.serverId;
      return base;
    }),
  });

  const handleCancel = () => navigate(`${basePath}/settings/timetable-format`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await updateTimetableFormat(id, payload);
        toast.success(crudMessage("update", "Timetable Format", "success"));
      } else {
        await createTimetableFormat(payload);
        toast.success(crudMessage("create", "Timetable Format", "success"));
      }
      navigate(`${basePath}/settings/timetable-format`);
    } catch (err) {
      const action = isEdit ? "update" : "create";
      const fallback = crudMessage(action, "Timetable Format", "error");
      setSaveError(
        err?.response?.data?.message ||
          "Couldn't save this timetable format. Please check the form and try again."
      );
      toast.error(err?.response?.data?.message || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="tf-page tff-page">
        <div className="tf-card tff-card">
          <div className="tf-state-cell">Loading timetable format…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tf-page tff-page">
      <div className="tf-page-header">
        <div className="tf-title-block">
          <h1>{isEdit ? "Edit Timetable Format" : "Create Timetable Format"}</h1>
          <p className="tf-title-meta">
            Define the basic details, days and periods for the timetable format.
          </p>
        </div>
      </div>

      {loadError && <div className="tf-error-banner">{loadError}</div>}

      <form className="tff-form" onSubmit={handleSubmit} noValidate>
        {/* ---------------- Basic Information ---------------- */}
        <div className="tf-card tff-card">
          <h2 className="tff-card-title">Basic Information</h2>
          <div className="tff-basic-grid">
            <div className="tff-field">
              <label className="tff-label">
                Format Name <span className="tff-required">*</span>
              </label>
              <input
                className="tff-input"
                placeholder="Enter format name"
                value={format.format_name}
                onChange={(e) => setFormat((f) => ({ ...f, format_name: e.target.value }))}
              />
              {errors.format_name && <span className="tff-field-error">{errors.format_name}</span>}
            </div>

            <div className="tff-field">
              <label className="tff-label">Description</label>
              <input
                className="tff-input"
                placeholder="Enter description"
                value={format.description}
                onChange={(e) => setFormat((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="tff-field">
              <label className="tff-label">
                Course <span className="tff-required">*</span>
              </label>
              <select
                className="tff-input tff-select"
                value={format.course}
                onChange={(e) => setFormat((f) => ({ ...f, course: e.target.value }))}
              >
                <option value="">Select course</option>
                {COURSE_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.course && <span className="tff-field-error">{errors.course}</span>}
            </div>

            <div className="tff-field">
              <label className="tff-label">Status</label>
              <button
                type="button"
                className="tff-toggle-row"
                onClick={() => setFormat((f) => ({ ...f, is_active: !f.is_active }))}
                aria-pressed={format.is_active}
              >
                <span className={`tff-toggle ${format.is_active ? "tff-toggle-on" : ""}`}>
                  <span className="tff-toggle-thumb" />
                </span>
                <span className="tff-toggle-label">Active</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---------------- Days ---------------- */}
        <div className="tf-card tff-card">
          <h2 className="tff-card-title">Days</h2>
          {errors.days && <div className="tff-field-error tff-section-error">{errors.days}</div>}
          <div className="tff-days-grid">
            {DAYS_OF_WEEK.map((day) => {
              const order = selectedDays.indexOf(day.value) + 1;
              const isSelected = order > 0;
              return (
                <button
                  type="button"
                  key={day.value}
                  className={`tff-day-card ${isSelected ? "tff-day-selected" : ""}`}
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={isSelected}
                >
                  {isSelected && <span className="tff-day-badge">{order}</span>}
                  <span className="tff-day-label">{day.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------------- Periods ---------------- */}
        <div className="tf-card tff-card">
          <div className="tff-periods-header">
            <h2 className="tff-card-title">Periods</h2>
            <button type="button" className="tff-add-period-btn" onClick={addPeriodRow}>
              <PlusIcon />
              Add Period
            </button>
          </div>

          {errors.periods_general && (
            <div className="tff-field-error tff-section-error">{errors.periods_general}</div>
          )}

          <div className="tff-periods-table">
            <div className="tff-periods-head-row">
              <span>Order</span>
              <span>Period Key</span>
              <span>Period Label</span>
              <span>Start Time</span>
              <span>End Time</span>
              <span className="tff-head-actions">Actions</span>
            </div>

            {periods.map((row, idx) => {
              const rowErr = errors.periods?.[row.id] || {};
              return (
                <div className={`tff-period-row ${rowHighlightClass(row.period_key)}`} key={row.id}>
                  <span className="tff-order-cell">{idx + 1}</span>

                  <div className="tff-cell">
                    <select
                      className="tff-input tff-select"
                      value={row.period_key}
                      onChange={(e) => updatePeriodRow(row.id, "period_key", e.target.value)}
                    >
                      <option value="">Select</option>
                      <optgroup label="Regular">
                        {REGULAR_PERIOD_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Special">
                        <option value="BREAK">BREAK</option>
                        <option value="LUNCH">LUNCH</option>
                      </optgroup>
                    </select>
                    {rowErr.period_key && <span className="tff-field-error">{rowErr.period_key}</span>}
                  </div>

                  <div className="tff-cell">
                    <input
                      className="tff-input"
                      placeholder="Period label"
                      value={row.period_label}
                      onChange={(e) => updatePeriodRow(row.id, "period_label", e.target.value)}
                    />
                    {rowErr.period_label && <span className="tff-field-error">{rowErr.period_label}</span>}
                  </div>

                  <div className="tff-cell">
                    <input
                      type="time"
                      className="tff-input"
                      value={row.start_time}
                      onChange={(e) => updatePeriodRow(row.id, "start_time", e.target.value)}
                    />
                    {rowErr.start_time && <span className="tff-field-error">{rowErr.start_time}</span>}
                  </div>

                  <div className="tff-cell">
                    <input
                      type="time"
                      className="tff-input"
                      value={row.end_time}
                      onChange={(e) => updatePeriodRow(row.id, "end_time", e.target.value)}
                    />
                    {rowErr.end_time && <span className="tff-field-error">{rowErr.end_time}</span>}
                  </div>

                  <button
                    type="button"
                    className="tf-icon-btn tf-icon-btn-danger tff-delete-btn"
                    onClick={() => deletePeriodRow(row.id)}
                    aria-label={`Delete period ${idx + 1}`}
                    title="Delete period"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>

          {saveError && <div className="tf-error-banner tff-page-error">{saveError}</div>}

          <div className="tff-footer">
            <button type="button" className="tf-btn tf-btn-ghost" onClick={handleCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="tf-btn tf-btn-primary" disabled={submitting}>
              {submitting
                ? isEdit
                  ? "Updating…"
                  : "Saving…"
                : isEdit
                ? "Update Format"
                : "Save Format"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TimetableFormatForm;