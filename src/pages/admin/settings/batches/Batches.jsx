// src/pages/admin/settings/batches/Batches.jsx
//
// Batches list page (Settings > Academics > Batches).
// Talks to GET/POST/PUT /api/batches via src/api/batchesApi.js.
//
// NOTE: no status anywhere — it's not a backend field for batches.

import { useCallback, useEffect, useState } from "react";
import { getBatches, createBatch, updateBatch } from "../../../../api/batchesApi";
import useDebouncedValue from "../../../../hooks/useDebouncedValue";
import { COURSE_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from "./constants";
import { CourseBadge } from "./components/BatchBadges";
import BatchFormModal from "./components/BatchFormModal";
import DeleteConfirmModal from "../../../../components/common/DeleteConfirmModal";
import { EditIcon, TrashIcon } from "../../../../components/common/Icons";
import "../../../../styles/Batches.css";

const Batches = () => {
  // ---- list state ----
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- filters ----
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  // ---- popups ----
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', batch? }
  const [deleteModal, setDeleteModal] = useState(null); // batch
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState({});

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getBatches({ q: debouncedSearch, page, limit, course });
      setBatches(res?.data ?? res?.batches ?? []);
      setTotal(res?.total ?? res?.count ?? (res?.data ?? res?.batches ?? []).length);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't load batches. Please try again in a moment."
      );
      setBatches([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, course]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Reset to page 1 whenever a filter changes (not on page/limit changes themselves)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, course]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

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
      fetchBatches();
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
          <p className="bm-title-meta">{total} total</p>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by batch name…"
              aria-label="Search batches"
            />
          </div>

          <div className="bm-filters">
            <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
              {COURSE_FILTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <span className="bm-result-count">{total} batches</span>
          </div>
        </div>

        {error && <div className="bm-error-banner">{error}</div>}

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
              {loading ? (
                <tr>
                  <td colSpan={5} className="bm-state-cell">
                    Loading batches…
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="bm-state-cell">
                    No batches match your search or filters.
                  </td>
                </tr>
              ) : (
                batches.map((batch, idx) => (
                  <tr key={batch.id}>
                    <td className="bm-col-num">{(page - 1) * limit + idx + 1}</td>
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
            {total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
          </span>

          <div className="bm-pagination-controls">
            <label className="bm-per-page">
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
              className="bm-page-nav"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="bm-page-current">{page}</span>
            <button
              type="button"
              className="bm-page-nav"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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