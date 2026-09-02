// src/pages/admin/settings/TimetableFormatSettings.jsx
//
// Timetable Format list page — built on the shared useListPage hook
// (see src/hooks/useListPageKit.js) so it stays in sync with
// Students/Staff on search, pagination, and filter behavior.
//
// LAYOUT NOTE: unlike Students/Staff, the design has no table header —
// each record renders as its own bordered card/row (.tf-item) instead
// of a <table>. Because of that, the table-only bits of ListPageControls
// (AvatarCell, SelectAllCheckbox, SelectableRowCell, ActionButtonsCell)
// aren't reused here; everything else (ListPageHeader pattern,
// SearchableDropdown, Pagination, DeleteConfirmModal, useListPage,
// useModuleNav, usePageTitle) is reused as-is.
//
// ASSUMPTIONS (adjust to match your actual backend):
// - `course` on each record is a numeric FK (per your sample response).
//   COURSE_OPTIONS/COURSE_LABELS below are stubbed the same way
//   staffTypeOptions is stubbed in Staff.jsx — point them at your real
//   courses endpoint (or swap for a plain <select> if courses are a
//   small static list).
// - `is_active` (1/0) is mapped to the same 'active' | 'inactive' shape
//   STATUS_FILTER_OPTIONS already uses elsewhere in the app.
// - The mockup's create button reads "+ New Format" specifically (not a
//   generic "+ Add {title}"), so this page builds its own header markup
//   instead of <ListPageHeader/>. Swap that back in if it already
//   supports a custom button label.
// - The (i) "info" icon is distinct from the eye "view" icon in the
//   mockup, so it opens a lightweight details modal (description +
//   timestamps) defined right in this file, rather than navigating away.

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getTimetableFormats,
  deleteTimetableFormat,
} from "../../../api/timetableFormatApi";
import { useListPage } from "../../../hooks/useListPageKit";
import { STATUS_FILTER_OPTIONS, PAGE_SIZE_OPTIONS, COURSES } from "../../../utils/constants";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import { Pagination } from "../../../components/common/ListPageControls";
import { DeleteConfirmModal } from "../../../components/common/ListPageModals";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/TimetableFormat.css";

// Course options are derived from the shared COURSES map in
// utils/constants.js so this stays in sync with the rest of the app.
const COURSE_OPTIONS = Object.entries(COURSES).map(([id, label]) => ({
  id: Number(id),
  label,
}));
const COURSE_LABELS = COURSES;

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const InfoIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

