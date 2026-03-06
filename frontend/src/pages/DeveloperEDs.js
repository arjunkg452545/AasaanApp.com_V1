import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Search, UserCheck, Building2,
  Phone, Mail, MapPin, Map, ChevronRight, Loader2
} from 'lucide-react';
import { toTitleCase } from '../utils/formatDate';

export default function DeveloperEDs() {
  const [superadmins, setSuperadmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSA, setSelectedSA] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', region: '', state: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSuperadmins();
  }, []);

  const loadSuperadmins = async () => {
    try {
      const res = await api.get('/developer/superadmins');
      setSuperadmins(res.data);
    } catch (error) {
      toast.error('Failed to load Executive Directors');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (sa) => {
    const action = sa.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${sa.name || sa.mobile}"?`)) return;

    try {
      if (sa.is_active) {
        await api.delete(`/developer/superadmins/${sa.superadmin_id}`);
      } else {
        await api.put(`/developer/superadmins/${sa.superadmin_id}`, { is_active: true });
      }
      toast.success(`Super Admin ${action}d successfully`);
      loadSuperadmins();
    } catch (error) {
      toast.error(`Failed to ${action} Super Admin`);
    }
  };

  const handleEdit = (sa) => {
    setSelectedSA(sa);
    setEditForm({
      name: sa.name || '',
      email: sa.email || '',
      mobile: sa.mobile || '',
      region: sa.region || '',
      state: sa.state || ''
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/developer/superadmins/${selectedSA.superadmin_id}`, editForm);
      toast.success('Super Admin updated successfully');
      setEditOpen(false);
      loadSuperadmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuperadmins = superadmins.filter(sa => {
    const q = searchQuery.toLowerCase();
    return (
      (sa.name || '').toLowerCase().includes(q) ||
      (sa.mobile || '').toLowerCase().includes(q) ||
      (sa.email || '').toLowerCase().includes(q) ||
      (sa.region || '').toLowerCase().includes(q) ||
      (sa.state || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: 'var(--nm-text-secondary)' }}>Loading Executive Directors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Executive Directors</h2>
          <p className="mt-1" style={{ color: 'var(--nm-text-secondary)' }}>Manage all Super Admins</p>
        </div>
        <Button
          onClick={() => navigate('/developer/superadmin/create')}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New ED
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
        <Input
          placeholder="Search by name, mobile, email, region, state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* EDs List */}
      <div className="space-y-3">
        {filteredSuperadmins.length === 0 ? (
          <Card className="p-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>No Executive Directors Found</h3>
            <p className="mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
              {searchQuery ? 'Try a different search term' : 'Create your first Executive Director'}
            </p>
          </Card>
        ) : (
          filteredSuperadmins.map((sa) => (
            <Card
              key={sa.superadmin_id}
              className={`p-5 hover:shadow-md transition-all ${!sa.is_active ? 'opacity-60' : ''}`}
              style={!sa.is_active ? { background: 'var(--nm-bg)' } : undefined}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${sa.is_active ? 'bg-[#CF2030]/10' : ''}`} style={!sa.is_active ? { background: 'var(--nm-border)' } : undefined}>
                    <UserCheck className={`h-6 w-6 ${sa.is_active ? 'text-[#CF2030]' : ''}`} style={!sa.is_active ? { color: 'var(--nm-text-muted)' } : undefined} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(sa.name) || 'No Name Set'}</h3>
                      <Badge
                        variant={sa.is_active ? 'default' : 'secondary'}
                        className={`text-xs ${sa.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}`}
                      >
                        {sa.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
                      {sa.mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {sa.mobile}
                        </span>
                      )}
                      {sa.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {sa.email}
                        </span>
                      )}
                      {sa.region && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {sa.region}
                        </span>
                      )}
                      {sa.state && (
                        <span className="flex items-center gap-1">
                          <Map className="h-3.5 w-3.5" />
                          {sa.state}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right mr-2 hidden sm:block">
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Chapters</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{sa.chapter_count || 0}</p>
                  </div>
                  <div className="sm:hidden">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {sa.chapter_count || 0} chapters
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(sa)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(sa)}
                    className={
                      sa.is_active
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                        : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                    }
                  >
                    {sa.is_active ? <Trash2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Super Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input
                value={editForm.mobile}
                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Region</Label>
                <Input
                  value={editForm.region}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? 'Updating...' : 'Update Super Admin'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
