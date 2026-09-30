import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { FaBell, FaTrash, FaCheckDouble, FaTimes } from "react-icons/fa";

const API    = "http://127.0.0.1:8000/api";
const WS_URL = "ws://127.0.0.1:8000/ws/notifications/";

const ICONS = {
  task:       "📋",
  leave:      "🌴",
  attendance: "🕐",
  claim:      "📝",
  user:       "👤",
  approved:   "✅",
  rejected:   "❌",
  default:    "🔔",
};

function getIcon(message = "") {
  const m = message.toLowerCase();
  if (m.includes("task"))                          return ICONS.task;
  if (m.includes("leave"))                         return ICONS.leave;
  if (m.includes("check") || m.includes("absent")) return ICONS.attendance;
  if (m.includes("claim"))                         return ICONS.claim;
  if (m.includes("approved") || m.includes("approval")) return ICONS.approved;
  if (m.includes("rejected") || m.includes("reject"))   return ICONS.rejected;
  if (m.includes("user") || m.includes("joined") || m.includes("registered")) return ICONS.user;
  return ICONS.default;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]                   = useState(false);
  const [filter, setFilter]               = useState("all"); // all | unread
  const ref   = useRef(null);
  const wsRef = useRef(null);

  const cfg = () => ({ headers: { Authorization: `Token ${localStorage.getItem("token")}` } });

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notifications/`, cfg());
      setNotifications(res.data);
    } catch { setNotifications([]); }
  }, []);

  // WebSocket with auto-reconnect
  const connectWS = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // Only handle real notification messages, ignore refresh signals
        if (data.type === "notification") {
          setNotifications(prev => {
            const exists = prev.some(n => n.id === data.id);
            if (exists) return prev;
            return [{ id: data.id, message: data.message, is_read: false, created_at: data.created_at }, ...prev].slice(0, 50);
          });
        }
      } catch {}
    };

    ws.onclose = (e) => {
      // Auto-reconnect after 4s unless intentionally closed
      if (e.code !== 1000) {
        setTimeout(() => connectWS(), 4000);
      }
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    fetchNotifications();
    connectWS();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close(1000);
      }
    };
  }, [fetchNotifications, connectWS]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/read/`, {}, cfg());
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const markOneRead = async (id) => {
    try {
      await axios.post(`${API}/notifications/${id}/read/`, {}, cfg());
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const clearAll = async () => {
    try {
      await axios.delete(`${API}/notifications/clear/`, cfg());
      setNotifications([]);
    } catch {}
  };

  const handleBellClick = () => {
    setOpen(prev => !prev);
    if (!open) fetchNotifications();
  };

  const unread   = notifications.filter(n => !n.is_read).length;
  const filtered = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={handleBellClick} style={s.bellBtn} title="Notifications">
        <FaBell style={{ fontSize: 18, color: "#1e3a8a" }} />
        {unread > 0 && (
          <span style={s.badge}>{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={s.dropdown}>
          {/* Header */}
          <div style={s.header}>
            <span style={s.title}>Notifications {unread > 0 && <span style={s.unreadPill}>{unread} new</span>}</span>
            <button onClick={() => setOpen(false)} style={s.closeBtn}><FaTimes /></button>
          </div>

          {/* Filter tabs */}
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(filter === "all"    ? s.tabActive : {}) }} onClick={() => setFilter("all")}>All ({notifications.length})</button>
            <button style={{ ...s.tab, ...(filter === "unread" ? s.tabActive : {}) }} onClick={() => setFilter("unread")}>Unread ({unread})</button>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div style={s.actions}>
              <button style={s.actionBtn} onClick={markAllRead} title="Mark all as read">
                <FaCheckDouble style={{ marginRight: 4 }} /> Mark all read
              </button>
              <button style={{ ...s.actionBtn, color: "#dc2626" }} onClick={clearAll} title="Clear all notifications">
                <FaTrash style={{ marginRight: 4 }} /> Clear all
              </button>
            </div>
          )}

          {/* List */}
          <div style={s.list}>
            {filtered.length === 0 ? (
              <div style={s.empty}>
                <FaBell style={{ fontSize: 28, color: "#cbd5e1", marginBottom: 8 }} />
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
              </div>
            ) : (
              filtered.map(n => (
                <div
                  key={n.id}
                  style={{ ...s.item, background: n.is_read ? "white" : "#eff6ff" }}
                  onClick={() => !n.is_read && markOneRead(n.id)}
                >
                  <span style={s.icon}>{getIcon(n.message)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...s.msg, fontWeight: n.is_read ? 400 : 700 }}>{n.message}</p>
                    <p style={s.time}>{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span style={s.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  bellBtn:    { position: "relative", background: "white", border: "1px solid #e2e8f0", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  badge:      { position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid white" },
  dropdown:   { position: "absolute", right: 0, top: 48, width: 360, background: "white", borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.14)", zIndex: 9999, overflow: "hidden", border: "1px solid #f1f5f9" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9" },
  title:      { fontSize: 15, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 },
  unreadPill: { background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 8px" },
  closeBtn:   { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, display: "flex", alignItems: "center", padding: 4 },
  tabs:       { display: "flex", borderBottom: "1px solid #f1f5f9" },
  tab:        { flex: 1, background: "none", border: "none", padding: "9px 0", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer" },
  tabActive:  { color: "#2563eb", borderBottom: "2px solid #2563eb" },
  actions:    { display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" },
  actionBtn:  { background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", padding: "4px 8px", borderRadius: 6 },
  list:       { maxHeight: 380, overflowY: "auto" },
  item:       { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background 0.15s" },
  icon:       { fontSize: 18, flexShrink: 0, marginTop: 1 },
  msg:        { margin: 0, fontSize: 13, color: "#0f172a", lineHeight: 1.45 },
  time:       { margin: "4px 0 0", fontSize: 11, color: "#94a3b8" },
  unreadDot:  { width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: 5 },
  empty:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 0" },
};
