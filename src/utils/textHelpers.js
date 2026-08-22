// Small text/display-formatting helpers shared across list pages.
// Add more one-off formatters here (truncate, pluralize, etc.) instead
// of spawning a new single-function file each time.

export const initials = (name) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

export const capitalizeFirst = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};