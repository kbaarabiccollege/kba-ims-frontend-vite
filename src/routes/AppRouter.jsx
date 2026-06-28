// src/routes/AppRouter.jsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getHomeForRole } from "../utils/roleUtils";

import ProtectedRoute from "./ProtectedRoute";
import Layout  from "../components/layouts/Layout";
import LoginPage        from "../pages/auth/LoginPage";

// Portal pages
import AdminDashboard      from "../pages/admin/AdminDashboard";
import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import StaffDashboard      from "../pages/staff/StaffDashboard";
import StudentDashboard    from "../pages/student/StudentDashboard";
import ParentDashboard     from "../pages/parent/ParentDashboard";
import AccountantDashboard from "../pages/accountant/AccountantDashboard";

// Portal configs (for sidebar)
import adminPortal      from "../portals/adminPortal";
import superAdminPortal from "../portals/superAdminPortal";
import staffPortal      from "../portals/staffPortal";
// import other portals similarly…

import NotFound from "../components/common/NotFound";
import AdminStudents from "../pages/admin/AdminStudents";

// Redirects logged-in user to their portal; otherwise to login
const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeForRole(role)} replace />;
};

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/"      element={<RootRedirect />} />

      {/* ── Admin Portal ── */}
      {/* <Route element={<ProtectedRoute allowedRoles={["admin"]} />}> */}
        <Route element={<Layout portal={adminPortal} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          {/* Add more admin pages here */}
        </Route>
      {/* </Route> */}

      {/* ── Super Admin Portal ── */}
      <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
        <Route element={<Layout portal={superAdminPortal} />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          {/* superadmin/admins, etc. */}
        </Route>
      </Route>

      {/* ── Staff Portal ── */}
      <Route element={<ProtectedRoute allowedRoles={["staff"]} />}>
        <Route element={<Layout portal={staffPortal} />}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
        </Route>
      </Route>

      {/* ── Student Portal ── */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route element={<Layout portal={null} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Route>
      </Route>

      {/* ── Parent Portal ── */}
      <Route element={<ProtectedRoute allowedRoles={["parent"]} />}>
        <Route element={<Layout portal={null} />}>
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
        </Route>
      </Route>

      {/* ── Accountant Portal ── */}
      <Route element={<ProtectedRoute allowedRoles={["accountant"]} />}>
        <Route element={<Layout portal={null} />}>
          <Route path="/accountant/dashboard" element={<AccountantDashboard />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="/unauthorized" element={<div>Access Denied</div>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
