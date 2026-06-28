// src/pages/admin/AdminDashboard.jsx

import '../../styles/dashboard.css';

import {
  Users, GraduationCap, CalendarCheck, ClipboardList,
  Calendar, ArrowRight, UserPlus, UserCheck,
  Megaphone, FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/* ── tiny SVG donut ────────────────────────────────────────── */
const DonutChart = ({ present = 186, absent = 48, leave = 11 }) => {
  const total = present + absent + leave;
  const pct   = Math.round((present / total) * 100);
  const r     = 54; const cx = 66; const cy = 66;
  const circ  = 2 * Math.PI * r;
  const dash  = (v) => (v / total) * circ;

  const segments = [
    { color: "#4f7fe8", value: present },
    { color: "#ef4444", value: absent  },
    { color: "#f59e0b", value: leave   },
  ];

  let offset = 0;
  const arcs = segments.map(({ color, value }) => {
    const d = dash(value);
    const el = (
      <circle key={color} cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth="16"
        strokeDasharray={`${d} ${circ - d}`}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
      />
    );
    offset += d;
    return el;
  });

  return (
    <div className="dashboard-donut-wrapper">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-border)" strokeWidth="16" />
        {arcs}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--color-text)">{pct}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">Present</text>
      </svg>
      <ul className="dashboard-donut-legend" style={{ listStyle: "none" }}>
        {[
          { dot: "#4f7fe8", label: "Present", val: present },
          { dot: "#ef4444", label: "Absent",  val: absent  },
          { dot: "#f59e0b", label: "Leave",   val: leave   },
        ].map(({ dot, label, val }) => (
          <li key={label} className="dashboard-donut-legend-item">
            <span className="dashboard-donut-legend-dot" style={{ background: dot }} />
            <span>{label}</span>
            <strong style={{ marginLeft: "auto", paddingLeft: 16 }}>{val}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ── stat-card icon backgrounds ────────────────────────────── */
const iconStyles = {
  blue:   { background: "#eef2fd", color: "#4f7fe8" },
  green:  { background: "#ecfdf5", color: "#16a34a" },
  orange: { background: "#fff7ed", color: "#ea580c" },
  purple: { background: "#f5f3ff", color: "#7c3aed" },
};
// const darkIcon = {
//   blue:   { background: "rgba(79,127,232,0.18)" },
//   green:  { background: "rgba(22,163,74,0.18)"  },
//   orange: { background: "rgba(234,88,12,0.18)"  },
//   purple: { background: "rgba(124,58,237,0.18)" },
// };

/* ── helpers ───────────────────────────────────────────────── */
const now = new Date();
const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
const dateStr = now.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">

      {/* ── Welcome ── */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome__text">
          <small>Welcome back,</small>
          <h1>{user?.name || "Administrator"} 👋</h1>
          <p>Here's what's happening in your institution today.</p>
        </div>
        <div className="dashboard-date-card">
          <span className="dashboard-date-card__icon">
            <Calendar size={22} />
          </span>
          <div className="dashboard-date-card__info">
            <span>{dayName}, {dateStr}</span>
            <span>{timeStr}</span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="dashboard-stats-grid">
        {[
          { label: "Total Students",    value: "245",     sub: "+12 this month", subType: "positive", Icon: GraduationCap, theme: "blue"   },
          { label: "Staff Members",     value: "28",      sub: "+2 this month",  subType: "positive", Icon: Users,         theme: "green"  },
          { label: "Today's Attendance",value: "186",     sub: "76% Present",    subType: "warning",  Icon: CalendarCheck, theme: "orange" },
          { label: "Pending Fees",      value: "₹ 1,24,500", sub: "18 Students", subType: "warning",  Icon: ClipboardList, theme: "purple" },
        ].map(({ label, value, sub, subType, Icon, theme }) => (
          <div key={label} className="dashboard-stat-card">
            <div
              className="dashboard-stat-card__icon"
              style={iconStyles[theme]}
            >
              <Icon size={22} color={iconStyles[theme].color} />
            </div>
            <div className="dashboard-stat-card__body">
              <div className="dashboard-stat-card__label">{label}</div>
              <div className="dashboard-stat-card__value">{value}</div>
              <div className={`dashboard-stat-card__sub dashboard-stat-card__sub--${subType}`}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle row ── */}
      <div className="dashboard-content-row">
        {/* Attendance */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">Attendance Overview (Today)</div>
          <div className="dashboard-card__body">
            <DonutChart />
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 12 }}>
              Total Students: <strong style={{ color: "var(--color-text)" }}>245</strong>
            </p>
          </div>
        </div>

        {/* Fee Collection */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">Fee Collection (This Month)</div>
          <div className="dashboard-card__body">
            <div className="dashboard-fee-amount">₹ 3,45,200</div>
            <div className="dashboard-fee-row">
              <span>Collected</span>
              <span>69%</span>
            </div>
            <div className="dashboard-progress">
              <div className="dashboard-progress__fill" style={{ width: "69%" }} />
            </div>
            <div className="dashboard-fee-total">Total Fees: ₹ 5,00,000</div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">Upcoming Events</div>
          <div className="dashboard-card__body">
            <div className="dashboard-events-list">
              {[
                { mon: "JUN", day: "25", title: "Staff Meeting",          time: "25 Jun, 10:00 AM" },
                { mon: "JUN", day: "25", title: "Parent – Teacher Meeting",time: "25 Jun, 02:00 PM" },
                { mon: "JUL", day: "01", title: "Semester Examination",   time: "1 Jul, 09:00 AM" },
              ].map(({ mon, day, title, time }) => (
                <div key={title} className="dashboard-event-item">
                  <div className="dashboard-event-date">
                    <span>{mon}</span>
                    <span>{day}</span>
                  </div>
                  <div className="dashboard-event-info">
                    <strong>{title}</strong>
                    <span>{time}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="dashboard-btn-calendar">
              View Calendar <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="dashboard-bottom-row">
        {/* Recent Activities */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">Recent Activities</div>
          <div className="dashboard-card__body">
            <ul className="dashboard-activity-list">
              {[
                { icon: <GraduationCap size={14} />, bg: "#eef2fd", color: "#4f7fe8", text: "New student admission completed",         time: "20 Jun 2026, 11:20 AM" },
                { icon: <CalendarCheck  size={14} />, bg: "#ecfdf5", color: "#16a34a", text: "Attendance marked for Class X – A",       time: "20 Jun 2026, 10:15 AM" },
                { icon: <ClipboardList  size={14} />, bg: "#fff7ed", color: "#ea580c", text: "Fees payment received from Mohamed Ashik", time: "19 Jun 2026, 04:30 PM" },
                { icon: <Users          size={14} />, bg: "#f5f3ff", color: "#7c3aed", text: "New staff member Dr. Ahmed Ali joined",    time: "19 Jun 2026, 09:10 AM" },
              ].map(({ icon, bg, color, text, time }) => (
                <li key={text} className="dashboard-activity-item">
                  <span className="dashboard-activity-item__icon" style={{ background: bg, color }}>
                    {icon}
                  </span>
                  <span className="dashboard-activity-item__text">{text}</span>
                  <span className="dashboard-activity-item__time">{time}</span>
                </li>
              ))}
            </ul>
            <button className="dashboard-btn-view-all">
              View All Activities <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-quick-actions">
          <div className="dashboard-quick-actions__title">Quick Actions</div>
          <div className="dashboard-quick-actions__grid">
            {[
              { Icon: UserPlus,   label: "Add Student"     },
              { Icon: UserCheck,  label: "Add Staff Member" },
              { Icon: Megaphone,  label: "Create Notice"   },
              { Icon: CalendarCheck,label: "Mark Attendance" },
              { Icon: FileText,   label: "Generate Report" },
              { Icon: Calendar,   label: "View Timetable"  },
            ].map(({ Icon, label }) => (
              <button key={label} className="dashboard-quick-action-btn">
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;