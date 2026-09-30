import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaHome, FaClock, FaTasks, FaCalendarAlt, FaUser, FaSignOutAlt,
  FaCheckCircle, FaTimesCircle, FaCoffee, FaChevronRight, FaEdit, FaSave,
} from "react-icons/fa";

const API = "http://127.0.0.1:8000/api";

const EmployeeDashboard = () => {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [time, setTime] = useState(new Date());

  // attendance
  const [checkedIn, setCheckedIn] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [attendance, setAttendance] = useState([]);

  // tasks
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [taskError, setTaskError] = useState("");

  // leaves
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", reason: "" });

  // stats from backend
  const [presentDays, setPresentDays] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [leavesLeft, setLeavesLeft] = useState(12);

  // claims
  const [claims, setClaims] = useState([]);
  const [claimForm, setClaimForm] = useState({ date: "", check_in_time: "", check_out_time: "", reason: "" });
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  // profile
  const [profile, setProfile] = useState({ full_name: "", username: "", email: "", phone: "", role: "" });
  const [editProfile, setEditProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

  useEffect(() => {
    fetchAll();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchAttendance(), fetchTasks(), fetchLeaves(), fetchProfile(), fetchStats(), fetchClaims()]);
  };

  const fetchClaims = async () => {
    try {
      const res = await axios.get(`${API}/attendance/claim/`, cfg());
      setClaims(res.data);
    } catch { setClaims([]); }
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
      fetchClaims();
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
      const res = await axios.post(`${API}/tasks/`, newTask, cfg());
      setTasks(prev => [res.data, ...prev]);
      setNewTask({ title: "", description: "" });
      setShowTaskForm(false);
      setTaskError("");
      fetchStats();
    } catch { setTaskError("Failed to add task. Try again."); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${API}/leaves/`, cfg());
      setLeaves(res.data);
    } catch { setLeaves([]); }
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
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      fetchStats();
    } catch { setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t)); }
  };

  const applyLeave = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) return;
    try {
      const res = await axios.post(`${API}/leave/apply/`, leaveForm, cfg());
      setLeaves(prev => [{ ...leaveForm, status: "Pending", id: res.data.id || Date.now() }, ...prev]);
      setLeaveForm({ start_date: "", end_date: "", reason: "" });
      fetchStats();
    } catch {
      setLeaves(prev => [{ ...leaveForm, status: "Pending", id: Date.now() }, ...prev]);
      setLeaveForm({ start_date: "", end_date: "", reason: "" });
    }
  };

  const saveProfile = async () => {
    setProfileError("");
    try {
      const res = await axios.put(`${API}/profile/`, profile, cfg());
      localStorage.setItem("full_name", res.data.full_name || profile.full_name);
      localStorage.setItem("email", res.data.email || profile.email);
      localStorage.setItem("phone", res.data.phone || profile.phone);
      localStorage.setItem("username", res.data.username || profile.username);
      setProfile(prev => ({ ...prev, ...res.data }));
      setEditProfile(false);
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to save profile.");
    }
  };

  const navItems = [
    { icon: <FaHome />, label: "Dashboard" },
    { icon: <FaClock />, label: "Attendance" },
    { icon: <FaTasks />, label: "Tasks" },
    { icon: <FaCalendarAlt />, label: "Leave" },
    { icon: <FaCheckCircle />, label: "Claim" },
    { icon: <FaUser />, label: "Profile" },
  ];

  const statCards = [
    { label: "Present Days", value: presentDays, color: "#10b981", bg: "#d1fae5" },
    { label: "Tasks Done", value: tasksDone, color: "#3b82f6", bg: "#dbeafe" },
    { label: "Leaves Left", value: leavesLeft, color: "#f59e0b", bg: "#fef3c7" },
    { label: "Status", value: checkedIn ? "Active" : "Idle", color: "#8b5cf6", bg: "#ede9fe" },
  ];

  const statusBadgeStyle = {
    ...s.statusBadge,
    background: checkedIn ? "#d1fae5" : "#fee2e2",
    color: checkedIn ? "#065f46" : "#991b1b",
  };

  const renderContent = () => {
    switch (activeNav) {

      case "Dashboard":
        return (
          <>
            <div style={s.statsGrid}>
              {statCards.map(({ label, value, color, bg }) => (
                <div key={label} style={s.statCard}>
                  <div style={{ ...s.statIcon, background: bg, color }}>{value}</div>
                  <p style={s.statLabel}>{label}</p>
                </div>
              ))}
            </div>
            <div style={s.grid}>
              <div style={s.card}>
                <h3 style={s.cardTitle}><FaClock style={{ marginRight: 8, color: "#3b82f6" }} />Today's Attendance</h3>
                <div style={{ marginBottom: 16 }}>
                  <div style={statusBadgeStyle}>
                    {checkedIn ? <FaCheckCircle /> : <FaTimesCircle />}
                    &nbsp;{checkedIn ? "Checked In" : "Not Checked In"}
                  </div>
                </div>
                <div style={s.btnRow}>
                  <button style={{ ...s.btn, background: checkedIn ? "#ef4444" : "#10b981" }} onClick={checkedIn ? handleCheckOut : handleCheckIn}>
                    {checkedIn ? "Check Out" : "Check In"}
                  </button>
                  <button style={{ ...s.btn, background: onBreak ? "#f59e0b" : "#6366f1" }} onClick={handleBreak}>
                    <FaCoffee style={{ marginRight: 6 }} />{onBreak ? "End Break" : "Start Break"}
                  </button>
                </div>
              </div>

              <div style={s.card}>
                <h3 style={s.cardTitle}><FaTasks style={{ marginRight: 8, color: "#8b5cf6" }} />Recent Tasks</h3>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {tasks.length === 0
                    ? <p style={s.empty}>No tasks assigned</p>
                    : tasks.slice(0, 5).map(t => (
                      <div key={t.id} style={s.taskRow}>
                        <div>
                          <p style={s.taskTitle}>{t.title}</p>
                          <span style={{ ...s.badge, background: t.status === "Completed" ? "#d1fae5" : t.status === "In Progress" ? "#dbeafe" : "#fef3c7", color: t.status === "Completed" ? "#065f46" : t.status === "In Progress" ? "#1d4ed8" : "#92400e" }}>
                            {t.status}
                          </span>
                        </div>
                        {t.status !== "Completed" && (
                          <button style={s.smallBtn} onClick={() => updateTask(t.id, "Completed")}>Done</button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        );

      case "Attendance":
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
            <h4 style={s.sectionHeading}>Attendance History</h4>
            {attendance.length === 0
              ? <p style={s.empty}>No attendance records yet</p>
              : (
                <table style={s.table}>
                  <thead>
                    <tr>{["Date", "Check In", "Check Out", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, i) => (
                      <tr key={a.id || i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}>{a.date}</td>
                        <td style={s.td}>{a.check_in || "—"}</td>
                        <td style={s.td}>{a.check_out || "—"}</td>
                        <td style={s.td}><span style={{ ...s.badge, background: "#d1fae5", color: "#065f46" }}>{a.status || "Present"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        );

      case "Tasks":
        return (
          <div style={s.fullCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}><FaTasks style={{ marginRight: 8, color: "#8b5cf6" }} />My Tasks</h3>
              <button style={s.addBtn} onClick={() => { setShowTaskForm(p => !p); setTaskError(""); }}>+ Add Task</button>
            </div>

            {showTaskForm && (
              <div style={s.taskFormCard}>
                <div>
                  <label style={s.label}>Task Title *</label>
                  <input style={s.input} placeholder="Enter task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={s.label}>Description</label>
                  <textarea style={{ ...s.input, minHeight: 60, resize: "vertical" }} placeholder="Optional description" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                </div>
                {taskError && <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{taskError}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...s.btn, background: "#1e3a8a", maxWidth: 120 }} onClick={addTask}>Add Task</button>
                  <button style={{ ...s.btn, background: "#64748b", maxWidth: 100 }} onClick={() => { setShowTaskForm(false); setTaskError(""); }}>Cancel</button>
                </div>
              </div>
            )}

            {tasks.length === 0
              ? <p style={s.empty}>No tasks yet. Add your first task above.</p>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tasks.map(t => (
                    <div key={t.id} style={s.taskCard}>
                      <div style={{ flex: 1 }}>
                        <p style={s.taskTitle}>{t.title}</p>
                        <p style={s.taskMeta}>{t.description || ""}</p>
                        <p style={s.taskMeta}>Assigned: {t.created_at || "—"}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ ...s.badge, background: t.status === "Completed" ? "#d1fae5" : t.status === "In Progress" ? "#dbeafe" : "#fef3c7", color: t.status === "Completed" ? "#065f46" : t.status === "In Progress" ? "#1d4ed8" : "#92400e" }}>
                          {t.status}
                        </span>
                        {t.status !== "Completed" && (
                          <button style={s.smallBtn} onClick={() => updateTask(t.id, t.status === "Pending" ? "In Progress" : "Completed")}>
                            {t.status === "Pending" ? "Start" : "Complete"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        );

      case "Leave":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaCalendarAlt style={{ marginRight: 8, color: "#f59e0b" }} />Leave Management</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Leaves Left", value: leavesLeft, color: "#f59e0b", bg: "#fef3c7" },
                { label: "Approved", value: 12 - leavesLeft, color: "#10b981", bg: "#d1fae5" },
                { label: "Pending", value: leaves.filter(l => l.status === "Pending").length, color: "#6366f1", bg: "#ede9fe" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ ...s.statCard, padding: "16px 20px" }}>
                  <div style={{ ...s.statIcon, background: bg, color }}>{value}</div>
                  <p style={s.statLabel}>{label}</p>
                </div>
              ))}
            </div>

            <div style={s.leaveFormCard}>
              <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Apply for Leave</h4>
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
              <button style={{ ...s.btn, background: "#f59e0b", marginTop: 14, maxWidth: 200 }} onClick={applyLeave}>
                Submit Request
              </button>
            </div>

            <h4 style={s.sectionHeading}>Leave History</h4>
            {leaves.length === 0
              ? <p style={s.empty}>No leave requests yet</p>
              : (
                <table style={s.table}>
                  <thead>
                    <tr>{["Start Date", "End Date", "Reason", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {leaves.map((l, i) => (
                      <tr key={l.id || i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}>{l.start_date}</td>
                        <td style={s.td}>{l.end_date}</td>
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
              )}
          </div>
        );

      case "Claim":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaCheckCircle style={{ marginRight: 8, color: "#10b981" }} />Attendance Claim</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              If you worked but couldn't check in (system issue, forgot, late arrival), submit a claim with your actual work timings. The manager will review and update your attendance.
            </p>

            <div style={s.leaveFormCard}>
              <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Submit Attendance Claim</h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={s.label}>Date You Worked *</label>
                  <input
                    type="date"
                    style={s.input}
                    value={claimForm.date}
                    max={new Date().toLocaleDateString('en-CA')}
                    onChange={e => setClaimForm({ ...claimForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Check-in Time *</label>
                  <input
                    type="time"
                    style={s.input}
                    value={claimForm.check_in_time}
                    onChange={e => setClaimForm({ ...claimForm, check_in_time: e.target.value })}
                  />
                </div>
                <div>
                  <label style={s.label}>Check-out Time</label>
                  <input
                    type="time"
                    style={s.input}
                    value={claimForm.check_out_time}
                    onChange={e => setClaimForm({ ...claimForm, check_out_time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={s.label}>Reason for Missing Check-in *</label>
                <textarea
                  style={{ ...s.input, minHeight: 80, resize: "vertical" }}
                  placeholder="Explain why you couldn't check in (e.g. system issue, forgot, no internet, late arrival...)"
                  value={claimForm.reason}
                  onChange={e => setClaimForm({ ...claimForm, reason: e.target.value })}
                />
              </div>

              {claimError && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{claimError}</p>}
              {claimSuccess && <p style={{ color: "#10b981", fontSize: 12, marginTop: 8 }}>{claimSuccess}</p>}

              <button style={{ ...s.btn, background: "#10b981", marginTop: 14, maxWidth: 200 }} onClick={submitClaim}>
                Submit Claim
              </button>
            </div>

            <h4 style={s.sectionHeading}>My Claim History</h4>
            {claims.length === 0
              ? <p style={s.empty}>No claims submitted yet</p>
              : (
                <table style={s.table}>
                  <thead>
                    <tr>{["Date", "Check-in", "Check-out", "Reason", "Submitted", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {claims.map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}>{c.date}</td>
                        <td style={s.td}>{c.check_in_time || "—"}</td>
                        <td style={s.td}>{c.check_out_time || "—"}</td>
                        <td style={s.td}>{c.reason}</td>
                        <td style={s.td}>{c.submitted_at}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge,
                            background: c.status === "Approved" ? "#d1fae5" : c.status === "Rejected" ? "#fee2e2" : "#fef3c7",
                            color: c.status === "Approved" ? "#065f46" : c.status === "Rejected" ? "#991b1b" : "#92400e"
                          }}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        );

      case "Profile":
        return (
          <div style={s.fullCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}><FaUser style={{ marginRight: 8, color: "#1e3a8a" }} />My Profile</h3>
              <button style={{ ...s.smallBtn, display: "flex", alignItems: "center", gap: 6 }} onClick={() => editProfile ? saveProfile() : (setEditProfile(true), setProfileError(""))}>
                {editProfile ? <><FaSave style={{ marginRight: 4 }} />Save Changes</> : <><FaEdit style={{ marginRight: 4 }} />Edit Profile</>}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "20px 24px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 }}>
                {profile.full_name?.[0]?.toUpperCase() || "E"}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{profile.full_name || "—"}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>@{profile.username || "—"}</p>
                <span style={{ ...s.badge, background: "#dbeafe", color: "#1d4ed8", marginTop: 6, display: "inline-flex" }}>{profile.role || "employee"}</span>
              </div>
            </div>

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
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <span style={s.brandText}>AMS</span>
          <span style={s.brandSub}>Employee Portal</span>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(({ icon, label }) => (
            <div key={label} style={{ ...s.navItem, ...(activeNav === label ? s.navActive : {}) }} onClick={() => setActiveNav(label)}>
              <span style={s.navIcon}>{icon}</span>
              {label}
              {activeNav === label && <FaChevronRight style={{ marginLeft: "auto", fontSize: 11 }} />}
            </div>
          ))}
        </nav>
        <div style={{ ...s.navItem, marginTop: "auto", color: "#f87171" }} onClick={() => { localStorage.clear(); window.location.href = "/"; }}>
          <span style={s.navIcon}><FaSignOutAlt /></span>Logout
        </div>
      </aside>

      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Good {time.getHours() < 12 ? "Morning" : time.getHours() < 17 ? "Afternoon" : "Evening"}, {profile.full_name?.split(" ")[0] || "Employee"} 👋</h1>
            <p style={s.pageSubtitle}>{time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div style={s.headerRight}>
            <div style={s.clock}>{time.toLocaleTimeString()}</div>
            <div style={s.avatar}>{(profile.full_name?.[0] || "E").toUpperCase()}</div>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default EmployeeDashboard;

const s = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f8fafc" },
  sidebar: { width: 240, background: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column", padding: "24px 16px", gap: 4 },
  brand: { display: "flex", flexDirection: "column", marginBottom: 32, paddingLeft: 8 },
  brandText: { fontSize: 24, fontWeight: 800, color: "white", letterSpacing: -1 },
  brandSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500 },
  navActive: { background: "#1e3a8a", color: "white" },
  navIcon: { fontSize: 15, width: 18, textAlign: "center" },
  main: { flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f1f5f9" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" },
  pageSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  clock: { fontSize: 15, fontWeight: 600, color: "#1e3a8a", background: "white", padding: "8px 16px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 },
  statIcon: { width: 52, height: 52, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  statLabel: { margin: 0, fontSize: 13, color: "#64748b", fontWeight: 500 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  fullCard: { background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center" },
  sectionHeading: { margin: "24px 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 },
  btnRow: { display: "flex", gap: 10 },
  btn: { flex: 1, padding: "10px 16px", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  smallBtn: { padding: "6px 14px", border: "none", borderRadius: 6, background: "#1e3a8a", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  taskRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  addBtn: { padding: "7px 16px", background: "#1e3a8a", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  taskFormCard: { background: "#f8fafc", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0", marginBottom: 16 },
  taskCard: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" },
  taskTitle: { margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#0f172a" },
  taskMeta: { margin: "2px 0 0", fontSize: 12, color: "#64748b" },
  badge: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "2px solid #f1f5f9", textTransform: "uppercase" },
  td: { padding: "12px 14px", color: "#0f172a", borderBottom: "1px solid #f8fafc" },
  leaveFormCard: { background: "#f8fafc", borderRadius: 10, padding: 18, border: "1px solid #e2e8f0", marginBottom: 8 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" },
  empty: { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0" },
};
