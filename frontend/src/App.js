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
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
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
const InstallPWA = lazy(() => import("./components/InstallPWA"));

// Member Portal
const MemberLayout = lazy(() => import("./pages/MemberLayout"));
const MemberDashboard = lazy(() => import("./pages/MemberDashboard"));
const MemberPayments = lazy(() => import("./pages/MemberPayments"));
const MemberPaymentDetail = lazy(() => import("./pages/MemberPaymentDetail"));
const MemberPaymentHistory = lazy(() => import("./pages/MemberPaymentHistory"));
const MemberMyProfile = lazy(() => import("./pages/MemberMyProfile"));

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
          <Route path="/superadmin/dashboard" element={<ProtectedRoute requiredRole="superadmin"><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/members/pending" element={<ProtectedRoute requiredRole="superadmin"><MemberPendingApprovals /></ProtectedRoute>} />
          <Route path="/superadmin/members" element={<ProtectedRoute requiredRole="superadmin"><SuperAdminMembers /></ProtectedRoute>} />
          <Route path="/superadmin/payment-config" element={<ProtectedRoute requiredRole="superadmin"><PaymentConfig /></ProtectedRoute>} />
          <Route path="/superadmin/accountants" element={<ProtectedRoute requiredRole="superadmin"><AccountantManagement /></ProtectedRoute>} />
          <Route path="/superadmin/gateway-setup" element={<ProtectedRoute requiredRole="superadmin"><PaymentGatewaySetup /></ProtectedRoute>} />

          {/* Chapter Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><ChapterAdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/members" element={<ProtectedRoute requiredRole="admin"><MembersManagement /></ProtectedRoute>} />
          <Route path="/admin/members/:memberId" element={<ProtectedRoute requiredRole="admin"><MemberProfile /></ProtectedRoute>} />
          <Route path="/admin/meeting-hub" element={<ProtectedRoute requiredRole="admin"><MeetingManagementHub /></ProtectedRoute>} />
          <Route path="/admin/meetings" element={<ProtectedRoute requiredRole="admin"><MeetingManagement /></ProtectedRoute>} />
          <Route path="/admin/qr-management" element={<ProtectedRoute requiredRole="admin"><QRManagement /></ProtectedRoute>} />
          <Route path="/admin/qr/:meetingId" element={<ProtectedRoute requiredRole="admin"><QRDisplay /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><ReportsManagement /></ProtectedRoute>} />
          <Route path="/admin/attendance/:meetingId" element={<ProtectedRoute requiredRole="admin"><LiveAttendance /></ProtectedRoute>} />
          <Route path="/admin/fee-config" element={<ProtectedRoute requiredRole="admin"><ChapterFeeConfig /></ProtectedRoute>} />
          <Route path="/admin/verify-payments" element={<ProtectedRoute requiredRole="admin"><AdminVerifyPayments /></ProtectedRoute>} />
          <Route path="/admin/manual-entry" element={<ProtectedRoute requiredRole="admin"><AdminManualEntry /></ProtectedRoute>} />
          <Route path="/admin/reminders" element={<ProtectedRoute requiredRole="admin"><PaymentReminders /></ProtectedRoute>} />

          {/* Fund Management */}
          <Route path="/admin/fund-hub" element={<ProtectedRoute requiredRole="admin"><FundManagementHub /></ProtectedRoute>} />
          <Route path="/admin/fund/kitty" element={<ProtectedRoute requiredRole="admin"><KittyPayment /></ProtectedRoute>} />
          <Route path="/admin/fund/meetingfee" element={<ProtectedRoute requiredRole="admin"><MeetingFeePayment /></ProtectedRoute>} />
          <Route path="/admin/fund/misc" element={<ProtectedRoute requiredRole="admin"><MiscPayment /></ProtectedRoute>} />
          <Route path="/admin/fund/events" element={<ProtectedRoute requiredRole="admin"><EventPayment /></ProtectedRoute>} />
          <Route path="/admin/fund/reports" element={<ProtectedRoute requiredRole="admin"><FundReports /></ProtectedRoute>} />

          {/* Member Portal */}
          <Route path="/member" element={<ProtectedRoute requiredRole="member"><MemberLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="payments" element={<MemberPayments />} />
            <Route path="payments/:ledgerId" element={<MemberPaymentDetail />} />
            <Route path="history" element={<MemberPaymentHistory />} />
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
