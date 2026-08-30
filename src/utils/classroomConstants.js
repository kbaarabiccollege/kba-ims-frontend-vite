// src/utils/classroomConstants.js
//
// Static lookup data for the Classrooms (and, by extension, Subjects)
// list pages. Term/Semester are small closed enums, modeled the same
// way STAFF_TYPE_OPTIONS/EMPLOYMENT_PLACE_OPTIONS are in staffConstants.js.
//
// Course is a real FK (see `course: 1` in the sample API response you
// shared) — this file ships a static placeholder list so the page works
// out of the box. Swap COURSE_OPTIONS for a live lookup (SearchableDropdown
// fed by an async courseApi.searchCourses() call, same idea as the
// "searchStaffTypes" pattern mentioned in Staff.jsx) once a /courses
// endpoint exists. AdminClassrooms.jsx doesn't need to change shape when
// you do that — only where courseOptions comes from.

export const TERM_OPTIONS = [
    { value: "all", label: "All Terms" },
    { value: 1, label: "ODD" },
    { value: 2, label: "EVEN" },
  ];
  
  export const TERM_LABELS = TERM_OPTIONS.reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});
  
  export const SEMESTER_OPTIONS = [
    { value: "all", label: "All Semesters" },
    { value: 1, label: "Semester 1" },
    { value: 2, label: "Semester 2" },
    { value: 3, label: "Semester 3" },
    { value: 4, label: "Semester 4" },
    { value: 5, label: "Semester 5" },
    { value: 6, label: "Semester 6" },
  ];
  
  export const SEMESTER_LABELS = SEMESTER_OPTIONS.reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});
  
  // PLACEHOLDER — replace with real course data (id + name) once a
  // courses lookup endpoint exists. Kept in the same {value,label} shape
  // as TERM/SEMESTER so the dropdown code in AdminClassrooms.jsx doesn't
  // need to change.
  export const COURSE_OPTIONS = [
    { value: "all", label: "All Courses" },
    { value: 1, label: "KBA" },
    { value: 2, label: "Diploma" },
  ];
  
  export const COURSE_LABELS = COURSE_OPTIONS.reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});