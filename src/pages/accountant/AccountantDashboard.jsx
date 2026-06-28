import { useAuth } from "../../context/AuthContext";

const AccountantDashboard = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Accountant Dashboard</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AccountantDashboard;