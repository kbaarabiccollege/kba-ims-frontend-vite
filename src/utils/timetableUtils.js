// src/utils/timetableUtils.js
//
// Small formatting helpers for the Timetable module, kept separate from
// the shared utils/constants.js so they don't clutter that file.

/**
 * Format an ISO date string ("2025-01-11T18:30:00.000Z") as "DD/MM/YYYY"
 * using the date component as stored, WITHOUT shifting it into the
 * browser's local timezone (new Date(str).getDate() etc. would drift by
 * a day depending on the viewer's offset vs. how the backend stored it).
 *
 * NOTE: if your backend stores effective_from/effective_to as a plain
 * DATE column serialized with a timezone offset baked in (e.g. midnight
 * IST stored as the previous day 18:30 UTC), the "date as stored" and
 * the "date the user picked" may differ by one day. If that's the case
 * here, swap the implementation below for one that first converts to
 * "Asia/Kolkata" (or whatever your app's timezone is) before reading
 * the date parts.
 */
export function formatDateDDMMYYYY(isoString) {
    if (!isoString) return "—";
    const datePart = String(isoString).split("T")[0]; // "2025-01-11"
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) return "—";
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Format an effective_from/effective_to pair as "DD/MM/YYYY-DD/MM/YYYY".
   */
  export function formatEffectiveRange(effectiveFrom, effectiveTo) {
    return `${formatDateDDMMYYYY(effectiveFrom)}-${formatDateDDMMYYYY(effectiveTo)}`;
  }
  
  /**
   * Convert an <input type="month"> value ("YYYY-MM") into the
   * "MM-YYYY" format the effective_period filter expects.
   */
  export function monthInputToEffectivePeriod(monthValue) {
    if (!monthValue) return "";
    const [year, month] = monthValue.split("-");
    if (!year || !month) return "";
    return `${month}-${year}`;
  }
  
  /**
   * Convert an "MM-YYYY" effective_period value back into the
   * "YYYY-MM" shape <input type="month"> needs to display it.
   */
  export function effectivePeriodToMonthInput(effectivePeriod) {
    if (!effectivePeriod) return "";
    const [month, year] = effectivePeriod.split("-");
    if (!month || !year) return "";
    return `${year}-${month}`;
  }