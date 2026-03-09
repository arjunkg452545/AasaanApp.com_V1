import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ForceResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  // If no token, redirect to login
  useEffect(() => {
    if (!token) navigate('/', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Pick endpoint based on role
      const endpoint = (role === 'superadmin' || role === 'accountant')
        ? '/auth/staff-force-reset'
        : '/member/force-reset-password';

      await api.post(endpoint, { new_password: newPassword });
      toast.success('Password changed successfully!');

      // Determine redirect
      if (role === 'developer') {
        navigate('/developer/dashboard', { replace: true });
      } else if (role === 'superadmin') {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (role === 'accountant') {
        navigate('/accountant/dashboard', { replace: true });
      } else {
        navigate('/app/home', { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: 'var(--nm-bg)' }}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-16 w-auto rounded-xl nm-raised p-1" />
      </div>

      <div className="w-full" style={{ maxWidth: 400 }}>
        <div className="nm-raised rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="nm-raised rounded-xl p-3 inline-flex mb-3">
              <ShieldAlert className="h-6 w-6" style={{ color: '#f59e0b' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Change Your Password</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--nm-text-secondary)' }}>
              You must set a new password before continuing. Choose something secure that you'll remember.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nm-text-primary)' }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--nm-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  className="nm-inset-input"
                  style={{ paddingRight: '2.75rem' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg"
                  style={{ color: 'var(--nm-text-muted)', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nm-text-primary)' }}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--nm-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="nm-inset-input"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Passwords do not match</p>
              )}
            </div>

            <div className="nm-pressed rounded-xl p-3">
              <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                Password must be at least 6 characters. Use a mix of letters, numbers, and symbols for best security.
              </p>
            </div>

            <button type="submit" disabled={loading} className="nm-btn-login w-full">
              {loading ? 'Setting Password...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
