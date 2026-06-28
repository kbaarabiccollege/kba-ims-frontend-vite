// Maps each role string (from API) to its home dashboard route
export const ROLE_HOME = {
    superadmin: "/superadmin/dashboard",
    admin:      "/admin/dashboard",
    staff:      "/staff/dashboard",
    student:    "/student/dashboard",
    parent:     "/parent/dashboard",
    accountant: "/accountant/dashboard",
  };
  
  // All valid roles
  export const VALID_ROLES = Object.keys(ROLE_HOME);
  
  export const getHomeForRole = (role) =>
    ROLE_HOME[role] || "/login";