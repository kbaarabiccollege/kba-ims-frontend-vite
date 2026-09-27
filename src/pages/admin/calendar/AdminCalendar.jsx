// src/pages/admin/calendar/AdminCalendar.jsx
//
// Academic Calendar (Users Management > Academics > Calendar).
// Talks to GET/POST /api/calendar via src/api/calendarApi.js.
//
// NOTE on API response shape: assumes GET /calendar returns
//   { data: CalendarEvent[] }
// If your backend returns a different shape (e.g. { events }), adjust
// the destructuring in fetchEvents() below.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import usePageTitle from "../../../hooks/usePageTitle";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent } from "../../../api/calendarApi";
import { MonthView, WeekView, DayView, YearView } from "./components/CalendarViews";
import EventFormModal from "./components/EventFormModal";
import {
  EVENT_TYPES,
  AFFECTS_ATTENDANCE_OPTIONS,
  MONTH_NAMES,
  addDays,
  addMonths,
  addYears,
  getMonthGrid,
  getWeekDates,
  normalizeDateKey,
  toDateKey,
} from "../../../utils/calendarConstants";
import "../../../styles/Calendar.css";

const VIEWS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "year", label: "Year" },
];

// The fetch range for the currently active view/anchor date.
function getRangeForView(view, anchor) {
  if (view === "month") {
    const grid = getMonthGrid(anchor);
    return { from: grid[0], to: grid[grid.length - 1] };
  }
  if (view === "week") {
    const days = getWeekDates(anchor);
    return { from: days[0], to: days[days.length - 1] };
  }
  if (view === "year") {
    return { from: new Date(anchor.getFullYear(), 0, 1), to: new Date(anchor.getFullYear(), 11, 31) };
  }
  // day
  return { from: anchor, to: anchor };
}

function getNavLabel(view, anchor) {
  if (view === "month") return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  if (view === "year") return `${anchor.getFullYear()}`;
  if (view === "day") {
    return `${MONTH_NAMES[anchor.getMonth()].slice(0, 3)} ${anchor.getDate()}, ${anchor.getFullYear()}`;
  }
  // week
  const days = getWeekDates(anchor);
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()}`;
  const endLabel = sameMonth
    ? `${end.getDate()}`
    : `${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

function stepAnchor(view, anchor, direction) {
  if (view === "month") return addMonths(anchor, direction);
  if (view === "week") return addDays(anchor, direction * 7);
  if (view === "year") return addYears(anchor, direction);
  return addDays(anchor, direction); // day
}

const AdminCalendar = () => {
  const { user } = useAuth();
  const toast = useToast();
  usePageTitle("Calendar");

  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(() => new Date());

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- filters (classroom_id, event_type, affects_attendance, applies_to_all_classrooms) ----
  const [eventType, setEventType] = useState("all");
  const [affectsAttendance, setAffectsAttendance] = useState("all");

  // ---- add/edit event modal ----
  // { mode: "add", defaultDate } | { mode: "edit", eventId } | null
  const [eventModal, setEventModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState({});

  const range = useMemo(() => getRangeForView(view, anchor), [view, anchor]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCalendarEvents({
        date_from: toDateKey(range.from),
        date_to: toDateKey(range.to),
        event_type: eventType,
        affects_attendance: affectsAttendance,
      });
      setEvents(res?.data ?? res?.events ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load the calendar. Please try again in a moment.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range, eventType, affectsAttendance]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Group events by "YYYY-MM-DD" for O(1) lookups per calendar cell.
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const key = normalizeDateKey(ev.calendar_date);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const goPrev = () => setAnchor((prev) => stepAnchor(view, prev, -1));
  const goNext = () => setAnchor((prev) => stepAnchor(view, prev, 1));
  const goToday = () => setAnchor(new Date());

  const openAddEvent = (defaultDate) => {
    setModalError("");
    setModalFieldErrors({});
    setEventModal({
      mode: "add",
      defaultDate: toDateKey(defaultDate || (view === "day" ? anchor : new Date())),
    });
  };

  const openEditEvent = (ev) => {
    setModalError("");
    setModalFieldErrors({});
    setEventModal({ mode: "edit", eventId: ev.id });
  };
  const closeEventModal = () => {
    if (submitting) return;
    setEventModal(null);
  };

  const handleSaveEvent = async (payload) => {
    const isEdit = eventModal?.mode === "edit";
    setSubmitting(true);
    setModalError("");
    setModalFieldErrors({});
    try {
      if (isEdit) {
        await updateCalendarEvent(eventModal.eventId, payload);
        toast.success(crudMessage("update", "Event", "success"));
      } else {
        await createCalendarEvent(payload);
        toast.success(crudMessage("create", "Event", "success"));
      }
      setEventModal(null);
      fetchEvents();
    } catch (err) {
      const data = err?.response?.data;
      const fallback = crudMessage(isEdit ? "update" : "create", "Event", "error");
      setModalError(data?.message || fallback);
      setModalFieldErrors(data?.errors || {});
      toast.error(data?.message || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cal-page">
      <div className="cal-page-header">
        <h1 className="cal-page-title">
          <span className="cal-page-title-icon" aria-hidden="true">📅</span>
          Academic Calendar
        </h1>
        <button type="button" className="cal-add-btn" onClick={() => openAddEvent()}>
          + Add Event
        </button>
      </div>

      <div className="cal-toolbar">
        <div className="cal-view-tabs">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              className={`cal-view-tab${view === v.value ? " active" : ""}`}
              onClick={() => setView(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="cal-date-nav">
          <button type="button" className="cal-nav-btn" onClick={goPrev} aria-label="Previous">‹</button>
          <span className="cal-nav-label">{getNavLabel(view, anchor)}</span>
          <button type="button" className="cal-nav-btn" onClick={goNext} aria-label="Next">›</button>
          <button type="button" className="cal-today-btn" onClick={goToday}>Today</button>
        </div>

        <div className="cal-filters">
          <select className="cal-filter-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="all">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            className="cal-filter-select"
            value={affectsAttendance}
            onChange={(e) => setAffectsAttendance(e.target.value)}
          >
            <option value="all">All Attendance Impact</option>
            {AFFECTS_ATTENDANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="cal-error-banner">{error}</div>}

      {loading ? (
        <div className="cal-card">
          <div className="cal-loading-row">Loading calendar…</div>
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthView
              anchorDate={anchor}
              eventsByDate={eventsByDate}
              onSelectDay={(date) => {
                setAnchor(date);
                setView("day");
              }}
            />
          )}
          {view === "week" && <WeekView anchorDate={anchor} eventsByDate={eventsByDate} />}
          {view === "day" && (
            <DayView anchorDate={anchor} eventsByDate={eventsByDate} onEditEvent={openEditEvent} />
          )}
          {view === "year" && (
            <YearView
              anchorDate={anchor}
              eventsByDate={eventsByDate}
              onSelectMonth={(date) => {
                setAnchor(date);
                setView("month");
              }}
            />
          )}
        </>
      )}

      {eventModal && (
        <EventFormModal
          mode={eventModal.mode}
          defaultDate={eventModal.defaultDate}
          eventId={eventModal.eventId}
          onClose={closeEventModal}
          onSubmit={handleSaveEvent}
          submitting={submitting}
          serverError={modalError}
          serverFieldErrors={modalFieldErrors}
        />
      )}
    </div>
  );
};

export default AdminCalendar;