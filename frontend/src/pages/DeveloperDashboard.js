import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  LogOut, Users, Building2, UserCheck, IndianRupee,
  Plus, Edit, Trash2, Code2, Search, ChevronRight
} from 'lucide-react';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';

export default function DeveloperDashboard() {
  const [stats, setStats] = useState({ total_eds: 0, total_chapters: 0, total_members: 0, total_revenue: 0 });
  const [superadmins, setSuperadmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSA, setSelectedSA] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', region: '', state: '' });
  const navigate = useNavigate();

  const devName = localStorage.getItem('dev_name') || 'Developer';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, saRes] = await Promise.all([
        api.get('/developer/dashboard/stats'),
        api.get('/developer/superadmins')
      ]);
      setStats(statsRes.data);
      setSuperadmins(saRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/developer/login');
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
      loadData();
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
    try {
      await api.put(`/developer/superadmins/${selectedSA.superadmin_id}`, editForm);
      toast.success('Super Admin updated successfully');
      setEditOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-10 w-auto rounded-lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Developer Console</h1>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                <Code2 className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
            <p className="text-sm text-slate-400">Welcome, {devName}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total EDs</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_eds}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Chapters</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_chapters}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-violet-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Members</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_members}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-violet-500" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Super Admins Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Executive Directors</h2>
            <p className="text-slate-500 mt-1">Manage Super Admins across all regions</p>
          </div>
          <Button
            onClick={() => navigate('/developer/superadmin/create')}
            className="bg-[#CF2030] hover:bg-[#A61926] shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New ED
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, mobile, email, region, state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Super Admins List */}
        <div className="space-y-3">
          {filteredSuperadmins.length === 0 ? (
            <Card className="p-12 text-center">
              <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">No Super Admins Found</h3>
              <p className="text-slate-500 mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first Executive Director'}
              </p>
            </Card>
          ) : (
            filteredSuperadmins.map((sa) => (
              <Card
                key={sa.superadmin_id}
                className={`p-5 hover:shadow-md transition-all ${!sa.is_active ? 'opacity-60 bg-slate-50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${sa.is_active ? 'bg-[#CF2030]/10' : 'bg-slate-200'}`}>
                      <UserCheck className={`h-6 w-6 ${sa.is_active ? 'text-[#CF2030]' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{sa.name || 'Unnamed'}</h3>
                        <Badge variant={sa.is_active ? 'default' : 'secondary'} className={`text-xs ${sa.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}`}>
                          {sa.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                        <span>{sa.mobile}</span>
                        {sa.email && <span>{sa.email}</span>}
                        {sa.region && <span>{sa.region}</span>}
                        {sa.state && <span>{sa.state}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right mr-2 hidden sm:block">
                      <p className="text-sm text-slate-500">Chapters</p>
                      <p className="text-xl font-bold text-slate-900">{sa.chapter_count || 0}</p>
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
                      className={sa.is_active ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'}
                    >
                      {sa.is_active ? <Trash2 className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
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
            <Button type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              Update Super Admin
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
