import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Settings, Mail, Lock, Phone, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Member login state
  const [memberMode, setMemberMode] = useState(false);
  const [memberMobile, setMemberMobile] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  // Accountant login state
  const [accountantMode, setAccountantMode] = useState(false);
  const [accMobile, setAccMobile] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accLoading, setAccLoading] = useState(false);

  // Developer login modal state
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devLoading, setDevLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = role === 'superadmin' ? '/superadmin/login' : '/admin/login';
      const response = await api.post(endpoint, { mobile, password });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('mobile', response.data.mobile);
      if (response.data.chapter_id) {
        localStorage.setItem('chapter_id', response.data.chapter_id);
      }
      if (response.data.chapter_name) {
        localStorage.setItem('chapter_name', response.data.chapter_name);
      }

      toast.success('Login successful!');

      if (response.data.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleAccountantLogin = async (e) => {
    e.preventDefault();
    setAccLoading(true);

    try {
      const response = await api.post('/accountant/login', {
        mobile: accMobile,
        password: accPassword,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'accountant');
      localStorage.setItem('accountant_id', response.data.accountant_id);
      localStorage.setItem('accountant_name', response.data.name);
      localStorage.setItem('superadmin_id', response.data.superadmin_id);

      toast.success('Welcome back!');
      navigate('/accountant/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setAccLoading(false);
    }
  };

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: 'var(--nm-bg)' }}>
      {/* Left hero panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1763739530672-4aadafbd81ff?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwzfHxidXNpbmVzcyUyMG5ldHdvcmtpbmclMjBtZWV0aW5nJTIwcHJvZmVzc2lvbmFsfGVufDB8fHx8MTc2NDg1ODg4OHww&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#CF2030]/85 backdrop-blur-sm"></div>
        <div className="relative z-10 flex items-center gap-4">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-20 w-auto rounded-xl" style={{ boxShadow: '6px 6px 12px rgba(0,0,0,0.3), -6px -6px 12px rgba(255,255,255,0.1)' }} />
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Aasaan App</h1>
            <p className="text-lg opacity-90">BNI Management System</p>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-lg opacity-90">
            Streamline your chapter meetings with instant QR-based attendance tracking
          </p>
          <p className="text-sm mt-2 opacity-75">An SIPL Product</p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex flex-col items-center justify-center p-8 relative" style={{ background: 'var(--nm-bg)' }}>
        {/* Theme toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="text-center">
              <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-24 w-auto mx-auto rounded-xl nm-raised p-1" />
              <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--nm-accent)', fontFamily: 'Outfit, sans-serif' }}>Aasaan App</h1>
              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>BNI Management System</p>
            </div>
          </div>

          {/* Main login card */}
          <div className="nm-raised rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--nm-text-primary)', fontFamily: 'Outfit, sans-serif' }}>Welcome Back</h2>
            <p className="mb-8" style={{ color: 'var(--nm-text-secondary)' }}>Sign in to manage your chapter</p>

            {/* Role toggle tabs */}
            <div className="flex gap-2 mb-6 p-1 nm-inset rounded-xl">
              <button
                data-testid="role-admin-btn"
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  role === 'admin'
                    ? 'nm-btn-primary text-white'
                    : 'text-[var(--nm-text-secondary)] hover:text-[var(--nm-text-primary)]'
                }`}
              >
                Chapter Admin
              </button>
              <button
                data-testid="role-superadmin-btn"
                type="button"
                onClick={() => setRole('superadmin')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  role === 'superadmin'
                    ? 'nm-btn-primary text-white'
                    : 'text-[var(--nm-text-secondary)] hover:text-[var(--nm-text-primary)]'
                }`}
              >
                Super Admin
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="mobile" style={{ color: 'var(--nm-text-primary)' }} className="font-medium">
                  Login ID
                </Label>
                <Input
                  data-testid="login-mobile-input"
                  id="mobile"
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter Login ID"
                  required
                  className="mt-2 h-11"
                />
              </div>

              <div>
                <Label htmlFor="password" style={{ color: 'var(--nm-text-primary)' }} className="font-medium">
                  Password
                </Label>
                <Input
                  data-testid="login-password-input"
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="mt-2 h-11"
                />
              </div>

              <Button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-11 text-white font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Member / Accountant Login Links */}
          {!memberMode && !accountantMode ? (
            <div className="flex items-center justify-center gap-4 mt-5">
              <button
                onClick={() => setMemberMode(true)}
                className="text-sm font-medium py-2 transition-colors"
                style={{ color: 'var(--nm-accent)' }}
              >
                Member Login
              </button>
              <span style={{ color: 'var(--nm-text-muted)' }}>|</span>
              <button
                onClick={() => setAccountantMode(true)}
                className="text-sm text-indigo-500 hover:text-indigo-700 font-medium py-2 transition-colors"
              >
                Accountant Login
              </button>
            </div>
          ) : memberMode ? (
            <div className="nm-raised rounded-2xl p-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Member Login</h3>
                <button
                  onClick={() => { setMemberMode(false); setMemberMobile(''); setMemberPassword(''); }}
                  className="flex items-center gap-1 text-sm"
                  style={{ color: 'var(--nm-text-muted)' }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Admin Login
                </button>
              </div>
              <form onSubmit={handleMemberLogin} className="space-y-4">
                <div>
                  <Label htmlFor="member-mobile" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">
                    Mobile Number
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                    <Input
                      id="member-mobile"
                      type="text"
                      value={memberMobile}
                      onChange={(e) => setMemberMobile(e.target.value)}
                      placeholder="Enter your mobile number"
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="member-password" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                    <Input
                      id="member-password"
                      type="password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={memberLoading}
                  className="w-full h-11 text-white font-medium"
                >
                  {memberLoading ? 'Signing in...' : 'Sign In as Member'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="nm-raised rounded-2xl p-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-indigo-400">Accountant Login</h3>
                <button
                  onClick={() => { setAccountantMode(false); setAccMobile(''); setAccPassword(''); }}
                  className="flex items-center gap-1 text-sm"
                  style={{ color: 'var(--nm-text-muted)' }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Admin Login
                </button>
              </div>
              <form onSubmit={handleAccountantLogin} className="space-y-4">
                <div>
                  <Label htmlFor="acc-mobile" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">
                    Mobile Number
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                    <Input
                      id="acc-mobile"
                      type="text"
                      value={accMobile}
                      onChange={(e) => setAccMobile(e.target.value)}
                      placeholder="Enter your mobile number"
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="acc-password" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                    <Input
                      id="acc-password"
                      type="password"
                      value={accPassword}
                      onChange={(e) => setAccPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={accLoading}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {accLoading ? 'Signing in...' : 'Sign In as Accountant'}
                </Button>
              </form>
            </div>
          )}

          <p className="text-center text-sm mt-5" style={{ color: 'var(--nm-text-muted)' }}>An SIPL Product</p>
        </div>

        {/* Hidden developer access gear icon */}
        <button
          onClick={() => setDevModalOpen(true)}
          className="absolute bottom-4 right-4 p-1 rounded-full transition-opacity duration-300 cursor-default"
          style={{ opacity: 0.08 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.25'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.08'; }}
          aria-label="Settings"
          tabIndex={-1}
        >
          <Settings style={{ width: 14, height: 14, color: 'var(--nm-text-muted)' }} />
        </button>

        {/* Developer Login Modal */}
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
                  <Label htmlFor="dev-email" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--nm-text-muted)' }} />
                    <Input
                      id="dev-email"
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder="Enter email"
                      required
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dev-password" style={{ color: 'var(--nm-text-primary)' }} className="text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--nm-text-muted)' }} />
                    <Input
                      id="dev-password"
                      type="password"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={devLoading}
                  className="w-full h-10 text-white text-sm font-medium"
                >
                  {devLoading ? 'Verifying...' : 'Authenticate'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
