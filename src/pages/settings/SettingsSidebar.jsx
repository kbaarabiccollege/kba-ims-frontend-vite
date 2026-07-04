// src/pages/settings/SettingsSidebar.jsx
//
// Left nav for the Settings area. Deliberately styled differently from
// the dashboard's dark-navy Sidebar.jsx (light, tinted-blue panel with a
// left accent bar on the active item) so it reads as "a different part
// of the app" rather than a clone of the main nav.
//
// Only rendered by SettingsLayout when a specific settings page is
// open — hidden on the "All Settings" landing grid itself. The
// "All Settings" link at the top always takes you back to that grid.

import { Link, NavLink } from "react-router-dom";
import { AllSettingsIcon } from "../../components/common/Icons";
import { SETTINGS_SECTIONS } from "./settingsNav";


const SettingsSidebar = () => {
  return (
    <nav className="settings-sidebar">
      <Link to='/admin/settings' className="settings-sidebar__all-link">
        <span className="settings-sidebar__item-icon">
          <AllSettingsIcon />
        </span>
        <span>All Settings</span>
      </Link>

      <div className="settings-sidebar__divider" />

      {SETTINGS_SECTIONS.map((section) => (
        <div className="settings-sidebar__group" key={section.title}>
          <div className="settings-sidebar__group-title">{section.title}</div>
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) =>
                  `settings-sidebar__item${isActive ? " settings-sidebar__item--active" : ""}`
                }
              >
                <span className="settings-sidebar__item-icon">
                  <Icon />
                </span>
                <span className="settings-sidebar__item-label">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
};

export default SettingsSidebar;