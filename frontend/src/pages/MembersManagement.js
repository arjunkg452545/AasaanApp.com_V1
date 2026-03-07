import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus, ArrowLeft, Edit, Upload, Download,
  Search, Users, UserCheck, UserX, Clock, AlertTriangle,
  FileDown, Loader2, Shield, ChevronRight, MessageCircle, Crown,
} from 'lucide-react';
import { toTitleCase } from '../utils/formatDate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

const STAT_CARDS = [
  { key: 'total', label: 'Total', icon: Users, color: 'text-slate-700', bg: 'bg-slate-100', filter: '' },
  { key: 'active', label: 'Active', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100', filter: 'active' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', filter: 'pending' },
  { key: 'inactive', label: 'Inactive', icon: UserX, color: 'text-slate-500', bg: 'bg-slate-100', filter: 'inactive' },
  { key: 'suspended', label: 'Suspended', icon: Shield, color: 'text-red-600', bg: 'bg-red-100', filter: 'suspended' },
];

export default function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0, suspended: 0, expiring_soon: 0 });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const emptyForm = {
    unique_member_id: '',
    full_name: '',
    primary_mobile: '',
    secondary_mobile: '',
    email: '',
    business_name: '',
    business_category: '',
    joining_date: '',
    renewal_date: '',
    induction_fee: '',
    status: 'Active',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [statusAction, setStatusAction] = useState('deactivate');
  const [statusReason, setStatusReason] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('member');
  const [roleWarning, setRoleWarning] = useState('');

  // ---- Data Loading ----
  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const loadData = async () => {
    try {
      const [membersRes, statsRes] = await Promise.all([
        api.get('/admin/members'),
        api.get('/admin/members/stats'),
      ]);
      setMembers(membersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // ---- Client-side search/filter ----
  const filteredMembers = useMemo(() => {
    let result = members;
    if (statusFilter) {
      result = result.filter(m => m.membership_status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.primary_mobile || '').includes(q) ||
        (m.business_name || '').toLowerCase().includes(q) ||
        (m.unique_member_id || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [members, statusFilter, searchQuery]);

  // ---- CRUD ----
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.induction_fee) payload.induction_fee = parseFloat(payload.induction_fee);
      else delete payload.induction_fee;
      // Remove empty optional fields
      Object.keys(payload).forEach(k => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
      });
      await api.post('/admin/members', payload);
      const isAdmin = localStorage.getItem('role') === 'admin';
      toast.success(isAdmin ? 'Member added. Pending ED approval.' : 'Member added successfully');
      setCreateOpen(false);
      setFormData(emptyForm);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.induction_fee) payload.induction_fee = parseFloat(payload.induction_fee);
      else delete payload.induction_fee;
      await api.put(`/admin/members/${selectedMember.member_id}`, payload);
      toast.success('Member updated successfully');
      setEditOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to update member');
    }
  };

  const handleStatusChange = async () => {
    if (!statusReason.trim()) { toast.error('Reason is required'); return; }
    try {
      await api.post(`/admin/members/${selectedMember.member_id}/status`, {
        action: statusAction,
        reason: statusReason,
      });
      toast.success(`Member ${statusAction}d successfully`);
      setStatusOpen(false);
      setStatusReason('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change status');
    }
  };

  const handleRoleChange = async () => {
    try {
      const res = await api.put(`/admin/members/${selectedMember.member_id}/role`, {
        chapter_role: selectedRole,
      });
      toast.success(res.data.message || 'Role updated');
      setRoleOpen(false);
      setRoleWarning('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  // ---- Excel ----
  const downloadTemplate = async () => {
    try {
      const response = await api.get('/admin/members/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded');
    } catch { toast.error('Failed to download template'); }
  };

  const exportMembers = async () => {
    try {
      const response = await api.get('/admin/members/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch { toast.error('Failed to export'); }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) { toast.error('Please select a file'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', uploadFile);
    try {
      const response = await api.post('/admin/members/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(response.data.message);
      setUploadOpen(false);
      setUploadFile(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); }
  };

  // ---- Form Fields Component ----
  const MemberFormFields = ({ isEdit = false }) => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Member ID *</Label>
          <Input value={formData.unique_member_id}
            onChange={(e) => setFormData({ ...formData, unique_member_id: e.target.value })}
            placeholder="01" required />
        </div>
        <div>
          <Label>Full Name *</Label>
          <Input value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Primary Mobile *</Label>
          <Input value={formData.primary_mobile}
            onChange={(e) => setFormData({ ...formData, primary_mobile: e.target.value })}
            required />
        </div>
        <div>
          <Label>Secondary Mobile</Label>
          <Input value={formData.secondary_mobile}
            onChange={(e) => setFormData({ ...formData, secondary_mobile: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Business Name</Label>
          <Input value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} />
        </div>
        <div>
          <Label>Business Category</Label>
          <Input value={formData.business_category}
            onChange={(e) => setFormData({ ...formData, business_category: e.target.value })}
            placeholder="e.g. IT, Healthcare" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Joining Date</Label>
          <Input type="date" value={formData.joining_date}
            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} />
        </div>
        <div>
          <Label>Renewal Date</Label>
          <Input type="date" value={formData.renewal_date}
            onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Induction Fee</Label>
        <Input type="number" value={formData.induction_fee}
          onChange={(e) => setFormData({ ...formData, induction_fee: e.target.value })}
          placeholder="0" />
      </div>
    </div>
  );

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'var(--nm-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
          <span className="text-sm">Back to Dashboard</span>
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Members Management</h1>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {STAT_CARDS.map((s) => {
            const Icon = s.icon;
            const isActive = statusFilter === s.filter;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(isActive ? '' : s.filter)}
                className={`rounded-xl p-2 md:p-3 text-center transition-all border-2 ${
                  isActive ? 'border-[#CF2030] shadow-md' : 'border-transparent'
                }` } style={{ background: 'var(--nm-surface)' }}
              >
                <div className={`h-8 w-8 md:h-9 md:w-9 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{stats[s.key] || 0}</p>
                <p className="text-[10px] md:text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Expiring Soon Alert */}
        {stats.expiring_soon > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              <strong>{stats.expiring_soon}</strong> member{stats.expiring_soon > 1 ? 's' : ''} renew{stats.expiring_soon === 1 ? 's' : ''} within 30 days
            </p>
          </div>
        )}

        {/* Search + Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
            <Input
              placeholder="Search name, mobile, business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={exportMembers} className="text-xs md:text-sm">
              <FileDown className="h-3 w-3 md:h-4 md:w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs md:text-sm">
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1" /> Template
            </Button>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs md:text-sm">
                  <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1" /> Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Bulk Upload Members</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Excel File</Label>
                    <Input type="file" accept=".xlsx,.xls"
                      onChange={(e) => setUploadFile(e.target.files[0])} className="mt-2" />
                    <p className="text-sm mt-2" style={{ color: 'var(--nm-text-secondary)' }}>Download template for format.</p>
                  </div>
                  <Button onClick={handleFileUpload} disabled={uploading || !uploadFile}
                    className="w-full bg-[#CF2030] hover:bg-[#A61926]">
                    {uploading ? 'Uploading...' : 'Upload Members'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#CF2030] hover:bg-[#A61926] text-xs md:text-sm" size="sm">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" /> Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add New Member</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <MemberFormFields />
                  <Button type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926]">
                    Add Member
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Active Filter Indicator */}
        {statusFilter && (
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[statusFilter]} text-xs`}>
              Showing: {statusFilter}
            </Badge>
            <button onClick={() => setStatusFilter('')} className="text-xs underline" style={{ color: 'var(--nm-text-secondary)' }}>
              Clear filter
            </button>
          </div>
        )}

        {/* Member Cards */}
        {filteredMembers.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base" style={{ color: 'var(--nm-text-secondary)' }}>
              {members.length === 0 ? 'No members yet. Add your first member!' : 'No members match your search/filter.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
            {filteredMembers.map((member) => (
              <Card
                key={member.member_id}
                className="p-3 md:p-4 hover:shadow-md transition-shadow border-l-4 border-l-[#CF2030] rounded-xl shadow-sm cursor-pointer"
                onClick={() => navigate(`/admin/members/${member.member_id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* ID Circle */}
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[#CF2030]/10 flex items-center justify-center shrink-0">
                      <span className="text-xs md:text-sm font-semibold text-[#CF2030]">{member.unique_member_id}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-sm md:text-base truncate" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(member.full_name)}</h3>
                        <Badge className={`text-[10px] px-1.5 py-0 capitalize ${STATUS_COLORS[member.membership_status] || STATUS_COLORS.active}`}>
                          {member.membership_status || 'active'}
                        </Badge>
                        {member.chapter_role && member.chapter_role !== 'member' && (
                          <Badge className={`text-[10px] ml-1 ${
                            member.chapter_role === 'president' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            member.chapter_role === 'vice_president' ? 'bg-slate-200 text-slate-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {member.chapter_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs truncate flex items-center" style={{ color: 'var(--nm-text-secondary)' }}>
                        {member.primary_mobile}
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/91${member.primary_mobile?.replace(/\D/g, '').slice(-10)}`, '_blank'); }}
                          className="ml-1 text-green-600 hover:text-green-700"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </button>
                        {member.business_name ? ` · ${member.business_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => {
                        setSelectedMember(member);
                        setFormData({
                          unique_member_id: member.unique_member_id || '',
                          full_name: member.full_name || '',
                          primary_mobile: member.primary_mobile || '',
                          secondary_mobile: member.secondary_mobile || '',
                          email: member.email || '',
                          business_name: member.business_name || '',
                          business_category: member.business_category || '',
                          joining_date: member.joining_date || '',
                          renewal_date: member.renewal_date || '',
                          induction_fee: member.induction_fee || '',
                          status: member.status || 'Active',
                        });
                        setEditOpen(true);
                      }}>
                      <Edit className="h-3.5 w-3.5" style={{ color: 'var(--nm-text-secondary)' }} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                      title="Assign Role"
                      onClick={() => {
                        setSelectedMember(member);
                        setSelectedRole(member.chapter_role || 'member');
                        setRoleWarning('');
                        setRoleOpen(true);
                      }}>
                      <Crown className="h-3.5 w-3.5" style={{ color: 'var(--nm-text-secondary)' }} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => {
                        setSelectedMember(member);
                        setStatusAction(member.membership_status === 'active' ? 'deactivate' : 'reactivate');
                        setStatusOpen(true);
                      }}>
                      <Shield className="h-3.5 w-3.5" style={{ color: 'var(--nm-text-secondary)' }} />
                    </Button>
                    <ChevronRight className="h-4 w-4 self-center" style={{ color: 'var(--nm-text-muted)' }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <MemberFormFields isEdit />
            <Button type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              Update Member
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              Member: <strong>{toTitleCase(selectedMember?.full_name)}</strong>
            </p>
            <div>
              <Label>Action</Label>
              <Select value={statusAction} onValueChange={setStatusAction}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deactivate">Deactivate</SelectItem>
                  <SelectItem value="suspend">Suspend</SelectItem>
                  <SelectItem value="reactivate">Reactivate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Enter reason for status change..."
                rows={3}
              />
            </div>
            <Button onClick={handleStatusChange} className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Chapter Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              Member: <strong>{toTitleCase(selectedMember?.full_name)}</strong>
            </p>
            <div>
              <Label>Chapter Role</Label>
              <Select value={selectedRole} onValueChange={(val) => {
                setSelectedRole(val);
                if (val !== 'member') {
                  const holder = members.find(m => m.chapter_role === val && m.member_id !== selectedMember?.member_id);
                  setRoleWarning(holder ? `${toTitleCase(holder.full_name)} is currently ${val.replace('_', ' ')}. They will be reassigned to Member.` : '');
                } else { setRoleWarning(''); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (default)</SelectItem>
                  <SelectItem value="president">President</SelectItem>
                  <SelectItem value="vice_president">Vice President</SelectItem>
                  <SelectItem value="secretary">Secretary</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="lvh">LVH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {roleWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {roleWarning}
                </p>
              </div>
            )}
            <Button onClick={handleRoleChange} className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              Assign Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
