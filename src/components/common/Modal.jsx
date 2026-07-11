// src/components/common/Modal.jsx
//
// Minimal, dependency-free modal shell. Handles the overlay,
// escape-to-close, and click-outside-to-close so popups across
// the app don't each reimplement it.
//
// Styling lives in Modal.css and is fully self-contained — it does not
// rely on any page's CSS file (AdminUsers.css, AdminBatches.css, etc.)
// so it renders identically, in both themes, no matter which page
// mounts it.

import { useEffect, useRef } from "react";
import "../../styles/Modal.css";

const Modal = ({ title, onClose, children, width = 480 }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <>
    <div className="modal-overlay" onMouseDown={handleOverlayClick}>
      <div
        className="modal-panel"
        style={{ maxWidth: width }}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
    </>
  );
};

export default Modal;