import {
  LayoutDashboard,
  Users,
  School,
  BarChart2,
  Bell,
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
      title: "Management",
      items: [
        { label: "Admins",      path: "/superadmin/admins",      icon: Users  },
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