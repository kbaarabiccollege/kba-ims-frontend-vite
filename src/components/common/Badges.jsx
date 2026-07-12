// src/components/common/Badges.jsx

import { roleLabel, statusLabel } from "../../pages/superadmin/users/constants";

export const RoleBadge = ({ role }) => (
  <span className={`um-badge um-role-${role}`}>{roleLabel(role)}</span>
);

export const StatusPill = ({ status }) => (
  <span className={`um-status-pill um-status-${status}`}>
    <span className="um-status-dot" />
    {statusLabel(status)}
  </span>
);