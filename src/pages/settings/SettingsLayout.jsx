// src/pages/settings/SettingsLayout.jsx
//
// Full-page shell for the whole Settings area — mirrors how Zoho Books'
// settings takes over the entire viewport instead of living inside the
// normal dashboard chrome (sidebar/topbar).
//
// This must be mounted as its OWN route, as a sibling to your dashboard
// Layout route — not nested inside it — otherwise the Sidebar/Header
// from Layout.jsx will still wrap it. See the AppRouter snippet shared
// alongside this file.
//
// Topbar uses the same --header-bg/--header-text tokens as the main
// app header (layout.css) so it reads as part of the same product,
// with the institution logo sitting between the Back button and the
// "Settings" title — both centered as a group in the topbar.
//
// The left SettingsSidebar only shows once a specific setting (Batches,
// Timetable Format, ...) is open. On the "All Settings" landing grid
// itself (the index route) there's no sidebar — just the full-width
// grid — matching the "All settings page should have no sidebar" ask.

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, CloseIcon } from "../../components/common/Icons";
import SettingsSidebar from "./SettingsSidebar";
import "../../styles/settings.css";

const SettingsLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Captured when Settings was opened (see the header dropdown snippet).
  // Falls back to "/" if someone lands here directly (e.g. refresh).
  const returnTo = location.state?.returnTo || "/";

  // True only on the settings index route itself (e.g. "/admin/settings"
  // or "/admin/settings/"), regardless of which role prefix is used.
  const isSettingsHome = /\/settings\/?$/.test(location.pathname);

  // "Back" steps back one level in history — from a settings sub-page
  // (e.g. Batches) this returns to the Settings home, matching normal
  // browser-back behavior.
  const handleBack = () => navigate(-1);

  // "Close Settings" always exits the settings area entirely, back to
  // wherever the user was before they opened it — regardless of how
  // deep they navigated inside Settings.
  const handleClose = () => navigate(returnTo, { replace: true });

  return (
    <div className="settings-shell">
      <div className="settings-topbar">
        <button type="button" className="settings-back-btn" onClick={handleBack}>
          <ArrowLeftIcon />
          <span>Back</span>
        </button>

        <img
          src="/images/kba-logo.png"
          alt="KBA"
          className="settings-topbar-logo"
        />

        <h1 className="settings-topbar-title">Settings</h1>

        <button type="button" className="settings-close-btn" onClick={handleClose}>
          <span>Close Settings</span>
          <CloseIcon />
        </button>
      </div>

      <div className="settings-body">
        {!isSettingsHome && <SettingsSidebar />}
        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;