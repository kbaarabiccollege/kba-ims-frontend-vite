// src/pages/admin/settings/batches/components/BatchBadges.jsx
// Status toggle removed — batches have no status field on the backend.

// Status toggle removed — batches have no status field on the backend.

import { COURSES } from "../../../../../utils/courses";

export const CourseBadge = ({ course }) => {
  const label = COURSES[course] ?? "—";
  return <span className="bm-badge bm-course-badge">{label}</span>;
};