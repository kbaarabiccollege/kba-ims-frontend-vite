// src/pages/admin/academics/AdminClassrooms.jsx
//
// Classrooms list page — built on the shared useListPage hook, mirroring
// src/pages/admin/staff/Staff.jsx so it stays in sync with Staff/Students
// on search, pagination, and selection behavior.
//
// Uses academic.css (its own "ac-" prefixed classes) instead of
// Students.css/UserList.css for the page shell, toolbar, filters,
// selection bar, and card grid — see academic.css's header comment for
// why: those class names previously collided with Students.css and
// broke the Staff/Students/Users filter layout since CSS imports are
// global, not scoped per page. The handful of truly shared, identical
// primitives (.st-btn, .st-icon-btn, .st-modal-*) are intentionally
// left as "st-" and still come from academic.css.
//
// ASSUMPTIONS (adjust to match your actual backend / product needs):
// - Filters: term, semester, course are plain FK/enum params; `status`
//   ('all' | 'active' | 'inactive') maps to is_active=1/0 in
//   classroomApi.getClassrooms — see that file for the mapping.
// - Term values are lowercase 'odd' / 'even' (matching TERM_LABELS
//   keys) — defaulting the filter to 'odd' assumes that casing.
// - Bulk action mirrors Staff exactly: "Mark as Active" / "Mark as
//   Inactive" only, no multi-field "Bulk Update" modal.
// - COURSE_OPTIONS in classroomConstants.js is a static placeholder —
//   swap for a live searchable dropdown once a /courses endpoint
//   exists (see the TODO near courseOptions below).
// - advisor_id / leader_id are shown as raw ids ("—" when null) since
//   no staff-lookup endpoint was provided for resolving them to names.
//   If advisor/leader has no photo_url, EntityCard shows initials
//   instead of a broken <img>.
// - Batch: assumes each classroom has a `batch_id` field and that
//   batchesApi's batch objects expose `id` and `batch_name`. Since
//   batchesApi only exposes a list endpoint (no get-by-id), we fetch
//   the full batch list once and look classrooms up against it —
//   swap for a dedicated getBatch(id) call if one gets added later.
// - Pagination removed per product decision (classroom counts are
//   small); useListPage still tracks page/limit internally but the
//   Pagination control is simply not rendered. Re-add
//   <Pagination .../> (see the commented-out import) if that changes.
// - ActionButtonsCell is no longer used on the card — only an Edit
//   icon is shown (see EntityCard in ListPageControls.jsx).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getClassrooms,
  deleteClassroom,
  bulkUpdateClassroomStatus,
  createClassroom,
  updateClassroom,
} from "../../../api/classroomsApi";
import { getStaffMemberSummary } from "../../../api/staffApi";
import { getStudentSummary } from "../../../api/studentsApi";
import { getBatches } from "../../../api/batchesApi";
import { useEntityCache } from "../../../hooks/useEntityCache";
import { useListPage, useModuleNav } from "../../../hooks/useListPageKit";
import {
  TERM_OPTIONS,
  TERM_LABELS,
  SEMESTER_OPTIONS,
  SEMESTER_LABELS,
  COURSE_OPTIONS,
  COURSE_LABELS,
} from "../../../utils/classroomConstants";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import {
  ListPageHeader,
  SegmentedToggle,
  SelectionBar,
  EntityCard,
  EntityCardGrid,
} from "../../../components/common/ListPageControls";
import { BulkStatusConfirmModal, DeleteConfirmModal } from "../../../components/common/ListPageModals";
import { STATUS_FILTER_OPTIONS } from "../../../utils/constants";
import usePageTitle from "../../../hooks/usePageTitle";
// add to imports
import ClassroomFormModal from "./components/ClassroomFormModal";
import "../../../styles/academic.css";

