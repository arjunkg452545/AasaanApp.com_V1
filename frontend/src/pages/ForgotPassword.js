import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'sonner';
import { Phone, Mail, Lock, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const STEPS = { MOBILE: 0, OTP: 1, RESET: 2, DONE: 3 };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.MOBILE);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [mobile, setMobile] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Step 2
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Step 3
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { mobile });
      setMaskedEmail(res.data.masked_email || '');
      toast.success('OTP sent to your registered email');
      setStep(STEPS.OTP);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { mobile, otp });
      setResetToken(res.data.reset_token);
      toast.success('OTP verified');
      setStep(STEPS.RESET);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
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
      await api.post('/auth/reset-password', { mobile, reset_token: resetToken, new_password: newPassword });
      toast.success('Password reset successfully!');
      setStep(STEPS.DONE);
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
        <h1 className="text-xl font-bold mt-3" style={{ color: 'var(--nm-accent)' }}>Forgot Password</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>Reset your account password</p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: step >= s ? 32 : 8,
              background: step >= s ? 'var(--nm-accent)' : 'var(--nm-border)',
            }}
          />
        ))}
      </div>

      <div className="w-full" style={{ maxWidth: 400 }}>
        <div className="nm-raised rounded-2xl p-8">

          {/* Step 1: Enter Mobile */}
          {step === STEPS.MOBILE && (
            <form onSubmit={handleRequestOTP} className="space-y-5">
              <div className="text-center mb-4">
                <div className="nm-raised rounded-xl p-3 inline-flex mb-3">
                  <Phone className="h-6 w-6" style={{ color: 'var(--nm-accent)' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Enter Mobile Number</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--nm-text-muted)' }}>
                  We'll send an OTP to your registered email
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nm-text-primary)' }}>
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--nm-text-muted)' }} />
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter your registered mobile"
                    required
                    className="nm-inset-input"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="nm-btn-login w-full">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === STEPS.OTP && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center mb-4">
                <div className="nm-raised rounded-xl p-3 inline-flex mb-3">
                  <Mail className="h-6 w-6" style={{ color: 'var(--nm-accent)' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Verify OTP</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--nm-text-muted)' }}>
                  OTP sent to {maskedEmail || 'your email'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nm-text-primary)' }}>
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  required
                  maxLength={6}
                  className="nm-inset-input text-center text-2xl tracking-[0.5em] font-bold"
                  style={{ letterSpacing: '0.5em' }}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} className="nm-btn-login w-full">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(STEPS.MOBILE); setOtp(''); }}
                className="w-full text-sm text-center py-2"
                style={{ color: 'var(--nm-text-muted)' }}
              >
                Resend OTP
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === STEPS.RESET && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-4">
                <div className="nm-raised rounded-xl p-3 inline-flex mb-3">
                  <Lock className="h-6 w-6" style={{ color: 'var(--nm-accent)' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Set New Password</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--nm-text-muted)' }}>
                  Choose a strong password (min 6 characters)
                </p>
              </div>
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
              </div>
              <button type="submit" disabled={loading} className="nm-btn-login w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === STEPS.DONE && (
            <div className="text-center py-4">
              <div className="nm-raised rounded-xl p-4 inline-flex mb-4">
                <ShieldCheck className="h-10 w-10" style={{ color: '#22c55e' }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--nm-text-primary)' }}>Password Reset!</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--nm-text-secondary)' }}>
                Your password has been changed. You can now login with your new password.
              </p>
              <button onClick={() => navigate('/')} className="nm-btn-login w-full">
                Go to Login
              </button>
            </div>
          )}
        </div>

        {/* Back to login link */}
        {step !== STEPS.DONE && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 w-full mt-4 py-2 text-sm"
            style={{ color: 'var(--nm-text-muted)' }}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </button>
        )}
      </div>
    </div>
  );
}
