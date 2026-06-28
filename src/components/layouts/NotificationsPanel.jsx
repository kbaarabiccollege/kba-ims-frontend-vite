// src/components/layouts/NotificationsPanel.jsx
import { useEffect, useRef, useState } from "react";
import { X, Settings, Bell } from "lucide-react";
import "../../styles/notifications.css";

const NotificationsPanel = ({ open, onClose, isMobile }) => {
  const panelRef    = useRef(null);
  const touchStartX = useRef(null);
  const isDragging  = useRef(false);
  const [activeTab, setActiveTab] = useState("all");

  /* ── Close on outside click (desktop) ───────────────────── */
  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile, onClose]);

  /* ── Body scroll lock on mobile ─────────────────────────── */
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, open]);

  /* ── Swipe-right-to-close (mobile only) ─────────────────── */
  useEffect(() => {
    if (!isMobile || !open) return;

    const onTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      isDragging.current  = false;
    };
    const onTouchMove = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.touches[0].clientY -
        (e.touches[0].clientY - e.touches[0].clientY)); // vertical guard
      isDragging.current = true;
      if (dx > 8) e.preventDefault(); // block page scroll during swipe
      if (dy) {};
    };
    const onTouchEnd = (e) => {
      if (!isDragging.current || touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx > 60) {
  panelRef.current?.blur?.();
  handleClose();
} // swipe right → close
      touchStartX.current = null;
      isDragging.current  = false;
    };

    const panel = panelRef.current;
    panel?.addEventListener("touchstart", onTouchStart, { passive: true });
    panel?.addEventListener("touchmove",  onTouchMove,  { passive: false });
    panel?.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      panel?.removeEventListener("touchstart", onTouchStart);
      panel?.removeEventListener("touchmove",  onTouchMove);
      panel?.removeEventListener("touchend",   onTouchEnd);
    };
  }, [isMobile, open, onClose]);

  /* ── Demo notifications data ─────────────────────────────── */
  const allNotifications = [
    // Replace with real data / API call
    // Example shape:
    // { id: 1, message: "New student enrolled.", time: "2 min ago", unread: true, mention: false },
    // { id: 2, message: "Fee payment received.", time: "1 hr ago",  unread: false, mention: false },
    // { id: 3, message: "@you were mentioned in a report.", time: "3 hr ago", unread: true, mention: true },
  ];

  const notifications = activeTab === "mentions"
    ? allNotifications.filter(n => n.mention)
    : allNotifications;

    const handleClose = (e) => {
      // Remove focus from whichever element triggered the close
      if (e?.currentTarget instanceof HTMLElement) {
        e.currentTarget.blur();
      }
    
      onClose();
    };

  return (
    <>
      {/* Backdrop — mobile full-screen, desktop none */}
      {isMobile && (
        <div
          className={`notif-backdrop${open ? " notif-backdrop--visible" : ""}`}
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        ref={panelRef}
        className={`notif-panel${open ? " notif-panel--open" : ""}${isMobile ? " notif-panel--mobile" : ""}`}
        aria-label="Notifications"
        inert={!open}
      >
        {/* ── Header ── */}
        <div className="notif-header">
          <span className="notif-header__title">Notifications</span>
          <div className="notif-header__actions">
            <button
              className="notif-header__icon-btn"
              aria-label="Notification settings"
              title="Notification settings"
            >
              <Settings size={isMobile ? 20 : 16} />
            </button>
            <button
              className="notif-header__icon-btn notif-header__icon-btn--close"
              onClick={handleClose}
              aria-label="Close notifications"
            >
              <X size={isMobile ? 20 : 16} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="notif-tabs">
          <button
            className={`notif-tab${activeTab === "all" ? " notif-tab--active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`notif-tab${activeTab === "mentions" ? " notif-tab--active" : ""}`}
            onClick={() => setActiveTab("mentions")}
          >
            Mentions
          </button>
        </div>

        {/* ── Body ── */}
        <div className="notif-body">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty__illustration" aria-hidden="true">
                <Bell size={48} strokeWidth={1.2} />
              </div>
              <p className="notif-empty__text">
                No notifications at the moment.
              </p>
            </div>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li key={n.id} className={`notif-item${n.unread ? " notif-item--unread" : ""}`}>
                  <div className="notif-item__dot" inert="true" />
                  <div className="notif-item__content">
                    <p className="notif-item__text">{n.message}</p>
                    <span className="notif-item__time">{n.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
};

export default NotificationsPanel;