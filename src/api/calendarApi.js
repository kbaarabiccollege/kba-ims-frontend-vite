// src/api/calendarApi.js
//
// Thin, typed wrapper around the /calendar endpoints — same pattern
// as src/api/usersApi.js: every endpoint string and every bit of
// param/body shaping lives here, so components just call a function.

import axiosInstance from "./axiosInstance";

const BASE = "/calendar";

/**
 * Fetch calendar events in a date range, with optional filters.
 * GET /api/calendar?date_from=&date_to=&classroom_id=&event_type=&affects_attendance=&applies_to_all_classrooms=
 *
 * @param {Object} params
 * @param {string} params.date_from                  "YYYY-MM-DD" (inclusive)
 * @param {string} params.date_to                    "YYYY-MM-DD" (inclusive)
 * @param {number|string} [params.classroom_id]       filter to events scoped to this classroom
 * @param {string} [params.event_type]                e.g. "HOLIDAY" | "EXAM" | "TEST" | ...
 * @param {boolean} [params.affects_attendance]
 * @param {boolean} [params.applies_to_all_classrooms]
 */
export async function getCalendarEvents({
  date_from,
  date_to,
  classroom_id,
  event_type,
  affects_attendance,
  applies_to_all_classrooms,
} = {}) {
  const params = {};

  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;
  if (classroom_id !== undefined && classroom_id !== null && classroom_id !== "") {
    params.classroom_id = classroom_id;
  }
  if (event_type && event_type !== "all") params.event_type = event_type;
  if (affects_attendance !== undefined && affects_attendance !== "" && affects_attendance !== "all") {
    params.affects_attendance = affects_attendance;
  }
  if (
    applies_to_all_classrooms !== undefined &&
    applies_to_all_classrooms !== "" &&
    applies_to_all_classrooms !== "all"
  ) {
    params.applies_to_all_classrooms = applies_to_all_classrooms;
  }

    const { data } = await axiosInstance.get(BASE, { params });
    return data;
}

/**
 * Fetch a single calendar event by id.
 * GET /api/calendar/:id
 */
export async function getCalendarEventById(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a calendar event.
 * POST /api/calendar
 *
 * body shape (applies_to_all_classrooms = true → classroom_ids is ignored/empty):
 * {
 *   calendar_date: "2026-09-08",
 *   event_type: "HOLIDAY",
 *   affects_attendance: true,
 *   applies_to_all_classrooms: false,
 *   classroom_ids: [1, 2],
 *   title: "Holiday",
 *   description: "Holiday",
 *   color_id: 1
 * }
 */
export async function createCalendarEvent(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing calendar event.
 * PATCH /api/calendar/:id
 * (Same body shape as create. Included for symmetry with usersApi —
 * confirm this route with the backend before wiring up an "edit" UI.)
 */
export async function updateCalendarEvent(id, payload) {
const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
return data;
}

/**
 * Delete a calendar event.
 * DELETE /api/calendar/:id
 * (Included for symmetry with usersApi — confirm this route with the
 * backend before wiring up a "delete" UI.)
 */
export async function deleteCalendarEvent(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

export default {
getCalendarEvents,
getCalendarEventById,
createCalendarEvent,
updateCalendarEvent,
deleteCalendarEvent,
};