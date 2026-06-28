// src/components/layouts/Layout.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const MOBILE_BREAKPOINT = 768;
const SWIPE_EDGE_ZONE = 24;   // px from left edge to begin open gesture
const SWIPE_THRESHOLD = 60;   // px drag needed to commit open/close

const Layout = ({ portal }) => {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(
    () => window  .innerWidth < MOBILE_BREAKPOINT
  );

  // Touch tracking refs — no re-renders during drag
  const touchStartX  = useRef(null);
  const touchStartY  = useRef(null);
  const isDragging   = useRef(false);

  /* ── Resize listener ─────────────────────────────────────── */
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Body scroll lock ────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = (isMobile && mobileOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen]);

  /* ── Swipe gestures ──────────────────────────────────────── */
  useEffect(() => {
    if (!isMobile) return;

    const onTouchStart = (e) => {
      const t = e.touches[0];
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
      isDragging.current  = false;

      // Only start open-gesture when touch begins within edge zone
      if (!mobileOpen && t.clientX > SWIPE_EDGE_ZONE) {
        touchStartX.current = null; // discard — not an edge swipe
      }
    };

    const onTouchMove = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);

      // If more vertical than horizontal → let page scroll, ignore
      if (!isDragging.current && dy > Math.abs(dx)) {
        touchStartX.current = null;
        return;
      }
      isDragging.current = true;
      // Prevent page scroll while we handle the horizontal swipe
      if (Math.abs(dx) > 8) e.preventDefault();
    };

    const onTouchEnd = (e) => {
      if (touchStartX.current === null || !isDragging.current) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;

      if (!mobileOpen && dx > SWIPE_THRESHOLD)  setMobileOpen(true);
      if (mobileOpen  && dx < -SWIPE_THRESHOLD) setMobileOpen(false);

      touchStartX.current = null;
      isDragging.current  = false;
    };

    // passive:false needed so we can call preventDefault in touchmove
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: false });
    document.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
    };
  }, [isMobile, mobileOpen]);

  /* ── Handlers ────────────────────────────────────────────── */
  const closeMobile  = useCallback(() => setMobileOpen(false), []);
  const toggleDesktop = useCallback(() => setCollapsed(v => !v), []);
  const toggleMobile  = useCallback(() => setMobileOpen(v => !v), []);

  return (
    <div className="layout-shell">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar portal={portal} collapsed={collapsed} />}

      {/* Mobile drawer + backdrop */}
      {isMobile && (
        <>
          <div
            className={`layout-drawer-backdrop${mobileOpen ? " layout-drawer-backdrop--visible" : ""}`}
            onClick={closeMobile}
            aria-hidden="true"
          />
          <Sidebar
            portal={portal}
            collapsed={false}
            isMobileDrawer
            mobileOpen={mobileOpen}
            onClose={closeMobile}
          />
        </>
      )}

      <div className="layout-body">
        <button
          className="layout-toggle"
          onClick={isMobile ? toggleMobile : toggleDesktop}
          aria-label="Toggle sidebar"
          aria-expanded={isMobile ? mobileOpen : !collapsed}
        >
          <Menu size={20} />
        </button>

        <Header portal={portal} isMobile={isMobile} />

        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;