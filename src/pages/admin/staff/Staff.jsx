// src/pages/admin/staff/Staff.jsx
//
// Staff list page — built on the shared useListPage hook (see
// src/hooks/useListPage.js) so it stays in sync with Students/Classrooms/
// Subjects on search, pagination, and selection behavior.
//
// ASSUMPTIONS (adjust to match your actual backend):
// - staff_type and employment_place are FK-style numeric fields with their
//   own lookup lists. I've stubbed searchStaffTypes/searchEmploymentPlaces
//   the same way Students.jsx does for classrooms/batches — point them at
//   your real endpoints (or swap for a plain <select> if these are small,
//   static enums rather than searchable lists).
// - staffStatusApi / STAFF_STATUS_OPTIONS mirror STATUS_FILTER_OPTIONS from
//   the Students constants file.

import { useCallback, useMemo, useState } from "react";
import { getStaff, deleteStaff, bulkUpdateStaffStatus } from "../../../api/staffApi";
import { useListPage, useModuleNav } from "../../../hooks/useListPageKit";
import { updateUserPassword } from "../../../api/usersApi";
import {
  STAFF_TYPE_OPTIONS,
  STAFF_TYPE_LABELS,
  EMPLOYMENT_PLACE_OPTIONS,
  EMPLOYMENT_PLACE_LABELS,
  DESIGNATION_OPTIONS,
  DESIGNATION_LABELS,
} from "../../../utils/staffConstants";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import PasswordModal from "../../superadmin/users/components/PasswordModal";
import {
  AvatarCell,
  SelectAllCheckbox,
  SelectableRowCell,
  ActionButtonsCell,
  ListPageHeader,
  Pagination,
} from "../../../components/common/ListPageControls";
import { PhotoPreviewModal, BulkStatusConfirmModal, DeleteConfirmModal } from "../../../components/common/ListPageModals";
import {  STATUS_FILTER_OPTIONS } from "../../../utils/constants";
import { PAGE_SIZE_OPTIONS } from "../../../utils/constants";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/UserList.css";

