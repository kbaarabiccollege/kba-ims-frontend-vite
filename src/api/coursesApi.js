// src/api/coursesApi.js
//
// Thin wrapper around the /courses endpoints.
//
// Backend routes:
//   GET    /courses?q=&page=&limit=&is_default=&is_active=
//   GET    /courses/:id
//   POST   /courses
//   PATCH  /courses/:id
//
// Course fields:
//   id
//   name
//   is_default
//   is_active

import axiosInstance from "./axiosInstance";

const BASE = "/courses";

/**
 * Fetch a paginated, filtered list of courses.
 * GET /courses?q=&page=&limit=&is_default=&is_active=
 *
 * All filters are optional.
 *
 * @param {Object} params
 * @param {string} [params.q]                         search text
 * @param {number} [params.page]                      1-indexed page number
 * @param {number} [params.limit]                     page size
 * @param {boolean|number|string} [params.is_default] filter default courses
 * @param {boolean|number|string} [params.is_active]  filter active courses
 */
export async function getCourses({
  q,
  page,
  limit,
  is_default,
  is_active,
} = {}) {
  const params = {};

  if (page != null) params.page = page;
  if (limit != null) params.limit = limit;

  if (q && q.trim()) {
    params.q = q.trim();
  }

  if (is_default != null && is_default !== "all") {
    params.is_default = is_default ? 1 : 0;
  }

  if (is_active != null && is_active !== "all") {
    params.is_active = is_active ? 1 : 0;
  }

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Fetch a single course by id.
 * GET /courses/:id
 */
export async function getCourseById(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new course.
 * POST /courses
 *
 * body:
 * {
 *   name,
 *   is_default,
 *   is_active
 * }
 */
export async function createCourse(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing course.
 * PATCH /courses/:id
 *
 * body:
 * {
 *   name,
 *   is_default,
 *   is_active
 * }
 */
export async function updateCourse(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

export default {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
};