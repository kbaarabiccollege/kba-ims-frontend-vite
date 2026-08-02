// src/pages/admin/students/StudentView.jsx
//
// Read-only profile view for a single student (the eye icon on the
// Students list). Fetches via GET /api/students/:id and renders it as
// a sidebar profile (photo, name, quick pills, section nav) next to a
// detail card, with a persistent quick-stats strip along the bottom —
// matching the "Student Profile" screen design.
//
// Route wiring (app router, not included here):
//   <Route path="/admin/students/:id" element={<StudentView />} />

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getStudent } from "../../../api/studentsApi";
import { getBatches } from "../../../api/batchesApi";
import { getClassroom } from "../../../api/classroomsApi";
import { getClassrooms } from "../../../api/classroomsApi";
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  RELIGION_OPTIONS,
  CASTE_OPTIONS,
  SOCIAL_CATEGORY_OPTIONS,
  MADHAB_OPTIONS,
  ACADEMIC_STATUS_OPTIONS,
  ADDRESS_TYPES,
  optionLabel,
} from "./constants";
import {
  EditIcon,
  ExternalLinkIcon,
  IconPersonal,
  IconOther,
  IconCap,
  IconFamily,
  IconAddress,
  IconAdmission,
  IconLinks,
} from "../../../components/common/Icons";
import "../../../styles/Students.css";
import "../../../styles/StudentForm.css";
import "../../../styles/StudentView.css";

const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

// Left-hand profile nav. "personal" bundles Personal Information + Other
// details together (as in the design), everything else is its own pane.
const SECTIONS = [
  { key: "personal", label: "Personal Details", Icon: IconPersonal },
  { key: "academic", label: "Academic Details", Icon: IconCap },
  { key: "family", label: "Family Details", Icon: IconFamily },
  { key: "address", label: "Address", Icon: IconAddress },
  { key: "qualifications", label: "Qualification", Icon: IconCap },
  { key: "admission", label: "Admission Details", Icon: IconAdmission },
  { key: "links", label: "Related Links", Icon: IconLinks },
];

const initials = (name) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatMoney = (v) =>
  v === null || v === undefined || v === "" ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

// A single label/value pair, used throughout the read-only grids below.
const Field = ({ label, value, span }) => (
  <div className={`sv-field${span ? " sf-span-2" : ""}`}>
    <dt className="sv-field-label">{label}</dt>
    <dd className="sv-field-value">{value || value === 0 ? value : "—"}</dd>
  </div>
);

const Pill = ({ tone = "neutral", children }) => (
  <span className={`sv-pill sv-pill-${tone}`}>{children}</span>
);

