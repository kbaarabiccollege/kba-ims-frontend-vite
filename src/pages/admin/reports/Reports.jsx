// src/pages/admin/reports/Reports.jsx
//
// "Reports" — mirrors the reference design: a page header with title +
// subtitle on the left and a search bar to its right, a left "Report
// Category" folder list, and a right panel showing a highlighted category
// banner followed by a clickable card for each report inside it.

import { useNavigate, useParams } from "react-router-dom";
import { REPORT_CATEGORIES } from "./reportsConfig";
import usePageTitle from "../../../hooks/usePageTitle";
import "./Reports.css";

/* ---------- icons ---------- */

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M3.5 7.2c0-1.05.85-1.9 1.9-1.9h4.09c.42 0 .82.17 1.11.48l1.2 1.27c.29.3.69.48 1.11.48h5.19c1.05 0 1.9.85 1.9 1.9v8.15c0 1.05-.85 1.9-1.9 1.9H5.4c-1.05 0-1.9-.85-1.9-1.9V7.2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const BarChartIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 19V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 19V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const GraduationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2.5 8.5 12 4l9.5 4.5-9.5 4.5-9.5-4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M6.5 10.8v4c0 1.5 2.46 3 5.5 3s5.5-1.5 5.5-3v-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M21.5 8.5v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IdCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="9" cy="11.2" r="1.9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6.3 15.8c.5-1.5 1.7-2.3 2.7-2.3s2.2.8 2.7 2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M15 10.5h3M15 13.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="5.5" y="4.5" width="13" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="9" y="3" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8.5 12h7M8.5 15.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="9.5" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 19c.7-3 3-4.7 6-4.7s5.3 1.7 6 4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="17.2" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M15.8 14.6c2.3.3 4 1.6 4.6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="10.2" r="1.6" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const ICON_MAP = {
  calendar: CalendarIcon,
  graduation: GraduationIcon,
  idcard: IdCardIcon,
  clock: ClockIcon,
  clipboard: ClipboardIcon,
  users: UsersIcon,
  monitor: MonitorIcon,
};

const renderIcon = (name) => {
  const IconComponent = ICON_MAP[name] || ClipboardIcon;
  return <IconComponent />;
};

/* ---------- component ---------- */

const Reports = () => {
  const { categoryId: routeCategoryId } = useParams();
  const navigate = useNavigate();

  const activeCategory =
    REPORT_CATEGORIES.find((c) => c.id === routeCategoryId) || REPORT_CATEGORIES[0];

  usePageTitle(["Reports"]);

  const handleSelectCategory = (id) => {
    navigate(`/admin/reports/${id}`);
  };

  return (
    <div className="st-page rp-page">
      <div className="rp-header">
        <div className="rp-header-left">
          <span className="rp-header-icon">
            <BarChartIcon />
          </span>
          <div>
            <h1 className="rp-title">Reports</h1>
            <p className="rp-subtitle">Access and view various reports for better insights.</p>
          </div>
        </div>

        <div className="rp-search">
          <span className="rp-search-icon">
            <SearchIcon />
          </span>
          <input type="text" placeholder="Search all reports…" aria-label="Search all reports" disabled />
        </div>
      </div>

      <div className="rp-body">
        <aside className="rp-sidebar">
          <p className="rp-nav-label">Report Category</p>

          <nav className="rp-nav-group">
            {REPORT_CATEGORIES.map((cat) => {
              const isActive = activeCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`rp-nav-item ${isActive ? "rp-nav-item-active" : ""}`}
                  onClick={() => handleSelectCategory(cat.id)}
                >
                  <FolderIcon />
                  <span className="rp-nav-item-label">{cat.label}</span>
                  {isActive && (
                    <span className="rp-nav-item-chevron">
                      <ChevronIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="rp-content">
          <div className={`rp-category-banner rp-icon-${activeCategory.color}`}>
            <span className="rp-category-icon">{renderIcon(activeCategory.icon)}</span>
            <h2 className="rp-category-title">{activeCategory.label} Reports</h2>
            <span className="rp-count-badge">{activeCategory.reports.length}</span>
          </div>

          {activeCategory.reports.length === 0 ? (
            <div className="rp-empty-state">
              <span className="rp-empty-icon">
                <ClipboardIcon />
              </span>
              <p>No reports available in {activeCategory.label} yet.</p>
              <p className="rp-empty-sub">Reports for this module are coming soon.</p>
            </div>
          ) : (
            <div className="rp-report-list">
              {activeCategory.reports.map((report) => (
                <div
                  key={report.id}
                  className="rp-report-card"
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(report.path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(report.path);
                    }
                  }}
                >
                  <span className={`rp-report-icon rp-icon-${report.color}`}>
                    {renderIcon(report.icon)}
                  </span>
                  <div className="rp-report-text">
                    <h3 className="rp-report-name">{report.name}</h3>
                    <p className="rp-report-desc">{report.description}</p>
                  </div>
                  <span className="rp-report-chevron">
                    <ChevronIcon />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Reports;