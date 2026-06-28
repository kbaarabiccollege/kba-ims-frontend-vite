// src/components/common/NotFound.jsx

import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── NotFound-specific design tokens ── */
        :root {
          --nf-color-heading:        #18345F;
          --nf-color-secondary-text: #7C8CA8;
          --nf-color-surface:        rgba(248, 250, 252, 0.82);
          --nf-color-surface-border: rgba(255, 255, 255, 0.45);
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* ─────────────────────────────────────────
           ANIMATIONS
        ───────────────────────────────────────── */
        @keyframes nf-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes nf-fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nf-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes nf-pulse-glow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.85; }
        }

        /* ─────────────────────────────────────────
           PAGE CANVAS — full blurred bg
        ───────────────────────────────────────── */
        .nf-page {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Blurred background image ── */
        .nf-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          animation: nf-fadeIn 1s ease both;
        }
        .nf-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: blur(6px) brightness(0.72) saturate(0.85);
          transform: scale(1.04); /* hide blur-edge artifacts */
          display: block;
        }

        /* Dark-blue vignette overlay */
        .nf-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(24, 52, 95, 0.55)  0%,
            rgba(33, 75, 134, 0.35) 50%,
            rgba(24, 52, 95, 0.60) 100%
          );
        }

        /* ── Ambient blobs behind the card ── */
        .nf-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          filter: blur(90px);
          animation: nf-pulse-glow 6s ease-in-out infinite;
        }
        .nf-blob-a {
          width: 500px;
          height: 440px;
          top: -120px;
          right: -80px;
          background: radial-gradient(ellipse, rgba(53, 103, 168, 0.40) 0%, transparent 70%);
          animation-delay: 0s;
        }
        .nf-blob-b {
          width: 380px;
          height: 400px;
          bottom: -100px;
          left: -60px;
          background: radial-gradient(ellipse, rgba(33, 75, 134, 0.30) 0%, transparent 70%);
          animation-delay: 3s;
        }

        /* ─────────────────────────────────────────
           GLASSMORPHISM CARD
        ───────────────────────────────────────── */
        .nf-card {
          position: relative;
          z-index: 10;
          background: rgba(248, 250, 252, 0.82);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 24px;
          padding: 56px 52px 52px;
          width: 100%;
          max-width: 520px;
          margin: 16px;
          text-align: center;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.7) inset,
            0 30px 70px rgba(0, 0, 0, 0.28),
            0 12px 32px rgba(0, 0, 0, 0.18);
          animation: nf-fadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }

        /* Top-edge glass highlight */
        .nf-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 28px;
          right: 28px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent);
        }

        /* ── 404 numeral — the signature element ── */
        .nf-404 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 7rem;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -3px;
          background: linear-gradient(135deg, #214B86 0%, #3567A8 50%, #7BAAD4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 4px;
          animation: nf-float 5s ease-in-out infinite;
          display: inline-block;
        }

        .nf-divider {
          width: 44px;
          height: 2px;
          background: linear-gradient(90deg, #214B86, #7BAAD4);
          border-radius: 2px;
          margin: 16px auto 24px;
          opacity: 0.5;
        }

        /* ── Heading & body copy ── */
        .nf-heading {
          font-family: 'Inter', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #18345F;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .nf-body {
          font-size: 0.875rem;
          color: #7C8CA8;
          line-height: 1.65;
          margin-bottom: 36px;
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ── Go Back button — matches .auth-btn ── */
        .nf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 36px;
          background: #214B86;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 2.8px;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow:
            0 4px 18px rgba(33, 75, 134, 0.32),
            0 1px 0 rgba(255, 255, 255, 0.12) inset;
          transition: background 0.22s, box-shadow 0.22s, transform 0.15s;
        }
        .nf-btn:hover {
          background: #183A6D;
          box-shadow:
            0 8px 28px rgba(33, 75, 134, 0.42),
            0 1px 0 rgba(255, 255, 255, 0.12) inset;
          transform: translateY(-1px);
        }
        .nf-btn:active { transform: translateY(0); }

        .nf-btn-arrow {
          display: inline-flex;
          transition: transform 0.22s;
        }
        .nf-btn:hover .nf-btn-arrow {
          transform: translateX(-4px); /* left arrow goes left */
        }

        /* ── Brand watermark at bottom ── */
        .nf-brand {
          margin-top: 32px;
          font-size: 0.65rem;
          font-weight: 500;
          color: #9AAABF;
          letter-spacing: 3.5px;
          text-transform: uppercase;
        }

        /* ─────────────────────────────────────────
           RESPONSIVE
        ───────────────────────────────────────── */
        @media (max-width: 560px) {
          .nf-card {
            padding: 40px 24px 36px;
            border-radius: 20px;
          }
          .nf-404           { font-size: 5.5rem; }
          .nf-heading       { font-size: 1rem; }
          .nf-btn           { padding: 13px 28px; font-size: 0.71rem; letter-spacing: 2px; }
          .nf-blob-a, .nf-blob-b { display: none; }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .nf-bg, .nf-card           { animation: none; }
          .nf-btn, .nf-btn-arrow     { transition: none; }
          .nf-404                    { animation: none; }
          .nf-blob                   { animation: none; }
        }
      `}</style>

      <div className="nf-page">

        {/* ── Blurred campus background ── */}
        <div className="nf-bg">
          <img
            src="/images/kba_entrance.jpg"
            alt=""
            aria-hidden="true"
          />
        </div>

        {/* ── Ambient glow blobs ── */}
        <div className="nf-blob nf-blob-a" />
        <div className="nf-blob nf-blob-b" />

        {/* ── Glassmorphism card ── */}
        <div className="nf-card" role="main">

          <span className="nf-404" aria-label="404">404</span>

          <div className="nf-divider" />

          <h1 className="nf-heading">Page Not Found</h1>
          <p className="nf-body">
            The page you're looking for doesn't exist or may have been moved.
            Check the URL, or head back to where you came from.
          </p>

          <button className="nf-btn" onClick={() => navigate(-1)}>
            <span className="nf-btn-arrow" aria-hidden="true">
              <ArrowLeftIcon />
            </span>
            Go Back
          </button>

          <p className="nf-brand">IMS Portal</p>

        </div>
      </div>
    </>
  );
};

/* ── SVG Icon ── */
const ArrowLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

export default NotFound;