// Generic label-rows x entity-columns comparison table, used for
// Family / Address / Qualification sections (e.g. Father vs Mother,
// Permanent vs Current address, SSLC vs HSC).
const DetailTable = ({ rows, columns }) => (
  <div className="sv-table-wrap">
    <table className="sv-table">
      <thead>
        <tr>
          <th scope="col" />
          {columns.map((col) => (
            <th scope="col" key={col.key}>
              {col.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            {columns.map((col) => {
              const val = col.data ? col.data[row.key] : undefined;
              return <td key={col.key}>{val || val === 0 ? val : "—"}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Small heading used above each detail block ("Personal Information",
// "Other details", ...) — icon + title, per the design.
const SectionHeading = ({ Icon, children }) => (
  <h3 className="sv-section-heading">
    {Icon && <Icon />}
    <span>{children}</span>
  </h3>
);

// Collapsible sub-section used inside each detail pane (e.g. "Personal
// Information" / "Other details"). The first accordion of a pane opens
// by default; the rest start closed until tapped.
const Accordion = ({ id, Icon, title, defaultOpen, openPanels, setOpenPanels, children }) => {
  const isOpen = openPanels[id] ?? defaultOpen;
  const toggle = () =>
    setOpenPanels((prev) => ({ ...prev, [id]: !(prev[id] ?? defaultOpen) }));
  return (
    <section className="sf-section sv-accordion">
      <button type="button" className="sv-accordion-header" onClick={toggle} aria-expanded={isOpen}>
        <span className="sv-section-heading sv-accordion-heading">
          {Icon && <Icon />}
          <span>{title}</span>
        </span>
        <span className={`sv-accordion-chevron${isOpen ? " sv-accordion-chevron-open" : ""}`}>
          <IconChevronRight />
        </span>
      </button>
      {isOpen && <div className="sv-accordion-body">{children}</div>}
    </section>
  );
};

// ---- tiny inline icons for the bottom quick-stats strip ----
const IconClassroom = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 18h18M3 10V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconBatch = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 18c.5-2.8 2.4-4.5 5-4.5s4.5 1.7 5 4.5M14.5 18c.4-2 1.6-3.4 3.5-3.4s3 1.2 3.4 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconUserId = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 19c.7-3.4 3.3-5.4 7-5.4s6.3 2 7 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconHostel = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 21V6l8-3 8 3v15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 21v-5h6v5M9 10h.01M15 10h.01M9 14h.01M15 14h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StatItem = ({ Icon, label, value, className = "" }) => (
  <div className={`sv-stat-item${className ? ` ${className}` : ""}`}>
    <span className="sv-stat-icon">
      <Icon />
    </span>
    <div className="sv-stat-text">
      <span className="sv-stat-label">{label}</span>
      <span className="sv-stat-value">{value || value === 0 ? value : "—"}</span>
    </div>
  </div>
);

const StudentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("personal");
  const [openPanels, setOpenPanels] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);

  // Resolve batch_id -> batch_name for the quick-stats strip, the same
  // way StudentForm's SearchableDropdown does.
  const [batchesIndex, setBatchesIndex] = useState({});

  // Single classroom record, resolved from personal_details.classroom_id
  // via GET /api/classrooms/:id.
  const [classroom, setClassroom] = useState(null);

  // Resolve classroom_id -> classroom name for the quick-stats strip,
  // the same way batches are resolved below.
  const [classroomsIndex, setClassroomsIndex] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getStudent(id);
        if (!cancelled) setData(res?.data || null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Couldn't load this student. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getBatches({ limit: 100 });
        const list = res?.data ?? [];
        if (cancelled) return;
        const index = {};
        list.forEach((b) => {
          index[b.id] = b.batch_name;
        });
        setBatchesIndex(index);
      } catch {
        // quick-stats batch label just falls back to "—"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const classroomId = data?.personal_details?.classroom_id ?? data?.classroom_id;

  useEffect(() => {
    let cancelled = false;
    if (!classroomId) {
      setClassroom(null);
      return undefined;
    }
    (async () => {
      try {
        const res = await getClassroom(classroomId);
        if (!cancelled) setClassroom(res?.data || null);
      } catch {
        if (!cancelled) setClassroom(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getClassrooms({ isActive: null });
        const list = res?.data ?? [];
        if (cancelled) return;
        const index = {};
        list.forEach((c) => {
          index[c.id] = c.name;
        });
        setClassroomsIndex(index);
      } catch {
        // quick-stats classroom label just falls back to "—"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="st-page">
        <div className="st-card">
          <div className="st-form-placeholder">Loading student…</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="st-page">
        <div className="st-page-header">
          <div className="st-title-block">
            <h1>Student Not Found</h1>
          </div>
          <button type="button" className="st-btn st-btn-ghost" onClick={() => navigate(`${basePath}/students`)}>
            ← Back to Students
          </button>
        </div>
        {error && <div className="st-error-banner">{error}</div>}
      </div>
    );
  }

  const p = data.personal_details || {};
  const acc = data.account || {};
  const other = data.other_details || {};
  const academic = data.academic_details || {};
  const family = data.family_details || {};
  const addresses = data.address || [];
  const qualifications = data.qualifications || [];
  const extraQualifications = data.extra_qualifications || [];
  const admission = data.admission_details || {};
  const relatedLinks = data.related_links || [];

  const isActive = (acc.status || "").toLowerCase() === "active";
  const photoOk = Boolean(p.photo_url && /^https?:\/\//.test(p.photo_url));

  const batchLabel = batchesIndex[p.batch_id] || (p.batch_id ? `Batch #${p.batch_id}` : "—");
  const classroomLabel =
    classroom?.name || (p.classroom_id ? `Classroom #${p.classroom_id}` : "—");

  return (
    <div className="st-page sf-page">
      <div className="sv-layout">
        {/* ---------------- Sidebar: photo, name, pills, section nav ---------------- */}
        <aside className="st-card sv-sidebar">
          <div className="sv-sidebar-actions">
            <button type="button" className="st-btn st-btn-ghost" onClick={() => navigate(`${basePath}/students`)}>
              ← Back
            </button>
            <button
              type="button"
              className="st-btn st-btn-primary"
              onClick={() => navigate(`${basePath}/students/${id}/edit`)}
            >
              <EditIcon />
              <span>Edit</span>
            </button>
          </div>
          <div
            className="sv-sidebar-photo"
            role="button"
            tabIndex={0}
            aria-label={`Preview photo of ${p.name}`}
            onClick={() => setPreviewOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setPreviewOpen(true);
              }
            }}
          >
            {photoOk ? (
              <img
                src={p.photo_url}
                alt={p.name}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div className="sv-sidebar-photo-fallback" style={{ display: photoOk ? "none" : "flex" }}>
              {initials(p.name)}
            </div>
          </div>

          <h2 className="sv-sidebar-name">{p.name || "—"}</h2>

          <div className="sv-pill-row sv-pill-row-center">
            <Pill tone={isActive ? "success" : "muted"}>{isActive ? "Active" : "Inactive"}</Pill>
            {admission.hafiz ? <Pill tone="info">Hafiz</Pill> : null}
            {other.is_orphan ? <Pill tone="warn">Orphan</Pill> : null}
          </div>

          <div className="sv-sidebar-quickstats">
            <div className="sv-sidebar-quickstat">
              <span className="sv-sidebar-quickstat-icon">
                <IconUserId />
              </span>
              <div className="sv-sidebar-quickstat-text">
                <span className="sv-sidebar-quickstat-label">User Id</span>
                <span className="sv-sidebar-quickstat-value">{acc.user_id || "—"}</span>
              </div>
            </div>
            <div className="sv-sidebar-quickstat">
              <span className="sv-sidebar-quickstat-icon">
                <IconCap />
              </span>
              <div className="sv-sidebar-quickstat-text">
                <span className="sv-sidebar-quickstat-label">Academic Status</span>
                <span className="sv-sidebar-quickstat-value">
                  {optionLabel(ACADEMIC_STATUS_OPTIONS, p.academic_status) || "—"}
                </span>
              </div>
            </div>
          </div>

          <nav className="sv-side-nav" role="tablist">
            {SECTIONS.map((s) => (
              <button
                type="button"
                key={s.key}
                role="tab"
                aria-selected={activeSection === s.key}
                className={`sv-side-nav-item${activeSection === s.key ? " sv-side-nav-item-active" : ""}`}
                onClick={() => setActiveSection(s.key)}
              >
                <s.Icon />
                <span>{s.label}</span>
                <span className="sv-side-nav-chevron">
                  <IconChevronRight />
                </span>
              </button>
            ))}
          </nav>

          <nav className="sv-side-nav-scroll" role="tablist">
            {SECTIONS.map((s) => (
              <button
                type="button"
                key={s.key}
                role="tab"
                aria-selected={activeSection === s.key}
                className={`sv-side-nav-scroll-item${
                  activeSection === s.key ? " sv-side-nav-scroll-item-active" : ""
                }`}
                onClick={() => setActiveSection(s.key)}
              >
                <s.Icon />
                <span>{s.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ---------------- Main: active section detail + bottom stats ---------------- */}
        <div className="sv-main">
          <div className="st-card sf-card sv-detail-card">
            <div className="sf-body">
              {activeSection === "personal" && (
                <>
                  <Accordion
                    id="personal-info"
                    Icon={IconPersonal}
                    title="Personal Information"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="Name" value={p.name} />
                      <Field label="Email" value={acc.email} />
                      <Field label="Roll Number" value={p.roll_number} />
                      <Field label="Date of Birth" value={formatDate(p.dob)} />
                      <Field label="Gender" value={optionLabel(GENDER_OPTIONS, p.gender)} />
                      <Field label="Blood Group" value={optionLabel(BLOOD_GROUP_OPTIONS, p.blood_group)} />
                      <Field label="Mother Tongue" value={p.mother_tongue} />
                      <Field label="Mobile Number" value={p.mobile_number} />
                      <Field label="Hostel" value={p.is_hostel ? "Yes" : "No"} />
                    </dl>
                  </Accordion>

                  <Accordion
                    id="other-details"
                    Icon={IconOther}
                    title="Other details"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="Religion" value={optionLabel(RELIGION_OPTIONS, other.religion_id)} />
                      <Field label="Caste" value={optionLabel(CASTE_OPTIONS, other.caste_id)} />
                      <Field
                        label="Social Category"
                        value={optionLabel(SOCIAL_CATEGORY_OPTIONS, other.social_category_id)}
                      />
                      <Field label="Madhab" value={optionLabel(MADHAB_OPTIONS, other.madhab_id)} />
                      <Field label="Orphan" value={other.is_orphan ? "Yes" : "No"} />
                      <Field label="Aadhar Number" value={other.aadhar_no} />
                      <Field label="Medical Remarks" value={other.medical_remarks} />
                      <Field label="Notes" value={other.notes} />
                    </dl>
                  </Accordion>
                </>
              )}

              {activeSection === "academic" && (
                <>
                  <Accordion
                    id="crescent-info"
                    Icon={IconCap}
                    title="Crescent Info"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid sv-view-grid-compact">
                      <Field label="RRN" value={academic.rrn} />
                      <Field label="University Email" value={academic.univ_email} />
                      <Field label="Year of Joining" value={academic.yoj} />
                      <Field label="Year of Completion" value={academic.yoc} />
                    </dl>
                  </Accordion>

                  <Accordion
                    id="madras-info"
                    Icon={IconCap}
                    title="Madras University Info"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid sv-view-grid-compact">
                      <Field label="Course Name" value={academic.madras_course} />
                      <Field label="Roll No" value={academic.madras_roll_no} />
                      <Field label="Joining Year" value={academic.madras_joining_year} />
                    </dl>
                  </Accordion>
                </>
              )}

              {activeSection === "family" && (
                <Accordion
                  id="family-details"
                  Icon={IconFamily}
                  title="Family Details"
                  defaultOpen
                  openPanels={openPanels}
                  setOpenPanels={setOpenPanels}
                >
                  <DetailTable
                    rows={[
                      { key: "name", label: "Name" },
                      { key: "mobile", label: "Mobile" },
                      { key: "education", label: "Education" },
                      { key: "occupation", label: "Occupation" },
                      { key: "annual_income", label: "Annual Income" },
                    ]}
                    columns={[
                      {
                        key: "father",
                        title: "Father",
                        data: {
                          name: family.father_name,
                          mobile: family.father_mobile,
                          education: family.father_education,
                          occupation: family.father_occupation,
                          annual_income: formatMoney(family.father_annual_income),
                        },
                      },
                      {
                        key: "mother",
                        title: "Mother",
                        data: {
                          name: family.mother_name,
                          mobile: family.mother_mobile,
                          education: family.mother_education,
                          occupation: family.mother_occupation,
                          annual_income: formatMoney(family.mother_annual_income),
                        },
                      },
                    ]}
                  />
                  </Accordion>
              )}

              {activeSection === "family" && (
                <Accordion
                  id="contact-guardian"
                  Icon={IconFamily}
                  title="Contact & Guardian"
                  defaultOpen
                  openPanels={openPanels}
                  setOpenPanels={setOpenPanels}
                >
                  <dl className="sv-view-grid">
                    <Field label="Parent Email" value={family.parent_email} />
                    <Field label="Parent WhatsApp" value={family.parent_whatsapp} />
                    <Field label="Parent SMS Number" value={family.parent_sms} />
                    <Field label="Guardian Name" value={family.guardian_name} />
                    <Field label="Guardian Mobile" value={family.guardian_mobile} />
                    <Field label="Guardian Relationship" value={family.guardian_relationship} />
                    <Field label="Guardian Address" value={family.guardian_address} span />
                  </dl>
                </Accordion>
              )}

              {activeSection === "address" && (
                <section className="sf-section">
                  <SectionHeading Icon={IconAddress}>Address</SectionHeading>
                  <DetailTable
                    rows={[
                      { key: "door_no", label: "Door No" },
                      { key: "street", label: "Street" },
                      { key: "area", label: "Area" },
                      { key: "city", label: "City" },
                      { key: "district", label: "District" },
                      { key: "state", label: "State" },
                      { key: "country", label: "Country" },
                      { key: "pin_code", label: "Pin Code" },
                    ]}
                    columns={ADDRESS_TYPES.map((t) => ({
                      key: String(t.id),
                      title: t.label,
                      data: addresses.find((a) => Number(a.address_type) === t.id) || {},
                    }))}
                  />
                </section>
              )}

              {activeSection === "qualifications" && (
                <Accordion
                  id="qualification"
                  Icon={IconCap}
                  title="Qualification"
                  defaultOpen
                  openPanels={openPanels}
                  setOpenPanels={setOpenPanels}
                >
                  {qualifications.length === 0 ? (
                    <p className="sf-empty-hint">No qualifications recorded.</p>
                  ) : (
                    <DetailTable
                      rows={[
                        { key: "school_name", label: "School Name" },
                        { key: "board", label: "Board" },
                        { key: "medium", label: "Medium" },
                        { key: "passing_year", label: "Passing Year" },
                        { key: "passing_month", label: "Passing Month" },
                        { key: "reg_number", label: "Register Number" },
                        { key: "marks", label: "Marks" },
                        { key: "emis", label: "EMIS Number" },
                        { key: "school_address", label: "School Address" },
                      ]}
                      columns={qualifications.map((q) => ({
                        key: q.level,
                        title: q.level,
                        data: {
                          ...q,
                          marks: q.marks != null ? `${q.marks} / ${q.total_marks ?? "—"}` : "—",
                        },
                      }))}
                    />
                  )}
                </Accordion>
              )}

              {activeSection === "qualifications" && (
                <Accordion
                  id="additional-qualifications"
                  Icon={IconCap}
                  title="Additional Qualifications"
                  defaultOpen
                  openPanels={openPanels}
                  setOpenPanels={setOpenPanels}
                >
                  {extraQualifications.length === 0 ? (
                    <p className="sf-empty-hint">None added.</p>
                  ) : (
                    <ul className="sv-link-list">
                      {extraQualifications.map((q, idx) => (
                        <li key={idx} className="sv-link-row">
                          <span className="sv-link-desc">{q.course_name}</span>
                          {q.cert_url ? (
                            <a href={q.cert_url} target="_blank" rel="noopener noreferrer" className="sv-link-anchor">
                              View certificate <ExternalLinkIcon />
                            </a>
                          ) : (
                            <span className="sv-link-none">No certificate</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Accordion>
              )}

              {activeSection === "admission" && (
                <section className="sf-section">
                  <SectionHeading Icon={IconAdmission}>Admission Details</SectionHeading>
                  <dl className="sv-view-grid sv-view-grid-compact">
                    <Field label="Admission Date" value={formatDate(admission.admission_date)} />
                    <Field label="Entrance Mark" value={admission.entrance_mark} />
                    <Field label="Entrance Rank" value={admission.entrance_rank} />
                    <Field label="Hafiz" value={admission.hafiz ? "Yes" : "No"} />
                    <Field label="Recommended By" value={admission.recommended_by} span />
                  </dl>
                </section>
              )}

              {activeSection === "links" && (
                <section className="sf-section">
                  <SectionHeading Icon={IconLinks}>Related Links</SectionHeading>
                  {relatedLinks.length === 0 ? (
                    <p className="sf-empty-hint">No related links added.</p>
                  ) : (
                    <ul className="sv-link-list">
                      {relatedLinks.map((l, idx) => (
                        <li key={idx} className="sv-link-row">
                          <span className="sv-link-desc">{l.description}</span>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="sv-link-anchor">
                            Open link <ExternalLinkIcon />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </div>

          {/* ---------------- Persistent quick-stats strip ---------------- */}
          <div className="st-card sv-stats-bar">
            <StatItem Icon={IconClassroom} label="Classroom" value={classroomLabel} className="sv-stat-classroom" />
            <StatItem Icon={IconBatch} label="Batch" value={batchLabel} className="sv-stat-batch" />
            <StatItem Icon={IconUserId} label="User ID" value={acc.user_id} className="sv-stat-userid" />
            <StatItem
              Icon={IconCap}
              label="Academic Status"
              value={optionLabel(ACADEMIC_STATUS_OPTIONS, p.academic_status)}
              className="sv-stat-academic"
            />
          </div>
        </div>
      </div>

      {previewOpen && (
        <div
          className="st-modal-overlay st-preview-overlay"
          role="presentation"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="st-preview-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Photo of ${p.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="st-modal-close st-preview-close"
              aria-label="Close preview"
              onClick={() => setPreviewOpen(false)}
            >
              ×
            </button>
            {photoOk ? (
              <img
                className="st-preview-photo"
                src={p.photo_url}
                alt={p.name}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="st-preview-photo-fallback"
              style={{ display: photoOk ? "none" : "flex" }}
            >
              {initials(p.name)}
            </div>
            <div className="st-preview-name">{p.name || "—"}</div>
            <div className="st-preview-roll">{p.roll_number || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;