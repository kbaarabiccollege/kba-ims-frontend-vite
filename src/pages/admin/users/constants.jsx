// src/pages/admin/users/constants.js

// Mirrors the `role` ENUM on the users table.
export const ROLE_OPTIONS = [
    { value: "superadmin", label: "Super Admin" },
    { value: "admin", label: "Admin" },
    { value: "staff", label: "Staff" },
    { value: "student", label: "Student" },
    { value: "parent", label: "Parent" },
  ];
  
  // Mirrors the `status` ENUM on the users table.
  export const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  
  export const ROLE_FILTER_OPTIONS = [{ value: "all", label: "All Roles" }, ...ROLE_OPTIONS];
  export const STATUS_FILTER_OPTIONS = [{ value: "all", label: "All Status" }, ...STATUS_OPTIONS];
  
  export const PAGE_SIZE_OPTIONS = [10, 25, 50];
  
  export const roleLabel = (role) =>
    ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role ?? "—";
  
  export const statusLabel = (status) =>
    STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? "—";