import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Shield, Phone, Key, Eye, EyeOff, Save,
} from 'lucide-react';

export default function ManageAdmins() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [editForm, setEditForm] = useState({ new_mobile: '', new_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadChapters(); }, []);

  const loadChapters = async () => {
    try {
      const res = await api.get('/superadmin/chapters/overview');
      setChapters(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (chapter) => {
    setSelectedChapter(chapter);
    setEditForm({ new_mobile: chapter.admin_mobile || '', new_password: '' });
    setShowPassword(false);
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editForm.new_password) {
      toast.error('Password is required');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/superadmin/chapters/${selectedChapter.chapter_id}/credentials`, editForm);
      toast.success('Admin credentials updated');
      setEditOpen(false);
      loadChapters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/dashboard')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Manage Chapter Admins</h1>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-3">
        {chapters.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No chapters found</p>
          </Card>
        ) : (
          chapters.map((ch) => (
            <Card key={ch.chapter_id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-[#CF2030]/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-[#CF2030]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--nm-text-primary)' }}>{ch.name}</h3>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                      <Phone className="h-3 w-3" />
                      <span>Admin: {ch.admin_mobile || 'Not set'}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {ch.member_count || 0} members
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleEdit(ch)}
                  className="bg-[#CF2030] hover:bg-[#A61926] shrink-0"
                >
                  <Key className="h-3.5 w-3.5 mr-1" /> Reset Credentials
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby="edit-admin-desc">
          <DialogHeader>
            <DialogTitle>Update Admin Credentials</DialogTitle>
            <DialogDescription id="edit-admin-desc">
              Update mobile and password for {selectedChapter?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Admin Mobile</Label>
              <Input
                value={editForm.new_mobile}
                onChange={(e) => setEditForm({ ...editForm, new_mobile: e.target.value })}
                placeholder="Admin mobile number"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--nm-text-muted)' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Saving...' : 'Update Credentials'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
