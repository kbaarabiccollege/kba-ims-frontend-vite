// src/api/axiosInstance.js

import axios from "axios";
// console.log("API Base URL:", import.meta.env.VITE_API_BASE_URL);
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Required for httpOnly cookie auth: tells the browser to (a) store
  // Set-Cookie from cross-origin responses (login/logout) and (b) send
  // the cookie back automatically on every subsequent request. Without
  // this, the backend's Set-Cookie header is silently ignored by the
  // browser — login appears to succeed (the response body still has
  // the user object) but no cookie is ever actually stored, so every
  // following request goes out with nothing to authenticate it.
  withCredentials: true,
});

// No request interceptor needed anymore — the browser attaches the
// httpOnly cookie automatically on every request (see withCredentials
// above). JS never sees or sets the token directly; that's the point
// of moving it out of localStorage.

// Response interceptor — catch expired/invalid token responses globally
// and notify the app (interceptors run outside React, so we use a
// custom event instead of calling setState directly). The backend's
// message is forwarded when available, so the modal shows the real
// reason (e.g. "Session expired") instead of a generic string.
//
// Note: no "already dispatched" guard here on purpose. The modal's
// setOpen(true) is idempotent, so re-dispatching while it's already
// open is harmless — but a one-time module-level guard would go
// stale during SPA navigation (no full reload) and permanently
// suppress the modal after the first 401, which was the earlier bug.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    // Don't trigger the global "session expired" modal for:
    // - a failed login attempt itself (wrong credentials)
    // - /auth/me — this is called on every app load just to ASK "am I
    //   logged in?" (the httpOnly cookie can't be read by JS directly).
    //   A 401 here just means "not logged in yet", which is a normal,
    //   expected state on a fresh visit — not an expired session.
    //   AuthContext.fetchCurrentUser() already handles this 401
    //   silently on its own (sets user to null, no popup needed).
    if (status === 401 && !url.includes("/login") && !url.includes("/auth/me")) {
      const message = error?.response?.data?.message || "Access token expired";
      window.dispatchEvent(
        new CustomEvent("auth:session-expired", { detail: { message } })
      );
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;