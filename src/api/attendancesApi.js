// src/api/attendancesApi.js
//
// Thin wrapper around the /attendances endpoints.
// Components never build URLs or query strings themselves —
// they call a function and get data back.

import axiosInstance from "./axiosInstance";

const BASE = "/attendances";

/**
 * Fetch a day's attendance sessions, grouped by classroom/staff/status.
 * GET /attendances/sessions?group_by=classroom&academic_term_id=1&date=2026-09-07&day=MONDAY ...
 *
 * Optional filters are only sent when set ("all" / "" are skipped).
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
  const opt = (k, v) => {
    if (v != null && v !== "" && v !== "all") params[k] = v;
  };
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
 * Fetch a single session's details for the Mark/Edit Attendance page.
 *
 *   Regular: GET /attendances/slot/:timetable_slot_id?type=regular&date=YYYY-MM-DD
 *   Extra  : GET /attendances/slot/:additional_class_id?type=extra&date=YYYY-MM-DD
 *
 * `type` is "regular" for a `slot-<id>` URL key and "extra" for a `class-<id>` key.
 * "extra" covers both extra AND makeup additional classes — the response's
 * `session_type` ("regular" | "extra" | "makeup") says which one it is.
 * Makeup responses also include `original_class_date` and `original_period_no`.
 *
 * @param {Object} params
 * @param {string|number} params.id
 * @param {"regular"|"extra"} params.type
 * @param {string} params.date  'YYYY-MM-DD'
 */
export async function getAttendanceSlotDetail({ id, type, date } = {}) {
  if (id == null || id === "") throw new Error("getAttendanceSlotDetail: `id` is required");
  if (type !== "regular" && type !== "extra") {
    throw new Error("getAttendanceSlotDetail: `type` must be 'regular' or 'extra'");
  }
  if (!date) throw new Error("getAttendanceSlotDetail: `date` is required");

  const { data } = await axiosInstance.get(`${BASE}/slot/${encodeURIComponent(id)}`, {
    params: { type, date },
  });
  return data;
}

/**
 * Save (create) attendance for a session.
 * POST /attendances
 *
 *   regular        -> requires `timetable_slot_id`
 *   makeup / extra -> requires `additional_class_id`
 *
 * Each student: { student_id, attendance_status, check_in_time?, remarks? }
 */
export async function saveAttendance(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("saveAttendance: payload is required");
  }
  const { session_type, timetable_slot_id, additional_class_id } = payload;
  if (session_type === "regular" && !timetable_slot_id) {
    throw new Error("saveAttendance: `timetable_slot_id` is required for regular sessions");
  }
  if ((session_type === "makeup" || session_type === "extra") && !additional_class_id) {
    throw new Error("saveAttendance: `additional_class_id` is required for makeup/extra sessions");
  }
  if (!Array.isArray(payload.students) || payload.students.length === 0) {
    throw new Error("saveAttendance: `students` must be a non-empty array");
  }

  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

export default {
  getAttendanceSessions,
  getAttendanceSlotDetail,
  saveAttendance,
};