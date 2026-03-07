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
const SuperAdminMembers = lazy(() => import("./pages/SuperAdminMembers"));
const ManageAdmins = lazy(() => import("./pages/ManageAdmins"));
const SuperAdminReports = lazy(() => import("./pages/SuperAdminReports"));
const AttendanceForm = lazy(() => import("./pages/AttendanceForm"));
const InstallPWA = lazy(() => import("./components/InstallPWA"));

// Unified member+admin layout
const UnifiedMemberLayout = lazy(() => import("./pages/UnifiedMemberLayout"));
const UnifiedHome = lazy(() => import("./pages/UnifiedHome"));

// Member pages (personal)
const MemberPayments = lazy(() => import("./pages/MemberPayments"));
const MemberPaymentDetail = lazy(() => import("./pages/MemberPaymentDetail"));
const MemberPaymentHistory = lazy(() => import("./pages/MemberPaymentHistory"));
const MemberMyProfile = lazy(() => import("./pages/MemberMyProfile"));
const MemberAttendance = lazy(() => import("./pages/MemberAttendance"));

// Admin pages (chapter management)
const MembersManagement = lazy(() => import("./pages/MembersManagement"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const MeetingManagement = lazy(() => import("./pages/MeetingManagement"));
const MeetingManagementHub = lazy(() => import("./pages/MeetingManagementHub"));
const QRManagement = lazy(() => import("./pages/QRManagement"));
const QRDisplay = lazy(() => import("./pages/QRDisplay"));
const ReportsManagement = lazy(() => import("./pages/ReportsManagement"));
const LiveAttendance = lazy(() => import("./pages/LiveAttendance"));
const ChapterFeeConfig = lazy(() => import("./pages/ChapterFeeConfig"));
const AdminVerifyPayments = lazy(() => import("./pages/AdminVerifyPayments"));
const AdminManualEntry = lazy(() => import("./pages/AdminManualEntry"));
const PaymentReminders = lazy(() => import("./pages/PaymentReminders"));
const FundManagementHub = lazy(() => import("./pages/FundManagementHub"));
const KittyPayment = lazy(() => import("./pages/KittyPayment"));
const MeetingFeePayment = lazy(() => import("./pages/MeetingFeePayment"));
const MiscPayment = lazy(() => import("./pages/MiscPayment"));
const EventPayment = lazy(() => import("./pages/EventPayment"));
const FundReports = lazy(() => import("./pages/FundReports"));
const VisitorManagement = lazy(() => import("./pages/VisitorManagement"));
const MemberPendingApprovals = lazy(() => import("./pages/MemberPendingApprovals"));

// Super Admin specific
const PaymentConfig = lazy(() => import("./pages/PaymentConfig"));
const PaymentGatewaySetup = lazy(() => import("./pages/PaymentGatewaySetup"));
const AccountantManagement = lazy(() => import("./pages/AccountantManagement"));

// Accountant
const AccountantLayout = lazy(() => import("./pages/AccountantLayout"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const AccountantApprovals = lazy(() => import("./pages/AccountantApprovals"));
const AccountantReports = lazy(() => import("./pages/AccountantReports"));

// Audit
const AuditLog = lazy(() => import("./pages/AuditLog"));

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
            <div className="text-4xl mb-4">&#9888;&#65039;</div>
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
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
};

// ─── App ───────────────────────────────────────────────
function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
    const handleOnline = () => toast.success('You\'re back online', { duration: 3000 });
    const handleOffline = () => toast('You\'re offline', { duration: 5000, style: { background: '#FEFCE8', color: '#854D0E', border: '1px solid #FDE68A' } });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="aasaan-theme" enableSystem={false}>
    <ErrorBoundary>
    <div className="App">
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Developer Routes (unchanged) */}
          <Route path="/developer" element={<ProtectedRoute allowedRoles={["developer"]}><DeveloperLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DeveloperDashboard />} />
            <Route path="eds" element={<DeveloperEDs />} />
            <Route path="subscriptions" element={<DeveloperSubscriptions />} />
            <Route path="settings" element={<DeveloperSettings />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="superadmin/create" element={<CreateSuperAdmin />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Super Admin Routes (unchanged) */}
          <Route path="/superadmin" element={<ProtectedRoute allowedRoles={["superadmin"]}><SuperAdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="members/pending" element={<MemberPendingApprovals />} />
            <Route path="members" element={<SuperAdminMembers />} />
            <Route path="payment-config" element={<PaymentConfig />} />
            <Route path="accountants" element={<AccountantManagement />} />
            <Route path="gateway-setup" element={<PaymentGatewaySetup />} />
            <Route path="manage-admins" element={<ManageAdmins />} />
            <Route path="reports" element={<SuperAdminReports />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ===== UNIFIED /app/* — ALL members + role holders ===== */}
          <Route path="/app" element={<ProtectedRoute allowedRoles={["member", "admin"]}><UnifiedMemberLayout /></ProtectedRoute>}>
            {/* Personal (everyone) */}
            <Route path="home" element={<UnifiedHome />} />
            <Route path="my-payments" element={<MemberPayments />} />
            <Route path="my-payments/:ledgerId" element={<MemberPaymentDetail />} />
            <Route path="my-history" element={<MemberPaymentHistory />} />
            <Route path="my-attendance" element={<MemberAttendance />} />
            <Route path="my-profile" element={<MemberMyProfile />} />
            {/* Chapter admin (role holders) */}
            <Route path="members" element={<MembersManagement />} />
            <Route path="members/:memberId" element={<MemberProfile />} />
            <Route path="meetings" element={<MeetingManagementHub />} />
            <Route path="meetings/list" element={<MeetingManagement />} />
            <Route path="meetings/qr" element={<QRManagement />} />
            <Route path="meetings/qr/:meetingId" element={<QRDisplay />} />
            <Route path="meetings/attendance/:meetingId" element={<LiveAttendance />} />
            <Route path="fund-hub" element={<FundManagementHub />} />
            <Route path="fund/kitty" element={<KittyPayment />} />
            <Route path="fund/meetingfee" element={<MeetingFeePayment />} />
            <Route path="fund/misc" element={<MiscPayment />} />
            <Route path="fund/events" element={<EventPayment />} />
            <Route path="fund/reports" element={<FundReports />} />
            <Route path="verify-payments" element={<AdminVerifyPayments />} />
            <Route path="manual-entry" element={<AdminManualEntry />} />
            <Route path="reports" element={<ReportsManagement />} />
            <Route path="visitors" element={<VisitorManagement />} />
            <Route path="reminders" element={<PaymentReminders />} />
            <Route path="settings" element={<ChapterFeeConfig />} />
            <Route index element={<Navigate to="home" replace />} />
          </Route>

          {/* Backward-compatible redirects */}
          <Route path="/member/dashboard" element={<Navigate to="/app/home" replace />} />
          <Route path="/member/payments/*" element={<Navigate to="/app/my-payments" replace />} />
          <Route path="/member/history" element={<Navigate to="/app/my-history" replace />} />
          <Route path="/member/attendance" element={<Navigate to="/app/my-attendance" replace />} />
          <Route path="/member/profile" element={<Navigate to="/app/my-profile" replace />} />
          <Route path="/member" element={<Navigate to="/app/home" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/app/home" replace />} />
          <Route path="/admin/members" element={<Navigate to="/app/members" replace />} />
          <Route path="/admin/meeting-hub" element={<Navigate to="/app/meetings" replace />} />
          <Route path="/admin/meetings" element={<Navigate to="/app/meetings/list" replace />} />
          <Route path="/admin/fund-hub" element={<Navigate to="/app/fund-hub" replace />} />
          <Route path="/admin/reports" element={<Navigate to="/app/reports" replace />} />
          <Route path="/admin/visitors" element={<Navigate to="/app/visitors" replace />} />
          <Route path="/admin/reminders" element={<Navigate to="/app/reminders" replace />} />
          <Route path="/admin/fee-config" element={<Navigate to="/app/settings" replace />} />
          <Route path="/admin" element={<Navigate to="/app/home" replace />} />

          {/* Accountant Portal (unchanged) */}
          <Route path="/accountant" element={<ProtectedRoute allowedRoles={["accountant"]}><AccountantLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AccountantDashboard />} />
            <Route path="approvals" element={<AccountantApprovals />} />
            <Route path="reports" element={<AccountantReports />} />
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
