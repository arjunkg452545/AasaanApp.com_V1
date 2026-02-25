import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      <div className="flex items-center justify-center p-8 bg-slate-50">
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
          
          <p className="text-center text-sm text-slate-500 mt-4">An SIPL Product</p>
        </div>
      </div>
    </div>
  );
}