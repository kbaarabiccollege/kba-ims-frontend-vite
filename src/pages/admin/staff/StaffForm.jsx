// src/pages/admin/staff/StaffForm.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getStaffMember, createStaff, updateStaff } from "../../../api/staffApi";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import PasswordInput from "../../../components/common/PasswordInput";
import { DriveFolderButton } from "../../../components/common/Badges";
import {
  STAFF_SECTIONS,
  SALUTATION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EMPLOYMENT_NATURE_OPTIONS,
  STAFF_TYPE_OPTIONS,
  EMPLOYMENT_PLACE_OPTIONS,
  DESIGNATION_OPTIONS,
  // STAFF_DRIVE_FOLDERS,
} from "../../../utils/staffConstants";
import {
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  RELIGION_OPTIONS,
  ADDRESS_ROWS,
  ADDRESS_TYPES,
  emptyAddress,
} from "../../../utils/userConstants";
import { STAFF_DRIVE_FOLDERS } from "../../../utils/driveFolders";
import {
    PersonIcon,
    BriefcaseIcon,
    GraduationIcon,
    HomeIcon,
    IdCardIcon,
  } from "../../../components/common/Icons";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
// Reuses the generic "st-" list-page styles + the "sf-" form styles that
// were built for StudentForm.jsx — both are style-agnostic (not
// Student-specific class names), so no separate StaffForm.css needed.
import "../../../styles/UserList.css";
import "../../../styles/StudentForm.css";

const ROLE_BASE_PATHS = { admin: "/admin", superadmin: "/superadmin", dev: "/superadmin" };

const initialState = () => ({
  account: { user_id: "", password: "", status: "active" },
  personal: {
    name: "",
    staff_uid: "",
    short_name: "",
    salutation: "",
    gender: "",
    dob: "",
    blood_group: "",
    mobile_number: "",
    emergency_contact: "",
    personal_email: "",
    religion_id: "",
    marital_status: "",
    medical_remarks: "",
    photo_url: "",
    date_of_joining: "",
  },
  employment: {
    staff_type: "",
    designation: "",
    employment_nature: "",
    employment_place: "",
    university_id: "",
    university_designation: "",
    university_experience: "",
    experience_years: "",
    work_email: "",
    notes: "",
  },
  qualifications: { text: "" },
  addresses: ADDRESS_TYPES.map((t) => emptyAddress(t.id)),
  other: {
    aadhar_no: "",
    aadhar_doc_url: "",
    pan_no: "",
    pan_doc_url: "",
  },
});

