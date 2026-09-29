// src/api/academicYearsApi.js
//
// Thin wrapper around the /academic-years endpoints.
//
// Backend routes:
//   GET    /academic-years
//   GET    /academic-years/:id
//   POST   /academic-years
//   PATCH  /academic-years/:id
//
// Academic year fields:
//   id
//   name
//   start_date
//   end_date
//   is_current

import axiosInstance from "./axiosInstance";

const BASE = "/academic-years";

/**
 * Fetch academic years.
 * GET /academic-years?is_current=
 *
 * @param {Object} params
 * @param {string} [params.q]
 *        Search text.
 * @param {boolean|number|string} [params.is_current]
 *        Filter current academic years.
 */
export async function getAcademicYears({
  q,
  is_current,
} = {}) {
  const params = {};

  if (q && q.trim()) {
    params.q = q.trim();
  }

  if (is_current != null && is_current !== "all") {
    params.is_current = is_current ? 1 : 0;
  }

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Fetch a single academic year by id.
 * GET /academic-years/:id
 */
export async function getAcademicYearById(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  return data;
}

/**
 * Create a new academic year.
 * POST /academic-years
 *
 * body:
 * {
 *   name,
 *   start_date,
 *   end_date,
 *   is_current
 * }
 */
export async function createAcademicYear(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing academic year.
 * PATCH /academic-years/:id
 *
 * body:
 * {
 *   name,
 *   start_date,
 *   end_date,
 *   is_current
 * }
 */
export async function updateAcademicYear(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Delete an academic year.
 *
 * PATCH /academic-years/:id
 *
 * Based on the API information provided,
 * delete is handled using PATCH.
 */
export async function deleteAcademicYear(id) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`);
  return data;
}

export default {
  getAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
};