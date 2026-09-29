// src/pages/admin/students/components/BulkActionsModal.jsx
//
// One modal, three modes, driven by the `action` prop:
//   - "update"     -> "Bulk Update" button: Zoho-Books-style single-field
//                     update. Field 1 picks WHICH field to change (Batch,
//                     Academic Status, Hostel, Madhab, Year of Joining,
//                     Madras Course, Madras Joining Year); Field 2's input
//                     type (dropdown vs text/number) follows whichever
//                     field was picked. Only that one field is sent as a
//                     real value — studentsApi.bulkUpdateStudents fills
//                     every other field as null, per the PATCH
//                     /students/bulk contract.
//                     Classroom is intentionally NOT offered here — use
//                     the separate "Promote Class" action for that.
//                     Status is intentionally NOT included here either —
//                     it's handled by "Mark as Active" / "Mark as
//                     Inactive" below.
//   - "activate"   -> "Mark as Active" button: simple confirm.
//   - "deactivate" -> "Mark as Inactive" button: simple confirm.
//
// NOTE on Madhab: no madhab-list API was provided in the spec, so the
// options below are a placeholder set matching the sample payload
// (madhab_id). Swap MADHAB_OPTIONS for a real fetched list once that
// endpoint exists.
// NOTE on Academic Status: no enum was provided in the spec either;
// the options below are a reasonable placeholder — adjust to match the
// backend's actual values.

import { useState } from "react";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";
import Modal from "../../../../components/common/Modal";
import { BulkStatusConfirmModal } from "../../../../components/common/ListPageModals";

const MADHAB_OPTIONS = [
  { id: 1, label: "Hanafi" },
  { id: 2, label: "Shafi'i" },
  { id: 3, label: "Maliki" },
  { id: 4, label: "Hanbali" },
];

const ACADEMIC_STATUS_OPTIONS = [
  { id: "studying", label: "Studying" },
  { id: "graduated", label: "Graduated" },
  { id: "discontinued", label: "Discontinued" },
  { id: "on_leave", label: "On Leave" },
];

const HOSTEL_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

// Every field the "Bulk Update" mode can touch. `type` decides what
// Field 2 renders:
//   "async-dropdown" -> SearchableDropdown backed by a live search (Batch)
//   "dropdown"        -> SearchableDropdown over a fixed option list
//   "number" / "text" -> plain <input>
const FIELD_DEFS = [
  { id: "batch_id", label: "Batch", type: "async-dropdown" },
  { id: "academic_status", label: "Academic Status", type: "dropdown", options: ACADEMIC_STATUS_OPTIONS },
  { id: "is_hostel", label: "Hostel Student", type: "dropdown", options: HOSTEL_OPTIONS },
  { id: "madhab_id", label: "Madhab", type: "dropdown", options: MADHAB_OPTIONS },
  { id: "yoj", label: "Year of Joining", type: "number" },
  { id: "madras_course", label: "Madras Course", type: "text" },
  { id: "madras_joining_year", label: "Madras Joining Year", type: "number" },
];

const FIELD_SELECT_OPTIONS = FIELD_DEFS.map((f) => ({ id: f.id, label: f.label }));

