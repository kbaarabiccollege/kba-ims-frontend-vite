import { useAuth } from "../../context/AuthContext";

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Super Admin Dashboard</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default SuperAdminDashboard;