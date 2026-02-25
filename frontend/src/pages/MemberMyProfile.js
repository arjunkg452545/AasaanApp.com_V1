import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, User, Phone, Mail, Building2, Calendar,
  Lock, Save, Eye, EyeOff,
} from 'lucide-react';

export default function MemberMyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Change password
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line

  const loadProfile = async () => {
    try {
      const res = await api.get('/member/profile');
      setProfile(res.data);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/member/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900">My Profile</h1>

      {/* Profile Card */}
      <Card className="p-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-[#CF2030]/10 flex items-center justify-center">
            <span className="text-xl font-bold text-[#CF2030]">
              {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm text-slate-500">{profile.chapter_name}</p>
            <Badge className="mt-1 bg-emerald-100 text-emerald-700 text-xs">
              {profile.membership_status || 'active'}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <InfoRow icon={User} label="Member ID" value={profile.unique_member_id} />
          <InfoRow icon={Phone} label="Mobile" value={profile.primary_mobile} />
          {profile.email && <InfoRow icon={Mail} label="Email" value={profile.email} />}
          {profile.business_name && <InfoRow icon={Building2} label="Business" value={profile.business_name} />}
          {profile.business_category && <InfoRow icon={Building2} label="Category" value={profile.business_category} />}
          {profile.joining_date && <InfoRow icon={Calendar} label="Joined" value={profile.joining_date} />}
          {profile.renewal_date && <InfoRow icon={Calendar} label="Renewal" value={profile.renewal_date} />}
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-600" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={changingPassword}
            className="bg-[#CF2030] hover:bg-[#A61926]"
          >
            <Save className="h-4 w-4 mr-2" />
            {changingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
