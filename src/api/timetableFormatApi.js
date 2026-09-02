// src/api/timetableFormatApi.js
//
// Thin, typed wrapper around the /timetable-formats endpoints.
// Follows the same shape/pattern as studentsApi.js / staffApi.js.

import axiosInstance from "./axiosInstance";

const BASE = "/timetable-formats";

/**
 * Fetch a paginated, filtered list of timetable formats.
 * GET /api/timetable-formats?page=&limit=&q=&course=&status=
 *
 * NOTE: the spec response you shared doesn't show q/course/status as
 * documented query params — only page/limit are confirmed from the
 * example. I've wired q/course/status the same way studentsApi/staffApi
 * do (only appended when set / not "all"), so the search box and filter
 * dropdowns are ready to go the moment the backend supports them. If the
 * backend ignores them today, the list will just come back unfiltered.
 *
 * @param {Object} params
 * @param {string} [params.q]         search text (format name / description)
 * @param {number} [params.page]      1-indexed page number
 * @param {number} [params.limit]     page size
 * @param {string|number} [params.course]  course id filter
 * @param {string} [params.status]    'all' | 'active' | 'inactive'
 */
export async function getTimetableFormats({
  q,
  page = 1,
  limit = 10,
  course,
  status,
} = {}) {
  const params = { page, limit };

  if (q && q.trim()) params.q = q.trim();
  if (course && course !== "all") params.course = course;
  if (status && status !== "all") params.status = status;

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Fetch a single timetable format by id (view/edit page).
 * GET /api/timetable-formats/:id
 */
export async function getTimetableFormat(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new timetable format ("+ New Format").
 * POST /api/timetable-formats
 * NOTE: payload shape assumed from the list response fields
 * (format_name, description, course, is_active) — adjust once the
 * create form / endpoint contract is confirmed.
 */
export async function createTimetableFormat(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing timetable format.
 * PATCH /api/timetable-formats/:id
 */
export async function updateTimetableFormat(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Delete a single timetable format (the trash icon in row actions).
 * DELETE /api/timetable-formats/:id
 *
 * NOTE: endpoint assumed — no delete endpoint was provided in the spec.
 * Adjust the URL here once the real one is confirmed.
 */
export async function deleteTimetableFormat(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

export default {
  getTimetableFormats,
  getTimetableFormat,
  createTimetableFormat,
  updateTimetableFormat,
  deleteTimetableFormat,
};