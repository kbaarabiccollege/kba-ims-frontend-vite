// src/api/classroomsApi.jsx
//
// Thin wrapper around GET /api/classrooms — used to populate the
// "Classroom" filter dropdown on the Students page.

import axiosInstance from "./axiosInstance";

const BASE = "/classrooms";

/**
 * Fetch active classrooms, optionally filtered by a search term.
 * GET /api/classrooms?is_active=1&q=2026
 *
 * @param {Object} params
 * @param {number|boolean} [params.isActive]  defaults to 1 (active only)
 * @param {string} [params.q]                 search text, sent as `q`
 * res.data: [{ id, name, room_no, term, semester, batch_id, course, is_active, ... }]
 */
export async function getClassrooms({ isActive = 1, q } = {}) {
  const params = {};
  if (isActive !== undefined && isActive !== null) params.is_active = isActive;
  if (q && q.trim()) params.q = q.trim();

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

export default { getClassrooms, getClassroom };