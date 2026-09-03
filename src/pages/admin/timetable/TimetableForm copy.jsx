// src/pages/admin/timetable/TimetableForm.jsx

import { useAuth } from "../../../context/AuthContext";

const TimetableForm = () => {
  const { user } = useAuth();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>TimetableForm</h1>
      <p>Welcome, {user?.name}</p>
    </div>
  );
};
export default TimetableForm;