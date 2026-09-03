// src/api/timetableApi.js
//
// Thin, typed wrapper around the /timetables endpoints.
// Follows the same shape/pattern as staffApi.js / studentsApi.js.

import axiosInstance from "./axiosInstance";

const BASE = "/timetables";

/**
 * Fetch a paginated, filtered list of timetables.
 * GET /api/timetables?page=&limit=&q=&course=&classroom=&effective_period=&status=
 *
 * NOTE: `q` is assumed to search timetable_name / notes in one field,
 * same convention as getStaff's `q`. Split it here if the backend wants
 * separate params — the component itself doesn't need to change.
 *
 * @param {Object} params
 * @param {string} [params.q]                search text (timetable name)
 * @param {number} [params.page]             1-indexed page number
 * @param {number} [params.limit]            page size
 * @param {string|number} [params.course]    course id (see utils/constants COURSES)
 * @param {string|number} [params.classroom] classroom id
 * @param {string} [params.effectivePeriod]  "MM-YYYY" — month/year the timetable is effective in
 * @param {string} [params.status]           'all' | 'active' | 'inactive'
 */
export async function getTimetables({
  q,
  page = 1,
  limit = 25,
  course,
  classroom,
  effectivePeriod,
  status,
} = {}) {
  const params = { page, limit };

  if (q && q.trim()) params.q = q.trim();
  if (course && course !== "all") params.course = course;
  if (classroom && classroom !== "all") params.classroom = classroom;
  if (effectivePeriod) params.effective_period = effectivePeriod;
  if (status && status !== "all") params.status = status;

  const { data } = await axiosInstance.get(`${BASE}`, { params });
  return data;
}

/**
 * Fetch a single timetable by id (used by the View page, and by the
 * Create/Edit form when editing).
 * GET /api/timetables/:id
 */
export async function getTimetable(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new timetable.
 * POST /api/timetables
 * NOTE: payload shape isn't finalized yet — wired for when the
 * Create/Edit form is built out.
 */
export async function createTimetable(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing timetable.
 * PATCH /api/timetables/:id
 */
export async function updateTimetable(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Delete a single timetable (the trash icon in row actions).
 * DELETE /api/timetables/:id
 *
 * NOTE: endpoint assumed — adjust once the real one is confirmed.
 */
export async function deleteTimetable(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

export default {
  getTimetables,
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
};