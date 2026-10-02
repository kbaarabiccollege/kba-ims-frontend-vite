// src/pages/admin/reports/attendance/SubjectWiseAttendance.jsx
//
// Subject wise attendance report (same layout as StudentWiseAttendance): breadcrumb, title row with Export menu
// (PDF / Print PDF / Excel CSV), filter bar, and the report body. The report is fetched
// only after Course, Academic Session, Classroom and Subject are all chosen.
//
// Sorting: click a column header -> ascending, click again -> descending,
// click a third time -> back to the original order. Clicking "#" also resets.
// Exports follow the order currently shown on screen.
//
// Export deps:  npm i jspdf jspdf-autotable   (Excel export is a plain CSV, no package needed)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "../../../../hooks/usePageTitle";
import { getCourses } from "../../../../api/coursesApi";
import { getAcademicTerms } from "../../../../api/academicTermsApi";
import { getClassrooms } from "../../../../api/classroomsApi";
import { getSubjects } from "../../../../api/subjectsApi";
import { getSubjectWiseAttendance } from "../../../../api/reportsApi";
import SearchableDropdown from "../../../../components/common/SearchableDropdown";
import "./AttendanceReports.css";

/* ---------- label helpers (adjust field names to your backend) ---------- */

/** List endpoints may return data.data, data.data.items, data.items … */
const toList = (payload) => {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  return d?.items || d?.rows || d?.results || d?.data || [];
};
const isOn = (v) => v === true || v === 1 || v === "1";

const courseLabel = (c) => c.name || `Course ${c.id}`;
const termLabel = (t) => t.academic_term_name || t.name || t.term_name || `Term ${t.id}`;
const classroomLabel = (c) => c.name || `Classroom ${c.id}`;
const subjectLabel = (s) => (s.code ? `${s.code} - ${s.name}` : s.name || `Subject ${s.id}`);

const pctLevel = (p) => (p >= 85 ? "good" : p >= 75 ? "warn" : "low");
const fmtPct = (p) => `${Number(p ?? 0)}%`;
const sumOf = (rows, field) => rows.reduce((sum, r) => sum + Number(r[field] || 0), 0);

/* ---------- sortable columns ---------- */

const COLUMNS = [
  { key: "name", label: "Student Name", type: "text", get: (r) => r.student?.student_name },
  { key: "roll", label: "Roll No", type: "text", get: (r) => r.student?.roll_no },
  { key: "rrn", label: "RRN", type: "text", get: (r) => r.student?.rrn },
  { key: "present", label: "Present", type: "num", get: (r) => r.present_days },
  { key: "od", label: "OD", type: "num", get: (r) => r.od_days },
  { key: "absent", label: "Absent", type: "num", get: (r) => r.absent_days },
  { key: "total", label: "Total", type: "num", get: (r) => r.total_days },
  { key: "attendance", label: "Attendance", type: "num", get: (r) => r.attendance_percentage },
];

const isEmpty = (v) => v == null || v === "";

