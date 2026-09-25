// src/pages/superadmin/additional-class/components/AdditionalClassViewModal.jsx
// Read-only details. Shows the row instantly, then refreshes it via GET /additional-class/:id.

import { useEffect, useState } from "react";
import Modal from "../../../../components/common/Modal";
import { getAdditionalClassById } from "../../../../api/additionalClassApi";
import { fmtDate, fmtTime, typeLabel } from "../helpers";

const AdditionalClassViewModal = ({ row, cell, onClose }) => {
  const [data, setData] = useState(row);

  useEffect(() => {
    let alive = true;
    getAdditionalClassById(row.id)
      .then((res) => alive && res?.data && setData({ ...row, ...res.data }))
      .catch(() => {}); // keep showing the list row on failure
    return () => { alive = false; };
  }, [row]);

  const items = [
    ["Class Type", <span className={`ac-type-badge ac-type-${data.class_type}`}>{typeLabel(data.class_type)}</span>],
    ["Status", data.status ? <span className="ac-status">{data.status}</span> : "—"],
    ["Course", cell.course(data)],
    ["Academic Term", cell.term(data)],
    ["Classroom", cell.classroom(data)],
    ["Subject", cell.subject(data)],
    ["Staff", cell.staff(data)],
    ["Class Date", fmtDate(data.class_date)],
    ["Time", data.start_time ? `${fmtTime(data.start_time)} – ${fmtTime(data.end_time)}` : "—"],
  ];
  if (data.class_type === "makeup") {
    items.push(["Original Class Date", fmtDate(data.original_class_date)]);
    items.push(["Original Period", data.original_period_no ?? "—"]);
  }

  return (
    <Modal title="Additional Class Details" onClose={onClose} width={620}>
      <dl className="ac-detail-grid">
        {items.map(([k, v]) => (
          <div key={k} className="ac-detail">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div className="ac-detail ac-detail-full">
          <dt>Reason</dt>
          <dd>{data.reason || "—"}</dd>
        </div>
      </dl>
      <div className="um-modal-actions">
        <button type="button" className="um-btn um-btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

export default AdditionalClassViewModal;