const AdminClassrooms = () => {
  usePageTitle("Classrooms");
  const { goToView } = useModuleNav("classrooms");

  const fetchFn = useCallback(
    (params) =>
      getClassrooms({
        q: params.q,
        page: params.page,
        limit: params.limit,
        term: params.term,
        semester: params.semester,
        course: params.course,
        status: params.status,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    // Term defaults to ODD (1), Course to KBA (1), Status to Active
    // ("active") per product request. Term/Course values must match
    // TERM_OPTIONS/COURSE_OPTIONS in classroomConstants.js (numeric);
    // Status must match STATUS_OPTIONS in utils/constants.js (string).
    initialFilters: { term: 1, semester: "all", course: 1, status: "active" },
  });

  // Resolve advisor_id -> staff record, leader_id -> student record.
  const fetchStaffById = useCallback((id) => getStaffMemberSummary(id), []);
  const fetchStudentById = useCallback((id) => getStudentSummary(id), []);
  const { cache: staffCache, ensure: ensureStaff } = useEntityCache(fetchStaffById);
  const { cache: studentCache, ensure: ensureStudent } = useEntityCache(fetchStudentById);

  useEffect(() => {
    list.items.forEach((c) => {
      if (c.advisor_id) ensureStaff(c.advisor_id);
      if (c.leader_id) ensureStudent(c.leader_id);
    });
  }, [list.items, ensureStaff, ensureStudent]);

  // ---- batch lookup (batchesApi has no get-by-id, so fetch the full
  // list once and index it client-side) ----
  const [batchMap, setBatchMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    getBatches({ limit: 1000 })
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data || res?.items || res?.batches || (Array.isArray(res) ? res : []);
        const map = {};
        rows.forEach((b) => {
          if (b?.id != null) map[String(b.id)] = b;
        });
        setBatchMap(map);
      })
      .catch(() => {
        // Non-fatal — cards just fall back to no batch badge.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- term / semester / course: static enums (see classroomConstants.js) ----
  const termOptions = useMemo(
    () => TERM_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  const semesterOptions = useMemo(
    () => SEMESTER_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  // TODO: replace with a real courses lookup (SearchableDropdown backed
  // by an async search fn) once a /courses endpoint exists.
  const courseOptions = useMemo(
    () => COURSE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
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

  // ---- bulk status actions ----
  const [bulkModal, setBulkModal] = useState(null); // 'activate' | 'deactivate'
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // add alongside the other modal state (near deleteTarget/bulkModal)
const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', classroom? }
const [formSubmitting, setFormSubmitting] = useState(false);
const [formError, setFormError] = useState("");
const [formFieldErrors, setFormFieldErrors] = useState({});

const openCreateModal = () => {
  setFormError("");
  setFormFieldErrors({});
  setFormModal({ mode: "create" });
};

const openEditModal = (classroom) => {
  setFormError("");
  setFormFieldErrors({});
  setFormModal({
    mode: "edit",
    classroom,
    initialAdvisor: classroom.advisor_id ? staffCache[String(classroom.advisor_id)]?.data || null : null,
    initialLeader: classroom.leader_id ? studentCache[String(classroom.leader_id)]?.data || null : null,
  });
};

const closeFormModal = () => {
  if (formSubmitting) return;
  setFormModal(null);
};

const handleFormSubmit = async (payload) => {
  setFormSubmitting(true);
  setFormError("");
  setFormFieldErrors({});
  try {
    if (formModal.mode === "edit") {
      await updateClassroom(formModal.classroom.id, payload);
    } else {
      await createClassroom(payload);
    }
    setFormModal(null);
    list.refetch();
  } catch (err) {
    const data = err?.response?.data;
    setFormError(
      data?.message || (formModal.mode === "edit" ? "Couldn't save changes." : "Couldn't create classroom.")
    );
    setFormFieldErrors(data?.errors || {});
  } finally {
    setFormSubmitting(false);
  }
};

// batch dropdown options for the form, built from the batchMap you already fetch
const batchDropdownOptions = useMemo(
  () => Object.values(batchMap).map((b) => ({ id: b.id, label: b.batch_name })),
  [batchMap]
);

  const openBulkModal = (action) => {
    setBulkError("");
    setBulkModal(action);
  };
  const closeBulkModal = () => {
    if (bulkSubmitting) return;
    setBulkModal(null);
  };
  const handleBulkConfirm = async () => {
    setBulkSubmitting(true);
    setBulkError("");
    try {
      const ids = Array.from(list.selectedIds);
      const isActive = bulkModal === "activate";
      await bulkUpdateClassroomStatus(ids, isActive);
      setBulkModal(null);
      list.refetch();
    } catch (err) {
      setBulkError(err?.response?.data?.message || "Couldn't complete this action.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteClassroom(deleteTarget.id);
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Couldn't delete this classroom.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="ac-page">
<ListPageHeader
  title="Classrooms"
  total={list.total}
  refreshing={list.refreshing}
  onRefresh={list.handleRefresh}
  onCreate={openCreateModal}
/>

      <div className="ac-card">
        <div className="ac-toolbar">
          <div className="ac-search-row">
            <div className="ac-search">
              <span className="ac-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                placeholder="Search by Name or Room No"
                aria-label="Search classrooms"
              />
            </div>
          </div>

          <div className="ac-filters">
            <div className="ac-filter-group">
              <SearchableDropdown
                allLabel="All Semesters"
                options={semesterOptions}
                value={list.filters.semester}
                onChange={(v) => list.setFilter("semester", v)}
                selectedLabel={SEMESTER_LABELS[list.filters.semester]}
              />
            </div>
            <div className="ac-filter-group">
              <SearchableDropdown
                allLabel="All Courses"
                options={courseOptions}
                value={list.filters.course}
                onChange={(v) => list.setFilter("course", v)}
                selectedLabel={COURSE_LABELS[list.filters.course]}
              />
            </div>
            <div className="ac-filter-group">
              <SearchableDropdown
                allLabel={statusAllOption?.label || "All Status"}
                options={statusOptions}
                value={list.filters.status}
                onChange={(v) => list.setFilter("status", v)}
              />
            </div>
            <span className="ac-result-count">{list.total} classrooms</span>
            <div className="ac-filter-group ac-filter-group-term">
              <SegmentedToggle
                ariaLabel="Term"
                options={termOptions.map((o) => ({ value: o.id, label: TERM_LABELS[o.id] || o.label }))}
                value={list.filters.term}
                onChange={(v) => list.setFilter("term", v)}
              />
            </div>
          </div>
        </div>

        {list.selectedIds.size > 0 && (
          <SelectionBar
            total={list.total}
            itemLabel="classrooms"
            allSelected={list.allOnPageSelected}
            someSelected={list.someOnPageSelected}
            onToggleSelectAll={list.toggleSelectAll}
            selectedCount={list.selectedIds.size}
            bulkActions={[
              { value: "activate", label: "Mark as Active", tone: "success" },
              { value: "deactivate", label: "Mark as Inactive", tone: "danger" },
            ]}
            onBulkAction={openBulkModal}
          />
        )}

        {list.error && <div className="ac-error-banner">{list.error}</div>}

        <EntityCardGrid loading={list.loading} empty={list.items.length === 0}>
          {list.items.map((classroom) => {
            const isInactive = !classroom.is_active;
            const advisor = classroom.advisor_id ? staffCache[String(classroom.advisor_id)] : null;
            const leader = classroom.leader_id ? studentCache[String(classroom.leader_id)] : null;
            const batch = classroom.batch_id ? batchMap[String(classroom.batch_id)] : null;

            return (
              <EntityCard
                key={classroom.id}
                id={classroom.id}
                title={classroom.name}
                meta={`Room No: ${classroom.room_no || "—"}`}
                isInactive={isInactive}
                selected={list.selectedIds.has(classroom.id)}
                onToggleSelect={list.toggleSelectOne}
                badges={[
                  { label: SEMESTER_LABELS[classroom.semester] || classroom.semester || "—" },
                  { label: TERM_LABELS[classroom.term] || classroom.term || "—", tone: "term" },
                  { label: COURSE_LABELS[classroom.course] || classroom.course || "—", tone: "course" },
                ]}
                footerMeta={classroom.batch_id ? `Batch: ${batch?.batch_name || "…"}` : null}
                people={[
                  {
                    label: "Advisor",
                    name: classroom.advisor_id
                      ? advisor?.data?.name || (advisor?.loading ? "Loading…" : "—")
                      : "—",
                    avatarUrl: advisor?.data?.photo_url || null,
                  },
                  {
                    label: "Leader",
                    name: classroom.leader_id
                      ? leader?.data?.name || (leader?.loading ? "Loading…" : "—")
                      : "—",
                    avatarUrl: leader?.data?.photo_url || null,
                  },
                ]}
                onView={() => goToView(classroom)}
                onEdit={() => openEditModal(classroom)}
                onDelete={() => setDeleteTarget(classroom)}
              />
            );
          })}
        </EntityCardGrid>

        {/* Pagination intentionally removed — classroom counts are
            small enough that a single page covers everything. Re-add
            <Pagination {...list} /> (imported from ListPageControls)
            if that stops being true, e.g. for Subjects. */}
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          variant="st"
          title="Delete Classroom"
          itemName={deleteTarget.name}
          itemLabel="classroom"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          submitting={deleteSubmitting}
          error={deleteError}
        />
      )}

      {bulkModal && (
        <BulkStatusConfirmModal
          action={bulkModal}
          count={list.selectedIds.size}
          itemLabel="classroom"
          onClose={closeBulkModal}
          onConfirm={handleBulkConfirm}
          submitting={bulkSubmitting}
          error={bulkError}
        />
      )}

      {formModal && (
        <ClassroomFormModal
          mode={formModal.mode}
          initialData={formModal.classroom}
          batchOptions={batchDropdownOptions}
          initialAdvisor={formModal.initialAdvisor}
          initialLeader={formModal.initialLeader}
          onClose={closeFormModal}
          onSubmit={handleFormSubmit}
          submitting={formSubmitting}
          serverError={formError}
          serverFieldErrors={formFieldErrors}
        />
      )}
    </div>
  );
};

export default AdminClassrooms;