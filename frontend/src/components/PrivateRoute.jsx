import { Navigate } from "react-router-dom";

const ROLE_ROUTES = {
  super_admin: "/superadmin-dashboard",
  hr: "/hr-dashboard",
  manager: "/manager-dashboard",
  employee: "/dashboard",
};

const PrivateRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");

  if (!token) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_ROUTES[role] || "/"} />;
  }
  return children;
};

export default PrivateRoute;
