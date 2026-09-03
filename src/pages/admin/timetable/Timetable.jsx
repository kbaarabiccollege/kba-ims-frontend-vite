// src/pages/admin/timetable/Timetable.jsx
//
// Timetable list page — built on the shared useListPage hook (see
// src/hooks/useListPage.js) so it stays in sync with Staff/Students on
// search, pagination, and filter behavior.
//
// ASSUMPTIONS (adjust to match your actual backend / other files):
// - Route names: useModuleNav("timetable") is assumed to resolve to
//   /admin/timetable/create (form), /admin/timetable/:id/edit (same
//   form, edit mode) and /admin/timetable/:id (view-only page). Point
//   these at whatever you named your two new empty files if different.
// - Classrooms: getClassrooms() is paginated (per your example,
//   {pagination:{total, page, limit, totalPages}}). Since the timetable
//   list/response only gives back a bare classroom_id (no classroom
//   name), this page fetches the full classroom list once on mount —
//   looping pages if needed — to (a) populate the "Classroom" filter
//   and (b) resolve classroom_id -> name for the table column. If your
//   classroom count ever grows large, swap this for a real
//   search-as-you-type endpoint instead.
// - Status filter: assumed to follow the same convention as Staff
//   (status=active|inactive|all), mapped from the timetable's
//   `is_active` flag — mirrors STATUS_FILTER_OPTIONS from
//   utils/constants.js.
// - ActionButtonsCell is used without its `onPassword` handler (there's
//   no password concept for timetables) — assumed to simply omit that
//   button when the prop isn't passed. Swap for a bare 3-icon action
//   group if your shared component requires all four handlers.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getTimetables, deleteTimetable } from "../../../api/timetableApi";
import { getClassrooms } from "../../../api/classroomsApi";
import { useListPage, useModuleNav } from "../../../hooks/useListPageKit";
import { COURSES, getCourseLabel, STATUS_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from "../../../utils/constants";
import { formatEffectiveRange, monthInputToEffectivePeriod, effectivePeriodToMonthInput } from "../../../utils/timetableUtils";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import {
  ActionButtonsCell,
  ListPageHeader,
  Pagination,
} from "../../../components/common/ListPageControls";
import { DeleteConfirmModal } from "../../../components/common/ListPageModals";
import TimetableViewModal from "./TimetableViewModal";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/UserList.css";
import "../../../styles/Timetable.css";

const Timetable = () => {
  usePageTitle("Timetable");
  const { goToCreate, goToEdit } = useModuleNav("timetable");

  const fetchFn = useCallback(
    (params) =>
      getTimetables({
        q: params.q,
        page: params.page,
        limit: params.limit,
        course: params.course,
        classroom: params.classroom,
        effectivePeriod: params.effectivePeriod,
        status: params.status,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    initialFilters: { course: "all", classroom: "all", effectivePeriod: "", status: "all" },
  });

  // ---- course: static enum (utils/constants.js) ----
  const courseOptions = useMemo(
    () => Object.entries(COURSES).map(([id, label]) => ({ id, label })),
    []
  );

  // ---- classroom: fetched from the API (paginated), loaded once ----
  const [classrooms, setClassrooms] = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAllClassrooms = async () => {
      setClassroomsLoading(true);
      try {
        const collected = [];
        let page = 1;
        let totalPages = 1;

        do {
          const res = await getClassrooms({ page, limit: 100 });
          const batch = res?.data || [];
          collected.push(...batch);
          totalPages = res?.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages && page <= 50); // safety cap

        if (!cancelled) setClassrooms(collected);
      } catch {
        if (!cancelled) setClassrooms([]);
      } finally {
        if (!cancelled) setClassroomsLoading(false);
      }
    };

    loadAllClassrooms();
    return () => {
      cancelled = true;
    };
  }, []);

  const classroomOptions = useMemo(
    () => classrooms.map((c) => ({ id: c.id, label: c.room_no ? `${c.name} (${c.room_no})` : c.name })),
    [classrooms]
  );
  const classroomLabelsById = useMemo(() => {
    const map = {};
    classrooms.forEach((c) => {
      map[c.id] = c.name || "—";
    });
    return map;
  }, [classrooms]);

  // ---- status: reuse the shared active/inactive filter options ----
  const statusAllOption = useMemo(() => STATUS_FILTER_OPTIONS.find((s) => s.value === "all"), []);
  const statusOptions = useMemo(
    () =>
      STATUS_FILTER_OPTIONS.filter((s) => s.value !== "all").map((s) => ({
        id: s.value,
        label: s.label,
      })),
    []
  );

  // ---- effective period: month/year picker (MM-YYYY on the wire) ----
  const handleEffectivePeriodChange = (e) => {
    list.setFilter("effectivePeriod", monthInputToEffectivePeriod(e.target.value));
  };

  // ---- row view (popup instead of a separate page) ----
  const [viewTarget, setViewTarget] = useState(null);

  // ---- row delete (same shape as Staff/Students) ----
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteTimetable(deleteTarget.id);
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Couldn't delete this timetable.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="st-page">
      <ListPageHeader
        title="Timetable"
        total={list.total}
        refreshing={list.refreshing}
        onRefresh={list.handleRefresh}
        onCreate={goToCreate}
      />

      <div className="st-card">
        <div className="st-toolbar">
          <div className="st-search-row">
            <div className="st-search">
              <span className="st-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                placeholder="Search by Timetable Name"
                aria-label="Search timetables"
              />
            </div>
          </div>

          <div className="st-filters">
            <div className="st-filters-row">
              <SearchableDropdown
                label="Course"
                allLabel="All Courses"
                options={courseOptions}
                value={list.filters.course}
                onChange={(v) => list.setFilter("course", v)}
                selectedLabel={getCourseLabel(list.filters.course)}
              />
              <SearchableDropdown
                label="Classroom"
                allLabel="All Classrooms"
                options={classroomOptions}
                value={list.filters.classroom}
                onChange={(v) => list.setFilter("classroom", v)}
                selectedLabel={classroomLabelsById[list.filters.classroom]}
                loading={classroomsLoading}
              />
            </div>
            <input
              type="month"
              className="tt-month-filter"
              value={effectivePeriodToMonthInput(list.filters.effectivePeriod)}
              onChange={handleEffectivePeriodChange}
              aria-label="Filter by effective month"
            />
            <SearchableDropdown
              label="Status"
              allLabel={statusAllOption?.label || "All Status"}
              options={statusOptions}
              value={list.filters.status}
              onChange={(v) => list.setFilter("status", v)}
            />
            <span className="st-result-count">{list.total} timetables</span>
          </div>
        </div>

        {list.error && <div className="st-error-banner">{list.error}</div>}

        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th className="st-col-num">S.No.</th>
                <th className="st-col-left">Name</th>
                <th>Course</th>
                <th>Classroom</th>
                <th>Effective Dates</th>
                <th className="st-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading ? (
                <tr><td colSpan={6} className="st-state-cell">Loading timetables…</td></tr>
              ) : list.items.length === 0 ? (
                <tr><td colSpan={6} className="st-state-cell">No timetables match your search or filters.</td></tr>
              ) : (
                list.items.map((tt, idx) => {
                  const isInactive = !tt.is_active;
                  return (
                    <tr key={tt.id} className={isInactive ? "st-row-inactive" : ""}>
                      <td className="st-col-num">{(list.page - 1) * list.limit + idx + 1}</td>
                      <td className="st-col-left">
                        <div className="st-student-cell">
                          <div className="st-student-text">
                            <span className="st-student-name">{tt.timetable_name || "—"}</span>
                          </div>
                          {isInactive && <span className="st-inactive-tag">Inactive</span>}
                        </div>
                      </td>
                      <td>{getCourseLabel(tt.course) || "—"}</td>
                      <td>{classroomLabelsById[tt.classroom_id] || "—"}</td>
                      <td>{formatEffectiveRange(tt.effective_from, tt.effective_to)}</td>
                      <td>
                        <ActionButtonsCell
                          name={tt.timetable_name}
                          onView={() => setViewTarget(tt)}
                          onEdit={() => goToEdit(tt)}
                          onDelete={() => setDeleteTarget(tt)}
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

      {viewTarget && (
        <TimetableViewModal
          timetable={viewTarget}
          classroomName={classroomLabelsById[viewTarget.classroom_id]}
          onClose={() => setViewTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          variant="st"
          title="Delete Timetable"
          itemName={deleteTarget.timetable_name}
          itemLabel="timetable"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          submitting={deleteSubmitting}
          error={deleteError}
        />
      )}
    </div>
  );
};

export default Timetable;