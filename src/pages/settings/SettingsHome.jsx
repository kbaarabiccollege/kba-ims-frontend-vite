// src/pages/settings/SettingsHome.jsx
//
// The Settings landing screen (route: /settings, index route inside
// SettingsLayout). Laid out as grouped tile-grids, the same pattern
// Zoho Books uses on its settings home (sections with clickable cards
// rather than a left-nav list) — makes it easy to add more sections
// and tiles later without restructuring anything.
//
// Add future settings entries by adding to SETTINGS_SECTIONS below —
// no other change needed as long as the target route exists under
// SettingsLayout in AppRouter.

import { useNavigate } from "react-router-dom";
import { ChevronRightIcon } from "../../components/common/Icons";
import { SETTINGS_SECTIONS } from "./settingsNav";

const SettingsHome = () => {
  const navigate = useNavigate();

  return (
    <div className="settings-home">
      {SETTINGS_SECTIONS.map((section) => (
        <div className="settings-section" key={section.title}>
          <h2 className="settings-section-title">{section.title}</h2>
          <div className="settings-grid">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="settings-tile"
                  onClick={() => navigate(item.path)}
                >
                  <span className="settings-tile-icon">
                    <Icon />
                  </span>
                  <span className="settings-tile-text">
                    <span className="settings-tile-label">{item.label}</span>
                    <span className="settings-tile-desc">{item.description}</span>
                  </span>
                  <span className="settings-tile-chevron">
                    <ChevronRightIcon />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SettingsHome;