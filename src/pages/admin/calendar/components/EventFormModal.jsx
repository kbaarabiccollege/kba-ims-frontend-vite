// src/pages/admin/calendar/components/EventFormModal.jsx
//
// "Add Event" modal for the Academic Calendar. Builds the exact
// payload the POST /calendar endpoint expects:
//
//   { calendar_date, event_type, affects_attendance,
//     applies_to_all_classrooms, classroom_ids, title, description, color_id }
//
// classroom_ids is only meaningful (and only sent as non-empty) when
// applies_to_all_classrooms is false.
//
// NOTE: classroom options are fetched from GET /classrooms, matching
// the "Classrooms" section already in the sidebar. If that route
// differs in your backend, adjust `fetchClassrooms()` below — if the
// call fails, the field falls back to a plain comma-separated ID
// input so the form still works.

import { useEffect, useState } from "react";
import axiosInstance from "../../../../api/axiosInstance";
import { COLOR_PALETTE, DEFAULT_COLOR_ID, EVENT_TYPES } from "../../../../utils/calendarConstants";
import { getCalendarEventById } from "../../../../api/calendarApi";

async function fetchClassrooms() {
  const { data } = await axiosInstance.get("/classrooms");
  const list = data?.data ?? data?.classrooms ?? data ?? [];
  return Array.isArray(list) ? list : [];
}

const emptyForm = (defaultDate) => ({
  calendar_date: defaultDate,
  event_type: "HOLIDAY",
  title: "",
  description: "",
  color_id: DEFAULT_COLOR_ID,
  affects_attendance: true,
  applies_to_all_classrooms: true,
  classroom_ids: [],
});

