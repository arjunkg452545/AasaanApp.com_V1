import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Code2, Lock, Mail } from 'lucide-react';

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
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
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="text-center">
              <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-24 w-auto mx-auto rounded-lg shadow-md" />
              <h1 className="text-2xl font-bold text-slate-900 mt-3">Aasaan App</h1>
              <p className="text-slate-600 text-sm">Developer Console</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <Code2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Developer Access</span>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-slate-900">Developer Login</h2>
            <p className="text-slate-600 mb-8">Sign in to access the platform console</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aasaanapp.com"
                    required
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-slate-900 focus:ring-slate-900/20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:border-slate-900 focus:ring-slate-900/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In to Console'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-4">An SIPL Product</p>
        </div>
      </div>
    </div>
  );
}
