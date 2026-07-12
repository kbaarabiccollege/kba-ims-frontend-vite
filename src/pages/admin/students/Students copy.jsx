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
// NOTE on classroom/batch filters: these do NOT auto-load on page mount.
// Each is a custom dropdown (FilterDropdown.jsx) that shows a "Fetch"
// action; clicking it (from either dropdown) calls fetchFilterOptions(),
// which hits both the classrooms API and the batches API together and
// refreshes both dropdowns' option lists, per the spec.
//
// NOTE on bulk actions: "Bulk Update", "Mark as Active" and
// "Mark as Inactive" all call placeholder endpoints (bulk-update /
// bulk-status) — no bulk API was provided in the spec, so these are
// wired up and ready but should be pointed at the real endpoint once
// it exists (see studentsApi.jsx).
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
import FilterDropdown from "./components/FilterDropdown";
import { EditIcon, EyeIcon, TrashIcon } from "../../../components/common/Icons";
import "../../../styles/AdminStudents.css";

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const Students = () => {
  const navigate = useNavigate();

  // ---- list state ----
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // ---- classroom/batch lookups, fetched on demand (not on mount) ----
  const [classrooms, setClassrooms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  // ---- filters ----
  const [search, setSearch] = useState("");
  const [classroomId, setClassroomId] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const [status, setStatus] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 400);

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

  // ---- fetch classroom + batch options together, only on demand ----
  const fetchFilterOptions = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const [classroomsRes, batchesRes] = await Promise.all([
        getClassrooms({ isActive: 1 }),
        getBatches({ limit: 100 }),
      ]);
      setClassrooms(classroomsRes?.data ?? []);
      setBatches(batchesRes?.data ?? []);
      setFiltersLoaded(true);
    } catch {
      setClassrooms([]);
      setBatches([]);
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const classroomOptions = useMemo(
    () => classrooms.map((c) => ({ id: c.id, label: c.name })),
    [classrooms]
  );
  const batchOptions = useMemo(
    () => batches.map((b) => ({ id: b.id, label: b.batch_name })),
    [batches]
  );

  const classroomNameById = useMemo(() => {
    const map = {};
    classrooms.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [classrooms]);

  const batchNameById = useMemo(() => {
    const map = {};
    batches.forEach((b) => {
      map[b.id] = b.batch_name;
    });
    return map;
  }, [batches]);

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
  const goToCreate = () => navigate("/admin/students/new");
  const goToView = (student) => navigate(`/admin/students/${student.id}`);
  const goToEdit = (student) => navigate(`/admin/students/${student.id}/edit`);

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

          <div className="st-filters">
            <FilterDropdown
              label="Classroom"
              allLabel="All Classrooms"
              options={classroomOptions}
              value={classroomId}
              onChange={setClassroomId}
              loaded={filtersLoaded}
              loading={filtersLoading}
              onFetch={fetchFilterOptions}
            />

            <FilterDropdown
              label="Batch"
              allLabel="All Batches"
              options={batchOptions}
              value={batchId}
              onChange={setBatchId}
              loaded={filtersLoaded}
              loading={filtersLoading}
              onFetch={fetchFilterOptions}
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_FILTER_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

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
                      <td>{batchNameById[student.batch_id] || "—"}</td>
                      <td>{classroomNameById[student.classroom_id] || "—"}</td>
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
          classrooms={classrooms}
          batches={batches}
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