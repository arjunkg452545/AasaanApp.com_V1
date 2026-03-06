import React, { useEffect, Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster, toast } from "./components/ui/sonner";

// Login loads immediately (entry point)
import Login from "./pages/Login";

// Lazy-loaded pages
const DeveloperLayout = lazy(() => import("./pages/DeveloperLayout"));
const DeveloperDashboard = lazy(() => import("./pages/DeveloperDashboard"));
const DeveloperEDs = lazy(() => import("./pages/DeveloperEDs"));
const DeveloperSubscriptions = lazy(() => import("./pages/DeveloperSubscriptions"));
const DeveloperSettings = lazy(() => import("./pages/DeveloperSettings"));
const CreateSuperAdmin = lazy(() => import("./pages/CreateSuperAdmin"));
const SuperAdminLayout = lazy(() => import("./pages/SuperAdminLayout"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const ChapterAdminLayout = lazy(() => import("./pages/ChapterAdminLayout"));
const ChapterAdminDashboard = lazy(() => import("./pages/ChapterAdminDashboard"));
const MembersManagement = lazy(() => import("./pages/MembersManagement"));
const MeetingManagement = lazy(() => import("./pages/MeetingManagement"));
const MeetingManagementHub = lazy(() => import("./pages/MeetingManagementHub"));
const QRManagement = lazy(() => import("./pages/QRManagement"));
const QRDisplay = lazy(() => import("./pages/QRDisplay"));
const ReportsManagement = lazy(() => import("./pages/ReportsManagement"));
const LiveAttendance = lazy(() => import("./pages/LiveAttendance"));
const AttendanceForm = lazy(() => import("./pages/AttendanceForm"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const MemberPendingApprovals = lazy(() => import("./pages/MemberPendingApprovals"));
const SuperAdminMembers = lazy(() => import("./pages/SuperAdminMembers"));
const ManageAdmins = lazy(() => import("./pages/ManageAdmins"));
const InstallPWA = lazy(() => import("./components/InstallPWA"));

// Member Portal
const MemberLayout = lazy(() => import("./pages/MemberLayout"));
const MemberDashboard = lazy(() => import("./pages/MemberDashboard"));
const MemberPayments = lazy(() => import("./pages/MemberPayments"));
const MemberPaymentDetail = lazy(() => import("./pages/MemberPaymentDetail"));
const MemberPaymentHistory = lazy(() => import("./pages/MemberPaymentHistory"));
const MemberMyProfile = lazy(() => import("./pages/MemberMyProfile"));
const MemberAttendance = lazy(() => import("./pages/MemberAttendance"));

// Payment Config
const PaymentConfig = lazy(() => import("./pages/PaymentConfig"));
const ChapterFeeConfig = lazy(() => import("./pages/ChapterFeeConfig"));

// Admin Verification
const AdminVerifyPayments = lazy(() => import("./pages/AdminVerifyPayments"));
const AdminManualEntry = lazy(() => import("./pages/AdminManualEntry"));

// Accountant
const AccountantLayout = lazy(() => import("./pages/AccountantLayout"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const AccountantApprovals = lazy(() => import("./pages/AccountantApprovals"));
const AccountantManagement = lazy(() => import("./pages/AccountantManagement"));

// Payment Reminders & Gateway
const PaymentReminders = lazy(() => import("./pages/PaymentReminders"));
const PaymentGatewaySetup = lazy(() => import("./pages/PaymentGatewaySetup"));

// Fund Management
const FundManagementHub = lazy(() => import("./pages/FundManagementHub"));
const KittyPayment = lazy(() => import("./pages/KittyPayment"));
const MeetingFeePayment = lazy(() => import("./pages/MeetingFeePayment"));
const MiscPayment = lazy(() => import("./pages/MiscPayment"));
const EventPayment = lazy(() => import("./pages/EventPayment"));
const FundReports = lazy(() => import("./pages/FundReports"));

// ─── Loading Spinner (neumorphic) ──────────────────────
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--nm-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="nm-raised rounded-2xl p-6 flex items-center justify-center">
          <div className="h-8 w-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--nm-accent)', borderTopColor: 'transparent' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Loading...</p>
      </div>
    </div>
  );
}

// ─── Error Boundary ────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--nm-bg)' }}>
          <div className="nm-raised rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--nm-text-primary)' }}>Something went wrong</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--nm-text-secondary)' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="nm-btn-primary px-6 py-3 rounded-xl text-sm font-semibold min-h-[48px]"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected Route ───────────────────────────────────
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  return children;
};

// ─── App ───────────────────────────────────────────────
function App() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(() => {});
    }

    // Online/offline detection
    const handleOnline = () => toast.success('You\'re back online', { duration: 3000 });
    const handleOffline = () => toast('You\'re offline', { duration: 5000, style: { background: '#FEFCE8', color: '#854D0E', border: '1px solid #FDE68A' } });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="aasaan-theme" enableSystem={false}>
    <ErrorBoundary>
    <div className="App">
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Developer Routes */}
          <Route path="/developer" element={<ProtectedRoute requiredRole="developer"><DeveloperLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DeveloperDashboard />} />
            <Route path="eds" element={<DeveloperEDs />} />
            <Route path="subscriptions" element={<DeveloperSubscriptions />} />
            <Route path="settings" element={<DeveloperSettings />} />
            <Route path="superadmin/create" element={<CreateSuperAdmin />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Super Admin Routes */}
          <Route path="/superadmin" element={<ProtectedRoute requiredRole="superadmin"><SuperAdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="members/pending" element={<MemberPendingApprovals />} />
            <Route path="members" element={<SuperAdminMembers />} />
            <Route path="payment-config" element={<PaymentConfig />} />
            <Route path="accountants" element={<AccountantManagement />} />
            <Route path="gateway-setup" element={<PaymentGatewaySetup />} />
            <Route path="manage-admins" element={<ManageAdmins />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Chapter Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><ChapterAdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<ChapterAdminDashboard />} />
            <Route path="members" element={<MembersManagement />} />
            <Route path="members/:memberId" element={<MemberProfile />} />
            <Route path="meeting-hub" element={<MeetingManagementHub />} />
            <Route path="meetings" element={<MeetingManagement />} />
            <Route path="qr-management" element={<QRManagement />} />
            <Route path="qr/:meetingId" element={<QRDisplay />} />
            <Route path="reports" element={<ReportsManagement />} />
            <Route path="attendance/:meetingId" element={<LiveAttendance />} />
            <Route path="fee-config" element={<ChapterFeeConfig />} />
            <Route path="verify-payments" element={<AdminVerifyPayments />} />
            <Route path="manual-entry" element={<AdminManualEntry />} />
            <Route path="reminders" element={<PaymentReminders />} />
            <Route path="fund-hub" element={<FundManagementHub />} />
            <Route path="fund/kitty" element={<KittyPayment />} />
            <Route path="fund/meetingfee" element={<MeetingFeePayment />} />
            <Route path="fund/misc" element={<MiscPayment />} />
            <Route path="fund/events" element={<EventPayment />} />
            <Route path="fund/reports" element={<FundReports />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Member Portal */}
          <Route path="/member" element={<ProtectedRoute requiredRole="member"><MemberLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="payments" element={<MemberPayments />} />
            <Route path="payments/:ledgerId" element={<MemberPaymentDetail />} />
            <Route path="history" element={<MemberPaymentHistory />} />
            <Route path="attendance" element={<MemberAttendance />} />
            <Route path="profile" element={<MemberMyProfile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Accountant Portal */}
          <Route path="/accountant" element={<ProtectedRoute requiredRole="accountant"><AccountantLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AccountantDashboard />} />
            <Route path="approvals" element={<AccountantApprovals />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Public Routes */}
          <Route path="/attendance" element={<AttendanceForm />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Suspense fallback={null}>
        {!window.location.pathname.startsWith('/attendance') && <InstallPWA />}
      </Suspense>
      <Toaster position="top-right" />
    </div>
    </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
