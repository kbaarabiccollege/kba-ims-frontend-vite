// src/pages/admin/staff/Staff.jsx

import { useAuth } from "../../../context/AuthContext";

const Staff = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Staff</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default Staff;