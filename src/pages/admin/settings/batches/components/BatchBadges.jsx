// src/pages/admin/settings/batches/components/BatchBadges.jsx
// Status toggle removed — batches have no status field on the backend.

export const CourseBadge = ({ course }) => {
    const label = typeof course === "string" ? course.toUpperCase() : "—";
    return <span className="bm-badge bm-course-badge">{label}</span>;
  };