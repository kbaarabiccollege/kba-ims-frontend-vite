// src/components/common/courses.js
//
// Shared course-code lookup. The classrooms API returns `course` as a
// number (1, 2, ...), not a label — this maps that number to the
// display label so any page/component can import it and stay in sync.
//
// Add new course codes here as they're introduced; nothing else needs
// to change since callers use getCourseLabel() rather than reading the
// object directly.

export const COURSES = {
    1: "KBA",
    2: "Diploma",
  };
  
  export const getCourseLabel = (courseId) => COURSES[courseId] ?? "";