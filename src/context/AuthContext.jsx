// src/context/AuthContext.jsx

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext(null);

// Non-sensitive signal key only — just a timestamp used to tell OTHER
// tabs "something about auth changed, go re-check /auth/me". The real
// token lives only in the httpOnly cookie now; nothing sensitive is
// ever stored in localStorage anymore.
const AUTH_EVENT_KEY = "auth_event";
const broadcastAuthChange = () => {
  localStorage.setItem(AUTH_EVENT_KEY, Date.now().toString());
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Three explicit states instead of a boolean, so "still checking"
  // and "confirmed logged out" are never conflated:
  //   "loading"        -> /auth/me hasn't resolved yet
  //   "authenticated"   -> confirmed logged in, user is populated
  //   "unauthenticated" -> confirmed logged out
  const [authStatus, setAuthStatus] = useState("loading");

  // Ask the server "am I logged in" — the httpOnly cookie is sent
  // automatically by the browser (withCredentials: true in
  // axiosInstance); JS never sees the token itself. /auth/me always
  // returns 200 now, with authenticated: true/false — so the catch
  // block here only covers genuine network failures, not "not logged
  // in" (which is a normal 200 response).
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/auth/me");
      if (res.data?.authenticated && res.data?.user) {
        setUser(res.data.user);
        setAuthStatus("authenticated");
      } else {
        setUser(null);
        setAuthStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setAuthStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Called after a successful POST /auth/login response. The server
  // has already set the cookie via Set-Cookie — there's no token for
  // this function to store anymore, just the user object for display.
  const login = useCallback((userData) => {
    setUser(userData);
    setAuthStatus("authenticated");
    broadcastAuthChange();
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch {
      // Even if the network call fails, clear local state below so the
      // UI doesn't stay stuck "logged in" — worst case the cookie
      // lingers server-side until it naturally expires.
    }
    setUser(null);
    setAuthStatus("unauthenticated");
    broadcastAuthChange();
  }, []);

  // Cross-tab sync: AUTH_EVENT_KEY changing in another tab means that
  // tab logged in or out. The native "storage" event only fires in
  // OTHER tabs (never the one that made the change), so this can't
  // loop. We re-check /auth/me rather than trusting any stored value,
  // since the actual source of truth (the cookie) isn't in JS's reach.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== AUTH_EVENT_KEY) return;
      fetchCurrentUser();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchCurrentUser]);

  // Derived, backward-compatible booleans — ProtectedRoute/AppRouter
  // already consume these names, so they don't need to change.
  const isAuthenticated = authStatus === "authenticated";
  const initializing = authStatus === "loading";
  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{ user, role, authStatus, isAuthenticated, initializing, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};