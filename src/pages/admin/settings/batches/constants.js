// src/pages/admin/settings/batches/constants.js
//
// Adjust COURSE_FILTER_OPTIONS / COURSE_OPTIONS to match your real
// course list (or fetch them dynamically and drop the hard-coded array).
// NOTE: no status options here — batches have no status field on the backend.

export const COURSE_FILTER_OPTIONS = [
    { value: "all", label: "All Courses" },
    { value: "btech", label: "B.Tech" },
    { value: "bca", label: "BCA" },
    { value: "bba", label: "BBA" },
    { value: "mba", label: "MBA" },
  ];
  
  export const COURSE_OPTIONS = COURSE_FILTER_OPTIONS.filter((c) => c.value !== "all");
  
  export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];