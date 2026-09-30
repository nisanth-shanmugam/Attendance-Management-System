import React, { useState } from "react";
import "./../styles/auth.css";
import axios from "axios";

const DEPARTMENTS = [
  "Engineering", "Sales", "Marketing", "Finance", "Operations",
  "Customer Support", "Logistics", "Design", "Quality Assurance", "Other",
];

const Register = () => {
  const [data, setData] = useState({ full_name: "", username: "", email: "", password: "", phone: "", role: "employee", department: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field) => (e) => {
    const updated = { ...data, [field]: e.target.value };
    if (field === "role") updated.department = "";
    setData(updated);
  };

  const handleRegister = async () => {
    if (!data.full_name || !data.username || !data.email || !data.password) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await axios.post("http://127.0.0.1:8000/api/register/", data);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-container">
        <div className="auth-box" style={{ textAlign: "center" }}>
          <div className="auth-logo">AMS</div>
          <p className="auth-subtitle">Attendance Management System</p>
          <div style={{ fontSize: 48, margin: "16px 0" }}>⏳</div>
          <h2 style={{ color: "#1e3a8a" }}>Registration Submitted!</h2>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "12px 0 24px" }}>
            Your account is <strong>pending approval</strong> by the Super Admin.<br />
            You will be able to log in once your account has been approved.
          </p>
          <p style={{ fontSize: 13, color: "#94a3b8" }}>Please contact your administrator if this takes too long.</p>
          <p className="switch-link" style={{ marginTop: 24 }} onClick={() => (window.location.href = "/")}>
            Back to Sign In
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">AMS</div>
        <p className="auth-subtitle">Attendance Management System</p>

        <h2>Create Account</h2>

        <div className="input-group">
          <label>Full Name</label>
          <input placeholder="Enter your full name" onChange={set("full_name")} />
        </div>

        <div className="input-group">
          <label>Username</label>
          <input placeholder="Choose a username" onChange={set("username")} />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" onChange={set("email")} />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="Create a password" onChange={set("password")} />
        </div>

        <div className="input-group">
          <label>Phone Number</label>
          <input type="tel" placeholder="Enter your phone number" onChange={set("phone")} />
        </div>

        <div className="input-group">
          <label>Role</label>
          <select onChange={set("role")} value={data.role}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr">HR</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {data.role !== "super_admin" && (
        <div className="input-group">
          <label>Department / Sector</label>
          <select onChange={set("department")} value={data.department}>
            <option value="">-- Select Department --</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        )}

        <button onClick={handleRegister} disabled={loading} style={{ opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? <><div className="btn-spinner" />Creating account...</> : "Create Account"}
        </button>

        {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}

        <p className="switch-link" onClick={() => (window.location.href = "/login")}>
          Already have an account? Sign In
        </p>
      </div>
    </div>
  );
};

export default Register;

const spinnerStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
