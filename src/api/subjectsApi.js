// src/api/subjectsApi.js
//
// Thin wrapper around GET /api/subjects — mirrors classroomsApi.js
// conventions exactly (param building, is_active/status mapping,
// bulk-status shape) so AdminSubjects.jsx can reuse the same
// useListPage/EntityCard/SelectionBar plumbing as AdminClassrooms.jsx.
//
// Response shape (per product spec):
// {
//   success, message,
//   pagination: { total, page, limit, totalPages },
//   data: [{ id, code, name, short_name, display_name, book_name,
//            description, course, sem, term, credits, univ_credits,
//            classroom_id, is_active, created_at, updated_at }]
// }
// NOTE: course_staff_id / handling_staff_id exist on the record but are
// intentionally never read or written here — product asked for the
// staff-assignment fields to be left out of this module entirely.

import axiosInstance from "./axiosInstance";

const BASE = "/subjects";

/**
 * Fetch subjects, paginated.
 * GET /api/subjects?page=1&limit=20&q=...&term=1&sem=6&course=1&is_active=1
 *
 * @param {Object} params
 * @param {string} [params.q]              search text, sent as `q`
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {number|string} [params.term]    1 | 2 (skip when 'all')
 * @param {number|string} [params.sem]     1-8 (skip when 'all')
 * @param {number|string} [params.course]  course id (skip when 'all')
 * @param {string} [params.status]         'all' | 'active' | 'inactive'
 */
export async function getSubjects({ q, page, limit, term, sem, course, status } = {}) {
  const params = {};

  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;
  if (q && q.trim()) params.q = q.trim();
  if (term !== undefined && term !== null && term !== "all") params.term = term;
  if (sem !== undefined && sem !== null && sem !== "all") params.sem = sem;
  if (course !== undefined && course !== null && course !== "" && course !== "all") {
    params.course = course;
  }
  if (status !== undefined && status !== "all") {
    params.is_active = status === "active" ? 1 : 0;
  }

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Fetch a single subject by id.
 * GET /api/subjects/:id
 */
export async function getSubject(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new subject.
 * POST /api/subjects
 */
export async function createSubject(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing subject's fields.
 * PATCH /api/subjects/:id
 */
export async function updateSubject(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Delete a single subject.
 * DELETE /api/subjects/:id
 */
export async function deleteSubject(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

/**
 * Bulk mark a set of subjects active/inactive.
 * PATCH /api/subjects/bulk
 * body: { ids, is_active }
 */
export async function bulkUpdateSubjectStatus(ids, isActive) {
  const body = { ids, is_active: isActive ? 1 : 0 };
  const { data } = await axiosInstance.patch(`${BASE}/bulk`, body);
  return data;
}

export default {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  bulkUpdateSubjectStatus,
};