const Staff = () => {
  usePageTitle("Staff");
  const { goToCreate, goToView, goToEdit } = useModuleNav("staff");
  const toast = useToast();

  const fetchFn = useCallback(
    (params) =>
      getStaff({
        q: params.q,
        page: params.page,
        limit: params.limit,
        staffType: params.staffType,
        employmentPlace: params.employmentPlace,
        designation: params.designation,
        status: params.status,
      }),
    []
  );

  const list = useListPage({
    fetchFn,
    initialFilters: { staffType: "all", employmentPlace: "all", designation: "all", status: "all" },
  });

  // ---- staff-type / employment-place: static enums (see constants.js) ----
  const staffTypeOptions = useMemo(
    () => STAFF_TYPE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  const placeOptions = useMemo(
    () => EMPLOYMENT_PLACE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  const designationOptions = useMemo(
    () => DESIGNATION_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
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

  // ---- row delete (same shape as Students) ----
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ---- bulk status actions (Mark as Active / Mark as Inactive only —
  // no Bulk Update for Staff) ----
  const [bulkModal, setBulkModal] = useState(null); // 'activate' | 'deactivate'
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

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
      const status = bulkModal === "activate" ? "active" : "inactive";
      await bulkUpdateStaffStatus(ids, status);
      setBulkModal(null);
      list.refetch();
    } catch (err) {
      setBulkError(err?.response?.data?.message || "Couldn't complete this action.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ---- profile picture preview (zoom) ----
  const [previewStaff, setPreviewStaff] = useState(null);

  // ---- password change ----
  const [passwordModal, setPasswordModal] = useState(null); // staff
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const openPasswordModal = (staff) => {
    setPasswordError("");
    setPasswordModal(staff);
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

  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteStaff(deleteTarget.id);
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Couldn't delete this staff member.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="st-page">
      <ListPageHeader
        title="Staff"
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
                placeholder="Search by Name, Staff ID or Email"
                aria-label="Search staff"
              />
            </div>
          </div>

          <div className="st-filters">
            <div className="st-filters-row">
              <SearchableDropdown
                label="Staff Type"
                allLabel="All Types"
                options={staffTypeOptions}
                value={list.filters.staffType}
                onChange={(v) => list.setFilter("staffType", v)}
                selectedLabel={STAFF_TYPE_LABELS[list.filters.staffType]}
              />
              <SearchableDropdown
                label="Employment Place"
                allLabel="All Places"
                options={placeOptions}
                value={list.filters.employmentPlace}
                onChange={(v) => list.setFilter("employmentPlace", v)}
                selectedLabel={EMPLOYMENT_PLACE_LABELS[list.filters.employmentPlace]}
              />
            </div>
            <SearchableDropdown
              label="Designation"
              allLabel="All Designations" 
              options={designationOptions}
              value={list.filters.designation}
              onChange={(v) => list.setFilter("designation", v)}
              selectedLabel={DESIGNATION_LABELS[list.filters.designation]}
            />
            <SearchableDropdown
              label="Status"
              allLabel={statusAllOption?.label || "All Status"}
              options={statusOptions}
              value={list.filters.status}
              onChange={(v) => list.setFilter("status", v)}
            />
            <span className="st-result-count">{list.total} staff</span>
          </div>
        </div>

        {list.selectedIds.size > 0 && (
          <div className="st-bulk-bar">
            <span className="st-bulk-count">{list.selectedIds.size} selected</span>
            <div className="st-bulk-actions">
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
                    label="Select all staff on this page"
                  />
                </th>
                <th className="st-col-left">Staff</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Staff Type</th>
                <th>Employment Place</th>
                <th className="st-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading ? (
                <tr><td colSpan={7} className="st-state-cell">Loading staff…</td></tr>
              ) : list.items.length === 0 ? (
                <tr><td colSpan={7} className="st-state-cell">No staff match your search or filters.</td></tr>
              ) : (
                list.items.map((staff, idx) => {
                  const isInactive = staff.status === "inactive";
                  return (
                    <tr key={staff.id} className={isInactive ? "st-row-inactive" : ""}>
                      <SelectableRowCell
                        id={staff.id}
                        index={(list.page - 1) * list.limit + idx + 1}
                        selected={list.selectedIds.has(staff.id)}
                        onToggle={list.toggleSelectOne}
                        name={staff.name}
                      />
                      <td className="st-col-left">
                        <div className="st-student-cell">
                          <AvatarCell name={staff.name} photoUrl={staff.photo_url} onPreview={() => setPreviewStaff(staff)} />
                          <div className="st-student-text">
                            <span className="st-student-name">{staff.name || "—"}</span>
                            <span className="st-student-roll">{staff.staff_uid || "—"}</span>
                          </div>
                          {isInactive && <span className="st-inactive-tag">Inactive</span>}
                        </div>
                      </td>
                      <td>{staff.email || "—"}</td>
                      <td>{DESIGNATION_LABELS[staff.designation] || "—"}</td>
                      <td>{STAFF_TYPE_LABELS[staff.staff_type] || "—"}</td>
                      <td>{EMPLOYMENT_PLACE_LABELS[staff.employment_place] || "—"}</td>
                      <td>
                        <ActionButtonsCell
                          name={staff.name}
                          onView={() => goToView(staff)}
                          onEdit={() => goToEdit(staff)}
                          onPassword={() => openPasswordModal(staff)}
                          onDelete={() => setDeleteTarget(staff)}
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

      {deleteTarget && (
        <DeleteConfirmModal
          variant="st"
          title="Delete Staff"
          itemName={deleteTarget.name}
          itemLabel="staff member"
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
          itemLabel="staff member"
          onClose={closeBulkModal}
          onConfirm={handleBulkConfirm}
          submitting={bulkSubmitting}
          error={bulkError}
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

      {previewStaff && (
        <PhotoPreviewModal item={previewStaff} onClose={() => setPreviewStaff(null)} subtitle={previewStaff.staff_uid} />
      )}
    </div>
  );
};

export default Staff;