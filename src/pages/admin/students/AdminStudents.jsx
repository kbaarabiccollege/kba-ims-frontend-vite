
import { useAuth } from "../../../context/AuthContext";

const AdminStudents = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Students</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AdminStudents;