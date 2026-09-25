// src/pages/superadmin/additional-class/helpers.js
// Shared constants + formatters for the Additional Class module.

export const CLASS_TYPE_OPTIONS = [
    { id: "extra", label: "Extra" },
    { id: "makeup", label: "Makeup" },
  ];
  
  // API sends midnight UTC — format in UTC so the day never shifts.
  export const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : "—";
  
  export const fmtTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  
  export const fmtShortDate = (ymd) => (ymd ? fmtDate(`${ymd}T00:00:00.000Z`) : "");
  
  export const labelFor = (options, id) =>
    options.find((o) => String(o.id) === String(id))?.label;
  
  export const typeLabel = (t) => CLASS_TYPE_OPTIONS.find((o) => o.id === t)?.label ?? t ?? "—";