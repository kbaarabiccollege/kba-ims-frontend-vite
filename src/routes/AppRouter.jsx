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
import Students from "../pages/admin/students/Students";
import StudentForm from "../pages/admin/students/StudentForm";
import StudentView from "../pages/admin/students/StudentView";
import Users from "../pages/superadmin/users/Users";
import Staff from "../pages/admin/staff/Staff";
import StaffForm from "../pages/admin/staff/StaffForm";
import StaffView from "../pages/admin/staff/StaffView";


import AdminClassrooms from "../pages/admin/academics/AdminClassrooms";
import AdminSubjects from "../pages/admin/academics/AdminSubjects";

import Timetable from "../pages/admin/timetable/Timetable";
import Attendance from "../pages/admin/attendance/Attendance";

import SettingsLayout from "../pages/admin/settings/SettingsLayout";
import SettingsHome from "../pages/admin/settings/SettingsHome";
import Batches from "../pages/admin/settings/batches/Batches";
import TimetableFormatSettings from "../pages/admin/settings/TimetableFormatSettings";
import TimetableFormatForm from "../pages/admin/settings/TimetableFormatForm";
import TimetableFormatView from "../pages/admin/settings/TimetableFormatView";

// Redirects logged-in user to their portal; otherwise to login
const RootRedirect = () => {
  const { isAuthenticated, role, initializing } = useAuth();
  // Same reasoning as ProtectedRoute: wait for the /auth/me check
  // before deciding, since the cookie can't be read synchronously.
  if (initializing) return null;
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
      <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin"]} />}>
        <Route element={<Layout portal={adminPortal} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/students/new" element={<StudentForm />} />
          <Route path="/admin/students/:id" element={<StudentView />} />
          <Route path="/admin/students/:id/edit" element={<StudentForm />} />
          <Route path="/admin/staff" element={<Staff />} />
          <Route path="/admin/staff/new" element={<StaffForm />} />
          <Route path="/admin/staff/:id" element={<StaffView />} />
          <Route path="/admin/staff/:id/edit" element={<StaffForm />} />


          <Route path="/admin/classrooms" element={<AdminClassrooms />} />
          <Route path="/admin/subjects" element={<AdminSubjects />} />
          <Route path="/admin/timetable" element={<Timetable />} />
          <Route path="/admin/attendance" element={<Attendance />} />
          {/* Add more admin pages here */}
        </Route>
      </Route>

      {/* ── Admin Settings — deliberately OUTSIDE <Layout>, so it's a
          true full-page view without the sidebar/header ── */}

{/* ── Admin Settings — deliberately OUTSIDE <Layout>, so it's a
          true full-page view without the sidebar/header. Still wrapped in
          ProtectedRoute so auth/role checks aren't skipped. ── */}

      <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin", "dev"]} />}>
        <Route path="/admin/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsHome />} />
          <Route path="batches" element={<Batches />} />
          <Route path="timetable-format" element={<TimetableFormatSettings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin", "dev"]} />}>
        <Route path="/admin/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsHome />} />
          <Route path="batches" element={<Batches />} />
          <Route path="timetable-format" element={<TimetableFormatSettings />} />
          <Route path="timetable-format/new" element={<TimetableFormatForm />} />
          <Route path="timetable-format/:id/edit" element={<TimetableFormatForm />} />
          <Route path="timetable-format/:id/view" element={<TimetableFormatView />} />
        </Route>
        <Route path="/superadmin/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsHome />} />
          <Route path="batches" element={<Batches />} />
          <Route path="timetable-format" element={<TimetableFormatSettings />} />
        </Route>
      </Route>

      {/* ── Super Admin Portal ── */}
      <Route element={<ProtectedRoute allowedRoles={["superadmin", "dev"]} />}>
        <Route element={<Layout portal={superAdminPortal} />}>
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/users" element={<Users />} />
          <Route path="/superadmin/students" element={<Students />} />
          <Route path="/superadmin/students/new" element={<StudentForm />} />
          <Route path="/superadmin/students/:id" element={<StudentView />} />
          <Route path="/superadmin/students/:id/edit" element={<StudentForm />} />
          <Route path="/superadmin/staff" element={<Staff />} />
          <Route path="/superadmin/staff/new" element={<StaffForm />} />
          <Route path="/superadmin/staff/:id" element={<StaffView />} />
          <Route path="/superadmin/staff/:id/edit" element={<StaffForm />} />

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