/** Stable sort: empty values always go last, ties keep the original order. */
const sortRows = (rows, sort) => {
  if (!sort) return rows;
  const col = COLUMNS.find((c) => c.key === sort.key);
  if (!col) return rows;
  const dir = sort.dir === "desc" ? -1 : 1;

  return rows
    .map((row, i) => ({ row, i, v: col.get(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.v);
      const bEmpty = isEmpty(b.v);
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.i - b.i : aEmpty ? 1 : -1;

      const cmp =
        col.type === "num"
          ? Number(a.v) - Number(b.v)
          : String(a.v).localeCompare(String(b.v), undefined, { numeric: true, sensitivity: "base" });

      return cmp !== 0 ? cmp * dir : a.i - b.i;
    })
    .map((x) => x.row);
};

/* ---------- icons ---------- */

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CaretIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PdfIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M14 3.5V8h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const PrintIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="7" y="14" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const SheetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="4.5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 10h16M4 15h16M10 4.5v15" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
/** Up/down arrows; the active direction is highlighted via CSS. */
const SortIcon = ({ dir }) => (
  <svg className={`swa-sort-icon${dir ? ` is-${dir}` : ""}`} width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
    <path className="up" d="M6 1 2.5 5.5h7L6 1Z" fill="currentColor" />
    <path className="down" d="M6 13 2.5 8.5h7L6 13Z" fill="currentColor" />
  </svg>
);

/* ---------- small pieces ---------- */

/**
 * Server-searched dropdown data, same idea as the Students page:
 * current options + an ever-growing id->label index (so a selected value
 * keeps its label after the search results change) + a request-id guard
 * so a slow, stale response can't overwrite a newer one.
 * search(q) resolves to the raw list, or null if it failed / went stale.
 */
const useLookup = (fetcher, toOption, errorMessage) => {
  const [options, setOptions] = useState([]);
  const [index, setIndex] = useState({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const reqRef = useRef(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const optRef = useRef(toOption);
  optRef.current = toOption;

  const search = useCallback(async (q = "") => {
    const id = ++reqRef.current;
    setLoading(true);
    try {
      const list = toList(await fetchRef.current(q));
      if (id !== reqRef.current) return null;
      const opts = list.map(optRef.current);
      setOptions(opts);
      setIndex((prev) => {
        const next = { ...prev };
        opts.forEach((o) => { next[o.id] = o.label; });
        return next;
      });
      setLoaded(true);
      setError("");
      return list;
    } catch {
      if (id === reqRef.current) { setOptions([]); setError(errorMessage); }
      return null;
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, [errorMessage]);

  const reset = useCallback(() => {
    reqRef.current += 1;
    setOptions([]);
    setLoaded(false);
    setLoading(false);
  }, []);

  return { options, index, loading, loaded, error, search, reset };
};

const EMPTY = { course: "", term: "", classroom: "", subject: "" };

/* ---------- component ---------- */

const SubjectWiseAttendance = () => {
  usePageTitle(["Reports", "Subject Wise Attendance"]);

  const [filters, setFilters] = useState(EMPTY);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // null = original (server) order, otherwise { key, dir: "asc" | "desc" }
  const [sort, setSort] = useState(null);

  // start from the original order whenever a new report is loaded / filters change
  useEffect(() => {
    setSort(null);
  }, [report]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  /* latest course / classroom, read by the search functions below */
  const courseRef = useRef("");
  courseRef.current = filters.course;
  const classroomRef = useRef("");
  classroomRef.current = filters.classroom;

  const courses = useLookup(
    (q) => getCourses({ is_active: 1, q, limit: 100 }),
    (c) => ({ id: c.id, label: courseLabel(c) }),
    "Couldn't load courses."
  );
  const terms = useLookup(
    (q) => getAcademicTerms({ course_id: courseRef.current, is_active: 1, q, limit: 100 }),
    (t) => ({ id: t.id, label: termLabel(t) }),
    "Couldn't load academic sessions."
  );
  const classrooms = useLookup(
    (q) => getClassrooms({ isActive: 1, q, course: courseRef.current, limit: 100 }),
    (c) => ({ id: c.id, label: classroomLabel(c) }),
    "Couldn't load classrooms."
  );
  const subjects = useLookup(
    (q) => getSubjects({ classroom_id: classroomRef.current, q, limit: 100 }),
    (sb) => ({ id: sb.id, label: subjectLabel(sb) }),
    "Couldn't load subjects."
  );

  const optsError = courses.error || terms.error || classrooms.error || subjects.error;

  /* Clearing rules: course resets everything below it; classroom resets
     subject; academic session only changes which term the report uses. */
  const CLEARS = { course: ["term", "classroom", "subject"], term: [], classroom: ["subject"], subject: [] };

  const setFilter = (key, value) =>
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      CLEARS[key].forEach((k) => (next[k] = ""));
      return next;
    });

  // SearchableDropdown uses "all" as its "nothing picked" value
  const pick = (key) => (v) => setFilter(key, v === "all" ? "" : String(v));

  /* page load: courses -> preselect the default course */
  useEffect(() => {
    courses.search("").then((list) => {
      if (!list) return;
      const def = list.find((c) => isOn(c.is_default)) || list[0];
      if (def) setFilters((p) => (p.course ? p : { ...p, course: String(def.id) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* course -> academic sessions (preselect the current one) + classrooms */
  useEffect(() => {
    terms.reset();
    classrooms.reset();
    if (!filters.course) return;
    const forCourse = filters.course;
    terms.search("").then((list) => {
      if (!list) return;
      const cur = list.find((t) => isOn(t.is_current));
      if (cur) setFilters((p) => (p.course === forCourse ? { ...p, term: String(cur.id) } : p));
    });
    classrooms.search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.course]);

  /* classroom -> subjects */
  useEffect(() => {
    subjects.reset();
    if (filters.classroom) subjects.search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.classroom]);

  /* report: only when ALL four filters are selected */
  const allSelected = filters.course && filters.term && filters.classroom && filters.subject;

  useEffect(() => {
    setReport(null);
    setReportError("");
    if (!allSelected) return;
    let off = false;
    setLoadingReport(true);
    getSubjectWiseAttendance({
      academicTermId: filters.term,
      classroomId: filters.classroom,
      subjectId: filters.subject,
    })
      .then((d) => !off && setReport(d))
      .catch((err) =>
        !off && setReportError(err?.response?.data?.message || "Couldn't load the report. Try again.")
      )
      .finally(() => !off && setLoadingReport(false));
    return () => { off = true; };
  }, [allSelected, filters.term, filters.classroom, filters.subject]);

  /* close export menu on outside click / Escape */
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => exportRef.current && !exportRef.current.contains(e.target) && setExportOpen(false);
    const onKey = (e) => e.key === "Escape" && setExportOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [exportOpen]);

  /* ---------- data, totals & sorting ---------- */

  const rows = useMemo(() => report?.student_attendance || [], [report]);

  // class-wide figures (shown in the header and in the "Overall" footer row)
  const stats = useMemo(() => {
    const below = rows.filter((r) => Number(r.attendance_percentage || 0) < 75).length;
    return {
      // take the totals straight from the API; fall back to summing the rows
      avg: Number(report?.total_attendance_percentage ?? 0),
      below,
      present: report?.total_present_days ?? sumOf(rows, "present_days"),
      od: report?.total_od_days ?? sumOf(rows, "od_days"),
      absent: report?.total_absent_days ?? sumOf(rows, "absent_days"),
      total: report?.total_days ?? sumOf(rows, "total_days"),
    };
  }, [report, rows]);

  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort]);

  // asc -> desc -> original order
  const toggleSort = (key) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });

  const resetSort = () => setSort(null);

  const dirOf = (key) => (sort?.key === key ? sort.dir : null);

  /* ---------- export (uses the order currently shown) ---------- */

  const exportRows = useMemo(() => {
    if (!report) return { head: [], body: [], foot: [] };
    const head = ["#", "Student Name", "Roll No", "RRN", "Present", "OD", "Absent", "Total Days", "Attendance %"];
    const body = sortedRows.map((r, i) => [
      i + 1,
      r.student?.student_name ?? "",
      r.student?.roll_no ?? "",
      r.student?.rrn ?? "",
      r.present_days,
      r.od_days,
      r.absent_days,
      r.total_days,
      fmtPct(r.attendance_percentage),
    ]);
    const foot = [
      "", "Overall", "", "",
      stats.present, stats.od, stats.absent, stats.total, fmtPct(stats.avg),
    ];
    return { head, body, foot };
  }, [report, sortedRows, stats]);

  const fileBase = () =>
    `subject-wise-attendance_${report?.subject?.code || report?.subject?.id || "report"}`;

  const infoLines = () => [
    ["Subject", `${report.subject?.name ?? ""}${report.subject?.code ? ` (${report.subject.code})` : ""}`],
    ["Students", report.total_students],
  ];

  const buildPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.text("Subject Wise Attendance", 40, 48);
    doc.setFontSize(10);
    infoLines().forEach(([k, v], i) => doc.text(`${k}: ${v ?? "-"}`, 40, 70 + i * 15));
    autoTable(doc, {
      startY: 70 + infoLines().length * 15 + 10,
      head: [exportRows.head],
      body: exportRows.body,
      foot: [exportRows.foot],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [33, 75, 134] },
      footStyles: { fillColor: [232, 240, 253], textColor: [20, 33, 61] },
    });
    return doc;
  };

  const exportPdf = async () => {
    setExportOpen(false);
    if (!report) return;
    const doc = await buildPdf();
    doc.save(`${fileBase()}.pdf`);
  };

  /* Print PDF: render the PDF into a hidden iframe and open the system
     print dialog. Falls back to opening the PDF in a new tab. */
  const printPdf = async () => {
    setExportOpen(false);
    if (!report) return;
    const doc = await buildPdf();
    const url = URL.createObjectURL(doc.output("blob"));
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          window.open(url, "_blank");
        }
      }, 300);
    };
    document.body.appendChild(iframe);
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 120000);
  };

  const exportExcel = () => {
    setExportOpen(false);
    if (!report) return;

    // Quote every cell, double inner quotes, and neutralise spreadsheet
    // formulas (=, +, -, @) in text cells to prevent CSV injection.
    const cell = (v) => {
      let t = v == null ? "" : String(v);
      if (typeof v === "string" && /^[=+\-@]/.test(t)) t = `'${t}`;
      return `"${t.replace(/"/g, '""')}"`;
    };

    const csvRows = [
      ["Subject Wise Attendance"],
      ...infoLines(),
      [],
      exportRows.head,
      ...exportRows.body,
      exportRows.foot,
    ];

    const csv = csvRows.map((r) => r.map(cell).join(",")).join("\r\n");

    // "\uFEFF" (BOM) makes Excel read the file as UTF-8, so Arabic/Urdu
    // and other non-English names display correctly.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---------- render ---------- */

  return (
    <div className="swa-page">
      <nav className="swa-breadcrumb" aria-label="Breadcrumb">
        <Link to="/admin/reports">Reports</Link>
        <span aria-hidden="true">/</span>
        <Link to="/admin/reports/attendance">Attendance</Link>
      </nav>

      <div className="swa-title-row">
        <h1 className="swa-title">Subject Wise Attendance</h1>

        <div className="swa-export" ref={exportRef}>
          <button
            type="button"
            className="swa-export-btn"
            onClick={() => setExportOpen((o) => !o)}
            disabled={!report}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            title={report ? "Export report" : "Select all filters to enable export"}
          >
            <DownloadIcon />
            <span>Export</span>
            <CaretIcon />
          </button>

          {exportOpen && (
            <div className="swa-export-menu" role="menu">
              <button type="button" role="menuitem" onClick={exportPdf}>
                <PdfIcon /> PDF
              </button>
              <button type="button" role="menuitem" onClick={printPdf}>
                <PrintIcon /> Print PDF
              </button>
              <button type="button" role="menuitem" onClick={exportExcel}>
                <SheetIcon /> Excel (CSV)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="swa-filters">
        <div className="swa-filter">
          <span className="swa-filter-label">Course</span>
          <SearchableDropdown
            label="Course"
            allLabel="Select course"
            options={courses.options}
            value={filters.course || "all"}
            onChange={pick("course")}
            searchable
            onFetch={courses.search}
            loaded={courses.loaded}
            loading={courses.loading}
            hideFetchButton
            selectedLabel={courses.index[filters.course]}
            placeholder="Search courses…"
          />
        </div>
        <div className="swa-filter">
          <span className="swa-filter-label">Academic Session</span>
          <SearchableDropdown
            label="Academic Session"
            allLabel="Select session"
            options={terms.options}
            value={filters.term || "all"}
            onChange={pick("term")}
            searchable
            onFetch={terms.search}
            loaded={terms.loaded}
            loading={terms.loading}
            hideFetchButton
            selectedLabel={terms.index[filters.term]}
            placeholder="Search sessions…"
            disabled={!filters.course}
          />
        </div>
        <div className="swa-filter">
          <span className="swa-filter-label">Classroom</span>
          <SearchableDropdown
            label="Classroom"
            allLabel="Select classroom"
            options={classrooms.options}
            value={filters.classroom || "all"}
            onChange={pick("classroom")}
            searchable
            onFetch={classrooms.search}
            loaded={classrooms.loaded}
            loading={classrooms.loading}
            hideFetchButton
            selectedLabel={classrooms.index[filters.classroom]}
            placeholder="Search classrooms…"
            disabled={!filters.course}
          />
        </div>
        <div className="swa-filter">
          <span className="swa-filter-label">Subject</span>
          <SearchableDropdown
            label="Subject"
            allLabel="Select subject"
            options={subjects.options}
            value={filters.subject || "all"}
            onChange={pick("subject")}
            searchable
            onFetch={subjects.search}
            loaded={subjects.loaded}
            loading={subjects.loading}
            hideFetchButton
            selectedLabel={subjects.index[filters.subject]}
            placeholder="Search subjects…"
            disabled={!filters.classroom}
          />
        </div>
      </div>

      {optsError && <p className="swa-alert" role="alert">{optsError}</p>}

      {!allSelected && (
        <div className="swa-state">
          <p className="swa-state-title">Select filters to view the report</p>
          <p className="swa-state-sub">Choose a course, academic session, classroom and subject.</p>
        </div>
      )}

      {allSelected && loadingReport && (
        <div className="swa-state" aria-live="polite">
          <span className="swa-spinner" aria-hidden="true" />
          <p className="swa-state-sub">Loading report…</p>
        </div>
      )}

      {allSelected && reportError && !loadingReport && (
        <p className="swa-alert" role="alert">{reportError}</p>
      )}

      {report && !loadingReport && (
        <section className="swa-report">
          <header className="swa-student">
            <div>
              <h2 className="swa-student-name">{report.subject?.name}</h2>
              <p className="swa-student-meta">
                {[
                  report.subject?.code,
                  report.subject?.semester != null && `Semester ${report.subject.semester}`,
                  report.subject?.term != null && `Term ${report.subject.term}`,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
            <div className={`swa-overall swa-${pctLevel(stats.avg)}`}>
              <span className="swa-overall-value">{fmtPct(stats.avg)}</span>
              <span className="swa-overall-label">Class average</span>
            </div>
          </header>

          <dl className="swa-totals">
            <div><dt>Students</dt><dd>{report.total_students}</dd></div>
            <div><dt>Below 75%</dt><dd>{stats.below}</dd></div>
            <div><dt>Semester</dt><dd>{report.subject?.semester ?? "-"}</dd></div>
            <div><dt>Credits</dt><dd>{report.subject?.credits ?? "-"}</dd></div>
          </dl>

          {/* phones: the table header is hidden, so sorting lives here */}
          {rows.length > 0 && (
            <div className="swa-sortbar">
              <label htmlFor="swa-sort-select">Sort by</label>
              <select
                id="swa-sort-select"
                value={sort?.key || ""}
                onChange={(e) =>
                  setSort(e.target.value ? { key: e.target.value, dir: sort?.dir || "asc" } : null)
                }
              >
                <option value="">Default order</option>
                {COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => sort && setSort({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })}
                disabled={!sort}
                aria-label={sort?.dir === "desc" ? "Descending, switch to ascending" : "Ascending, switch to descending"}
              >
                {sort?.dir === "desc" ? "↓" : "↑"}
              </button>
            </div>
          )}

          <div className="swa-table-wrap">
            <table className="swa-table">
              <thead>
                <tr>
                  <th className="swa-th-index">
                    <button
                      type="button"
                      className={`swa-reset-btn${sort ? " is-active" : ""}`}
                      onClick={resetSort}
                      disabled={!sort}
                      title={sort ? "Reset sorting (original order)" : "#"}
                      aria-label={sort ? "Reset sorting" : "Row number"}
                    >
                      #
                    </button>
                  </th>
                  {COLUMNS.map((c) => {
                    const dir = dirOf(c.key);
                    return (
                      <th
                        key={c.key}
                        className={c.type === "num" ? "num" : undefined}
                        aria-sort={dir ? (dir === "asc" ? "ascending" : "descending") : "none"}
                      >
                        <button
                          type="button"
                          className={`swa-sort-btn${dir ? " is-active" : ""}`}
                          onClick={() => toggleSort(c.key)}
                          title={`Sort by ${c.label}`}
                        >
                          <span>{c.label}</span>
                          <SortIcon dir={dir} />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="swa-no-rows">No attendance recorded for this subject yet.</td>
                  </tr>
                ) : (
                  sortedRows.map((r, i) => (
                    <tr key={r.student?.student_id ?? i}>
                      <td data-label="#">{i + 1}</td>
                      <td data-label="Student Name" className="swa-subject">{r.student?.student_name}</td>
                      <td data-label="Roll No">{r.student?.roll_no}</td>
                      <td data-label="RRN">{r.student?.rrn}</td>
                      <td data-label="Present" className="num">{r.present_days}</td>
                      <td data-label="OD" className="num">{r.od_days}</td>
                      <td data-label="Absent" className="num">{r.absent_days}</td>
                      <td data-label="Total" className="num">{r.total_days}</td>
                      <td data-label="Attendance" className="num">
                        <span className={`swa-pill swa-${pctLevel(r.attendance_percentage)}`}>
                          {fmtPct(r.attendance_percentage)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4}>Overall</td>
                    <td className="num" data-label="Present">{stats.present}</td>
                    <td className="num" data-label="OD">{stats.od}</td>
                    <td className="num" data-label="Absent">{stats.absent}</td>
                    <td className="num" data-label="Total">{stats.total}</td>
                    <td className="num" data-label="Attendance">
                      <span className={`swa-pill swa-${pctLevel(stats.avg)}`}>{fmtPct(stats.avg)}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default SubjectWiseAttendance;