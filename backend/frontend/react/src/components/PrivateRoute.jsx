import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/" />;
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === "manager" ? "/manager-dashboard" : "/dashboard"} />;
  }

  return children;
};

export default PrivateRoute;
