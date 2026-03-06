import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'sonner';
import { Settings, Mail, Lock, Phone, ArrowLeft, User } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();

  // Flip state
  const [flipped, setFlipped] = useState(false);

  // Member login state (front of card)
  const [memberMobile, setMemberMobile] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  // Admin login state (back of card)
  const [adminMobile, setAdminMobile] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Developer login modal state (gear icon — unchanged)
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  // ===== MEMBER LOGIN (front) =====
  const handleMemberLogin = async (e) => {
    e.preventDefault();
    setMemberLoading(true);
    try {
      const response = await api.post('/member/login', {
        mobile: memberMobile,
        password: memberPassword,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'member');
      localStorage.setItem('member_id', response.data.member_id);
      localStorage.setItem('member_name', response.data.member_name);
      localStorage.setItem('chapter_id', response.data.chapter_id);
      localStorage.setItem('chapter_name', response.data.chapter_name);
      toast.success('Welcome back!');
      navigate('/member/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setMemberLoading(false);
    }
  };

  // ===== ADMIN LOGIN (back) — unified endpoint =====
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const response = await api.post('/auth/admin-login', {
        login_id: adminMobile,
        password: adminPassword,
      });
      const { token, role, redirect, mobile, chapter_id, chapter_name, accountant_id, name, superadmin_id } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      if (mobile) localStorage.setItem('mobile', mobile);
      if (chapter_id) localStorage.setItem('chapter_id', chapter_id);
      if (chapter_name) localStorage.setItem('chapter_name', chapter_name);
      if (accountant_id) localStorage.setItem('accountant_id', accountant_id);
      if (name) localStorage.setItem('accountant_name', name);
      if (superadmin_id) localStorage.setItem('superadmin_id', superadmin_id);
      toast.success('Login successful!');
      navigate(redirect);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setAdminLoading(false);
    }
  };

  // ===== DEVELOPER LOGIN (gear icon modal — NO CHANGES) =====
  const handleDevLogin = async (e) => {
    e.preventDefault();
    setDevLoading(true);
    try {
      console.log('[DEV LOGIN] Full URL:', api.defaults.baseURL + '/developer/login');
      console.log('[DEV LOGIN] Payload:', { email: devEmail, password: '***' });
      const response = await api.post('/developer/login', { email: devEmail, password: devPassword });
      console.log('[DEV LOGIN] Success:', response.status);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('dev_email', response.data.email);
      localStorage.setItem('dev_name', response.data.name);
      toast.success('Access granted');
      setDevModalOpen(false);
      navigate('/developer/dashboard');
    } catch (error) {
      console.error('[DEV LOGIN] Error:', error);
      console.error('[DEV LOGIN] Response:', error.response);
      console.error('[DEV LOGIN] Request:', error.request);
      console.error('[DEV LOGIN] Message:', error.message);
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail[0]?.msg : null);
      toast.error(msg || error.message || 'Access denied');
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ background: 'var(--nm-bg)' }}>

      {/* Theme toggle — top-right of PAGE */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Logo + branding — centered above card */}
      <div className="flex flex-col items-center mb-6">
        <img
          src="/icons/aasaan-logo.png"
          alt="Aasaan App"
          className="h-20 w-auto rounded-xl nm-raised p-1 sm:h-24"
        />
        <h1
          className="text-2xl sm:text-3xl font-bold mt-3"
          style={{ color: 'var(--nm-accent)', fontFamily: 'Outfit, sans-serif' }}
        >
          Aasaan App
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
          BNI Management System
        </p>
      </div>

      {/* ===== FLIP CARD CONTAINER ===== */}
      <div
        className="w-full"
        style={{
          perspective: '1000px',
          maxWidth: 420,
          minWidth: 300,
        }}
      >
        <div
          style={{
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transformStyle: 'preserve-3d',
            position: 'relative',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ===== FRONT: Member Login ===== */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              position: 'relative',
              width: '100%',
            }}
          >
            <div className="nm-raised rounded-2xl p-8">
              {/* Admin flip trigger — top-right of card */}
              <button
                onClick={() => setFlipped(true)}
                className="absolute top-4 right-4 p-2 rounded-full transition-opacity duration-200"
                style={{ opacity: 0.4 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                title="Admin Login"
                type="button"
              >
                <User style={{ width: 18, height: 18, color: 'var(--nm-text-secondary)' }} />
              </button>

              <h2
                className="text-3xl font-bold mb-1"
                style={{ color: 'var(--nm-text-primary)', fontFamily: 'Outfit, sans-serif' }}
              >
                Welcome Back
              </h2>
              <p className="mb-6" style={{ color: 'var(--nm-text-secondary)' }}>
                Sign in to your chapter
              </p>

              <form onSubmit={handleMemberLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="member-mobile"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--nm-text-primary)' }}
                  >
                    Mobile Number / Member ID
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: 'var(--nm-text-muted)' }}
                    />
                    <input
                      id="member-mobile"
                      type="text"
                      value={memberMobile}
                      onChange={(e) => setMemberMobile(e.target.value)}
                      placeholder="Enter mobile number or ID"
                      required
                      className="nm-inset-input"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="member-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--nm-text-primary)' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: 'var(--nm-text-muted)' }}
                    />
                    <input
                      id="member-password"
                      type="password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="nm-inset-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={memberLoading}
                  className="nm-btn-login w-full"
                >
                  {memberLoading ? 'Signing in...' : 'Sign In as Member'}
                </button>
              </form>
            </div>
          </div>

          {/* ===== BACK: Admin Login ===== */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="nm-raised rounded-2xl p-8">
              {/* Back arrow — flip back to member */}
              <button
                onClick={() => setFlipped(false)}
                className="absolute top-4 right-4 p-2 rounded-full transition-opacity duration-200"
                style={{ opacity: 0.5 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                title="Back to Member Login"
                type="button"
              >
                <ArrowLeft style={{ width: 18, height: 18, color: 'var(--nm-text-secondary)' }} />
              </button>

              <h2
                className="text-3xl font-bold mb-1"
                style={{ color: 'var(--nm-text-primary)', fontFamily: 'Outfit, sans-serif' }}
              >
                Admin Login
              </h2>
              <p className="mb-6" style={{ color: 'var(--nm-text-secondary)' }}>
                SuperAdmin, Chapter Admin, or Accountant
              </p>

              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="admin-mobile"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--nm-text-primary)' }}
                  >
                    Mobile Number / Member ID
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: 'var(--nm-text-muted)' }}
                    />
                    <input
                      id="admin-mobile"
                      type="text"
                      value={adminMobile}
                      onChange={(e) => setAdminMobile(e.target.value)}
                      placeholder="Enter mobile number or ID"
                      required
                      className="nm-inset-input"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--nm-text-primary)' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{ color: 'var(--nm-text-muted)' }}
                    />
                    <input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="nm-inset-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="nm-btn-login w-full"
                >
                  {adminLoading ? 'Signing in...' : 'Admin Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* "An SIPL Product" — below card */}
      <p className="text-center text-sm mt-5" style={{ color: 'var(--nm-text-muted)' }}>
        An SIPL Product
      </p>

      {/* Hidden developer access gear icon — fixed bottom-right */}
      <button
        onClick={() => setDevModalOpen(true)}
        className="p-1 rounded-full transition-opacity duration-300 cursor-default"
        style={{ position: 'fixed', bottom: 12, right: 12, opacity: 0.15, zIndex: 10 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.35'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.15'; }}
        aria-label="Settings"
        tabIndex={-1}
      >
        <Settings style={{ width: 16, height: 16, color: 'var(--nm-text-muted)' }} />
      </button>

      {/* Developer Login Modal — EXACTLY AS ORIGINAL, NO CHANGES */}
      {devModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setDevModalOpen(false); setDevEmail(''); setDevPassword(''); }}
          />
          <div className="relative nm-raised-lg rounded-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg nm-pressed flex items-center justify-center" style={{ background: 'var(--nm-surface)' }}>
                  <Settings className="h-3.5 w-3.5" style={{ color: 'var(--nm-text-primary)' }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>System Access</span>
              </div>
              <button
                onClick={() => { setDevModalOpen(false); setDevEmail(''); setDevPassword(''); }}
                className="text-lg leading-none"
                style={{ color: 'var(--nm-text-muted)' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDevLogin} className="space-y-4">
              <div>
                <label htmlFor="dev-email" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--nm-text-muted)' }} />
                  <input
                    id="dev-email"
                    type="email"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="Enter email"
                    required
                    className="nm-inset-input text-sm"
                    style={{ paddingLeft: '2.25rem', height: '2.5rem' }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="dev-password" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--nm-text-muted)' }} />
                  <input
                    id="dev-password"
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="nm-inset-input text-sm"
                    style={{ paddingLeft: '2.25rem', height: '2.5rem' }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={devLoading}
                className="nm-btn-login w-full text-sm"
                style={{ height: '2.5rem' }}
              >
                {devLoading ? 'Verifying...' : 'Authenticate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
