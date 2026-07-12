// src/pages/admin/students/constants.js

// Mirrors the `status` field on the students table (active/inactive).
export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
export const STATUS_FILTER_OPTIONS = [{ value: "all", label: "All Status" }, ...STATUS_OPTIONS];

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const statusLabel = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? "—";

// Row-level bulk actions shown once one or more students are selected.
export const BULK_ACTION = {
  UPDATE: "bulk_update",
  MARK_ACTIVE: "mark_active",
  MARK_INACTIVE: "mark_inactive",
};