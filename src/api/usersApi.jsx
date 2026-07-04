// src/api/usersApi.jsx
//
// Thin, typed wrapper around the /users endpoints.
// Keeping all endpoint strings + param shaping in one place means
// components never construct URLs or query strings themselves —
// they just call a function and get data back.

import axiosInstance from "./axiosInstance";

const BASE = "/users";

/**
 * Fetch a paginated, filtered list of users.
 * GET /api/users?q=&page=&limit=&role=&status=
 *
 * @param {Object} params
 * @param {string} [params.q]       search text (matches user_id, name, email on the backend)
 * @param {number} [params.page]    1-indexed page number
 * @param {number} [params.limit]   page size
 * @param {string} [params.role]    'all' | 'superadmin' | 'admin' | 'staff' | 'student' | 'parent'
 * @param {string} [params.status]  'all' | 'active' | 'inactive'
 */
export async function getUsers({ q, page = 1, limit = 10, role, status } = {}) {
  const params = { page, limit };

  if (q && q.trim()) params.q = q.trim();
  if (role && role !== "all") params.role = role;
  if (status && status !== "all") params.status = status;

  const { data } = await axiosInstance.get(BASE, { params });
  return data;
}

/**
 * Create a new user.
 * POST /api/users
 * body: { user_id, name, email, role, status, password }
 */
export async function createUser(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing user's profile fields (no password here).
 * PUT /api/users/:id
 * body: { user_id, name, email, role, status }
 */
export async function updateUser(id, payload) {
  const { data } = await axiosInstance.put(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Update a user's password.
 * PUT /api/users/:id/password
 * body: { password }
 */
export async function updateUserPassword(id, password) {
  const { data } = await axiosInstance.put(`${BASE}/${id}/password`, { password });
  return data;
}

export default {
  getUsers,
  createUser,
  updateUser,
  updateUserPassword,
};