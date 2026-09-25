// src/api/attendancesApi.js
//
// Thin, typed wrapper around the /attendances endpoints.
// Keeping all endpoint strings + param shaping in one place means
// components never construct URLs or query strings themselves —
// they just call a function and get data back.

import axiosInstance from "./axiosInstance";

const BASE = "/attendances";

/**
 * Fetch a day's attendance sessions, grouped by classroom/staff/status.
 * GET /api/attendances/sessions?group_by=classroom&academic_term_id=1
 *   &date=2026-09-07&day=MONDAY&classroom_id=&staff_id=&session_type=
 *   &status=&page=&limit=
 *
 * Optional filters are only sent when set ("all" / "" are skipped).
 * NOTE: classroom_id, staff_id, session_type and status are assumed
 * param names — rename here if your backend uses different ones.
 *
 * @param {Object} params
 * @param {string} [params.group_by]         'classroom' | 'staff' | 'status'
 * @param {number} [params.academic_term_id]
 * @param {string} [params.date]             'YYYY-MM-DD'
 * @param {string} [params.day]
 * @param {string|number} [params.classroom_id]
 * @param {string|number} [params.staff_id]
 * @param {string} [params.session_type]     'all' | 'regular' | 'extra' | 'makeup'
 * @param {string} [params.status]           'all' | 'pending' | 'completed' | 'cancelled'
 * @param {number} [params.page]
 * @param {number} [params.limit]
 */
export async function getAttendanceSessions({
  group_by = "classroom",
  academic_term_id,
  date,
  day,
  classroom_id,
  staff_id,
  session_type,
  status,
  page,
  limit,
} = {}) {
  const params = { group_by, academic_term_id, date, day };
  const opt = (k, v) => { if (v != null && v !== "" && v !== "all") params[k] = v; };
  opt("classroom_id", classroom_id);
  opt("staff_id", staff_id);
  opt("session_type", session_type);
  opt("status", status);
  if (page != null) params.page = page;
  if (limit != null) params.limit = limit;

  const { data } = await axiosInstance.get(`${BASE}/sessions`, { params });
  return data;
}

/**
 * Fetch a single session's details for the Mark/Edit Attendance page —
 * a timetable slot (regular) or an additional class (extra/makeup).
 * GET /api/attendances/slot/:id?type=regular|extra&date=2026-09-07
 *
 * `id` is the timetable_slot_id when type is "regular", or the
 * additional_class_id when type is "extra" (covers both "extra" and
 * "makeup" additional-class sessions — the response's `session_type`
 * tells you which one it actually is).
 *
 * @param {Object} params
 * @param {string|number} params.id
 * @param {string} params.type   'regular' | 'extra'
 * @param {string} params.date  'YYYY-MM-DD'
 */
export async function getAttendanceSlotDetail({ id, type, date } = {}) {
  const { data } = await axiosInstance.get(`${BASE}/slot/${id}`, {
    params: { type, date },
  });
  return data;
}

export default {
  getAttendanceSessions,
  getAttendanceSlotDetail,
};