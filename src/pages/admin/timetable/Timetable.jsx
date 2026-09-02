// src/pages/admin/timetable/Timetable.jsx

import { useAuth } from "../../../context/AuthContext";

const Timetable = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Timetable</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default Timetable;