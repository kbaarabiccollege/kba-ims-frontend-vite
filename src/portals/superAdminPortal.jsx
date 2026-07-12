import {
  LayoutDashboard,
  Users,
  School,
  BarChart2,
  Bell,
  GraduationCap,
  IdCard,
  ShieldCheck
} from "lucide-react";

const superAdminPortal = {
  label: "Super Admin Portal",
  role: "superadmin",

  menuGroups: [
    {
      title: null,
      items: [
        { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "User Management",
      items: [
        { label: "Users",    path: "/superadmin/users",    icon: Users },
        { label: "Students", path: "/superadmin/students", icon: GraduationCap },
        { label: "Staff",    path: "/superadmin/staff",    icon: IdCard },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Institutions",path: "/superadmin/institutions", icon: School },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "Reports", path: "/superadmin/reports", icon: BarChart2 },
      ],
    },
    {
      title: "Communication",
      items: [
        { label: "Notices", path: "/superadmin/notices", icon: Bell },
      ],
    },
  ],
};

export default superAdminPortal;