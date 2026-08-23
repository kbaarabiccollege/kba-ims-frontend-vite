// src/pages/admin/staff/constants.js
//
// Mirrors src/pages/admin/students/constants.js. staff_type and
// employment_place are small static enums (no backend lookup endpoint),
// so they live here as plain option lists rather than going through the
// searchable-dropdown + growing-index pattern used for classrooms/batches.

export const STAFF_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: 1, label: "Teaching" },
  { value: 2, label: "Non-Teaching" },
];

export const EMPLOYMENT_PLACE_OPTIONS = [
  { value: "all", label: "All Places" },
  { value: 1, label: "KBA" },
  { value: 2, label: "UNIVERSITY" },
];

export const DESIGNATION_OPTIONS = [
  { value: "all", label: "All Designations" },
  { value: 1, label: "Lecturer" },
  { value: 2, label: "Assistant Professor" },
  { value: 3, label: "Associate Professor" },
  { value: 4, label: "HOD" },
  { value: 5, label: "Dean" },
  { value: 6, label: "Lab Technician" },
  { value: 7, label: "Admin" },
  { value: 8, label: "Librarian" },
  { value: 9, label: "Research Assistant" },
  { value: 10, label: "Research Associate" },
  { value: 11, label: "Accountant" },
  { value: 12, label: "Attendant" },
  { value: 13, label: "Electrician" },
  { value: 14, label: "Hostel Warden" },
  { value: 15, label: "Assistant Warden" },
  { value: 16, label: "Physical Education Instructor" },
];

export const DESIGNATION_LABELS = DESIGNATION_OPTIONS.reduce((acc, o) => {
  if (o.value !== "all") acc[o.value] = o.label;
  return acc;
}, {});

// Static id->label lookups — used the same way classroomsIndex/batchesIndex
// are used on the Students page (e.g. to render a value in the table cell).
export const STAFF_TYPE_LABELS = STAFF_TYPE_OPTIONS.filter(
  (o) => o.value !== "all"
).reduce((acc, o) => ({ ...acc, [o.value]: o.label }), {});

export const EMPLOYMENT_PLACE_LABELS = EMPLOYMENT_PLACE_OPTIONS.filter(
  (o) => o.value !== "all"
).reduce((acc, o) => ({ ...acc, [o.value]: o.label }), {});

// ---- StaffForm tabs ----
export const STAFF_SECTIONS = [
  { key: "personal", label: "Personal" },
  { key: "employment", label: "Employment" },
  { key: "qualifications", label: "Qualifications" },
  { key: "address", label: "Address" },
  { key: "other", label: "Other Details" },
];

// ---- ASSUMED lookup options — replace ids/labels with your real
// lookup tables (same convention as RELIGION_OPTIONS / GENDER_OPTIONS
// etc. in the Students constants file). ----
export const SALUTATION_OPTIONS = [
  { id: 1, label: "Mr." },
  { id: 2, label: "Mrs." },
  { id: 3, label: "Ms." },
  { id: 4, label: "Dr." },
  { id: 5, label: "Prof." },
];

export const MARITAL_STATUS_OPTIONS = [
  { id: 1, label: "Single" },
  { id: 2, label: "Married" },
  { id: 3, label: "Divorced" },
  { id: 4, label: "Widowed" },
];

export const EMPLOYMENT_NATURE_OPTIONS = [
  { id: 1, label: "Full-time" },
  { id: 2, label: "Part-time" },
  { id: 3, label: "Contract" },
  { id: 4, label: "Visiting" },
];