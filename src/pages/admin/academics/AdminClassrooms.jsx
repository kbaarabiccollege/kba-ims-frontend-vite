
import { useAuth } from "../../../context/AuthContext";

const AdminClassrooms = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Classrooms</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AdminClassrooms;