// MAX 300 LINES — Unified home: personal stats + admin stats for role holders
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  Loader2, AlertCircle, Clock, CheckCircle2, ChevronRight,
  Wallet, Users, ClipboardList, ShieldCheck, IndianRupee, RefreshCw, ScanLine,
} from 'lucide-react';
import { toTitleCase } from '../utils/formatDate';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700', submitted: 'bg-blue-100 text-blue-700',
  admin_confirmed: 'bg-indigo-100 text-indigo-700', verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700', waived: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS = {
  pending: 'Pending', submitted: 'Submitted', admin_confirmed: 'Confirmed',
  verified: 'Paid', rejected: 'Rejected', waived: 'Waived',
};

const ROLE_PERMISSIONS = {
  president: { members: true, meetings: true, fundHub: true, reports: true, visitors: true },
  vice_president: { members: true, meetings: true, fundHub: true, reports: true, visitors: true },
  secretary: { meetings: true, fundHub: true, reports: true, visitors: true },
  treasurer: { fundHub: true, reports: true },
  secretary_treasurer: { meetings: true, fundHub: true, reports: true, visitors: true },
  lvh: { meetings: true, fundHub: true, reports: true, visitors: true },
};

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatRole(role) {
  if (!role || role === 'member') return '';
  if (role === 'secretary_treasurer') return 'Secretary/Treasurer';
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function UnifiedHome() {
  const [memberData, setMemberData] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const chapterRole = localStorage.getItem('chapter_role') || 'member';
  const role = localStorage.getItem('role') || 'member';
  const isRoleHolder = role === 'admin' && chapterRole !== 'member';
  const perms = ROLE_PERMISSIONS[chapterRole] || {};

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const loadData = async () => {
    setError(null);
    const errors = [];
    try {
      // Always load member dashboard
      const memberRes = await api.get('/member/dashboard').catch(() => { errors.push('member'); return null; });
      if (memberRes) setMemberData(memberRes.data);
      else if (!memberData) setError('Could not load your payment data.');

      // Load admin stats if role holder
      if (isRoleHolder) {
        const [membersRes, meetingsRes, fundRes, verifyRes] = await Promise.all([
          api.get('/admin/members').catch(() => { errors.push('members'); return null; }),
          api.get('/admin/meetings').catch(() => { errors.push('meetings'); return null; }),
          api.get('/admin/fund/reports/summary').catch(() => { errors.push('fund'); return null; }),
          api.get('/admin/payments/summary').catch(() => { errors.push('payments'); return null; }),
        ]);
        setAdminStats({
          members: membersRes && Array.isArray(membersRes.data) ? membersRes.data.length : 0,
          meetings: meetingsRes && Array.isArray(meetingsRes.data) ? meetingsRes.data.length : 0,
          fundTotal: fundRes?.data?.grand_total || 0,
          pendingVerifications: verifyRes?.data?.submitted_count || 0,
        });
        if (errors.length > 0 && !error) setError('Could not load some admin stats. Partial data shown.');
      }
      if (errors.length > 0) toast.error('Some dashboard data failed to load');
    } catch { toast.error('Failed to load dashboard'); setError('Failed to load dashboard data.'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></div>;

  const d = memberData || {};

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Error Banner */}
      {error && (
        <Card className="p-3" style={{ background: 'var(--nm-surface-raised)', border: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Welcome */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>
          Hello, {toTitleCase(d.member_name || localStorage.getItem('member_name') || 'Member')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{d.chapter_name || localStorage.getItem('chapter_name')}</p>
        {chapterRole !== 'member' && (
          <Badge className="mt-2 text-xs px-2 py-1 bg-[#CF2030]/10 text-[#CF2030] border border-[#CF2030]/20">
            {formatRole(chapterRole)}
          </Badge>
        )}
      </div>

      {/* Scan QR Card — visible to ALL users */}
      <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #CF2030 0%, #A61926 100%)' }} onClick={() => navigate('/app/scan-attendance')}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ScanLine className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Scan QR for Attendance</p>
            <p className="text-xs text-white/70">Scan meeting QR code to mark your attendance</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/60 shrink-0" />
        </div>
      </Card>

      {/* ===== PERSONAL SECTION ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4 border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/app/my-payments')}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>Pending</span>
          </div>
          <p className="text-lg md:text-xl font-bold text-red-600">{formatINR(d.pending_total)}</p>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{d.pending_count || 0} fees due</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>In Progress</span>
          </div>
          <p className="text-lg md:text-xl font-bold text-blue-600">{formatINR(d.submitted_total)}</p>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{d.submitted_count || 0} awaiting</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>Paid This Year</span>
          </div>
          <p className="text-lg md:text-xl font-bold text-green-600">{formatINR(d.paid_this_year)}</p>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{d.paid_count_this_year || 0} payments</p>
        </Card>
      </div>

      {/* Next Due */}
      {d.next_due && (
        <Card className="p-4 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/app/my-payments/${d.next_due.ledger_id}`)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Next Due: {d.next_due.description}</p>
              <p className="text-lg font-bold text-amber-600">{formatINR(d.next_due.amount)}</p>
            </div>
            <Button size="sm">Pay Now <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </Card>
      )}

      {/* Recent Payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Recent Payments</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/my-payments')} className="text-[#CF2030]">View All <ChevronRight className="h-4 w-4" /></Button>
        </div>
        {(!d.recent_payments || d.recent_payments.length === 0) ? (
          <Card className="p-6 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--nm-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No payment activity yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {d.recent_payments.slice(0, 3).map(fee => (
              <Card key={fee.ledger_id} className="p-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/app/my-payments/${fee.ledger_id}`)}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{fee.description}</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{fee.fee_type?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${STATUS_COLORS[fee.status] || ''}`}>{STATUS_LABELS[fee.status] || fee.status}</Badge>
                    <span className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{formatINR(fee.amount)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ===== CHAPTER ADMIN SECTION (role holders only) ===== */}
      {isRoleHolder && adminStats && (
        <>
          <div className="pt-2" style={{ borderTop: '2px solid var(--nm-border)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
              <ShieldCheck className="h-5 w-5 text-[#CF2030]" /> Chapter Admin
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--nm-text-secondary)' }}>Manage your chapter</p>
          </div>

          {/* Verification Banner */}
          {adminStats.pendingVerifications > 0 && (
            <Card className="p-3 cursor-pointer hover:shadow-md transition-all" style={{ background: 'var(--nm-surface-raised)', borderColor: 'var(--nm-border)' }} onClick={() => navigate('/app/fund-hub')}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#CF2030]/10 flex items-center justify-center shrink-0"><ShieldCheck className="h-5 w-5 text-[#CF2030]" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{adminStats.pendingVerifications} payment{adminStats.pendingVerifications > 1 ? 's' : ''} awaiting verification</p>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Tap to review</p>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--nm-accent)' }}>Review &rarr;</span>
              </div>
            </Card>
          )}

          {/* Admin stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {perms.members && (
              <Card className="p-4 border-l-4 border-l-[#CF2030] cursor-pointer hover:shadow-md" onClick={() => navigate('/app/members')}>
                <Users className="h-5 w-5 text-[#CF2030] mb-2" />
                <p className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{adminStats.members}</p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Members</p>
              </Card>
            )}
            {perms.meetings && (
              <Card className="p-4 border-l-4 border-l-[#005596] cursor-pointer hover:shadow-md" onClick={() => navigate('/app/meetings')}>
                <ClipboardList className="h-5 w-5 text-[#005596] mb-2" />
                <p className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{adminStats.meetings}</p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Meetings</p>
              </Card>
            )}
            {perms.fundHub && (
              <Card className="p-4 border-l-4 border-l-green-500 cursor-pointer hover:shadow-md" onClick={() => navigate('/app/fund-hub')}>
                <IndianRupee className="h-5 w-5 text-green-600 mb-2" />
                <p className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{formatINR(adminStats.fundTotal)}</p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Fund Total</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
