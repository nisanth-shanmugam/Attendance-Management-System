import React, { useEffect, useState } from "react";
import "../index.css";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  FaHome, FaBuilding, FaClipboardList, FaUsers, FaCalendarCheck,
  FaUmbrellaBeach, FaChartBar, FaCog, FaSignOutAlt,
  FaChevronDown, FaCalendarAlt, FaSyncAlt, FaSave, FaUndo, FaSearch, FaBell,
} from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";

const API = "http://127.0.0.1:8000/api";
const DEPT_COLORS = ["#3b82f6","#22c55e","#f59e0b","#8b5cf6","#f43f5e","#06b6d4","#ec4899","#14b8a6"];

const NAV = [
  { icon: <FaHome />,          label: "Dashboard" },
  { icon: <FaBuilding />,      label: "Sector Overview" },
  { icon: <FaClipboardList />, label: "Registrations" },
  { icon: <FaUsers />,         label: "User Management" },
  { icon: <FaCalendarCheck />, label: "Attendance" },
  { icon: <FaChartBar />,      label: "Reports" },
  { icon: <FaUmbrellaBeach />, label: "Leave Policy" },
  { icon: <FaBell />,          label: "Announcements" },
  { icon: <FaCog />,           label: "Profile" },
];

const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

export default function SuperAdminDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [profile, setProfile]     = useState({ full_name: localStorage.getItem("full_name") || "Super Admin", role: localStorage.getItem("role") || "super_admin", department: localStorage.getItem("department") || "" });
  const [stats, setStats]         = useState({});
  const [pending, setPending]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [claims, setClaims]       = useState([]);
  const [msg, setMsg]             = useState("");
  const [loading, setLoading]     = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaveMsg, setProfileSaveMsg] = useState("");
  const [profileSaveErr, setProfileSaveErr] = useState("");
  const [sectorSearch, setSectorSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [date]                    = useState(new Date());
  const [checkedIn, setCheckedIn] = useState(false);
  const [policies, setPolicies]   = useState([]);
  const [policyOriginal, setPolicyOriginal] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMsg, setPolicyMsg] = useState("");
  const [policyErr, setPolicyErr] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', department: '' });
  const [userMgmtMsg, setUserMgmtMsg] = useState("");
  const [userMgmtErr, setUserMgmtErr] = useState("");
  const [userMgmtSaving, setUserMgmtSaving] = useState(false);
  const [selectedAttSector, setSelectedAttSector] = useState("");
  const [announcements, setAnnouncements]   = useState([]);
  const [annLoading, setAnnLoading]         = useState(false);
  const [annForm, setAnnForm]               = useState({ title: "", message: "", department: "" });
  const [annErr, setAnnErr]                 = useState("");
  const [annPosting, setAnnPosting]         = useState(false);
  const [annSuccess, setAnnSuccess]         = useState("");

  const ROLES = ['employee', 'manager', 'hr', 'super_admin'];
  const DEPARTMENTS = [
    "Engineering", "Sales", "Marketing", "Finance", "Operations",
    "Customer Support", "Logistics", "Design", "Quality Assurance", "Other",
  ];

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

  const fetchPolicies = async () => {
    setPolicyLoading(true);
    setPolicyErr("");
    try {
      const res = await axios.get(`${API}/leaves/policy/`, cfg());
      const rows = res.data || [];
      setPolicies(rows);
      setPolicyOriginal(rows);
    } catch (e) {
      setPolicyErr(e.response?.data?.error || "Unable to load leave policies.");
      setPolicies([]);
      setPolicyOriginal([]);
    } finally {
      setPolicyLoading(false);
    }
  };

  const savePolicies = async () => {
    setPolicyErr("");
    setPolicyMsg("");
    setPolicySaving(true);
    try {
      const payload = policies.map((policy) => ({
        ...policy,
        entitled: Number(policy.entitled || 0),
      }));
      await axios.put(`${API}/leaves/policy/update/`, payload, cfg());
      setPolicyOriginal(payload);
      setPolicies(payload);
      setPolicyMsg("Policies saved successfully.");
      setTimeout(() => setPolicyMsg(""), 3000);
    } catch (e) {
      setPolicyErr(e.response?.data?.error || "Failed to save policies.");
    } finally {
      setPolicySaving(false);
    }
  };

  const updatePolicyDays = (leaveType, value) => {
    const nextValue = value === "" ? "" : Math.max(0, Number(value));
    setPolicies((rows) =>
      rows.map((row) =>
        row.leave_type === leaveType ? { ...row, entitled: nextValue } : row
      )
    );
  };

  const resetPolicies = () => {
    setPolicies(policyOriginal);
    setPolicyErr("");
    setPolicyMsg("Unsaved changes reset.");
    setTimeout(() => setPolicyMsg(""), 2500);
  };

  const saveAdminProfile = async () => {
    setProfileSaveErr("");
    try {
      const res = await axios.put(`${API}/profile/`, profileForm, cfg());
      const updated = { ...profileForm, ...res.data };
      setProfile(updated);
      setProfileForm(updated);
      localStorage.setItem("full_name",  updated.full_name  || "");
      localStorage.setItem("email",      updated.email      || "");
      localStorage.setItem("phone",      updated.phone      || "");
      localStorage.setItem("username",   updated.username   || "");
      localStorage.setItem("role",       updated.role       || "super_admin");
      localStorage.setItem("department", updated.department || "");
      setProfileEdit(false);
      setProfileSaveMsg("Profile saved successfully.");
      setTimeout(() => setProfileSaveMsg(""), 3000);
    } catch (e) {
      setProfileSaveErr(e.response?.data?.error || "Failed to save profile.");
    }
  };

  const startEditProfile = () => {
    setProfileForm({ ...profile });
    setProfileEdit(true);
    setProfileSaveErr("");
    setProfileSaveMsg("");
  };

  const cancelEditProfile = () => {
    setProfileEdit(false);
    setProfileSaveErr("");
    setProfileSaveMsg("");
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, st, pe, em, at, lv, cl] = await Promise.all([
        axios.get(`${API}/profile/`, cfg()),
        axios.get(`${API}/users/stats/`, cfg()),
        axios.get(`${API}/users/pending/`, cfg()),
        axios.get(`${API}/employees/`, cfg()),
        axios.get(`${API}/attendance/all/?date=${attendanceDate}`, cfg()),
        axios.get(`${API}/leaves/all/`, cfg()),
        axios.get(`${API}/attendance/claims/all/`, cfg()),
      ]);
      setProfile(p.data);
      localStorage.setItem("role",       p.data.role       || "super_admin");
      localStorage.setItem("department", p.data.department || "");
      setStats(st.data);
      setPending(pe.data);
      setEmployees(em.data || []);
      setAttendance(at.data || []);
      setLeaves(lv.data || []);
      setClaims(cl.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchAllRef = React.useRef(fetchAll);
  useEffect(() => { fetchAllRef.current = fetchAll; });

  useEffect(() => {
    fetchAllRef.current();
    fetchPolicies();
    const token = localStorage.getItem("token");
    if (!token) return;
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/?token=${token}`);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "refresh") fetchAllRef.current();
      } catch {}
    };
    ws.onerror = () => {};
    // Poll every 30s as fallback for changes made outside the app
    const poll = setInterval(() => fetchAllRef.current(), 30000);
    return () => { ws.close(); clearInterval(poll); };
  }, []);
  useEffect(() => {
    axios.get(`${API}/attendance/all/?date=${attendanceDate}`, cfg())
      .then((res) => setAttendance(res.data || []))
      .catch(() => setAttendance([]));
  }, [attendanceDate]);

  const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

  const handleApprove = async (id) => {
    try { await axios.post(`${API}/users/${id}/approve/`, {}, cfg()); showMsg("Approved!"); await fetchAll(); }
    catch (e) { showMsg(e.response?.data?.error || "Failed"); }
  };
  const handleReject = async (id) => {
    if (!window.confirm("Reject this user?")) return;
    try { await axios.post(`${API}/users/${id}/reject/`, {}, cfg()); showMsg("Rejected."); await fetchAll(); }
    catch (e) { showMsg(e.response?.data?.error || "Failed"); }
  };
  const handleLeaveAction = async (id, action) => {
    try {
      await axios.post(`${API}/leaves/${id}/${action}/`, {}, cfg());
      showMsg(`Leave ${action === "approve" ? "approved" : "rejected"}.`);
      await fetchAll();
    } catch (e) {
      showMsg(e.response?.data?.error || "Unable to update leave request.");
    }
  };
  const handleClaimAction = async (id, action) => {
    try {
      await axios.post(`${API}/attendance/claims/${id}/${action}/`, {}, cfg());
      showMsg(`Claim ${action === "approve" ? "approved" : "rejected"}.`);
      await fetchAll();
    } catch (e) {
      showMsg(e.response?.data?.error || "Unable to update attendance claim.");
    }
  };

  // Build department breakdown from real employee data
  const deptMap = {};
  employees.forEach(e => {
    const dept = e.department?.trim() || "Unassigned";
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptMap).map(([name, count], i) => ({
    name, users: count, color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  // Recent activities from real pending + recent joins
  const activities = [];
  pending.slice(0, 3).forEach(u =>
    activities.push({ icon: "📋", text: `${u.full_name} (${u.role}) registered — awaiting approval`, time: u.date_joined })
  );
  if (activities.length < 5) {
    const recent = [...employees]
      .sort((a, b) => new Date(b.date_joined) - new Date(a.date_joined))
      .slice(0, 5 - activities.length);
    recent.forEach(u => activities.push({ icon: "👤", text: `${u.full_name} joined as ${u.role}`, time: u.date_joined }));
  }

  const total      = stats.total || 0;
  const activeToday = stats.active_today || 0;
  const activePct  = total > 0 ? Math.round((activeToday / total) * 100) : 0;

  const pendingByDept = {};
  pending.forEach(u => {
    const dept = u.department?.trim() || "Unassigned";
    pendingByDept[dept] = (pendingByDept[dept] || 0) + 1;
  });

  const sectorRows = deptData
    .map((dept) => {
      const members = employees.filter(e => (e.department?.trim() || "Unassigned") === dept.name);
      const roleCount = members.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      return {
        ...dept,
        managers: roleCount.manager || 0,
        hr: roleCount.hr || 0,
        employees: roleCount.employee || 0,
        pending: pendingByDept[dept.name] || 0,
        share: total > 0 ? Math.round((dept.users / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name));

  const filteredSectorRows = sectorRows.filter(row =>
    row.name.toLowerCase().includes(sectorSearch.trim().toLowerCase())
  );
  const selectedSectorRow =
    sectorRows.find(row => row.name === selectedSector) ||
    sectorRows[0] ||
    null;

  const statCards = [
    { label: "Total Departments",     sub: `${deptData.length} unique dept(s)`, value: deptData.length, icon: "🏢", iconBg: "#ede9fe", iconColor: "#7c3aed" },
    { label: "Total Users",           sub: "Across all departments",            value: total,           icon: "👥", iconBg: "#dbeafe", iconColor: "#2563eb" },
    { label: "Active Today",          sub: `${activePct}% of total`,            value: activeToday,     icon: "✅", iconBg: "#dcfce7", iconColor: "#16a34a" },
    { label: "Pending Registrations", sub: "Requires approval",                 value: pending.length,  icon: "📋", iconBg: "#fef3c7", iconColor: "#d97706", warn: true },
    { label: "Total Approved Users",  sub: "Active in system",                  value: total,           icon: "✔️", iconBg: "#dcfce7", iconColor: "#16a34a" },
  ];

  const pendingLeaves = leaves.filter(l => l.status === "Pending");
  const pendingClaims = claims.filter(c => c.status === "Pending");
  const attendanceSummary = {
    present: attendance.filter(a => a.status === "Present").length,
    absent: attendance.filter(a => a.status === "Absent").length,
    onLeave: attendance.filter(a => a.status === "On Leave").length,
  };
  const roleData = [
    { name: "Employees", users: stats.employees ?? employees.filter(u => u.role === "employee").length, color: "#2563eb" },
    { name: "Managers", users: stats.managers ?? employees.filter(u => u.role === "manager").length, color: "#7c3aed" },
    { name: "HR Users", users: stats.hrs ?? employees.filter(u => u.role === "hr").length, color: "#16a34a" },
  ].filter(row => row.users > 0);

  const statusStyle = (value) => {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "approved" || normalized === "present") return { background: "#dcfce7", color: "#166534" };
    if (normalized === "pending") return { background: "#fef3c7", color: "#92400e" };
    if (normalized === "rejected" || normalized === "absent") return { background: "#fee2e2", color: "#991b1b" };
    if (normalized === "on leave") return { background: "#ede9fe", color: "#6d28d9" };
    return { background: "#e2e8f0", color: "#475569" };
  };
  const StatusBadge = ({ value }) => <span style={{ ...s.badge, ...statusStyle(value) }}>{value || "-"}</span>;

  const saveUserEdit = async (userId) => {
    setUserMgmtErr("");
    setUserMgmtMsg("");
    setUserMgmtSaving(true);
    try {
      await axios.patch(`${API}/users/${userId}/update-role-dept/`, editForm, cfg());
      setUserMgmtMsg("User updated successfully.");
      setTimeout(() => setUserMgmtMsg(""), 3000);
      setEditingUser(null);
      fetchAll();
    } catch (e) {
      setUserMgmtErr(e.response?.data?.error || "Failed to update user.");
    } finally {
      setUserMgmtSaving(false);
    }
  };

  const renderUserManagement = () => {
    return (
      <section style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>User Management — Change Roles & Departments</span>
          <button style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }} onClick={fetchAll} disabled={loading}>
            <FaSyncAlt style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {userMgmtMsg && <p style={s.successMsg}>{userMgmtMsg}</p>}
        {userMgmtErr && <p style={s.errorMsg}>{userMgmtErr}</p>}
        {employees.length === 0 ? (
          <p style={s.empty}>No users found.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>{["Name", "Email", "Current Role", "Current Department", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {employees.map(u => (
                  <tr key={u.id}>
                    <td style={s.td}>
                      <strong>{u.full_name}</strong>
                      <small style={s.subText}>@{u.username}</small>
                    </td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>
                      {editingUser === u.id ? (
                        <select
                          style={{ ...s.input, minWidth: 130 }}
                          value={editForm.role}
                          onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <StatusBadge value={u.role} />
                      )}
                    </td>
                    <td style={s.td}>
                      {editingUser === u.id ? (
                        <select
                          style={{ ...s.input, minWidth: 160 }}
                          value={editForm.department}
                          onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                        >
                          <option value="">— No Department —</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        u.department || <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                    <td style={s.td}>
                      {editingUser === u.id ? (
                        <div style={s.actionGroup}>
                          <button style={{ ...s.approveBtn, opacity: userMgmtSaving ? 0.6 : 1 }} disabled={userMgmtSaving} onClick={() => saveUserEdit(u.id)}>{userMgmtSaving ? "Saving..." : "Save"}</button>
                          <button style={s.rejectBtn} disabled={userMgmtSaving} onClick={() => { setEditingUser(null); setUserMgmtErr(""); }}>Cancel</button>
                        </div>
                      ) : (
                        <button
                          style={s.primaryBtn}
                          onClick={() => { setEditingUser(u.id); setEditForm({ role: u.role, department: u.department || '' }); setUserMgmtErr(""); setUserMgmtMsg(""); }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderRegistrations = () => (
    <section style={s.card}>
      <div style={s.cardHead}>
        <span style={s.cardTitle}>Registration Approvals ({pending.length})</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>Review new account requests</span>
      </div>
      {pending.length === 0 ? (
        <p style={s.empty}>No pending registrations.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>{["Name", "Role", "Department", "Email", "Joined", "Actions"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {pending.map(u => (
                <tr key={u.id}>
                  <td style={s.td}><strong>{u.full_name}</strong><small style={s.subText}>@{u.username}</small></td>
                  <td style={s.td}><StatusBadge value={u.role} /></td>
                  <td style={s.td}>{u.department || "-"}</td>
                  <td style={s.td}>{u.email || "-"}</td>
                  <td style={s.td}>{u.date_joined || "-"}</td>
                  <td style={s.td}>
                    <div style={s.actionGroup}>
                      <button style={s.approveBtn} onClick={() => handleApprove(u.id)}>Approve</button>
                      <button style={s.rejectBtn} onClick={() => handleReject(u.id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderUsers = () => (
    <section style={s.card}>
      <div style={s.cardHead}>
        <span style={s.cardTitle}>All Users ({employees.length})</span>
        <button style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }} onClick={fetchAll} disabled={loading}>
          <FaSyncAlt style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {employees.length === 0 ? (
        <p style={s.empty}>No approved users found.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>{["Name", "Role", "Department", "Email", "Phone", "Joined"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {employees.map(u => (
                <tr key={u.id}>
                  <td style={s.td}><strong>{u.full_name}</strong><small style={s.subText}>@{u.username}</small></td>
                  <td style={s.td}><StatusBadge value={u.role} /></td>
                  <td style={s.td}>{u.department || "-"}</td>
                  <td style={s.td}>{u.email || "-"}</td>
                  <td style={s.td}>{u.phone || "-"}</td>
                  <td style={s.td}>{u.date_joined || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderAttendance = () => {
    const sectors = [...new Set(attendance.map(a => a.department?.trim() || "Unassigned"))].sort();
    const filtered = selectedAttSector
      ? attendance.filter(a => (a.department?.trim() || "Unassigned") === selectedAttSector)
      : attendance;
    const sectorSummary = sectors.map(sector => {
      const rows = attendance.filter(a => (a.department?.trim() || "Unassigned") === sector);
      return {
        sector,
        present: rows.filter(a => a.status === "Present").length,
        absent:  rows.filter(a => a.status === "Absent").length,
        onLeave: rows.filter(a => a.status === "On Leave").length,
        total:   rows.length,
      };
    });
    const totalPresent  = attendance.filter(a => a.status === "Present").length;
    const totalAbsent   = attendance.filter(a => a.status === "Absent").length;
    const totalOnLeave  = attendance.filter(a => a.status === "On Leave").length;
    const totalRecords  = attendance.length;
    const presentPct    = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0;
    const pendingClaims = claims.filter(c => c.status === "Pending").length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Header bar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Attendance Overview</h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>Sector-wise attendance for {new Date(attendanceDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {selectedAttSector && (
              <button onClick={() => setSelectedAttSector("")} style={{ border: "1px solid #e2e8f0", background: "white", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                ✕ Clear filter
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px" }}>
              <FaCalendarAlt style={{ color: "#64748b", fontSize: 13 }} />
              <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", fontWeight: 600, background: "transparent" }} />
            </div>
            <button onClick={fetchAll} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "#2563eb", color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              <FaSyncAlt style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {[
            { label: "Total Records",   value: totalRecords,  color: "#2563eb", bg: "#dbeafe",  icon: "📋" },
            { label: "Present",         value: totalPresent,  color: "#059669", bg: "#dcfce7",  icon: "✅" },
            { label: "Absent",          value: totalAbsent,   color: "#dc2626", bg: "#fee2e2",  icon: "❌" },
            { label: "On Leave",        value: totalOnLeave,  color: "#7c3aed", bg: "#ede9fe",  icon: "🏖️" },
            { label: "Pending Claims",  value: pendingClaims, color: "#d97706", bg: "#fef3c7",  icon: "⏳" },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sector cards + bar chart row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Sector cards */}
          <div style={{ background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Sectors ({sectors.length})</span>
              {selectedAttSector && <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 700 }}>Filtered: {selectedAttSector}</span>}
            </div>
            {sectorSummary.length === 0 ? (
              <p style={s.empty}>No sector data for this date.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sectorSummary.map((sec, i) => {
                  const isActive = selectedAttSector === sec.sector;
                  const pct = sec.total ? Math.round((sec.present / sec.total) * 100) : 0;
                  const color = DEPT_COLORS[i % DEPT_COLORS.length];
                  return (
                    <div key={sec.sector} onClick={() => setSelectedAttSector(isActive ? "" : sec.sector)}
                      style={{ border: `1.5px solid ${isActive ? color : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer", background: isActive ? color + "12" : "#f8fafc", transition: "all 0.15s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{sec.sector}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{sec.total} records</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#dcfce7", borderRadius: 6, padding: "2px 8px" }}>✓ {sec.present} Present</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fee2e2", borderRadius: 6, padding: "2px 8px" }}>✗ {sec.absent} Absent</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", borderRadius: 6, padding: "2px 8px" }}>🏖 {sec.onLeave} Leave</span>
                      </div>
                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{pct}% present rate</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bar chart */}
          <div style={{ background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 16 }}>Attendance by Sector</div>
            {sectorSummary.length === 0 ? <p style={s.empty}>No data.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sectorSummary.map((sec, i) => ({ ...sec, name: sec.sector.length > 10 ? sec.sector.slice(0, 10) + "…" : sec.sector, fill: DEPT_COLORS[i % DEPT_COLORS.length] }))} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
                  <Bar dataKey="present" name="present" stackId="a" fill="#059669" radius={[0,0,0,0]} />
                  <Bar dataKey="onLeave" name="onLeave" stackId="a" fill="#7c3aed" radius={[0,0,0,0]} />
                  <Bar dataKey="absent"  name="absent"  stackId="a" fill="#dc2626" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              {[{color:"#059669",label:"Present"},{color:"#7c3aed",label:"On Leave"},{color:"#dc2626",label:"Absent"}].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />{l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Attendance table ── */}
        <div style={{ background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
              {selectedAttSector ? `${selectedAttSector} — ` : "All Sectors — "}{filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {sectors.map((sec, i) => (
                <button key={sec} onClick={() => setSelectedAttSector(selectedAttSector === sec ? "" : sec)}
                  style={{ border: `1.5px solid ${selectedAttSector === sec ? DEPT_COLORS[i % DEPT_COLORS.length] : "#e2e8f0"}`, background: selectedAttSector === sec ? DEPT_COLORS[i % DEPT_COLORS.length] : "white", color: selectedAttSector === sec ? "white" : "#374151", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {sec}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p style={s.empty}>No attendance records{selectedAttSector ? ` for ${selectedAttSector}` : ""} on this date.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Employee", "Sector", "Check In", "Check Out", "Status"].map(h => <th key={h} style={{ ...s.th, padding: "10px 12px" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={row.id} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                            {row.employee?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{row.employee}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ background: "#f1f5f9", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#475569" }}>{row.department || "Unassigned"}</span>
                      </td>
                      <td style={s.td}>
                        {row.check_in ? <span style={{ color: "#059669", fontWeight: 700 }}>{row.check_in}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td style={s.td}>
                        {row.check_out ? <span style={{ color: "#2563eb", fontWeight: 700 }}>{row.check_out}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td style={s.td}><StatusBadge value={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Claims ── */}
        <div style={{ background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Attendance Claims</span>
            {pendingClaims > 0 && <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{pendingClaims} Pending</span>}
          </div>
          {claims.length === 0 ? <p style={s.empty}>No attendance claims submitted.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {claims.map(claim => (
                <div key={claim.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", background: claim.status === "Pending" ? "#fffbeb" : "#f8fafc" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                      {claim.employee?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{claim.employee}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        <span style={{ background: "#f1f5f9", borderRadius: 4, padding: "1px 6px", marginRight: 6 }}>{claim.department || "Unassigned"}</span>
                        {claim.date} · In {claim.check_in_time || "—"} · Out {claim.check_out_time || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{claim.reason}</div>
                    </div>
                  </div>
                  {claim.status === "Pending" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ border: "none", background: "#059669", color: "white", borderRadius: 8, padding: "7px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" }} onClick={() => handleClaimAction(claim.id, "approve")}>Approve</button>
                      <button style={{ border: "none", background: "#dc2626", color: "white", borderRadius: 8, padding: "7px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" }} onClick={() => handleClaimAction(claim.id, "reject")}>Reject</button>
                    </div>
                  ) : <StatusBadge value={claim.status} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeaveManagement = () => (
    <div style={s.sectorStack}>
      <section style={s.card}>
        <div style={s.cardHead}><span style={s.cardTitle}>Pending Leave Requests ({pendingLeaves.length})</span></div>
        {pendingLeaves.length === 0 ? <p style={s.empty}>No pending leave approvals.</p> : pendingLeaves.map(leave => (
          <div key={leave.id} style={s.requestRow}>
            <div style={{ flex: 1 }}>
              <p style={s.rowTitle}>{leave.employee} <StatusBadge value={leave.leave_type_display || leave.leave_type} /></p>
              <p style={s.rowMeta}>{leave.department || "Unassigned"}</p>
              <p style={s.rowMeta}>{leave.start_date} to {leave.end_date} | {leave.days} day(s)</p>
              <p style={s.rowReason}>{leave.reason}</p>
            </div>
            <div style={s.actionGroup}>
              <button style={s.approveBtn} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
              <button style={s.rejectBtn} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
            </div>
          </div>
        ))}
      </section>

      <section style={s.card}>
        <div style={s.cardHead}><span style={s.cardTitle}>All Leave Records ({leaves.length})</span></div>
        {leaves.length === 0 ? <p style={s.empty}>No leave records found.</p> : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{["Employee", "Department", "Type", "Dates", "Days", "Status", "Reason"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {leaves.map(leave => (
                  <tr key={leave.id}>
                    <td style={s.td}>{leave.employee}</td>
                    <td style={s.td}>{leave.department || "-"}</td>
                    <td style={s.td}>{leave.leave_type_display || leave.leave_type}</td>
                    <td style={s.td}>{leave.start_date} to {leave.end_date}</td>
                    <td style={s.td}>{leave.days}</td>
                    <td style={s.td}><StatusBadge value={leave.status} /></td>
                    <td style={s.td}>{leave.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  const renderLeavePolicies = () => {
    const changed = JSON.stringify(policies) !== JSON.stringify(policyOriginal);

    return (
      <div style={s.sectorStack}>
        <div style={s.sectorHero}>
          <div>
            <h2 style={s.sectionTitle}>Leave Policy Management</h2>
            <p style={s.sectionSub}>Manage annual leave entitlements that apply to employee leave balances.</p>
          </div>
          <div style={s.actionGroup}>
            <button
              type="button"
              style={{ ...s.primaryBtn, background: "#64748b", display: "inline-flex", alignItems: "center", gap: 8 }}
              onClick={resetPolicies}
              disabled={!changed || policySaving || policyLoading}
            >
              <FaUndo /> Reset
            </button>
            <button
              type="button"
              style={{ ...s.primaryBtn, display: "inline-flex", alignItems: "center", gap: 8, opacity: policySaving ? 0.7 : 1 }}
              onClick={savePolicies}
              disabled={!changed || policySaving || policyLoading}
            >
              <FaSave /> {policySaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div style={s.infoBanner}>
          Changes saved here update existing employee leave balances for the selected leave type.
        </div>

        {policyMsg && <p style={s.successMsg}>{policyMsg}</p>}
        {policyErr && <p style={s.errorMsg}>{policyErr}</p>}

        <section style={s.card}>
          <div style={s.cardHead}>
            <span style={s.cardTitle}>Leave Policy List</span>
            <button
              type="button"
              style={{ ...s.settingsBtn, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 8, opacity: policyLoading ? 0.6 : 1 }}
              onClick={fetchPolicies}
              disabled={policyLoading}
            >
              <FaSyncAlt style={{ animation: policyLoading ? "spin 1s linear infinite" : "none" }} />
              {policyLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {policyLoading && policies.length === 0 ? (
            <p style={s.empty}>Loading leave policies...</p>
          ) : policies.length === 0 ? (
            <p style={s.empty}>No leave policies found.</p>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{["Leave Type", "Max Days Per Year", "Type", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.leave_type}>
                      <td style={s.td}>
                        <strong>{policy.leave_type_display}</strong>
                        <small style={s.subText}>{policy.leave_type}</small>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="number"
                            min="0"
                            value={policy.entitled}
                            onChange={(e) => updatePolicyDays(policy.leave_type, e.target.value)}
                            style={{ ...s.input, width: 90 }}
                          />
                          <span style={{ color: "#64748b", fontSize: 12 }}>days</span>
                        </div>
                      </td>
                      <td style={s.td}>{Number(policy.entitled || 0) === 0 ? "Unlimited / on request" : "Annual quota"}</td>
                      <td style={s.td}><StatusBadge value="Active" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={s.card}>
          <div style={s.cardHead}><span style={s.cardTitle}>Policy Notes</span></div>
          {[
            "Employees must apply for leave in advance whenever possible.",
            "Leave requests are still subject to manager approval.",
            "Set max days to 0 for leave types that are unlimited or handled on request.",
            "Saved policy changes apply to all existing balances for that leave type.",
          ].map((note) => (
            <div key={note} style={s.reportRow}>
              <span>{note}</span>
            </div>
          ))}
        </section>
      </div>
    );
  };

  const renderReports = () => (
    <div style={s.sectorStack}>
      <div style={s.statsRow}>
        {[
          ["Approved Users", total],
          ["Departments", deptData.length],
          ["Pending Registrations", pending.length],
          ["Pending Leaves", pendingLeaves.length],
          ["Pending Claims", pendingClaims.length],
        ].map(([label, value]) => (
          <div key={label} style={s.statCard}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={s.midRow}>
        <section style={s.card}>
          <div style={s.cardHead}><span style={s.cardTitle}>Users by Role</span></div>
          {roleData.length === 0 ? <p style={s.empty}>No role data yet.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={roleData} barSize={52} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 700, fill: "#374151" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} users`]} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="users" radius={[8, 8, 0, 0]}>
                  {roleData.map(row => <Cell key={row.name} fill={row.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
        <section style={s.card}>
          <div style={s.cardHead}><span style={s.cardTitle}>Department Ranking</span></div>
          {sectorRows.length === 0 ? <p style={s.empty}>No department data yet.</p> : sectorRows.slice(0, 8).map(row => (
            <div key={row.name} style={s.reportRow}>
              <span><span style={{ ...s.dot, background: row.color }} />{row.name}</span>
              <strong>{row.users}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div style={s.midRow}>
      <section style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Admin Profile</span>
          <div style={{ display: "flex", gap: 8 }}>
            {profileEdit && (
              <button style={{ ...s.primaryBtn, background: "#64748b" }} onClick={cancelEditProfile}>Cancel</button>
            )}
            <button style={s.primaryBtn} onClick={profileEdit ? saveAdminProfile : startEditProfile}>
              {profileEdit ? "Save Changes" : "Edit Profile"}
            </button>
          </div>
        </div>
        {profileSaveMsg && <p style={{ color: "#065f46", background: "#d1fae5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{profileSaveMsg}</p>}
        {profileSaveErr && <p style={{ color: "#991b1b", background: "#fee2e2", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{profileSaveErr}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Full Name",    key: "full_name",  editable: true  },
            { label: "Username",     key: "username",   editable: true  },
            { label: "Email",        key: "email",      editable: true  },
            { label: "Phone",        key: "phone",      editable: true  },
            { label: "Role",         key: "role",       editable: false },
          ].map(({ label, key, editable }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>{label}</label>
              <input
                style={{ ...s.input, background: profileEdit && editable ? "white" : "#f8fafc", color: "#0f172a", width: "100%", boxSizing: "border-box" }}
                value={(profileEdit ? profileForm[key] : profile[key]) || ""}
                disabled={!profileEdit || !editable}
                onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>
      <section style={s.card}>
        <div style={s.cardHead}><span style={s.cardTitle}>System Settings</span></div>
        <div style={s.settingsList}>
          <button style={{ ...s.settingsBtn, display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.6 : 1 }} onClick={fetchAll} disabled={loading}>
            <FaSyncAlt style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Refreshing..." : "Refresh dashboard data"}
          </button>
          <button style={s.settingsBtn} onClick={() => setActiveNav("Registrations")}>Review pending registrations</button>
          <button style={s.settingsBtn} onClick={() => setActiveNav("Reports")}>Open reports</button>
        </div>
      </section>
    </div>
  );

  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const res = await axios.get(`${API}/announcements/`, cfg());
      setAnnouncements(res.data || []);
    } catch { setAnnouncements([]); }
    finally { setAnnLoading(false); }
  };

  const postAnnouncement = async () => {
    setAnnErr("");
    setAnnSuccess("");
    if (!annForm.title.trim() || !annForm.message.trim()) {
      setAnnErr("Title and message are required.");
      return;
    }
    setAnnPosting(true);
    try {
      await axios.post(`${API}/announcements/`, annForm, cfg());
      setAnnForm({ title: "", message: "", department: "" });
      setAnnSuccess("Announcement posted successfully.");
      setTimeout(() => setAnnSuccess(""), 3000);
      await fetchAnnouncements();
    } catch (e) {
      setAnnErr(e.response?.data?.error || "Failed to post announcement.");
    } finally { setAnnPosting(false); }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await axios.delete(`${API}/announcements/${id}/`, cfg());
      await fetchAnnouncements();
    } catch {}
  };

  const renderAnnouncements = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>📢 Post Announcement</span>
          <button onClick={fetchAnnouncements} style={{ ...s.settingsBtn, padding: "6px 12px", fontSize: 12 }}>Refresh</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Target Department</label>
          <select style={{ ...s.input, width: "100%" }} value={annForm.department} onChange={e => setAnnForm({ ...annForm, department: e.target.value })}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Title *</label>
          <input style={{ ...s.input, width: "100%", boxSizing: "border-box" }} placeholder="Announcement title" value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Message *</label>
          <textarea style={{ ...s.input, width: "100%", minHeight: 80, resize: "vertical", boxSizing: "border-box" }} placeholder="Write your announcement..." value={annForm.message} onChange={e => setAnnForm({ ...annForm, message: e.target.value })} />
        </div>
        {annErr     && <p style={{ ...s.errorMsg,   marginTop: 8 }}>{annErr}</p>}
        {annSuccess && <p style={{ ...s.successMsg, marginTop: 8 }}>{annSuccess}</p>}
        <button onClick={postAnnouncement} disabled={annPosting}
          style={{ ...s.primaryBtn, marginTop: 12, opacity: annPosting ? 0.7 : 1, padding: "10px 20px", fontSize: 13 }}>
          {annPosting ? "Posting..." : "Post Announcement"}
        </button>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>All Announcements ({announcements.length})</span>
        </div>
        {annLoading ? <p style={s.empty}>Loading...</p> : announcements.length === 0 ? <p style={s.empty}>No announcements yet.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {announcements.map(a => (
              <div key={a.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{a.title}</span>
                      <span style={{ background: a.department === "All Departments" ? "#dbeafe" : "#ede9fe", color: a.department === "All Departments" ? "#1d4ed8" : "#6d28d9", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{a.department}</span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{a.message}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>By <strong style={{ color: "#64748b" }}>{a.sender}</strong> · {a.created_at}</p>
                  </div>
                  <button onClick={() => deleteAnnouncement(a.id)}
                    style={{ border: "1px solid #fee2e2", background: "white", color: "#dc2626", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // load announcements when tab is opened
  useEffect(() => { if (activeNav === "Announcements") fetchAnnouncements(); }, [activeNav]);

  const renderSectorOverview = () => (
    <div style={s.sectorStack}>
      <div style={s.sectorHero}>
        <div>
          <h2 style={s.sectionTitle}>Sector Overview</h2>
          <p style={s.sectionSub}>Review department size, role mix, and pending registrations by sector.</p>
        </div>
        <div style={s.sectorTools}>
          <div style={{ ...s.searchBox, width: 260 }}>
            <FaSearch style={{ color: "#94a3b8" }} />
            <input
              value={sectorSearch}
              onChange={(e) => setSectorSearch(e.target.value)}
              placeholder="Search sectors..."
              style={s.searchInput}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        {[
          { label: "Total Sectors",    value: sectorRows.length,                                              sub: "Departments in system",  icon: <FaBuilding />,     iconBg: "#ede9fe", iconColor: "#7c3aed" },
          { label: "Largest Sector",   value: sectorRows[0]?.users || 0,                                      sub: sectorRows[0]?.name || "—", icon: <FaUsers />,       iconBg: "#dbeafe", iconColor: "#2563eb" },
          { label: "Pending",          value: pending.length,                                                 sub: "Awaiting approval",      icon: <FaClipboardList />, iconBg: "#fef3c7", iconColor: "#d97706" },
          { label: "Avg Sector Size",  value: sectorRows.length ? Math.round(total / sectorRows.length) : 0, sub: "Users per sector",        icon: <FaChartBar />,     iconBg: "#dcfce7", iconColor: "#16a34a" },
          { label: "Unassigned Users", value: deptMap["Unassigned"] || 0,                                    sub: "No department set",      icon: <FaCog />,          iconBg: "#fee2e2", iconColor: "#dc2626" },
        ].map(({ label, value, sub, icon, iconBg, iconColor }) => (
          <div key={label} style={s.statCard}>
            <div style={{ ...s.statIcon, background: iconBg, color: iconColor }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: "#0f172a" }}>{value}</div>
              <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={s.midRow}>
        <div style={s.card}>
          <div style={s.cardHead}>
            <span style={s.cardTitle}>Sector Distribution</span>
            {sectorSearch && <span style={s.viewAll} onClick={() => setSectorSearch("")}>Clear search</span>}
          </div>
          {filteredSectorRows.length === 0 ? (
            <p style={s.empty}>No sectors match your search.</p>
          ) : (
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ width: 210, height: 210, flexShrink: 0, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={filteredSectorRows} dataKey="users" innerRadius={65} outerRadius={100} paddingAngle={3}>
                      {filteredSectorRows.map((d, i) => <Cell key={d.name} fill={d.color || DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} users`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ ...s.donutLabel, marginTop: -118 }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{filteredSectorRows.length}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Sector(s)</div>
                </div>
              </div>
              <div style={s.sectorList}>
                {filteredSectorRows.map(row => (
                  <button
                    key={row.name}
                    type="button"
                    style={{ ...s.sectorListItem, ...(selectedSectorRow?.name === row.name ? s.sectorListActive : {}) }}
                    onClick={() => setSelectedSector(row.name)}
                  >
                    <span style={{ ...s.dot, background: row.color }} />
                    <span style={{ flex: 1, textAlign: "left" }}>{row.name}</span>
                    <strong>{row.users}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={s.card}>
          <div style={s.cardHead}><span style={s.cardTitle}>Selected Sector</span></div>
          {selectedSectorRow ? (
            <div>
              <div style={s.selectedSectorHead}>
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", background: selectedSectorRow.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{selectedSectorRow.name}</div>
                </div>
              </div>
              <div style={s.sectorMetricGrid}>
                {[
                  ["Total Users",  selectedSectorRow.users],
                  ["Employees",    selectedSectorRow.employees],
                  ["Managers",     selectedSectorRow.managers],
                  ["HR Users",     selectedSectorRow.hr],
                  ["Pending",      selectedSectorRow.pending],
                ].map(([label, value]) => (
                  <div key={label} style={s.sectorMetric}>
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</span>
                    <strong style={{ fontSize: 20, color: "#0f172a" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={s.empty}>Select a sector to see details.</p>
          )}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Sector Details</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>{filteredSectorRows.length} shown</span>
        </div>
        {filteredSectorRows.length === 0 ? (
          <p style={s.empty}>No sector data yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {["Sector", "Users", "Employees", "Managers", "HR", "Pending", "Share"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSectorRows.map(row => (
                <tr key={row.name} onClick={() => setSelectedSector(row.name)} style={s.clickableRow}>
                  <td style={s.td}><span style={{ ...s.dot, background: row.color }} />{row.name}</td>
                  <td style={s.td}>{row.users}</td>
                  <td style={s.td}>{row.employees}</td>
                  <td style={s.td}>{row.managers}</td>
                  <td style={s.td}>{row.hr}</td>
                  <td style={s.td}>{row.pending}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={s.barBg}>
                        <div style={{ ...s.barFill, width: `${row.share}%`, background: row.color }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#374151" }}>{row.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div style={s.root}>
      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={s.brandIcon}>🛡️</div>
          <div>
            <div style={s.brandName}>AMS</div>
            <div style={s.brandSub}>Attendance<br />Management System</div>
          </div>
        </div>

        <nav style={s.nav}>
          {NAV.map(({ icon, label }) => (
            <button
              key={label}
              style={{ ...s.navItem, ...(activeNav === label ? s.navActive : {}) }}
              onClick={() => setActiveNav(label)}
            >
              <span style={s.navIcon}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {label === "Registrations" && pending.length > 0 && (
                <span style={s.navBadge}>{pending.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={s.sideBottom}>
          <div style={s.profileBox}>
            <div style={s.avatar}>{profile.full_name?.[0]?.toUpperCase() || "S"}</div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{profile.full_name}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Super Administrator</div>
              <div style={{ color: "#22c55e", fontSize: 11 }}>● Online</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        {/* TOPBAR */}
        <div style={s.topbar}>
          <div>
            <h1 style={s.welcome}>Welcome back, {profile.full_name}! 👋</h1>
            <p style={s.welcomeSub}>Monitor and manage all departments, users and system activities.</p>
          </div>
          <div style={s.topRight}>
            <button
              onClick={checkedIn ? handleCheckOut : handleCheckIn}
              style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: checkedIn ? "#dc2626" : "#059669", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {checkedIn ? "Check Out" : "Check In"}
            </button>
            <div style={s.iconBtn}><NotificationBell /></div>
          </div>
        </div>

        {/* DATE + TOAST */}
        <div style={s.dateLine}>
          <div style={s.dateChip}>
            <FaCalendarAlt style={{ color: "#64748b", fontSize: 13 }} />
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
              {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
            <FaChevronDown style={{ fontSize: 11, color: "#64748b" }} />
          </div>
          <button
            style={{ ...s.dateChip, cursor: "pointer", border: "1px solid #e2e8f0", background: loading ? "#f1f5f9" : "white", display: "flex", alignItems: "center", gap: 6, color: "#374151", fontWeight: 600, fontSize: 13 }}
            onClick={fetchAll}
            disabled={loading}
          >
            <FaSyncAlt style={{ fontSize: 12, color: "#64748b", animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {msg && <span style={s.toast}>{msg}</span>}
        </div>

        <div style={s.content}>
        {activeNav === "Sector Overview" ? renderSectorOverview() :
         activeNav === "Registrations" ? renderRegistrations() :
         activeNav === "Users" ? renderUsers() :
         activeNav === "User Management" ? renderUserManagement() :
         activeNav === "Attendance" ? renderAttendance() :
         activeNav === "Reports" ? renderReports() :
         activeNav === "Profile" ? renderSettings() :
         activeNav === "Leave Policy" ? renderLeavePolicies() :
         activeNav === "Announcements" ? renderAnnouncements() : (
          <>
        {/* STAT CARDS */}
        <div style={s.statsRow}>
          {statCards.map(({ label, sub, value, icon, iconBg, iconColor, warn }) => (
            <div key={label} style={s.statCard}>
              <div style={{ ...s.statIcon, background: iconBg, color: iconColor }}>{icon}</div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: warn ? "#d97706" : "#0f172a", lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: 11, color: warn ? "#d97706" : "#64748b" }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MIDDLE ROW */}
        <div style={s.midRow}>
          {/* DEPARTMENT OVERVIEW */}
          <div style={s.card}>
            <div style={s.cardHead}>
              <span style={s.cardTitle}>Department Overview</span>
              <span style={s.viewAll} onClick={() => setActiveNav("Users")}>View all users →</span>
            </div>
            {deptData.length === 0 ? (
              <p style={s.empty}>No department data yet.</p>
            ) : (
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ width: 180, height: 180, flexShrink: 0, position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deptData} dataKey="users" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {deptData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} users`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={s.donutLabel}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{deptData.length}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Dept(s)</div>
                  </div>
                </div>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Department</th>
                      <th style={s.th}>Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptData.map(({ name, users, color }) => (
                      <tr key={name}>
                        <td style={s.td}><span style={{ ...s.dot, background: color }} />{name}</td>
                        <td style={s.td}>{users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* REGISTRATION APPROVALS */}
          <div style={s.card}>
            <div style={s.cardHead}>
              <span style={s.cardTitle}>Registration Approvals</span>
              <span style={s.viewAll} onClick={() => setActiveNav("Registrations")}>View All</span>
            </div>
            {pending.length === 0 ? (
              <p style={s.empty}>No pending registrations.</p>
            ) : pending.slice(0, 5).map((u) => (
              <div key={u.id} style={s.approvalRow}>
                <div style={{ ...s.avatar, background: "#e2e8f0", color: "#475569", flexShrink: 0 }}>
                  {u.full_name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{u.full_name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{u.role} · {u.date_joined}</div>
                </div>
                <button style={s.approveBtn} onClick={() => handleApprove(u.id)}>Approve</button>
                <button style={s.rejectBtn} onClick={() => handleReject(u.id)}>Reject</button>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div style={s.midRow}>
          {/* DEPARTMENT SUMMARY TABLE */}
          <div style={s.card}>
            <div style={s.cardHead}>
              <span style={s.cardTitle}>Department Summary</span>
            </div>
            {deptData.length === 0 ? (
              <p style={s.empty}>No data yet.</p>
            ) : (
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Department", "Total Users", "Share %"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptData.map(({ name, users, color }) => {
                    const pct = total > 0 ? Math.round((users / total) * 100) : 0;
                    return (
                      <tr key={name}>
                        <td style={s.td}><span style={{ ...s.dot, background: color }} />{name}</td>
                        <td style={s.td}>{users}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={s.barBg}>
                              <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
                            </div>
                            <span style={{ fontSize: 12, color: "#374151" }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* SYSTEM OVERVIEW */}
            <div style={s.card}>
              <div style={s.cardHead}><span style={s.cardTitle}>System Overview</span></div>
              <div style={s.sysGrid}>
                {[
                  { icon: "👤", label: "Employees",   value: stats.employees ?? 0, iconBg: "#dbeafe", iconColor: "#2563eb" },
                  { icon: "👔", label: "Managers",    value: stats.managers  ?? 0, iconBg: "#ede9fe", iconColor: "#7c3aed" },
                  { icon: "🧑‍💼", label: "HR Users",  value: stats.hrs       ?? 0, iconBg: "#dcfce7", iconColor: "#16a34a" },
                  { icon: "🏢", label: "Departments", value: deptData.length,      iconBg: "#fef3c7", iconColor: "#d97706" },
                ].map(({ icon, label, value, iconBg, iconColor }) => (
                  <div key={label} style={s.sysCard}>
                    <div style={{ ...s.statIcon, background: iconBg, color: iconColor, fontSize: 20 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITIES */}
            <div style={s.card}>
              <div style={s.cardHead}>
                <span style={s.cardTitle}>Recent Activities</span>
              </div>
              {activities.length === 0 ? (
                <p style={s.empty}>No recent activity.</p>
              ) : activities.map(({ icon, text, time }, i) => (
                <div key={i} style={s.actRow}>
                  <span style={s.actIcon}>{icon}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{text}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
        </div>
      </main>
    </div>
  );
}

/* ── STYLES ── */
const s = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f1f5f9", color: "#0f172a" },
  sidebar: { width: 220, minWidth: 220, background: "#0f172a", display: "flex", flexDirection: "column", padding: "20px 12px", boxSizing: "border-box", overflowY: "auto" },
  brand:       { display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingLeft: 4 },
  brandIcon:   { fontSize: 28 },
  brandName:   { color: "white", fontWeight: 800, fontSize: 20, lineHeight: 1 },
  brandSub:    { color: "#64748b", fontSize: 10, lineHeight: 1.4 },
  nav:         { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  navItem:     { border: "none", background: "transparent", color: "#94a3b8", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%" },
  navActive:   { background: "#2563eb", color: "white" },
  navIcon:     { width: 16, display: "inline-flex", flexShrink: 0 },
  navBadge:    { background: "#8b5cf6", color: "white", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "2px 7px" },
  sideBottom:  { borderTop: "1px solid #1e293b", paddingTop: 14, marginTop: 8 },
  profileBox:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar:      { width: 38, height: 38, borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 },
  logoutBtn:   { border: "none", background: "transparent", color: "#f87171", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, width: "100%" },
  main:        { flex: 1, overflow: "hidden", padding: "24px 28px", display: "flex", flexDirection: "column" },
  content:     { flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 16 },
  topbar:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  welcome:     { margin: 0, fontSize: 22, fontWeight: 800 },
  welcomeSub:  { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  topRight:    { display: "flex", alignItems: "center", gap: 10 },
  searchBox:   { display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px", width: 220 },
  searchInput: { border: "none", outline: "none", fontSize: 13, width: "100%", color: "#374151" },
  iconBtn:     { background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center" },
  adminChip:   { display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "6px 12px", cursor: "pointer" },
  dateLine:    { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  dateChip:    { display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px", cursor: "pointer" },
  toast:       { background: "#0f172a", color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600 },
  infoBanner:  { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 600 },
  successMsg:  { color: "#065f46", background: "#d1fae5", borderRadius: 8, padding: "10px 14px", fontSize: 13, margin: 0 },
  errorMsg:    { color: "#991b1b", background: "#fee2e2", borderRadius: 8, padding: "10px 14px", fontSize: 13, margin: 0 },
  statsRow:    { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 },
  statCard:    { background: "white", borderRadius: 12, padding: "18px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  statIcon:    { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  midRow:      { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 },
  card:        { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  cardHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle:   { fontWeight: 800, fontSize: 15, color: "#0f172a" },
  viewAll:     { color: "#2563eb", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  donutLabel:  { textAlign: "center", marginTop: -118, pointerEvents: "none", position: "relative" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:          { textAlign: "left", padding: "8px 10px", color: "#64748b", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" },
  td:          { padding: "10px 10px", borderBottom: "1px solid #f8fafc", color: "#374151", verticalAlign: "middle" },
  dot:         { display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 8 },
  approvalRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  approveBtn:  { border: "1px solid #16a34a", background: "white", color: "#16a34a", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" },
  rejectBtn:   { border: "1px solid #dc2626", background: "white", color: "#dc2626", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" },
  barBg:       { flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", minWidth: 60 },
  barFill:     { height: "100%", borderRadius: 4 },
  sysGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  sysCard:     { display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", borderRadius: 10, padding: "14px 12px" },
  actRow:      { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f8fafc" },
  actIcon:     { fontSize: 18, flexShrink: 0 },
  empty:          { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "20px 0", margin: 0 },
  sectorStack:     { display: "flex", flexDirection: "column", gap: 16 },
  sectorHero:      { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  sectorTools:     { display: "flex", alignItems: "center", gap: 10 },
  sectionTitle:    { margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" },
  sectionSub:      { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  sectorStatValue: { fontSize: 20, fontWeight: 800, lineHeight: 1.2, color: "#0f172a", wordBreak: "break-word", maxWidth: 120 },
  sectorList:      { flex: 1, display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" },
  sectorListItem:  { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#0f172a" },
  sectorListActive:{ background: "#dbeafe", borderColor: "#2563eb", color: "#1d4ed8" },
  selectedSectorHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  sectorMetricGrid:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  sectorMetric:    { background: "#f8fafc", borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 },
  clickableRow:    { cursor: "pointer" },
  tableWrap:       { width: "100%", overflowX: "auto" },
  subText:         { display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 400, marginTop: 2 },
  actionGroup:     { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge:           { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", textTransform: "capitalize" },
  primaryBtn:      { border: "none", background: "#2563eb", color: "white", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12 },
  input:           { border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", outline: "none", fontSize: 13, color: "#374151", background: "white" },
  miniGrid:        { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 },
  miniCard:        { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748b", fontSize: 12, fontWeight: 700 },
  requestRow:      { display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" },
  rowTitle:        { margin: 0, fontWeight: 800, fontSize: 13, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowMeta:         { margin: "4px 0", color: "#64748b", fontSize: 12 },
  rowReason:       { margin: 0, color: "#475569", fontSize: 12 },
  reportRow:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#374151" },
  profileDetails:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  settingsList:    { display: "flex", flexDirection: "column", gap: 10 },
  settingsBtn:     { border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", borderRadius: 8, padding: "11px 12px", cursor: "pointer", fontWeight: 700, textAlign: "left" },
};
