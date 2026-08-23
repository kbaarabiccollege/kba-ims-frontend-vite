// src/utils/constants.js

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Statuses
export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
export const STATUS_FILTER_OPTIONS = [{ value: "all", label: "All Status" }, ...STATUS_OPTIONS];

export const statusLabel = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? "—";

// Roles
export const ROLE_OPTIONS = [
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "dev", label: "Dev" },
  { value: "accountant", label: "Accountant" },
];

export const ROLE_FILTER_OPTIONS = [{ value: "all", label: "All Roles" }, ...ROLE_OPTIONS];  

export const roleLabel = (role) =>
  ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role ?? "—";

// Courses
export const COURSES = {
    1: "KBA",
    2: "Diploma",
  };
  
export const getCourseLabel = (courseId) => COURSES[courseId] ?? "";