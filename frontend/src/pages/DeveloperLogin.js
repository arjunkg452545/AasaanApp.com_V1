import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Code2, Lock, Mail } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function DeveloperLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/developer/login', { email, password });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('dev_email', response.data.email);
      localStorage.setItem('dev_name', response.data.name);

      toast.success('Developer login successful!');
      navigate('/developer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2" style={{ background: 'var(--nm-bg)' }}>
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#CF2030] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-20 w-auto rounded-lg shadow-lg" />
          <div>
            <h1 className="text-4xl font-bold">Aasaan App</h1>
            <p className="text-lg opacity-90">Developer Console</p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Code2 className="h-8 w-8 text-[#CF2030]" />
            <h2 className="text-2xl font-semibold">Platform Administration</h2>
          </div>
          <p className="text-lg opacity-80">
            Manage Executive Directors, monitor chapters, and oversee the entire BNI platform from one place.
          </p>
          <p className="text-sm mt-4 opacity-50">An SIPL Product</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-8 relative" style={{ background: 'var(--nm-bg)' }}>
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="text-center">
              <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-24 w-auto mx-auto rounded-lg shadow-md" />
              <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--nm-text-primary)' }}>Aasaan App</h1>
              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Developer Console</p>
            </div>
          </div>

          <div className="nm-raised rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg nm-pressed flex items-center justify-center" style={{ color: 'var(--nm-accent)' }}>
                <Code2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--nm-text-muted)' }}>Developer Access</span>
            </div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--nm-text-primary)' }}>Developer Login</h2>
            <p className="mb-8" style={{ color: 'var(--nm-text-secondary)' }}>Sign in to access the platform console</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aasaanapp.com"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                  Password
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#CF2030] hover:bg-[#A61926] text-white font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In to Console'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm mt-4" style={{ color: 'var(--nm-text-muted)' }}>An SIPL Product</p>
        </div>
      </div>
    </div>
  );
}
