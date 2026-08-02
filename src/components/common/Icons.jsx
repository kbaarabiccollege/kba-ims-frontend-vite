// src/components/common/Icons.jsx
//
// Small stroke-based icon set, styled to match the icons already used
// on LoginPage.jsx (currentColor, strokeWidth ~1.75, rounded caps).
// Replaces the emoji action icons (✏️ 🔑 🗑️) which didn't fit the
// dark/light theme, and provides the eye / eye-off toggle used on
// password fields across the Users page.

export const EditIcon = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
  
  export const KeyIcon = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.6 12.4 20 3" />
      <path d="M16 7l3 3" />
      <path d="M13 4l3 3" />
    </svg>
  );
  
  export const TrashIcon = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-.9 14a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
  
  export const EyeIcon = (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  
  export const EyeOffIcon = (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  export const ArrowRightIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );

// src/pages/settings/icons.jsx
//
// Self-contained icon set for the Settings feature. Kept local to this
// folder for now — if you've already pulled the shared icon set into
// src/components/common/icons.jsx, move these in alongside it and
// import from there instead.

export const ArrowLeftIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ChevronRightIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const BatchesIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

export const TimetableIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="7.5" y1="13" x2="10.5" y2="13" />
    <line x1="13.5" y1="13" x2="16.5" y2="13" />
    <line x1="7.5" y1="17" x2="10.5" y2="17" />
  </svg>
);

export const AllSettingsIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const FilterFunnelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5h16l-6.2 7.2v5.3l-3.6 2V12.2L4 5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

export const IconPersonal = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5 19c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const IconOther = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 6h11M8 12h11M8 18h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="4.2" cy="6" r="1.2" fill="currentColor" />
    <circle cx="4.2" cy="12" r="1.2" fill="currentColor" />
    <circle cx="4.2" cy="18" r="1.2" fill="currentColor" />
  </svg>
);

export const IconCap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 4.5 2.5 9 12 13.5 21.5 9 12 4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M6 11v4.2c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21.5 9v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconFamily = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8.5" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16" cy="8.6" r="2.1" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3.5 19c0.9-3.3 2.9-5 5-5s4.1 1.7 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M13.8 14.4c2 .2 3.6 1.8 4.3 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconAddress = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 21s7-6.1 7-11.6A7 7 0 0 0 5 9.4C5 14.9 12 21 12 21Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9.4" r="2.4" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconAdmission = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="8.3" cy="11" r="1.7" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5.8 15.3c.5-1.4 1.4-2.1 2.5-2.1s2 .7 2.5 2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M14 9.5h4M14 12.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const IconLinks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9.5 14.5 14.5 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path
      d="M8.2 15.8 6 18a3 3 0 0 1-4.2-4.2l3-3A3 3 0 0 1 9 10.2"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M15.8 8.2 18 6a3 3 0 1 1 4.2 4.2l-3 3A3 3 0 0 1 15 13.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.6l1.7 2h7.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 3.5 17.5v-11Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const  PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const ExternalLinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 5h5v5M19 5l-8 8M8 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ---- tiny inline icons for the bottom quick-stats strip ----
export const IconClassroom = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 18h18M3 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconBatch = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 18c.5-2.8 2.4-4.5 5-4.5s4.5 1.7 5 4.5M14.5 18c.4-2 1.6-3.4 3.5-3.4s3 1.2 3.4 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconUserId = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 19c.7-3.4 3.3-5.4 7-5.4s6.3 2 7 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconChevronRight = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);