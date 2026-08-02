// src/components/common/Badges.jsx

import { roleLabel, statusLabel } from "../../pages/superadmin/users/constants";
import { FolderIcon } from "./Icons";

export const RoleBadge = ({ role }) => (
  <span className={`um-badge um-role-${role}`}>{roleLabel(role)}</span>
);

export const StatusPill = ({ status }) => (
  <span className={`um-status-pill um-status-${status}`}>
    <span className="um-status-dot" />
    {statusLabel(status)}
  </span>
);

export const DriveFolderButton = ({ folderUrl, label }) => (
  <button
    type="button"
    className="sf-drive-btn"
    title={label || "Open Drive folder"}
    aria-label={label || "Open Drive folder"}
    onClick={() => window.open(folderUrl, "_blank", "noopener,noreferrer")}
  >
    <FolderIcon />
  </button>
);