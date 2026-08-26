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
  // NOTE on classroom/batch filters: these now auto-load their full list on
  // page mount (a single `searchClassrooms("")` / `searchBatches("")` call
  // each — see the mount effect below). Each uses the shared
  // <SearchableDropdown> with `hideFetchButton`, so no manual Fetch/Refresh
  // button is shown; once the initial load resolves, further typing in the
  // dropdown auto-refreshes it (debounced) via `?q=` (e.g.
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
  import { useListPage, useModuleNav } from "../../../hooks/useListPageKit";
  import {
    getStudents,
    deleteStudent,
    bulkUpdateStudents,
    bulkUpdateStudentStatus,
  } from "../../../api/studentsApi";
  import { getClassrooms } from "../../../api/classroomsApi";
  import { getBatches } from "../../../api/batchesApi";
  import { useToast } from "../../../context/ToastContext";
  import { crudMessage } from "../../../utils/toastMessages";
  import BulkActionsModal from "./components/BulkActionsModal";
  import BulkAddModal from "./components/BulkAddModal";
  import PasswordModal from "../../superadmin/users/components/PasswordModal";
  import { updateUserPassword } from "../../../api/usersApi";
  import SearchableDropdown from "../../../components/common/SearchableDropdown";
  import { getCourseLabel } from "../../../utils/constants";
  import {
    AvatarCell,
    SelectAllCheckbox,
    SelectableRowCell,
    ActionButtonsCell,
    ListPageHeader,
    Pagination,
  } from "../../../components/common/ListPageControls";
  import { PhotoPreviewModal, BulkStatusConfirmModal, DeleteConfirmModal } from "../../../components/common/ListPageModals";
  import { STATUS_FILTER_OPTIONS } from "../../../utils/constants";
