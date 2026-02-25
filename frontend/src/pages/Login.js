import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Settings, Mail, Lock, Phone, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div
        className="hidden lg:flex flex-col justify-between bg-[#CF2030] p-12 text-white relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1763739530672-4aadafbd81ff?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwzfHxidXNpbmVzcyUyMG5ldHdvcmtpbmclMjBtZWV0aW5nJTIwcHJvZmVzc2lvbmFsfGVufDB8fHx8MTc2NDg1ODg4OHww&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#CF2030]/90"></div>
        <div className="relative z-10 flex items-center gap-4">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-20 w-auto rounded-lg shadow-lg" />
          <div>
            <h1 className="text-4xl font-bold">Aasaan App</h1>
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

      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 relative">
        <div className="w-full max-w-md">
          {/* Mobile Logo - visible on small screens */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="text-center">
              <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-24 w-auto mx-auto rounded-lg shadow-md" />
              <h1 className="text-2xl font-bold text-[#CF2030] mt-3">Aasaan App</h1>
              <p className="text-slate-600 text-sm">BNI Management System</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-100">
            <h2 className="text-3xl font-bold mb-2 text-slate-900">Welcome Back</h2>
            <p className="text-slate-600 mb-8">Sign in to manage your chapter</p>

            <div className="flex gap-2 mb-6">
              <Button
                data-testid="role-admin-btn"
                type="button"
                variant={role === 'admin' ? 'default' : 'outline'}
                onClick={() => setRole('admin')}
                className="flex-1"
              >
                Chapter Admin
              </Button>
              <Button
                data-testid="role-superadmin-btn"
                type="button"
                variant={role === 'superadmin' ? 'default' : 'outline'}
                onClick={() => setRole('superadmin')}
                className="flex-1"
              >
                Super Admin
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="mobile" className="text-slate-700 font-medium">
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
                  className="mt-2 h-11 bg-slate-50 border-slate-200 focus:border-[#CF2030] focus:ring-[#CF2030]/20"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700 font-medium">
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
                  className="mt-2 h-11 bg-slate-50 border-slate-200 focus:border-[#CF2030] focus:ring-[#CF2030]/20"
                />
              </div>

              <Button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#CF2030] hover:bg-[#A61926] text-white font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>

          {/* Member / Accountant Login Links */}
          {!memberMode && !accountantMode ? (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setMemberMode(true)}
                className="text-sm text-[#CF2030] hover:text-[#A61926] font-medium py-2 transition-colors"
              >
                Member Login
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setAccountantMode(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium py-2 transition-colors"
              >
                Accountant Login
              </button>
            </div>
          ) : memberMode ? (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Member Login</h3>
                <button
                  onClick={() => { setMemberMode(false); setMemberMobile(''); setMemberPassword(''); }}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Admin Login
                </button>
              </div>
              <form onSubmit={handleMemberLogin} className="space-y-4">
                <div>
                  <Label htmlFor="member-mobile" className="text-slate-700 text-sm font-medium">
                    Mobile Number
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="member-mobile"
                      type="text"
                      value={memberMobile}
                      onChange={(e) => setMemberMobile(e.target.value)}
                      placeholder="Enter your mobile number"
                      required
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-[#CF2030] focus:ring-[#CF2030]/20"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="member-password" className="text-slate-700 text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="member-password"
                      type="password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-[#CF2030] focus:ring-[#CF2030]/20"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={memberLoading}
                  className="w-full h-11 bg-[#CF2030] hover:bg-[#A61926] text-white font-medium"
                >
                  {memberLoading ? 'Signing in...' : 'Sign In as Member'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-indigo-900">Accountant Login</h3>
                <button
                  onClick={() => { setAccountantMode(false); setAccMobile(''); setAccPassword(''); }}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Admin Login
                </button>
              </div>
              <form onSubmit={handleAccountantLogin} className="space-y-4">
                <div>
                  <Label htmlFor="acc-mobile" className="text-slate-700 text-sm font-medium">
                    Mobile Number
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="acc-mobile"
                      type="text"
                      value={accMobile}
                      onChange={(e) => setAccMobile(e.target.value)}
                      placeholder="Enter your mobile number"
                      required
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="acc-password" className="text-slate-700 text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="acc-password"
                      type="password"
                      value={accPassword}
                      onChange={(e) => setAccPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
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

          <p className="text-center text-sm text-slate-500 mt-4">An SIPL Product</p>
        </div>

        {/* Hidden developer access gear icon - nearly invisible */}
        <button
          onClick={() => setDevModalOpen(true)}
          className="absolute bottom-4 right-4 p-1 rounded-full transition-opacity duration-300 cursor-default"
          style={{ opacity: 0.08 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.25'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.08'; }}
          aria-label="Settings"
          tabIndex={-1}
        >
          <Settings className="text-slate-400" style={{ width: 14, height: 14 }} />
        </button>

        {/* Developer Login Modal - Overlay */}
        {devModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => { setDevModalOpen(false); setDevEmail(''); setDevPassword(''); }}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-slate-900 flex items-center justify-center">
                    <Settings className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">System Access</span>
                </div>
                <button
                  onClick={() => { setDevModalOpen(false); setDevEmail(''); setDevPassword(''); }}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleDevLogin} className="space-y-4">
                <div>
                  <Label htmlFor="dev-email" className="text-slate-700 text-sm font-medium">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="dev-email"
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder="Enter email"
                      required
                      className="pl-9 h-10 text-sm bg-slate-50 border-slate-200 focus:border-slate-900 focus:ring-slate-900/20"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="dev-password" className="text-slate-700 text-sm font-medium">Password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="dev-password"
                      type="password"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pl-9 h-10 text-sm bg-slate-50 border-slate-200 focus:border-slate-900 focus:ring-slate-900/20"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={devLoading}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"
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