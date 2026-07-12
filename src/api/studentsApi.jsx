// src/api/studentsApi.jsx
//
// Thin, typed wrapper around the /students endpoints.
// Follows the same shape/pattern as usersApi.jsx.

import axiosInstance from "./axiosInstance";

const BASE = "/students";

/**
 * Fetch a paginated, filtered list of students.
 * GET /api/students/list?page=&limit=&academic_status=studying&q=&classroom_id=&batch_id=&status=
 *
 * NOTE: `academic_status=studying` is sent by default per spec, matching the
 * example endpoint: /api/students/list?page=1&limit=25&academic_status=studying
 *
 * NOTE: the search bar covers name / roll_number / rrn in a single field.
 * This assumes the backend accepts one `q` param and matches across all
 * three columns (same convention as usersApi's getUsers). If the backend
 * instead expects separate params, split `q` into name/roll_number/rrn
 * here — the component itself doesn't need to change.
 *
 * @param {Object} params
 * @param {string} [params.q]             search text (name, roll_number, rrn)
 * @param {number} [params.page]          1-indexed page number
 * @param {number} [params.limit]         page size
 * @param {string|number} [params.classroomId]
 * @param {string|number} [params.batchId]
 * @param {string} [params.status]        'all' | 'active' | 'inactive'
 * @param {string} [params.academicStatus] defaults to 'studying'
 */
export async function getStudents({
  q,
  page = 1,
  limit = 25,
  classroomId,
  batchId,
  status,
  academicStatus = "studying",
} = {}) {
  const params = { page, limit, academic_status: academicStatus };

  if (q && q.trim()) params.q = q.trim();
  if (classroomId && classroomId !== "all") params.classroom_id = classroomId;
  if (batchId && batchId !== "all") params.batch_id = batchId;
  if (status && status !== "all") params.status = status;

  const { data } = await axiosInstance.get(`${BASE}/list`, { params });
  return data;
}

/**
 * Create a new student.
 * POST /api/students
 * NOTE: payload shape isn't finalized yet — the create/edit page is a
 * placeholder for now, so this is wired for when that form exists.
 */
export async function createStudent(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing student's profile fields.
 * PUT /api/students/:id
 */
export async function updateStudent(id, payload) {
  const { data } = await axiosInstance.put(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Fetch a single student by id (used by the create/edit page for now,
 * just to display the id while the real form is built).
 * GET /api/students/:id
 */
export async function getStudent(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Delete a single student (the trash icon in row actions).
 * DELETE /api/students/:id
 *
 * NOTE: endpoint assumed — no delete endpoint was provided in the spec.
 * Adjust the URL here once the real one is confirmed.
 */
export async function deleteStudent(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

/**
 * Bulk-update a set of students (the "Bulk Update" action from the list page).
 * PUT /api/students/bulk-update
 * body: { ids: number[], ...fieldsToUpdate }
 *
 * NOTE: endpoint + payload shape assumed — no bulk-update API was provided.
 * Adjust the URL/body here once the real endpoint is confirmed; the modal
 * that calls this doesn't need to change.
 */
export async function bulkUpdateStudents(ids, changes) {
  const { data } = await axiosInstance.put(`${BASE}/bulk-update`, { ids, ...changes });
  return data;
}

/**
 * Bulk mark a set of students active/inactive
 * (the "Mark as Active" / "Mark as Inactive" actions from the list page).
 * PUT /api/students/bulk-status
 * body: { ids: number[], status: 'active' | 'inactive' }
 *
 * NOTE: endpoint assumed — same caveat as bulkUpdateStudents above.
 */
export async function bulkUpdateStudentStatus(ids, status) {
  const { data } = await axiosInstance.put(`${BASE}/bulk-status`, { ids, status });
  return data;
}

export default {
  getStudents,
  createStudent,
  updateStudent,
  getStudent,
  deleteStudent,
  bulkUpdateStudents,
  bulkUpdateStudentStatus,
};