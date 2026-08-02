// src/pages/admin/students/StudentForm.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getStudent, createStudent, updateStudent } from "../../../api/studentsApi";
import { getBatches } from "../../../api/batchesApi";
import SearchableDropdown from "../../../components/common/SearchableDropdown";
import PasswordInput from "../../../components/common/PasswordInput";
import { TrashIcon, PlusIcon } from "../../../components/common/Icons";
import { DriveFolderButton } from "../../../components/common/Badges";
import { SECTIONS, ROLE_BASE_PATHS, GENDER_OPTIONS, BLOOD_GROUP_OPTIONS, 
  RELIGION_OPTIONS, CASTE_OPTIONS, SOCIAL_CATEGORY_OPTIONS, MADHAB_OPTIONS, 
  FAMILY_ROWS, QUALIFICATION_ROWS, ADDRESS_ROWS, QUALIFICATION_LEVELS, 
  ACADEMIC_STATUS_OPTIONS, DRIVE_FOLDERS, ADDRESS_TYPES, emptyAddress, 
  emptyQualification, } from "./constants";
import { useToast } from "../../../context/ToastContext";
import { crudMessage } from "../../../utils/toastMessages";
import "../../../styles/Students.css";
import "../../../styles/StudentForm.css";

const initialState = () => ({
  account: { user_id: "", password: "", status: "active", email: "" },
  personal: {
    name: "",
    roll_number: "",
    dob: "",
    gender: "",
    batch_id: "",
    blood_group: "",
    mother_tongue: "",
    is_hostel: true,
    photo_url: "",
    mobile_number: "",
    academic_status: "studying",
  },
  other: {
    religion_id: "",
    caste_id: "",
    social_category_id: "",
    madhab_id: "",
    is_orphan: false,
    aadhar_no: "",
    medical_remarks: "",
    notes: "",
  },
  academic: {
    rrn: "",
    univ_email: "",
    yoj: "",
    yoc: "",
    madras_course: "",
    madras_roll_no: "",
    madras_joining_year: "",
  },
  family: {
    father_name: "",
    father_mobile: "",
    father_education: "",
    father_occupation: "",
    father_annual_income: "",
    mother_name: "",
    mother_mobile: "",
    mother_education: "",
    mother_occupation: "",
    mother_annual_income: "",
    parent_email: "",
    parent_whatsapp: "",
    parent_sms: "",
    guardian_name: "",
    guardian_mobile: "",
    guardian_relationship: "",
    guardian_address: "",
  },
  addresses: ADDRESS_TYPES.map((t) => emptyAddress(t.id)),
  qualifications: QUALIFICATION_LEVELS.map((lvl) => emptyQualification(lvl)),
  extraQualifications: [],
  admission: {
    admission_date: "",
    entrance_mark: "",
    entrance_rank: "",
    hafiz: false,
    recommended_by: "",
  },
  relatedLinks: [],
});


