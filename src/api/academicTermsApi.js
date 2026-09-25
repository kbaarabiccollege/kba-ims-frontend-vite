// src/api/academicTermsApi.js
//
// Thin wrapper around the /academic-terms endpoints, mirroring batchesApi.js.
//
// Backend routes:
//   GET    /academic-terms?course_id=&is_current=&is_active=&term_type=&q=&page=&limit=
//   GET    /academic-terms/:id
//   POST   /academic-terms
//   PATCH  /academic-terms/:id   (note: PATCH, not PUT — different from batches)
//
// A session now carries: name, course, term_type ('ODD' | 'EVEN'),
// start_date, end_date, is_current, is_active.
//
// `course_id` doubles as the filter used by TimetableForm (which calls
// getAcademicTerms({ course_id, is_current, is_active }) to preselect the
// current session for a course) and as the Course filter on the Settings
// > Academic Sessions list page — the list page passes it in as `course`
// (matching the Batches page's filter-key convention) and this function
// sends it to the backend as `course_id`.

import axiosInstance from "./axiosInstance";

const BASE = "/academic-terms";

/**
 * Fetch a paginated, filtered list of academic sessions (terms).
 * GET /academic-terms?q=&page=&limit=&course_id=&term_type=&is_current=&is_active=
 *
 * All filters are optional and only sent when meaningfully set — pass
 * "all" (or omit) to skip a given filter, matching the `course: "all"`
 * convention used on the Batches page.
 *
 * @param {Object} params
 * @param {string} [params.q]                search text (if the backend supports it)
 * @param {number} [params.page]             1-indexed page number
 * @param {number} [params.limit]            page size
 * @param {string|number} [params.course_id] course id | 'all' — scope to a specific course
 * @param {string} [params.term_type]        'ODD' | 'EVEN' | 'all'
 * @param {boolean|number|string} [params.is_current] filter to current session(s) only
 * @param {boolean|number|string} [params.is_active]  filter to active session(s) only
 */
export async function getAcademicTerms({
  q,
  page,
  limit,
  course_id,
  term_type,
  is_current,
  is_active,
} = {}) {
  const params = {};

  if (page != null) params.page = page;
  if (limit != null) params.limit = limit;
  if (q && q.trim()) params.q = q.trim();

  if (course_id != null && course_id !== "" && course_id !== "all") {
    params.course_id = course_id;
  }
  if (term_type && term_type !== "all") params.term_type = term_type;

  if (is_current != null && is_current !== "all") {
    params.is_current = is_current ? 1 : 0;
  }
  if (is_active != null && is_active !== "all") {
    params.is_active = is_active ? 1 : 0;
  }

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Fetch a single academic session by id.
 * GET /academic-terms/:id
 */
export async function getAcademicTermById(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new academic session.
 * POST /academic-terms
 * body: { name, course, term_type, start_date, end_date, is_current, is_active }
 */
export async function createAcademicTerm(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing academic session's fields.
 * PATCH /academic-terms/:id
 * body: { name, course, term_type, start_date, end_date, is_current, is_active }
 *
 * Uses PATCH (not PUT) — this is intentional and matches the backend route.
 */
export async function updateAcademicTerm(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

export default {
  getAcademicTerms,
  getAcademicTermById,
  createAcademicTerm,
  updateAcademicTerm,
};