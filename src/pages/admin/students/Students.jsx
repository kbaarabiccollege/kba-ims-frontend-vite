// src/pages/admin/students/Students.jsx

// Students list page (Student Management > Students).
// Talks to GET /api/students/list via src/api/studentsApi.jsx, and to
// /api/classrooms + /api/batches (via classroomsApi.jsx / batchesApi.jsx)
// to populate the two filter dropdowns.
//
// NOTE on API response shape: getStudents() returns
//   { data: Student[], pagination: { total, page, limit, totalPages } }
// per the sample response in the spec. Adjust fetchStudents() below if the
// backend shape ever changes — everything else is shape-agnostic.
//
// NOTE on search: a single search box covers name / roll_number / rrn,
// sent as one `q` param (same convention as the Users page).
//
// NOTE on classroom/batch filters: these still do NOT auto-load their full
// list on page mount. Each now uses the shared <SearchableDropdown>, which
// keeps the original "Fetch"/"↻ Refresh" button (nothing loads until it's
// clicked) and adds a search box next to it. The button always fetches
// using whatever's typed; once a list has been fetched at least once,
// further typing auto-refreshes it (debounced) via `?q=` (e.g.
// /api/batches?q=2026, /api/classrooms?q=2026).
// Because the visible option list changes as you search, we keep a
// separate id->label index (classroomsIndex / batchesIndex) that only
// ever grows, so a previously-selected classroom/batch still displays
// its name correctly (in the trigger button and in the table) even after
// it scrolls out of the current search results.
//
// NOTE on mobile filters: below 640px, the Classroom/Batch/Status filters
// are hidden by default behind a funnel icon next to the search box —
// tapping it toggles them open. Classroom and Batch share one row at
// reduced width on mobile; Status sits below.
//
// NOTE on bulk actions: "Bulk Update", "Mark as Active" and
// "Mark as Inactive" all call placeholder endpoints (bulk-update /
// bulk-status) — no bulk API was provided in the spec, so these are
// wired up and ready but should be pointed at the real endpoint once
// it exists (see studentsApi.jsx). BulkActionsModal previously received
// the full, eagerly-loaded `classrooms`/`batches` arrays; since those are
// no longer loaded eagerly, it now receives whatever has been seen so far
// via classroomsIndex/batchesIndex converted back to arrays. If
// BulkActionsModal needs its own live search, give it a SearchableDropdown
// too (pointed at searchClassrooms/searchBatches below).
//
// NOTE on view/edit/delete: view and edit both navigate to StudentForm.jsx
// (a placeholder page per the spec — "no need to design it now"). Delete
// calls a placeholder deleteStudent() endpoint (see studentsApi.jsx) behind
// a small inline confirm. Routes below need to be registered in the app's
// router (not included here — that file wasn't part of what was shared):
//   /admin/students/new        -> create
//   /admin/students/:id        -> view
//   /admin/students/:id/edit   -> edit

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getStudents,
  deleteStudent,
  bulkUpdateStudents,
  bulkUpdateStudentStatus,
} from "../../../api/studentsApi";
import { getClassrooms } from "../../../api/classroomsApi";
import { getBatches } from "../../../api/batchesApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { STATUS_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from "./constants";
import BulkActionsModal from "./components/BulkActionsModal";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import { EditIcon, EyeIcon, TrashIcon } from "../../../components/common/Icons";
import "../../../styles/AdminStudents.css";

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const FilterFunnelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5h16l-6.2 7.2v5.3l-3.6 2V12.2L4 5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

// Maps the logged-in user's role to the portal path this page is
// mounted under, so navigation to create/view/edit stays correct
// whether Students is rendered inside the Admin or Super Admin portal.
// Add an entry here whenever this page gets wired up under a new portal.
const ROLE_BASE_PATHS = {
  admin: "/admin",
  superadmin: "/superadmin",
  dev: "/superadmin",
};

