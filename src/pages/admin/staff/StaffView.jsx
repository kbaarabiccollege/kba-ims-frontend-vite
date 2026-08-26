// src/pages/admin/staff/StaffView.jsx
//
// Read-only profile view for a single staff member (the eye icon on
// the Staff list). Fetches via GET /api/staff/:id and renders it as a
// sidebar profile (photo, name, quick pills, section nav) next to a
// detail card, with a persistent quick-stats strip along the bottom —
// mirrors StudentView.jsx.
//
// Route wiring (app router, not included here):
//   <Route path="/admin/staff/:id" element={<StaffView />} />

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getStaffMember } from "../../../api/staffApi";
import {
  SALUTATION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EMPLOYMENT_NATURE_OPTIONS,
  STAFF_TYPE_OPTIONS,
  EMPLOYMENT_PLACE_OPTIONS,
} from "../../../utils/staffConstants";
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  RELIGION_OPTIONS,
  ADDRESS_ROWS,
  ADDRESS_TYPES,
} from "../../../utils/userConstants";
import {
  PersonIcon,
  BriefcaseIcon,
  GraduationIcon,
  HomeIcon,
  IdCardIcon,
} from "../../../components/common/Icons";
import {
  EditIcon,
  ExternalLinkIcon,
  IconUserId,
  IconChevronRight,
} from "../../../components/common/Icons";
import usePageTitle from "../../../hooks/usePageTitle";
import "../../../styles/UserList.css";
import "../../../styles/StudentForm.css";
import "../../../styles/StudentView.css";

const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

const SECTIONS = [
  { key: "personal", label: "Personal Details", Icon: PersonIcon },
  { key: "employment", label: "Employment Details", Icon: BriefcaseIcon },
  { key: "qualifications", label: "Qualifications", Icon: GraduationIcon },
  { key: "address", label: "Address", Icon: HomeIcon },
  { key: "other", label: "Other Details", Icon: IdCardIcon },
];

// Resolves a stored option value against an options array shaped like
// either {id,label} (SearchableDropdown-ready) or {value,label}
// (raw enum lists), matching whichever key is present.
const optionLabel = (options, val) => {
  if (val === null || val === undefined || val === "") return "";
  const match = (options || []).find((o) => String(o.id ?? o.value) === String(val));
  return match ? match.label : "";
};

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

// A single label/value pair, used throughout the read-only grids below.
const Field = ({ label, value, span }) => (
  <div className={`sv-field${span ? " sf-span-2" : ""}`}>
    <dt className="sv-field-label">{label}</dt>
    <dd className="sv-field-value">{value || value === 0 ? value : "—"}</dd>
  </div>
);

// Same as Field, but renders the value as an "Open" external link when
// a URL is present (aadhar/pan doc URLs).
const LinkField = ({ label, url }) => (
  <div className="sv-field">
    <dt className="sv-field-label">{label}</dt>
    <dd className="sv-field-value">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="sv-link-anchor">
          Open <ExternalLinkIcon />
        </a>
      ) : (
        "—"
      )}
    </dd>
  </div>
);

const Pill = ({ tone = "neutral", children }) => (
  <span className={`sv-pill sv-pill-${tone}`}>{children}</span>
);

// Generic label-rows x entity-columns comparison table (Present vs
// Permanent address here).
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

const SectionHeading = ({ Icon, children }) => (
  <h3 className="sv-section-heading">
    {Icon && <Icon />}
    <span>{children}</span>
  </h3>
);

// Collapsible sub-section used inside each detail pane. The first
// accordion of a pane opens by default; the rest start closed.
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

