import { useAuth } from "../../context/AuthContext";

const StudentDashboard = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Student Dashboard</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default StudentDashboard;