const Students = () => {
  const navigate = useNavigate();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";

  // ---- list state ----
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // ---- classroom/batch lookups: current dropdown results + an
  // ever-growing id->label index so previously-picked values keep their
  // display name even after the dropdown's own list has moved on. ----
  const [classroomOptions, setClassroomOptions] = useState([]);
  const [classroomsIndex, setClassroomsIndex] = useState({});
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);

  const [batchOptions, setBatchOptions] = useState([]);
  const [batchesIndex, setBatchesIndex] = useState({});
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);

  // ---- filters ----
  const [search, setSearch] = useState("");
  const [classroomId, setClassroomId] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [status, setStatus] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  // ---- mobile filter panel (hidden by default, toggled via funnel icon) ----
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ---- selection + bulk actions ----
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModal, setBulkModal] = useState(null); // 'update' | 'activate' | 'deactivate'
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // ---- row delete confirm ----
  const [deleteTarget, setDeleteTarget] = useState(null); // student
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ---- "..." page menu (next to + New) ----
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickAway = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [menuOpen]);

  // ---- classroom search (called by SearchableDropdown on open + on type) ----
  const searchClassrooms = useCallback(async (q) => {
    setClassroomsLoading(true);
    try {
      const res = await getClassrooms({ isActive: 1, q });
      const list = res?.data ?? [];
      setClassroomOptions(list.map((c) => ({ id: c.id, label: c.name })));
      setClassroomsIndex((prev) => {
        const next = { ...prev };
        list.forEach((c) => {
          next[c.id] = c.name;
        });
        return next;
      });
      setClassroomsLoaded(true);
    } catch {
      setClassroomOptions([]);
    } finally {
      setClassroomsLoading(false);
    }
  }, []);

  // ---- batch search (called by SearchableDropdown on open + on type) ----
  const searchBatches = useCallback(async (q) => {
    setBatchesLoading(true);
    try {
      const res = await getBatches({ limit: 100, q });
      const list = res?.data ?? [];
      setBatchOptions(list.map((b) => ({ id: b.id, label: b.batch_name })));
      setBatchesIndex((prev) => {
        const next = { ...prev };
        list.forEach((b) => {
          next[b.id] = b.batch_name;
        });
        return next;
      });
      setBatchesLoaded(true);
    } catch {
      setBatchOptions([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  // ---- status filter options, reshaped for SearchableDropdown ----
  const statusAllOption = useMemo(
    () => STATUS_FILTER_OPTIONS.find((s) => s.value === "all"),
    []
  );
  const statusOptions = useMemo(
    () =>
      STATUS_FILTER_OPTIONS.filter((s) => s.value !== "all").map((s) => ({
        id: s.value,
        label: s.label,
      })),
    []
  );

  // ---- fetch students ----
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStudents({
        q: debouncedSearch,
        page,
        limit,
        classroomId,
        batchId,
        status,
      });
      setStudents(res?.data ?? []);
      setTotal(res?.pagination?.total ?? (res?.data ?? []).length);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't load students. Please try again in a moment."
      );
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, classroomId, batchId, status]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset to page 1 whenever a filter changes (not on page/limit changes themselves)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classroomId, batchId, status]);

  // Clear selection whenever the underlying page of students changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [students]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const allOnPageSelected = students.length > 0 && selectedIds.size === students.length;
  const someOnPageSelected = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- refresh (small icon left of + New) ----
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
    setRefreshing(false);
  };

  // ---- create / view / edit navigation ----
  // basePath comes from the user's role (see ROLE_BASE_PATHS above), so
  // this works correctly whether the page is mounted under /admin or
  // /superadmin.
  const goToCreate = () => navigate(`${basePath}/students/new`);
  const goToView = (student) => navigate(`${basePath}/students/${student.id}`);
  const goToEdit = (student) => navigate(`${basePath}/students/${student.id}/edit`);

  // ---- row delete ----
  const openDeleteConfirm = (student) => {
    setDeleteError("");
    setDeleteTarget(student);
  };
  const closeDeleteConfirm = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  };
  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Couldn't delete this student.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ---- bulk actions ----
  const openBulkModal = (action) => {
    setBulkError("");
    setBulkModal(action);
  };
  const closeBulkModal = () => {
    if (bulkSubmitting) return;
    setBulkModal(null);
  };

  const handleBulkConfirm = async (changes) => {
    setBulkSubmitting(true);
    setBulkError("");
    try {
      const ids = Array.from(selectedIds);
      if (bulkModal === "update") {
        await bulkUpdateStudents(ids, changes);
      } else {
        await bulkUpdateStudentStatus(ids, changes.status);
      }
      setBulkModal(null);
      setSelectedIds(new Set());
      fetchStudents();
    } catch (err) {
      setBulkError(err?.response?.data?.message || "Couldn't complete this action.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Arrays reconstructed from the accumulated indexes, for BulkActionsModal
  // (which previously expected full classrooms/batches arrays).
  const classroomsForModal = useMemo(
    () => Object.entries(classroomsIndex).map(([id, name]) => ({ id, name })),
    [classroomsIndex]
  );
  const batchesForModal = useMemo(
    () => Object.entries(batchesIndex).map(([id, batch_name]) => ({ id, batch_name })),
    [batchesIndex]
  );

  return (
    <div className="st-page">
      <div className="st-page-header">
        <div className="st-title-block">
          <h1>Students</h1>
          <p className="st-title-meta">{total} total</p>
        </div>

        <div className="st-header-actions">
          <button
            type="button"
            className={`st-icon-btn st-refresh-btn${refreshing ? " st-refresh-spinning" : ""}`}
            aria-label="Refresh list"
            title="Refresh list"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            ↻
          </button>

          <button type="button" className="st-btn st-btn-primary st-btn-add" onClick={goToCreate}>
            <span aria-hidden="true">+</span>
            <span>New</span>
          </button>

          <div className="st-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className={`st-icon-btn st-more-btn${menuOpen ? " st-more-btn-active" : ""}`}
              aria-label="More actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="st-dropdown-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: wire up to the real bulk-add endpoint/flow.
                  }}
                >
                  Bulk Add Students
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: wire up to the real export endpoint/flow.
                  }}
                >
                  Export Students
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="st-card">
        <div className="st-toolbar">
          <div className="st-search-row">
            <div className="st-search">
              <span className="st-search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, roll number or RRN…"
                aria-label="Search students"
              />
            </div>

            <button
              type="button"
              className={`st-icon-btn st-filter-toggle-btn${
                mobileFiltersOpen ? " st-filter-toggle-btn-active" : ""
              }`}
              aria-label="Toggle filters"
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen((o) => !o)}
            >
              <FilterFunnelIcon />
            </button>
          </div>

          <div className={`st-filters${mobileFiltersOpen ? " st-filters-open" : ""}`}>
            <div className="st-filters-row">
              <SearchableDropdown
                label="Classroom"
                allLabel="All Classrooms"
                options={classroomOptions}
                value={classroomId}
                onChange={setClassroomId}
                searchable
                onFetch={searchClassrooms}
                loaded={classroomsLoaded}
                loading={classroomsLoading}
                selectedLabel={classroomsIndex[classroomId]}
                placeholder="Search classrooms…"
              />

              <SearchableDropdown
                label="Batch"
                allLabel="All Batches"
                options={batchOptions}
                value={batchId}
                onChange={setBatchId}
                searchable
                onFetch={searchBatches}
                loaded={batchesLoaded}
                loading={batchesLoading}
                selectedLabel={batchesIndex[batchId]}
                placeholder="Search batches…"
              />
            </div>

            <SearchableDropdown
              label="Status"
              allLabel={statusAllOption?.label || "All Status"}
              options={statusOptions}
              value={status}
              onChange={setStatus}
            />

            <span className="st-result-count">{total} students</span>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="st-bulk-bar">
            <span className="st-bulk-count">{selectedIds.size} selected</span>
            <div className="st-bulk-actions">
              <button type="button" className="st-btn st-btn-ghost" onClick={() => openBulkModal("update")}>
                Bulk Update
              </button>
              <button
                type="button"
                className="st-btn st-btn-ghost st-btn-success"
                onClick={() => openBulkModal("activate")}
              >
                Mark as Active
              </button>
              <button
                type="button"
                className="st-btn st-btn-ghost st-btn-danger"
                onClick={() => openBulkModal("deactivate")}
              >
                Mark as Inactive
              </button>
            </div>
          </div>
        )}

        {error && <div className="st-error-banner">{error}</div>}

        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th className="st-col-checkbox">
                  <input
                    type="checkbox"
                    aria-label="Select all students on this page"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="st-col-num">#</th>
                <th className="st-col-left">Student</th>
                <th>RRN</th>
                <th>Batch</th>
                <th>Classroom</th>
                <th className="st-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="st-state-cell">
                    Loading students…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="st-state-cell">
                    No students match your search or filters.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const isInactive = student.status === "inactive";
                  return (
                    <tr key={student.id} className={isInactive ? "st-row-inactive" : ""}>
                      <td className="st-col-checkbox">
                        <input
                          type="checkbox"
                          aria-label={`Select ${student.name}`}
                          checked={selectedIds.has(student.id)}
                          onChange={() => toggleSelectOne(student.id)}
                        />
                      </td>
                      <td className="st-col-num">{(page - 1) * limit + idx + 1}</td>
                      <td className="st-col-left">
                        <div className="st-student-cell">
                          {student.photo_url ? (
                            <img
                              className="st-student-photo"
                              src={student.photo_url}
                              alt={student.name}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="st-student-photo-fallback"
                            style={{ display: student.photo_url ? "none" : "flex" }}
                          >
                            {initials(student.name)}
                          </div>
                          <div className="st-student-text">
                            <span className="st-student-name">{student.name || "—"}</span>
                            <span className="st-student-roll">{student.roll_number || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{student.rrn || "—"}</td>
                      <td>{batchesIndex[student.batch_id] || "—"}</td>
                      <td>{classroomsIndex[student.classroom_id] || "—"}</td>
                      <td>
                        <div className="st-actions">
                          <button
                            type="button"
                            className="st-icon-btn"
                            title="View student"
                            aria-label={`View ${student.name}`}
                            onClick={() => goToView(student)}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            className="st-icon-btn"
                            title="Edit student"
                            aria-label={`Edit ${student.name}`}
                            onClick={() => goToEdit(student)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="st-icon-btn st-icon-btn-danger"
                            title="Delete student"
                            aria-label={`Delete ${student.name}`}
                            onClick={() => openDeleteConfirm(student)}
                          >
                            <TrashIcon />
                          </button>
                          {isInactive && <span className="st-inactive-tag">Inactive</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="st-pagination">
          <span className="st-pagination-summary">
            {total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
          </span>

          <div className="st-pagination-controls">
            <label className="st-per-page">
              Per page:
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
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
              className="st-page-nav"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="st-page-current">{page}</span>
            <button
              type="button"
              className="st-page-nav"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {bulkModal && (
        <BulkActionsModal
          action={bulkModal}
          count={selectedIds.size}
          classrooms={classroomsForModal}
          batches={batchesForModal}
          onClose={closeBulkModal}
          onConfirm={handleBulkConfirm}
          submitting={bulkSubmitting}
          error={bulkError}
        />
      )}

      {deleteTarget && (
        <div className="st-modal-overlay" role="presentation" onClick={deleteSubmitting ? undefined : closeDeleteConfirm}>
          <div
            className="st-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Delete student"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="st-modal-header">
              <h2>Delete Student</h2>
              <button
                type="button"
                className="st-modal-close"
                aria-label="Close"
                onClick={closeDeleteConfirm}
                disabled={deleteSubmitting}
              >
                ×
              </button>
            </div>
            <div className="st-modal-body">
              <p className="st-modal-confirm-text">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This can't be
                undone.
              </p>
              {deleteError && <div className="st-error-banner">{deleteError}</div>}
              <div className="st-modal-actions">
                <button
                  type="button"
                  className="st-btn st-btn-ghost"
                  onClick={closeDeleteConfirm}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="st-btn st-btn-danger-solid"
                  onClick={handleDeleteConfirm}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;