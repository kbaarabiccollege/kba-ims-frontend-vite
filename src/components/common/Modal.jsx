// src/components/common/Modal.jsx
//
// Minimal, dependency-free modal shell. Handles the overlay,
// escape-to-close, and click-outside-to-close so the three
// users-page popups don't each reimplement it.

import { useEffect, useRef } from "react";

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
    <div className="um-modal-overlay" onMouseDown={handleOverlayClick}>
      <div
        className="um-modal-panel"
        style={{ maxWidth: width }}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="um-modal-header">
          <h2>{title}</h2>
          <button type="button" className="um-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="um-modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;