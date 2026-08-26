// src/pages/admin/settings/batches/Batches.jsx
//
// Batches list page (Settings > Academics > Batches).
// Talks to GET/POST/PUT /api/batches via src/api/batchesApi.js.
//
// NOTE: no status anywhere — it's not a backend field for batches.

import { useCallback, useState } from "react";
import { getBatches, createBatch, updateBatch } from "../../../../api/batchesApi";
import { useListPage } from "../../../../hooks/useListPageKit";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";
import { COURSES } from "../../../../utils/constants";
import BatchFormModal from "./components/BatchFormModal";
import { DeleteConfirmModal } from "../../../../components/common/ListPageModals";
import { EditIcon, TrashIcon } from "../../../../components/common/Icons";
import { PAGE_SIZE_OPTIONS } from "../../../../utils/constants";
import usePageTitle from "../../../../hooks/usePageTitle";
import "../../../../styles/Batches.css";

export const CourseBadge = ({ course }) => {
  const label = COURSES[course] ?? "—";
  return <span className="bm-badge bm-course-badge">{label}</span>;
};

const COURSE_FILTER_OPTIONS = [
  { value: "all", label: "All Courses" },
  ...Object.entries(COURSES).map(([id, label]) => ({
    value: Number(id),
    label,
  })),
];

const Batches = () => {
  // ---- popups ----
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', batch? }
  usePageTitle( formModal ? formModal.mode === "edit" ? ["Edit", "Batche"] 
    : ["Add New", "Batche"] : "Batches");
  const [deleteModal, setDeleteModal] = useState(null); // batch
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState({});

  // ---- list state (search, course filter, pagination, fetch lifecycle) ----
  const fetchFn = useCallback(
    (params) =>
      getBatches({
        q: params.q,
        page: params.page,
        limit: params.limit,
        course: params.course,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    initialLimit: 10,
    initialFilters: { course: "all" },
  });

  // ---- create / edit ----
  const openCreateModal = () => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "create" });
  };

  const openEditModal = (batch) => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "edit", batch });
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
        await updateBatch(formModal.batch.id, payload);
      } else {
        await createBatch(payload);
      }
      setFormModal(null);
      list.refetch();
    } catch (err) {
      const data = err?.response?.data;
      setModalError(
        data?.message || (formModal.mode === "edit" ? "Couldn't save changes." : "Couldn't create batch.")
      );
      setModalFieldErrors(data?.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  // ---- delete (dummy — no endpoint wired) ----
  const openDeleteModal = (batch) => setDeleteModal(batch);
  const closeDeleteModal = () => setDeleteModal(null);
  const handleDeleteConfirm = () => {
    // Intentionally not calling an API — wire up DELETE /api/batches/:id here.
    setDeleteModal(null);
  };

  return (
    <div className="bm-page">
      <div className="bm-page-header">
        <div className="bm-title-block">
          <h1>
            <span className="bm-title-icon" aria-hidden="true">
              🎓
            </span>
            Batches
          </h1>
          <p className="bm-title-meta">{list.total} total</p>
        </div>
        <button type="button" className="bm-btn bm-btn-primary bm-btn-add" onClick={openCreateModal}>
          <span aria-hidden="true">+</span>
          <span className="bm-btn-add-label-full">Add New Batch</span>
          <span className="bm-btn-add-label-short">Add</span>
        </button>
      </div>

      <div className="bm-card">
        <div className="bm-toolbar">
          <div className="bm-search">
            <span className="bm-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search by batch name…"
              aria-label="Search batches"
            />
          </div>

          <div className="bm-filters">
            <div className="bm-filter-dropdown">
              <SearchableDropdown
                id="bm-course-filter"
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

            <span className="bm-result-count">{list.total} batches</span>
          </div>
        </div>

        {list.error && <div className="bm-error-banner">{list.error}</div>}

        <div className="bm-table-wrap">
          <table className="bm-table">
            <thead>
              <tr>
                <th className="bm-col-num">#</th>
                <th className="bm-col-left">Batch Name</th>
                <th>Years</th>
                <th>Course</th>
                <th className="bm-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading ? (
                <tr>
                  <td colSpan={5} className="bm-state-cell">
                    Loading batches…
                  </td>
                </tr>
              ) : list.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="bm-state-cell">
                    No batches match your search or filters.
                  </td>
                </tr>
              ) : (
                list.items.map((batch, idx) => (
                  <tr key={batch.id}>
                    <td className="bm-col-num">{(list.page - 1) * list.limit + idx + 1}</td>
                    <td className="bm-batch-name">{batch.batch_name || "—"}</td>
                    <td>
                      {batch.start_year && batch.end_year
                        ? `${batch.start_year} - ${batch.end_year}`
                        : "—"}
                    </td>
                    <td>
                      <CourseBadge course={batch.course} />
                    </td>
                    <td>
                      <div className="bm-actions">
                        <button
                          type="button"
                          className="bm-icon-btn"
                          title="Edit batch"
                          aria-label={`Edit ${batch.batch_name}`}
                          onClick={() => openEditModal(batch)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="bm-icon-btn bm-icon-btn-danger"
                          title="Delete batch"
                          aria-label={`Delete ${batch.batch_name}`}
                          onClick={() => openDeleteModal(batch)}
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

        <div className="bm-pagination">
          <span className="bm-pagination-summary">
            {list.total === 0
              ? "No results"
              : `Showing ${list.rangeStart}-${list.rangeEnd} of ${list.total}`}
          </span>

          <div className="bm-pagination-controls">
            <label className="bm-per-page">
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
              className="bm-page-nav"
              disabled={list.page <= 1}
              onClick={() => list.setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="bm-page-current">{list.page}</span>
            <button
              type="button"
              className="bm-page-nav"
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
        <BatchFormModal
          mode={formModal.mode}
          initialData={formModal.batch}
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

export default Batches;