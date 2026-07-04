// src/components/layouts/Header.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell, ChevronDown, LogOut,
  Sun, Moon, User, UserCircle, Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationsPanel from "./NotificationsPanel";

const Header = ({ portal, isMobile = false }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const roleDisplay = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

  return (
    <header className="layout-header">
      {/* ── Left: title (+ emblem on mobile) ── */}
      <div className="layout-header__left">
        {isMobile && (
          <img
            src="/images/kba-logo-emblem.png"
            alt="KBA"
            className="layout-header__mobile-emblem"
          />
        )}
        <span className="layout-header__title">
          {portal?.label || "Portal"}
        </span>
      </div>

      {/* ── Right: actions ── */}
      <div className="layout-header__actions">
        {/* Notification bell */}
        <button
          className={`layout-header__icon-btn${notifOpen ? " layout-header__icon-btn--active" : ""}`}
          aria-label="Notifications"
          aria-expanded={notifOpen}
          onClick={() => {
            setNotifOpen(v => !v);
            setDropdownOpen(false); // close profile dropdown if open
          }}
        >
          <Bell size={20} />
          <span className="layout-header__badge">5</span>
        </button>

        {/* Notifications panel — rendered inside header so it inherits z-index context */}
        <NotificationsPanel
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          isMobile={isMobile}
        />

        {/* Settings icon REMOVED — available inside profile dropdown only */}

        <div className="layout-header__divider" />

        {/* Profile */}
        <div className="layout-header__profile" ref={dropdownRef}>
          <button
            className="layout-header__profile-btn"
            onClick={() => setDropdownOpen(v => !v)}
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            <div className="layout-header__avatar">
              <User size={18} />
            </div>

            {/* Desktop only: show name + role inline */}
            {!isMobile && (
              <div className="layout-header__user-info">
                <span className="layout-header__user-name">
                  {user?.name || "User"}
                </span>
                <span className="layout-header__user-role">{roleDisplay}</span>
              </div>
            )}

            <ChevronDown
              size={16}
              className={`layout-header__chevron${dropdownOpen ? " layout-header__chevron--open" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="layout-header__dropdown">
              {/* User info block — content differs by viewport */}
              <div className="layout-header__dropdown-user">
                {/* Mobile only: show name + id + email + role */}
                {isMobile ? (
                  <>
                    <span className="layout-header__dropdown-user-name">
                      {user?.name || "Administrator"}
                    </span>
                    <span className="layout-header__dropdown-user-meta">
                      {user?.id || "ADM001"}
                    </span>
                    <span className="layout-header__dropdown-user-meta">
                      {user?.email || "admin@example.com"}
                    </span>
                    <span className="layout-header__dropdown-user-meta">
                      {roleDisplay || "Admin"}
                    </span>
                  </>
                ) : (
                  /* Desktop: id + email only (name+role already in header btn) */
                  <>
                    <span className="layout-header__dropdown-user-meta">
                      {user?.id || "ADM001"}
                    </span>
                    <span className="layout-header__dropdown-user-meta">
                      {user?.email || "admin@example.com"}
                    </span>
                  </>
                )}
              </div>

              <div className="layout-header__dropdown-divider" />

              <button
                className="layout-header__dropdown-item"
                onClick={() => {
                  navigate(`/${portal?.role}/profile`);
                  setDropdownOpen(false);
                }}
              >
                <UserCircle size={16} />
                <span>Profile</span>
              </button>

              <button
                className="layout-header__dropdown-item"
                onClick={() => {
                  navigate(`/${portal?.role}/settings`, {
                    state: { returnTo: location.pathname },
                  });
                  setDropdownOpen(false);
                }}
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>

              <button
                className="layout-header__dropdown-item"
                onClick={() => { toggleTheme(); setDropdownOpen(false); }}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                <span>Theme</span>
              </button>

              <div className="layout-header__dropdown-divider" />

              <button
                className="layout-header__dropdown-item layout-header__dropdown-item--danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;