const TimetableFormatSettings = () => {
  usePageTitle("Timetable Formats");
  const navigate = useNavigate();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";

  // TimetableFormatForm.jsx handles both /new (create) and /:id/edit
  // (edit); TimetableFormatView.jsx handles /:id/view. Adjust these
  // paths if your router registers them differently.
  const goToCreate = () => navigate(`${basePath}/settings/timetable-format/new`);
  const goToView = (format) => navigate(`${basePath}/settings/timetable-format/${format.id}/view`);
  const goToEdit = (format) => navigate(`${basePath}/settings/timetable-format/${format.id}/edit`);

  const fetchFn = useCallback(
    (params) =>
      getTimetableFormats({
        q: params.q,
        page: params.page,
        limit: params.limit,
        course: params.course,
        status: params.status,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    initialFilters: { course: "all", status: "all" },
  });

  const courseOptions = useMemo(
    () => COURSE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    []
  );

  const statusAllOption = useMemo(() => STATUS_FILTER_OPTIONS.find((s) => s.value === "all"), []);
  const statusOptions = useMemo(
    () =>
      STATUS_FILTER_OPTIONS.filter((s) => s.value !== "all").map((s) => ({
        id: s.value,
        label: s.label,
      })),
    []
  );

  // ---- row delete ----
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteTimetableFormat(deleteTarget.id);
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Couldn't delete this format.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ---- info (details) modal ----
  const [infoTarget, setInfoTarget] = useState(null);

  return (
    <div className="tf-page">
      <div className="tf-page-header">
        <div className="tf-title-block">
          <h1>Timetable Formats</h1>
          <p className="tf-title-meta">{list.total} total</p>
        </div>
        <div className="tf-header-actions">
          <button
            type="button"
            className={`tf-btn tf-btn-ghost tf-refresh-btn ${list.refreshing ? "tf-refresh-spinning" : ""}`}
            onClick={list.handleRefresh}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          <button type="button" className="tf-btn tf-btn-primary" onClick={goToCreate}>
            <PlusIcon />
            New Format
          </button>
        </div>
      </div>

      <div className="tf-card">
        <div className="tf-toolbar">
          <div className="tf-search">
            <span className="tf-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search by format name or description..."
              aria-label="Search timetable formats"
            />
          </div>

          <div className="tf-filters">
            <SearchableDropdown
              label="Course"
              allLabel="All Courses"
              options={courseOptions}
              value={list.filters.course}
              onChange={(v) => list.setFilter("course", v)}
              selectedLabel={COURSE_LABELS[list.filters.course]}
            />
            <SearchableDropdown
              label="Status"
              allLabel={statusAllOption?.label || "All Status"}
              options={statusOptions}
              value={list.filters.status}
              onChange={(v) => list.setFilter("status", v)}
            />
            <span className="tf-result-count">{list.total} formats</span>
          </div>
        </div>

        {list.error && <div className="tf-error-banner">{list.error}</div>}

        <div className="tf-list-wrap">
          {list.loading ? (
            <div className="tf-state-cell">Loading timetable formats…</div>
          ) : list.items.length === 0 ? (
            <div className="tf-state-cell">No timetable formats match your search or filters.</div>
          ) : (
            list.items.map((format, idx) => {
              const isActive = format.is_active === 1 || format.is_active === true;
              return (
                <div className="tf-item" key={format.id}>
                  <span className="tf-item-number">
                    {(list.page - 1) * list.limit + idx + 1}
                  </span>

                  <div className="tf-item-main">
                    <span className="tf-item-title">{format.format_name || "—"}</span>
                    <span className="tf-item-desc">{format.description || "—"}</span>
                  </div>

                  <div className="tf-item-course">
                    <span className="tf-item-course-label">Course</span>
                    <span className="tf-item-course-value">
                      {COURSE_LABELS[format.course] || `Course #${format.course}`}
                    </span>
                  </div>

                  <span className={`tf-status-pill ${isActive ? "tf-status-active" : "tf-status-inactive"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>

                  <div className="tf-item-actions">
                    <button
                      type="button"
                      className="tf-icon-btn"
                      onClick={() => setInfoTarget(format)}
                      aria-label={`Details for ${format.format_name}`}
                      title="Details"
                    >
                      <InfoIcon />
                    </button>
                    <button
                      type="button"
                      className="tf-icon-btn"
                      onClick={() => goToView(format)}
                      aria-label={`View ${format.format_name}`}
                      title="View"
                    >
                      <EyeIcon />
                    </button>
                    <button
                      type="button"
                      className="tf-icon-btn tf-icon-btn-edit"
                      onClick={() => goToEdit(format)}
                      aria-label={`Edit ${format.format_name}`}
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="tf-icon-btn tf-icon-btn-danger"
                      onClick={() => setDeleteTarget(format)}
                      aria-label={`Delete ${format.format_name}`}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="tf-pagination">
          <Pagination
            page={list.page}
            setPage={list.setPage}
            limit={list.limit}
            setLimit={list.setLimit}
            total={list.total}
            totalPages={list.totalPages}
            rangeStart={list.rangeStart}
            rangeEnd={list.rangeEnd}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </div>
      </div>

      {infoTarget && (
        <div className="tf-modal-overlay" onClick={() => setInfoTarget(null)}>
          <div className="tf-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tf-modal-header">
              <h2>{infoTarget.format_name}</h2>
              <button type="button" className="tf-modal-close" onClick={() => setInfoTarget(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="tf-modal-body">
              <div className="tf-info-row">
                <span className="tf-info-row-label">Description</span>
                <span className="tf-info-row-value">{infoTarget.description || "—"}</span>
              </div>
              <div className="tf-info-row">
                <span className="tf-info-row-label">Course</span>
                <span className="tf-info-row-value">
                  {COURSE_LABELS[infoTarget.course] || `Course #${infoTarget.course}`}
                </span>
              </div>
              <div className="tf-info-row">
                <span className="tf-info-row-label">Status</span>
                <span className="tf-info-row-value">
                  {infoTarget.is_active === 1 || infoTarget.is_active === true ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="tf-info-row">
                <span className="tf-info-row-label">Created</span>
                <span className="tf-info-row-value">{formatDate(infoTarget.created_at)}</span>
              </div>
              <div className="tf-info-row">
                <span className="tf-info-row-label">Last updated</span>
                <span className="tf-info-row-value">{formatDate(infoTarget.updated_at)}</span>
              </div>
            </div>
            <div className="tf-modal-actions">
              <button type="button" className="tf-btn tf-btn-ghost" onClick={() => setInfoTarget(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          variant="tf"
          title="Delete Timetable Format"
          itemName={deleteTarget.format_name}
          itemLabel="timetable format"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          submitting={deleteSubmitting}
          error={deleteError}
        />
      )}
    </div>
  );
};

export default TimetableFormatSettings;