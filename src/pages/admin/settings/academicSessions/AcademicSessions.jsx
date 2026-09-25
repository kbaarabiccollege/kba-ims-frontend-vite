// src/pages/admin/settings/academicSessions/AcademicSessions.jsx
//
// Academic Sessions list page (Settings > Academics > Academic Sessions).
// Talks to GET/POST/PATCH /api/academic-terms via src/api/academicTermsApi.js.
// Mirrors Batches.jsx structure/behaviour token-for-token.
//
// Table: Name, Course, Term, Start Date, End Date, Current, Status, Actions.
// Filters: Term (term_type), Course, Current, Status (is_active).

import { useCallback, useState } from "react";
import {
  getAcademicTerms,
  createAcademicTerm,
  updateAcademicTerm,
} from "../../../../api/academicTermsApi";
import { useListPage } from "../../../../hooks/useListPageKit";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";
import AcademicSessionFormModal from "./components/AcademicSessionFormModal";
import { DeleteConfirmModal } from "../../../../components/common/ListPageModals";
import { EditIcon, TrashIcon } from "../../../../components/common/Icons";
import { COURSES, PAGE_SIZE_OPTIONS } from "../../../../utils/constants";
import usePageTitle from "../../../../hooks/usePageTitle";
import "../../../../styles/AcademicSessions.css";

export const CourseBadge = ({ course }) => {
  const label = COURSES[course] ?? "—";
  return <span className="as-badge as-course-badge">{label}</span>;
};

