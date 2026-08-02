// src/components/common/ToastContainer.jsx
//
// Presentational only — rendered once by ToastProvider. You shouldn't
// need to import this directly anywhere else; use useToast() instead.

import "../../styles/Toast.css";

const ICONS = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

const ToastContainer = ({ toasts, onDismiss, position = "top-right" }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={`toast-viewport toast-viewport-${position}`} role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-${t.type}`}
          role={t.type === "error" ? "alert" : "status"}
          aria-live={t.type === "error" ? "assertive" : "polite"}
        >
          <span className="toast-icon" aria-hidden="true">
            {ICONS[t.type] || ICONS.info}
          </span>
          <span className="toast-message">{t.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;