const EventFormModal = ({
  mode = "add",
  defaultDate,
  eventId,
  onClose,
  onSubmit,
  submitting,
  serverError,
  serverFieldErrors = {},
}) => {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() => emptyForm(defaultDate));
  const [classrooms, setClassrooms] = useState([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);
  const [classroomsFailed, setClassroomsFailed] = useState(false);
  const [manualClassroomIds, setManualClassroomIds] = useState("");
  const [eventLoading, setEventLoading] = useState(isEdit);
  const [eventLoadError, setEventLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchClassrooms();
        if (!cancelled) setClassrooms(list);
      } catch {
        if (!cancelled) setClassroomsFailed(true);
      } finally {
        if (!cancelled) setClassroomsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Edit mode: GET /calendar/:id and prefill the form with its data.
  useEffect(() => {
    if (!isEdit || !eventId) return;
    let cancelled = false;
    (async () => {
      setEventLoading(true);
      setEventLoadError("");
      try {
        const res = await getCalendarEventById(eventId);
        const ev = res?.data ?? res;
        if (cancelled || !ev) return;
        setForm({
          calendar_date: (ev.calendar_date || "").slice(0, 10),
          event_type: ev.event_type || "HOLIDAY",
          title: ev.title || "",
          description: ev.description || "",
          color_id: ev.color_id ?? DEFAULT_COLOR_ID,
          affects_attendance: Boolean(ev.affects_attendance),
          applies_to_all_classrooms: Boolean(ev.applies_to_all_classrooms),
          classroom_ids: Array.isArray(ev.classroom_ids) ? ev.classroom_ids : [],
        });
      } catch {
        if (!cancelled) setEventLoadError("Couldn't load this event. Please try again.");
      } finally {
        if (!cancelled) setEventLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, eventId]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleClassroom = (id) => {
    setForm((prev) => {
      const has = prev.classroom_ids.includes(id);
      return {
        ...prev,
        classroom_ids: has ? prev.classroom_ids.filter((c) => c !== id) : [...prev.classroom_ids, id],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const classroomIds = form.applies_to_all_classrooms
      ? []
      : classroomsFailed
      ? manualClassroomIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => (Number.isNaN(Number(s)) ? s : Number(s)))
      : form.classroom_ids;

    onSubmit({
      calendar_date: form.calendar_date,
      event_type: form.event_type,
      affects_attendance: form.affects_attendance,
      applies_to_all_classrooms: form.applies_to_all_classrooms,
      classroom_ids: classroomIds,
      title: form.title.trim(),
      description: form.description.trim(),
      color_id: form.color_id,
    });
  };

  const needsClassroomPicker = !form.applies_to_all_classrooms;

  return (
    <div className="cal-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="cal-modal">
        <div className="cal-modal-header">
          <span className="cal-modal-title">{isEdit ? "Edit Event" : "Add Event"}</span>
          <button type="button" className="cal-modal-close" onClick={onClose} disabled={submitting} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cal-modal-body">
            {serverError && <div className="cal-error-banner">{serverError}</div>}
            {eventLoadError && <div className="cal-error-banner">{eventLoadError}</div>}
            {eventLoading && <div className="cal-classroom-hint">Loading event…</div>}

            <div className="cal-field-row">
              <div className="cal-field">
                <label className="cal-field-label" htmlFor="cal-ev-date">Date</label>
                <input
                  id="cal-ev-date"
                  type="date"
                  required
                  value={form.calendar_date}
                  onChange={(e) => setField("calendar_date", e.target.value)}
                />
                {serverFieldErrors.calendar_date && (
                  <span className="cal-field-error">{serverFieldErrors.calendar_date}</span>
                )}
              </div>

              <div className="cal-field">
                <label className="cal-field-label" htmlFor="cal-ev-type">Event Type</label>
                <select
                  id="cal-ev-type"
                  value={form.event_type}
                  onChange={(e) => setField("event_type", e.target.value)}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {serverFieldErrors.event_type && (
                  <span className="cal-field-error">{serverFieldErrors.event_type}</span>
                )}
              </div>
            </div>

            <div className="cal-field">
              <label className="cal-field-label" htmlFor="cal-ev-title">Title</label>
              <input
                id="cal-ev-title"
                type="text"
                required
                placeholder="e.g. Holiday, Unit Test - Arabic, Parent Meeting…"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
              {serverFieldErrors.title && <span className="cal-field-error">{serverFieldErrors.title}</span>}
            </div>

            <div className="cal-field">
              <label className="cal-field-label" htmlFor="cal-ev-desc">Description</label>
              <textarea
                id="cal-ev-desc"
                placeholder="Add details — timing, venue, syllabus covered, etc."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
              {serverFieldErrors.description && (
                <span className="cal-field-error">{serverFieldErrors.description}</span>
              )}
            </div>

            <div className="cal-field">
              <span className="cal-field-label">Colour</span>
              <div className="cal-color-swatches">
                {COLOR_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`cal-color-swatch${form.color_id === c.id ? " selected" : ""}`}
                    style={{ background: c.hex }}
                    title={c.name}
                    aria-label={c.name}
                    onClick={() => setField("color_id", c.id)}
                  >
                    {form.color_id === c.id ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            <label className="cal-checkbox-row">
              <input
                type="checkbox"
                checked={form.affects_attendance}
                onChange={(e) => setField("affects_attendance", e.target.checked)}
              />
              This event affects attendance
            </label>

            <label className="cal-checkbox-row">
              <input
                type="checkbox"
                checked={form.applies_to_all_classrooms}
                onChange={(e) => setField("applies_to_all_classrooms", e.target.checked)}
              />
              Applies to all classrooms
            </label>

            {needsClassroomPicker && (
              <div className="cal-field">
                <span className="cal-field-label">Classrooms</span>
                {classroomsLoading ? (
                  <span className="cal-classroom-hint">Loading classrooms…</span>
                ) : classroomsFailed ? (
                  <>
                    <input
                      type="text"
                      placeholder="Classroom IDs, comma separated e.g. 1, 2, 3"
                      value={manualClassroomIds}
                      onChange={(e) => setManualClassroomIds(e.target.value)}
                    />
                    <span className="cal-classroom-hint">
                      Couldn't load the classroom list — enter classroom IDs directly.
                    </span>
                  </>
                ) : classrooms.length === 0 ? (
                  <span className="cal-classroom-hint">No classrooms found.</span>
                ) : (
                  <div className="cal-classroom-list">
                    {classrooms.map((room) => {
                      const id = room.id ?? room.classroom_id;
                      const label = room.name ?? room.classroom_name ?? `Classroom ${id}`;
                      const selected = form.classroom_ids.includes(id);
                      return (
                        <button
                          type="button"
                          key={id}
                          className={`cal-classroom-chip${selected ? " selected" : ""}`}
                          onClick={() => toggleClassroom(id)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {serverFieldErrors.classroom_ids && (
                  <span className="cal-field-error">{serverFieldErrors.classroom_ids}</span>
                )}
              </div>
            )}
          </div>

          <div className="cal-modal-footer">
            <button type="button" className="cal-btn cal-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="cal-btn cal-btn-primary" disabled={submitting || eventLoading}>
              {submitting ? "Saving…" : isEdit ? "Update Event" : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;