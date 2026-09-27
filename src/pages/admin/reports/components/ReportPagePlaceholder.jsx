// src/pages/admin/reports/components/ReportPagePlaceholder.jsx
//
// Shared dummy shell for a report page: breadcrumb back to the Reports
// Center, a disabled filter bar, and an empty-state table with the
// report's real column headers. Swap the table body for live data once
// the backend endpoint exists — everything else can stay as-is.

import { Link } from "react-router-dom";
import usePageTitle from "../../../../hooks/usePageTitle";
import "./ReportPagePlaceholder.css";

const ReportPagePlaceholder = ({ categoryId, categoryLabel, title, description, columns }) => {
  usePageTitle([title]);

  return (
    <div className="st-page rpp-page">
      <div className="rpp-breadcrumb">
        <Link to="/admin/reports">Reports Center</Link>
        <span className="rpp-breadcrumb-sep">/</span>
        <Link to={`/admin/reports/${categoryId}`}>{categoryLabel}</Link>
        <span className="rpp-breadcrumb-sep">/</span>
        <span className="rpp-breadcrumb-current">{title}</span>
      </div>

      <div className="rpp-card">
        <div className="rpp-header">
          <div>
            <h1 className="rpp-title">{title}</h1>
            <p className="rpp-subtitle">{description}</p>
          </div>
          <span className="rpp-badge">Coming soon</span>
        </div>

        <div className="rpp-filters">
          <div className="rpp-filter">
            <label>Academic Session</label>
            <select disabled>
              <option>2026 - 2027</option>
            </select>
          </div>
          <div className="rpp-filter">
            <label>Class / Batch</label>
            <select disabled>
              <option>All</option>
            </select>
          </div>
          <div className="rpp-filter">
            <label>From</label>
            <input type="date" disabled />
          </div>
          <div className="rpp-filter">
            <label>To</label>
            <input type="date" disabled />
          </div>
          <button type="button" className="rpp-run-btn" disabled>
            Run Report
          </button>
        </div>

        <div className="rpp-table-wrap">
          <table className="rpp-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} className="rpp-state-cell">
                  This report is under development. Data will appear here once it's wired up to the API.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPagePlaceholder;