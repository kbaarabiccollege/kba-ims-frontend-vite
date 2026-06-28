// src/components/layouts/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";

const Sidebar = ({
  portal,
  collapsed,
  isMobileDrawer = false,
  mobileOpen     = false,
  onClose,
}) => {
  /* ── Mobile drawer ──────────────────────────────────────── */
  if (isMobileDrawer) {
    return (
      <aside
        className={`layout-sidebar layout-sidebar--drawer${mobileOpen ? " layout-sidebar--drawer-open" : ""}`}
        inert={!mobileOpen}
        aria-label="Navigation drawer"
      >
        {/* Sticky header: emblem + institution name + close */}
        <div className="layout-sidebar__brand layout-sidebar__brand--mobile">
          <img
            src="/images/kba-logo-emblem.png"
            alt="KBA Logo"
            className="layout-sidebar__logo-emblem"
          />
          <span className="layout-sidebar__institution-name">
            {portal?.institutionName || "Admin Portal"}
          </span>
          <button
            className="layout-sidebar__close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="layout-sidebar__nav">
          {portal?.menuGroups?.map((group, gIdx) => (
            <div key={gIdx} className="layout-sidebar__group">
              {group.title && (
                <p className="layout-sidebar__group-title">
                  {group.title.toUpperCase()}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `layout-sidebar__item layout-sidebar__item--mobile${isActive ? " layout-sidebar__item--active" : ""}`
                    }
                    onClick={(e) => {
                      e.currentTarget.blur(); // Remove focus from the clicked link
                      onClose();
                    }}
                  >
                    <span className="layout-sidebar__item-icon layout-sidebar__item-icon--mobile">
                      <Icon size={20} />
                    </span>
                    <span className="layout-sidebar__item-label">
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  /* ── Desktop sidebar ────────────────────────────────────── */
  return (
    <aside
      className={`layout-sidebar${collapsed ? " layout-sidebar--collapsed" : ""}`}
    >
      <div className="layout-sidebar__brand">
        <img
          src={collapsed ? "/images/kba-logo-emblem.png" : "/images/kba-logo.png"}
          alt="KBA Logo"
          className={collapsed ? "layout-sidebar__logo-emblem" : "layout-sidebar__logo-full"}
        />
      </div>

      <nav className="layout-sidebar__nav">
        {portal?.menuGroups?.map((group, gIdx) => (
          <div key={gIdx} className="layout-sidebar__group">
            {group.title && !collapsed && (
              <p className="layout-sidebar__group-title">
                {group.title.toUpperCase()}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `layout-sidebar__item${isActive ? " layout-sidebar__item--active" : ""}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <span className="layout-sidebar__item-icon">
                    <Icon size={18} />
                  </span>
                  {!collapsed && (
                    <span className="layout-sidebar__item-label">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;