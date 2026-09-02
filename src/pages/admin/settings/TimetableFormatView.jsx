// src/pages/admin/timetable/Timetable.jsx
//
// Timetable Format "View" page — read-only detail view reached from the
// list page's eye icon (see TimetableFormatSettings.jsx's goToView).
//
// NOTE: kept at the path/filename you already created it under
// (src/pages/admin/timetable/Timetable.jsx, exporting
// TimetableFormatView) rather than moving it beside the list/form pages
// under pages/admin/settings/ — update the import in your router if
// you'd rather it live there instead.
//
// ASSUMPTIONS (adjust to match your actual backend):
// - GET /api/timetable-formats/:id returns the same days[]/periods[]
//   shape TimetableFormatForm.jsx expects (day_order/day_name,
//   period_order/period_key/period_label/start_time/end_time/is_break/
//   is_lunch), alongside the flat format_name/description/course/
//   is_active/created_at/updated_at fields from the list endpoint.
// - `course` is a numeric FK — COURSE_LABELS below is the same stub
//   used on the list/form pages; wire it to the real courses endpoint.
// - Day rows are shown in natural weekday order (Mon → Sun), filtered
//   to only the days actually selected for this format — unlike the
//   form page, this is a read-only schedule display, not a
//   selection-order UI, so weekday order (not day_order) drives it.
// - This page has its own full-width blue header bar per the
//   screenshot, separate from the Settings shell's header — if your
//   router already wraps this route in a shared layout with its own
//   back/title bar, drop .tv-topbar and use that instead.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getTimetableFormat } from "../../../api/timetableFormatApi";
import { COURSES } from "../../../utils/constants";
import "../../../styles/TimetableFormatView.css";

const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

const COURSE_OPTIONS = Object.entries(COURSES).map(([id, label]) => ({
  id: Number(id),
  label,
}));
const COURSE_LABELS = COURSES;

const WEEKDAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const WEEKDAY_LABELS = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(value) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h)) return value;
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

const CalendarIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const TimetableFormatView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";

  const [format, setFormat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await getTimetableFormat(id);
        if (!cancelled) setFormat(res?.data || null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.response?.data?.message || "Couldn't load this timetable format. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleBack = () => navigate(`${basePath}/settings/timetable-format`);
  const handleEdit = () => navigate(`${basePath}/settings/timetable-format/${id}/edit`);

  const sortedPeriods = [...(format?.periods || [])].sort((a, b) => a.period_order - b.period_order);
  const activeDayNames = new Set((format?.days || []).map((d) => String(d.day_name).toUpperCase()));
  const orderedDays = WEEKDAY_ORDER.filter((d) => activeDayNames.has(d));

  const isActive = format ? format.is_active === 1 || format.is_active === true : false;

  const isBreak = (period) => period.period_key === "BREAK" || period.is_break === 1;
  const isLunch = (period) => period.period_key === "LUNCH" || period.is_lunch === 1;

  const columnLabel = (period) => {
    if (isBreak(period)) return "BREAK";
    if (isLunch(period)) return "LUNCH";
    return period.period_order;
  };

  const columnClass = (period) => (isBreak(period) || isLunch(period) ? "tv-col-highlight" : "");

  return (
    <div className="tv-page">
      <div className="tv-topbar">
        <button type="button" className="tv-back-btn" onClick={handleBack}>
          <BackIcon />
          Back
        </button>
        <h1 className="tv-topbar-title">Timetable Format Details</h1>
        <span className="tv-topbar-spacer" aria-hidden="true" />
      </div>

      <div className="tv-body">
        {loading ? (
          <div className="tv-card">
            <div className="tv-state-cell">Loading timetable format…</div>
          </div>
        ) : loadError ? (
          <div className="tv-card">
            <div className="tv-error-banner">{loadError}</div>
          </div>
        ) : !format ? (
          <div className="tv-card">
            <div className="tv-state-cell">Timetable format not found.</div>
          </div>
        ) : (
          <div className="tv-card">
            <div className="tv-header-row">
              <div className="tv-header-icon">
                <CalendarIcon />
              </div>

              <div className="tv-header-main">
                <h2 className="tv-format-name">{format.format_name}</h2>

                <div className="tv-meta-row">
                  <div className="tv-meta-block tv-meta-desc">
                    <span className="tv-meta-label">Description</span>
                    <span className="tv-meta-value">{format.description || "—"}</span>
                  </div>
                  <div className="tv-meta-block">
                    <span className="tv-meta-label">Course</span>
                    <span className="tv-meta-value">
                      {COURSE_LABELS[format.course] || `Course #${format.course}`}
                    </span>
                  </div>
                  <div className="tv-meta-block">
                    <span className="tv-meta-label">Status</span>
                    <span className={`tv-status-pill ${isActive ? "tv-status-active" : "tv-status-inactive"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <button type="button" className="tv-edit-btn" onClick={handleEdit}>
                <EditIcon />
                Edit Format
              </button>
            </div>

            <div className="tv-grid-wrap">
              <table className="tv-grid">
                <thead>
                  <tr>
                    <th className="tv-corner-cell">
                      Day / Period
                    </th>
                    {sortedPeriods.map((period) => (
                      <th key={period.period_order} className={columnClass(period)}>
                        <span className="tv-col-key">{columnLabel(period)}</span>
                        <span className="tv-col-time">
                          {formatTime(period.start_time)} - {formatTime(period.end_time)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedDays.map((day) => (
                    <tr key={day}>
                      <th className="tv-day-cell">{WEEKDAY_LABELS[day]}</th>
                      {sortedPeriods.map((period) => (
                        <td key={period.period_order} className={columnClass(period)} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="tv-footer-row">
              <span>Created on: {formatDateTime(format.created_at)}</span>
              <span>Last updated: {formatDateTime(format.updated_at)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableFormatView;