import React, { useState } from "react";
import "./../styles/auth.css";
import axios from "axios";

const Register = () => {
  const [data, setData] = useState({ full_name: "", username: "", email: "", password: "", phone: "", role: "employee" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setData({ ...data, [field]: e.target.value });

  const handleRegister = async () => {
    if (!data.full_name || !data.username || !data.email || !data.password) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await axios.post("http://127.0.0.1:8000/api/register/", data);
      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
      setLoading(false);
    }
  };

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
          <select onChange={set("role")}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <button onClick={handleRegister} disabled={loading} style={{ opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? <><div className="btn-spinner" />Creating account...</> : "Create Account"}
        </button>

        {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}

        <p className="switch-link" onClick={() => (window.location.href = "/")}>
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