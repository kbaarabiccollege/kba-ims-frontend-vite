// src/pages/admin/academics/AdminSubjects.jsx
//
// Subjects list page — deliberately built as a near-clone of
// AdminClassrooms.jsx (same useListPage hook, same EntityCard/
// SelectionBar/ListPageHeader building blocks, same academic.css
// classes) so the two modules stay visually and behaviorally in sync.
//
// Differences from AdminClassrooms.jsx (per product request):
// - No course_staff_id / handling_staff_id anywhere: no staff lookup,
//   no "people" rows on the card, nothing sent in the form payload.
// - Cards show academic/record fields instead of people: display_name,
//   code, course, sem, term, credits, univ_credits, and the resolved
//   classroom name.
// - Pagination IS rendered here (Classrooms intentionally omits it;
//   Subjects has 60+ rows per the sample response, so it's back).
//
// ASSUMPTIONS (adjust to match your actual backend / product needs):
// - Filters mirror Classrooms: `term` (segmented), `sem` (dropdown,
//   reusing SEMESTER_OPTIONS/LABELS from classroomConstants.js since
//   subjects use the same 1-8 semester numbering), `course` (dropdown,
//   reusing COURSE_OPTIONS/LABELS), and `status` ('all' | 'active' |
//   'inactive' -> is_active=1/0, see subjectsApi.getSubjects).
// - Term/Semester/Course constants are intentionally NOT duplicated
//   into a subjectConstants.js — they're imported straight from
//   classroomConstants.js since the enums are shared across academic
//   modules. If Subjects ever needs a value classroom doesn't have,
//   split them out then.
// - Classroom lookup: subjectsApi has no way to resolve classroom_id
//   -> classroom name server-side, and classroomsApi has no
//   get-by-id, so — exactly like the batch lookup in
//   AdminClassrooms.jsx — we fetch the full classroom list once and
//   index it client-side. Swap for a dedicated getClassroom(id) call
//   or a server-joined `classroom_name` field if either becomes
//   available.
// - useListPage is assumed to expose page/setPage/limit/setLimit/
//   totalPages alongside the fields AdminClassrooms.jsx already uses
//   (total/refreshing/search/filters/selectedIds/etc.) — Classrooms
//   just never rendered them because pagination was cut there. If
//   your hook's real field names differ, only the small block marked
//   "pagination wiring" below needs updating.
// - credits / univ_credits come back as strings (e.g. "3.0") in the
//   sample payload; they're displayed as-is and sent back as strings
//   from the form (no numeric coercion) to avoid losing trailing
//   zeros the backend may care about.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSubjects,
  deleteSubject,
  bulkUpdateSubjectStatus,
  createSubject,
  updateSubject,
} from "../../../api/subjectsApi";
import { getClassrooms } from "../../../api/classroomsApi";
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
  Pagination,
} from "../../../components/common/ListPageControls";
import { BulkStatusConfirmModal, DeleteConfirmModal } from "../../../components/common/ListPageModals";
import { STATUS_FILTER_OPTIONS } from "../../../utils/constants";
import usePageTitle from "../../../hooks/usePageTitle";
import SubjectFormModal from "./components/SubjectFormModal";
import "../../../styles/academic.css";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const AdminSubjects = () => {
  usePageTitle("Subjects");
  const { goToView } = useModuleNav("subjects");

  const fetchFn = useCallback(
    (params) =>
      getSubjects({
        q: params.q,
        page: params.page,
        limit: params.limit,
        term: params.term,
        sem: params.sem,
        course: params.course,
        status: params.status,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    // Term defaults to ODD (1), Course to KBA (1), Status to Active —
    // same defaults as Classrooms, for consistency across the two
    // filter bars. Semester defaults to "all" since subjects span all
    // 8 semesters and there's no single obvious default.
    initialFilters: { term: 1, sem: "all", course: 1, status: "active" },
  });

  // ---- classroom lookup (classroomsApi has no get-by-id, so fetch
  // the full list once and index it client-side — same pattern as the
  // batch lookup in AdminClassrooms.jsx) ----
  const [classroomMap, setClassroomMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    getClassrooms({ limit: 1000, isActive: null })
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data || res?.items || res?.classrooms || (Array.isArray(res) ? res : []);
        const map = {};
        rows.forEach((c) => {
          if (c?.id != null) map[String(c.id)] = c;
        });
        setClassroomMap(map);
      })
      .catch(() => {
        // Non-fatal — cards just fall back to no classroom name.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- term / semester / course: static enums, reused from Classrooms ----
  const termOptions = useMemo(
    () => TERM_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  const semesterOptions = useMemo(
    () => SEMESTER_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
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

  // classroom dropdown options for the form, built from the map we already fetch
  const classroomDropdownOptions = useMemo(
    () => Object.values(classroomMap).map((c) => ({ id: c.id, label: c.name })),
    [classroomMap]
  );

  // ---- row delete ----
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ---- bulk status actions ----
  const [bulkModal, setBulkModal] = useState(null); // 'activate' | 'deactivate'
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // ---- create / edit form modal ----
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', subject? }
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const openCreateModal = () => {
    setFormError("");
    setFormFieldErrors({});
    setFormModal({ mode: "create" });
  };

  const openEditModal = (subject) => {
    setFormError("");
    setFormFieldErrors({});
    setFormModal({ mode: "edit", subject });
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
        await updateSubject(formModal.subject.id, payload);
      } else {
        await createSubject(payload);
      }
      setFormModal(null);
      list.refetch();
    } catch (err) {
      const data = err?.response?.data;
      setFormError(
        data?.message || (formModal.mode === "edit" ? "Couldn't save changes." : "Couldn't create subject.")
      );
      setFormFieldErrors(data?.errors || {});
    } finally {
      setFormSubmitting(false);
    }
  };

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
      await bulkUpdateSubjectStatus(ids, isActive);
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
      await deleteSubject(deleteTarget.id);
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Couldn't delete this subject.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ---- pagination wiring ----
  // Pagination is a controlled, presentational component — it needs
  // range numbers computed by the caller. See the ASSUMPTIONS block up
  // top if list.page/list.limit/list.setPage/list.setLimit turn out to
  // be named differently in your actual useListPage implementation.
  const rangeStart = list.total === 0 ? 0 : (list.page - 1) * list.limit + 1;
  const rangeEnd = Math.min(list.page * list.limit, list.total);

  return (
    <div className="ac-page">
      <ListPageHeader
        title="Subjects"
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
                placeholder="Search by Name or Code"
                aria-label="Search subjects"
              />
            </div>
          </div>

          <div className="ac-filters">
            <div className="ac-filter-group">
              <SearchableDropdown
                allLabel="All Semesters"
                options={semesterOptions}
                value={list.filters.sem}
                onChange={(v) => list.setFilter("sem", v)}
                selectedLabel={SEMESTER_LABELS[list.filters.sem]}
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
            <span className="ac-result-count">{list.total} subjects</span>
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
            itemLabel="subjects"
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
          {list.items.map((subject) => {
            const isInactive = !subject.is_active;
            const classroom = subject.classroom_id ? classroomMap[String(subject.classroom_id)] : null;

            return (
              <EntityCard
                key={subject.id}
                id={subject.id}
                title={subject.display_name || subject.name}
                meta={`Code: ${subject.code || "—"}`}
                isInactive={isInactive}
                selected={list.selectedIds.has(subject.id)}
                onToggleSelect={list.toggleSelectOne}
                badges={[
                  { label: COURSE_LABELS[subject.course] || subject.course || "—", tone: "course" },
                  { label: SEMESTER_LABELS[subject.sem] || `Sem ${subject.sem ?? "—"}` },
                  { label: TERM_LABELS[subject.term] || subject.term || "—", tone: "term" },
                  { label: `Credits: ${subject.credits ?? "—"}` },
                  { label: `Univ. Credits: ${subject.univ_credits ?? "—"}` },
                ]}
                footerMeta={subject.classroom_id ? `Classroom: ${classroom?.name || "…"}` : null}
                people={[]}
                onView={() => goToView(subject)}
                onEdit={() => openEditModal(subject)}
                onDelete={() => setDeleteTarget(subject)}
              />
            );
          })}
        </EntityCardGrid>

        <Pagination
          page={list.page}
          setPage={list.setPage}
          limit={list.limit}
          setLimit={list.setLimit}
          total={list.total}
          totalPages={list.totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          variant="st"
          title="Delete Subject"
          itemName={deleteTarget.display_name || deleteTarget.name}
          itemLabel="subject"
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
          itemLabel="subject"
          onClose={closeBulkModal}
          onConfirm={handleBulkConfirm}
          submitting={bulkSubmitting}
          error={bulkError}
        />
      )}

      {formModal && (
        <SubjectFormModal
          mode={formModal.mode}
          initialData={formModal.subject}
          classroomOptions={classroomDropdownOptions}
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

export default AdminSubjects;