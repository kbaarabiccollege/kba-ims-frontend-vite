// src/pages/admin/timetable/TimetableViewModal.jsx
//
// Read-only timetable preview shown as a popup from the list page's
// "View" action. Rendered via a React portal directly into
// document.body — this avoids the modal getting visually trapped
///half-clipped inside an ancestor that has its own transform or
// stacking context (a common cause of "ghosting" where page content
// bleeds through a fixed-position overlay).
//
// Since the overlay/panel/table styling relies on CSS custom
// properties that are normally only defined inside ".st-page" (see
// Students.css), and the portal renders outside that DOM subtree, this
// file wraps everything in ".ttv-vars" (TimetableViewModal.css) which
// redeclares just the tokens this modal needs.
//
// DATA SHAPE — matches the real getTimetable(id) response:
//   data.course, data.classroom_id, data.effective_from/to, data.notes,
//   data.is_active
//   data.format.days[]   -> { id, day_order, day_name }
//   data.format.periods[] -> { id, period_order, period_label,
//                               start_time, end_time, is_break, is_lunch }
//   data.slots[]         -> { day_id, period_id, subject_name, staff_name }
// Classroom has no name on this response, so it's passed in as a prop
// (the list page already resolved classroom_id -> name for its table).

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getTimetable } from "../../../api/timetableApi";
import { getCourseLabel } from "../../../utils/constants";
import { formatEffectiveRange } from "../../../utils/timetableUtils";
import "../../../styles/TimetableForm.css";
import "../../../styles/TimetableViewModal.css";

function toTitleCase(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatTimeHM(time) {
  if (!time) return "";
  return String(time).slice(0, 5);
}

function getPeriodType(period) {
  if (period.is_lunch) return "lunch";
  if (period.is_break) return "break";
  return "period";
}

function getTextSizeClass(text) {
  if (!text) return "";
  if (text.length > 18) return "tf-text-xs";
  if (text.length > 12) return "tf-text-sm";
  return "";
}

const TimetableViewModal = ({ timetable, classroomName, onClose }) => {
  const id = timetable?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");

    getTimetable(id)
      .then((res) => {
        if (cancelled) return;
        setDetail(res?.data || null);
      })
      .catch(() => !cancelled && setError("Couldn't load this timetable."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  const days = useMemo(
    () => [...(detail?.format?.days || [])].sort((a, b) => a.day_order - b.day_order),
    [detail]
  );
  const periods = useMemo(
    () => [...(detail?.format?.periods || [])].sort((a, b) => a.period_order - b.period_order),
    [detail]
  );

  const slotsByKey = useMemo(() => {
    const map = {};
    (detail?.slots || []).forEach((slot) => {
      map[`${slot.day_id}::${slot.period_id}`] = slot;
    });
    return map;
  }, [detail]);

  const modalContent = (
    <div className="ttv-vars">
      <div className="st-modal-overlay ttv-overlay" onClick={onClose}>
        <div className="st-modal-panel ttv-panel" onClick={(e) => e.stopPropagation()}>
          <div className="st-modal-header">
            <h2>{timetable?.timetable_name || "Timetable"}</h2>
            <button type="button" className="st-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="st-modal-body ttv-body">
            {loading ? (
              <div className="st-state-cell">Loading timetable…</div>
            ) : error ? (
              <div className="st-error-banner ttv-inset">{error}</div>
            ) : (
              <>
                <div className="ttv-meta">
                  <div className="ttv-meta-item">
                    <span className="ttv-meta-label">Course</span>
                    <span className="ttv-meta-value">{getCourseLabel(detail?.course) || "—"}</span>
                  </div>
                  <div className="ttv-meta-item">
                    <span className="ttv-meta-label">Classroom</span>
                    <span className="ttv-meta-value">{classroomName || "—"}</span>
                  </div>
                  <div className="ttv-meta-item">
                    <span className="ttv-meta-label">Effective</span>
                    <span className="ttv-meta-value">
                      {formatEffectiveRange(detail?.effective_from, detail?.effective_to)}
                    </span>
                  </div>
                  {detail?.notes && (
                    <div className="ttv-meta-item ttv-meta-notes">
                      <span className="ttv-meta-label">Notes</span>
                      <span className="ttv-meta-value">{detail.notes}</span>
                    </div>
                  )}
                  <div className="ttv-meta-item ttv-meta-status">
                    <span className="ttv-meta-label">Status</span>
                    <span
                      className={`ttv-status-pill ${
                        detail?.is_active ? "ttv-status-active" : "ttv-status-inactive"
                      }`}
                    >
                      {detail?.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="tf-panel tf-table-panel ttv-table-panel">
                  {periods.length === 0 || days.length === 0 ? (
                    <div className="st-state-cell">This format has no periods configured.</div>
                  ) : (
                    <div className="tf-table-scroll">
                      <table className="tf-grid-table">
                        <thead>
                          <tr>
                            <th className="tf-day-header">Day / Period</th>
                            {periods.map((p) => {
                              const type = getPeriodType(p);
                              return (
                                <th key={p.id} className={type !== "period" ? "tf-col-break" : ""}>
                                  <div className="tf-period-num">{p.period_label}</div>
                                  <div className="tf-period-time">
                                    {formatTimeHM(p.start_time)} – {formatTimeHM(p.end_time)}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {days.map((day) => (
                            <tr key={day.id}>
                              <td className="tf-day-cell">{toTitleCase(day.day_name)}</td>
                              {periods.map((p) => {
                                const type = getPeriodType(p);
                                if (type !== "period") {
                                  return <td key={p.id} className="tf-col-break" />;
                                }
                                const slot = slotsByKey[`${day.id}::${p.id}`];
                                return (
                                  <td key={p.id}>
                                    {slot ? (
                                      <div
                                        className="tf-period-filled ttv-period-filled"
                                        title={`${slot.subject_name || ""} — ${slot.staff_name || ""}`}
                                      >
                                        {slot.subject_code && (
                                          <span className="tf-period-code">{slot.subject_code}</span>
                                        )}
                                        <span
                                          className={`tf-period-filled-subject ${getTextSizeClass(
                                            slot.subject_name
                                          )}`}
                                        >
                                          {slot.subject_name || "—"}
                                        </span>
                                        <span
                                          className={`tf-period-filled-staff ${getTextSizeClass(
                                            slot.staff_name
                                          )}`}
                                        >
                                          {slot.staff_name || "—"}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="ttv-period-empty">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* <div className="st-modal-actions ttv-footer">
            <button type="button" className="st-btn st-btn-ghost" onClick={onClose}>
              Close
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TimetableViewModal;