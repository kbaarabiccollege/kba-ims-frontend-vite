// src/pages/admin/reports/reportsConfig.js
//
// Central place to define report categories ("folders") and the reports
// inside each. Add a category here and it shows up in the sidebar; add a
// report object and it shows up in that category's list.
//
// `icon` keys are looked up against ICON_MAP in Reports.jsx.
// `color` picks the icon's accent theme (see the rp-icon-* rules in
// Reports.css): "blue" | "purple" | "green" | "orange".
//
// `path` should match a route registered in AppRouter.jsx.

export const REPORT_CATEGORIES = [
  {
    id: "students",
    label: "Students",
    icon: "graduation",
    color: "blue",
    reports: [],
  },
  {
    id: "staff",
    label: "Staff",
    icon: "idcard",
    color: "orange",
    reports: [],
  },
  {
    id: "timetable",
    label: "Timetable",
    icon: "clock",
    color: "green",
    reports: [],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: "calendar",
    color: "blue",
    reports: [
      {
        id: "student-wise-attendance",
        name: "Student Wise Attendance",
        description: "Day-wise presence and attendance % for each student.",
        path: "/admin/reports/attendance/student-wise-attendance",
        icon: "users",
        color: "blue",
      },
      {
        id: "subject-wise-attendance",
        name: "Subject Wise Attendance",
        description: "Classes held vs. attended, broken down by subject.",
        path: "/admin/reports/attendance/subject-wise-attendance",
        icon: "monitor",
        color: "purple",
      },
    ],
  },
  {
    id: "examination",
    label: "Examination",
    icon: "clipboard",
    color: "purple",
    reports: [],
  },
];