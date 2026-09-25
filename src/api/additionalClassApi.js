// src/api/additionalClassApi.js
//
// Thin wrapper around the /additional-class endpoints (same pattern as usersApi.js).

import axiosInstance from "./axiosInstance";

const BASE = "/additional-class";

/**
 * Fetch a paginated, filtered list of additional classes.
 * GET /api/additional-class?q=&page=&limit=&course_id=&from_date=&to_date=
 *     &academic_term_id=&classroom_id=&subject_id=&staff_id=&class_type=
 *
 * NOTE: filter param names are my assumption — rename them here if your
 * backend expects different keys. Nothing else in the UI needs to change.
 */
export async function getAdditionalClasses({
  q,
  page = 1,
  limit = 10,
  courseId,
  fromDate,
  toDate,
  academicTermId,
  classroomId,
  subjectId,
  staffId,
  classType,
} = {}) {
  const params = { page, limit };

  if (q && q.trim()) params.q = q.trim();
  if (courseId && courseId !== "all") params.course_id = courseId;
  if (fromDate) params.from_date = fromDate; // YYYY-MM-DD
  if (toDate) params.to_date = toDate; // YYYY-MM-DD
  if (academicTermId && academicTermId !== "all") params.academic_term_id = academicTermId;
  if (classroomId && classroomId !== "all") params.classroom_id = classroomId;
  if (subjectId && subjectId !== "all") params.subject_id = subjectId;
  if (staffId && staffId !== "all") params.staff_id = staffId;
  if (classType && classType !== "all") params.class_type = classType;

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/** GET /api/additional-class/:id */
export async function getAdditionalClassById(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/** POST /api/additional-class */
export async function createAdditionalClass(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/** PATCH /api/additional-class/:id */
export async function updateAdditionalClass(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/** DELETE /api/additional-class/:id */
export async function deleteAdditionalClass(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

/**
 * Options for the filter dropdowns.
 * ASSUMPTION: these list endpoints exist and return { data: [...] } with a
 * `name` (or `title`) field. Adjust endpoints / labels to match your backend,
 * or swap this for your existing lookup APIs.
 */
const LOOKUPS = {
  courses: "/courses",
  academicTerms: "/academic-terms",
  classrooms: "/classrooms",
  subjects: "/subjects",
  staff: "/staff",
};

const toOptions = (res) => {
  const list = res?.data ?? res?.rows ?? (Array.isArray(res) ? res : []);
  return list.map((item) => ({
    id: item.id,
    label: item.name ?? item.title ?? item.label ?? item.course_name ?? `#${item.id}`,
  }));
};

export async function getAdditionalClassFilterOptions() {
  const entries = Object.entries(LOOKUPS);
  const results = await Promise.allSettled(
    entries.map(([, url]) => axiosInstance.get(url, { params: { limit: 500 } }).then((r) => r.data))
  );
  const out = {};
  entries.forEach(([key], i) => {
    out[key] = results[i].status === "fulfilled" ? toOptions(results[i].value) : [];
  });
  return out;
}

export default {
  getAdditionalClasses,
  getAdditionalClassById,
  createAdditionalClass,
  updateAdditionalClass,
  deleteAdditionalClass,
  getAdditionalClassFilterOptions,
};