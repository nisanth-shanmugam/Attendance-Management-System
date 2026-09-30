import React, { useState } from "react";
import "./../styles/auth.css";
import axios from "axios";

const Login = () => {
  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/login/", data);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("full_name", res.data.full_name || "");
      localStorage.setItem("username", res.data.username || "");
      localStorage.setItem("email", res.data.email || "");
      localStorage.setItem("phone", res.data.phone || "");
      if (res.data.role === "manager") {
        window.location.href = "/manager-dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">AMS</div>
        <p className="auth-subtitle">Attendance Management System</p>

        <h2>Sign In</h2>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            onChange={(e) => setData({ ...data, email: e.target.value })}
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            onChange={(e) => setData({ ...data, password: e.target.value })}
          />
        </div>

        <button onClick={handleLogin} disabled={loading} style={{ opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? <><div className="btn-spinner" />Signing in...</> : "Sign In"}
        </button>

        {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 10, textAlign: "center" }}>{error}</p>}

        <p
          className="switch-link"
          onClick={() => (window.location.href = "/register")}
        >
          Don't have an account? Create one
        </p>
      </div>
    </div>
  );
};

export default Login;

const spinnerStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};