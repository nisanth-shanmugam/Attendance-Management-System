import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";
const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

const DEPARTMENTS = [
  "Information Technology", "Human Resources", "Finance", "Marketing",
  "Operations", "Sales", "Legal", "Administration",
  "Engineering", "Customer Support", "Logistics", "Design", "Quality Assurance",
];

const roleLabel = (role) => ({ super_admin: "Super Admin", hr: "HR", manager: "Manager", employee: "Employee" }[role] || role);

export default function AnnouncementsTab({ userRole, userDepartment }) {
  const canPost = ["super_admin", "hr", "manager"].includes(userRole);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", department: "" });
  const [formErr, setFormErr] = useState("");
  const [posting, setPosting] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/announcements/`, cfg());
      setAnnouncements(res.data || []);
    } catch { setAnnouncements([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const post = async () => {
    setFormErr("");
    if (!form.title.trim() || !form.message.trim()) {
      setFormErr("Title and message are required.");
      return;
    }
    setPosting(true);
    try {
      await axios.post(`${API}/announcements/`, form, cfg());
      setForm({ title: "", message: "", department: "" });
      loadAnnouncements();
    } catch (e) {
      setFormErr(e.response?.data?.error || "Failed to post announcement.");
    } finally { setPosting(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try { await axios.delete(`${API}/announcements/${id}/`, cfg()); loadAnnouncements(); } catch {}
  };

  const deptBadgeColor = (dept) =>
    dept === "All Departments"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : { background: "#ede9fe", color: "#6d28d9" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Post form — only for super_admin, hr, manager */}
      {canPost && (
        <div style={{ background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>📢 Post Announcement</h3>

          {userRole === "super_admin" && (
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Target Department</label>
              <select style={s.input} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {(userRole === "hr" || userRole === "manager") && (
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Target Department</label>
              <input style={{ ...s.input, background: "#f8fafc", color: "#64748b" }} value={userDepartment || "Your Department"} disabled />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>You can only post to your own department.</p>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Title *</label>
            <input style={s.input} placeholder="Announcement title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Message *</label>
            <textarea style={{ ...s.input, minHeight: 80, resize: "vertical" }} placeholder="Write your announcement..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
          </div>
          {formErr && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>{formErr}</p>}
          <button onClick={post} disabled={posting} style={{ padding: "9px 20px", border: "none", borderRadius: 8, background: "#6366f1", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: posting ? 0.7 : 1 }}>
            {posting ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      )}

      {/* Announcements list */}
      <div style={{ background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Announcements</h3>
          <button onClick={loadAnnouncements} style={{ border: "1px solid #e2e8f0", background: "white", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>Refresh</button>
        </div>

        {loading ? (
          <p style={s.empty}>Loading...</p>
        ) : announcements.length === 0 ? (
          <p style={s.empty}>No announcements yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {announcements.map(a => (
              <div key={a.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{a.title}</span>
                      <span style={{ ...deptBadgeColor(a.department), borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                        {a.department}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{a.message}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                      By <strong style={{ color: "#64748b" }}>{a.sender}</strong> ({roleLabel(a.sender_role)}) · {a.created_at}
                    </p>
                  </div>
                  {canPost && (
                    <button onClick={() => del(a.id)} style={{ border: "1px solid #fee2e2", background: "white", color: "#dc2626", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" },
  empty: { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "24px 0", margin: 0 },
};
