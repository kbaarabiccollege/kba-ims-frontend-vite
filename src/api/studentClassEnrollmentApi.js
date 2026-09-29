// src/api/studentClassEnrollmentApi.js
//
// Thin wrapper around the /student-enrollments endpoints.
//
// Backend routes:
//   GET    /student-enrollments
//   POST   /student-enrollments
//   PATCH  /student-enrollments/:id
//   PATCH  /student-enrollments/promote
//
// Student enrollment fields:
//   id
//   academic_year_id
//   student_id
//   classroom_id
//   enrollment_status

import axiosInstance from "./axiosInstance";

const BASE = "/student-enrollments";

/**
 * Fetch student enrollments.
 * GET /student-enrollments?academic_year_id=&student_id=
 *
 * All filters are optional.
 *
 * @param {Object} params
 * @param {string} [params.q]                       Search text
 * @param {number} [params.academic_year_id]        Academic year id
 * @param {number} [params.student_id]              Student id
 * @param {string} [params.enrollment_status]       Enrollment status
 */
export async function getStudentEnrollments({
  q,
  academic_year_id,
  student_id,
  enrollment_status,
} = {}) {
  const params = {};

  if (q && q.trim()) {
    params.q = q.trim();
  }

  if (academic_year_id != null) {
    params.academic_year_id = academic_year_id;
  }

  if (student_id != null) {
    params.student_id = student_id;
  }

  if (enrollment_status && enrollment_status !== "all") {
    params.enrollment_status = enrollment_status;
  }

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Create a new student enrollment.
 * POST /student-enrollments
 *
 * body:
 * {
 *   academic_year_id,
 *   student_id,
 *   classroom_id,
 *   enrollment_status
 * }
 */
export async function createStudentEnrollment(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing student enrollment.
 * PATCH /student-enrollments/:id
 *
 * body:
 * {
 *   academic_year_id,
 *   student_id,
 *   classroom_id,
 *   enrollment_status
 * }
 */
export async function updateStudentEnrollment(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Promote multiple students.
 * PATCH /student-enrollments/promote
 *
 * body:
 * {
 *   academic_year_id: 4,
 *   classroom_id: 15,
 *   student_ids: [101, 102, 103, 104]
 * }
 */
export async function promoteStudents(payload) {
  const { data } = await axiosInstance.patch(`${BASE}/promote`, payload);
  return data;
}

export default {
  getStudentEnrollments,
  createStudentEnrollment,
  updateStudentEnrollment,
  promoteStudents,
};