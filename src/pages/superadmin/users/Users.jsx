// src/pages/superadmin/users/Users.jsx

// Users list page (User Management > Users).
// Talks to GET/POST/PUT /api/users via src/api/usersApi.js.
//
// NOTE on API response shape: this assumes the list endpoint returns
//   { data: User[], total: number, page: number, limit: number }
// If your backend returns a different shape (e.g. { users, count }),
// adjust the destructuring in fetchUsers() below — everything else
// is shape-agnostic.
//
// NOTE on error handling: the backend returns Joi-style validation
// errors as { success:false, message, errors: { field: msg }, errorCode }.
// `message` (e.g. "Validation failed.") is shown as the banner headline
// inside the modal; `errors` is passed down so each field can show its
// own message.
//
// NOTE on role scoping: dev users see the full Users list and can
// filter by any role. Superadmins land on the same page (labelled
// "Employees") but are scoped to role=admin,accountant by default,
// and don't get a role filter to override that.

import { useCallback, useEffect, useState } from "react";
import { getUsers, createUser, updateUser, updateUserPassword, bulkUpdateUserStatus } from "../../../api/usersApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { useAuth } from "../../../context/AuthContext";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import { ROLE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from "./constants";
import { RoleBadge, StatusPill } from "../../../components/common/Badges";
import UserFormModal from "./components/UserFormModal";
import PasswordModal from "./components/PasswordModal";
import {
  SelectAllCheckbox,
  SelectableRowCell,
  ActionButtonsCell,
  ListPageHeader,
  Pagination,
} from "../../../components/common/ListPageControls";
import { DeleteConfirmModal, BulkStatusConfirmModal } from "../../../components/common/ListPageModals";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import "../../../styles/Users.css";
import "../../../styles/UserList.css";