const StudentForm = () => {
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

  // ---- batches (fetched the same way as the Students list page) ----
  const [batchOptions, setBatchOptions] = useState([]);
  const [batchesIndex, setBatchesIndex] = useState({});
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesLoaded, setBatchesLoaded] = useState(false);

  const searchBatches = useCallback(async (q) => {
    setBatchesLoading(true);
    try {
      const res = await getBatches({ limit: 100, q });
      const list = res?.data ?? [];
      setBatchOptions(list.map((b) => ({ id: b.id, label: b.batch_name })));
      setBatchesIndex((prev) => {
        const next = { ...prev };
        list.forEach((b) => {
          next[b.id] = b.batch_name;
        });
        return next;
      });
      setBatchesLoaded(true);
    } catch {
      setBatchOptions([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    searchBatches("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- load existing student in edit mode (also reused by the refresh button) ----
  const loadStudent = useCallback(
    async ({ silent = false } = {}) => {
      if (!isEdit) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError("");
      try {
        const res = await getStudent(id);
        const d = res?.data;
        if (!d) return;

        const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");

        const addressByType = ADDRESS_TYPES.map((t) => {
          const found = (d.address || []).find((a) => Number(a.address_type) === t.id);
          return found
            ? { ...emptyAddress(t.id), ...found, address_type: t.id }
            : emptyAddress(t.id);
        });

        const qualByLevel = QUALIFICATION_LEVELS.map((lvl) => {
          const found = (d.qualifications || []).find((q) => q.level === lvl);
          return found
            ? { ...emptyQualification(lvl), ...found, passing_year: found.passing_year ?? "" }
            : emptyQualification(lvl);
        });

        setForm({
          account: {
            user_id: d.account?.user_id ?? "",
            password: "", // never rehydrate a password into the field
            status: d.account?.status ?? "active",
            email: d.account?.email ?? "",
          },
          personal: {
            name: d.personal_details?.name ?? "",
            roll_number: d.personal_details?.roll_number ?? "",
            dob: toDateInput(d.personal_details?.dob),
            gender: d.personal_details?.gender ?? "",
            batch_id: d.personal_details?.batch_id ?? "",
            blood_group: d.personal_details?.blood_group ?? "",
            mother_tongue: d.personal_details?.mother_tongue ?? "",
            is_hostel: Boolean(d.personal_details?.is_hostel),
            photo_url: d.personal_details?.photo_url ?? "",
            mobile_number: d.personal_details?.mobile_number ?? "",
            academic_status: d.personal_details?.academic_status ?? "studying",
          },
          other: {
            religion_id: d.other_details?.religion_id ?? "",
            caste_id: d.other_details?.caste_id ?? "",
            social_category_id: d.other_details?.social_category_id ?? "",
            madhab_id: d.other_details?.madhab_id ?? "",
            is_orphan: Boolean(d.other_details?.is_orphan),
            aadhar_no: d.other_details?.aadhar_no ?? "",
            medical_remarks: d.other_details?.medical_remarks ?? "",
            notes: d.other_details?.notes ?? "",
          },
          academic: {
            rrn: d.academic_details?.rrn ?? "",
            univ_email: d.academic_details?.univ_email ?? "",
            yoj: d.academic_details?.yoj ?? "",
            yoc: d.academic_details?.yoc ?? "",
            madras_course: d.academic_details?.madras_course ?? "",
            madras_roll_no: d.academic_details?.madras_roll_no ?? "",
            madras_joining_year: d.academic_details?.madras_joining_year ?? "",
          },
          family: { ...initialState().family, ...(d.family_details || {}) },
          addresses: addressByType,
          qualifications: qualByLevel,
          extraQualifications: (d.extra_qualifications || []).map((q) => ({
            course_name: q.course_name || "",
            cert_url: q.cert_url || "",
          })),
          admission: {
            admission_date: toDateInput(d.admission_details?.admission_date),
            entrance_mark: d.admission_details?.entrance_mark ?? "",
            entrance_rank: d.admission_details?.entrance_rank ?? "",
            hafiz: Boolean(d.admission_details?.hafiz),
            recommended_by: d.admission_details?.recommended_by ?? "",
          },
          relatedLinks: (d.related_links || []).map((l) => ({
            description: l.description || "",
            url: l.url || "",
          })),
        });
        setCredsTouched(true); // don't clobber a loaded user_id via autofill
        if (d.personal_details?.batch_id) {
          setBatchesIndex((prev) => ({ ...prev }));
        }
      } catch (err) {
        setLoadError(
          err?.response?.data?.message || "Couldn't load this student. Please try again."
        );
      } finally {
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [id, isEdit]
  );

  useEffect(() => {
    loadStudent();
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
        return {
          ...prev,
          addresses: prev.addresses.map((a) =>
            a.address_type === 1 ? { ...present, address_type: 1 } : a
          ),
        };
      });
    }
  };

  const setQualificationField = (level, key, value) =>
    setForm((prev) => ({
      ...prev,
      qualifications: prev.qualifications.map((q) => (q.level === level ? { ...q, [key]: value } : q)),
    }));

  // ---- roll number -> user id / password autofill ----
  const handleRollNumberChange = (value) => {
    setField("personal", "roll_number", value);
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

  // ---- dynamic lists: extra qualifications ----
  const addExtraQualification = () =>
    setForm((prev) => ({
      ...prev,
      extraQualifications: [...prev.extraQualifications, { course_name: "", cert_url: "" }],
    }));
  const updateExtraQualification = (idx, key, value) =>
    setForm((prev) => ({
      ...prev,
      extraQualifications: prev.extraQualifications.map((q, i) =>
        i === idx ? { ...q, [key]: value } : q
      ),
    }));
  const removeExtraQualification = (idx) =>
    setForm((prev) => ({
      ...prev,
      extraQualifications: prev.extraQualifications.filter((_, i) => i !== idx),
    }));

  // ---- dynamic lists: related links ----
  const addRelatedLink = () =>
    setForm((prev) => ({
      ...prev,
      relatedLinks: [...prev.relatedLinks, { description: "", url: "" }],
    }));
  const updateRelatedLink = (idx, key, value) =>
    setForm((prev) => ({
      ...prev,
      relatedLinks: prev.relatedLinks.map((l, i) => (i === idx ? { ...l, [key]: value } : l)),
    }));
  const removeRelatedLink = (idx) =>
    setForm((prev) => ({
      ...prev,
      relatedLinks: prev.relatedLinks.filter((_, i) => i !== idx),
    }));

  // ---- validation (minimal — required fields per API contract) ----
  const validate = () => {
    const errs = {};
    if (!isEdit || activeSection === "personal") {
      if (!form.personal.name.trim()) errs.personal = "Full name is required.";
      if (!form.personal.roll_number.trim()) errs.personal = "Roll number is required.";
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
      .map((a) => ({ ...a, address_type: Number(a.address_type) })); // 0 = Present, 1 = Permanent

    const qualifications = form.qualifications
      .filter((q) =>
        Object.entries(q).some(([k, v]) => k !== "level" && String(v || "").trim())
      )
      .map((q) => ({
        ...q,
        passing_year: num(q.passing_year),
        marks: q.marks === "" ? null : Number(q.marks),
        total_marks: q.total_marks === "" ? null : Number(q.total_marks),
      }));

    return {
      classroom_id: null,
      account: {
        user_id: form.account.user_id.trim(),
        email: form.account.email.trim(),
        ...(form.account.password ? { password: form.account.password } : {}),
        role: "student",
        status: form.account.status,
      },
      personal_details: {
        ...form.personal,
        gender: num(form.personal.gender),
        batch_id: num(form.personal.batch_id),
        blood_group: num(form.personal.blood_group),
        is_hostel: Boolean(form.personal.is_hostel),
      },
      other_details: {
        ...form.other,
        religion_id: num(form.other.religion_id),
        caste_id: num(form.other.caste_id),
        social_category_id: num(form.other.social_category_id),
        madhab_id: num(form.other.madhab_id),
        is_orphan: Boolean(form.other.is_orphan),
      },
      academic_details: {
        ...form.academic,
        yoj: num(form.academic.yoj),
        yoc: num(form.academic.yoc),
        madras_joining_year: num(form.academic.madras_joining_year),
      },
      family_details: {
        ...form.family,
        father_annual_income: num(form.family.father_annual_income),
        mother_annual_income: num(form.family.mother_annual_income),
      },
      address: addresses,
      qualifications,
      extra_qualifications: form.extraQualifications.filter((q) => q.course_name.trim()),
      admission_details: {
        ...form.admission,
        entrance_mark: form.admission.entrance_mark === "" ? null : Number(form.admission.entrance_mark),
        entrance_rank: num(form.admission.entrance_rank),
        hafiz: Boolean(form.admission.hafiz),
      },
      related_links: form.relatedLinks.filter((l) => l.description.trim() && l.url.trim()),
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
            email: form.account.email.trim(),
            status: form.account.status,
          },
          personal_details: {
            ...form.personal,
            gender: num(form.personal.gender),
            batch_id: num(form.personal.batch_id),
            blood_group: num(form.personal.blood_group),
            is_hostel: Boolean(form.personal.is_hostel),
          },
        };
      case "other":
        return {
          other_details: {
            ...form.other,
            religion_id: num(form.other.religion_id),
            caste_id: num(form.other.caste_id),
            social_category_id: num(form.other.social_category_id),
            madhab_id: num(form.other.madhab_id),
            is_orphan: Boolean(form.other.is_orphan),
          },
        };
      case "academic":
        return {
          academic_details: {
            ...form.academic,
            yoj: num(form.academic.yoj),
            yoc: num(form.academic.yoc),
            madras_joining_year: num(form.academic.madras_joining_year),
          },
        };
      case "family":
        return {
          family_details: {
            ...form.family,
            father_annual_income: num(form.family.father_annual_income),
            mother_annual_income: num(form.family.mother_annual_income),
          },
        };
      case "address": {
        const addresses = form.addresses
          .filter((a) =>
            Object.entries(a).some(([k, v]) => k !== "address_type" && String(v || "").trim())
          )
          .map((a) => ({ ...a, address_type: Number(a.address_type) }));
        return { address: addresses };
      }
      case "qualifications": {
        const qualifications = form.qualifications
          .filter((q) =>
            Object.entries(q).some(([k, v]) => k !== "level" && String(v || "").trim())
          )
          .map((q) => ({
            ...q,
            passing_year: num(q.passing_year),
            marks: q.marks === "" ? null : Number(q.marks),
            total_marks: q.total_marks === "" ? null : Number(q.total_marks),
          }));
        return {
          qualifications,
          extra_qualifications: form.extraQualifications.filter((q) => q.course_name.trim()),
        };
      }
      case "admission":
        return {
          admission_details: {
            ...form.admission,
            entrance_mark:
              form.admission.entrance_mark === "" ? null : Number(form.admission.entrance_mark),
            entrance_rank: num(form.admission.entrance_rank),
            hafiz: Boolean(form.admission.hafiz),
          },
        };
      case "links":
        return {
          related_links: form.relatedLinks.filter((l) => l.description.trim() && l.url.trim()),
        };
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
      await updateStudent(id, payload);
      toast.success(crudMessage("update", "Student", "success"));
      if (close) {
        navigate(`${basePath}/students`);
      }
    } catch (err) {
      setSaveError(
        err?.response?.data?.message || "Couldn't save this student. Please check the form and try again."
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
      await createStudent(payload);
      toast.success(crudMessage("create", "Student", "success"));
      navigate(`${basePath}/students`);
    } catch (err) {
      const fallback = crudMessage("create", "Student", "error");
      setSaveError(
        err?.response?.data?.message || "Couldn't save this student. Please check the form and try again."
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
          <div className="st-form-placeholder">Loading student…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="st-page sf-page">
      <div className="st-page-header">
        <div className="st-title-block">
          <h1>{isEdit ? "Edit Student" : "Add New Student"}</h1>
          <p className="st-title-meta">
            {isEdit ? `Editing student #${id}` : "Fill in the student's details below"}
          </p>
        </div>
        <div className="sf-header-actions">
          {isEdit && (
            <button
              type="button"
              className="st-btn st-btn-ghost"
              onClick={() => loadStudent({ silent: true })}
              disabled={refreshing || loading}
            >
              {refreshing ? "Refreshing…" : "⟳ Refresh"}
            </button>
          )}
          <button
            type="button"
            className="st-btn st-btn-ghost"
            onClick={() => navigate(`${basePath}/students`)}
          >
            ← Back
          </button>
        </div>
      </div>

      {loadError && <div className="st-error-banner sf-page-error">{loadError}</div>}

      <form className="st-card sf-card" onSubmit={handleSubmit}>
        <div className="sf-tabs" role="tablist">
          {SECTIONS.map((s) => (
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
              <s.Icon />
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
            <span>{SECTIONS.find((s) => s.key === activeSection)?.label}</span>
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {mobileTabsOpen && (
            <div className="sf-mobile-tabs-list">
              {SECTIONS.map((s) => (
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
                  <s.Icon />
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
                  {/* Row 1: Full Name, Email, Photo URL moved to end on mobile
                      (see .sf-field-photo order rule in StudentForm.css) */}
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
                      <label className="sf-label">Email</label>
                      <input
                        type="email"
                        className="sf-input"
                        placeholder="Email"
                        value={form.account.email}
                        onChange={(e) => setField("account", "email", e.target.value)}
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
                          folderUrl={DRIVE_FOLDERS.studentPhotos}
                          label="Open student photos Drive folder"
                        />
                      </div>
                    </div>
                    <div className="sf-field sf-field-photo-preview-mobile">
                      <span className="sf-label" aria-hidden="true">&nbsp;</span>
                      <div className="sf-photo-preview sf-photo-preview-compact">
                        {photoPreviewOk ? (
                          <img
                            src={form.personal.photo_url}
                            alt="Student preview"
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

                  {/* Row 2: Date of Birth, Gender, Roll Number */}
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
                      <label className="sf-label">Gender</label>
                      <select
                        className="sf-input"
                        value={form.personal.gender}
                        onChange={(e) => setField("personal", "gender", e.target.value)}
                      >
                        <option value="">Select gender</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Roll Number *</label>
                      <input
                        className="sf-input"
                        placeholder="Roll Number"
                        value={form.personal.roll_number}
                        onChange={(e) => handleRollNumberChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 3: Blood Group, Mother Tongue, Batch */}
                  <div className="sf-grid sf-grid-3">
                    <div className="sf-field">
                      <label className="sf-label">Blood Group</label>
                      <select
                        className="sf-input"
                        value={form.personal.blood_group}
                        onChange={(e) => setField("personal", "blood_group", e.target.value)}
                      >
                        <option value="">Select blood group</option>
                        {BLOOD_GROUP_OPTIONS.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Mother Tongue</label>
                      <input
                        className="sf-input"
                        placeholder="Mother Tongue"
                        value={form.personal.mother_tongue}
                        onChange={(e) => setField("personal", "mother_tongue", e.target.value)}
                      />
                    </div>
                    <div className="sf-field">
                      <label className="sf-label">Batch</label>
                      <SearchableDropdown
                        allLabel="Select batch"
                        options={batchOptions}
                        value={form.personal.batch_id || "all"}
                        onChange={(v) => setField("personal", "batch_id", v === "all" ? "" : v)}
                        searchable
                        onFetch={searchBatches}
                        loaded={batchesLoaded}
                        loading={batchesLoading}
                        hideFetchButton
                        selectedLabel={batchesIndex[form.personal.batch_id]}
                        placeholder="Search batches…"
                      />
                    </div>
                  </div>

                  {/* Row 4: Mobile Number, Academic Status, Hostel Student */}
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
                      <label className="sf-label">Academic Status</label>
                      <select
                        className="sf-input"
                        value={form.personal.academic_status}
                        onChange={(e) => setField("personal", "academic_status", e.target.value)}
                      >
                        {ACADEMIC_STATUS_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sf-field sf-toggle-field">
                      <label className="sf-label">Hostel Student</label>
                      <label className="sf-switch">
                        <input
                          type="checkbox"
                          checked={form.personal.is_hostel}
                          onChange={(e) => setField("personal", "is_hostel", e.target.checked)}
                        />
                        <span className="sf-switch-track">
                          <span className="sf-switch-thumb" />
                        </span>
                        <span className="sf-switch-label">
                          {form.personal.is_hostel ? "Yes" : "No"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="sf-personal-side">
                  <div className="sf-photo-block sf-photo-block-compact">
                    <div className="sf-photo-preview sf-photo-preview-compact">
                      {photoPreviewOk ? (
                        <img
                          src={form.personal.photo_url}
                          alt="Student preview"
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
                          defaultVisible
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Other Details ---------------- */}
          {activeSection === "other" && (
            <section className="sf-section sf-section-loose">
              <div className="sf-grid sf-grid-3">
                <div className="sf-field">
                  <label className="sf-label">Religion</label>
                  <select
                    className="sf-input"
                    value={form.other.religion_id}
                    onChange={(e) => setField("other", "religion_id", e.target.value)}
                  >
                    <option value="">Select religion</option>
                    {RELIGION_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sf-field">
                  <label className="sf-label">Caste</label>
                  <select
                    className="sf-input"
                    value={form.other.caste_id}
                    onChange={(e) => setField("other", "caste_id", e.target.value)}
                  >
                    <option value="">Select caste</option>
                    {CASTE_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sf-field">
                  <label className="sf-label">Social Category</label>
                  <select
                    className="sf-input"
                    value={form.other.social_category_id}
                    onChange={(e) => setField("other", "social_category_id", e.target.value)}
                  >
                    <option value="">Select category</option>
                    {SOCIAL_CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sf-field">
                  <label className="sf-label">Madhab</label>
                  <select
                    className="sf-input"
                    value={form.other.madhab_id}
                    onChange={(e) => setField("other", "madhab_id", e.target.value)}
                  >
                    <option value="">Select madhab</option>
                    {MADHAB_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sf-field">
                  <label className="sf-label">Aadhar Number</label>
                  <input
                    className="sf-input"
                    placeholder="Aadhar Number"
                    value={form.other.aadhar_no}
                    onChange={(e) => setField("other", "aadhar_no", e.target.value)}
                  />
                </div>
                <div className="sf-field sf-toggle-field">
                  <label className="sf-label">Orphan Student</label>
                  <label className="sf-switch">
                    <input
                      type="checkbox"
                      checked={form.other.is_orphan}
                      onChange={(e) => setField("other", "is_orphan", e.target.checked)}
                    />
                    <span className="sf-switch-track">
                      <span className="sf-switch-thumb" />
                    </span>
                    <span className="sf-switch-label">{form.other.is_orphan ? "Yes" : "No"}</span>
                  </label>
                </div>
              </div>

              <div className="sf-grid sf-grid-2 sf-mt">
                <div className="sf-field">
                  <label className="sf-label">Medical Remarks</label>
                  <textarea
                    className="sf-input sf-textarea"
                    placeholder="Medical Remarks"
                    value={form.other.medical_remarks}
                    onChange={(e) => setField("other", "medical_remarks", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Notes</label>
                  <textarea
                    className="sf-input sf-textarea"
                    placeholder="Notes"
                    value={form.other.notes}
                    onChange={(e) => setField("other", "notes", e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Academic Details ---------------- */}
          {activeSection === "academic" && (
            <section className="sf-section sf-section-loose">
              <h3 className="sf-subheading">Crescent Info</h3>
              <div className="sf-grid sf-grid-academic-1">
                <div className="sf-field">
                  <label className="sf-label">RRN</label>
                  <input
                    className="sf-input"
                    placeholder="RRN"
                    value={form.academic.rrn}
                    onChange={(e) => setField("academic", "rrn", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">University Email</label>
                  <input
                    type="email"
                    className="sf-input"
                    placeholder="University Email"
                    value={form.academic.univ_email}
                    onChange={(e) => setField("academic", "univ_email", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Year of Joining</label>
                  <input
                    type="number"
                    className="sf-input"
                    placeholder="Year of Joining"
                    value={form.academic.yoj}
                    onChange={(e) => setField("academic", "yoj", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Year of Completion</label>
                  <input
                    type="number"
                    className="sf-input"
                    placeholder="Year of Completion"
                    value={form.academic.yoc}
                    onChange={(e) => setField("academic", "yoc", e.target.value)}
                  />
                </div>
              </div>

              <h3 className="sf-subheading">Madras University Info</h3>
              <div className="sf-grid sf-grid-academic-2">
                <div className="sf-field">
                  <label className="sf-label">Madras Course</label>
                  <input
                    className="sf-input"
                    placeholder="Madras Course"
                    value={form.academic.madras_course}
                    onChange={(e) => setField("academic", "madras_course", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Madras Roll No</label>
                  <input
                    className="sf-input"
                    placeholder="Madras Roll No"
                    value={form.academic.madras_roll_no}
                    onChange={(e) => setField("academic", "madras_roll_no", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Madras Joining Year</label>
                  <input
                    type="number"
                    className="sf-input"
                    placeholder="Madras Joining Year"
                    value={form.academic.madras_joining_year}
                    onChange={(e) => setField("academic", "madras_joining_year", e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Family Details ---------------- */}
          {activeSection === "family" && (
            <section className="sf-section">
              <div className="sf-compare-wrap">
                <div className="sf-compare sf-compare-2col sf-compare-family">
                  <div className="sf-compare-header">
                    <div className="sf-compare-label-head">Fields</div>
                    <div>Father</div>
                    <div>Mother</div>
                  </div>
                  {FAMILY_ROWS.map((row) => (
                    <div className="sf-compare-row" key={row.key}>
                      <div className="sf-compare-label">{row.label}</div>
                      <div className="sf-compare-cell">
                        <span className="sf-compare-col-label">Father</span>
                        <input
                          className="sf-input"
                          type={row.type === "number" ? "number" : "text"}
                          placeholder={`Father's ${row.label}`}
                          value={form.family[`father_${row.key}`]}
                          onChange={(e) => setField("family", `father_${row.key}`, e.target.value)}
                        />
                      </div>
                      <div className="sf-compare-cell">
                        <span className="sf-compare-col-label">Mother</span>
                        <input
                          className="sf-input"
                          type={row.type === "number" ? "number" : "text"}
                          placeholder={`Mother's ${row.label}`}
                          value={form.family[`mother_${row.key}`]}
                          onChange={(e) => setField("family", `mother_${row.key}`, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="sf-subheading">Contact &amp; Guardian</h3>
              <div className="sf-grid sf-grid-3">
                {[
                  ["parent_email", "Parent Email"],
                  ["parent_whatsapp", "Parent WhatsApp"],
                  ["parent_sms", "Parent SMS Number"],
                  ["guardian_name", "Guardian Name"],
                  ["guardian_mobile", "Guardian Mobile"],
                  ["guardian_relationship", "Guardian Relationship"],
                ].map(([key, label]) => (
                  <div className="sf-field" key={key}>
                    <label className="sf-label">{label}</label>
                    <input
                      className="sf-input"
                      placeholder={label}
                      value={form.family[key]}
                      onChange={(e) => setField("family", key, e.target.value)}
                    />
                  </div>
                ))}
                <div className="sf-field sf-span-2">
                  <label className="sf-label">Guardian Address</label>
                  <textarea
                    className="sf-input sf-textarea"
                    placeholder="Guardian Address"
                    value={form.family.guardian_address}
                    onChange={(e) => setField("family", "guardian_address", e.target.value)}
                  />
                </div>
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

          {/* ---------------- Qualifications ---------------- */}
          {activeSection === "qualifications" && (
            <section className="sf-section">
              <div className="sf-compare-wrap">
                <div className="sf-compare sf-compare-3col">
                  <div className="sf-compare-header">
                    <div className="sf-compare-label-head">Fields</div>
                    {QUALIFICATION_LEVELS.map((lvl) => (
                      <div key={lvl}>{lvl}</div>
                    ))}
                  </div>
                  {QUALIFICATION_ROWS.map((row) => (
                    <div className="sf-compare-row" key={row.key}>
                      <div className="sf-compare-label">{row.label}</div>
                      {QUALIFICATION_LEVELS.map((lvl) => {
                        const q = form.qualifications.find((item) => item.level === lvl);
                        return (
                          <div className="sf-compare-cell" key={lvl}>
                            <span className="sf-compare-col-label">{lvl}</span>
                            {row.textarea ? (
                              <textarea
                                className="sf-input sf-textarea sf-textarea-sm"
                                placeholder={`${lvl} ${row.label}`}
                                value={q[row.key]}
                                onChange={(e) => setQualificationField(lvl, row.key, e.target.value)}
                              />
                            ) : (
                              <input
                                type={row.type === "number" ? "number" : "text"}
                                className="sf-input"
                                placeholder={`${lvl} ${row.label}`}
                                value={q[row.key]}
                                onChange={(e) => setQualificationField(lvl, row.key, e.target.value)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="sf-dynamic-header">
                <h3 className="sf-subheading">Additional Qualifications</h3>
                <button type="button" className="st-btn st-btn-ghost sf-add-btn" onClick={addExtraQualification}>
                  <PlusIcon /> Add
                </button>
              </div>

              {form.extraQualifications.length === 0 && (
                <p className="sf-empty-hint">No additional qualifications added.</p>
              )}

              {form.extraQualifications.map((q, idx) => (
                <div className="sf-dynamic-row" key={idx}>
                  <div className="sf-field">
                    <label className="sf-label">Course Name</label>
                    <input
                      className="sf-input"
                      placeholder="Course Name"
                      value={q.course_name}
                      onChange={(e) => updateExtraQualification(idx, "course_name", e.target.value)}
                    />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">Certificate URL</label>
                    <div className="sf-photo-input-row">
                      <input
                        type="url"
                        className="sf-input"
                        placeholder="Certificate URL"
                        value={q.cert_url}
                        onChange={(e) => updateExtraQualification(idx, "cert_url", e.target.value)}
                      />
                      <DriveFolderButton folderUrl={DRIVE_FOLDERS.certificates} label="Open certificates Drive folder" />
                    </div>
                  </div>
                  <div className="sf-row-remove-wrap">
                    <span className="sf-row-remove-spacer" aria-hidden="true">&nbsp;</span>
                    <button
                      type="button"
                      className="st-icon-btn st-icon-btn-danger sf-row-remove"
                      aria-label="Remove qualification"
                      onClick={() => removeExtraQualification(idx)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ---------------- Admission Details ---------------- */}
          {activeSection === "admission" && (
            <section className="sf-section sf-section-loose">
              <div className="sf-grid sf-grid-3">
                <div className="sf-field">
                  <label className="sf-label">Admission Date</label>
                  <input
                    type="date"
                    className="sf-input"
                    value={form.admission.admission_date}
                    onChange={(e) => setField("admission", "admission_date", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Entrance Mark</label>
                  <input
                    type="number"
                    step="0.01"
                    className="sf-input"
                    placeholder="Entrance Mark"
                    value={form.admission.entrance_mark}
                    onChange={(e) => setField("admission", "entrance_mark", e.target.value)}
                  />
                </div>

                <div className="sf-field">
                  <label className="sf-label">Entrance Rank</label>
                  <input
                    type="number"
                    className="sf-input"
                    placeholder="Entrance Rank"
                    value={form.admission.entrance_rank}
                    onChange={(e) => setField("admission", "entrance_rank", e.target.value)}
                  />
                </div>
                <div className="sf-field">
                  <label className="sf-label">Recommended By</label>
                  <input
                    className="sf-input"
                    placeholder="Recommended By"
                    value={form.admission.recommended_by}
                    onChange={(e) => setField("admission", "recommended_by", e.target.value)}
                  />
                </div>

                <div className="sf-field sf-toggle-field">
                  <label className="sf-label">Hafiz</label>
                  <label className="sf-switch">
                    <input
                      type="checkbox"
                      checked={form.admission.hafiz}
                      onChange={(e) => setField("admission", "hafiz", e.target.checked)}
                    />
                    <span className="sf-switch-track">
                      <span className="sf-switch-thumb" />
                    </span>
                    <span className="sf-switch-label">{form.admission.hafiz ? "Yes" : "No"}</span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ---------------- Related Links ---------------- */}
          {activeSection === "links" && (
            <section className="sf-section">
              <div className="sf-dynamic-header sf-dynamic-header-links">
                <button type="button" className="st-btn st-btn-ghost sf-add-btn" onClick={addRelatedLink}>
                  <PlusIcon /> Add
                </button>
              </div>

              {form.relatedLinks.length === 0 && <p className="sf-empty-hint">No related links added.</p>}

              {form.relatedLinks.map((l, idx) => (
                <div className="sf-dynamic-row" key={idx}>
                  <div className="sf-field">
                    <label className="sf-label">Description</label>
                    <input
                      className="sf-input"
                      placeholder="Description"
                      value={l.description}
                      onChange={(e) => updateRelatedLink(idx, "description", e.target.value)}
                    />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">URL</label>
                    <div className="sf-photo-input-row">
                      <input
                        type="url"
                        className="sf-input"
                        placeholder="URL"
                        value={l.url}
                        onChange={(e) => updateRelatedLink(idx, "url", e.target.value)}
                      />
                      <DriveFolderButton folderUrl={DRIVE_FOLDERS.documents} label="Open documents Drive folder" />
                    </div>
                  </div>
                  <div className="sf-row-remove-wrap">
                    <span className="sf-row-remove-spacer" aria-hidden="true">&nbsp;</span>
                    <button
                      type="button"
                      className="st-icon-btn st-icon-btn-danger sf-row-remove"
                      aria-label="Remove link"
                      onClick={() => removeRelatedLink(idx)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {saveError && <div className="st-error-banner sf-page-error">{saveError}</div>}

        <div className="sf-footer">
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
            onClick={() => navigate(`${basePath}/students`)}
            disabled={savingSave || savingClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;