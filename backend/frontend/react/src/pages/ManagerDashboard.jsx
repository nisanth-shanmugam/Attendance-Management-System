import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaHome, FaUsers, FaTasks, FaCalendarAlt, FaSignOutAlt,
  FaChevronRight, FaCheckCircle, FaTimesCircle, FaClock,
  FaPlus, FaBell, FaUserTie, FaEdit, FaSave,
} from "react-icons/fa";

const API = "http://127.0.0.1:8000/api";

const ManagerDashboard = () => {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [time, setTime] = useState(new Date());
  
  // Data states
  const [allAttendance, setAllAttendance] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [claims, setClaims] = useState([]);
  const [profile, setProfile] = useState({ full_name: "", username: "", email: "", phone: "", role: "" });
  const [editProfile, setEditProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  
  // Form states
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_to: "" });
  const [showTaskForm, setShowTaskForm] = useState(false);

  const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

  useEffect(() => {
    fetchAll();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchAllAttendance(attendanceDate),
      fetchLeaves(),
      fetchTasks(),
      fetchProfile(),
      fetchEmployees(),
      fetchClaims(),
    ]);
  };

  const fetchClaims = async () => {
    try {
      const res = await axios.get(`${API}/attendance/claims/all/`, cfg());
      setClaims(res.data);
    } catch { setClaims([]); }
  };

  const handleClaimAction = async (id, action) => {
    try {
      await axios.post(`${API}/attendance/claims/${id}/${action}/`, {}, cfg());
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'Approved' : 'Rejected' } : c));
    } catch {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees/`, cfg());
      setEmployees(res.data);
    } catch { setEmployees([]); }
  };

  const fetchAllAttendance = async (date) => {
    try {
      const res = await axios.get(`${API}/attendance/all/?date=${date}`, cfg());
      setAllAttendance(res.data);
    } catch { setAllAttendance([]); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await axios.get(`${API}/leaves/all/`, cfg());
      setLeaves(res.data);
    } catch { setLeaves([]); }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks/all/`, cfg());
      setTasks(res.data);
    } catch { setTasks([]); }
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

  const handleMarkAbsent = async () => {
    try {
      const res = await axios.post(`${API}/attendance/mark-absent/`, {}, cfg());
      fetchAllAttendance(attendanceDate);
      alert(`Marked ${res.data.count} employee(s) as Absent for today.`);
    } catch { alert('Failed to mark absent.'); }
  };

  const handleLeaveAction = async (id, action) => {
    try {
      await axios.post(`${API}/leaves/${id}/${action}/`, {}, cfg());
      setLeaves(leaves.map(l => l.id === id ? { ...l, status: action === "approve" ? "Approved" : "Rejected" } : l));
    } catch {}
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await axios.post(`${API}/tasks/`, newTask, cfg());
      fetchTasks();
      setNewTask({ title: "", description: "", assigned_to: "" });
      setShowTaskForm(false);
    } catch {}
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
    { icon: <FaUsers />, label: "Employees" },
    { icon: <FaClock />, label: "Attendance" },
    { icon: <FaTasks />, label: "Tasks" },
    { icon: <FaCalendarAlt />, label: "Leave Approvals" },
    { icon: <FaCheckCircle />, label: "Claims" },
    { icon: <FaUserTie />, label: "Profile" },
  ];

  const greeting = time.getHours() < 12 ? "Morning" : time.getHours() < 17 ? "Afternoon" : "Evening";
  const presentToday = allAttendance.filter(a => a.status === 'Present').length;

  const stats = [
    { label: "Total Employees", value: employees.length, color: "#3b82f6", bg: "#dbeafe" },
    { label: "Present Today", value: presentToday, color: "#10b981", bg: "#d1fae5" },
    { label: "Pending Leaves", value: leaves.filter(l => l.status === "Pending").length, color: "#f59e0b", bg: "#fef3c7" },
    { label: "Pending Claims", value: claims.filter(c => c.status === "Pending").length, color: "#10b981", bg: "#d1fae5" },
  ];

  const renderContent = () => {
    switch (activeNav) {
      case "Dashboard":
        return (
          <>
            <div style={s.statsGrid}>
              {stats.map(({ label, value, color, bg }) => (
                <div key={label} style={s.statCard}>
                  <div style={{ ...s.statIcon, background: bg, color }}>{value}</div>
                  <p style={s.statLabel}>{label}</p>
                </div>
              ))}
            </div>
            <div style={s.grid}>
              <div style={s.card}>
                <h3 style={s.cardTitle}><FaClock style={{ marginRight: 8, color: "#3b82f6" }} />Today's Attendance</h3>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  {[
                    { label: "Present", value: presentToday, color: "#10b981", bg: "#d1fae5" },
                    { label: "Absent", value: employees.length - presentToday, color: "#ef4444", bg: "#fee2e2" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ flex: 1, background: bg, padding: "12px 16px", borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color }}>{value}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{label}</p>
                    </div>
                  ))}
                </div>
                <button style={{ ...s.btn, background: "#3b82f6" }} onClick={() => setActiveNav("Attendance")}>View All Attendance</button>
              </div>

              <div style={s.card}>
                <h3 style={s.cardTitle}><FaCalendarAlt style={{ marginRight: 8, color: "#f59e0b" }} />Pending Leaves</h3>
                {leaves.filter(l => l.status === "Pending").length === 0 ? (
                  <p style={s.empty}>No pending leave requests</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {leaves.filter(l => l.status === "Pending").slice(0, 3).map(l => (
                      <div key={l.id} style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{l.employee}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{l.start_date} → {l.end_date}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button style={{ ...s.btn, background: "#f59e0b", marginTop: 12 }} onClick={() => setActiveNav("Leave Approvals")}>Review Requests</button>
              </div>
            </div>
          </>
        );

      case "Employees":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaUsers style={{ marginRight: 8, color: "#3b82f6" }} />All Employees ({employees.length})</h3>
            {employees.length === 0 ? (
              <p style={s.empty}>No employees registered yet</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>{["Name", "Username", "Email", "Phone", "Joined"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={emp.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}>
                          <div style={s.memberCell}>
                            <div style={{ ...s.memberAvatar, background: ["#dbeafe","#d1fae5","#ede9fe","#fef3c7"][i % 4], color: ["#1d4ed8","#065f46","#6d28d9","#92400e"][i % 4] }}>
                              {emp.full_name?.[0]?.toUpperCase() || "E"}
                            </div>
                            {emp.full_name}
                          </div>
                        </td>
                        <td style={s.td}>@{emp.username}</td>
                        <td style={s.td}>{emp.email}</td>
                        <td style={s.td}>{emp.phone || "—"}</td>
                        <td style={s.td}>{emp.date_joined}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "Attendance":
        return (
          <div style={s.fullCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}><FaClock style={{ marginRight: 8, color: "#3b82f6" }} />Attendance Tracking</h3>
              <input type="date" style={s.formInput} value={attendanceDate} onChange={e => { setAttendanceDate(e.target.value); fetchAllAttendance(e.target.value); }} />
            </div>
            {allAttendance.length === 0 ? (
              <p style={s.empty}>No attendance records for this date</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>{["Employee", "Email", "Date", "Check In", "Check Out", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {allAttendance.map((a, i) => (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                        <td style={s.td}>
                          <div style={s.memberCell}>
                            <div style={{ ...s.memberAvatar, background: "#dbeafe", color: "#1d4ed8" }}>
                              {a.employee?.[0]?.toUpperCase() || "E"}
                            </div>
                            {a.employee}
                          </div>
                        </td>
                        <td style={s.td}>{a.email}</td>
                        <td style={s.td}>{a.date}</td>
                        <td style={s.td}>{a.check_in || "—"}</td>
                        <td style={s.td}>{a.check_out || "—"}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: a.status === "Present" ? "#d1fae5" : "#fee2e2", color: a.status === "Present" ? "#065f46" : "#991b1b" }}>
                            {a.status === "Present" ? <><FaCheckCircle style={{ marginRight: 4 }} />Present</> : <><FaTimesCircle style={{ marginRight: 4 }} />Absent</>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "Tasks":
        return (
          <div style={s.fullCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}><FaTasks style={{ marginRight: 8, color: "#8b5cf6" }} />Task Management</h3>
              <button style={s.addBtn} onClick={() => setShowTaskForm(!showTaskForm)}>
                <FaPlus style={{ marginRight: 6 }} />Assign Task
              </button>
            </div>

            {showTaskForm && (
              <div style={s.taskForm}>
                <input style={s.formInput} placeholder="Task title *" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                <textarea style={{ ...s.formInput, minHeight: 60, resize: "vertical" }} placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                <input style={s.formInput} placeholder="Assign to (employee email)" value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...s.btn, background: "#1e3a8a", flex: 1 }} onClick={handleCreateTask}>Create Task</button>
                  <button style={{ ...s.btn, background: "#64748b", flex: 1 }} onClick={() => setShowTaskForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {tasks.length === 0 ? (
              <p style={s.empty}>No tasks assigned yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tasks.map(t => (
                  <div key={t.id} style={s.taskCard}>
                    <div style={{ flex: 1 }}>
                      <p style={s.taskTitle}>{t.title}</p>
                      <p style={s.taskMeta}>{t.description || ""}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={s.taskMeta}><FaUsers style={{ marginRight: 3 }} />{t.employee}</span>
                        <span style={s.taskMeta}>Created: {t.created_at}</span>
                      </div>
                    </div>
                    <span style={{ ...s.badge, background: t.status === "Completed" ? "#d1fae5" : t.status === "In Progress" ? "#dbeafe" : "#fef3c7", color: t.status === "Completed" ? "#065f46" : t.status === "In Progress" ? "#1d4ed8" : "#92400e" }}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Leave Approvals":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaCalendarAlt style={{ marginRight: 8, color: "#f59e0b" }} />Leave Approvals</h3>
            {leaves.length === 0 ? (
              <p style={s.empty}>No leave requests</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {leaves.map(leave => (
                  <div key={leave.id} style={s.leaveCard}>
                    <div style={{ flex: 1 }}>
                      <p style={s.leaveName}>{leave.employee}</p>
                      <p style={s.leaveDate}>{leave.start_date} → {leave.end_date}</p>
                      <p style={s.leaveReason}>{leave.reason}</p>
                    </div>
                    {leave.status === "Pending" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button style={{ ...s.actionBtn, background: "#10b981" }} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
                        <button style={{ ...s.actionBtn, background: "#ef4444" }} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
                      </div>
                    ) : (
                      <span style={{ ...s.badge, background: leave.status === "Approved" ? "#d1fae5" : "#fee2e2", color: leave.status === "Approved" ? "#065f46" : "#991b1b" }}>
                        {leave.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Claims":
        return (
          <div style={s.fullCard}>
            <h3 style={s.cardTitle}><FaCheckCircle style={{ marginRight: 8, color: "#10b981" }} />Attendance Claims ({claims.filter(c => c.status === 'Pending').length} Pending)</h3>
            {claims.length === 0 ? (
              <p style={s.empty}>No attendance claims submitted</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {claims.map(c => (
                  <div key={c.id} style={s.leaveCard}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <div style={{ ...s.memberAvatar, background: "#dbeafe", color: "#1d4ed8" }}>
                          {c.employee?.[0]?.toUpperCase() || "E"}
                        </div>
                        <p style={s.leaveName}>{c.employee}</p>
                      </div>
                      <p style={s.leaveDate}>Claimed Date: <strong>{c.date}</strong> &nbsp;|&nbsp; Check-in: <strong>{c.check_in_time || '—'}</strong> &nbsp;|&nbsp; Check-out: <strong>{c.check_out_time || '—'}</strong></p>
                      <p style={s.leaveDate}>Submitted: {c.submitted_at}</p>
                      <p style={s.leaveReason}>{c.reason}</p>
                    </div>
                    {c.status === "Pending" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button style={{ ...s.actionBtn, background: "#10b981" }} onClick={() => handleClaimAction(c.id, "approve")}>Approve</button>
                        <button style={{ ...s.actionBtn, background: "#ef4444" }} onClick={() => handleClaimAction(c.id, "reject")}>Reject</button>
                      </div>
                    ) : (
                      <span style={{ ...s.badge, background: c.status === "Approved" ? "#d1fae5" : "#fee2e2", color: c.status === "Approved" ? "#065f46" : "#991b1b" }}>
                        {c.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "Profile":
        return (
          <div style={s.fullCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}><FaUserTie style={{ marginRight: 8, color: "#1e3a8a" }} />My Profile</h3>
              <button style={{ ...s.smallBtn, display: "flex", alignItems: "center", gap: 6 }} onClick={() => editProfile ? saveProfile() : (setEditProfile(true), setProfileError(""))}>
                {editProfile ? <><FaSave style={{ marginRight: 4 }} />Save Changes</> : <><FaEdit style={{ marginRight: 4 }} />Edit Profile</>}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, padding: "20px 24px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 }}>
                {profile.full_name?.[0]?.toUpperCase() || "M"}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{profile.full_name || "—"}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>@{profile.username || "—"}</p>
                <span style={{ ...s.badge, background: "#dbeafe", color: "#1d4ed8", marginTop: 6, display: "inline-flex" }}>{profile.role || "manager"}</span>
              </div>
            </div>

            {profileError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#fee2e2", borderRadius: 8 }}>{profileError}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
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
          <span style={s.brandSub}>Manager Portal</span>
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
            <h1 style={s.pageTitle}>Good {greeting}, {profile.full_name?.split(" ")[0] || "Manager"} 👋</h1>
            <p style={s.pageSubtitle}>{time.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div style={s.headerRight}>
            <div style={s.clock}>{time.toLocaleTimeString()}</div>
            <div style={s.avatar}>{(profile.full_name?.[0] || "M").toUpperCase()}</div>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default ManagerDashboard;

const s = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f8fafc" },
  sidebar: { width: 240, minWidth: 240, background: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column", padding: "24px 16px", gap: 4, overflowY: "auto" },
  brand: { display: "flex", flexDirection: "column", marginBottom: 32, paddingLeft: 8 },
  brandText: { fontSize: 24, fontWeight: 800, color: "white", letterSpacing: -1 },
  brandSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  navItem: { display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.15s" },
  navActive: { background: "#1e3a8a", color: "white" },
  navIcon: { fontSize: 15, width: 18, textAlign: "center" },
  main: { flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f1f5f9" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" },
  pageSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#64748b" },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  clock: { fontSize: 15, fontWeight: 600, color: "#1e3a8a", background: "white", padding: "8px 16px", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "#1e3a8a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 },
  statCard: { background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 },
  statIcon: { width: 52, height: 52, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  statLabel: { margin: 0, fontSize: 13, color: "#64748b", fontWeight: 500 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 },
  card: { background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  fullCard: { background: "white", borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  cardTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "2px solid #f1f5f9", textTransform: "uppercase", whiteSpace: "nowrap" },
  td: { padding: "12px 14px", color: "#0f172a", borderBottom: "1px solid #f8fafc" },
  memberCell: { display: "flex", alignItems: "center", gap: 10, fontWeight: 600 },
  memberAvatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 },
  badge: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  leaveCard: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", flexWrap: "wrap" },
  leaveName: { margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a" },
  leaveDate: { margin: "3px 0", fontSize: 12, color: "#64748b" },
  leaveReason: { margin: 0, fontSize: 12, color: "#94a3b8" },
  actionBtn: { padding: "6px 14px", border: "none", borderRadius: 6, color: "white", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  addBtn: { display: "flex", alignItems: "center", padding: "7px 14px", background: "#1e3a8a", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  taskForm: { background: "#f8fafc", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10, border: "1px solid #e2e8f0" },
  formInput: { padding: "9px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  taskCard: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", flexWrap: "wrap" },
  taskTitle: { margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#0f172a" },
  taskMeta: { margin: "2px 0 0", fontSize: 12, color: "#64748b", display: "inline-flex", alignItems: "center" },
  btn: { width: "100%", padding: "10px 16px", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  smallBtn: { padding: "6px 14px", border: "none", borderRadius: 6, background: "#1e3a8a", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" },
  empty: { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0" },
};
