import {
    LayoutDashboard,
    CalendarCheck,
    Clock,
    FileText,
    Bell,
  } from "lucide-react";
  
  const staffPortal = {
    label: "Staff Portal",
    role: "staff",
  
    menuGroups: [
      {
        title: null,
        items: [
          { label: "Dashboard", path: "/staff/dashboard", icon: LayoutDashboard },
        ],
      },
      {
        title: "Academics",
        items: [
          { label: "Attendance",  path: "/staff/attendance",   icon: CalendarCheck },
          { label: "Timetable",   path: "/staff/timetable",    icon: Clock        },
          { label: "Lesson Plan", path: "/staff/lesson-plan",  icon: FileText     },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Notices", path: "/staff/notices", icon: Bell },
        ],
      },
    ],
  };
  
  export default staffPortal;