// src/routes/ProtectedRoute.jsx

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomeForRole } from "../utils/roleUtils";

/**
 * allowedRoles: optional array e.g. ["admin", "superadmin"]
 * If omitted, any authenticated user can access.
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role, initializing } = useAuth();
  const location = useLocation();

  // The httpOnly cookie can't be read by JS, so on first load
  // AuthContext must ask the server (GET /auth/me) whether it's valid.
  // While that's in flight, isAuthenticated is still false by default —
  // without this guard, every hard refresh would flash a redirect to
  // /login before the real answer comes back.
  if (initializing) {
    return null; // or a spinner/skeleton if you have a shared one
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Authenticated but wrong role for THIS route — send them to their
    // own home instead of a dead-end page. This also covers the
    // cross-tab case: if another tab logs in as a different role, this
    // tab's role updates via AuthContext's storage listener, this
    // guard re-evaluates on the next render, and the mismatch now
    // redirects to the new role's real dashboard.
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;