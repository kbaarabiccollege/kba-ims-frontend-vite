// src/hooks/useListPageKit.js

// List-page hook kit: the generic list-state manager (search, filters,
// pagination, selection, fetch lifecycle) plus the role-aware nav
// helper. Merged into one file since every list page pulls in both.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useDebouncedValue from "./useDebouncedValue";

// fetchFn signature: (params) => Promise<{ data, pagination: { total } }>
// where params = { q, page, limit, ...filters }
export function useListPage({
  fetchFn,
  initialFilters = {},
  initialLimit = 25,
  searchDebounceMs = 400,
}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, searchDebounceMs);

  const [filters, setFilters] = useState(initialFilters);
  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchFn({ q: debouncedSearch, page, limit, ...filters });
      setItems(res?.data ?? []);
      setTotal(res?.pagination?.total ?? (res?.data ?? []).length);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load the list. Please try again in a moment.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, debouncedSearch, page, limit, JSON.stringify(filters)]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset to page 1 whenever search/filters change (not page/limit themselves)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, JSON.stringify(filters)]);

  // Clear selection whenever the underlying page of items changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const allOnPageSelected = items.length > 0 && selectedIds.size === items.length;
  const someOnPageSelected = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds(allOnPageSelected ? new Set() : new Set(items.map((i) => i.id)));
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  return {
    items, total, page, setPage, limit, setLimit,
    loading, error, refreshing, handleRefresh,
    search, setSearch, debouncedSearch,
    filters, setFilter, setFilters,
    selectedIds, setSelectedIds, toggleSelectAll, toggleSelectOne,
    allOnPageSelected, someOnPageSelected,
    totalPages, rangeStart, rangeEnd,
    refetch: fetchItems,
  };
}

// Resolves the role-aware base path (/admin vs /superadmin) and hands
// back navigate helpers for a module's create/view/edit routes.
const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

export function useModuleNav(moduleSegment) {
  const navigate = useNavigate();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";

  return {
    basePath,
    goToCreate: () => navigate(`${basePath}/${moduleSegment}/new`),
    goToView: (item) => navigate(`${basePath}/${moduleSegment}/${item.id}`),
    goToEdit: (item) => navigate(`${basePath}/${moduleSegment}/${item.id}/edit`),
  };
}