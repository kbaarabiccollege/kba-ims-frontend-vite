// src/pages/superadmin/additional-class/AdditionalClass.jsx
//
// Additional Class list page. Mirrors Users.jsx: same layout, st-* styles,
// pagination and debounced search. Create / Edit / View / Delete modals live in ./components.
//
// NOTE on display values: the list response only contains ids
// (academic_term_id, classroom_id, ...). The table shows names if the backend
// sends them (course_name, academic_term_name, classroom_name, subject_name,
// staff_name — or nested objects like row.classroom.name). Otherwise it falls
// back to looking the id up in the filter-dropdown options, and finally "—".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAdditionalClasses,
  createAdditionalClass,
  updateAdditionalClass,
  deleteAdditionalClass,
  getAdditionalClassFilterOptions,
} from "../../../api/additionalClassApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import { PAGE_SIZE_OPTIONS } from "../../../utils/constants";
import { ListPageHeader, Pagination } from "../../../components/common/ListPageControls";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import usePageTitle from "../../../hooks/usePageTitle";
import AdditionalClassFormModal from "./components/AdditionalClassFormModal";
import AdditionalClassViewModal from "./components/AdditionalClassViewModal";
import AdditionalClassDeleteModal from "./components/AdditionalClassDeleteModal";
import { CLASS_TYPE_OPTIONS, fmtDate, fmtTime, fmtShortDate, labelFor, typeLabel } from "./helpers";
import "../../../styles/Users.css";
import "../../../styles/UserList.css";
import "../../../styles/AdditionalClass.css";

// ---------- filter dropdown (client-side search over a static list) ----------

const FilterDropdown = ({ label, allLabel, options, value, onChange }) => {
  const [visible, setVisible] = useState(options);
  useEffect(() => setVisible(options), [options]);

  const handleSearch = (q) => {
    const query = q.trim().toLowerCase();
    setVisible(query ? options.filter((o) => o.label.toLowerCase().includes(query)) : options);
  };

  return (
    <SearchableDropdown
      label={label}
      allLabel={allLabel}
      options={visible}
      value={value}
      onChange={onChange}
      searchable
      onFetch={handleSearch}
      loaded
      hideFetchButton
      placeholder={`Search ${label.toLowerCase()}…`}
    />
  );
};

// ---------- single-field date range ----------