const BulkActionsModal = ({
  action, // 'update' | 'activate' | 'deactivate'
  count,
  batchOptions,
  batchesIndex,
  batchesLoading,
  batchesLoaded,
  onFetchBatches,
  onClose,
  onConfirm, // (changes) => void   — changes is {} for activate/deactivate
  submitting,
  error,
}) => {
  // Which field is being updated (a FIELD_DEFS id), and its new value.
  // `value` is always kept as a string from the inputs/dropdowns and
  // converted to the right type in handleConfirm.
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [value, setValue] = useState("");

  const isActivate = action === "activate";

  // "activate"/"deactivate" are just a plain confirm — hand off entirely
  // to the shared status-confirm modal instead of duplicating markup here.
  if (action === "activate" || action === "deactivate") {
    return (
      <BulkStatusConfirmModal
        action={action}
        count={count}
        itemLabel="student"
        onClose={onClose}
        onConfirm={() => onConfirm({ status: isActivate ? "active" : "inactive" })}
        submitting={submitting}
        error={error}
      />
    );
  }

  const selectedField = FIELD_DEFS.find((f) => f.id === selectedFieldId) || null;

  const handleFieldChange = (fieldId) => {
    setSelectedFieldId(fieldId === "all" ? "" : fieldId);
    setValue(""); // field 2 always resets when field 1 changes
  };

  // Is there a complete, submittable (field, value) pair right now?
  const canSubmit = (() => {
    if (!selectedField) return false;
    if (selectedField.type === "number" || selectedField.type === "text") {
      return value.trim() !== "";
    }
    // dropdown / async-dropdown
    return value !== "" && value !== "all";
  })();

  const handleConfirm = () => {
    if (!canSubmit || !selectedField) return;

    const changes = {};
    switch (selectedField.type) {
      case "number":
        changes[selectedField.id] = Number(value);
        break;
      case "text":
        changes[selectedField.id] = value.trim();
        break;
      default: // dropdown / async-dropdown
        if (selectedField.id === "is_hostel") {
          changes.is_hostel = value === "yes";
        } else if (selectedField.id === "batch_id" || selectedField.id === "madhab_id") {
          changes[selectedField.id] = Number(value);
        } else {
          changes[selectedField.id] = value;
        }
    }
    onConfirm(changes);
  };

  const renderValueField = () => {
    if (!selectedField) {
      return (
        <SearchableDropdown
          id="bulk-value"
          label=""
          allLabel="Select a field first"
          options={[]}
          value="all"
          onChange={() => {}}
          disabled
        />
      );
    }

    if (selectedField.type === "async-dropdown") {
      // Currently only Batch uses this path.
      return (
        <SearchableDropdown
          id="bulk-value"
          label=""
          allLabel="Select batch"
          options={batchOptions}
          value={value || "all"}
          onChange={(v) => setValue(v === "all" ? "" : v)}
          searchable
          onFetch={onFetchBatches}
          loaded={batchesLoaded}
          loading={batchesLoading}
          hideFetchButton
          selectedLabel={batchesIndex[value]}
          placeholder="Search batches…"
        />
      );
    }

    if (selectedField.type === "dropdown") {
      return (
        <SearchableDropdown
          id="bulk-value"
          label=""
          allLabel="Select value"
          options={selectedField.options}
          value={value || "all"}
          onChange={(v) => setValue(v === "all" ? "" : v)}
        />
      );
    }

    // "number" / "text"
    return (
      <input
        id="bulk-value"
        type={selectedField.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Enter ${selectedField.label.toLowerCase()}`}
      />
    );
  };

  return (
        <Modal
      title="Bulk Update Students"
      onClose={submitting ? () => {} : onClose}
      width={720}
      minHeight={420}
      disableOverlayClose
    >
      <p className="st-modal-subtext">
        This will apply to <strong>{count}</strong> selected student{count === 1 ? "" : "s"}.
      </p>

      {error && <div className="st-error-banner">{error}</div>}

      <div className="st-bulk-form st-bulk-form-grid">
        <div className="st-field">
          <label htmlFor="bulk-field">Field</label>
          <SearchableDropdown
            id="bulk-field"
            label=""
            allLabel="Select field"
            options={FIELD_SELECT_OPTIONS}
            value={selectedFieldId || "all"}
            onChange={handleFieldChange}
          />
        </div>

        <div className="st-field">
          <label htmlFor="bulk-value">Value</label>
          {renderValueField()}
        </div>
      </div>

      <div className="st-modal-actions">
        <button type="button" className="st-btn st-btn-ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button type="button" className="st-btn st-btn-primary" onClick={handleConfirm} disabled={submitting || !canSubmit}>
          {submitting ? "Saving…" : "Update"}
        </button>
      </div>
    </Modal>
  );
};

export default BulkActionsModal;