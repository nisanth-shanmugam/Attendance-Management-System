import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import HRDashboard from "./pages/HRDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={["employee"]}>
            <EmployeeDashboard />
          </PrivateRoute>
        } />
        <Route path="/manager-dashboard" element={
          <PrivateRoute allowedRoles={["manager"]}>
            <ManagerDashboard />
          </PrivateRoute>
        } />
        <Route path="/hr-dashboard" element={
          <PrivateRoute allowedRoles={["hr"]}>
            <HRDashboard />
          </PrivateRoute>
        } />
        <Route path="/superadmin-dashboard" element={
          <PrivateRoute allowedRoles={["super_admin"]}>
            <SuperAdminDashboard />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;