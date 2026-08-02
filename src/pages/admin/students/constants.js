// src/pages/admin/students/constants.js

import { IconPersonal, IconOther, IconCap, IconFamily, IconAddress, IconAdmission, IconLinks } from "../../../components/common/Icons";

export const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

export const SECTIONS = [
  { key: "personal", label: "Personal", Icon: IconPersonal },
  { key: "other", label: "Others Details", Icon: IconOther },
  { key: "academic", label: "Academic", Icon: IconCap },
  { key: "family", label: "Family", Icon: IconFamily },
  { key: "address", label: "Address", Icon: IconAddress },
  { key: "qualifications", label: "Qualifications", Icon: IconCap },
  { key: "admission", label: "Admission", Icon: IconAdmission },
  { key: "links", label: "Related Links", Icon: IconLinks },
];

// Mirrors the `status` field on the students table (active/inactive).
export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
export const STATUS_FILTER_OPTIONS = [{ value: "all", label: "All Status" }, ...STATUS_OPTIONS];

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const statusLabel = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? "—";

// Row-level bulk actions shown once one or more students are selected.
export const BULK_ACTION = {
  UPDATE: "bulk_update",
  MARK_ACTIVE: "mark_active",
  MARK_INACTIVE: "mark_inactive",
};

// ---- StudentForm dropdown option sets ----
// id = value sent to backend, label = what's shown in the UI.

export const GENDER_OPTIONS = [
  { id: 1, label: "Male" },
  { id: 2, label: "Female" },
  { id: 3, label: "Others" },
];

export const BLOOD_GROUP_OPTIONS = [
  { id: 1, label: "A+" },
  { id: 2, label: "A−" },
  { id: 3, label: "B+" },
  { id: 4, label: "B−" },
  { id: 5, label: "AB+" },
  { id: 6, label: "AB−" },
  { id: 7, label: "O+" },
  { id: 8, label: "O−" },
];

export const RELIGION_OPTIONS = [
  { id: 1, label: "Muslim" },
  { id: 2, label: "Hindu" },
  { id: 3, label: "Christian" },
  { id: 4, label: "Other" },
];

export const CASTE_OPTIONS = [
  { id: 1, label: "Lebbai" },
  { id: 2, label: "Rawther" },
  { id: 3, label: "Maraikayar" },
];

export const SOCIAL_CATEGORY_OPTIONS = [
  { id: 1, label: "General" },
  { id: 2, label: "BC" },
  { id: 3, label: "OBC" },
  { id: 4, label: "SC" },
  { id: 5, label: "ST" },
];

export const MADHAB_OPTIONS = [
  { id: 1, label: "Hanafi" },
  { id: 2, label: "Shafi" },
  { id: 3, label: "Maliki" },
  { id: 4, label: "Hambali" },
];

export const FAMILY_ROWS = [
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "education", label: "Education" },
  { key: "occupation", label: "Occupation" },
  { key: "annual_income", label: "Annual Income", type: "number" },
];

export const QUALIFICATION_ROWS = [
  { key: "school_name", label: "School Name" },
  { key: "board", label: "Board" },
  { key: "medium", label: "Medium" },
  { key: "passing_year", label: "Passing Year", type: "number" },
  { key: "passing_month", label: "Passing Month" },
  { key: "reg_number", label: "Register Number" },
  { key: "marks", label: "Marks Obtained", type: "number" },
  { key: "total_marks", label: "Total Marks", type: "number" },
  { key: "emis", label: "EMIS Number" },
  { key: "school_address", label: "School Address", textarea: true },
];

export const ADDRESS_ROWS = [
  { key: "door_no", label: "Door No" },
  { key: "street", label: "Street", textarea: true },
  { key: "area", label: "Area" },
  { key: "city", label: "City" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "pin_code", label: "Pin Code" },
];

// address_type per student_tables.sql: 0=Present 1=Permanent
export const ADDRESS_TYPES = [
  { id: 0, key: "present", label: "Present Address" },
  { id: 1, key: "permanent", label: "Permanent Address" },
];


export const QUALIFICATION_LEVELS = ["10th", "11th", "12th"];

// Generic id -> label lookup for any option array above (GENDER_OPTIONS,
// BLOOD_GROUP_OPTIONS, RELIGION_OPTIONS, CASTE_OPTIONS,
// SOCIAL_CATEGORY_OPTIONS, MADHAB_OPTIONS, ACADEMIC_STATUS_OPTIONS...).
// Lets the read-only Student view page turn a stored id back into its
// display label without re-implementing this lookup per field.
export const optionLabel = (options, id) =>
  options.find((o) => String(o.id) === String(id))?.label ?? "—";

// Canonical empty-row shapes for the address / qualification sub-tables,
// keyed by ADDRESS_TYPES / QUALIFICATION_LEVELS above. Shared by
// StudentForm and reusable by the view page for normalizing partial
// records the same way.
export const emptyAddress = (typeId) => ({
  address_type: typeId,
  door_no: "",
  street: "",
  area: "",
  city: "",
  district: "",
  state: "",
  country: "",
  pin_code: "",
});

export const emptyQualification = (level) => ({
  level,
  school_name: "",
  board: "",
  medium: "",
  passing_year: "",
  passing_month: "",
  school_address: "",
  reg_number: "",
  marks: "",
  total_marks: "",
  emis: "",
});

export const ACADEMIC_STATUS_OPTIONS = [
  { id: "studying", label: "Studying" },
  { id: "graduated", label: "Graduated" },
  { id: "dropout", label: "Dropout" },
  { id: "transferred", label: "Transferred" },
  { id: "suspended", label: "Suspended" },
];

// TODO: point these at your real Google Drive folders (per-purpose, or one
// shared folder). The folder icon next to Photo URL / cert URL / related
// link fields opens whichever of these applies.
export const DRIVE_FOLDERS = {
  studentPhotos: "https://drive.google.com/drive/folders/REPLACE_ME_PHOTOS",
  certificates: "https://drive.google.com/drive/folders/REPLACE_ME_CERTS",
  documents: "https://drive.google.com/drive/folders/REPLACE_ME_DOCS",
};