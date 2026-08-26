// src/components/common/SessionExpiredModal.jsx
//
// Global "session expired" popup. Listens for the "auth:session-expired"
// event dispatched by the axios response interceptor whenever an API
// call comes back with a 401 (invalid/expired token), and prompts the
// user to log in again.
//
// Styling: uses the shared design tokens from index.css (--color-primary,
// --color-error, --radius-md, --shadow-button, etc.) so it automatically
// matches both light and dark theme, same convention LoginPage.jsx uses
// for its own scoped styles. Kept as a single <style> block in this file
// per request, rather than a separate CSS file.

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "../../context/AuthContext";

const SessionExpiredModal = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("Access token expired");
  const { logout } = useAuth();

  useEffect(() => {
    const handleSessionExpired = (e) => {
      if (e?.detail?.message) setMessage(e.detail.message);
      setOpen(true);
    };
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  if (!open) return null;

  const handleLogin = async () => {
    // Awaited so the server has actually cleared the httpOnly cookie
    // before we reload — otherwise the redirect could outrace the
    // network call and the fresh /auth/me check on the login page
    // might still briefly see a valid session.
    await logout();
    // Hard redirect (not useNavigate) so this works regardless of
    // where this component sits relative to the Router, and so the
    // app state / interceptor guard resets cleanly on reload.
    window.location.href = "/login";
  };

  // No-op: overlay click / Escape are disabled below via Modal props,
  // so this only ever fires from the Login button itself.
  return (
    <>
      <style>{`
        .session-expired-icon {
          width: 56px;
          height: 56px;
          margin: 4px auto 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-error-bg);
          border: 1px solid var(--color-error-border);
          color: var(--color-error);
        }

        .session-expired-title {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          margin: 0;
          color: var(--color-input-text);
        }

        .session-expired-text {
          margin: 12px 0 24px;
          line-height: 1.55;
          color: var(--color-input-text);
          opacity: 0.75;
          font-family: var(--font-body);
        }

        .session-expired-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 24px;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--color-primary);
          color: var(--color-white);
          font-family: var(--font-body);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: var(--shadow-button);
          transition: background var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
        }

        .session-expired-btn:hover {
          background: var(--color-primary-hover);
          box-shadow: var(--shadow-button-hover);
        }

        .session-expired-btn:active {
          transform: translateY(1px);
        }
      `}</style>

      <Modal
        header={<h2 className="session-expired-title">Session Expired</h2>}
        onClose={handleLogin}
        width={400}
        hideCloseButton
        disableOverlayClose
      >
        <div style={{ textAlign: "center", padding: "8px 4px" }}>
          <div className="session-expired-icon">
            <LogIn size={24} />
          </div>
          <p className="session-expired-text">
            {message}. Please login again to continue.
          </p>
          <button type="button" className="session-expired-btn" onClick={handleLogin}>
            <LogIn size={16} />
            <span>Login</span>
          </button>
        </div>
      </Modal>
    </>
  );
};

export default SessionExpiredModal;