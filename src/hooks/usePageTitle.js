// src/hooks/usePageTitle.js
//
// Sets the browser tab title, most-specific segment first, always
// ending in the app name — e.g.:
//   usePageTitle("Users")                    -> "Users | KBA IMS"
//   usePageTitle(["Add New", "Users"])       -> "Add New | Users | KBA IMS"
//   usePageTitle(["Edit", "Users"])          -> "Edit | Users | KBA IMS"
//
// Restores the previous title on unmount so a modal/page that mounts
// briefly (or a fast route change) doesn't leave a stale title behind
// if something else set one in between.

import { useEffect } from "react";

const APP_NAME = "KBA IMS";

export default function usePageTitle(segments) {
  useEffect(() => {
    const previousTitle = document.title;
    const parts = Array.isArray(segments) ? segments : [segments];
    document.title = [...parts, APP_NAME].filter(Boolean).join(" | ");

    return () => {
      document.title = previousTitle;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(segments) ? segments.join("|") : segments]);
}