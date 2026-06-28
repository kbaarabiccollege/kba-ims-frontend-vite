import { useAuth } from "../../context/AuthContext";

const StaffDashboard = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Staff Dashboard</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default StaffDashboard;