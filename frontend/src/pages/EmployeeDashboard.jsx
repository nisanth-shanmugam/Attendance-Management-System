import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FaHome, FaClock, FaCalendarAlt, FaUser, FaSignOutAlt,
  FaCheckCircle, FaTimesCircle, FaCoffee, FaEdit, FaSave,
  FaBell, FaCalendarCheck,
} from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import AnnouncementsTab from "../components/AnnouncementsTab";
import Pagination from "../components/Pagination";

const API = "http://127.0.0.1:8000/api";

const DEPARTMENTS = [
  "Information Technology",
  "Human Resources",
  "Finance",
  "Marketing",
  "Operations",
  "Sales",
  "Legal",
  "Administration",
];

const EmployeeDashboard = () => {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [time, setTime] = useState(new Date());

  // attendance
  const [checkedIn, setCheckedIn] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [attendance, setAttendance] = useState([]);

  // pagination
  const [attRecPage, setAttRecPage] = useState(1);
  const [leaveHistPage, setLeaveHistPage] = useState(1);
  const [claimHistPage, setClaimHistPage] = useState(1);
  const PAGE = 10;

  // transactions
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txRecords, setTxRecords] = useState([]);
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txExpanded, setTxExpanded] = useState({});

  // tasks
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [taskError, setTaskError] = useState("");

  // leaves
  const [leaves, setLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'CL', start_date: '', end_date: '', reason: '' });
  const [leaveError, setLeaveError] = useState('');

  // stats from backend
  const [presentDays, setPresentDays] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [leavesLeft, setLeavesLeft] = useState(12);

  // claims
  const [claims, setClaims] = useState([]);
  const [claimForm, setClaimForm] = useState({ date: "", check_in_time: "", check_out_time: "", reason: "" });
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  // announcements
  const [announcements, setAnnouncements] = useState([]);

  // profile
  const [profile, setProfile] = useState({ full_name: "", username: "", email: "", phone: "", role: "" });
  const [editProfile, setEditProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMsg, setProfileMsg]     = useState("");
  const showProfileMsg = (t) => { setProfileMsg(t); setTimeout(() => setProfileMsg(""), 3000); };

  const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

  useEffect(() => {
    fetchAll();
    const timer = setInterval(() => setTime(new Date()), 1000);

    const token = localStorage.getItem('token');
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/?token=${token}`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'refresh') {
        const r = data.resource;
        if (r === 'attendance') { fetchAttendance(); fetchStats(); }
        else if (r === 'tasks') { fetchTasks(); fetchStats(); }
        else if (r === 'leaves') { fetchLeaves(); fetchLeaveBalances(); fetchLeavePolicies(); fetchStats(); }
        else if (r === 'claims') fetchClaims();
        else if (r === 'announcements') fetchAnnouncements();
        else fetchAll();
      }
    };
    const wsRef = ws;
    return () => { clearInterval(timer); wsRef.close(); };
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchAttendance(), fetchTasks(), fetchLeaves(), fetchLeaveBalances(), fetchLeavePolicies(), fetchProfile(), fetchStats(), fetchClaims(), fetchAnnouncements()]);
  };

  const fetchTransactions = async (page = 1, dateFrom = txDateFrom, dateTo = txDateTo) => {
    try {
      const params = new URLSearchParams({ page });
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      const res = await axios.get(`${API}/attendance/logs/?${params}`, cfg());
      setTxRecords(res.data.results);
      setTxTotal(res.data.total);
      setTxPage(page);
    } catch { setTxRecords([]); }
  };

  const fetchClaims = async () => {
    try {
      const res = await axios.get(`${API}/attendance/claim/`, cfg());
      setClaims(res.data);
    } catch { setClaims([]); }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${API}/announcements/`, cfg());
      setAnnouncements(res.data || []);
    } catch { setAnnouncements([]); }
  };

  const submitClaim = async () => {
    setClaimError("");
    setClaimSuccess("");
    if (!claimForm.date || !claimForm.check_in_time || !claimForm.reason.trim()) {
      setClaimError("Date, check-in time and reason are required.");
      return;
    }
    try {
      await axios.post(`${API}/attendance/claim/`, claimForm, cfg());
      setClaimSuccess("Claim submitted successfully. Awaiting manager approval.");
      setClaimForm({ date: "", check_in_time: "", check_out_time: "", reason: "" });
      fetchAll();
    } catch (err) {
      setClaimError(err.response?.data?.error || "Failed to submit claim.");
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${API}/attendance/`, cfg());
      setAttendance(res.data);
    } catch { setAttendance([]); }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks/`, cfg());
      setTasks(res.data);
    } catch { setTasks([]); }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) { setTaskError("Title is required"); return; }
    try {
      await axios.post(`${API}/tasks/`, newTask, cfg());
      setNewTask({ title: "", description: "" });
      setShowTaskForm(false);
      setTaskError("");
      fetchAll();
    } catch { setTaskError("Failed to add task. Try again."); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${API}/leaves/`, cfg());
      setLeaves(res.data);
    } catch { setLeaves([]); }
  };

  const fetchLeaveBalances = async () => {
    try {
      const res = await axios.get(`${API}/leaves/balances/`, cfg());
      setLeaveBalances(res.data);
    } catch { setLeaveBalances([]); }
  };

  const fetchLeavePolicies = async () => {
    try {
      const res = await axios.get(`${API}/leaves/policy/`, cfg());
      const rows = res.data || [];
      setLeavePolicies(rows);
      if (rows.length && !rows.some(row => row.leave_type === leaveForm.leave_type)) {
        setLeaveForm(prev => ({ ...prev, leave_type: rows[0].leave_type }));
      }
    } catch { setLeavePolicies([]); }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile/`, cfg());
      setProfile(res.data);
    } catch {
      setProfile({
        full_name: localStorage.getItem("full_name") || "",
        username: localStorage.getItem("username") || "",
        email: localStorage.getItem("email") || "",
        phone: localStorage.getItem("phone") || "",
        role: localStorage.getItem("role") || "",
      });
    }
  };

  const fetchStats = async () => {
    try {
      const [attStats, taskStats, leaveStats] = await Promise.all([
        axios.get(`${API}/attendance/stats/`, cfg()),
        axios.get(`${API}/tasks/stats/`, cfg()),
        axios.get(`${API}/leaves/stats/`, cfg()),
      ]);
      setPresentDays(attStats.data.present_days ?? 0);
      setTasksDone(taskStats.data.completed ?? 0);
      setLeavesLeft(leaveStats.data.leaves_left ?? 12);
    } catch {}
  };

  const localDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-CA');          // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0];          // HH:MM:SS
    return { date, time };
  };

  const handleCheckIn = async () => {
    try {
      await axios.post(`${API}/checkin/`, localDateTime(), cfg());
      setCheckedIn(true);
      fetchStats();
      fetchAttendance();
    } catch { setCheckedIn(true); }
  };

  const handleCheckOut = async () => {
    try {
      await axios.post(`${API}/checkout/`, localDateTime(), cfg());
      setCheckedIn(false);
      fetchAttendance();
    } catch { setCheckedIn(false); }
  };

  const handleBreak = async () => {
    try {
      await axios.post(onBreak ? `${API}/break/end/` : `${API}/break/start/`, {}, cfg());
      setOnBreak(prev => !prev);
    } catch { setOnBreak(prev => !prev); }
  };

  const updateTask = async (id, newStatus) => {
    try {
      await axios.put(`${API}/tasks/${id}/`, { status: newStatus }, cfg());
      fetchAll();
    } catch { setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t)); }
  };

  const applyLeave = async () => {
    setLeaveError('');
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      setLeaveError('All fields are required.');
      return;
    }
    if (!leavePolicies.some(policy => policy.leave_type === leaveForm.leave_type)) {
      setLeaveError('Please select a valid leave type from the policy list.');
      return;
    }
    try {
      await axios.post(`${API}/leave/apply/`, leaveForm, cfg());
      setLeaveForm({ leave_type: leavePolicies[0]?.leave_type || 'CL', start_date: '', end_date: '', reason: '' });
      setLeaveError('');
      fetchAll();
    } catch (err) {
      setLeaveError(err.response?.data?.error || 'Failed to apply leave.');
    }
  };

  const saveProfile = async () => {
    setProfileError("");
    try {
      const res = await axios.put(`${API}/profile/`, profile, cfg());
      const updated = { ...profile, ...res.data };
      setProfile(updated);
      localStorage.setItem("full_name",  updated.full_name  || "");
      localStorage.setItem("email",      updated.email      || "");
      localStorage.setItem("phone",      updated.phone      || "");
      localStorage.setItem("username",   updated.username   || "");
      localStorage.setItem("department", updated.department || "");
      setEditProfile(false);
      showProfileMsg("Profile saved successfully.");
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to save profile.");
    }
  };

  const navItems = [
    { icon: <FaHome />,          label: "Dashboard" },
    { icon: <FaCalendarCheck />, label: "My Attendance" },
    { icon: <FaCalendarAlt />,   label: "Leave & Claim", badge: leaves.filter(l => l.status === "Pending").length },
    { icon: <FaBell />,          label: "Announcements" },
    { icon: <FaUser />,          label: "Profile" },
  ];

  const leavePolicyRows = (leavePolicies.length ? leavePolicies : leaveBalances).map((policy) => {
    const balance = leaveBalances.find(b => b.leave_type === policy.leave_type) || {};
    const entitled = Number(policy.entitled ?? balance.entitled ?? 0);
    const used = Number(balance.used || 0);
    const remaining = entitled === 0 ? null : Math.max(entitled - used, 0);
    return {
      leave_type: policy.leave_type,
      leave_type_display: policy.leave_type_display || balance.leave_type_display || policy.leave_type,
      entitled,
      used,
      remaining,
    };
  });

  const statusBadgeStyle = {
    ...s.statusBadge,
    background: checkedIn ? "#d1fae5" : "#fee2e2",
    color: checkedIn ? "#065f46" : "#991b1b",
  };

  const absentDays = useMemo(() => attendance.filter(a => a.status === "Absent").length, [attendance]);
  const onLeaveDays = useMemo(() => attendance.filter(a => a.status === "On Leave").length, [attendance]);
  const totalWorkingHours = useMemo(() => {
    let total = 0;
    attendance.forEach(a => {
      if (a.check_in && a.check_out) {
        const ci = new Date(`2000-01-01 ${a.check_in}`);
        const co = new Date(`2000-01-01 ${a.check_out}`);
        total += (co - ci) / 1000 / 60;
      }
    });
    const h = Math.floor(total / 60);
    const m = Math.floor(total % 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }, [attendance]);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const attMap = {};
    attendance.forEach(a => { attMap[a.date] = a.status; });
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date: dateStr, status: attMap[dateStr] || null, isToday: d === now.getDate() });
    }
    return days;
  }, [attendance]);

  const renderContent = () => {
    switch (activeNav) {

      case "Dashboard":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Check-in / Check-out toggle */}
            <div style={{ background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: checkedIn ? "#d1fae5" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                  {checkedIn ? "✅" : "🕐"}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>Today's Status</p>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: checkedIn ? "#059669" : "#dc2626" }}>
                    {checkedIn ? "Checked In" : "Not Checked In"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                    {time.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                onClick={checkedIn ? handleCheckOut : handleCheckIn}
                style={{ padding: "10px 28px", border: "none", borderRadius: 10, background: checkedIn ? "#dc2626" : "#10b981", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {checkedIn ? "Check Out" : "Check In"}
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {[
                { label: "Present Days", value: presentDays, sub: "This Month", color: "#10b981", bg: "#d1fae5", icon: "📅" },
                { label: "Absent Days",  value: absentDays,  sub: "This Month", color: "#f59e0b", bg: "#fef3c7", icon: "⏰" },
                { label: "On Leave",     value: onLeaveDays, sub: "This Month", color: "#8b5cf6", bg: "#ede9fe", icon: "✈️" },
                { label: "Total Working Hours", value: totalWorkingHours, sub: "This Month", color: "#3b82f6", bg: "#dbeafe", icon: "🕐" },
              ].map(({ label, value, sub, color, bg, icon }) => (
                <div key={label} style={{ background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: "4px 0 2px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{value}</p>
                    <p style={{ margin: 0, fontSize: 11, color, fontWeight: 600 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar + right column (Announcements + Profile) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
              {/* Attendance Calendar — compact */}
              <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Attendance Overview (This Month)</h3>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#64748b" }}>
                    {[{c:"#10b981",l:"Present"},{c:"#ef4444",l:"Absent"},{c:"#f59e0b",l:"On Leave"}].map(({c,l}) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", paddingBottom: 6 }}>{d}</div>
                  ))}
                  {calendarDays.map((cell, i) => {
                    if (!cell) return <div key={i} />;
                    const bg = cell.status === "Present" ? "#d1fae5" : cell.status === "Absent" ? "#fee2e2" : cell.status === "On Leave" ? "#fef3c7" : "transparent";
                    const color = cell.status === "Present" ? "#059669" : cell.status === "Absent" ? "#dc2626" : cell.status === "On Leave" ? "#d97706" : "#374151";
                    return (
                      <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: cell.isToday ? 800 : 500, margin: "0 auto", border: cell.isToday ? "2px solid #6366f1" : "none" }}>
                        {cell.day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right column: Announcements then Profile */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Announcements */}
                <div style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700 }}>📢 Announcements</h3>
                  {announcements.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No announcements yet.</p>
                  ) : announcements.slice(0, 3).map((a, i) => (
                    <div key={a.id} style={{ display: "flex", gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < Math.min(announcements.length, 3) - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>📢</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{a.title}</p>
                        <p style={{ margin: "2px 0 2px", fontSize: 11, color: "#64748b" }}>{a.message}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#94a3b8" }}>{a.created_at}</p>
                      </div>
                    </div>
                  ))}
                  {announcements.length > 3 && (
                    <p onClick={() => setActiveNav("Announcements")} style={{ margin: 0, fontSize: 11, color: "#6366f1", fontWeight: 700, cursor: "pointer", textAlign: "right" }}>View all {announcements.length} →</p>
                  )}
                </div>

                {/* Profile card */}
                <div style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#6366f1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
                    {profile.full_name?.[0]?.toUpperCase() || "E"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.full_name || "—"}</p>
                    <p style={{ margin: "2px 0", fontSize: 11, color: "#64748b" }}>@{profile.username || "—"} · <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{profile.role || "employee"}</span></p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.department || "—"}</p>
                  </div>
                  <button onClick={() => setActiveNav("Profile")} style={{ flexShrink: 0, padding: "6px 12px", border: "1.5px solid #6366f1", borderRadius: 8, background: "white", color: "#6366f1", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                </div>
              </div>
            </div>
          </div>
        );

      case "My Attendance":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaClock style={{ marginRight: 8, color: "#3b82f6" }} />My Attendance Summary</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...statusBadgeStyle, marginBottom: 12 }}>
                {checkedIn ? <FaCheckCircle /> : <FaTimesCircle />}
                &nbsp;{checkedIn ? "Checked In" : "Not Checked In"}
              </div>
              <div style={{ ...s.btnRow, maxWidth: 400 }}>
                <button style={{ ...s.btn, background: checkedIn ? "#ef4444" : "#10b981" }} onClick={checkedIn ? handleCheckOut : handleCheckIn}>
                  {checkedIn ? "Check Out" : "Check In"}
                </button>
                <button style={{ ...s.btn, background: onBreak ? "#f59e0b" : "#6366f1" }} onClick={handleBreak}>
                  <FaCoffee style={{ marginRight: 6 }} />{onBreak ? "End Break" : "Start Break"}
                </button>
              </div>
            </div>

            <h4 style={s.sectionHeading}>My Attendance Records</h4>
            {attendance.length === 0 ? (
              <p style={s.empty}>No attendance records yet</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>{["Date", "Check-In", "Check-Out", "Working Hours", "Status", "All Logs"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {attendance.slice((attRecPage-1)*PAGE, attRecPage*PAGE).map((a, i) => {
                      const checkIn = a.check_in ? new Date(`2000-01-01 ${a.check_in}`) : null;
                      const checkOut = a.check_out ? new Date(`2000-01-01 ${a.check_out}`) : null;
                      let workingHours = "-";
                      if (checkIn && checkOut) {
                        const diff = (checkOut - checkIn) / 1000 / 60;
                        const hours = Math.floor(diff / 60);
                        const mins = Math.floor(diff % 60);
                        workingHours = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
                      }
                      const isLate = checkIn && checkIn.getHours() >= 9 && checkIn.getMinutes() > 30;
                      return (
                        <tr key={a.id || i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                          <td style={s.td}>{a.date}</td>
                          <td style={s.td}>
                            {a.check_in ? (
                              <span style={{ color: isLate ? "#f59e0b" : "#10b981", fontWeight: 600 }}>
                                {a.check_in}
                                {isLate && <span style={{ fontSize: 10, marginLeft: 4 }}>(Late)</span>}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={s.td}>{a.check_out || "—"}</td>
                          <td style={s.td}>{workingHours}</td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: a.status === "Present" ? "#d1fae5" : a.status === "On Leave" ? "#ede9fe" : "#fee2e2", color: a.status === "Present" ? "#065f46" : a.status === "On Leave" ? "#6d28d9" : "#991b1b" }}>
                              {a.status}
                            </span>
                          </td>
                          <td style={s.td}><LogTimeline logs={a.logs} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={attRecPage} total={attendance.length} pageSize={PAGE} onChange={setAttRecPage} />
          </div>
        );

      case "Attendance": {
        const PAGE_SIZE = 10;
        const totalPages = Math.max(Math.ceil(txTotal / PAGE_SIZE), 1);
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaClock style={{ marginRight: 8, color: "#3b82f6" }} />Attendance</h3>
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...statusBadgeStyle, marginBottom: 12 }}>
                {checkedIn ? <FaCheckCircle /> : <FaTimesCircle />}
                &nbsp;{checkedIn ? "Checked In" : "Not Checked In"}
              </div>
              <div style={{ ...s.btnRow, maxWidth: 400 }}>
                <button style={{ ...s.btn, background: checkedIn ? "#ef4444" : "#10b981" }} onClick={checkedIn ? handleCheckOut : handleCheckIn}>
                  {checkedIn ? "Check Out" : "Check In"}
                </button>
                <button style={{ ...s.btn, background: onBreak ? "#f59e0b" : "#6366f1" }} onClick={handleBreak}>
                  <FaCoffee style={{ marginRight: 6 }} />{onBreak ? "End Break" : "Start Break"}
                </button>
              </div>
            </div>

            <h4 style={s.sectionHeading}>Attendance Log</h4>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={s.label}>From</label>
                <input type="date" style={{ ...s.input, width: 160 }} value={txDateFrom} onChange={e => setTxDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>To</label>
                <input type="date" style={{ ...s.input, width: 160 }} value={txDateTo} onChange={e => setTxDateTo(e.target.value)} />
              </div>
              <button style={{ ...s.smallBtn, padding: "8px 16px" }} onClick={() => fetchTransactions(1)}>Search</button>
              <button style={{ ...s.smallBtn, background: "#64748b", padding: "8px 16px" }} onClick={() => { setTxDateFrom(''); setTxDateTo(''); fetchTransactions(1, '', ''); }}>Reset</button>
            </div>

            {txRecords.length === 0 ? (
              <p style={s.empty}>No records found. Use date filters and click Search.</p>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{["Date", "First Check In", "Last Check Out", "Status", "All Logs"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {txRecords.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                          <td style={s.td}>{r.date}</td>
                          <td style={s.td}>{r.check_in || "--"}</td>
                          <td style={s.td}>{r.check_out || "--"}</td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: r.status === "Present" ? "#d1fae5" : r.status === "On Leave" ? "#ede9fe" : "#fee2e2", color: r.status === "Present" ? "#065f46" : r.status === "On Leave" ? "#6d28d9" : "#991b1b" }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={s.td}><LogTimeline logs={r.logs} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Showing {(txPage - 1) * PAGE_SIZE + 1}–{Math.min(txPage * PAGE_SIZE, txTotal)} of {txTotal}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...s.smallBtn, background: txPage === 1 ? "#e2e8f0" : "#1e3a8a", color: txPage === 1 ? "#94a3b8" : "white" }} disabled={txPage === 1} onClick={() => fetchTransactions(txPage - 1)}>Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - txPage) <= 1).reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx-1] > 1) acc.push('...'); acc.push(p); return acc; }, []).map((p, i) => (
                      p === '...' ? <span key={i} style={{ padding: "6px 4px", fontSize: 13, color: "#94a3b8" }}>...</span>
                      : <button key={p} style={{ ...s.smallBtn, background: p === txPage ? "#1e3a8a" : "#e2e8f0", color: p === txPage ? "white" : "#0f172a", minWidth: 32 }} onClick={() => fetchTransactions(p)}>{p}</button>
                    ))}
                    <button style={{ ...s.smallBtn, background: txPage === totalPages ? "#e2e8f0" : "#1e3a8a", color: txPage === totalPages ? "#94a3b8" : "white" }} disabled={txPage === totalPages} onClick={() => fetchTransactions(txPage + 1)}>Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      case "Leave & Claim":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaCalendarAlt style={{ marginRight: 8, color: "#f59e0b" }} />Leave & Attendance Claim</h3>

            {/* Balance summary */}
            <div style={{ overflowX: "auto", marginBottom: 24 }}>
              <table style={s.table}>
                <thead>
                  <tr>{["Leave Type", "Entitled", "Used", "Remaining"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {leavePolicyRows.map((b, i) => (
                    <tr key={b.leave_type} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                      <td style={s.td}><span style={{ ...s.badge, background: "#ede9fe", color: "#6d28d9" }}>{b.leave_type_display}</span></td>
                      <td style={s.td}>{b.entitled === 0 ? <span style={{ color: "#94a3b8" }}>Unlimited</span> : b.entitled}</td>
                      <td style={s.td}>{b.used}</td>
                      <td style={s.td}>
                        {b.remaining === null
                          ? <span style={{ color: "#94a3b8" }}>—</span>
                          : <span style={{ fontWeight: 700, color: b.remaining === 0 ? "#ef4444" : b.remaining <= 2 ? "#f59e0b" : "#10b981" }}>{b.remaining}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Apply leave form */}
            <div style={s.leaveFormCard}>
              <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Apply for Leave</h4>
              <div style={{ marginBottom: 12 }}>
                <label style={s.label}>Leave Type</label>
                <select style={s.input} value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}>
                  {leavePolicyRows.map((policy) => {
                    const suffix = policy.remaining !== null ? ` (${policy.remaining} left)` : ' (on request)';
                    return <option key={policy.leave_type} value={policy.leave_type}>{policy.leave_type_display}{suffix}</option>;
                  })}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={s.label}>Start Date</label>
                  <input type="date" style={s.input} value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>End Date</label>
                  <input type="date" style={s.input} value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={s.label}>Reason</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Enter reason for leave" />
              </div>
              {leaveError && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{leaveError}</p>}
              <button style={{ ...s.btn, background: "#f59e0b", marginTop: 14, maxWidth: 200 }} onClick={applyLeave}>Submit Leave</button>
            </div>

            <h4 style={s.sectionHeading}>Leave History</h4>
            {leaves.length === 0
              ? <p style={s.empty}>No leave requests yet</p>
              : (
                <>
                <table style={s.table}>
                  <thead>
                    <tr>{["Type", "Start Date", "End Date", "Days", "Reason", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {leaves.slice((leaveHistPage-1)*PAGE, leaveHistPage*PAGE).map((l, i) => (
                      <tr key={l.id || i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}><span style={{ ...s.badge, background: "#ede9fe", color: "#6d28d9" }}>{l.leave_type_display || l.leave_type}</span></td>
                        <td style={s.td}>{l.start_date}</td>
                        <td style={s.td}>{l.end_date}</td>
                        <td style={s.td}>{l.days}</td>
                        <td style={s.td}>{l.reason}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: l.status === "Approved" ? "#d1fae5" : l.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: l.status === "Approved" ? "#065f46" : l.status === "Rejected" ? "#991b1b" : "#92400e" }}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={leaveHistPage} total={leaves.length} pageSize={PAGE} onChange={setLeaveHistPage} />
                </>
              )}

            {/* Attendance Claim */}
            <h4 style={{ ...s.sectionHeading, marginTop: 32 }}>Attendance Claim</h4>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              If you worked but couldn't check in, submit a claim with your actual work timings.
            </p>
            <div style={s.leaveFormCard}>
              <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Submit Attendance Claim</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={s.label}>Date You Worked *</label>
                  <input type="date" style={s.input} value={claimForm.date} max={new Date().toLocaleDateString('en-CA')} onChange={e => setClaimForm({ ...claimForm, date: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Check-in Time *</label>
                  <input type="time" style={s.input} value={claimForm.check_in_time} onChange={e => setClaimForm({ ...claimForm, check_in_time: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Check-out Time</label>
                  <input type="time" style={s.input} value={claimForm.check_out_time} onChange={e => setClaimForm({ ...claimForm, check_out_time: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={s.label}>Reason *</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} placeholder="Explain why you couldn't check in..." value={claimForm.reason} onChange={e => setClaimForm({ ...claimForm, reason: e.target.value })} />
              </div>
              {claimError && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{claimError}</p>}
              {claimSuccess && <p style={{ color: "#10b981", fontSize: 12, marginTop: 8 }}>{claimSuccess}</p>}
              <button style={{ ...s.btn, background: "#10b981", marginTop: 14, maxWidth: 200 }} onClick={submitClaim}>Submit Claim</button>
            </div>

            <h4 style={s.sectionHeading}>Claim History</h4>
            {claims.length === 0
              ? <p style={s.empty}>No claims submitted yet</p>
              : (
                <>
                <table style={s.table}>
                  <thead>
                    <tr>{["Date", "Check-in", "Check-out", "Reason", "Submitted", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {claims.slice((claimHistPage-1)*PAGE, claimHistPage*PAGE).map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}>{c.date}</td>
                        <td style={s.td}>{c.check_in_time || "—"}</td>
                        <td style={s.td}>{c.check_out_time || "—"}</td>
                        <td style={s.td}>{c.reason}</td>
                        <td style={s.td}>{c.submitted_at}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: c.status === "Approved" ? "#d1fae5" : c.status === "Rejected" ? "#fee2e2" : "#fef3c7", color: c.status === "Approved" ? "#065f46" : c.status === "Rejected" ? "#991b1b" : "#92400e" }}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={claimHistPage} total={claims.length} pageSize={PAGE} onChange={setClaimHistPage} />
                </>
              )}
          </div>
        );

      case "Announcements":
        return <AnnouncementsTab userRole={profile.role} userDepartment={profile.department} />;

      case "Profile":
        return (
          <div style={s.fullCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}><FaUser style={{ marginRight: 8, color: "#1e3a8a" }} />My Profile</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {editProfile && (
                  <button style={{ ...s.smallBtn, background: "#64748b" }} onClick={() => { setEditProfile(false); setProfileError(""); setProfileMsg(""); fetchProfile(); }}>Cancel</button>
                )}
                <button style={{ ...s.smallBtn, display: "flex", alignItems: "center", gap: 6 }} onClick={() => editProfile ? saveProfile() : (setEditProfile(true), setProfileError(""), setProfileMsg(""))}>
                  {editProfile ? <><FaSave style={{ marginRight: 4 }} />Save Changes</> : <><FaEdit style={{ marginRight: 4 }} />Edit Profile</>}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "20px 24px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 }}>
                {profile.full_name?.[0]?.toUpperCase() || "E"}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{profile.full_name || "-"}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>@{profile.username || "-"}</p>
                <span style={{ ...s.badge, background: "#dbeafe", color: "#1d4ed8", marginTop: 6, display: "inline-flex" }}>{profile.role || "employee"}</span>
              </div>
            </div>

            {profileMsg   && <p style={{ color: "#065f46", background: "#d1fae5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{profileMsg}</p>}
            {profileMsg && <p style={{ color: "#065f46", background: "#d1fae5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{profileMsg}</p>}
            {profileError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#fee2e2", borderRadius: 8 }}>{profileError}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { label: "Full Name", key: "full_name", editable: true },
                { label: "Username", key: "username", editable: true },
                { label: "Email", key: "email", editable: true },
                { label: "Phone Number", key: "phone", editable: true },
                { label: "Role", key: "role", editable: false },
              ].map(({ label, key, editable }) => (
                <div key={key}>
                  <label style={s.label}>{label}{key === "username" && editProfile && <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 6 }}>(must be unique)</span>}</label>
                  <input
                    style={{ ...s.input, background: editProfile && editable ? "white" : "#f8fafc", color: "#0f172a" }}
                    value={profile[key] || ""}
                    disabled={!editProfile || !editable}
                    onChange={e => setProfile({ ...profile, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label style={s.label}>Department</label>
                {profile.department ? (
                  <input style={{ ...s.input, background: "#f8fafc", color: "#0f172a" }} value={profile.department} disabled />
                ) : (
                  <select
                    style={{ ...s.input, background: editProfile ? "white" : "#f8fafc" }}
                    value={profile.department || ""}
                    disabled={!editProfile}
                    onChange={e => setProfile({ ...profile, department: e.target.value })}
                  >
                    <option value="">— Select Department —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        );

      case "Transactions": {
        const PAGE_SIZE = 10;
        const totalPages = Math.ceil(txTotal / PAGE_SIZE);
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaList style={{ marginRight: 8, color: "#3b82f6" }} />Attendance Transactions</h3>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={s.label}>From</label>
                <input type="date" style={{ ...s.input, width: 160 }} value={txDateFrom} onChange={e => setTxDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>To</label>
                <input type="date" style={{ ...s.input, width: 160 }} value={txDateTo} onChange={e => setTxDateTo(e.target.value)} />
              </div>
              <button style={{ ...s.smallBtn, height: 36 }} onClick={() => fetchTransactions(1)}>Search</button>
              <button style={{ ...s.smallBtn, background: "#64748b", height: 36 }} onClick={() => { setTxDateFrom(''); setTxDateTo(''); fetchTransactions(1, '', ''); }}>Reset</button>
            </div>

            {txRecords.length === 0 ? (
              <p style={s.empty}>No records found. Click Search to load transactions.</p>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{["Date", "First Check In", "Last Check Out", "Status", "All Logs"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {txRecords.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                          <td style={s.td}>{r.date}</td>
                          <td style={s.td}>{r.check_in || "--"}</td>
                          <td style={s.td}>{r.check_out || "--"}</td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: r.status === "Present" ? "#d1fae5" : r.status === "On Leave" ? "#ede9fe" : "#fee2e2", color: r.status === "Present" ? "#065f46" : r.status === "On Leave" ? "#6d28d9" : "#991b1b" }}>
                              {r.status}
                            </span>
                          </td>
                          <td style={s.td}><LogTimeline logs={r.logs} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Showing {(txPage - 1) * PAGE_SIZE + 1}–{Math.min(txPage * PAGE_SIZE, txTotal)} of {txTotal}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...s.smallBtn, background: txPage === 1 ? "#e2e8f0" : "#1e3a8a", color: txPage === 1 ? "#94a3b8" : "white" }} disabled={txPage === 1} onClick={() => fetchTransactions(txPage - 1)}>Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - txPage) <= 1).reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, []).map((p, i) => (
                      p === '...' ? <span key={i} style={{ padding: "6px 4px", fontSize: 13, color: "#94a3b8" }}>...</span>
                      : <button key={p} style={{ ...s.smallBtn, background: p === txPage ? "#1e3a8a" : "#e2e8f0", color: p === txPage ? "white" : "#0f172a", minWidth: 32 }} onClick={() => fetchTransactions(p)}>{p}</button>
                    ))}
                    <button style={{ ...s.smallBtn, background: txPage === totalPages ? "#e2e8f0" : "#1e3a8a", color: txPage === totalPages ? "#94a3b8" : "white" }} disabled={txPage === totalPages} onClick={() => fetchTransactions(txPage + 1)}>Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      default: return null;
    }
  };

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📋</div>
          <div>
            <div style={s.brandText}>AMS</div>
            <div style={s.brandSub}>Attendance<br />Management System</div>
          </div>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(({ icon, label, badge }) => (
            <div key={label} style={{ ...s.navItem, ...(activeNav === label ? s.navActive : {}) }}
              onClick={() => { setActiveNav(label); if (label === "My Attendance") fetchAttendance(); }}>
              <span style={s.navIcon}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && <span style={{ background: "#6366f1", color: "white", borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>{badge}</span>}
            </div>
          ))}
        </nav>

        <div style={{ ...s.navItem, color: "#f87171" }} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
          <span style={s.navIcon}><FaSignOutAlt /></span>
          <span>Logout</span>
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Welcome back, {profile.full_name || "Employee"}! 👋</h1>
            <p style={s.pageSubtitle}>Here's your attendance overview and recent updates.</p>
          </div>
          <div style={s.headerRight}>
            <NotificationBell />
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default EmployeeDashboard;

const LogTimeline = ({ logs = [] }) => {
  if (!logs.length) return <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {logs.map((log, i) => {
        const isIn = log.action === "check_in";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isIn ? "#10b981" : "#ef4444", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isIn ? "#059669" : "#dc2626", minWidth: 26 }}>{isIn ? "IN" : "OUT"}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{log.time}</span>
          </div>
        );
      })}
    </div>
  );
};

const s = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f1f5f9" },
  sidebar: { width: 220, minWidth: 220, background: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column", padding: "20px 12px", boxSizing: "border-box", overflowY: "auto" },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingLeft: 4 },
  brandText: { color: "white", fontSize: 20, fontWeight: 800, lineHeight: 1 },
  brandSub: { color: "#64748b", fontSize: 10, lineHeight: 1.4 },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#94a3b8" },
  navActive: { background: "#6366f1", color: "white" },
  navIcon: { fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 },
  main: { flex: 1, overflowY: "auto", padding: "24px 28px", background: "#f1f5f9" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" },
  pageSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  clock: { fontSize: 15, fontWeight: 600, color: "#1e3a8a", background: "white", padding: "8px 16px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  fullCard: { background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center" },
  sectionHeading: { margin: "24px 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 },
  btnRow: { display: "flex", gap: 10 },
  btn: { flex: 1, padding: "10px 16px", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  smallBtn: { padding: "6px 14px", border: "none", borderRadius: 6, background: "#6366f1", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  badge: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "2px solid #f1f5f9", textTransform: "uppercase" },
  td: { padding: "12px 14px", color: "#0f172a", borderBottom: "1px solid #f8fafc" },
  leaveFormCard: { background: "#f8fafc", borderRadius: 10, padding: 18, border: "1px solid #e2e8f0", marginBottom: 8 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" },
  empty: { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0" },
  taskRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  taskTitle: { margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#0f172a" },
  taskMeta: { margin: "2px 0 0", fontSize: 12, color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  statCard: { background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 },
  statIcon: { width: 52, height: 52, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  statLabel: { margin: 0, fontSize: 13, color: "#64748b", fontWeight: 500 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
};
