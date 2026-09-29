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
  import { getCourses } from "../../../api/coursesApi";
  import { getClassrooms } from "../../../api/classroomsApi";
  import { getBatches } from "../../../api/batchesApi";
  import { useToast } from "../../../context/ToastContext";
  import { crudMessage } from "../../../utils/toastMessages";
  import BulkActionsModal from "./components/BulkActionsModal";
import BulkAddModal from "./components/BulkAddModal";
import PromoteClassModal from "./components/PromoteClassModal";
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
    const [courseOptions, setCourseOptions] = useState([]);
    const [coursesIndex, setCoursesIndex] = useState({});
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [coursesLoaded, setCoursesLoaded] = useState(false);

    // Mirrors the currently-selected Course filter, read (not reacted to
    // via deps) inside searchClassrooms below, so classrooms are always
    // fetched scoped to whichever course is picked, without having to
    // change searchClassrooms's signature (SearchableDropdown calls it
    // with just `q`).
    const courseFilterRef = useRef("all");

    // Guards against out-of-order responses: selecting a course fires a
    // fetch from the course-change effect, and opening the dropdown
    // fires another fetch on its own (SearchableDropdown re-fetches on
    // open). If those two overlap, only the response matching the most
    // recently *started* request is allowed to update state — otherwise
    // a slower, stale response finishing last can leave classroomsLoading
    // stuck true (or clobber freshly-loaded options) even though a newer
    // request already succeeded.
    const classroomsRequestIdRef = useRef(0);

    // Same idea for courses: only apply the "select the default course"
    // behavior once, from the very first successful load — not every
    // time the dropdown re-fetches on open/search, or it would keep
    // stomping on the user's own selection. defaultCourseIdRef holds the
    // id searchCourses finds until the effect below (defined further
    // down, after `list` exists) is ready to apply it via list.setFilter.
    const defaultCourseAppliedRef = useRef(false);
    const defaultCourseIdRef = useRef(null);

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
    const [showPromoteModal, setShowPromoteModal] = useState(false);

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

    // ---- course search (called by SearchableDropdown on open + on type) ----
    const searchCourses = useCallback(async (q) => {
      setCoursesLoading(true);
      try {
        const res = await getCourses({ is_active: 1, q });
        const list = res?.data ?? [];
        setCourseOptions(list.map((c) => ({ id: c.id, label: c.name })));
        setCoursesIndex((prev) => {
          const next = { ...prev };
          list.forEach((c) => {
            next[c.id] = c.name;
          });
          return next;
        });
        setCoursesLoaded(true);

        // Record the default course, once only, from the very first
        // successful load — later refetches (dropdown opened again, a
        // search typed) must not override whatever the user has since
        // picked. This only stashes the id; the effect below (after
        // `list` exists) is what actually applies it.
        if (!defaultCourseAppliedRef.current) {
          const defaultCourse = list.find((c) => c.is_default === 1 || c.is_default === true);
          if (defaultCourse) {
            defaultCourseIdRef.current = String(defaultCourse.id);
          }
        }
      } catch {
        setCourseOptions([]);
      } finally {
        setCoursesLoading(false);
      }
    }, []);

    // ---- classroom search (called by SearchableDropdown on open + on
    // type). Scoped to the selected Course filter (via courseFilterRef)
    // and always restricted to active classrooms.
    //
    // Guarded by classroomsRequestIdRef: if this call's response comes
    // back after a newer call has already started, it's discarded
    // instead of overwriting state or leaving classroomsLoading stuck. ----
    const searchClassrooms = useCallback(async (q) => {
      const requestId = ++classroomsRequestIdRef.current;
      setClassroomsLoading(true);
      try {
        const activeCourse = courseFilterRef.current;
        const res = await getClassrooms({
          isActive: 1,
          q,
          ...(activeCourse && activeCourse !== "all" ? { course: activeCourse } : {}),
        });
        if (requestId !== classroomsRequestIdRef.current) return; // stale — a newer request has since started
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
        if (requestId === classroomsRequestIdRef.current) setClassroomOptions([]);
      } finally {
        if (requestId === classroomsRequestIdRef.current) setClassroomsLoading(false);
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

    // ---- auto-load course + batch lists once, on page mount, so the
    // filters are ready without needing a manual "Fetch" click.
    // Classrooms are NOT loaded here — they're loaded by the
    // Course-filter-driven effect below (which also fires once on
    // mount, scoped to "all"). ----
    useEffect(() => {
      searchCourses("");
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
          courseId: params.courseId,
          classroomId: params.classroomId,
          batchId: params.batchId,
          status: params.status,
        }),
      []
    );

    const list = useListPage({
      fetchFn,
      initialFilters: { courseId: "all", classroomId: "all", batchId: "all", status: "all" },
    });

    // ---- apply the default course, exactly once, as soon as it's known ----
    // A no-op until searchCourses (above) has found a default and
    // stashed its id in defaultCourseIdRef; fires the render after that
    // happens (coursesLoaded flips true), then never again.
    useEffect(() => {
      if (defaultCourseAppliedRef.current) return;
      if (defaultCourseIdRef.current == null) return;
      defaultCourseAppliedRef.current = true;
      list.setFilter("courseId", defaultCourseIdRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coursesLoaded]);

    // ---- reload classroom options (and reset the Classroom filter)
    // whenever the Course filter changes, so only that course's active
    // classrooms are offered. Also runs once on mount (courseId starts
    // as "all"), which performs the initial unscoped classroom load —
    // then runs again once the default-course effect above sets a real
    // course id, re-scoping classrooms to it. ----
    useEffect(() => {
      courseFilterRef.current = list.filters.courseId;
      searchClassrooms("");
      list.setFilter("classroomId", "all");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list.filters.courseId]);

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
                  label="Course"
                  allLabel="All Courses"
                  options={courseOptions}
                  value={list.filters.courseId}
                  onChange={(v) => list.setFilter("courseId", v)}
                  searchable
                  onFetch={searchCourses}
                  loaded={coursesLoaded}
                  loading={coursesLoading}
                  hideFetchButton
                  selectedLabel={coursesIndex[list.filters.courseId]}
                  placeholder="Search courses…"
                />

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
                <button
                  type="button"
                  className="st-btn st-btn-ghost st-btn-promote"
                  onClick={() => setShowPromoteModal(true)}
                >
                  Promote Class
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
                        <td>
                          {student.classroom ? (
                            <span
                              className={
                                student.classroom.is_active === 0
                                  ? "st-classroom-tag st-classroom-tag-inactive"
                                  : "st-classroom-tag"
                              }
                              title={student.classroom.is_active === 0 ? "Inactive classroom" : undefined}
                            >
                              {student.classroom.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
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

        {showPromoteModal && (
          <PromoteClassModal
            studentIds={Array.from(list.selectedIds)}
            onClose={() => setShowPromoteModal(false)}
            onPromoted={() => {
              setShowPromoteModal(false);
              list.setSelectedIds(new Set());
              list.refetch();
            }}
          />
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