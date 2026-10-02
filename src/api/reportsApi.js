// src/api/reportsApi.js
//
// Thin wrapper around the /reports endpoints, mirroring batchesApi.js.
// Filter lookups (courses, terms, classrooms, students, subjects) come from
// the existing coursesApi / academicTermsApi / classroomsApi / studentsApi / subjectsApi.

import axiosInstance from "./axiosInstance";

const REPORTS_BASE = "/reports";

/**
 * Student wise attendance report.
 * GET /api/reports/attendance/student-wise?academic_term_id=&classroom_id=&student_id=
 *
 * @returns the `data` object of the response (student summary + subject_attendance[])
 */
export async function getStudentWiseAttendance({ academicTermId, classroomId, studentId }) {
  const { data } = await axiosInstance.get(`${REPORTS_BASE}/attendance/student-wise`, {
    params: {
      academic_term_id: academicTermId,
      classroom_id: classroomId,
      student_id: studentId,
    },
  });
  return data?.data ?? null;
}

/**
 * Subject wise attendance report.
 * GET /api/reports/attendance/subject-wise?academic_term_id=&classroom_id=&subject_id=
 *
 * @returns the `data` object of the response (subject + total_students + student_attendance[])
 */
export async function getSubjectWiseAttendance({ academicTermId, classroomId, subjectId }) {
  const { data } = await axiosInstance.get(`${REPORTS_BASE}/attendance/subject-wise`, {
    params: {
      academic_term_id: academicTermId,
      classroom_id: classroomId,
      subject_id: subjectId,
    },
  });
  return data?.data ?? null;
}

export default {
  getStudentWiseAttendance,
  getSubjectWiseAttendance,
};