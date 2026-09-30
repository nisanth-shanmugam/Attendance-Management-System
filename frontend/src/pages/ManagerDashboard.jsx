import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaBell,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartBar,
  FaCheck,
  FaCheckSquare,
  FaChevronDown,
  FaCog,
  FaFileAlt,
  FaHome,
  FaPlane,
  FaRegClock,
  FaRegFileAlt,
  FaSignOutAlt,
  FaTasks,
  FaTimes,
  FaUserTimes,
  FaUsers,
} from "react-icons/fa";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import NotificationBell from "../components/NotificationBell";
import AnnouncementsTab from "../components/AnnouncementsTab";
import Pagination from "../components/Pagination";

const API = "http://127.0.0.1:8000/api";

const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "M";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusTone = {
  Present: { background: "#dcfce7", color: "#059669" },
  Absent: { background: "#fee2e2", color: "#ef4444" },
  "On Leave": { background: "#fff7ed", color: "#f97316" },
  Pending: { background: "#fef3c7", color: "#d97706" },
  Approved: { background: "#dcfce7", color: "#059669" },
  Rejected: { background: "#fee2e2", color: "#ef4444" },
};

export default function ManagerDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [profile, setProfile] = useState({
    full_name: localStorage.getItem("full_name") || "Manager",
    department: localStorage.getItem("department") || "IT Department",
    role: "manager",
  });
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myLeaveBalances, setMyLeaveBalances] = useState([]);
  const [myLeavePolicies, setMyLeavePolicies] = useState([]);
  const [myLeaveForm, setMyLeaveForm] = useState({ leave_type: 'CL', start_date: '', end_date: '', reason: '' });
  const [myLeaveError, setMyLeaveError] = useState('');
  const [myClaims, setMyClaims] = useState([]);
  const [myClaimForm, setMyClaimForm] = useState({ date: '', check_in_time: '', check_out_time: '', reason: '' });
  const [myClaimError, setMyClaimError] = useState('');
  const [myClaimSuccess, setMyClaimSuccess] = useState('');
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile/`, cfg());
      setProfile(res.data);
    } catch {
      setProfile({
        full_name: localStorage.getItem("full_name") || "Manager",
        department: localStorage.getItem("department") || "IT Department",
        role: localStorage.getItem("role") || "manager",
      });
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profileRes, employeeRes, attendanceRes, leaveRes, claimRes, logRes, taskRes, myLeaveRes, myBalRes, myPolicyRes] = await Promise.allSettled([
        axios.get(`${API}/profile/`, cfg()),
        axios.get(`${API}/employees/`, cfg()),
        axios.get(`${API}/attendance/all/?date=${date}`, cfg()),
        axios.get(`${API}/leaves/all/`, cfg()),
        axios.get(`${API}/attendance/claims/all/`, cfg()),
        axios.get(`${API}/attendance/recent-logs/`, cfg()),
        axios.get(`${API}/tasks/all/`, cfg()),
        axios.get(`${API}/leaves/`, cfg()),
        axios.get(`${API}/leaves/balances/`, cfg()),
        axios.get(`${API}/leaves/policy/`, cfg()),
      ]);

      if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
      if (employeeRes.status === "fulfilled") setEmployees(employeeRes.value.data || []);
      if (attendanceRes.status === "fulfilled") setAttendance(attendanceRes.value.data || []);
      if (leaveRes.status === "fulfilled") setLeaves(leaveRes.value.data || []);
      if (claimRes.status === "fulfilled") setClaims(claimRes.value.data || []);
      if (logRes.status === "fulfilled") setRecentLogs(logRes.value.data || []);
      if (taskRes.status === "fulfilled") setTasks(taskRes.value.data || []);
      if (myLeaveRes.status === "fulfilled") setMyLeaves(myLeaveRes.value.data || []);
      if (myBalRes.status === "fulfilled") setMyLeaveBalances(myBalRes.value.data || []);
      if (myPolicyRes.status === "fulfilled") setMyLeavePolicies(myPolicyRes.value.data || []);
      const myClaimRes = await axios.get(`${API}/attendance/claim/`, cfg()).catch(() => ({ data: [] }));
      setMyClaims(myClaimRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchAll();
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/?token=${token}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "refresh") fetchAll();
      } catch {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [date]);

  const presentToday = attendance.filter((row) => row.status === "Present").length;
  const absentToday = attendance.filter((row) => row.status === "Absent").length;
  const onLeaveToday = attendance.filter((row) => row.status === "On Leave").length;
  const pendingLeaves = leaves.filter((leave) => leave.status === "Pending");
  const pendingClaims = claims.filter((claim) => claim.status === "Pending");
  const totalMembers = employees.length || attendance.length;
  const pendingApprovals = pendingLeaves.length + pendingClaims.length;
  const presentPct = totalMembers ? Math.round((presentToday / totalMembers) * 100) : 0;
  const leavePct = totalMembers ? Math.round((onLeaveToday / totalMembers) * 100) : 0;
  const absentPct = totalMembers ? Math.round((absentToday / totalMembers) * 100) : 0;

  const attendanceByEmployee = useMemo(() => {
    const map = new Map();
    attendance.forEach((row) => map.set(row.employee, row));
    return map;
  }, [attendance]);

  const chartData = useMemo(() => {
    const today = new Date(date);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - index));
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (index === 6) {
        return { day: label, Present: presentToday, "On Leave": onLeaveToday, Absent: absentToday };
      }
      const base = Math.max(totalMembers, 8);
      return {
        day: label,
        Present: Math.max(Math.round(base * 0.65) + ((index % 3) - 1), 0),
        "On Leave": Math.max(Math.round(base * 0.18) + (index % 2), 0),
        Absent: Math.max(Math.round(base * 0.15) - (index % 2), 0),
      };
    });
  }, [absentToday, date, onLeaveToday, presentToday, totalMembers]);

  const teamRows = employees.slice(0, 5).map((employee, index) => {
    const att = attendanceByEmployee.get(employee.full_name);
    return {
      id: employee.employee_id || employee.id || `EMP${String(index + 1).padStart(3, "0")}`,
      name: employee.full_name || employee.username || "Employee",
      designation: employee.designation || employee.role || "Team Member",
      status: att?.status || "Present",
      checkIn: att?.check_in || "-",
    };
  });

  const handleLeaveAction = async (id, action) => {
    try {
      await axios.post(`${API}/leaves/${id}/${action}/`, {}, cfg());
      fetchAll();
    } catch {}
  };

  const handleClaimAction = async (id, action) => {
    try {
      await axios.post(`${API}/attendance/claims/${id}/${action}/`, {}, cfg());
      fetchAll();
    } catch {}
  };

  const localDateTime = () => {
    const now = new Date();
    return { date: now.toLocaleDateString("en-CA"), time: now.toTimeString().split(" ")[0] };
  };

  const handleCheckIn = async () => {
    try { await axios.post(`${API}/checkin/`, localDateTime(), cfg()); } catch {}
    setCheckedIn(true);
  };

  const handleCheckOut = async () => {
    try { await axios.post(`${API}/checkout/`, localDateTime(), cfg()); } catch {}
    setCheckedIn(false);
  };

  const handleMarkAbsent = async () => {
    try {
      const res = await axios.post(`${API}/attendance/mark-absent/`, {}, cfg());
      alert(`Marked ${res.data.count} employee(s) as Absent for today.`);
      fetchAll();
    } catch {
      alert("Failed to mark absent.");
    }
  };

  const navItems = [
    { icon: <FaHome />, label: "Dashboard" },
    { icon: <FaUsers />, label: "My Team" },
    { icon: <FaCalendarCheck />, label: "Attendance" },
    { icon: <FaPlane />, label: "My Leave & Claim" },
    { icon: <FaTasks />, label: "Leave & Approvals", count: pendingApprovals },
    { icon: <FaChartBar />, label: "Reports" },
    { icon: <FaBell />, label: "Announcements" },
    { icon: <FaCog />, label: "Profile" },
  ];

  const statCards = [
    { label: "Total Team Members", value: totalMembers, sub: `${Math.max(totalMembers - employees.length, 0)} this month`, icon: <FaUsers />, bg: "#dbeafe", color: "#2563eb" },
    { label: "Present Today", value: presentToday, sub: `${presentPct}% of team`, icon: <FaCheck />, bg: "#dcfce7", color: "#16a34a" },
    { label: "On Leave Today", value: onLeaveToday, sub: `${leavePct}% of team`, icon: <FaPlane />, bg: "#ffedd5", color: "#f59e0b" },
    { label: "Absent Today", value: absentToday, sub: `${absentPct}% of team`, icon: <FaUserTimes />, bg: "#fee2e2", color: "#ef4444" },
    { label: "Pending Approvals", value: pendingApprovals, sub: "Requests", icon: <FaCheckSquare />, bg: "#ede9fe", color: "#7c3aed" },
  ];

  const renderDashboard = () => (
    <>
      <section style={s.statsGrid}>
        {statCards.map((card) => (
          <div key={card.label} style={s.statCard}>
            <div style={{ ...s.statIcon, background: card.bg, color: card.color }}>{card.icon}</div>
            <div>
              <p style={s.statLabel}>{card.label}</p>
              <strong style={s.statValue}>{card.value}</strong>
              <p style={{ ...s.statSub, color: card.color }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </section>

      <section style={s.dashboardGrid}>
        <div style={s.card}>
          <div style={s.cardHead}>
            <h2 style={s.cardTitle}>Attendance Overview (This Week)</h2>
            <button style={s.filterBtn}>This Week <FaChevronDown /></button>
          </div>
          <div style={s.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={true} />
                <XAxis dataKey="day" tick={{ fill: "#0f2a55", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#0f2a55", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, top: -8 }} />
                <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="On Leave" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHead}>
            <h2 style={s.cardTitle}>Leave Requests (Pending)</h2>
            <button style={s.linkBtn} onClick={() => setActiveNav("Leave & Approvals")}>View All</button>
          </div>
          <div>
            {pendingLeaves.slice(0, 3).map((leave) => (
              <div key={leave.id} style={s.requestRow}>
                <div style={s.personAvatar}>{initials(leave.employee)}</div>
                <div style={{ flex: 1 }}>
                  <strong style={s.personName}>{leave.employee}</strong>
                  <p style={s.personMeta}>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</p>
                </div>
                <span style={s.daysBadge}>{leave.days || 1} day{Number(leave.days) === 1 ? "" : "s"}</span>
                <button style={s.approveBtn} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
                <button style={s.rejectBtn} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
              </div>
            ))}
            {pendingLeaves.length === 0 && <p style={s.empty}>No pending leave requests.</p>}
          </div>
        </div>
      </section>

      <section style={s.dashboardGrid}>
        <div style={s.card}>
          <div style={s.cardHead}>
            <h2 style={s.cardTitle}>Team Members Overview</h2>
            <button style={s.linkBtn} onClick={() => setActiveNav("My Team")}>View All</button>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{["Employee ID", "Name", "Designation", "Status", "Attendance (Today)"].map((head) => <th key={head} style={s.th}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {teamRows.map((row) => (
                  <tr key={row.id}>
                    <td style={s.td}>{row.id}</td>
                    <td style={s.td}><strong>{row.name}</strong></td>
                    <td style={s.td}>{row.designation}</td>
                    <td style={s.td}><span style={{ ...s.badge, ...(statusTone[row.status] || statusTone.Present) }}>{row.status}</span></td>
                    <td style={s.td}>{row.checkIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {teamRows.length === 0 && <p style={s.empty}>No team members found.</p>}
          </div>
        </div>

        <div style={s.card}>
          <h2 style={{ ...s.cardTitle, marginBottom: 18 }}>Quick Actions</h2>
          <div style={s.actionsGrid}>
            <button style={s.actionCard} onClick={() => setActiveNav("My Team")}>
              <span style={{ ...s.actionIcon, background: "#dbeafe", color: "#2563eb" }}><FaUsers /></span>
              <span><strong>View Team</strong><small>View all team members</small></span>
            </button>
            <button style={s.actionCard} onClick={() => setActiveNav("Attendance")}>
              <span style={{ ...s.actionIcon, background: "#dcfce7", color: "#16a34a" }}><FaCalendarCheck /></span>
              <span><strong>Mark Attendance</strong><small>Mark team attendance</small></span>
            </button>
            <button style={s.actionCard} onClick={() => setActiveNav("Reports")}>
              <span style={{ ...s.actionIcon, background: "#ffedd5", color: "#f97316" }}><FaFileAlt /></span>
              <span><strong>Generate Report</strong><small>Generate team reports</small></span>
            </button>
            <button style={s.actionCard} onClick={() => setActiveNav("Leave & Approvals")}>
              <span style={{ ...s.actionIcon, background: "#ede9fe", color: "#7c3aed" }}><FaRegFileAlt /></span>
              <span><strong>Leave Calendar</strong><small>View team leave calendar</small></span>
            </button>
          </div>
        </div>
      </section>
    </>
  );

  const renderTeam = () => (
    <section style={s.card}>
      <div style={s.cardHead}><h2 style={s.cardTitle}>My Team ({employees.length})</h2></div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr>{["Name", "Department", "Username", "Email", "Phone", "Joined"].map((head) => <th key={head} style={s.th}>{head}</th>)}</tr></thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td style={s.td}><strong>{emp.full_name}</strong></td>
                <td style={s.td}>{emp.department || "Unassigned"}</td>
                <td style={s.td}>@{emp.username}</td>
                <td style={s.td}>{emp.email || "-"}</td>
                <td style={s.td}>{emp.phone || "-"}</td>
                <td style={s.td}>{formatDate(emp.date_joined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderAttendance = () => (
    <section style={s.card}>
      <div style={s.cardHead}>
        <h2 style={s.cardTitle}>Attendance</h2>
        <button style={s.rejectBtn} onClick={handleMarkAbsent}>Mark Absent</button>
      </div>
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr>{["Employee", "Department", "Date", "Check In", "Check Out", "Status"].map((head) => <th key={head} style={s.th}>{head}</th>)}</tr></thead>
          <tbody>
            {attendance.map((row) => (
              <tr key={row.id}>
                <td style={s.td}><strong>{row.employee}</strong></td>
                <td style={s.td}>{row.department || "-"}</td>
                <td style={s.td}>{formatDate(row.date)}</td>
                <td style={s.td}>{row.check_in || "-"}</td>
                <td style={s.td}>{row.check_out || "-"}</td>
                <td style={s.td}><span style={{ ...s.badge, ...(statusTone[row.status] || {}) }}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderLeaveApprovals = () => (
    <section style={s.card}>
      <div style={s.cardHead}><h2 style={s.cardTitle}>Leave Approvals</h2></div>
      {leaves.map((leave) => (
        <div key={leave.id} style={s.requestRow}>
          <div style={s.personAvatar}>{initials(leave.employee)}</div>
          <div style={{ flex: 1 }}>
            <strong style={s.personName}>{leave.employee}</strong>
            <p style={s.personMeta}>{leave.leave_type_display || leave.leave_type} | {formatDate(leave.start_date)} - {formatDate(leave.end_date)}</p>
            <p style={s.personMeta}>{leave.reason}</p>
          </div>
          {leave.status === "Pending" ? (
            <>
              <button style={s.approveBtn} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
              <button style={s.rejectBtn} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
            </>
          ) : (
            <span style={{ ...s.badge, ...(statusTone[leave.status] || {}) }}>{leave.status}</span>
          )}
        </div>
      ))}
    </section>
  );

  

  const renderReports = () => {
    const leaveStatusData = [
      { name: "Approved", value: leaves.filter(l => l.status === "Approved").length, fill: "#16a34a" },
      { name: "Pending",  value: leaves.filter(l => l.status === "Pending").length,  fill: "#d97706" },
      { name: "Rejected", value: leaves.filter(l => l.status === "Rejected").length, fill: "#ef4444" },
    ];
    const attSummary = [
      { name: "Present",  value: presentToday,  fill: "#16a34a" },
      { name: "Absent",   value: absentToday,   fill: "#ef4444" },
      { name: "On Leave", value: onLeaveToday,  fill: "#f97316" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {[
            { label: "Total Members",     value: totalMembers,      color: "#2563eb", bg: "#dbeafe" },
            { label: "Present Today",     value: presentToday,      color: "#16a34a", bg: "#dcfce7" },
            { label: "Pending Leaves",    value: pendingLeaves.length, color: "#d97706", bg: "#fef3c7" },
            { label: "Pending Claims",    value: pendingClaims.length, color: "#7c3aed", bg: "#ede9fe" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ ...s.card, borderLeft: `4px solid ${color}` }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color }}>{value}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={s.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Attendance This Week</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="On Leave" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={s.card}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Today's Attendance Summary</h3>
            {attSummary.map(({ name, value, fill }) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: fill + "22", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: fill }}>{name}</span>
                <strong style={{ fontSize: 18, color: fill }}>{value}</strong>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Leave Status</h4>
              {leaveStatusData.map(({ name, value, fill }) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderRadius: 8, background: fill + "22", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: fill }}>{name}</span>
                  <strong style={{ color: fill }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClaims = () => (
    <section style={s.card}>
      <div style={s.cardHead}><h2 style={s.cardTitle}>Attendance Claims ({claims.filter(c => c.status === "Pending").length} Pending)</h2></div>
      {claims.length === 0 && <p style={s.empty}>No attendance claims submitted.</p>}
      {claims.map((claim) => (
        <div key={claim.id} style={s.requestRow}>
          <div style={s.personAvatar}>{initials(claim.employee)}</div>
          <div style={{ flex: 1 }}>
            <strong style={s.personName}>{claim.employee}</strong>
            <p style={s.personMeta}>{formatDate(claim.date)} | In {claim.check_in_time || "-"} | Out {claim.check_out_time || "-"}</p>
            <p style={s.personMeta}>{claim.reason}</p>
          </div>
          {claim.status === "Pending" ? (
            <>
              <button style={s.approveBtn} onClick={() => handleClaimAction(claim.id, "approve")}>Approve</button>
              <button style={s.rejectBtn} onClick={() => handleClaimAction(claim.id, "reject")}>Reject</button>
            </>
          ) : (
            <span style={{ ...s.badge, ...(statusTone[claim.status] || {}) }}>{claim.status}</span>
          )}
        </div>
      ))}
    </section>
  );

  const renderLeaveRequests = () => (
    <section style={s.card}>
      <div style={s.cardHead}><h2 style={s.cardTitle}>Leave Requests ({leaves.filter(l => l.status === "Pending").length} Pending)</h2></div>
      {leaves.length === 0 && <p style={s.empty}>No leave requests found.</p>}
      {leaves.map((leave) => (
        <div key={leave.id} style={s.requestRow}>
          <div style={s.personAvatar}>{initials(leave.employee)}</div>
          <div style={{ flex: 1 }}>
            <strong style={s.personName}>{leave.employee}</strong>
            <p style={s.personMeta}>{leave.leave_type_display || leave.leave_type} | {formatDate(leave.start_date)} - {formatDate(leave.end_date)} | {leave.days} day(s)</p>
            <p style={s.personMeta}>{leave.reason}</p>
          </div>
          {leave.status === "Pending" ? (
            <>
              <button style={s.approveBtn} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
              <button style={s.rejectBtn} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
            </>
          ) : (
            <span style={{ ...s.badge, ...(statusTone[leave.status] || {}) }}>{leave.status}</span>
          )}
        </div>
      ))}
    </section>
  );

  const renderTeamPerformance = () => {
    const perfRows = employees.map(emp => {
      const empAtt = attendance.filter(a => a.employee === emp.full_name);
      const present = empAtt.filter(a => a.status === "Present").length;
      const empLeaves = leaves.filter(l => l.employee === emp.full_name && l.status === "Approved").length;
      const empTasks = tasks.filter(t => t.employee === emp.full_name || t.assigned_to === emp.id);
      const completed = empTasks.filter(t => t.status === "Completed").length;
      const pct = empAtt.length > 0 ? Math.round((present / empAtt.length) * 100) : 0;
      return { ...emp, present, leaves: empLeaves, tasks: empTasks.length, completed, pct };
    });
    return (
      <section style={s.card}>
        <div style={s.cardHead}><h2 style={s.cardTitle}>Team Performance</h2></div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>{["Name", "Department", "Attendance Records", "Present", "Attendance %", "Approved Leaves", "Tasks", "Completed"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {perfRows.map((emp, i) => (
                <tr key={emp.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                  <td style={s.td}><strong>{emp.full_name}</strong></td>
                  <td style={s.td}>{emp.department || "-"}</td>
                  <td style={s.td}>{emp.present + (employees.length - emp.present)}</td>
                  <td style={s.td}>{emp.present}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 7, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ height: "100%", width: `${emp.pct}%`, background: emp.pct >= 80 ? "#16a34a" : emp.pct >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{emp.pct}%</span>
                    </div>
                  </td>
                  <td style={s.td}>{emp.leaves}</td>
                  <td style={s.td}>{emp.tasks}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: emp.completed === emp.tasks && emp.tasks > 0 ? "#dcfce7" : "#fef3c7", color: emp.completed === emp.tasks && emp.tasks > 0 ? "#059669" : "#d97706" }}>
                      {emp.completed}/{emp.tasks}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {perfRows.length === 0 && <p style={s.empty}>No team data available.</p>}
        </div>
      </section>
    );
  };

  const renderSettings = () => (
    <section style={s.card}>
      <div style={s.cardHead}>
        <h2 style={s.cardTitle}>Settings — My Profile</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {editProfile && (
            <button style={{ ...s.rejectBtn, fontSize: 13 }} onClick={() => { setEditProfile(false); setProfileErr(""); setProfileMsg(""); setProfileForm({ ...profile }); }}>Cancel</button>
          )}
          <button style={{ ...s.approveBtn, fontSize: 13 }} onClick={async () => {
            if (!editProfile) { setProfileForm({ ...profile }); setEditProfile(true); setProfileMsg(""); setProfileErr(""); return; }
            setProfileErr("");
            try {
              const res = await axios.put(`${API}/profile/`, profileForm, cfg());
              const updated = { ...profileForm, ...res.data };
              setProfile(updated);
              setProfileForm(updated);
              localStorage.setItem("full_name",  updated.full_name  || "");
              localStorage.setItem("email",      updated.email      || "");
              localStorage.setItem("phone",      updated.phone      || "");
              localStorage.setItem("username",   updated.username   || "");
              localStorage.setItem("department", updated.department || "");
              setEditProfile(false);
              setProfileMsg("Profile saved successfully.");
              setTimeout(() => setProfileMsg(""), 3000);
            } catch (e) { setProfileErr(e.response?.data?.error || "Failed to save."); }
          }}>{editProfile ? "Save Changes" : "Edit Profile"}</button>
        </div>
      </div>
      {profileMsg && <p style={{ color: "#065f46", background: "#d1fae5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{profileMsg}</p>}
      {profileErr && <p style={{ color: "#991b1b", background: "#fee2e2", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{profileErr}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {[
          { label: "Full Name",    key: "full_name",  editable: true  },
          { label: "Username",     key: "username",   editable: true  },
          { label: "Email",        key: "email",      editable: true  },
          { label: "Phone",        key: "phone",      editable: true  },
          { label: "Department",   key: "department", editable: false },
          { label: "Role",         key: "role",       editable: false },
        ].map(({ label, key, editable }) => (
          <div key={key}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 5 }}>{label}</label>
            <input
              style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", background: editProfile && editable ? "white" : "#f8fafc", color: "#0f172a" }}
              value={(editProfile ? profileForm[key] : profile[key]) || ""}
              disabled={!editProfile || !editable}
              onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </section>
  );

  const renderMyLeave = () => {
    const policyRows = (myLeavePolicies.length ? myLeavePolicies : myLeaveBalances).map((policy) => {
      const balance = myLeaveBalances.find(b => b.leave_type === policy.leave_type) || {};
      const entitled = Number(policy.entitled ?? balance.entitled ?? 0);
      const used = Number(balance.used || 0);
      const remaining = entitled === 0 ? null : Math.max(entitled - used, 0);
      return { leave_type: policy.leave_type, leave_type_display: policy.leave_type_display || policy.leave_type, entitled, used, remaining };
    });

    const applyLeave = async () => {
      setMyLeaveError('');
      if (!myLeaveForm.start_date || !myLeaveForm.end_date || !myLeaveForm.reason) {
        setMyLeaveError('All fields are required.');
        return;
      }
      try {
        await axios.post(`${API}/leave/apply/`, myLeaveForm, cfg());
        setMyLeaveForm({ leave_type: myLeavePolicies[0]?.leave_type || 'CL', start_date: '', end_date: '', reason: '' });
        fetchAll();
      } catch (err) {
        setMyLeaveError(err.response?.data?.error || 'Failed to apply leave.');
      }
    };

    const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
    const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 };

    return (
      <section style={s.card}>
        <h2 style={{ ...s.cardTitle, marginBottom: 18 }}>My Leave</h2>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr>{['Leave Type', 'Entitled', 'Used', 'Remaining'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {policyRows.map((b, i) => (
                <tr key={b.leave_type} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                  <td style={s.td}><span style={{ ...s.badge, background: '#ede9fe', color: '#6d28d9' }}>{b.leave_type_display}</span></td>
                  <td style={s.td}>{b.entitled === 0 ? <span style={{ color: '#94a3b8' }}>Unlimited</span> : b.entitled}</td>
                  <td style={s.td}>{b.used}</td>
                  <td style={s.td}>{b.remaining === null ? <span style={{ color: '#94a3b8' }}>—</span> : <span style={{ fontWeight: 700, color: b.remaining === 0 ? '#ef4444' : b.remaining <= 2 ? '#f59e0b' : '#10b981' }}>{b.remaining}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, margin: '20px 0 8px' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Apply for Leave (goes to HR for approval)</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Leave Type</label>
            <select style={inputStyle} value={myLeaveForm.leave_type} onChange={e => setMyLeaveForm({ ...myLeaveForm, leave_type: e.target.value })}>
              {policyRows.map(p => <option key={p.leave_type} value={p.leave_type}>{p.leave_type_display}{p.remaining !== null ? ` (${p.remaining} left)` : ' (on request)'}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" style={inputStyle} value={myLeaveForm.start_date} onChange={e => setMyLeaveForm({ ...myLeaveForm, start_date: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input type="date" style={inputStyle} value={myLeaveForm.end_date} onChange={e => setMyLeaveForm({ ...myLeaveForm, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reason</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={myLeaveForm.reason} onChange={e => setMyLeaveForm({ ...myLeaveForm, reason: e.target.value })} placeholder="Enter reason for leave" />
          </div>
          {myLeaveError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{myLeaveError}</p>}
          <button style={{ ...s.approveBtn, marginTop: 14, padding: '9px 20px', fontSize: 13 }} onClick={applyLeave}>Submit Request</button>
        </div>
        <h4 style={{ margin: '20px 0 12px', fontSize: 14, fontWeight: 700 }}>My Leave History</h4>
        {myLeaves.length === 0 ? <p style={s.empty}>No leave requests yet.</p> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{['Type', 'Start', 'End', 'Days', 'Reason', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {myLeaves.map((l, i) => (
                  <tr key={l.id} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                    <td style={s.td}><span style={{ ...s.badge, background: '#ede9fe', color: '#6d28d9' }}>{l.leave_type_display || l.leave_type}</span></td>
                    <td style={s.td}>{l.start_date}</td>
                    <td style={s.td}>{l.end_date}</td>
                    <td style={s.td}>{l.days}</td>
                    <td style={s.td}>{l.reason}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: l.status === 'Approved' ? '#dcfce7' : l.status === 'Rejected' ? '#fee2e2' : '#fef3c7', color: l.status === 'Approved' ? '#059669' : l.status === 'Rejected' ? '#dc2626' : '#d97706' }}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderMyClaim = () => {
    const submitClaim = async () => {
      setMyClaimError('');
      setMyClaimSuccess('');
      if (!myClaimForm.date || !myClaimForm.check_in_time || !myClaimForm.reason.trim()) {
        setMyClaimError('Date, check-in time and reason are required.');
        return;
      }
      try {
        await axios.post(`${API}/attendance/claim/`, myClaimForm, cfg());
        setMyClaimSuccess('Claim submitted successfully. Awaiting approval.');
        setMyClaimForm({ date: '', check_in_time: '', check_out_time: '', reason: '' });
        const res = await axios.get(`${API}/attendance/claim/`, cfg());
        setMyClaims(res.data || []);
      } catch (err) {
        setMyClaimError(err.response?.data?.error || 'Failed to submit claim.');
      }
    };
    return (
      <section style={s.card}>
        <h2 style={{ ...s.cardTitle, marginBottom: 18 }}>My Attendance Claim</h2>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Submit Attendance Claim</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Date *</label>
              <input type="date" style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' }} value={myClaimForm.date} max={new Date().toLocaleDateString('en-CA')} onChange={e => setMyClaimForm({ ...myClaimForm, date: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Check-in Time *</label>
              <input type="time" style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' }} value={myClaimForm.check_in_time} onChange={e => setMyClaimForm({ ...myClaimForm, check_in_time: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Check-out Time</label>
              <input type="time" style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' }} value={myClaimForm.check_out_time} onChange={e => setMyClaimForm({ ...myClaimForm, check_out_time: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Reason *</label>
            <textarea style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13, minHeight: 70, resize: 'vertical', boxSizing: 'border-box' }} value={myClaimForm.reason} onChange={e => setMyClaimForm({ ...myClaimForm, reason: e.target.value })} placeholder="Explain why you couldn't check in..." />
          </div>
          {myClaimError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{myClaimError}</p>}
          {myClaimSuccess && <p style={{ color: '#059669', fontSize: 12, marginTop: 8 }}>{myClaimSuccess}</p>}
          <button style={{ ...s.approveBtn, marginTop: 14, padding: '9px 20px', fontSize: 13 }} onClick={submitClaim}>Submit Claim</button>
        </div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>My Claim History</h4>
        {myClaims.length === 0 ? <p style={s.empty}>No claims submitted yet.</p> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{['Date', 'Check-in', 'Check-out', 'Reason', 'Submitted', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {myClaims.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                    <td style={s.td}>{c.date}</td>
                    <td style={s.td}>{c.check_in_time || '—'}</td>
                    <td style={s.td}>{c.check_out_time || '—'}</td>
                    <td style={s.td}>{c.reason}</td>
                    <td style={s.td}>{c.submitted_at}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: c.status === 'Approved' ? '#dcfce7' : c.status === 'Rejected' ? '#fee2e2' : '#fef3c7', color: c.status === 'Approved' ? '#059669' : c.status === 'Rejected' ? '#dc2626' : '#d97706' }}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderContent = () => {
    if (activeNav === "Dashboard")        return renderDashboard();
    if (activeNav === "My Team")          return renderTeam();
    if (activeNav === "Attendance")       return renderAttendance();
    if (activeNav === "My Leave & Claim")  return (<>{renderMyLeave()}{renderMyClaim()}</>);
    if (activeNav === "Leave & Approvals")  return (<>{renderLeaveRequests()}{renderLeaveApprovals()}</>);
    if (activeNav === "Reports")          return renderReports();
    if (activeNav === "Announcements")     return <AnnouncementsTab userRole={profile.role} userDepartment={profile.department} />;
    if (activeNav === "Profile")          return renderSettings();
    return renderReports();
  };

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.brandIcon}><FaUsers /></div>
          <div>
            <div style={s.brandTitle}>AMS</div>
            <div style={s.brandSub}>Attendance<br />Management System</div>
          </div>
        </div>

        <nav style={s.nav}>
          {navItems.map((item) => (
            <button
              key={item.label}
              style={{ ...s.navItem, ...(activeNav === item.label ? s.navActive : {}) }}
              onClick={() => setActiveNav(item.label)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.count > 0 && <span style={s.navBadge}>{item.count}</span>}
            </button>
          ))}
        </nav>

        <div style={s.sideProfile}>
          <div style={s.profileRow}>
            <div style={s.avatarImage}>{initials(profile.full_name)}</div>
            <div>
              <strong style={s.profileName}>Manager</strong>
              <p style={s.profileDept}>{profile.department || "IT Department"}</p>
              <p style={s.online}><span />Online</p>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.topbar}>
          <div>
            <h1 style={s.title}>Manager Dashboard</h1>
            <p style={s.subtitle}>Welcome back, Manager! Here's what's happening with your team today.</p>
          </div>
          <div style={s.topControls}>
            <button
              onClick={checkedIn ? handleCheckOut : handleCheckIn}
              style={{ height: 38, padding: "0 16px", border: "none", borderRadius: 8, background: checkedIn ? "#dc2626" : "#059669", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {checkedIn ? "Check Out" : "Check In"}
            </button>
            <NotificationBell />
            <label style={s.dateChip}>
              <FaCalendarAlt />
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={s.dateInput} />
              <FaChevronDown />
            </label>
          </div>
        </header>

        {loading && <div style={s.loading}>Refreshing dashboard...</div>}
        <div style={s.content}>{renderContent()}</div>
      </main>
    </div>
  );
}

const s = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f1f5f9", color: "#0f172a" },
  sidebar: { width: 244, minWidth: 244, background: "#0f172a", color: "#cbd5e1", padding: "24px 16px", display: "flex", flexDirection: "column", boxSizing: "border-box" },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingLeft: 4 },
  brandIcon: { width: 44, height: 44, borderRadius: 8, background: "#1d4ed8", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 },
  brandTitle: { color: "white", fontSize: 24, fontWeight: 800, lineHeight: 1 },
  brandSub: { color: "white", fontSize: 12, lineHeight: 1.35, fontWeight: 700, marginTop: 4 },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  navItem: { border: "none", background: "transparent", color: "inherit", borderRadius: 8, padding: "11px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left" },
  navActive: { background: "#1d4ed8", color: "white" },
  navIcon: { width: 18, display: "inline-flex", justifyContent: "center", fontSize: 15 },
  navBadge: { marginLeft: "auto", minWidth: 22, height: 22, borderRadius: 999, background: "#4f46e5", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 },
  sideProfile: { borderTop: "1px solid #1e293b", padding: "12px 8px 0" },
  profileRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 10 },
  avatarImage: { width: 38, height: 38, borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 },
  profileName: { color: "white", fontSize: 13, fontWeight: 800 },
  profileDept: { margin: "2px 0", color: "#94a3b8", fontSize: 11 },
  online: { margin: 0, color: "#cbd5e1", fontSize: 11, display: "flex", alignItems: "center", gap: 6 },
  logoutBtn: { border: "none", background: "transparent", color: "#f87171", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, padding: "10px 0" },
  main: { flex: 1, overflow: "hidden", padding: "28px 32px", display: "flex", flexDirection: "column" },
  topbar: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 24, fontWeight: 800 },
  subtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  topControls: { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 12 },
  searchBox: { width: 250, height: 40, border: "1px solid #e2e8f0", borderRadius: 8, background: "white", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", color: "#64748b", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" },
  searchInput: { border: "none", outline: "none", width: "100%", fontSize: 13, color: "#334155", background: "transparent" },
  managerChip: { height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 8px", color: "#0f172a", fontSize: 13 },
  smallAvatar: { width: 34, height: 34, borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 },
  dateChip: { height: 38, border: "1px solid #e2e8f0", borderRadius: 8, background: "white", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", color: "#334155", fontWeight: 700, boxShadow: "0 1px 4px rgba(15,23,42,0.05)" },
  dateInput: { border: "none", outline: "none", color: "#334155", fontWeight: 700, fontSize: 13, background: "transparent" },
  loading: { marginBottom: 12, color: "#2563eb", fontSize: 13, fontWeight: 700 },
  content: { flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 16 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 },
  statCard: { background: "white", borderRadius: 8, padding: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 5px rgba(15,23,42,0.08)" },
  statIcon: { width: 52, height: 52, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  statLabel: { margin: 0, fontSize: 13, fontWeight: 800 },
  statValue: { display: "block", marginTop: 4, fontSize: 24, lineHeight: 1.1, fontWeight: 800 },
  statSub: { margin: "4px 0 0", fontSize: 12 },
  dashboardGrid: { display: "grid", gridTemplateColumns: "minmax(360px, 1.35fr) minmax(320px, 1fr)", gap: 16 },
  card: { background: "white", borderRadius: 8, padding: 22, boxShadow: "0 1px 5px rgba(15,23,42,0.08)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800 },
  filterBtn: { border: "1px solid #cbd5e1", background: "white", borderRadius: 7, padding: "8px 12px", color: "#334155", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  linkBtn: { border: "none", background: "transparent", color: "#1d4ed8", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  chartWrap: { height: 240 },
  requestRow: { display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" },
  personAvatar: { width: 34, height: 34, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 },
  personName: { fontSize: 13 },
  personMeta: { margin: "3px 0 0", color: "#64748b", fontSize: 12 },
  daysBadge: { borderRadius: 999, background: "#fef3c7", color: "#d97706", padding: "4px 9px", fontWeight: 800, fontSize: 11, whiteSpace: "nowrap" },
  approveBtn: { border: "none", background: "#059669", color: "white", borderRadius: 7, padding: "7px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  rejectBtn: { border: "none", background: "#dc2626", color: "white", borderRadius: 7, padding: "7px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 },
  th: { textAlign: "left", padding: "11px 12px", color: "#64748b", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", whiteSpace: "nowrap" },
  td: { padding: "12px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", verticalAlign: "middle" },
  badge: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" },
  actionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 },
  actionCard: { border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", color: "#0f172a" },
  actionIcon: { width: 42, height: 42, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 },
  reportGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 },
  reportTile: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 },
  activityRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  activityDot: { width: 8, height: 8, borderRadius: "50%", background: "#1d4ed8", flexShrink: 0 },
  empty: { color: "#94a3b8", textAlign: "center", padding: "28px 0", margin: 0, fontSize: 13 },
};
