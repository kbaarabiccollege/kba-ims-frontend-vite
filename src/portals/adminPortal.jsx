import { LayoutDashboard, Users, GraduationCap, IdCard, CalendarCheck, Clock, School, BookOpen, 
  FileText, CalendarDays, ClipboardList, BarChart2, Bell, } from "lucide-react";

const adminPortal = {
  label: "Admin Portal",
  role: "admin",

  menuGroups: [
    {
      title: null,
      items: [
        {
          label: "Dashboard",
          path: "/admin/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Users Management",
      items: [
        { label: "Users",    path: "/admin/users",    icon: Users },
        { label: "Students", path: "/admin/students", icon: GraduationCap },
        { label: "Staff",    path: "/admin/staff",    icon: IdCard },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "Attendance",   path: "/admin/attendance",   icon: CalendarCheck },
        { label: "Timetable",    path: "/admin/timetable",    icon: Clock },
        { label: "Classrooms",   path: "/admin/classrooms",   icon: School },
        { label: "Subjects",     path: "/admin/subjects",     icon: BookOpen },
        { label: "Lesson Plan",  path: "/admin/lesson-plan",  icon: FileText },
        { label: "Calendar",     path: "/admin/calendar",     icon: CalendarDays },
      ],
    },
    {
      title: "Examination",
      items: [
        { label: "Examinations", path: "/admin/examinations", icon: ClipboardList },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "Reports", path: "/admin/reports", icon: BarChart2 },
      ],
    },
    {
      title: "Communication",
      items: [
        { label: "Notices", path: "/admin/notices", icon: Bell },
      ],
    },
  ],
};

export default adminPortal;