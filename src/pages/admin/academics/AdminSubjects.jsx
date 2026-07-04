
import { useAuth } from "../../../context/AuthContext";

const AdminSubjects = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Subjects</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default AdminSubjects;