const StaffView = () => {
  usePageTitle("View Staff");
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getStaffMember(id);
        if (!cancelled) setData(res?.data || null);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Couldn't load this staff member. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const p = data?.personal_details || {};
  const acc = data?.account || {};
  const emp = data?.employment_details || {};
  const qualifications = data?.qualifications || {};
  const addresses = data?.address || [];
  const other = data?.other_details || {};

  const isUniversityEmploymentPlace = useMemo(() => {
    const label = optionLabel(EMPLOYMENT_PLACE_OPTIONS, emp.employment_place);
    return Boolean(label?.trim().toLowerCase() === "university");
  }, [emp.employment_place]);

  if (loading) {
    return (
      <div className="st-page">
        <div className="st-card">
          <div className="st-form-placeholder">Loading staff member…</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="st-page">
        <div className="st-page-header">
          <div className="st-title-block">
            <h1>Staff Not Found</h1>
          </div>
          <button type="button" className="st-btn st-btn-ghost" onClick={() => navigate(`${basePath}/staff`)}>
            ← Back to Staff
          </button>
        </div>
        {error && <div className="st-error-banner">{error}</div>}
      </div>
    );
  }

  const isActive = (acc.status || "").toLowerCase() === "active";
  const photoOk = Boolean(p.photo_url && /^https?:\/\//.test(p.photo_url));

  const designationLabel = emp.designation || "—";
  const employmentPlaceLabel = optionLabel(EMPLOYMENT_PLACE_OPTIONS, emp.employment_place) || "—";
  const staffTypeLabel = optionLabel(STAFF_TYPE_OPTIONS, emp.staff_type) || "—";

  return (
    <div className="st-page sf-page">
      <div className="sv-layout">
        {/* ---------------- Sidebar: photo, name, pills, section nav ---------------- */}
        <aside className="st-card sv-sidebar">
          <div className="sv-sidebar-actions">
            <button type="button" className="st-btn st-btn-ghost" onClick={() => navigate(`${basePath}/staff`)}>
              ← Back
            </button>
            <button
              type="button"
              className="st-btn st-btn-primary"
              onClick={() => navigate(`${basePath}/staff/${id}/edit`)}
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
            {staffTypeLabel !== "—" ? <Pill tone="info">{staffTypeLabel}</Pill> : null}
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
                <BriefcaseIcon />
              </span>
              <div className="sv-sidebar-quickstat-text">
                <span className="sv-sidebar-quickstat-label">Designation</span>
                <span className="sv-sidebar-quickstat-value">{designationLabel}</span>
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
                    Icon={PersonIcon}
                    title="Personal Information"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="Name" value={p.name} />
                      <Field label="Short Name" value={p.short_name} />
                      <Field label="Staff ID" value={p.staff_uid} />
                      <Field label="Salutation" value={optionLabel(SALUTATION_OPTIONS, p.salutation)} />
                      <Field label="Gender" value={optionLabel(GENDER_OPTIONS, p.gender)} />
                      <Field label="Date of Birth" value={formatDate(p.dob)} />
                      <Field label="Blood Group" value={optionLabel(BLOOD_GROUP_OPTIONS, p.blood_group)} />
                      <Field label="Date of Joining" value={formatDate(p.date_of_joining)} />
                      <Field label="Mobile Number" value={p.mobile_number} />
                      <Field label="Emergency Contact" value={p.emergency_contact} />
                      <Field label="Personal Email" value={p.personal_email} />
                      <Field label="Religion" value={optionLabel(RELIGION_OPTIONS, p.religion_id)} />
                      <Field label="Marital Status" value={optionLabel(MARITAL_STATUS_OPTIONS, p.marital_status)} />
                      <Field label="Medical Remarks" value={p.medical_remarks} span />
                    </dl>
                  </Accordion>

                  <Accordion
                    id="account-login"
                    Icon={IdCardIcon}
                    title="Account & Login"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="User ID" value={acc.user_id} />
                      <Field label="Email" value={acc.email} />
                      <Field label="Status" value={isActive ? "Active" : "Inactive"} />
                    </dl>
                  </Accordion>
                </>
              )}

              {activeSection === "employment" && (
                <>
                  <Accordion
                    id="kba"
                    Icon={BriefcaseIcon}
                    title="KBA"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="Staff Type" value={optionLabel(STAFF_TYPE_OPTIONS, emp.staff_type)} />
                      <Field label="Designation" value={emp.designation} />
                      <Field
                        label="Employment Nature"
                        value={optionLabel(EMPLOYMENT_NATURE_OPTIONS, emp.employment_nature)}
                      />
                      <Field label="Experience (Years)" value={emp.experience_years} />
                    </dl>
                  </Accordion>

                  <Accordion
                    id="employment-place"
                    Icon={HomeIcon}
                    title="Employment Place"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="Employment Place" value={optionLabel(EMPLOYMENT_PLACE_OPTIONS, emp.employment_place)} />
                    </dl>
                  </Accordion>

                  {isUniversityEmploymentPlace && (
                    <Accordion
                      id="university"
                      Icon={GraduationIcon}
                      title="University"
                      defaultOpen
                      openPanels={openPanels}
                      setOpenPanels={setOpenPanels}
                    >
                      <dl className="sv-view-grid">
                        <Field label="University ID" value={emp.university_id} />
                        <Field label="University Designation" value={emp.university_designation} />
                        <Field label="University Experience (Years)" value={emp.university_experience} />
                      </dl>
                    </Accordion>
                  )}

                  <Accordion
                    id="employment-other"
                    Icon={IdCardIcon}
                    title="Other"
                    defaultOpen
                    openPanels={openPanels}
                    setOpenPanels={setOpenPanels}
                  >
                    <dl className="sv-view-grid">
                      <Field label="Work Email" value={emp.work_email} />
                      <Field label="Notes" value={emp.notes} span />
                    </dl>
                  </Accordion>
                </>
              )}

              {activeSection === "qualifications" && (
                <section className="sf-section">
                  <SectionHeading Icon={GraduationIcon}>Qualifications</SectionHeading>
                  {qualifications.text ? (
                    <p className="sv-field-value">{qualifications.text}</p>
                  ) : (
                    <p className="sf-empty-hint">No qualifications recorded.</p>
                  )}
                </section>
              )}

              {activeSection === "address" && (
                <section className="sf-section">
                  <SectionHeading Icon={HomeIcon}>Address</SectionHeading>
                  <DetailTable
                    rows={ADDRESS_ROWS.map((row) => ({ key: row.key, label: row.label }))}
                    columns={ADDRESS_TYPES.map((t) => ({
                      key: String(t.id),
                      title: t.label,
                      data: addresses.find((a) => Number(a.address_type) === t.id) || {},
                    }))}
                  />
                </section>
              )}

              {activeSection === "other" && (
                <section className="sf-section">
                  <SectionHeading Icon={IdCardIcon}>Other Details</SectionHeading>
                  <dl className="sv-view-grid">
                    <Field label="Aadhar Number" value={other.aadhar_no} />
                    <LinkField label="Aadhar Document" url={other.aadhar_doc_url} />
                    <Field label="PAN Number" value={other.pan_no} />
                    <LinkField label="PAN Document" url={other.pan_doc_url} />
                  </dl>
                </section>
              )}
            </div>
          </div>

          {/* ---------------- Persistent quick-stats strip ---------------- */}
          <div className="st-card sv-stats-bar">
            <StatItem Icon={BriefcaseIcon} label="Designation" value={designationLabel} className="sv-stat-classroom" />
            <StatItem Icon={HomeIcon} label="Employment Place" value={employmentPlaceLabel} className="sv-stat-batch" />
            <StatItem Icon={IconUserId} label="User ID" value={acc.user_id} className="sv-stat-userid" />
            <StatItem Icon={IdCardIcon} label="Staff Type" value={staffTypeLabel} className="sv-stat-academic" />
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
            <div className="st-preview-roll">{p.staff_uid || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;