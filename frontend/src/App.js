import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

import Login from "./pages/Login";
import DeveloperLayout from "./pages/DeveloperLayout";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import DeveloperEDs from "./pages/DeveloperEDs";
import DeveloperSubscriptions from "./pages/DeveloperSubscriptions";
import DeveloperSettings from "./pages/DeveloperSettings";
import CreateSuperAdmin from "./pages/CreateSuperAdmin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ChapterAdminDashboard from "./pages/ChapterAdminDashboard";
import MembersManagement from "./pages/MembersManagement";
import MeetingManagement from "./pages/MeetingManagement";
import MeetingManagementHub from "./pages/MeetingManagementHub";
import QRManagement from "./pages/QRManagement";
import QRDisplay from "./pages/QRDisplay";
import ReportsManagement from "./pages/ReportsManagement";
import LiveAttendance from "./pages/LiveAttendance";
import AttendanceForm from "./pages/AttendanceForm";
import InstallPWA from "./components/InstallPWA";

// Fund Management Pages
import FundManagementHub from "./pages/FundManagementHub";
import KittyPayment from "./pages/KittyPayment";
import MeetingFeePayment from "./pages/MeetingFeePayment";
import MiscPayment from "./pages/MiscPayment";
import EventPayment from "./pages/EventPayment";
import FundReports from "./pages/FundReports";

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    // Register PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => console.log('PWA registered'))
        .catch(error => console.log('PWA registration failed:', error));
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Developer Routes — nested inside DeveloperLayout */}
          <Route
            path="/developer"
            element={
              <ProtectedRoute requiredRole="developer">
                <DeveloperLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DeveloperDashboard />} />
            <Route path="eds" element={<DeveloperEDs />} />
            <Route path="subscriptions" element={<DeveloperSubscriptions />} />
            <Route path="settings" element={<DeveloperSettings />} />
            <Route path="superadmin/create" element={<CreateSuperAdmin />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Super Admin Routes */}
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute requiredRole="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Chapter Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <ChapterAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/members"
            element={
              <ProtectedRoute requiredRole="admin">
                <MembersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/meeting-hub"
            element={
              <ProtectedRoute requiredRole="admin">
                <MeetingManagementHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/meetings"
            element={
              <ProtectedRoute requiredRole="admin">
                <MeetingManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr-management"
            element={
              <ProtectedRoute requiredRole="admin">
                <QRManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr/:meetingId"
            element={
              <ProtectedRoute requiredRole="admin">
                <QRDisplay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute requiredRole="admin">
                <ReportsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance/:meetingId"
            element={
              <ProtectedRoute requiredRole="admin">
                <LiveAttendance />
              </ProtectedRoute>
            }
          />

          {/* Fund Management Routes */}
          <Route
            path="/admin/fund-hub"
            element={
              <ProtectedRoute requiredRole="admin">
                <FundManagementHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fund/kitty"
            element={
              <ProtectedRoute requiredRole="admin">
                <KittyPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fund/meetingfee"
            element={
              <ProtectedRoute requiredRole="admin">
                <MeetingFeePayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fund/misc"
            element={
              <ProtectedRoute requiredRole="admin">
                <MiscPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fund/events"
            element={
              <ProtectedRoute requiredRole="admin">
                <EventPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fund/reports"
            element={
              <ProtectedRoute requiredRole="admin">
                <FundReports />
              </ProtectedRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/attendance" element={<AttendanceForm />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      {/* Show PWA install prompt only on login and admin pages - NOT on attendance form */}
      {!window.location.pathname.startsWith('/attendance') && <InstallPWA />}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