export const TermBadge = ({ term }) => {
  const label = term ? String(term).toUpperCase() : "—";
  return <span className="as-badge as-term-badge">{label}</span>;
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export const CurrentBadge = ({ isCurrent }) =>
  isCurrent ? (
    <span className="as-badge as-current-badge">Current</span>
  ) : (
    <span className="as-muted-dash">—</span>
  );

export const StatusBadge = ({ isActive }) => (
  <span className={`as-badge ${isActive ? "as-status-active" : "as-status-inactive"}`}>
    {isActive ? "Active" : "Inactive"}
  </span>
);

const COURSE_FILTER_OPTIONS = [
  { value: "all", label: "All Courses" },
  ...Object.entries(COURSES).map(([id, label]) => ({
    value: Number(id),
    label,
  })),
];

const TERM_FILTER_OPTIONS = [
  { value: "all", label: "All Terms" },
  { value: "ODD", label: "Odd" },
  { value: "EVEN", label: "Even" },
];

const CURRENT_FILTER_OPTIONS = [
  { value: "all", label: "Any" },
  { value: "1", label: "Current" },
  { value: "0", label: "Not Current" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

const AcademicSessions = () => {
  // ---- popups ----
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', session? }
  usePageTitle(
    formModal
      ? formModal.mode === "edit"
        ? ["Edit", "Academic Session"]
        : ["Add New", "Academic Session"]
      : "Academic Sessions"
  );
  const [deleteModal, setDeleteModal] = useState(null); // session
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState({});

  // ---- list state (search, filters, pagination, fetch lifecycle) ----
  const fetchFn = useCallback(
    (params) =>
      getAcademicTerms({
        q: params.q,
        page: params.page,
        limit: params.limit,
        course_id: params.course,
        term_type: params.term_type,
        is_current: params.is_current,
        is_active: params.is_active,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    initialLimit: 10,
    initialFilters: { course: "all", term_type: "all", is_current: "all", is_active: "all" },
  });

  // ---- create / edit ----
  const openCreateModal = () => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "create" });
  };

  const openEditModal = (session) => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "edit", session });
  };

  const closeFormModal = () => {
    if (submitting) return;
    setFormModal(null);
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setModalError("");
    setModalFieldErrors({});
    try {
      if (formModal.mode === "edit") {
        await updateAcademicTerm(formModal.session.id, payload);
      } else {
        await createAcademicTerm(payload);
      }
      setFormModal(null);
      list.refetch();
    } catch (err) {
      const data = err?.response?.data;
      setModalError(
        data?.message ||
          (formModal.mode === "edit" ? "Couldn't save changes." : "Couldn't create academic session.")
      );
      setModalFieldErrors(data?.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  // ---- delete (dummy — no endpoint given for academic-terms) ----
  const openDeleteModal = (session) => setDeleteModal(session);
  const closeDeleteModal = () => setDeleteModal(null);
  const handleDeleteConfirm = () => {
    // Intentionally not calling an API — wire up DELETE /api/academic-terms/:id here
    // once/if the backend exposes it.
    setDeleteModal(null);
  };

  return (
    <div className="as-page">
      <div className="as-page-header">
        <div className="as-title-block">
          <h1>
            <span className="as-title-icon" aria-hidden="true">
              🗓️
            </span>
            Academic Sessions
          </h1>
          <p className="as-title-meta">{list.total} total</p>
        </div>
        <button type="button" className="as-btn as-btn-primary as-btn-add" onClick={openCreateModal}>
          <span aria-hidden="true">+</span>
          <span className="as-btn-add-label-full">Add New Session</span>
          <span className="as-btn-add-label-short">Add</span>
        </button>
      </div>

      <div className="as-card">
        <div className="as-toolbar">
          <div className="as-search">
            <span className="as-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search sessions…"
              aria-label="Search academic sessions"
            />
          </div>

          <div className="as-filters">
            <div className="as-filter-dropdown">
              <SearchableDropdown
                id="as-course-filter"
                label=""
                allLabel={COURSE_FILTER_OPTIONS.find((c) => c.value === "all")?.label || "All Courses"}
                options={COURSE_FILTER_OPTIONS.filter((c) => c.value !== "all").map((c) => ({
                  id: c.value,
                  label: c.label,
                }))}
                value={list.filters.course}
                onChange={(v) => list.setFilter("course", v)}
                aria-label="Filter by course"
              />
            </div>

            <div className="as-filter-dropdown">
              <SearchableDropdown
                id="as-term-filter"
                label=""
                allLabel={TERM_FILTER_OPTIONS.find((t) => t.value === "all")?.label || "All Terms"}
                options={TERM_FILTER_OPTIONS.filter((t) => t.value !== "all").map((t) => ({
                  id: t.value,
                  label: t.label,
                }))}
                value={list.filters.term_type}
                onChange={(v) => list.setFilter("term_type", v)}
                aria-label="Filter by term"
              />
            </div>

            <div className="as-filter-dropdown">
              <SearchableDropdown
                id="as-current-filter"
                label=""
                allLabel={CURRENT_FILTER_OPTIONS.find((c) => c.value === "all")?.label || "Any"}
                options={CURRENT_FILTER_OPTIONS.filter((c) => c.value !== "all").map((c) => ({
                  id: c.value,
                  label: c.label,
                }))}
                value={list.filters.is_current}
                onChange={(v) => list.setFilter("is_current", v)}
                aria-label="Filter by current status"
              />
            </div>

            <div className="as-filter-dropdown">
              <SearchableDropdown
                id="as-status-filter"
                label=""
                allLabel={STATUS_FILTER_OPTIONS.find((s) => s.value === "all")?.label || "All Statuses"}
                options={STATUS_FILTER_OPTIONS.filter((s) => s.value !== "all").map((s) => ({
                  id: s.value,
                  label: s.label,
                }))}
                value={list.filters.is_active}
                onChange={(v) => list.setFilter("is_active", v)}
                aria-label="Filter by status"
              />
            </div>

            <span className="as-result-count">{list.total} sessions</span>
          </div>
        </div>

        {list.error && <div className="as-error-banner">{list.error}</div>}

        <div className="as-table-wrap">
          <table className="as-table">
            <thead>
              <tr>
                <th className="as-col-num">#</th>
                <th className="as-col-left">Name</th>
                <th>Course</th>
                <th>Term</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Current</th>
                <th>Status</th>
                <th className="as-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading ? (
                <tr>
                  <td colSpan={9} className="as-state-cell">
                    Loading academic sessions…
                  </td>
                </tr>
              ) : list.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="as-state-cell">
                    No academic sessions match your search or filters.
                  </td>
                </tr>
              ) : (
                list.items.map((session, idx) => (
                  <tr key={session.id}>
                    <td className="as-col-num">{(list.page - 1) * list.limit + idx + 1}</td>
                    <td className="as-session-name">{session.name || "—"}</td>
                    <td>
                      <CourseBadge course={session.course} />
                    </td>
                    <td>
                      <TermBadge term={session.term_type} />
                    </td>
                    <td>{formatDate(session.start_date)}</td>
                    <td>{formatDate(session.end_date)}</td>
                    <td>
                      <CurrentBadge isCurrent={!!session.is_current} />
                    </td>
                    <td>
                      <StatusBadge isActive={!!session.is_active} />
                    </td>
                    <td>
                      <div className="as-actions">
                        <button
                          type="button"
                          className="as-icon-btn"
                          title="Edit session"
                          aria-label={`Edit ${session.name}`}
                          onClick={() => openEditModal(session)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="as-icon-btn as-icon-btn-danger"
                          title="Delete session"
                          aria-label={`Delete ${session.name}`}
                          onClick={() => openDeleteModal(session)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="as-pagination">
          <span className="as-pagination-summary">
            {list.total === 0
              ? "No results"
              : `Showing ${list.rangeStart}-${list.rangeEnd} of ${list.total}`}
          </span>

          <div className="as-pagination-controls">
            <label className="as-per-page">
              Per page:
              <select
                value={list.limit}
                onChange={(e) => {
                  list.setLimit(Number(e.target.value));
                  list.setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="as-page-nav"
              disabled={list.page <= 1}
              onClick={() => list.setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="as-page-current">{list.page}</span>
            <button
              type="button"
              className="as-page-nav"
              disabled={list.page >= list.totalPages}
              onClick={() => list.setPage((p) => Math.min(list.totalPages, p + 1))}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {formModal && (
        <AcademicSessionFormModal
          mode={formModal.mode}
          initialData={formModal.session}
          onClose={closeFormModal}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          serverError={modalError}
          serverFieldErrors={modalFieldErrors}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          user={deleteModal}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default AcademicSessions;