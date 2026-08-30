// src/api/classroomsApi.js
//
// Thin wrapper around GET /api/classrooms — used to populate the
// "Classroom" filter dropdown on the Students page.

import axiosInstance from "./axiosInstance";

const BASE = "/classrooms";

/**
 * Fetch active classrooms, optionally filtered by a search term and/or a
 * course.
 * GET /api/classrooms?is_active=1&q=2026&course=1
 *
 * @param {Object} params
 * @param {number|boolean} [params.isActive]  defaults to 1 (active only)
 * @param {string} [params.q]                 search text, sent as `q`
 * @param {string|number} [params.course]     course id (see components/common/courses.js);
 *                                             used by the Bulk Add Students modal to scope
 *                                             the Class dropdown to the selected course.
 * res.data: [{ id, name, room_no, term, semester, batch_id, course, is_active, ... }]
 */
export async function getClassrooms({
  isActive,
  q,
  page,
  limit,
  term,
  semester,
  course,
  status,
} = {}) {
  const params = {};

  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;
  if (q && q.trim()) params.q = q.trim();
  if (term && term !== "all") params.term = term;
  if (semester && semester !== "all") params.semester = semester;
  if (course !== undefined && course !== null && course !== "" && course !== "all") {
    params.course = course;
  }

  if (status !== undefined) {
    // AdminClassrooms list page: 'all' | 'active' | 'inactive'
    if (status !== "all") params.is_active = status === "active" ? 1 : 0;
  } else {
    // Legacy callers (Students filter dropdown, Bulk Add Students modal):
    // preserve old default of active-only unless explicitly overridden.
    const active = isActive === undefined ? 1 : isActive;
    if (active !== null) params.is_active = active;
  }

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Fetch a single classroom by id.
 * GET /api/classrooms/:id
 *
 * res.data: { id, name, room_no, term, semester, batch_id, course, is_active, ... }
 */
export async function getClassroom(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new classroom.
 * POST /api/classrooms
 */
export async function createClassroom(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing classroom's fields.
 * PATCH /api/classrooms/:id
 */
export async function updateClassroom(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Delete a single classroom.
 * DELETE /api/classrooms/:id
 */
export async function deleteClassroom(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

/**
 * Bulk mark a set of classrooms active/inactive.
 * PATCH /api/classrooms/bulk
 * body: { classroom_ids, is_active }
 */
export async function bulkUpdateClassroomStatus(ids, isActive) {
  const body = { ids, is_active: isActive ? 1 : 0 };
  const { data } = await axiosInstance.patch(`${BASE}/bulk`, body);
  return data;
}

export default {
  getClassrooms,
  getClassroom,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  bulkUpdateClassroomStatus,
};