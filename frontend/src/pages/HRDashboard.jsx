import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import axios from "axios";
import {
  FaCalendarAlt,
  FaChartBar,
  FaChevronRight,
  FaCog,
  FaEdit,
  FaHome,
  FaPlus,
  FaSave,
  FaSignOutAlt,
  FaTimes,
  FaTrash,
  FaUsers,
  FaBell,
} from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";
import AnnouncementsTab from "../components/AnnouncementsTab";
import Pagination from "../components/Pagination";

const API = "http://127.0.0.1:8000/api";
const today = () => new Date().toLocaleDateString("en-CA");

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

const blankUser = {
  full_name: "",
  username: "",
  email: "",
  phone: "",
  role: "employee",
  department: "",
  password: "",
};

const HRDashboard = () => {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [profile, setProfile] = useState({ full_name: "", username: "", email: "", phone: "", role: "", department: "" });
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceLogTotal, setAttendanceLogTotal] = useState(0);
  const [leaves, setLeaves] = useState([]);
  const [claims, setClaims] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myLeaveBalances, setMyLeaveBalances] = useState([]);
  const [myLeavePolicies, setMyLeavePolicies] = useState([]);
  const [myLeaveForm, setMyLeaveForm] = useState({ leave_type: 'CL', start_date: '', end_date: '', reason: '' });
  const [myLeaveError, setMyLeaveError] = useState('');
  const [myClaims, setMyClaims] = useState([]);
  const [myClaimForm, setMyClaimForm] = useState({ date: '', check_in_time: '', check_out_time: '', reason: '' });
  const [myClaimError, setMyClaimError] = useState('');
  const [myClaimSuccess, setMyClaimSuccess] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userForm, setUserForm] = useState(blankUser);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const showProfileMsg = (t) => { setProfileMsg(t); setTimeout(() => setProfileMsg(""), 3000); };
  const [checkedIn, setCheckedIn] = useState(false);

  // pagination
  const [empPage, setEmpPage]           = useState(1);
  const [attPage, setAttPage]           = useState(1);
  const [claimPage, setClaimPage]       = useState(1);
  const [leavePendPage, setLeavePendPage] = useState(1);
  const [leaveAllPage, setLeaveAllPage] = useState(1);
  const [myLeaveHistPage, setMyLeaveHistPage] = useState(1);
  const [myClaimHistPage, setMyClaimHistPage] = useState(1);
  const PAGE = 10;

  const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

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

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchEmployees(), fetchAttendance(attendanceDate), fetchLeaves(), fetchClaims(), fetchMyLeaves(), fetchMyLeaveBalances(), fetchMyLeavePolicies(), fetchMyClaims()]);
    setLoading(false);
  }

  async function fetchProfile() {
    try {
      const res = await axios.get(`${API}/profile/`, cfg());
      setProfile(res.data);
    } catch {
      setProfile({
        full_name: localStorage.getItem("full_name") || "HR User",
        username: localStorage.getItem("username") || "-",
        email: localStorage.getItem("email") || "-",
        phone: localStorage.getItem("phone") || "-",
        role: localStorage.getItem("role") || "hr",
        department: "",
      });
    }
  }

  async function fetchEmployees() {
    try {
      const res = await axios.get(`${API}/employees/`, cfg());
      setEmployees(res.data || []);
    } catch {
      setEmployees([]);
    }
  }

  async function fetchAttendance(date) {
    try {
      const res = await axios.get(`${API}/attendance/logs/all/?date_from=${date}&date_to=${date}&page=${attPage}`, cfg());
      setAttendance(res.data?.results || []);
      setAttendanceLogTotal(res.data?.total || 0);
    } catch {
      setAttendance([]);
      setAttendanceLogTotal(0);
    }
  }

  async function fetchLeaves() {
    try {
      const res = await axios.get(`${API}/leaves/all/`, cfg());
      setLeaves(res.data || []);
    } catch {
      setLeaves([]);
    }
  }

  async function fetchClaims() {
    try {
      const res = await axios.get(`${API}/attendance/claims/all/`, cfg());
      setClaims(res.data || []);
    } catch {
      setClaims([]);
    }
  }

  async function fetchMyLeaves() {
    try {
      const res = await axios.get(`${API}/leaves/`, cfg());
      setMyLeaves(res.data || []);
    } catch { setMyLeaves([]); }
  }

  async function fetchMyLeaveBalances() {
    try {
      const res = await axios.get(`${API}/leaves/balances/`, cfg());
      setMyLeaveBalances(res.data || []);
    } catch { setMyLeaveBalances([]); }
  }

  async function fetchMyLeavePolicies() {
    try {
      const res = await axios.get(`${API}/leaves/policy/`, cfg());
      setMyLeavePolicies(res.data || []);
    } catch { setMyLeavePolicies([]); }
  }

  async function fetchMyClaims() {
    try {
      const res = await axios.get(`${API}/attendance/claim/`, cfg());
      setMyClaims(res.data || []);
    } catch { setMyClaims([]); }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchAll, 0);

    const token = localStorage.getItem("token");
    if (!token) {
      return () => window.clearTimeout(initialLoad);
    }

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/?token=${token}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "refresh") {
        const r = data.resource;
        if (r === "attendance") { fetchAttendance(attendanceDate); fetchClaims(); }
        else if (r === "leaves") fetchLeaves();
        else if (r === "users") fetchEmployees();
        else if (r === "claims") fetchClaims();
        else fetchAll();
      }
    };
    ws.onerror = () => {
      showMessage("Live notifications are unavailable.");
    };
    return () => {
      window.clearTimeout(initialLoad);
      ws.close();
    };
  }, []);

  useEffect(() => { setAttPage(1); setClaimPage(1); }, [attendanceDate]);

  useEffect(() => { fetchAttendance(attendanceDate); }, [attendanceDate, attPage]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  };

  const startCreateUser = () => {
    setEditingUser(null);
    setUserForm(blankUser);
    setShowUserForm(true);
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setUserForm({ ...blankUser, ...user, password: "" });
    setShowUserForm(true);
  };

  const saveUser = async () => {
    if (!userForm.full_name.trim() || !userForm.username.trim() || !userForm.email.trim()) {
      showMessage("Name, username, and email are required.");
      return;
    }
    if (!editingUser && !userForm.password.trim()) {
      showMessage("Password is required for new users.");
      return;
    }

    const payload = { ...userForm };
    if (editingUser && !payload.password) delete payload.password;

    try {
      if (editingUser) {
        await axios.put(`${API}/users/${editingUser.id}/`, payload, cfg());
        showMessage("User updated.");
      } else {
        await axios.post(`${API}/users/create/`, payload, cfg());
        showMessage("User created.");
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm(blankUser);
      fetchEmployees();
    } catch (err) {
      showMessage(err.response?.data?.error || "Unable to save user.");
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.full_name}?`)) return;
    try {
      await axios.delete(`${API}/users/${user.id}/`, cfg());
      showMessage("User deleted.");
      fetchEmployees();
    } catch (err) {
      showMessage(err.response?.data?.error || "Unable to delete user.");
    }
  };

  const handleLeaveAction = async (id, action) => {
    try {
      await axios.post(`${API}/leaves/${id}/${action}/`, {}, cfg());
      showMessage(`Leave ${action === "approve" ? "approved" : "rejected"}.`);
      fetchAll();
    } catch {
      showMessage("Unable to update leave request.");
    }
  };

  const handleClaimAction = async (id, action) => {
    try {
      await axios.post(`${API}/attendance/claims/${id}/${action}/`, {}, cfg());
      showMessage(`Claim ${action === "approve" ? "approved" : "rejected"}.`);
      fetchAll();
    } catch {
      showMessage("Unable to update attendance claim.");
    }
  };

  const markAbsent = async () => {
    try {
      const res = await axios.post(`${API}/attendance/mark-absent/`, {}, cfg());
      showMessage(`Marked ${res.data.count} employee(s) absent.`);
      fetchAttendance(attendanceDate);
    } catch {
      showMessage("Unable to mark absent.");
    }
  };

  const saveProfile = async () => {
    setProfileError("");
    try {
      const res = await axios.put(`${API}/profile/`, profile, cfg());
      const updated = { ...profile, ...res.data };
      setProfile(updated);
      localStorage.setItem("full_name",  updated.full_name  || "-");
      localStorage.setItem("email",      updated.email      || "-");
      localStorage.setItem("phone",      updated.phone      || "-");
      localStorage.setItem("username",   updated.username   || "-");
      localStorage.setItem("department", updated.department || "-");
      setEditProfile(false);
      setProfileMsg("Profile saved successfully.");
      setTimeout(() => setProfileMsg(""), 3000);
      showMessage("Profile saved.");
    } catch (err) {
      setProfileError(err.response?.data?.error || "Unable to save profile.");
    }
  };

  const isLate = (checkIn) => {
    if (!checkIn) return false;
    const [hour, minute] = checkIn.split(":").map(Number);
    return hour > 9 || (hour === 9 && minute > 30);
  };

  const summary = useMemo(() => {
    const present = attendance.filter((a) => a.status === "Present").length;
    const absent = attendance.filter((a) => a.status === "Absent").length;
    const onLeave = attendance.filter((a) => a.status === "On Leave").length;
    const late = attendance.filter((a) => isLate(a.check_in)).length;
    const pendingLeaves = leaves.filter((l) => l.status === "Pending").length;
    const pendingClaims = claims.filter((c) => c.status === "Pending").length;
    const selectedDate = new Date(attendanceDate).getTime();
    const newHires = employees.filter((e) => {
      const joined = new Date(e.date_joined);
      const diffDays = (selectedDate - joined.getTime()) / 86400000;
      return diffDays <= 30;
    }).length;

    return { present, absent, onLeave, late, pendingLeaves, pendingClaims, newHires };
  }, [attendance, attendanceDate, claims, employees, leaves]);

  const navItems = [
    { icon: <FaHome />, label: "Dashboard" },
    { icon: <FaUsers />, label: "Employees" },
    { icon: <FaCalendarAlt />, label: "Attendance" },
    { icon: <FaCalendarAlt />, label: "Leave Approvals" },
    { icon: <FaCalendarAlt />, label: "My Leave & Claim" },
    { icon: <FaChartBar />, label: "Reports" },
    { icon: <FaBell />, label: "Announcements" },
    { icon: <FaCog />, label: "Settings" },
  ];

  const stats = [
    { label: "Total Staff", value: employees.length, sub: "All active system users", color: "#2563eb", bg: "#dbeafe" },
    { label: "Present Today", value: summary.present, sub: `${percent(summary.present, employees.length)}% of staff`, color: "#059669", bg: "#d1fae5" },
    { label: "On Leave", value: summary.onLeave, sub: "Recorded for selected date", color: "#7c3aed", bg: "#ede9fe" },
    { label: "Absent", value: summary.absent, sub: "Recorded for selected date", color: "#dc2626", bg: "#fee2e2" },
    { label: "Pending Items", value: summary.pendingLeaves + summary.pendingClaims, sub: "Leaves and claims", color: "#d97706", bg: "#fef3c7" },
  ];

  const renderTableEmpty = (text) => <p style={s.empty}>{loading ? "Loading data..." : text}</p>;

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((emp) => {
      return [emp.full_name, emp.username, emp.email, emp.department, emp.role]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [searchQuery, employees]);

  const exitThisMonth = useMemo(() => {
    const now = new Date();
    return employees.filter((emp) => {
      const dateValue = emp.exit_date || emp.date_left || emp.left_date;
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  }, [employees]);

  const payrollSummary = [
    { label: "Total Employees", value: employees.length },
    { label: "Total Payroll", value: "₹ 25,80,000" },
    { label: "Deductions", value: "₹ 2,45,000" },
    { label: "Net Pay", value: "₹ 23,35,000" },
  ];

  const employeesByDepartment = useMemo(() => {
    const map = {};
    employees.forEach((emp) => {
      const key = emp.department || "Others";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const attendanceTrend = useMemo(() => {
    const todayDate = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() - (6 - index));
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Present: Math.max(summary.present - (6 - index) * 1, 0),
        "On Leave": Math.max(summary.onLeave - (6 - index) * 0.5, 0),
        Absent: Math.max(summary.absent - (6 - index) * 0.8, 0),
      };
    });
  }, [summary.present, summary.onLeave, summary.absent]);

  const payrollKpis = [
    { label: "Open Positions", value: 12, icon: "📌" },
    { label: "Applications", value: 78, icon: "📄" },
    { label: "Shortlisted", value: 24, icon: "✅" },
    { label: "Interviews", value: 10, icon: "🎤" },
    { label: "Hired", value: 5, icon: "👥" },
  ];

  const upcomingEvents = [
    { date: "May 10", title: "Interview: Sales Executive", time: "10:00 AM - 11:00 AM" },
    { date: "May 12", title: "Policy Training Session", time: "02:00 PM - 04:00 PM" },
    { date: "May 15", title: "Employee Engagement Activity", time: "11:00 AM - 01:00 PM" },
    { date: "May 20", title: "Payroll Processing", time: "All Day Event" },
  ];

  const renderDashboard = () => (
    <>
      <div style={s.topHeader}>
        <div>
          <p style={s.welcome}>Welcome back, {profile.full_name || "Priya"}! 👋</p>
          <p style={s.subheading}>Here's what's happening in your organization today.</p>
        </div>
        <div style={s.headerActions}>
          <div style={s.searchWrap}>
            <input
              style={s.searchInput}
              placeholder="Search employees, leaves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <NotificationBell />
        </div>
      </div>

      <div style={s.topCards}>
        <div style={s.metricCard}>
          <p style={s.metricLabel}>Total Employees</p>
          <p style={s.metricValue}>{employees.length}</p>
          <p style={s.metricNote}>+12 this month</p>
        </div>
        <div style={s.metricCard}>
          <p style={s.metricLabel}>Present Today</p>
          <p style={s.metricValue}>{summary.present}</p>
          <p style={s.metricNote}>{employees.length ? `${percent(summary.present, employees.length)}% of total` : "—"}</p>
        </div>
        <div style={s.metricCard}>
          <p style={s.metricLabel}>On Leave Today</p>
          <p style={s.metricValue}>{summary.onLeave}</p>
          <p style={s.metricNote}>{employees.length ? `${percent(summary.onLeave, employees.length)}% of total` : "—"}</p>
        </div>
        <div style={s.metricCard}>
          <p style={s.metricLabel}>Absent Today</p>
          <p style={s.metricValue}>{summary.absent}</p>
          <p style={s.metricNote}>{employees.length ? `${percent(summary.absent, employees.length)}% of total` : "—"}</p>
        </div>
        <div style={s.metricCard}>
          <p style={s.metricLabel}>New Joiners</p>
          <p style={s.metricValue}>{summary.newHires}</p>
          <p style={s.metricNote}>+5 this month</p>
        </div>
        <div style={s.metricCard}>
          <p style={s.metricLabel}>Exit This Month</p>
          <p style={s.metricValue}>{exitThisMonth}</p>
          <p style={s.metricNote}>-2 this month</p>
        </div>
      </div>

      <div style={s.mainGrid}>
        <section style={s.largeCard}>
          <div style={s.cardHeader}> 
            <div>
              <h3 style={s.sectionTitle}>Attendance Overview (This Month)</h3>
            </div>
            <div style={s.dateFilter}>
              <span>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <div style={s.chartRow}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={attendanceTrend} margin={{ top: 16, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Legend verticalAlign="top" align="right" height={36} />
                <Line type="monotone" dataKey="Present" stroke="#059669" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="On Leave" stroke="#7c3aed" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Absent" stroke="#dc2626" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={s.smallCard}>
          <div style={s.cardHeader}> <h3 style={s.sectionTitle}>Leave Approvals</h3></div>
          <div style={s.approvalList}>
            {leaves.filter((leave) => leave.status === "Pending").slice(0, 4).map((leave) => (
              <div key={leave.id} style={s.approvalItem}>
                <div>
                  <p style={s.heading}>{leave.employee || leave.full_name || "Unknown"}</p>
                  <p style={s.meta}>{leave.leave_type_display || leave.leave_type || "Leave"}</p>
                  <p style={s.dateInfo}>{leave.start_date} - {leave.end_date}</p>
                </div>
                <div style={s.actionRow}>
                  <button style={s.approveBtn} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
                  <button style={s.rejectBtn} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
                </div>
              </div>
            ))}
            {!leaves.some((leave) => leave.status === "Pending") && <p style={s.empty}>No pending leave approvals.</p>}
          </div>
        </section>
      </div>

      <section style={s.dataCard}>
        <div style={s.cardHeader}><h3 style={s.sectionTitle}>Employee Summary</h3></div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Employee ID', 'Name', 'Department', 'Designation', 'Status', 'Joining Date'].map((header) => (
                  <th key={header} style={s.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.slice(0, 6).map((emp, index) => (
                <tr key={emp.id || emp.username || index} style={index % 2 === 0 ? s.stripedRow : undefined}>
                  <td style={s.td}>{emp.id || `EMP${String(index + 1).padStart(3, '0')}`}</td>
                  <td style={s.td}>{emp.full_name || emp.username}</td>
                  <td style={s.td}>{emp.department || 'Others'}</td>
                  <td style={s.td}>{emp.role || 'Employee'}</td>
                  <td style={s.td}>{emp.is_approved ? 'Active' : 'Pending'}</td>
                  <td style={s.td}>{emp.date_joined ? new Date(emp.date_joined).toLocaleDateString('en-US') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={s.summaryRow}>
          <div style={s.summaryBox}>Total Active<span>{employees.length}</span></div>
          <div style={s.summaryBox}>On Leave<span>{summary.onLeave}</span></div>
          <div style={s.summaryBox}>Absent<span>{summary.absent}</span></div>
          <div style={s.summaryBox}>Probation<span>8</span></div>
        </div>
      </section>
    </>
  );

  const renderEmployees = () => {
    const slice = paginate(employees, empPage, PAGE);
    return (
      <section style={s.fullCard}>
        <div style={s.cardHeader}>
          <h3 style={s.cardTitle}>Employee Directory ({employees.length})</h3>
          <button style={s.primaryBtn} onClick={startCreateUser}><FaPlus /> Add User</button>
        </div>

        {showUserForm && (
          <div style={s.formPanel}>
            <div style={s.formGrid}>
              <input style={s.input} placeholder="Full name" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
              <input style={s.input} placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
              <input style={s.input} placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <input style={s.input} placeholder="Phone" value={userForm.phone || "-"} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              <select style={s.input} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
              </select>
              <input style={s.input} type="password" placeholder={editingUser ? "New password (optional)" : "Password"} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
            <div style={s.formActions}>
              <button style={s.primaryBtn} onClick={saveUser}><FaSave /> {editingUser ? "Save Changes" : "Create User"}</button>
              <button style={s.ghostBtn} onClick={() => setShowUserForm(false)}><FaTimes /> Cancel</button>
            </div>
          </div>
        )}

        {employees.length === 0 ? renderTableEmpty("No users found.") : (
          <>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>{["Name", "Role", "Department", "Email", "Phone", "Joined", "Actions"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {slice.map((emp, index) => (
                    <tr key={emp.id} style={index % 2 === 0 ? s.stripedRow : undefined}>
                      <td style={s.td}><div style={s.person}><span style={s.avatar}>{initial(emp.full_name)}</span><span>{emp.full_name}<small style={{ display:"block", color:"#64748b", fontWeight:400 }}>@{emp.username}</small></span></div></td>
                      <td style={s.td}><StatusBadge value={emp.role} /></td>
                      <td style={s.td}>{emp.department || "-"}</td>
                      <td style={s.td}>{emp.email}</td>
                      <td style={s.td}>{emp.phone || "-"}</td>
                      <td style={s.td}>{emp.date_joined}</td>
                      <td style={s.td}>
                        <div style={s.actionGroup}>
                          <button style={s.iconBtn} title="Edit" onClick={() => startEditUser(emp)}><FaEdit /></button>
                          <button style={{ ...s.iconBtn, color: "#dc2626" }} title="Delete" onClick={() => deleteUser(emp)}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={empPage} total={employees.length} pageSize={PAGE} onChange={setEmpPage} />
          </>
        )}
      </section>
    );
  };

  const renderAttendance = () => {
    const attSlice   = attendance;
    const claimSlice = paginate(claims, claimPage, PAGE);
    return (
      <section style={s.fullCard}>
        <div style={s.cardHeader}>
          <h3 style={s.cardTitle}>Attendance Tracking</h3>
          <div style={s.filters}>
            <input type="date" style={s.input} value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            <button style={s.dangerBtn} onClick={markAbsent}>Mark Absent</button>
          </div>
        </div>
        <div style={s.miniStats}>
          <MiniStat label="Present" value={summary.present} />
          <MiniStat label="Absent" value={summary.absent} />
          <MiniStat label="On Leave" value={summary.onLeave} />
          <MiniStat label="Late" value={summary.late} />
        </div>
        {attendance.length === 0 ? renderTableEmpty("No attendance records for this date.") : (
          <>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>{["Employee","Date","Check In","Check Out","Status","Logs"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {attSlice.map((row, i) => (
                    <tr key={row.id} style={i % 2 === 0 ? s.stripedRow : undefined}>
                      <td style={s.td}><div style={s.person}><span style={s.avatar}>{initial(row.employee)}</span><span>{row.employee}<small style={{ display:"block", color:"#64748b", fontWeight:400 }}>{row.email}</small></span></div></td>
                      <td style={s.td}>{row.date}</td>
                      <td style={s.td}>{row.check_in || "-"}</td>
                      <td style={s.td}>{row.check_out || "-"}</td>
                      <td style={s.td}><StatusBadge value={row.status} /></td>
                      <td style={s.td}>{renderLogs(row.logs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={attPage} total={attendanceLogTotal} pageSize={PAGE} onChange={setAttPage} />
          </>
        )}

        <h3 style={{ ...s.cardTitle, marginTop: 28 }}>Attendance Claims</h3>
        {claims.length === 0 ? renderTableEmpty("No attendance claims submitted.") : (
          <>
            <div style={s.list}>
              {claimSlice.map((claim) => (
                <div key={claim.id} style={s.requestRow}>
                  <div>
                    <p style={s.rowTitle}>{claim.employee}</p>
                    <p style={s.rowMeta}>{claim.date} | In {claim.check_in_time || "-"} | Out {claim.check_out_time || "-"}</p>
                    <p style={s.rowReason}>{claim.reason}</p>
                  </div>
                  {claim.status === "Pending" ? (
                    <div style={s.actionGroup}>
                      <button style={s.approveBtn} onClick={() => handleClaimAction(claim.id, "approve")}>Approve</button>
                      <button style={s.rejectBtn} onClick={() => handleClaimAction(claim.id, "reject")}>Reject</button>
                    </div>
                  ) : <StatusBadge value={claim.status} />}
                </div>
              ))}
            </div>
            <Pagination page={claimPage} total={claims.length} pageSize={PAGE} onChange={setClaimPage} />
          </>
        )}
      </section>
    );
  };

  const renderLeaves = () => {
    const pendingLeaves = leaves.filter((l) => l.status === "Pending");
    const pendSlice     = paginate(pendingLeaves, leavePendPage, PAGE);
    const allSlice      = paginate(leaves, leaveAllPage, PAGE);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <section style={s.fullCard}>
          <h3 style={s.cardTitle}>Leave Approvals ({pendingLeaves.length} Pending)</h3>
          {pendingLeaves.length === 0 ? renderTableEmpty("No pending leave approvals.") : (
            <>
              <div style={s.list}>
                {pendSlice.map((leave) => (
                  <div key={leave.id} style={s.requestRow}>
                    <div>
                      <p style={s.rowTitle}>{leave.employee} <span style={s.inlinePill}>{leave.leave_type_display || leave.leave_type}</span></p>
                      <p style={s.rowMeta}>{leave.start_date} → {leave.end_date} · {leave.days} day(s)</p>
                      <p style={s.rowReason}>{leave.reason}</p>
                    </div>
                    <div style={s.actionGroup}>
                      <button style={s.approveBtn} onClick={() => handleLeaveAction(leave.id, "approve")}>Approve</button>
                      <button style={s.rejectBtn} onClick={() => handleLeaveAction(leave.id, "reject")}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={leavePendPage} total={pendingLeaves.length} pageSize={PAGE} onChange={setLeavePendPage} />
            </>
          )}
        </section>

        <section style={s.fullCard}>
          <h3 style={s.cardTitle}>All Leave Records ({leaves.length})</h3>
          {leaves.length === 0 ? renderTableEmpty("No leave records found.") : (
            <>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead><tr>{["Employee","Type","Dates","Days","Status","Reason"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {allSlice.map((leave, i) => (
                      <tr key={leave.id} style={i % 2 === 0 ? s.stripedRow : undefined}>
                        <td style={s.td}><div style={s.person}><span style={s.avatar}>{initial(leave.employee)}</span><span>{leave.employee}<small style={{ display:"block", color:"#64748b", fontWeight:400 }}>{leave.email}</small></span></div></td>
                        <td style={s.td}>{leave.leave_type_display || leave.leave_type}</td>
                        <td style={s.td}>{leave.start_date} → {leave.end_date}</td>
                        <td style={s.td}>{leave.days}</td>
                        <td style={s.td}><StatusBadge value={leave.status} /></td>
                        <td style={s.td}>{leave.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={leaveAllPage} total={leaves.length} pageSize={PAGE} onChange={setLeaveAllPage} />
            </>
          )}
        </section>
      </div>
    );
  };

  const renderReports = () => {
    const roleCounts = employees.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {});
    const approvedLeaves = leaves.filter((l) => l.status === "Approved").reduce((sum, l) => sum + Number(l.days || 0), 0);
    const rejectedLeaves = leaves.filter((l) => l.status === "Rejected").length;
    const pendingLeaves  = leaves.filter((l) => l.status === "Pending").length;

    // Pie: users by role
    const roleData = [
      { name: "Employees", value: roleCounts.employee || 0, color: "#2563eb" },
      { name: "Managers",  value: roleCounts.manager  || 0, color: "#7c3aed" },
      { name: "HR",        value: roleCounts.hr        || 0, color: "#059669" },
    ].filter(d => d.value > 0);

    // Bar: leave status breakdown
    const leaveStatusData = [
      { name: "Approved", value: leaves.filter(l => l.status === "Approved").length, fill: "#059669" },
      { name: "Pending",  value: pendingLeaves,  fill: "#d97706" },
      { name: "Rejected", value: rejectedLeaves, fill: "#dc2626" },
    ];

    // Bar: leave days per leave type
    const leaveTypeMap = {};
    leaves.filter(l => l.status === "Approved").forEach(l => {
      const key = l.leave_type_display || l.leave_type;
      leaveTypeMap[key] = (leaveTypeMap[key] || 0) + Number(l.days || 0);
    });
    const leaveTypeData = Object.entries(leaveTypeMap).map(([name, days]) => ({ name, days }));

    // Bar: attendance summary for selected date
    const attSummaryData = [
      { name: "Present",  value: summary.present,  fill: "#059669" },
      { name: "Absent",   value: summary.absent,   fill: "#dc2626" },
      { name: "On Leave", value: summary.onLeave,  fill: "#7c3aed" },
      { name: "Late",     value: summary.late,     fill: "#d97706" },
    ];

    // Line: department headcount
    const deptMap = {};
    employees.forEach(e => {
      const d = e.department || "Unassigned";
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const deptData = Object.entries(deptMap).map(([dept, count]) => ({ dept, count }));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Summary KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          {[
            { label: "Total Employees", value: roleCounts.employee || 0, color: "#2563eb", bg: "#dbeafe" },
            { label: "Total Managers",  value: roleCounts.manager  || 0, color: "#7c3aed", bg: "#ede9fe" },
            { label: "HR Users",        value: roleCounts.hr        || 0, color: "#059669", bg: "#d1fae5" },
            { label: "Approved Leave Days", value: approvedLeaves,   color: "#d97706", bg: "#fef3c7" },
            { label: "Attendance Rate", value: `${percent(summary.present, employees.length)}%`, color: "#0891b2", bg: "#e0f2fe" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: "white", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color }}>{value}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Row 1: Attendance Summary Bar + Leave Status Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={s.chartCard}>
            <h4 style={s.chartTitle}>Attendance Summary ({attendanceDate})</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attSummaryData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {attSummaryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={s.chartCard}>
            <h4 style={s.chartTitle}>Leave Requests by Status</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={leaveStatusData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {leaveStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Pie (users by role) + Bar (leave days by type) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={s.chartCard}>
            <h4 style={s.chartTitle}>Users by Role</h4>
            {roleData.length === 0 ? <p style={s.empty}>No user data.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={90} label={({ name, percent: p }) => `${name} ${(p * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {roleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={s.chartCard}>
            <h4 style={s.chartTitle}>Approved Leave Days by Type</h4>
            {leaveTypeData.length === 0 ? <p style={s.empty}>No approved leaves yet.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={leaveTypeData} barSize={28} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="days" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 3: Department headcount bar */}
        <div style={s.chartCard}>
          <h4 style={s.chartTitle}>Headcount by Department</h4>
          {deptData.length === 0 ? <p style={s.empty}>No department data.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <section style={s.fullCard}>
      <div style={s.cardHeader}>
        <h3 style={s.cardTitle}>Settings</h3>
        <button style={s.primaryBtn} onClick={() => (editProfile ? saveProfile() : setEditProfile(true))}>
          {editProfile ? <FaSave /> : <FaEdit />} {editProfile ? "Save Profile" : "Edit Profile"}
        </button>
      </div>
      {profileMsg && <p style={{ color: "#065f46", background: "#d1fae5", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>{profileMsg}</p>}
      {profileError && <p style={s.error}>{profileError}</p>}
      <div style={s.formGrid}>
        {[
          ["Full Name", "full_name", true],
          ["Username", "username", true],
          ["Email", "email", true],
          ["Phone", "phone", true],
          ["Role", "role", false],
        ].map(([label, key, editable]) => (
          <label key={key} style={s.label}>
            {label}
            <input
              style={{ ...s.input, background: editProfile && editable ? "white" : "#f8fafc" }}
              value={profile[key] || "-"}
              disabled={!editProfile || !editable}
              onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
            />
          </label>
        ))}
        <label style={s.label}>
          Department
          {profile.department ? (
            <input style={{ ...s.input, background: "#f8fafc" }} value={profile.department} disabled />
          ) : (
            <select
              style={{ ...s.input, background: editProfile ? "white" : "#f8fafc" }}
              value={profile.department || "-"}
              disabled={!editProfile}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })}
            >
              <option value="">— Select Department —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </label>
      </div>
    </section>
  );

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
        fetchMyClaims();
      } catch (err) {
        setMyClaimError(err.response?.data?.error || 'Failed to submit claim.');
      }
    };
    return (
      <section style={s.fullCard}>
        <h3 style={{ ...s.cardTitle, marginBottom: 16 }}>My Attendance Claim</h3>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Submit Attendance Claim</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={s.label}>Date *</label>
              <input type="date" style={s.input} value={myClaimForm.date} max={new Date().toLocaleDateString('en-CA')} onChange={e => setMyClaimForm({ ...myClaimForm, date: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Check-in Time *</label>
              <input type="time" style={s.input} value={myClaimForm.check_in_time} onChange={e => setMyClaimForm({ ...myClaimForm, check_in_time: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>Check-out Time</label>
              <input type="time" style={s.input} value={myClaimForm.check_out_time} onChange={e => setMyClaimForm({ ...myClaimForm, check_out_time: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={s.label}>Reason *</label>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={myClaimForm.reason} onChange={e => setMyClaimForm({ ...myClaimForm, reason: e.target.value })} placeholder="Explain why you couldn't check in..." />
          </div>
          {myClaimError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{myClaimError}</p>}
          {myClaimSuccess && <p style={{ color: '#059669', fontSize: 12, marginTop: 8 }}>{myClaimSuccess}</p>}
          <button style={{ ...s.primaryBtn, marginTop: 14 }} onClick={submitClaim}>Submit Claim</button>
        </div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>My Claim History</h4>
        {myClaims.length === 0 ? renderTableEmpty('No claims submitted yet.') : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{['Date', 'Check-in', 'Check-out', 'Reason', 'Submitted', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {myClaims.slice((myClaimHistPage-1)*PAGE, myClaimHistPage*PAGE).map((c, i) => (
                  <tr key={c.id} style={i % 2 === 0 ? s.stripedRow : undefined}>
                    <td style={s.td}>{c.date}</td>
                    <td style={s.td}>{c.check_in_time || '—'}</td>
                    <td style={s.td}>{c.check_out_time || '—'}</td>
                    <td style={s.td}>{c.reason}</td>
                    <td style={s.td}>{c.submitted_at}</td>
                    <td style={s.td}><StatusBadge value={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={myClaimHistPage} total={myClaims.length} pageSize={PAGE} onChange={setMyClaimHistPage} />
          </div>
        )}
      </section>
    );
  };

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
        fetchMyLeaves();
        fetchMyLeaveBalances();
      } catch (err) {
        setMyLeaveError(err.response?.data?.error || 'Failed to apply leave.');
      }
    };

    return (
      <section style={s.fullCard}>
        <h3 style={{ ...s.cardTitle, marginBottom: 16 }}>My Leave</h3>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead><tr>{['Leave Type', 'Entitled', 'Used', 'Remaining'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {policyRows.map((b, i) => (
                <tr key={b.leave_type} style={i % 2 === 0 ? s.stripedRow : undefined}>
                  <td style={s.td}><span style={s.inlinePill}>{b.leave_type_display}</span></td>
                  <td style={s.td}>{b.entitled === 0 ? <span style={{ color: '#94a3b8' }}>Unlimited</span> : b.entitled}</td>
                  <td style={s.td}>{b.used}</td>
                  <td style={s.td}>{b.remaining === null ? <span style={{ color: '#94a3b8' }}>—</span> : <span style={{ fontWeight: 700, color: b.remaining === 0 ? '#dc2626' : b.remaining <= 2 ? '#d97706' : '#059669' }}>{b.remaining}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, margin: '20px 0 8px' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Apply for Leave</h4>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>Your leave request will be sent to Super Admin for approval.</p>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Leave Type</label>
            <select style={s.input} value={myLeaveForm.leave_type} onChange={e => setMyLeaveForm({ ...myLeaveForm, leave_type: e.target.value })}>
              {policyRows.map(p => <option key={p.leave_type} value={p.leave_type}>{p.leave_type_display}{p.remaining !== null ? ` (${p.remaining} left)` : ' (on request)'}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={s.label}>Start Date</label>
              <input type="date" style={s.input} value={myLeaveForm.start_date} onChange={e => setMyLeaveForm({ ...myLeaveForm, start_date: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>End Date</label>
              <input type="date" style={s.input} value={myLeaveForm.end_date} onChange={e => setMyLeaveForm({ ...myLeaveForm, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={s.label}>Reason</label>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={myLeaveForm.reason} onChange={e => setMyLeaveForm({ ...myLeaveForm, reason: e.target.value })} placeholder="Enter reason for leave" />
          </div>
          {myLeaveError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{myLeaveError}</p>}
          <button style={{ ...s.primaryBtn, marginTop: 14 }} onClick={applyLeave}>Submit Request</button>
        </div>

        <h4 style={{ margin: '20px 0 12px', fontSize: 14, fontWeight: 700 }}>My Leave History</h4>
        {myLeaves.length === 0 ? renderTableEmpty('No leave requests yet.') : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{['Type', 'Start', 'End', 'Days', 'Reason', 'Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {myLeaves.slice((myLeaveHistPage-1)*PAGE, myLeaveHistPage*PAGE).map((l, i) => (
                  <tr key={l.id} style={i % 2 === 0 ? s.stripedRow : undefined}>
                    <td style={s.td}><span style={s.inlinePill}>{l.leave_type_display || l.leave_type}</span></td>
                    <td style={s.td}>{l.start_date}</td>
                    <td style={s.td}>{l.end_date}</td>
                    <td style={s.td}>{l.days}</td>
                    <td style={s.td}>{l.reason}</td>
                    <td style={s.td}><StatusBadge value={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={myLeaveHistPage} total={myLeaves.length} pageSize={PAGE} onChange={setMyLeaveHistPage} />
          </div>
        )}
      </section>
    );
  };

  const renderContent = () => {
    if (activeNav === "Dashboard") return renderDashboard();
    if (activeNav === "Employees") return renderEmployees();
    if (activeNav === "Attendance") return renderAttendance();
    if (activeNav === "Leave Approvals") return renderLeaves();
    if (activeNav === "My Leave & Claim") return (<>{renderMyLeave()}{renderMyClaim()}</>);
    if (activeNav === "Reports") return renderReports();
    if (activeNav === "Announcements") return <AnnouncementsTab userRole={profile.role} userDepartment={profile.department} />;
    if (activeNav === "Settings") return renderSettings();
    return null;
  };

  return (
    <div style={s.root}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <span style={s.brandText}>AMS</span>
          <span style={s.brandSub}>Attendance<br />Management System</span>
        </div>
        <nav style={s.nav}>
          {navItems.map(({ icon, label }) => (
            <button key={label} style={{ ...s.navItem, ...(activeNav === label ? s.navActive : {}) }} onClick={() => setActiveNav(label)}>
              <span style={s.navIcon}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
            </button>
          ))}
        </nav>
        <div style={s.userBox}>
          <span style={s.userAvatar}>{initial(profile.full_name) || "H"}</span>
          <span>{profile.full_name || "HR User"}<small>HR Manager</small></span>
        </div>
        <button style={s.logout} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
          <FaSignOutAlt /> Logout
        </button>
      </aside>

      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>HR Dashboard</h1>
            <p style={s.pageSubtitle}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <div style={s.headerRight}>
            {message && <span style={s.toast}>{message}</span>}
            <button
              onClick={checkedIn ? handleCheckOut : handleCheckIn}
              style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: checkedIn ? "#dc2626" : "#059669", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {checkedIn ? "Check Out" : "Check In"}
            </button>
            <NotificationBell />
          </div>
        </header>
        <div style={s.content}>{renderContent()}</div>
      </main>
    </div>
  );
};

const initial = (value) => value?.trim()?.[0]?.toUpperCase() || "U";
const percent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);
const paginate = (arr, page, size) => arr.slice((page - 1) * size, page * size);

const renderLogs = (logs = []) => {
  if (!logs.length) return <span style={{ color: "#94a3b8" }}>-</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {logs.map((log, index) => {
        const isIn = log.action === "check_in";
        return (
          <div key={`${log.action}-${log.time}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isIn ? "#10b981" : "#ef4444", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isIn ? "#059669" : "#dc2626", minWidth: 26 }}>{isIn ? "IN" : "OUT"}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{log.time}</span>
          </div>
        );
      })}
    </div>
  );
};

const StatusBadge = ({ value }) => {
  const tone = {
    Present: ["#d1fae5", "#065f46"],
    Approved: ["#d1fae5", "#065f46"],
    Pending: ["#fef3c7", "#92400e"],
    Absent: ["#fee2e2", "#991b1b"],
    Rejected: ["#fee2e2", "#991b1b"],
    "On Leave": ["#ede9fe", "#6d28d9"],
    hr: ["#e0f2fe", "#075985"],
    manager: ["#ede9fe", "#6d28d9"],
    employee: ["#dbeafe", "#1d4ed8"],
  }[value] || ["#e2e8f0", "#334155"];
  return <span style={{ ...s.badge, background: tone[0], color: tone[1] }}>{value || "-"}</span>;
};

const MiniStat = ({ label, value }) => (
  <div style={s.miniStat}>
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);


const s = {
  root: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f1f5f9", color: "#0f172a" },
  sidebar: { width: 220, minWidth: 220, background: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column", padding: "20px 12px", boxSizing: "border-box", overflowY: "auto" },
  brand: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 28, paddingLeft: 4 },
  brandText: { color: "white", fontSize: 20, fontWeight: 800, lineHeight: 1 },
  brandSub: { color: "#64748b", fontSize: 10, lineHeight: 1.4 },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  navItem: { border: "none", background: "transparent", color: "inherit", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%" },
  navActive: { background: "#2563eb", color: "white" },
  navIcon: { width: 16, display: "inline-flex", flexShrink: 0 },
  chevron: { marginLeft: "auto", fontSize: 11 },
  userBox: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderTop: "1px solid #1e293b", paddingTop: 14, marginTop: 8 },
  userAvatar: { width: 38, height: 38, borderRadius: "50%", background: "#2563eb", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 },
  logout: { border: "none", background: "transparent", color: "#f87171", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, width: "100%" },
  main: { flex: 1, overflow: "hidden", padding: "24px 28px", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  pageTitle: { margin: 0, fontSize: 22, fontWeight: 800 },
  pageSubtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  content: { flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 0 },
  toast: { background: "#0f172a", color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 20 },
  statCard: { background: "white", borderRadius: 8, padding: 18, boxShadow: "0 1px 5px rgba(15,23,42,0.08)", display: "flex", alignItems: "center", gap: 14 },
  statDot: { width: 52, height: 52, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 },
  statLabel: { margin: 0, fontSize: 13, fontWeight: 800 },
  statSub: { margin: "4px 0 0", fontSize: 12, color: "#64748b" },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 },
  card: { background: "white", borderRadius: 8, padding: 22, boxShadow: "0 1px 5px rgba(15,23,42,0.08)" },
  fullCard: { background: "white", borderRadius: 8, padding: 22, boxShadow: "0 1px 5px rgba(15,23,42,0.08)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center" },
  metricRow: { borderRadius: 8, padding: "12px 14px", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700 },
  reviewRow: { width: "100%", border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: "13px 14px", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "#0f172a", fontWeight: 700 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: 13 },
  th: { textAlign: "left", padding: "11px 12px", color: "#64748b", borderBottom: "2px solid #e2e8f0", fontSize: 12, textTransform: "uppercase", whiteSpace: "nowrap" },
  td: { padding: "12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  stripedRow: { background: "#f8fafc" },
  person: { display: "flex", alignItems: "center", gap: 10, fontWeight: 700 },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 },
  badge: { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", textTransform: "capitalize" },
  primaryBtn: { border: "none", background: "#1d4ed8", color: "white", borderRadius: 7, padding: "9px 13px", display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  dangerBtn: { border: "none", background: "#dc2626", color: "white", borderRadius: 7, padding: "9px 13px", cursor: "pointer", fontWeight: 800, fontSize: 13 },
  ghostBtn: { border: "1px solid #cbd5e1", background: "white", color: "#334155", borderRadius: 7, padding: "9px 13px", display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  iconBtn: { border: "1px solid #e2e8f0", background: "white", color: "#1d4ed8", borderRadius: 7, width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  approveBtn: { border: "none", background: "#059669", color: "white", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12 },
  rejectBtn: { border: "none", background: "#dc2626", color: "white", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12 },
  actionGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  formPanel: { border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: 16, marginBottom: 18 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 },
  formActions: { display: "flex", gap: 10, marginTop: 14 },
  input: { minHeight: 38, border: "1.5px solid #cbd5e1", borderRadius: 7, padding: "8px 10px", fontSize: 13, boxSizing: "border-box", width: "100%" },
  filters: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  miniStats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 18 },
  miniStat: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  requestRow: { border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" },
  rowTitle: { margin: 0, fontWeight: 800, fontSize: 14 },
  rowMeta: { margin: "5px 0 0", color: "#64748b", fontSize: 12 },
  rowReason: { margin: "5px 0 0", color: "#475569", fontSize: 13 },
  inlinePill: { display: "inline-flex", borderRadius: 999, background: "#e0f2fe", color: "#075985", padding: "3px 8px", fontSize: 11, fontWeight: 800 },
  chartCard: { background: "white", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 5px rgba(15,23,42,0.08)" },
  chartTitle: { margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0f172a" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#475569", fontWeight: 800 },
  error: { color: "#991b1b", background: "#fee2e2", borderRadius: 8, padding: "10px 12px", fontSize: 13 },
  empty: { textAlign: "center", color: "#94a3b8", padding: "28px 0", fontSize: 13 },
  topHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  welcome: { margin: 0, fontSize: 22, fontWeight: 800 },
  subheading: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  headerActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  searchWrap: { minWidth: 220, flex: 1, maxWidth: 320 },
  searchInput: { width: "100%", minHeight: 38, padding: "0 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "white", outline: "none" },
  topCards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16 },
  metricCard: { background: "white", borderRadius: 12, padding: "16px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  metricLabel: { margin: 0, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" },
  metricValue: { margin: "8px 0 0", fontSize: 26, fontWeight: 800, color: "#0f172a" },
  metricNote: { margin: "4px 0 0", color: "#10b981", fontSize: 12, fontWeight: 600 },
  mainGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 },
  largeCard: { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  smallCard: { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  dataCard: { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9", marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" },
  dateFilter: { color: "#64748b", fontSize: 12, fontWeight: 600 },
  chartRow: { minHeight: 220 },
  approvalList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  approvalItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#f8fafc" },
  heading: { margin: 0, fontSize: 13, fontWeight: 800 },
  meta: { margin: "4px 0 0", color: "#64748b", fontSize: 11 },
  dateInfo: { margin: "3px 0 0", color: "#475569", fontSize: 12, fontWeight: 600 },
  actionRow: { display: "flex", gap: 8 },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginTop: 16 },
  summaryBox: { background: "#f8fafc", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, fontWeight: 700, color: "#0f172a", fontSize: 13 },
  bottomGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 },
  kpiCard: { background: "#f8fafc", borderRadius: 10, padding: "14px 12px" },
  kpiLabel: { margin: 0, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  kpiValue: { margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "#0f172a" },
  eventsList: { display: "grid", gap: 10, marginTop: 12 },
  eventItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#ffffff" },
  eventDate: { margin: 0, fontSize: 13, fontWeight: 800, color: "#2563eb" },
  eventTitle: { margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: "#0f172a" },
  eventTime: { margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 },
  payrollCard: { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
  payrollRow: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 12 },
  payrollItem: { background: "#f8fafc", borderRadius: 10, padding: "14px 12px" },
  payrollLabel: { margin: 0, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  payrollValue: { margin: "6px 0 0", fontSize: 16, fontWeight: 800, color: "#0f172a" },
  quickActions: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 12 },
  actionBtn: { border: "none", borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" },
};

export default HRDashboard;
