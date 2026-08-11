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
import { getUsers, createUser, updateUser, updateUserPassword } from "../../../api/usersApi";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { useAuth } from "../../../context/AuthContext";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import { ROLE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS, PAGE_SIZE_OPTIONS } from "./constants";
import { RoleBadge, StatusPill } from "../../../components/common/Badges";
import UserFormModal from "./components/UserFormModal";
import PasswordModal from "./components/PasswordModal";
import DeleteConfirmModal from "../../../components/common/DeleteConfirmModal";
import { EditIcon, KeyIcon, TrashIcon } from "../../../components/common/Icons";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import "../../../styles/AdminUsers.css";

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

  // Reset to page 1 whenever a filter changes (not on page/limit changes themselves)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  const activeCount = users.filter((u) => u.status === "active").length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

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
    <div className="um-page">
      <div className="um-page-header">
        <div className="um-title-block">
          <h1>
            <span className="um-title-icon" aria-hidden="true">
              👥
            </span>
            Users
          </h1>
          <p className="um-title-meta">
            {total} total &middot; {activeCount} active on this page
          </p>
        </div>
        <button type="button" className="um-btn um-btn-primary um-btn-add" onClick={openCreateModal}>
          <span aria-hidden="true">+</span>
          <span className="um-btn-add-label-full">Add New User</span>
          <span className="um-btn-add-label-short">Add</span>
        </button>
      </div>

      <div className="um-card">
        <div className="um-toolbar">
          <div className="um-search">
            <span className="um-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID or email…"
              aria-label={`Search users`}
            />
          </div>

          <div className="um-filters">

            {isDev && (
              <div className="um-filter-dropdown">
                <SearchableDropdown
                  id="um-role-filter"
                  label=""
                  allLabel={ROLE_FILTER_OPTIONS.find((r) => r.value === "all")?.label || "All Roles"}
                  options={roleFilterOptions}
                  value={role}
                  onChange={setRole}
                  searchable
                  onFetch={handleRoleFilterSearch}
                  loaded
                  hideFetchButton
                  placeholder="Search roles…"
                  aria-label="Filter by role"
                />
              </div>
            )}

            <div className="um-filter-dropdown">
              <SearchableDropdown
                id="um-status-filter"
                label=""
                allLabel={STATUS_FILTER_OPTIONS.find((s) => s.value === "all")?.label || "All Statuses"}
                options={STATUS_FILTER_OPTIONS.filter((s) => s.value !== "all").map((s) => ({
                  id: s.value,
                  label: s.label,
                }))}
                value={status}
                onChange={setStatus}
                aria-label="Filter by status"
              />
            </div>

            <span className="um-result-count">{total} users</span>
          </div>
        </div>

        {error && <div className="um-error-banner">{error}</div>}

        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th className="um-col-num">#</th>
                <th>User ID</th>
                <th className="um-col-left">Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="um-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="um-state-cell">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="um-state-cell">
                    No users match your search or filters.
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id ?? user.user_id}>
                    <td className="um-col-num">{(page - 1) * limit + idx + 1}</td>
                    <td>
                      <span className="um-user-id">{user.user_id}</span>
                    </td>
                    <td className="um-user-email">{user.email || "—"}</td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <StatusPill status={user.status} />
                    </td>
                    <td>
                      <div className="um-actions">
                        <button
                          type="button"
                          className="um-icon-btn"
                          title="Edit user"
                          aria-label={`Edit ${user.user_id}`}
                          onClick={() => openEditModal(user)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="um-icon-btn um-icon-btn-key"
                          title="Change password"
                          aria-label={`Change password for ${user.user_id}`}
                          onClick={() => openPasswordModal(user)}
                        >
                          <KeyIcon />
                        </button>
                        <button
                          type="button"
                          className="um-icon-btn um-icon-btn-danger"
                          title="Delete user"
                          aria-label={`Delete ${user.user_id}`}
                          onClick={() => openDeleteModal(user)}
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

        <div className="um-pagination">
          <span className="um-pagination-summary">
            {total === 0 ? "No results" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
          </span>

          <div className="um-pagination-controls">
            <label className="um-per-page">
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
              className="um-page-nav"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="um-page-current">{page}</span>
            <button
              type="button"
              className="um-page-nav"
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