import { PAGE_SIZE_OPTIONS } from "../../../utils/constants";
import { FilterFunnelIcon } from "../../../components/common/Icons";
import usePageTitle from "../../../hooks/usePageTitle";
  import "../../../styles/UserList.css";

  const Students = () => {
    usePageTitle("Students");
    const { goToCreate, goToView, goToEdit } = useModuleNav("students");
    const toast = useToast();

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

    // ---- mobile filter panel (hidden by default, toggled via funnel icon) ----
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // ---- selection + bulk actions ----
    const [bulkModal, setBulkModal] = useState(null); // 'update' | 'activate' | 'deactivate'
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);

    // ---- row delete confirm ----
    const [deleteTarget, setDeleteTarget] = useState(null); // student
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // ---- password change ----
    const [passwordModal, setPasswordModal] = useState(null); // student
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    // ---- profile picture preview ----
    const [previewStudent, setPreviewStudent] = useState(null);

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
        setClassroomOptions(
          list.map((c) => ({ id: c.id, label: c.name, meta: getCourseLabel(c.course) }))
        );
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

    // ---- auto-load classroom + batch lists once, on page mount, so the
    // filters are ready without needing a manual "Fetch" click. ----
    useEffect(() => {
      searchClassrooms("");
      searchBatches("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const fetchFn = useCallback(
      (params) =>
        getStudents({
          q: params.q,
          page: params.page,
          limit: params.limit,
          classroomId: params.classroomId,
          batchId: params.batchId,
          status: params.status,
        }),
      []
    );

    const list = useListPage({
      fetchFn,
      initialFilters: { classroomId: "all", batchId: "all", status: "all" },
    });

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
        list.refetch();
      } catch (err) {
        setDeleteError(err?.response?.data?.message || "Couldn't delete this student.");
      } finally {
        setDeleteSubmitting(false);
      }
    };

    // ---- password change ----
    const openPasswordModal = (student) => {
      setPasswordError("");
      setPasswordModal(student);
    };
    const closePasswordModal = () => {
      if (passwordSubmitting) return;
      setPasswordModal(null);
    };
    const handlePasswordSubmit = async (password) => {
      setPasswordSubmitting(true);
      setPasswordError("");
      try {
        await updateUserPassword(passwordModal.id, password);
        toast.success(crudMessage("update", "Password", "success"));
        setPasswordModal(null);
      } catch (err) {
        const fallback = crudMessage("update", "Password", "error");
        setPasswordError(err?.response?.data?.message || "Couldn't update password.");
        toast.error(err?.response?.data?.message || fallback);
      } finally {
        setPasswordSubmitting(false);
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
        const ids = Array.from(list.selectedIds);
        const res =
          bulkModal === "update"
            ? await bulkUpdateStudents(ids, changes)
            : await bulkUpdateStudentStatus(ids, changes.status);
        // NOTE: adjust `res?.message` if the backend nests it differently
        // (e.g. res?.data?.message).
        toast.success(res?.message || "Students updated successfully.");
        setBulkModal(null);
        list.setSelectedIds(new Set());
        list.refetch();
      } catch (err) {
        const message = err?.response?.data?.message || "Couldn't complete this action.";
        setBulkError(message);
        toast.error(message);
      } finally {
        setBulkSubmitting(false);
      }
    };

    

    return (
      <div className="st-page">
        <ListPageHeader
          title="Students"
          total={list.total}
          refreshing={list.refreshing}
          onRefresh={list.handleRefresh}
          onCreate={goToCreate}
          extra={
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
                      setShowBulkAddModal(true);
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
          }
        />

        <div className="st-card">
          <div className="st-toolbar">
            <div className="st-search-row">
              <div className="st-search">
                <span className="st-search-icon" aria-hidden="true">
                  🔍
                </span>
                <input
                  type="text"
                  value={list.search}
                  onChange={(e) => list.setSearch(e.target.value)}
                  placeholder="Search by Name, Roll Number or RRN"
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
                  value={list.filters.classroomId}
                  onChange={(v) => list.setFilter("classroomId", v)}
                  searchable
                  onFetch={searchClassrooms}
                  loaded={classroomsLoaded}
                  loading={classroomsLoading}
                  hideFetchButton
                  selectedLabel={classroomsIndex[list.filters.classroomId]}
                  placeholder="Search classrooms…"
                />

                <SearchableDropdown
                  label="Batch"
                  allLabel="All Batches"
                  options={batchOptions}
                  value={list.filters.batchId}
                  onChange={(v) => list.setFilter("batchId", v)}
                  searchable
                  onFetch={searchBatches}
                  loaded={batchesLoaded}
                  loading={batchesLoading}
                  hideFetchButton
                  selectedLabel={batchesIndex[list.filters.batchId]}
                  placeholder="Search batches…"
                />
              </div>

              <SearchableDropdown
                label="Status"
                allLabel={statusAllOption?.label || "All Status"}
                options={statusOptions}
                value={list.filters.status}
                onChange={(v) => list.setFilter("status", v)}
              />

              <span className="st-result-count">{list.total} students</span>
            </div>
          </div>

          {list.selectedIds.size > 0 && (
            <div className="st-bulk-bar">
              <span className="st-bulk-count">{list.selectedIds.size} selected</span>
              <div className="st-bulk-actions">
                <button
                  type="button"
                  className="st-btn st-btn-ghost st-btn-update"
                  onClick={() => openBulkModal("update")}
                >
                  Bulk Update
                </button>
                <div className="st-bulk-actions-pair">
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
            </div>
          )}

          {list.error && <div className="st-error-banner">{list.error}</div>}

          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th className="st-col-num">
                    <SelectAllCheckbox
                      checked={list.allOnPageSelected}
                      indeterminate={list.someOnPageSelected}
                      onChange={list.toggleSelectAll}
                      label="Select all students on this page"
                    />
                  </th>
                  <th className="st-col-left">Student</th>
                  <th>RRN</th>
                  <th>Batch</th>
                  <th>Classroom</th>
                  <th className="st-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.loading ? (
                  <tr>
                    <td colSpan={6} className="st-state-cell">
                      Loading students…
                    </td>
                  </tr>
                ) : list.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="st-state-cell">
                      No students match your search or filters.
                    </td>
                  </tr>
                ) : (
                  list.items.map((student, idx) => {
                    const isInactive = student.status === "inactive";
                    return (
                      <tr key={student.id} className={isInactive ? "st-row-inactive" : ""}>
                        <SelectableRowCell
                          id={student.id}
                          index={(list.page - 1) * list.limit + idx + 1}
                          selected={list.selectedIds.has(student.id)}
                          onToggle={list.toggleSelectOne}
                          name={student.name}
                        />
                        <td className="st-col-left">
                          <div className="st-student-cell">
                            <AvatarCell name={student.name} photoUrl={student.photo_url} onPreview={() => setPreviewStudent(student)} />
                            <div className="st-student-text">
                              <span className="st-student-name">{student.name || "—"}</span>
                              <span className="st-student-roll">{student.roll_number || "—"}</span>
                            </div>
                            {isInactive && <span className="st-inactive-tag">Inactive</span>}
                          </div>
                        </td>
                        <td>{student.rrn || "—"}</td>
                        <td>{batchesIndex[student.batch_id] || "—"}</td>
                        <td>{classroomsIndex[student.classroom_id] || "—"}</td>
                        <td>
                          <ActionButtonsCell
                            name={student.name}
                            onView={() => goToView(student)}
                            onEdit={() => goToEdit(student)}
                            onPassword={() => openPasswordModal(student)}
                            onDelete={() => openDeleteConfirm(student)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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

        {bulkModal && (
          <BulkActionsModal
            action={bulkModal}
            count={list.selectedIds.size}
            classroomOptions={classroomOptions}
            classroomsIndex={classroomsIndex}
            classroomsLoading={classroomsLoading}
            classroomsLoaded={classroomsLoaded}
            onFetchClassrooms={searchClassrooms}
            batchOptions={batchOptions}
            batchesIndex={batchesIndex}
            batchesLoading={batchesLoading}
            batchesLoaded={batchesLoaded}
            onFetchBatches={searchBatches}
            onClose={closeBulkModal}
            onConfirm={handleBulkConfirm}
            submitting={bulkSubmitting}
            error={bulkError}
          />
        )}

        {showBulkAddModal && (
          <BulkAddModal onClose={() => setShowBulkAddModal(false)} onCreated={list.refetch} />
        )}

        {deleteTarget && (
          <DeleteConfirmModal
            variant="st"
            title="Delete Student"
            itemName={deleteTarget.name}
            itemLabel="student"
            onClose={closeDeleteConfirm}
            onConfirm={handleDeleteConfirm}
            submitting={deleteSubmitting}
            error={deleteError}
          />
        )}

        {passwordModal && (
          <PasswordModal
            user={passwordModal}
            onClose={closePasswordModal}
            onSubmit={handlePasswordSubmit}
            submitting={passwordSubmitting}
            serverError={passwordError}
            serverFieldErrors={{}}
          />
        )}

        {previewStudent && (
          <PhotoPreviewModal item={previewStudent} onClose={() => setPreviewStudent(null)} subtitle={previewStudent.roll_number} />
        )}
      </div>
    );
  };

  export default Students;