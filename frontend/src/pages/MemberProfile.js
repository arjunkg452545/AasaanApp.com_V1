import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit, Loader2, Shield, Phone, Mail, Building2,
  Calendar, IndianRupee, Clock, CheckCircle, XCircle, AlertTriangle,
  UserCheck, ArrowRightLeft,
} from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusAction, setStatusAction] = useState('deactivate');
  const [statusReason, setStatusReason] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => { loadProfile(); }, [memberId]); // eslint-disable-line

  const loadProfile = async () => {
    try {
      const res = await api.get(`/admin/members/${memberId}/profile`);
      setProfile(res.data);
    } catch {
      toast.error('Failed to load member profile');
    } finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.induction_fee) payload.induction_fee = parseFloat(payload.induction_fee);
      else delete payload.induction_fee;
      await api.put(`/admin/members/${memberId}`, payload);
      toast.success('Member updated');
      setEditOpen(false);
      loadProfile();
    } catch { toast.error('Failed to update member'); }
  };

  const handleStatusChange = async () => {
    if (!statusReason.trim()) { toast.error('Reason is required'); return; }
    try {
      await api.post(`/admin/members/${memberId}/status`, {
        action: statusAction, reason: statusReason,
      });
      toast.success(`Member ${statusAction}d`);
      setStatusOpen(false);
      setStatusReason('');
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: 'var(--nm-text-secondary)' }}>Member not found.</p>
        <Button variant="ghost" onClick={() => navigate('/app/members')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
        </Button>
      </div>
    );
  }

  const member = profile.member;
  const att = profile.attendance;
  const payments = profile.payments;
  const initials = (member.full_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/members')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{member.full_name}</h1>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#CF2030]/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-[#CF2030]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{member.full_name}</h2>
                <Badge className={`text-xs capitalize ${STATUS_COLORS[member.membership_status] || STATUS_COLORS.active}`}>
                  {member.membership_status || 'active'}
                </Badge>
              </div>
              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                ID: {member.unique_member_id}
                {member.business_name ? ` · ${member.business_name}` : ''}
                {profile.chapter_name ? ` · ${profile.chapter_name}` : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => {
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
                });
                setEditOpen(true);
              }}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setStatusAction(member.membership_status === 'active' ? 'deactivate' : 'reactivate');
                setStatusOpen(true);
              }}>
                <Shield className="h-4 w-4 mr-1" /> Status
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                    <span>{member.primary_mobile}</span>
                  </div>
                  {member.secondary_mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                      <span>{member.secondary_mobile} (secondary)</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                      <span>{member.email}</span>
                    </div>
                  )}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Business Information</h3>
                <div className="space-y-2">
                  {member.business_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                      <span>{member.business_name}</span>
                    </div>
                  )}
                  {member.business_category && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                      Category: {member.business_category}
                    </div>
                  )}
                  {!member.business_name && !member.business_category && (
                    <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>No business info added</p>
                  )}
                </div>
              </Card>
            </div>
            <Card className="p-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Membership Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Joining Date</p>
                  <p className="text-sm font-medium">{formatDate(member.joining_date)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Renewal Date</p>
                  <p className="text-sm font-medium">{formatDate(member.renewal_date)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Induction Fee</p>
                  <p className="text-sm font-medium">{member.induction_fee ? formatCurrency(member.induction_fee) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Created</p>
                  <p className="text-sm font-medium">{formatDate(member.created_at)}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{att.total_attended}</p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Meetings Attended</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{att.present_count}</p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>On Time</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{att.late_count}</p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Late</p>
              </Card>
            </div>
            <Card className="p-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Recent Attendance</h3>
              {att.recent.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>No attendance records</p>
              ) : (
                <div className="space-y-2">
                  {att.recent.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {a.status === 'present' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-sm">{formatDate(a.meeting_date || a.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.late_type && (
                          <Badge variant="outline" className="text-xs">{a.late_type}</Badge>
                        )}
                        <Badge className={`text-xs ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            {/* Kitty Payments */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Kitty Payments</h3>
              {payments.kitty.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>No kitty payments</p>
              ) : (
                <div className="space-y-2">
                  {payments.kitty.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{p.month}/{p.year}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                        <Badge className={`text-xs ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Meeting Fee Payments */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Meeting Fee Payments</h3>
              {payments.meeting_fee.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>No meeting fee payments</p>
              ) : (
                <div className="space-y-2">
                  {payments.meeting_fee.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{p.month}/{p.year}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                        <Badge className={`text-xs ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Event Payments */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Event Payments</h3>
              {payments.events.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>No event payments</p>
              ) : (
                <div className="space-y-2">
                  {payments.events.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{p.event_id}</span>
                      <Badge className={`text-xs ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Status History</h3>
              {(!member.status_history || member.status_history.length === 0) ? (
                <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>No status changes recorded</p>
              ) : (
                <div className="space-y-3">
                  {[...member.status_history].reverse().map((entry, i) => (
                    <div key={i} className="flex gap-3 py-2 border-b last:border-0">
                      <div className="mt-1">
                        {entry.action === 'created' && <UserCheck className="h-4 w-4 text-blue-500" />}
                        {entry.action === 'approved' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        {entry.action === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                        {entry.action === 'deactivate' && <XCircle className="h-4 w-4 text-slate-400" />}
                        {entry.action === 'suspend' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {entry.action === 'reactivate' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                        {entry.action === 'transferred' && <ArrowRightLeft className="h-4 w-4 text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize" style={{ color: 'var(--nm-text-primary)' }}>{entry.action}</p>
                        <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                          {entry.from_status} &rarr; {entry.to_status}
                        </p>
                        {entry.reason && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>{entry.reason}</p>
                        )}
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--nm-text-muted)' }}>
                          {formatDate(entry.timestamp)} by {entry.changed_by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Transfer Info */}
            {member.transfer_from_chapter && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2" style={{ color: 'var(--nm-text-primary)' }}>Transfer Record</h3>
                <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                  Transferred from chapter <strong>{member.transfer_from_chapter}</strong> on {formatDate(member.transfer_date)}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Member ID</Label>
                <Input value={formData.unique_member_id || ''}
                  onChange={(e) => setFormData({ ...formData, unique_member_id: e.target.value })} required />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Primary Mobile</Label>
                <Input value={formData.primary_mobile || ''}
                  onChange={(e) => setFormData({ ...formData, primary_mobile: e.target.value })} required />
              </div>
              <div>
                <Label>Secondary Mobile</Label>
                <Input value={formData.secondary_mobile || ''}
                  onChange={(e) => setFormData({ ...formData, secondary_mobile: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Business Name</Label>
                <Input value={formData.business_name || ''}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} />
              </div>
              <div>
                <Label>Business Category</Label>
                <Input value={formData.business_category || ''}
                  onChange={(e) => setFormData({ ...formData, business_category: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Joining Date</Label>
                <Input type="date" value={formData.joining_date || ''}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })} />
              </div>
              <div>
                <Label>Renewal Date</Label>
                <Input type="date" value={formData.renewal_date || ''}
                  onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Induction Fee</Label>
              <Input type="number" value={formData.induction_fee || ''}
                onChange={(e) => setFormData({ ...formData, induction_fee: e.target.value })} />
            </div>
            <Button type="submit" className="w-full">Update Member</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Member Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
              <Textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Enter reason..." rows={3} />
            </div>
            <Button onClick={handleStatusChange} className="w-full">Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