const StaffForm = () => {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { role: authRole } = useAuth();
  const basePath = ROLE_BASE_PATHS[authRole] || "/admin";
  const isEdit = Boolean(id);

  const [activeSection, setActiveSection] = useState("personal");
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);
  const [form, setForm] = useState(initialState);
  const [credsTouched, setCredsTouched] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);

  const [loading, setLoading] = useState(isEdit);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSave, setSavingSave] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({});

  // ---- staff type / employment place options (static enums, same
  // ones the Staff list page uses) ----
  const staffTypeOptions = useMemo(
    () => STAFF_TYPE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  const employmentPlaceOptions = useMemo(
    () => EMPLOYMENT_PLACE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );
  const designationOptions = useMemo(
    () => DESIGNATION_OPTIONS.filter((o) => o.value !== "all").map((o) => ({ id: o.value, label: o.label })),
    []
  );

  // Employment Place is a dynamic enum, so we resolve "University" by
  // matching the selected option's label rather than hardcoding its id.
  // The University sub-section only renders once that option is chosen.
  const isUniversityEmploymentPlace = useMemo(() => {
    const selected = employmentPlaceOptions.find(
      (o) => String(o.id) === String(form.employment.employment_place)
    );
    return Boolean(selected?.label?.trim().toLowerCase() === "university");
  }, [employmentPlaceOptions, form.employment.employment_place]);

  // ---- load existing staff in edit mode (also reused by the refresh button) ----
  const loadStaff = useCallback(
    async ({ silent = false } = {}) => {
      if (!isEdit) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError("");
      try {
        const res = await getStaffMember(id);
        const d = res?.data;
        if (!d) return;

        const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");

        const addressByType = ADDRESS_TYPES.map((t) => {
          const found = (d.address || []).find((a) => Number(a.address_type) === t.id);
          return found
            ? { ...emptyAddress(t.id), ...found, address_type: t.id }
            : emptyAddress(t.id);
        });

        setForm({
          account: {
            user_id: d.account?.user_id ?? "",
            password: "", // never rehydrate a password into the field
            status: d.account?.status ?? "active",
          },
          personal: {
            name: d.personal_details?.name ?? "",
            staff_uid: d.personal_details?.staff_uid ?? "",
            short_name: d.personal_details?.short_name ?? "",
            salutation: d.personal_details?.salutation ?? "",
            gender: d.personal_details?.gender ?? "",
            dob: toDateInput(d.personal_details?.dob),
            blood_group: d.personal_details?.blood_group ?? "",
            mobile_number: d.personal_details?.mobile_number ?? "",
            emergency_contact: d.personal_details?.emergency_contact ?? "",
            personal_email: d.personal_details?.personal_email ?? "",
            religion_id: d.personal_details?.religion_id ?? "",
            marital_status: d.personal_details?.marital_status ?? "",
            medical_remarks: d.personal_details?.medical_remarks ?? "",
            photo_url: d.personal_details?.photo_url ?? "",
            date_of_joining: toDateInput(d.personal_details?.date_of_joining),
          },
          employment: {
            staff_type: d.employment_details?.staff_type ?? "",
            designation: d.employment_details?.designation ?? "",
            employment_nature: d.employment_details?.employment_nature ?? "",
            employment_place: d.employment_details?.employment_place ?? "",
            university_id: d.employment_details?.university_id ?? "",
            university_designation: d.employment_details?.university_designation ?? "",
            university_experience: d.employment_details?.university_experience ?? "",
            experience_years: d.employment_details?.experience_years ?? "",
            work_email: d.employment_details?.work_email ?? "",
            notes: d.employment_details?.notes ?? "",
          },
          qualifications: { text: d.qualifications?.text ?? "" },
          addresses: addressByType,
          other: {
            aadhar_no: d.other_details?.aadhar_no ?? "",
            aadhar_doc_url: d.other_details?.aadhar_doc_url ?? "",
            pan_no: d.other_details?.pan_no ?? "",
            pan_doc_url: d.other_details?.pan_doc_url ?? "",
          },
        });
        setCredsTouched(true); // don't clobber a loaded user_id via autofill
      } catch (err) {
        setLoadError(
          err?.response?.data?.message || "Couldn't load this staff member. Please try again."
        );
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [id, isEdit]
  );

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  // ---- generic field setters ----
  const setField = (section, key, value) =>
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const setAddressField = (typeId, key, value) =>
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.map((a) => (a.address_type === typeId ? { ...a, [key]: value } : a)),
    }));

  const handleSameAsPresentToggle = (checked) => {
    setSameAsPresent(checked);
    if (checked) {
      setForm((prev) => {
        const present = prev.addresses.find((a) => a.address_type === 0);
        const permanent = prev.addresses.find((a) => a.address_type === 1);
        return {
          ...prev,
          addresses: prev.addresses.map((a) =>
            a.address_type === 1 ? { ...present, address_type: 1, id: permanent.id } : a
          ),
        };
      });
    }
  };

  // ---- staff_uid -> user id / password autofill (mirrors roll_number
  // autofill in StudentForm) ----
  const handleStaffUidChange = (value) => {
    setField("personal", "staff_uid", value);
    if (!credsTouched) {
      setForm((prev) => ({
        ...prev,
        account: { ...prev.account, user_id: value, password: value ? `${value}@123` : "" },
      }));
    }
  };
  const handleUserIdChange = (value) => {
    setCredsTouched(true);
    setField("account", "user_id", value);
  };
  const handlePasswordChange = (value) => {
    setCredsTouched(true);
    setField("account", "password", value);
  };

  // ---- validation (minimal — required fields per API contract) ----
  const validate = () => {
    const errs = {};
    if (!isEdit || activeSection === "personal") {
      if (!form.personal.name.trim()) errs.personal = "Full name is required.";
      if (!form.personal.staff_uid.trim()) errs.personal = "Staff ID is required.";
      if (!form.account.user_id.trim()) errs.personal = "User ID is required.";
      if (!isEdit && !form.account.password.trim()) errs.personal = "Password is required.";
    }
    setSectionErrors(errs);
    if (Object.keys(errs).length > 0) {
      setActiveSection(Object.keys(errs)[0]);
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

    const addresses = form.addresses
      .filter((a) =>
        Object.entries(a).some(([k, v]) => k !== "address_type" && String(v || "").trim())
      )
      .map((a) => ({ ...a, address_type: Number(a.address_type) }));

    return {
      account: {
        user_id: form.account.user_id.trim(),
        role: "staff",
        status: form.account.status,
        ...(form.account.password ? { password: form.account.password } : {}),
      },
      personal_details: {
        ...form.personal,
        salutation: num(form.personal.salutation),
        gender: num(form.personal.gender),
        blood_group: num(form.personal.blood_group),
        religion_id: num(form.personal.religion_id),
        marital_status: num(form.personal.marital_status),
      },
      employment_details: {
        ...form.employment,
        staff_type: num(form.employment.staff_type),
        designation: num(form.employment.designation),
        employment_nature: num(form.employment.employment_nature),
        employment_place: num(form.employment.employment_place),
        university_designation: num(form.employment.university_designation),
        experience_years:
          form.employment.experience_years === "" ? null : Number(form.employment.experience_years),
        university_experience:
          form.employment.university_experience === "" ? null : Number(form.employment.university_experience),
      },
      qualifications: { text: form.qualifications.text },
      address: addresses,
      other_details: { ...form.other },
    };
  };

  // ---- section-scoped payload for PATCH updates (edit mode only) ----
  const buildSectionPayload = (section) => {
    const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

    switch (section) {
      case "personal":
        return {
          account: {
            user_id: form.account.user_id.trim(),
            status: form.account.status,
          },
          personal_details: {
            ...form.personal,
            salutation: num(form.personal.salutation),
            gender: num(form.personal.gender),
            blood_group: num(form.personal.blood_group),
            religion_id: num(form.personal.religion_id),
            marital_status: num(form.personal.marital_status),
          },
        };
      case "employment":
        return {
          employment_details: {
            ...form.employment,
            staff_type: num(form.employment.staff_type),
            designation: num(form.employment.designation),
            employment_nature: num(form.employment.employment_nature),
            employment_place: num(form.employment.employment_place),
            university_designation: num(form.employment.university_designation),
            experience_years:
              form.employment.experience_years === "" ? null : Number(form.employment.experience_years),
            university_experience:
              form.employment.university_experience === "" ? null : Number(form.employment.university_experience),
          },
        };
      case "qualifications":
        return { qualifications: { text: form.qualifications.text } };
      case "address": {
        // Fixed 2-row set (present/permanent) — PATCH targets existing
        // rows by id, same rationale as StudentForm's address section.
        const addresses = form.addresses
          .filter((a) => a.id)
          .map((a) => ({ ...a, address_type: Number(a.address_type) }));
        return { address: addresses };
      }
      case "other":
        return { other_details: { ...form.other } };
      default:
        return {};
    }
  };

  // ---- edit mode: save only the active section, stay on the same page ----
  const handleSectionSave = async (e, { close = false } = {}) => {
    e.preventDefault();
    setSaveError("");
    if (!validate()) return;
    const setButtonLoading = close ? setSavingClose : setSavingSave;
    setButtonLoading(true);
    try {
      const payload = buildSectionPayload(activeSection);
      await updateStaff(id, payload);
      toast.success(crudMessage("update", "Staff", "success"));
      if (close) {
        navigate(`${basePath}/staff`);
      }
    } catch (err) {
      setSaveError(
        err?.response?.data?.message || "Couldn't save this staff member. Please check the form and try again."
      );
    } finally {
      setButtonLoading(false);
    }
  };

  // ---- create mode: save the full payload, then leave the page ----
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");
    if (!validate()) return;
    setSavingSave(true);
    try {
      const payload = buildPayload();
      await createStaff(payload);
      toast.success(crudMessage("create", "Staff", "success"));
      navigate(`${basePath}/staff`);
    } catch (err) {
      const fallback = crudMessage("create", "Staff", "error");
      setSaveError(
        err?.response?.data?.message || "Couldn't save this staff member. Please check the form and try again."
      );
      toast.error(err?.response?.data?.message || fallback);
    } finally {
      setSavingSave(false);
    }
  };

  const handleSubmit = isEdit
    ? (e) => handleSectionSave(e, { close: false })
    : handleCreateSubmit;

  const handleSaveAndClose = (e) => handleSectionSave(e, { close: true });

  const photoPreviewOk = useMemo(
    () => Boolean(form.personal.photo_url && /^https?:\/\//.test(form.personal.photo_url)),
    [form.personal.photo_url]
  );

  if (loading) {
    return (
      <div className="st-page">
        <div className="st-card">
          <div className="st-form-placeholder">Loading staff member…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="st-page sf-page">
      <div className="st-page-header">
        <div className="st-title-block">
          <h1>{isEdit ? "Edit Staff" : "Add New Staff"}</h1>
          <p className="st-title-meta">
            {isEdit ? `Editing staff #${id}` : "Fill in the staff member's details below"}
          </p>
        </div>
        <div className="sf-header-actions">
          {isEdit && (
            <button
              type="button"
              className="st-btn st-btn-ghost"
              onClick={() => loadStaff({ silent: true })}
              disabled={refreshing || loading}
            >
              {refreshing ? "Refreshing…" : "⟳ Refresh"}
            </button>
          )}
          <button
            type="button"
            className="st-btn st-btn-ghost"
            onClick={() => navigate(`${basePath}/staff`)}
          >
            ← Back
          </button>
        </div>
      </div>

      {loadError && <div className="st-error-banner sf-page-error">{loadError}</div>}

      <form className="st-card sf-card" onSubmit={handleSubmit}>
        <div className="sf-tabs" role="tablist">
          {STAFF_SECTIONS.map((s) => (
            <button
              type="button"
              key={s.key}
              role="tab"
              aria-selected={activeSection === s.key}
              className={`sf-tab${activeSection === s.key ? " sf-tab-active" : ""}${
                sectionErrors[s.key] ? " sf-tab-error" : ""
              }`}
              onClick={() => setActiveSection(s.key)}
            >
              {s.Icon ? <s.Icon /> : null}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="sf-mobile-tabs">
          <button
            type="button"
            className="sf-mobile-tabs-trigger"
            aria-expanded={mobileTabsOpen}
            onClick={() => setMobileTabsOpen((prev) => !prev)}
          >
            <span>{STAFF_SECTIONS.find((s) => s.key === activeSection)?.label}</span>
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {mobileTabsOpen && (
            <div className="sf-mobile-tabs-list">
              {STAFF_SECTIONS.map((s) => (
                <button
                  type="button"
                  key={s.key}
                  className={`sf-mobile-tabs-option${
                    activeSection === s.key ? " sf-mobile-tabs-option-active" : ""
                  }`}
                  onClick={() => {
                    setActiveSection(s.key);
                    setMobileTabsOpen(false);
                  }}
                >
                  {s.Icon ? <s.Icon /> : null}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sf-body">
          {/* ---------------- Personal Information ---------------- */}
          {activeSection === "personal" && (
            <section className="sf-section">
              {sectionErrors.personal && <div className="st-error-banner">{sectionErrors.personal}</div>}

              <div className="sf-grid sf-grid-personal">
                <div className="sf-personal-fields">
                  <div className="sf-grid sf-grid-3">
                    <div className="sf-field">
                      <label className="sf-label">Full Name *</label>
                      <input
                        className="sf-input"
                        placeholder="Full Name"
                        value={form.personal.name}
                        onChange={(e) => setField("personal", "name", e.target.value)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Short Name</label>
                      <input
                        className="sf-input"
                        placeholder="Short Name"
                        value={form.personal.short_name}
                        onChange={(e) => setField("personal", "short_name", e.target.value)}
                      />
                    </div>
                    <div className="sf-field sf-field-photo">
                      <label className="sf-label">Photo URL</label>
                      <div className="sf-photo-input-row">
                        <input
                          type="url"
                          className="sf-input"
                          placeholder="Paste photo URL (e.g. Google Drive share link)"
                          value={form.personal.photo_url}
                          onChange={(e) => setField("personal", "photo_url", e.target.value)}
                        />
                        <DriveFolderButton
                          folderUrl={STAFF_DRIVE_FOLDERS.staffPhotos}
                          label="Open staff photos Drive folder"
                        />
                      </div>
                    </div>
                    <div className="sf-field sf-field-photo-preview-mobile">
                      <span className="sf-label" aria-hidden="true">&nbsp;</span>
                      <div className="sf-photo-preview sf-photo-preview-compact">
                        {photoPreviewOk ? (
                          <img
                            src={form.personal.photo_url}
                            alt="Staff preview"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="sf-photo-placeholder">No photo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sf-grid sf-grid-3">
                    <div className="sf-field">
                      <label className="sf-label" htmlFor="stf-salutation">Salutation</label>
                      <SearchableDropdown
                        id="stf-salutation"
                        label=""
                        allLabel="Select salutation"
                        options={SALUTATION_OPTIONS}
                        value={form.personal.salutation || "all"}
                        onChange={(v) => setField("personal", "salutation", v === "all" ? "" : v)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label" htmlFor="stf-gender">Gender</label>
                      <SearchableDropdown
                        id="stf-gender"
                        label=""
                        allLabel="Select gender"
                        options={GENDER_OPTIONS}
                        value={form.personal.gender || "all"}
                        onChange={(v) => setField("personal", "gender", v === "all" ? "" : v)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Staff ID *</label>
                      <input
                        className="sf-input"
                        placeholder="Staff ID"
                        value={form.personal.staff_uid}
                        onChange={(e) => handleStaffUidChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sf-grid sf-grid-3">
                    <div className="sf-field">
                      <label className="sf-label">Date of Birth</label>
                      <input
                        type="date"
                        className="sf-input"
                        value={form.personal.dob}
                        onChange={(e) => setField("personal", "dob", e.target.value)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label" htmlFor="stf-blood-group">Blood Group</label>
                      <SearchableDropdown
                        id="stf-blood-group"
                        label=""
                        allLabel="Select blood group"
                        options={BLOOD_GROUP_OPTIONS}
                        value={form.personal.blood_group || "all"}
                        onChange={(v) => setField("personal", "blood_group", v === "all" ? "" : v)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Date of Joining</label>
                      <input
                        type="date"
                        className="sf-input"
                        value={form.personal.date_of_joining}
                        onChange={(e) => setField("personal", "date_of_joining", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sf-grid sf-grid-3">
                    <div className="sf-field">
                      <label className="sf-label">Mobile Number</label>
                      <input
                        className="sf-input"
                        placeholder="Mobile Number"
                        value={form.personal.mobile_number}
                        onChange={(e) => setField("personal", "mobile_number", e.target.value)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Emergency Contact</label>
                      <input
                        className="sf-input"
                        placeholder="Emergency Contact"
                        value={form.personal.emergency_contact}
                        onChange={(e) => setField("personal", "emergency_contact", e.target.value)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Personal Email</label>
                      <input
                        type="email"
                        className="sf-input"
                        placeholder="Personal Email"
                        value={form.personal.personal_email}
                        onChange={(e) => setField("personal", "personal_email", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sf-grid sf-grid-3">
                    <div className="sf-field">
                      <label className="sf-label" htmlFor="stf-religion">Religion</label>
                      <SearchableDropdown
                        id="stf-religion"
                        label=""
                        allLabel="Select religion"
                        options={RELIGION_OPTIONS}
                        value={form.personal.religion_id || "all"}
                        onChange={(v) => setField("personal", "religion_id", v === "all" ? "" : v)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label" htmlFor="stf-marital-status">Marital Status</label>
                      <SearchableDropdown
                        id="stf-marital-status"
                        label=""
                        allLabel="Select status"
                        options={MARITAL_STATUS_OPTIONS}
                        value={form.personal.marital_status || "all"}
                        onChange={(v) => setField("personal", "marital_status", v === "all" ? "" : v)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Medical Remarks</label>
                      <textarea
                        className="sf-input sf-textarea"
                        placeholder="Medical Remarks"
                        value={form.personal.medical_remarks}
                        onChange={(e) => setField("personal", "medical_remarks", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="sf-personal-side">
                  <div className="sf-photo-block sf-photo-block-compact">
                    <div className="sf-photo-preview sf-photo-preview-compact">
                      {photoPreviewOk ? (
                        <img
                          src={form.personal.photo_url}
                          alt="Staff preview"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="sf-photo-placeholder">No photo</span>
                      )}
                    </div>
                  </div>

                  <div className="sf-login-box">
                    <h3 className="sf-login-box-title">Login Credentials</h3>
                    <div className="sf-field">
                      <label className="sf-label">User ID *</label>
                      <input
                        className="sf-input"
                        placeholder="User ID"
                        value={form.account.user_id}
                        onChange={(e) => handleUserIdChange(e.target.value)}
                      />
                    </div>
                    {!isEdit && (
                      <div className="sf-field">
                        <label className="sf-label">Password *</label>
                        <PasswordInput
                          className="sf-input"
                          value={form.account.password}
                          placeholder="Password"
                          onChange={(e) => handlePasswordChange(e.target.value)}
                          defaultvisible="true"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Employment Details ---------------- */}
          {activeSection === "employment" && (
            <section className="sf-section sf-section-loose">
              <h3 className="sf-subheading">KBA</h3>
              <div className="sf-grid sf-grid-3">
                <div className="sf-field">
                  <label className="sf-label" htmlFor="stf-staff-type">Staff Type</label>
                  <SearchableDropdown
                    id="stf-staff-type"
                    label=""
                    allLabel="Select staff type"
                    options={staffTypeOptions}
                    value={form.employment.staff_type || "all"}
                    onChange={(v) => setField("employment", "staff_type", v === "all" ? "" : v)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label" htmlFor="stf-designation">Designation</label>
                  <SearchableDropdown
                    id="stf-designation"
                    label=""
                    allLabel="Select designation"
                    options={designationOptions}
                    value={form.employment.designation || "all"}
                    onChange={(v) => setField("employment", "designation", v === "all" ? "" : v)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label" htmlFor="stf-employment-nature">Employment Nature</label>
                  <SearchableDropdown
                    id="stf-employment-nature"
                    label=""
                    allLabel="Select nature"
                    options={EMPLOYMENT_NATURE_OPTIONS}
                    value={form.employment.employment_nature || "all"}
                    onChange={(v) => setField("employment", "employment_nature", v === "all" ? "" : v)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Experience (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="sf-input"
                    placeholder="Experience (Years)"
                    value={form.employment.experience_years}
                    onChange={(e) => setField("employment", "experience_years", e.target.value)}
                  />
                </div>
              </div>

              <div className="sf-grid sf-grid-3 sf-mt">
                <div className="sf-field">
                  <label className="sf-label" htmlFor="stf-employment-place">Employment Place</label>
                  <SearchableDropdown
                    id="stf-employment-place"
                    label=""
                    allLabel="Select place"
                    options={employmentPlaceOptions}
                    value={form.employment.employment_place || "all"}
                    onChange={(v) => setField("employment", "employment_place", v === "all" ? "" : v)}
                  />
                </div>
              </div>

              {isUniversityEmploymentPlace && (
                <>
                  <h3 className="sf-subheading">University</h3>
                  <div className="sf-grid sf-grid-3 sf-mt">
                    <div className="sf-field">
                      <label className="sf-label">University ID</label>
                      <input
                        className="sf-input"
                        placeholder="University ID"
                        value={form.employment.university_id}
                        onChange={(e) => setField("employment", "university_id", e.target.value)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label" htmlFor="stf-university-designation">University Designation</label>
                      <SearchableDropdown
                        id="stf-university-designation"
                        label=""
                        allLabel="Select designation"
                        options={designationOptions}
                        value={form.employment.university_designation || "all"}
                        onChange={(v) => setField("employment", "university_designation", v === "all" ? "" : v)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">University Experience (Years)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="sf-input"
                        placeholder="University Experience (Years)"
                        value={form.employment.university_experience}
                        onChange={(e) => setField("employment", "university_experience", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <hr className="sf-mt" style={{ border: "none", borderTop: "1px solid var(--st-border)" }} />
              <div className="sf-grid sf-grid-3 sf-mt">
                <div className="sf-field">
                  <label className="sf-label">Work Email</label>
                  <input
                    type="email"
                    className="sf-input"
                    placeholder="Work Email"
                    value={form.employment.work_email}
                    onChange={(e) => setField("employment", "work_email", e.target.value)}
                  />
                </div>
                <div className="sf-field sf-span-2">
                  <label className="sf-label">Notes</label>
                  <textarea
                    className="sf-input sf-textarea"
                    placeholder="Notes"
                    value={form.employment.notes}
                    onChange={(e) => setField("employment", "notes", e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Qualifications ---------------- */}
          {activeSection === "qualifications" && (
            <section className="sf-section sf-section-loose">
              <div className="sf-field">
                <label className="sf-label">Qualifications</label>
                <textarea
                  className="sf-input sf-textarea"
                  placeholder="e.g. M.Sc in Mathematics, B.Ed"
                  value={form.qualifications.text}
                  onChange={(e) => setField("qualifications", "text", e.target.value)}
                />
              </div>
            </section>
          )}

          {/* ---------------- Address ---------------- */}
          {activeSection === "address" && (
            <section className="sf-section">
              <div className="sf-compare-wrap sf-compare-wrap-address">
                <div className="sf-compare sf-compare-2col">
                  <div className="sf-compare-header">
                    <div className="sf-compare-label-head">Fields</div>
                    <div>Present</div>
                    <div className="sf-compare-header-permanent">
                      <span>
                        Permanent{" "}
                        <label className="sf-same-as-checkbox">
                          <span>(</span>
                          <input
                            type="checkbox"
                            checked={sameAsPresent}
                            onChange={(e) => handleSameAsPresentToggle(e.target.checked)}
                          />
                          <span>same as present address)</span>
                        </label>
                      </span>
                    </div>
                  </div>
                  {ADDRESS_ROWS.map((row) => {
                    const present = form.addresses.find((a) => a.address_type === 0);
                    const permanent = form.addresses.find((a) => a.address_type === 1);
                    return (
                      <div className="sf-compare-row" key={row.key}>
                        <div className="sf-compare-label">{row.label}</div>
                        <div className="sf-compare-cell">
                          <span className="sf-compare-col-label">Present</span>
                          {row.textarea ? (
                            <textarea
                              className="sf-input sf-textarea sf-textarea-sm"
                              placeholder={`Present ${row.label}`}
                              value={present[row.key]}
                              onChange={(e) => setAddressField(0, row.key, e.target.value)}
                            />
                          ) : (
                            <input
                              className="sf-input"
                              placeholder={`Present ${row.label}`}
                              value={present[row.key]}
                              onChange={(e) => setAddressField(0, row.key, e.target.value)}
                            />
                          )}
                        </div>
                        <div className="sf-compare-cell">
                          <span className="sf-compare-col-label">Permanent</span>
                          {row.textarea ? (
                            <textarea
                              className="sf-input sf-textarea sf-textarea-sm"
                              placeholder={`Permanent ${row.label}`}
                              value={permanent[row.key]}
                              disabled={sameAsPresent}
                              onChange={(e) => setAddressField(1, row.key, e.target.value)}
                            />
                          ) : (
                            <input
                              className="sf-input"
                              placeholder={`Permanent ${row.label}`}
                              value={permanent[row.key]}
                              disabled={sameAsPresent}
                              onChange={(e) => setAddressField(1, row.key, e.target.value)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Other Details ---------------- */}
          {activeSection === "other" && (
            <section className="sf-section sf-section-loose">
              <div className="sf-grid sf-grid-2">
                <div className="sf-field">
                  <label className="sf-label">Aadhar Number</label>
                  <input
                    className="sf-input"
                    placeholder="Aadhar Number"
                    value={form.other.aadhar_no}
                    onChange={(e) => setField("other", "aadhar_no", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Aadhar Document URL</label>
                  <div className="sf-photo-input-row">
                    <input
                      type="url"
                      className="sf-input"
                      placeholder="Aadhar Document URL"
                      value={form.other.aadhar_doc_url}
                      onChange={(e) => setField("other", "aadhar_doc_url", e.target.value)}
                    />
                    <DriveFolderButton folderUrl={STAFF_DRIVE_FOLDERS.documents} label="Open documents Drive folder" />
                  </div>
                </div>

                <div className="sf-field">
                  <label className="sf-label">PAN Number</label>
                  <input
                    className="sf-input"
                    placeholder="PAN Number"
                    value={form.other.pan_no}
                    onChange={(e) => setField("other", "pan_no", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">PAN Document URL</label>
                  <div className="sf-photo-input-row">
                    <input
                      type="url"
                      className="sf-input"
                      placeholder="PAN Document URL"
                      value={form.other.pan_doc_url}
                      onChange={(e) => setField("other", "pan_doc_url", e.target.value)}
                    />
                    <DriveFolderButton folderUrl={STAFF_DRIVE_FOLDERS.documents} label="Open documents Drive folder" />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {saveError && <div className="st-error-banner sf-page-error">{saveError}</div>}

        <div className="sf-footer">
          <div className="sf-footer-actions">
            <button type="submit" className="st-btn st-btn-primary" disabled={savingSave || savingClose}>
              {savingSave ? "Saving…" : "Save"}
            </button>
            {isEdit && (
              <button
                type="button"
                className="st-btn st-btn-primary"
                disabled={savingSave || savingClose}
                onClick={handleSaveAndClose}
              >
                {savingClose ? "Saving…" : "Save & Close"}
              </button>
            )}
            <button
              type="button"
              className="st-btn st-btn-ghost"
              onClick={() => navigate(`${basePath}/staff`)}
              disabled={savingSave || savingClose}
            >
              Cancel
            </button>
          </div>
          {isEdit && (
            <span className="sf-footer-note">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="10" cy="10" r="9" fill="currentColor" />
                <rect x="9" y="8.5" width="2" height="5.5" rx="1" fill="var(--st-surface, #fff)" />
                <rect x="9" y="5.5" width="2" height="2" rx="1" fill="var(--st-surface, #fff)" />
              </svg>
              <span>
                Only the <strong>{STAFF_SECTIONS.find((s) => s.key === activeSection)?.label}</strong> section will be updated.
              </span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default StaffForm;