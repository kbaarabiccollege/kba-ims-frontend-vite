// src/pages/admin/academics/AdminSubjects.jsx

import { useAuth } from "../../../context/AuthContext";

const AdminCalendar = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Calendar</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AdminCalendar;