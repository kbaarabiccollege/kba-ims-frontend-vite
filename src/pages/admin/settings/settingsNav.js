// src/pages/admin/settings/settingsNav.js
//
// Single source of truth for what's in Settings. Both SettingsSidebar
// (left-hand nav list) and SettingsHome (landing grid) read from this,
// so adding a new setting later is a one-place change.

import { BatchesIcon, TimetableIcon } from "../../../components/common/Icons";

export const SETTINGS_SECTIONS = [
  {
    title: "Academics",
    items: [
      {
        key: "batches",
        label: "Batches",
        description: "Create and manage batches/sections for your institute.",
        icon: BatchesIcon,
        path: "batches",
      },
      {
        key: "timetable-format",
        label: "Timetable Format",
        description: "Configure periods, timings, and the weekly timetable layout.",
        icon: TimetableIcon,
        path: "timetable-format",
      },
    ],
  },
];