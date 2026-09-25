// src/pages/admin/attendance/AttendanceView.jsx

import { useAuth } from "../../../context/AuthContext";

const AttendanceView = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>AttendanceView</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AttendanceView;