const Users = () => {
  const { role: authRole } = useAuth();
  const isDev = authRole === "dev";
  const toast = useToast();

  // Dev sees everyone by default and can filter by role.
  // Superadmin is scoped to admin+accountant only, with no override in the UI.
  const DEFAULT_ROLE_FILTER = isDev ? "all" : "admin,accountant";

  // ---- list state ----
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // ---- filters ----
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(DEFAULT_ROLE_FILTER);
  const [status, setStatus] = useState("active"); // active by default, per spec
  const debouncedSearch = useDebouncedValue(search, 400);

  // ROLE_FILTER_OPTIONS is a static local list — SearchableDropdown only
  // re-filters via onFetch (built for server search), so this acts as
  // a client-side "fetch": filter the full list by query and hand the
  // result back as the visible options.
  const [roleFilterOptions, setRoleFilterOptions] = useState(
    ROLE_FILTER_OPTIONS.filter((r) => r.value !== "all").map((r) => ({ id: r.value, label: r.label }))
  );
  const handleRoleFilterSearch = (q) => {
    const query = q.trim().toLowerCase();
    const base = ROLE_FILTER_OPTIONS.filter((r) => r.value !== "all");
    const filtered = query ? base.filter((r) => r.label.toLowerCase().includes(query)) : base;
    setRoleFilterOptions(filtered.map((r) => ({ id: r.value, label: r.label })));
  };

  // ---- popups ----
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', user? }
  const [passwordModal, setPasswordModal] = useState(null); // user
  const [deleteModal, setDeleteModal] = useState(null); // user
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState({});

  // ---- row selection + bulk status (Mark as Active / Mark as Inactive) ----
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModal, setBulkModal] = useState(null); // 'activate' | 'deactivate'
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getUsers({ q: debouncedSearch, page, limit, role, status });
      // Adjust here if your API's response shape differs.
      setUsers(res?.data ?? res?.users ?? []);
      setTotal(
        res?.pagination?.total ??
          res?.total ??
          res?.count ??
          (res?.data ?? res?.users ?? []).length
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Couldn't load users. Please try again in a moment."
      );
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  // Reset to page 1 whenever a filter changes (not on page/limit changes themselves)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  // Clear selection whenever the underlying page of users changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const allOnPageSelected = users.length > 0 && selectedIds.size === users.length;
  const someOnPageSelected = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds(allOnPageSelected ? new Set() : new Set(users.map((u) => u.id ?? u.user_id)));
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
      const ids = Array.from(selectedIds);
      const newStatus = bulkModal === "activate" ? "active" : "inactive";
      await bulkUpdateUserStatus(ids, newStatus);
      setBulkModal(null);
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      // TEMP: full diagnostic dump — remove once the real cause is found
      console.error("Bulk status update failed:", {
        message: err?.message,
        status: err?.response?.status,
        responseData: err?.response?.data,
        request: err?.request,
        config: err?.config,
      });
      setBulkError(err?.response?.data?.message || `Couldn't complete this action.${err?.response?.status ? ` (HTTP ${err.response.status})` : " (no response received)"}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ---- create / edit ----
  const openCreateModal = () => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "create" });
  };

  const openEditModal = (user) => {
    setModalError("");
    setModalFieldErrors({});
    setFormModal({ mode: "edit", user });
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
        await updateUser(formModal.user.id, payload);
        toast.success(crudMessage("update", "User", "success"));
      } else {
        await createUser(payload);
        toast.success(crudMessage("create", "User", "success"));
      }
      setFormModal(null);
      fetchUsers();
    } catch (err) {
      const data = err?.response?.data;
      const fallback = crudMessage(formModal.mode === "edit" ? "update" : "create", "User", "error");
      setModalError(data?.message || fallback);
      setModalFieldErrors(data?.errors || {});
      toast.error(data?.message || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- password ----
  const openPasswordModal = (user) => {
    setModalError("");
    setModalFieldErrors({});
    setPasswordModal(user);
  };

  const closePasswordModal = () => {
    if (submitting) return;
    setPasswordModal(null);
  };

  const handlePasswordSubmit = async (password) => {
    setSubmitting(true);
    setModalError("");
    setModalFieldErrors({});
    try {
      await updateUserPassword(passwordModal.id, password);
      toast.success(crudMessage("update", "Password", "success"));
      setPasswordModal(null);
    } catch (err) {
      const data = err?.response?.data;
      const fallback = crudMessage("update", "Password", "error");
      setModalError(data?.message || fallback);
      setModalFieldErrors(data?.errors || {});
      toast.error(data?.message || fallback);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- delete (dummy — no endpoint wired) ----
  const openDeleteModal = (user) => setDeleteModal(user);
  const closeDeleteModal = () => setDeleteModal(null);
  const handleDeleteConfirm = () => {
    // Intentionally not calling an API — see DeleteConfirmModal.jsx.
    setDeleteModal(null);
  };

  return (
    <div className="st-page um-page">
      <ListPageHeader
        title="Users"
        total={total}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onCreate={openCreateModal}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID or email…"
                aria-label="Search users"
              />
            </div>
          </div>

          <div className="st-filters">
            {isDev && (
              <SearchableDropdown
                label="Role"
                allLabel={ROLE_FILTER_OPTIONS.find((r) => r.value === "all")?.label || "All Roles"}
                options={roleFilterOptions}
                value={role}
                onChange={setRole}
                searchable
                onFetch={handleRoleFilterSearch}
                loaded
                hideFetchButton
                placeholder="Search roles…"
              />
            )}

            <SearchableDropdown
              label="Status"
              allLabel={STATUS_FILTER_OPTIONS.find((s) => s.value === "all")?.label || "All Statuses"}
              options={STATUS_FILTER_OPTIONS.filter((s) => s.value !== "all").map((s) => ({
                id: s.value,
                label: s.label,
              }))}
              value={status}
              onChange={setStatus}
            />

            <span className="st-result-count">{total} users</span>
          </div>
        </div>

        {error && <div className="st-error-banner">{error}</div>}

        {selectedIds.size > 0 && (
          <div className="st-bulk-bar">
            <span className="st-bulk-count">{selectedIds.size} selected</span>
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

        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th className="st-col-num">
                  <SelectAllCheckbox
                    checked={allOnPageSelected}
                    indeterminate={someOnPageSelected}
                    onChange={toggleSelectAll}
                    label="Select all users on this page"
                  />
                </th>
                <th>User ID</th>
                <th className="st-col-left">Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="st-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="st-state-cell">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="st-state-cell">
                    No users match your search or filters.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const rowId = user.id ?? user.user_id;
                  return (
                    <tr key={rowId}>
                      <SelectableRowCell
                        id={rowId}
                        index={(page - 1) * limit + idx + 1}
                        selected={selectedIds.has(rowId)}
                        onToggle={toggleSelectOne}
                        name={user.user_id}
                      />
                      <td>{user.user_id}</td>
                      <td className="st-col-left">{user.email || "—"}</td>
                      <td>
                        <RoleBadge role={user.role} />
                      </td>
                      <td>
                        <StatusPill status={user.status} />
                      </td>
                      <td>
                        <ActionButtonsCell
                          name={user.user_id}
                          onEdit={() => openEditModal(user)}
                          onPassword={() => openPasswordModal(user)}
                          onDelete={() => openDeleteModal(user)}
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
        <UserFormModal
          mode={formModal.mode}
          initialData={formModal.user}
          onClose={closeFormModal}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          serverError={modalError}
          serverFieldErrors={modalFieldErrors}
        />
      )}

      {passwordModal && (
        <PasswordModal
          user={passwordModal}
          onClose={closePasswordModal}
          onSubmit={handlePasswordSubmit}
          submitting={submitting}
          serverError={modalError}
          serverFieldErrors={modalFieldErrors}
        />
      )}

      {bulkModal && (
        <BulkStatusConfirmModal
          action={bulkModal}
          count={selectedIds.size}
          itemLabel="user"
          onClose={closeBulkModal}
          onConfirm={handleBulkConfirm}
          submitting={bulkSubmitting}
          error={bulkError}
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

export default Users;