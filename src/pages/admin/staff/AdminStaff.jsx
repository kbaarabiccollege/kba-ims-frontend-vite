
import { useAuth } from "../../../context/AuthContext";

const AdminStaff = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Staff</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AdminStaff;