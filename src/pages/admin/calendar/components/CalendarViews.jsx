// src/pages/admin/calendar/components/CalendarViews.jsx
//
// The four calendar views (Month / Week / Day / Year). All of them
// are pure presentational components: they take the events already
// grouped by date key and just lay them out. AdminCalendar.jsx owns
// fetching, filtering and the "which view / which date" state.
//
// Note: the events the API returns don't carry a start/end time —
// only calendar_date + description — so none of these views render
// a clock time anywhere, the Day view included, per spec.

import { useState } from "react";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS_FULL,
  WEEKDAY_LABELS_MINI,
    getEventTypeLabel,
    getColorById,
    getMonthGrid,
    getWeekDates,
    hexToRgba,
    isSameDay,
    toDateKey,
  } from "../../../../utils/calendarConstants";
  
  const today = () => new Date();
  
  /* ================= Month View ================= */
  
  export const MonthView = ({ anchorDate, eventsByDate, onSelectDay }) => {
    const days = getMonthGrid(anchorDate);
    const currentMonth = anchorDate.getMonth();
    const now = today();
  
    return (
      <div className="cal-card">
        <div className="cal-month-head">
          {WEEKDAY_LABELS_FULL.map((d) => (
            <div key={d} className="cal-month-headcell">
              {d}
            </div>
          ))}
        </div>
        <div className="cal-month-body">
          {days.map((date) => {
            const key = toDateKey(date);
            const events = eventsByDate[key] || [];
            const outside = date.getMonth() !== currentMonth;
            const isToday = isSameDay(date, now);
            const visible = events.slice(0, 2);
            const extra = events.length - visible.length;
  
            return (
              <div
                key={key}
                className={`cal-day-cell${outside ? " outside" : ""}${isToday ? " today" : ""}`}
                onClick={() => onSelectDay(date)}
              >
                <span className="cal-day-number">{date.getDate()}</span>
                <div className="cal-day-events">
                  {visible.map((ev) => {
                    const color = getColorById(ev.color_id);
                    return (
                      <span
                        key={ev.id}
                        className="cal-event-chip"
                        style={{ background: hexToRgba(color.hex, 0.16), color: color.hex }}
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    );
                  })}
                  {extra > 0 && <span className="cal-event-more">+{extra} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  /* ================= Week View ================= */
  
  export const WeekView = ({ anchorDate, eventsByDate }) => {
    const days = getWeekDates(anchorDate);
    const now = today();
  
    return (
      <div className="cal-card">
        <div className="cal-week-list">
          {days.map((date) => {
            const key = toDateKey(date);
            const events = eventsByDate[key] || [];
            const isToday = isSameDay(date, now);
  
            return (
              <div key={key} className={`cal-week-row${isToday ? " today" : ""}`}>
                <div className="cal-week-date-col">
                  <div className="cal-week-day-name">{WEEKDAY_LABELS_FULL[date.getDay()]}</div>
                  <div className="cal-week-day-num">{date.getDate()} {MONTH_NAMES[date.getMonth()].slice(0, 3)}</div>
                </div>
                <div className="cal-week-events-col">
                  {events.length === 0 ? (
                    <span className="cal-week-empty">No events</span>
                  ) : (
                    events.map((ev) => {
                      const color = getColorById(ev.color_id);
                      return (
                        <div key={ev.id} className="cal-week-event">
                          <span className="cal-event-dot" style={{ background: color.hex }} />
                          <span className="cal-week-event-title" style={{ color: color.hex }}>
                            {ev.title}
                          </span>
                          <span className="cal-week-event-time">{getEventTypeLabel(ev.event_type)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  /* ================= Day View ================= */
  // Per spec: just a flat list of the day's events — no timings.
  // Details live in `description`; timing is tracked elsewhere.
  
  export const DayView = ({ anchorDate, eventsByDate, onEditEvent }) => {
    const key = toDateKey(anchorDate);
    const events = eventsByDate[key] || [];
    const label = `${WEEKDAY_LABELS_FULL_LONG[anchorDate.getDay()]}, ${anchorDate.getDate()} ${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
  
    return (
      <div className="cal-card">
        <div className="cal-day-view-header">
          <span className="cal-day-view-title">{label}</span>
          <span className="cal-day-view-count">
            {events.length} {events.length === 1 ? "Event" : "Events"}
          </span>
        </div>
  
        {events.length === 0 ? (
          <div className="cal-day-empty-state">No events scheduled for this day.</div>
        ) : (
          <div className="cal-day-event-list">
            {events.map((ev) => {
              const color = getColorById(ev.color_id);
              return (
                <div key={ev.id} className="cal-day-event-card">
                  <span className="cal-day-event-dot" style={{ background: color.hex }} />
                  <div className="cal-day-event-main">
                    <div className="cal-day-event-title-row">
                      <div className="cal-day-event-title">{ev.title}</div>
                      <button
                        type="button"
                        className="cal-day-event-edit-btn"
                        onClick={() => onEditEvent?.(ev)}
                      >
                        Edit
                      </button>
                    </div>
                    {ev.description && <div className="cal-day-event-desc">{ev.description}</div>}
                    <div className="cal-day-event-meta">
                      <span
                        className="cal-day-event-badge"
                        style={{ background: hexToRgba(color.hex, 0.16), color: color.hex }}
                      >
                        {getEventTypeLabel(ev.event_type)}
                      </span>
                      <span className="cal-day-event-tag">
                        {ev.applies_to_all_classrooms ? "All Classrooms" : "Specific Classrooms"}
                      </span>
                      {ev.affects_attendance && <span className="cal-day-event-tag">Affects Attendance</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  const WEEKDAY_LABELS_FULL_LONG = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  
  /* ================= Year View ================= */
  
export const YearView = ({ anchorDate, eventsByDate, onSelectMonth }) => {
  const year = anchorDate.getFullYear();
  const now = today();
  // Date keys are unique across the whole year, so one hover state
  // for the entire view is enough — no need to scope it per month.
  const [hoveredKey, setHoveredKey] = useState(null);

  return (
    <div className="cal-card cal-year-card">
      <div className="cal-year-grid">
        {MONTH_NAMES.map((name, monthIdx) => {
          const monthDate = new Date(year, monthIdx, 1);
          const days = getMonthGrid(monthDate);
          const monthEventCount = days
            .filter((d) => d.getMonth() === monthIdx)
            .reduce((sum, d) => sum + (eventsByDate[toDateKey(d)]?.length || 0), 0);

          return (
            <div key={name} className="cal-year-month-card" onClick={() => onSelectMonth(monthDate)}>
              <div className="cal-year-month-head">
                <span className="cal-year-month-name">{name}</span>
                {monthEventCount > 0 && <span className="cal-year-month-count">{monthEventCount}</span>}
              </div>
              <div className="cal-mini-grid">
                {WEEKDAY_LABELS_MINI.map((d, i) => (
                  <span key={`${name}-${d}-${i}`} className="cal-mini-headcell">
                    {d}
                  </span>
                ))}
                {days.map((date) => {
                  const outside = date.getMonth() !== monthIdx;
                  const key = toDateKey(date);
                  const dayEvents = outside ? [] : eventsByDate[key] || [];
                  const isToday = isSameDay(date, now);
                  const dots = dayEvents.slice(0, 3);
                  const isHovered = hoveredKey === key;

                  return (
                    <span
                      key={key}
                      className={`cal-mini-cell${outside ? " outside" : ""}${isToday ? " today" : ""}${
                        dayEvents.length ? " has-events" : ""
                      }${isHovered && !outside ? " hovered" : ""}`}
                      onMouseEnter={() => !outside && setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey((prev) => (prev === key ? null : prev))}
                    >
                      {date.getDate()}
                      {dots.length > 0 && (
                        <span
                          className="cal-mini-dot"
                          style={{ background: getColorById(dots[0].color_id).hex }}
                        />
                      )}
                      {isHovered && !outside && (
                        <div className="cal-mini-popover">
                          <div className="cal-mini-popover-date">
                            {WEEKDAY_LABELS_FULL[date.getDay()].toUpperCase()} · {MONTH_NAMES[monthIdx].slice(0, 3)}{" "}
                            {date.getDate()}
                          </div>
                          {dayEvents.length > 0 ? (
                            <div className="cal-mini-popover-list">
                              {dayEvents.map((ev) => {
                                const color = getColorById(ev.color_id);
                                return (
                                  <span key={ev.id} className="cal-mini-popover-item" style={{ background: color.hex }}>
                                    {ev.title}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="cal-mini-popover-empty">No Events</div>
                          )}
                        </div>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};