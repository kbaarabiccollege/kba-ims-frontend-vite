// src/pages/admin/students/StudentForm.jsx
//
// Placeholder page for both "+ New" and "Edit" from the Students list.
// Per the spec: reuse one page for create + edit, and for now just show
// the student id being edited (or that we're creating a new one) — the
// real form design comes later.
//
// Route wiring (add to the app's router, not included here since that
// file wasn't provided):
//   <Route path="/admin/students/new" element={<StudentForm />} />
//   <Route path="/admin/students/:id/edit" element={<StudentForm />} />

import { useParams, useNavigate } from "react-router-dom";
import "../../../styles/Students.css";

const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  return (
    <div className="st-page">
      <div className="st-page-header">
        <div className="st-title-block">
          <h1>{isEdit ? "Edit Student" : "New Student"}</h1>
          <p className="st-title-meta">
            {isEdit ? `Editing student #${id}` : "Creating a new student"}
          </p>
        </div>
        <button type="button" className="st-btn st-btn-ghost" onClick={() => navigate("/admin/students")}>
          ← Back to Students
        </button>
      </div>

      <div className="st-card">
        <div className="st-form-placeholder">
          {isEdit ? (
            <p>
              This is a placeholder for the student edit form. Student ID: <strong>{id}</strong>
            </p>
          ) : (
            <p>This is a placeholder for the new student form.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentForm;