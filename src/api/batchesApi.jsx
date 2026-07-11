// src/api/batchesApi.jsx
//
// Thin wrapper around the /batches endpoints, mirroring usersApi.jsx.
// NOTE: status is not a backend field for batches — no status param,
// no status endpoint. If it's added to the backend later, reintroduce
// getBatches({ status }) and an updateBatchStatus() call here.

import axiosInstance from "./axiosInstance";

const BASE = "/batches";

/**
 * Fetch a paginated, filtered list of batches.
 * GET /api/batches?q=&page=&limit=&course=
 *
 * @param {Object} params
 * @param {string} [params.q]       search text (matches batch name/code on the backend)
 * @param {number} [params.page]    1-indexed page number
 * @param {number} [params.limit]   page size
 * @param {string} [params.course]  'all' | specific course value
 */
export async function getBatches({ q, page = 1, limit = 10, course } = {}) {
  const params = { page, limit };

  if (q && q.trim()) params.q = q.trim();
  if (course && course !== "all") params.course = course;

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Create a new batch.
 * POST /api/batches
 * body: { batch_name, course, start_year, end_year }
 */
export async function createBatch(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing batch's fields.
 * PUT /api/batches/:id
 * body: { batch_name, course, start_year, end_year }
 */
export async function updateBatch(id, payload) {
  const { data } = await axiosInstance.put(`${BASE}/${id}`, payload);
  return data;
}

export default {
  getBatches,
  createBatch,
  updateBatch,
};