const DateRangeFilter = ({ from, to, onChange }) => {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, from, to]);

  const text =
    from && to ? `${fmtShortDate(from)} – ${fmtShortDate(to)}`
    : from ? `From ${fmtShortDate(from)}`
    : to ? `Until ${fmtShortDate(to)}`
    : "Date range";

  const apply = () => {
    // keep from <= to
    const [f, t] = draftFrom && draftTo && draftFrom > draftTo ? [draftTo, draftFrom] : [draftFrom, draftTo];
    onChange({ from: f, to: t });
    setOpen(false);
  };
  const clear = () => {
    onChange({ from: "", to: "" });
    setOpen(false);
  };

  return (
    <div className="ac-daterange" ref={ref}>
      <button
        type="button"
        className={`ac-daterange-trigger ${from || to ? "ac-daterange-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{text}</span>
      </button>

      {open && (
        <div className="ac-daterange-pop" role="dialog" aria-label="Select date range">
          <label>
            From
            <input type="date" value={draftFrom} max={draftTo || undefined} onChange={(e) => setDraftFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={draftTo} min={draftFrom || undefined} onChange={(e) => setDraftTo(e.target.value)} />
          </label>
          <div className="ac-daterange-actions">
            <button type="button" className="st-btn st-btn-ghost" onClick={clear}>Clear</button>
            <button type="button" className="st-btn st-btn-primary" onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- icons ----------

const svgProps = {
  width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": true,
};
const EyeIcon = () => (
  <svg {...svgProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EditIcon = () => (
  <svg {...svgProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
);
const TrashIcon = () => (
  <svg {...svgProps}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
);
const FilterIcon = () => (
  <svg {...svgProps}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" /></svg>
);

// ---------- page ----------

const AdditionalClass = () => {
  const toast = useToast();

  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [courseId, setCourseId] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [termId, setTermId] = useState("all");
  const [classroomId, setClassroomId] = useState("all");
  const [subjectId, setSubjectId] = useState("all");
  const [staffId, setStaffId] = useState("all");
  const [classType, setClassType] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile funnel toggle

  // filter options
  const [opts, setOpts] = useState({ courses: [], academicTerms: [], classrooms: [], subjects: [], staff: [] });
  useEffect(() => {
    let alive = true;
    getAdditionalClassFilterOptions().then((o) => alive && setOpts(o));
    return () => { alive = false; };
  }, []);

  // popups
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', row? }
  const [viewRow, setViewRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState({});
  const [deleteError, setDeleteError] = useState("");

  usePageTitle(
    formModal ? (formModal.mode === "edit" ? ["Edit", "Additional Class"] : ["Add New", "Additional Class"])
      : viewRow ? ["View", "Additional Class"]
      : "Additional Class"
  );

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdditionalClasses({
        q: debouncedSearch,
        page,
        limit,
        courseId,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        academicTermId: termId,
        classroomId,
        subjectId,
        staffId,
        classType,
      });
      const list = res?.data ?? [];
      setRows(list);
      setTotal(res?.pagination?.total ?? res?.total ?? list.length);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load additional classes. Please try again in a moment.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, courseId, dateRange, termId, classroomId, subjectId, staffId, classType]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, courseId, dateRange, termId, classroomId, subjectId, staffId, classType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRows();
    setRefreshing(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  // cell display resolvers
  const cell = useMemo(() => ({
    course: (r) => r.course_name ?? r.course?.name ?? labelFor(opts.courses, r.course_id) ?? "—",
    term: (r) => r.academic_term_name ?? r.academic_term?.name ?? labelFor(opts.academicTerms, r.academic_term_id) ?? "—",
    classroom: (r) => r.classroom_name ?? r.classroom?.name ?? labelFor(opts.classrooms, r.classroom_id) ?? "—",
    subject: (r) => r.subject_name ?? r.subject?.name ?? labelFor(opts.subjects, r.subject_id) ?? "—",
    staff: (r) => r.staff_name ?? r.staff?.name ?? labelFor(opts.staff, r.staff_id) ?? "—",
  }), [opts]);

  // ---- create / edit ----
  const openCreateModal = () => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "create" });
  };
  const openEditModal = (row) => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "edit", row });
  };
  const closeFormModal = () => {
    if (submitting) return;
    setFormModal(null);
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setModalError("");
    setModalFieldErrors({});
    const isEdit = formModal.mode === "edit";
    try {
      if (isEdit) {
        await updateAdditionalClass(formModal.row.id, payload);
        toast.success(crudMessage("update", "Additional Class", "success"));
      } else {
        await createAdditionalClass(payload);
        toast.success(crudMessage("create", "Additional Class", "success"));
      }
      setFormModal(null);
      fetchRows();
    } catch (err) {
      const data = err?.response?.data;
      const fallback = crudMessage(isEdit ? "update" : "create", "Additional Class", "error");
      setModalError(data?.message || fallback);
      setModalFieldErrors(data?.errors || {});
      toast.error(data?.message || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- delete ----
  const openDeleteModal = (row) => {
    setDeleteError("");
    setDeleteTarget(row);
  };
  const closeDeleteModal = () => {
    if (submitting) return;
    setDeleteTarget(null);
  };
  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    setDeleteError("");
    try {
      await deleteAdditionalClass(deleteTarget.id);
      toast.success(crudMessage("delete", "Additional Class", "success"));
      setDeleteTarget(null);
      // step back a page if we just removed the last row of a later page
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else fetchRows();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || crudMessage("delete", "Additional Class", "error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="st-page um-page ac-page">
      <ListPageHeader
        title="Additional Class"
        total={total}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onCreate={openCreateModal}
      />

      <div className="st-card">
        <div className="st-toolbar">
          <div className="st-search-row">
            <div className="st-search">
              <span className="st-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search additional classes…"
                aria-label="Search additional classes"
              />
            </div>
            <span className="st-result-count ac-result-count">{total} classes</span>
            <button
              type="button"
              className={`st-icon-btn st-filter-toggle-btn ${filtersOpen ? "st-filter-toggle-btn-active" : ""}`}
              onClick={() => setFiltersOpen((o) => !o)}
              aria-label="Toggle filters"
              aria-expanded={filtersOpen}
            >
              <FilterIcon />
            </button>
          </div>

          <div className={`st-filters ${filtersOpen ? "st-filters-open" : ""}`}>
            <FilterDropdown label="Course" allLabel="All Courses" options={opts.courses} value={courseId} onChange={setCourseId} />
            <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
            <FilterDropdown label="Academic Term" allLabel="All Terms" options={opts.academicTerms} value={termId} onChange={setTermId} />
            <FilterDropdown label="Classroom" allLabel="All Classrooms" options={opts.classrooms} value={classroomId} onChange={setClassroomId} />
            <FilterDropdown label="Subject" allLabel="All Subjects" options={opts.subjects} value={subjectId} onChange={setSubjectId} />
            <FilterDropdown label="Staff" allLabel="All Staff" options={opts.staff} value={staffId} onChange={setStaffId} />
            <SearchableDropdown
              label="Class Type"
              allLabel="All Types"
              options={CLASS_TYPE_OPTIONS}
              value={classType}
              onChange={setClassType}
            />
          </div>
        </div>

        {error && <div className="st-error-banner">{error}</div>}

        <div className="st-table-wrap">
          <table className="st-table ac-table">
            <thead>
              <tr>
                <th className="st-col-num">#</th>
                <th>Course</th>
                <th>Date</th>
                <th>Academic Term</th>
                <th>Classroom</th>
                <th>Subject</th>
                <th>Staff</th>
                <th>Class Type</th>
                <th className="st-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="st-state-cell">Loading additional classes…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="st-state-cell">No additional classes match your search or filters.</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="st-col-num" style={{ cursor: "default" }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td>{cell.course(row)}</td>
                    <td>
                      <div className="ac-date">
                        <span>{fmtDate(row.class_date)}</span>
                        {row.start_time && (
                          <small>{fmtTime(row.start_time)} – {fmtTime(row.end_time)}</small>
                        )}
                      </div>
                    </td>
                    <td>{cell.term(row)}</td>
                    <td>{cell.classroom(row)}</td>
                    <td>{cell.subject(row)}</td>
                    <td>{cell.staff(row)}</td>
                    <td>
                      <span className={`ac-type-badge ac-type-${row.class_type}`}>{typeLabel(row.class_type)}</span>
                    </td>
                    <td>
                      <div className="st-actions">
                        <button type="button" className="st-icon-btn" title="View" aria-label="View" onClick={() => setViewRow(row)}>
                          <EyeIcon />
                        </button>
                        <button type="button" className="st-icon-btn" title="Edit" aria-label="Edit" onClick={() => openEditModal(row)}>
                          <EditIcon />
                        </button>
                        <button type="button" className="st-icon-btn st-icon-btn-danger" title="Delete" aria-label="Delete" onClick={() => openDeleteModal(row)}>
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

        <Pagination
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          total={total}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </div>

      {formModal && (
        <AdditionalClassFormModal
          mode={formModal.mode}
          initialData={formModal.row}
          options={opts}
          onClose={closeFormModal}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          serverError={modalError}
          serverFieldErrors={modalFieldErrors}
        />
      )}

      {viewRow && <AdditionalClassViewModal row={viewRow} cell={cell} onClose={() => setViewRow(null)} />}

      {deleteTarget && (
        <AdditionalClassDeleteModal
          row={deleteTarget}
          subject={cell.subject(deleteTarget)}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          submitting={submitting}
          error={deleteError}
        />
      )}
    </div>
  );
};

export default AdditionalClass;