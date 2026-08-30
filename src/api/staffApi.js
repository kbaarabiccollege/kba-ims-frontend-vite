// src/api/staffApi.js
//
// Thin, typed wrapper around the /staff endpoints.
// Follows the same shape/pattern as studentsApi.js / usersApi.js.

import axiosInstance from "./axiosInstance";

const BASE = "/staff";

/**
 * Fetch a paginated, filtered list of staff.
 * GET /api/staff/list?page=&limit=&q=&staff_type=&employment_place=&status=
 *
 * NOTE: the search bar covers name / staff_uid / email in a single field.
 * This assumes the backend accepts one `q` param and matches across all
 * three columns (same convention as getStudents' `q`). If the backend
 * instead expects separate params, split `q` here — the component itself
 * doesn't need to change.
 *
 * @param {Object} params
 * @param {string} [params.q]                search text (name, staff_uid, email)
 * @param {number} [params.page]             1-indexed page number
 * @param {number} [params.limit]            page size
 * @param {string|number} [params.staffType]
 * @param {string|number} [params.employmentPlace]
 * @param {string} [params.status]           'all' | 'active' | 'inactive'
 */
export async function getStaff({
  q,
  page = 1,
  limit = 25,
  staffType,
  employmentPlace,
  designation,
  status,
} = {}) {
  const params = { page, limit };

  if (q && q.trim()) params.q = q.trim();
  if (staffType && staffType !== "all") params.staff_type = staffType;
  if (employmentPlace && employmentPlace !== "all") params.employment_place = employmentPlace;
  if (designation && designation !== "all") params.designation = designation;
  if (status && status !== "all") params.status = status;

  const { data } = await axiosInstance.get(`${BASE}/list`, { params });
  return data;
}

/**
 * Create a new staff member.
 * POST /api/staff
 * NOTE: payload shape isn't finalized yet — the create/edit page is a
 * placeholder for now, so this is wired for when that form exists.
 */
export async function createStaff(payload) {
  const { data } = await axiosInstance.post(BASE, payload);
  return data;
}

/**
 * Update an existing staff member's profile fields.
 * PUT /api/staff/:id
 */
export async function updateStaff(id, payload) {
  const { data } = await axiosInstance.patch(`${BASE}/${id}`, payload);
  return data;
}

/**
 * Fetch a single staff member by id (used by the create/edit page for now,
 * just to display the id while the real form is built).
 * GET /api/staff/:id
 */
export async function getStaffMember(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
return data;
}

// Lightweight variant of getStaffMember for FK-resolution use cases
// (e.g. Classrooms advisor lookup via useEntityCache) that only need
// {id, name, photo_url, staff_uid} instead of the full staff record.
export async function getStaffMemberSummary(id) {
  const { data } = await axiosInstance.get(`${BASE}/${id}`);
  const staff = data?.data || {};
  const personal = staff.personal_details || {};
  return {
    id,
    name: personal.name || null,
    photo_url: personal.photo_url || null,
    staff_uid: personal.staff_uid || null,
  };
}

/**
 * Delete a single staff member (the trash icon in row actions).
 * DELETE /api/staff/:id
 *
 * NOTE: endpoint assumed — no delete endpoint was provided in the spec.
 * Adjust the URL here once the real one is confirmed.
 */
export async function deleteStaff(id) {
  const { data } = await axiosInstance.delete(`${BASE}/${id}`);
  return data;
}

/**
 * Bulk-update a set of staff (the "Bulk Update" action from the list page).
 * PATCH /api/staff/bulk
 * body: { staff_ids, staff_type, employment_place, status, designation }
 * Only fields explicitly present in `changes` are sent as their real
 * value; everything else goes as null, per the API contract ("pass null
 * if not provided").
 */
/**
 * Bulk mark a set of staff active/inactive
 * (the "Mark as Active" / "Mark as Inactive" actions from the list page).
 * PATCH /api/staff/bulk
 * body: { staff_ids, status }
 */
export async function bulkUpdateStaffStatus(ids, status) {
  const body = { staff_ids: ids, status };
  const { data } = await axiosInstance.patch(`${BASE}/bulk`, body);
  return data;
}

export default {
  getStaff,
  createStaff,
  updateStaff,
  getStaffMember,
  getStaffMemberSummary,
  deleteStaff,
  bulkUpdateStaffStatus,
};