import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function CreateSuperAdmin() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    region: '',
    state: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/developer/superadmins', formData);
      toast.success('Executive Director created successfully!');
      navigate('/developer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create Super Admin');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/developer/dashboard')}
          className="text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="h-6 w-px bg-slate-700"></div>
        <div>
          <h1 className="text-lg font-bold">Add New Executive Director</h1>
          <p className="text-sm text-slate-400">Create a new Super Admin account</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-[#CF2030]/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-[#CF2030]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">ED Details</h2>
              <p className="text-sm text-slate-500">Fill in the details for the new Executive Director</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-slate-700 font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Enter full name"
                required
                className="mt-2 h-11"
              />
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="ed@example.com"
                  required
                  className="mt-2 h-11"
                />
              </div>
              <div>
                <Label htmlFor="mobile" className="text-slate-700 font-medium">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={handleChange('mobile')}
                  placeholder="9876543210"
                  required
                  className="mt-2 h-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  placeholder="Set a strong password"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">This will be used for Super Admin login (Login ID = mobile number)</p>
            </div>

            {/* Region & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region" className="text-slate-700 font-medium">
                  Region
                </Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={handleChange('region')}
                  placeholder="e.g., Central India"
                  className="mt-2 h-11"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-slate-700 font-medium">
                  State
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={handleChange('state')}
                  placeholder="e.g., Madhya Pradesh"
                  className="mt-2 h-11"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/developer/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#CF2030] hover:bg-[#A61926]"
                >
                  {loading ? 'Creating...' : 'Create Executive Director'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
