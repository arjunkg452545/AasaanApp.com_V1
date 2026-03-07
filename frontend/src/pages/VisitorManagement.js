import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Loader2, UserPlus, Users, TrendingUp, Phone, Briefcase,
  Calendar, Search, Plus, Edit2, Trash2, MessageCircle,
} from 'lucide-react';

const STATUS_COLORS = {
  attended: 'bg-blue-100 text-blue-700',
  interested: 'bg-amber-100 text-amber-700',
  joined: 'bg-emerald-100 text-emerald-700',
};

export default function VisitorManagement() {
  const [visitors, setVisitors] = useState([]);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    visitor_name: '', visitor_mobile: '', visitor_business: '',
    invited_by_member_id: '', meeting_id: '', status: 'attended', notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, mRes, sRes, mtRes] = await Promise.all([
        api.get('/admin/visitors'),
        api.get('/admin/members'),
        api.get('/admin/visitors/stats'),
        api.get('/admin/meetings').catch(() => ({ data: [] })),
      ]);
      setVisitors(vRes.data);
      setMembers(Array.isArray(mRes.data) ? mRes.data.filter(m => m.membership_status === 'active') : []);
      setStats(sRes.data);
      setMeetings(Array.isArray(mtRes.data) ? mtRes.data.filter(m => m.status !== 'archived') : []);
    } catch { toast.error('Failed to load visitors'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!search) return visitors;
    const q = search.toLowerCase();
    return visitors.filter(v =>
      v.visitor_name?.toLowerCase().includes(q) ||
      v.visitor_mobile?.includes(q) ||
      v.visitor_business?.toLowerCase().includes(q)
    );
  }, [visitors, search]);

  const handleCreate = async () => {
    if (!formData.visitor_name || !formData.visitor_mobile) {
      toast.error('Name and mobile are required');
      return;
    }
    try {
      await api.post('/admin/visitors', formData);
      toast.success('Visitor registered');
      setCreateOpen(false);
      setFormData({ visitor_name: '', visitor_mobile: '', visitor_business: '', invited_by_member_id: '', meeting_id: '', status: 'attended', notes: '' });
      loadData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to add visitor'); }
  };

  const handleStatusChange = async (visitorId, newStatus) => {
    try {
      await api.put(`/admin/visitors/${visitorId}`, { status: newStatus });
      toast.success('Status updated');
      loadData();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (visitorId) => {
    if (!window.confirm('Delete this visitor record?')) return;
    try {
      await api.delete(`/admin/visitors/${visitorId}`);
      toast.success('Visitor deleted');
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const openWhatsApp = (mobile, name) => {
    const msg = encodeURIComponent(`Dear ${name}, thank you for visiting our BNI chapter meeting! We'd love to have you join us again. - ${localStorage.getItem('chapter_name') || 'BNI Chapter'}`);
    window.open(`https://wa.me/91${mobile.replace(/\D/g, '').slice(-10)}?text=${msg}`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Visitor Management</h1>
          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Track and manage chapter visitors</p>
        </div>
        <Button className="nm-btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Visitor
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Visitors', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'This Month', value: stats.this_month, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Joined', value: stats.joined, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Conversion', value: `${stats.conversion_rate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <Card key={s.label} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
        <Input placeholder="Search visitors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 nm-input" />
      </div>

      {/* Visitor List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--nm-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No visitors found</p>
          </Card>
        ) : filtered.map(v => (
          <Card key={v.visitor_id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{v.visitor_name}</p>
                  <Badge className={`text-[10px] ${STATUS_COLORS[v.status] || ''}`}>{v.status}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--nm-text-muted)' }}>
                    <Phone className="h-3 w-3" /> {v.visitor_mobile}
                  </span>
                  {v.visitor_business && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--nm-text-muted)' }}>
                      <Briefcase className="h-3 w-3" /> {v.visitor_business}
                    </span>
                  )}
                </div>
                {v.invited_by_name && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--nm-text-muted)' }}>Invited by: {v.invited_by_name}</p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Select value={v.status} onValueChange={(val) => handleStatusChange(v.visitor_id, val)}>
                  <SelectTrigger className="h-7 w-24 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attended">Attended</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="joined">Joined</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openWhatsApp(v.visitor_mobile, v.visitor_name)}>
                  <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(v.visitor_id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register Visitor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={formData.visitor_name} onChange={e => setFormData({...formData, visitor_name: e.target.value})} placeholder="Visitor name" className="mt-1" /></div>
            <div><Label>Mobile *</Label><Input value={formData.visitor_mobile} onChange={e => setFormData({...formData, visitor_mobile: e.target.value})} placeholder="Mobile number" className="mt-1" /></div>
            <div><Label>Business</Label><Input value={formData.visitor_business} onChange={e => setFormData({...formData, visitor_business: e.target.value})} placeholder="Business name" className="mt-1" /></div>
            <div>
              <Label>Meeting</Label>
              <Select value={formData.meeting_id} onValueChange={val => setFormData({...formData, meeting_id: val})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select meeting" /></SelectTrigger>
                <SelectContent>
                  {meetings.map(m => (
                    <SelectItem key={m.meeting_id} value={m.meeting_id}>
                      {new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invited By</Label>
              <Select value={formData.invited_by_member_id} onValueChange={val => setFormData({...formData, invited_by_member_id: val})}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.member_id} value={m.member_id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes" className="mt-1" /></div>
            <Button className="w-full nm-btn-primary" onClick={handleCreate}>Register Visitor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
