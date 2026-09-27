// src/utils/calendarConstants.js
//
// Single source of truth for:
//   - the colour palette an event can be tagged with (COLOR_PALETTE).
//     Each swatch has a numeric `id` — that id is what actually gets
//     sent to / read from the API as `color_id`. The hex values below
//     are a *front-end only* presentation layer over that id, so the
//     palette can be restyled later without touching any stored data.
//   - the set of event types the backend accepts (EVENT_TYPES).
//   - small date helpers shared by the Month / Week / Day / Year views.
//
// If the backend ever adds/removes a colour or event type, this file
// is the only place that needs to change.

export const COLOR_PALETTE = [
    { id: 1, name: "Crimson", hex: "#DC2626" },
    { id: 2, name: "Admin Blue", hex: "#214B86" },
    { id: 3, name: "Emerald", hex: "#059669" },
    { id: 4, name: "Violet", hex: "#7C3AED" },
    { id: 5, name: "Amber", hex: "#D97706" },
    { id: 6, name: "Rose", hex: "#DB2777" },
    { id: 7, name: "Teal", hex: "#0D9488" },
    { id: 8, name: "Slate", hex: "#475569" },
  ];
  
  export const DEFAULT_COLOR_ID = COLOR_PALETTE[0].id;
  
  export function getColorById(colorId) {
    return COLOR_PALETTE.find((c) => c.id === colorId) || COLOR_PALETTE[COLOR_PALETTE.length - 1];
  }
  
  // Convert a hex colour to an rgba string — used for soft chip/badge backgrounds.
  export function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  export const EVENT_TYPES = [
    { value: "HOLIDAY", label: "Holiday" },
    { value: "EXAM", label: "Exam" },
    { value: "TEST", label: "Test" },
    { value: "CLASS", label: "Regular Classes" },
    { value: "MEETING", label: "Meeting" },
    { value: "WORKSHOP", label: "Workshop" },
    { value: "CULTURAL_PROGRAM", label: "Cultural Program" },
    { value: "OTHER", label: "Other" },
  ];
  
  export function getEventTypeLabel(value) {
    return EVENT_TYPES.find((t) => t.value === value)?.label || value;
  }
  
  export const AFFECTS_ATTENDANCE_OPTIONS = [
    { value: "true", label: "Affects Attendance" },
    { value: "false", label: "Doesn't Affect Attendance" },
  ];
  
  /* ============================================================
     Date helpers — all dates are handled as plain local Date
     objects and converted to "YYYY-MM-DD" only at the API edge.
     ============================================================ */
  
  // "YYYY-MM-DD" in local time (never use toISOString() for this —
  // it shifts by the UTC offset and can land on the wrong day).
export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The API can return calendar_date as a full ISO timestamp
// (e.g. "2026-09-08T00:00:00.000Z") instead of a plain "YYYY-MM-DD".
// Grab just the date portion as text — never run this through `new
// Date()` first, since that re-introduces a timezone shift.
export function normalizeDateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}
  
  export function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  
  export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  
  export function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }
  
  export function addYears(date, years) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }
  
  export function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  
  export function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  
  // Week starting on Monday (matches the Week view in the design).
  export function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sun ... 6 = Sat
    const diff = day === 0 ? -6 : 1 - day; // move back to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  export function getWeekDates(date) {
    const start = startOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  
  // 6 rows x 7 cols grid for the Month view, Sunday-first, including
  // the leading/trailing days from the adjacent months.
  export function getMonthGrid(date) {
    const first = startOfMonth(date);
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }
  
  export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  
  export const WEEKDAY_LABELS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  export const WEEKDAY_LABELS_MINI = ["S", "M", "T", "W", "T", "F", "S"];