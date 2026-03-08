import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, RefreshCw, FileDown, FileText, Clock, Loader2, CheckCircle,
} from 'lucide-react';

// Format timestamp to "7:05 AM"
function fmtTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return ts; }
}

const MANUAL_MARK_ROLES = ['president', 'vice_president', 'secretary', 'lvh'];

export default function LiveAttendance() {
  const { meetingId } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markOpen, setMarkOpen] = useState(false);
  const [markMember, setMarkMember] = useState('');
  const [markReason, setMarkReason] = useState('Present in meeting');
  const [marking, setMarking] = useState(false);
  const navigate = useNavigate();

  const chapterRole = localStorage.getItem('chapter_role') || 'member';
  const canManualMark = MANUAL_MARK_ROLES.includes(chapterRole) || localStorage.getItem('role') === 'developer';

  const loadSummary = async () => {
    try {
      const r = await api.get(`/admin/meetings/${meetingId}/summary`);
      setSummary(r.data);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 15000);
    return () => clearInterval(interval);
  }, [meetingId]);

  const handleManualMark = async () => {
    if (!markMember) return;
    setMarking(true);
    try {
      const member = summary?.pending_members?.find(m => m.unique_member_id === markMember);
      if (!member) { toast.error('Member not found'); setMarking(false); return; }

      await api.post(`/admin/meetings/${meetingId}/mark-manual`, {
        unique_member_id: member.unique_member_id,
        type: 'member',
        reason: markReason,
        member_name: member.full_name,
        primary_mobile: member.primary_mobile || '',
      });
      toast.success(`Marked ${member.full_name} as present`);
      setMarkOpen(false);
      setMarkMember('');
      setMarkReason('Present in meeting');
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark attendance');
    } finally { setMarking(false); }
  };

  const downloadExcel = async () => {
    try {
      const r = await api.get(`/admin/meetings/${meetingId}/report/excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      a.setAttribute('download', `attendance_${meetingId}.xlsx`);
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Excel downloaded');
    } catch { toast.error('Failed to download Excel'); }
  };

  const downloadPDF = async () => {
    try {
      const r = await api.get(`/admin/meetings/${meetingId}/report/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      a.setAttribute('download', `attendance_${meetingId}.pdf`);
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to download PDF'); }
  };

  // Build combined members table rows
  const membersTable = useMemo(() => {
    if (!summary) return [];
    const rows = [];
    let sr = 1;

    // Present members (sorted by timestamp from backend)
    for (const m of (summary.present_members || [])) {
      rows.push({ sr: sr++, id: m.unique_member_id, name: m.full_name, time: fmtTime(m.timestamp), status: 'Present', type: 'Member', color: '#16A34A' });
    }

    // Substitutes
    for (const m of (summary.substitute_members || [])) {
      rows.push({ sr: sr++, id: m.unique_member_id, name: m.full_name, time: fmtTime(m.timestamp), status: 'Substitute', type: `Sub: ${m.substitute_name}`, color: '#D97706' });
    }

    // Pending / Absent
    for (const m of (summary.pending_members || [])) {
      const isAbsent = m.status === 'Absent';
      rows.push({ sr: sr++, id: m.unique_member_id, name: m.full_name, time: '—', status: m.status, type: '—', color: isAbsent ? '#DC2626' : '#9CA3AF' });
    }

    return rows;
  }, [summary]);

  const isLive = summary && !summary.meeting_ended;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--nm-bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/meetings/list')} className="mb-2 min-h-[44px]">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>
              Attendance Report
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {isLive ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                  🟢 Live — auto-refreshing
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(107,114,128,0.08)', color: '#6B7280' }}>
                  ✅ Completed
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadSummary} className="min-h-[36px]">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-8 max-w-5xl mx-auto">
        {/* Summary Bar */}
        {summary && (
          <Card className="p-3 md:p-4 mb-4 rounded-xl">
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-3 md:gap-5 mb-3">
              <Stat label="Total" value={summary.total_members} color="#3B82F6" />
              <Stat label="Present" value={summary.present_count} color="#16A34A" />
              <Stat label="Subs" value={summary.substitute_count} color="#D97706" />
              <Stat label={isLive ? 'Pending' : 'Absent'} value={isLive ? summary.pending_count : summary.absent_count} color="#DC2626" />
              <Stat label="Visitors" value={summary.visitor_count} color="#7C3AED" />
            </div>
            {/* Action buttons — always visible, separate row */}
            <div className="flex gap-2 flex-wrap">
              {canManualMark && isLive && summary.pending_members?.length > 0 && (
                <Button size="sm" className="bg-[#005596] hover:bg-[#004478] text-white min-h-[36px] text-xs"
                  onClick={() => setMarkOpen(true)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Attendance
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={downloadExcel} className="min-h-[36px] text-xs">
                <FileDown className="h-3.5 w-3.5 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPDF} className="min-h-[36px] text-xs">
                <FileText className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            </div>
          </Card>
        )}

        {/* Members & Substitutes Table */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: 'var(--nm-text-secondary)' }}>
            MEMBERS & SUBSTITUTES
          </h2>
          <Card className="rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 520 }}>
                <thead>
                  <tr style={{ background: '#005596' }}>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-white w-10">Sr</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-white w-20">ID</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-white w-24">Time</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-white w-24">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {membersTable.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--nm-text-muted)' }}>
                        No attendance data yet
                      </td>
                    </tr>
                  ) : (
                    membersTable.map((row, idx) => (
                      <tr key={row.id + row.status}
                        style={{ background: idx % 2 === 0 ? 'var(--nm-surface, #fff)' : 'var(--nm-bg, #f9f9f9)' }}>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-muted)' }}>{row.sr}</td>
                        <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--nm-text-primary)' }}>{row.id}</td>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--nm-text-primary)' }}>{row.name}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{row.time}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full"
                            style={{ color: row.color, background: `${row.color}15` }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{row.type}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Visitors Table */}
        {summary?.visitors?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2 px-1" style={{ color: 'var(--nm-text-secondary)' }}>
              VISITORS ({summary.visitor_count})
            </h2>
            <Card className="rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 480 }}>
                  <thead>
                    <tr style={{ background: '#7C3AED' }}>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-white w-10">Sr</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Company</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Mobile</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-white">Invited By</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-white w-24">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.visitors.map((v, idx) => (
                      <tr key={idx}
                        style={{ background: idx % 2 === 0 ? 'var(--nm-surface, #fff)' : 'var(--nm-bg, #f9f9f9)' }}>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-muted)' }}>{idx + 1}</td>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--nm-text-primary)' }}>{v.visitor_name}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{v.company}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{v.mobile}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{v.invited_by}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{fmtTime(v.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {isLive && (
          <div className="flex items-center gap-2 text-xs mt-4" style={{ color: 'var(--nm-text-muted)' }}>
            <Clock className="h-3.5 w-3.5" /> Auto-refreshing every 15 seconds
          </div>
        )}
      </div>

      {/* Manual Mark Modal */}
      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Attendance Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--nm-text-primary)' }}>
                Select Member
              </label>
              <select
                value={markMember}
                onChange={(e) => setMarkMember(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border min-h-[44px]"
                style={{ background: 'var(--nm-surface)', color: 'var(--nm-text-primary)', borderColor: 'var(--nm-border)' }}>
                <option value="">Choose a member...</option>
                {(summary?.pending_members || []).map(m => (
                  <option key={m.unique_member_id} value={m.unique_member_id}>
                    {m.full_name} ({m.unique_member_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--nm-text-primary)' }}>
                Reason
              </label>
              <select
                value={markReason}
                onChange={(e) => setMarkReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border min-h-[44px]"
                style={{ background: 'var(--nm-surface)', color: 'var(--nm-text-primary)', borderColor: 'var(--nm-border)' }}>
                <option>Present in meeting</option>
                <option>Late arrival — present</option>
                <option>QR scan issue</option>
                <option>Phone not available</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setMarkOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#005596] hover:bg-[#004478] text-white min-h-[44px]"
                onClick={handleManualMark}
                disabled={!markMember || marking}>
                {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Present'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xl md:text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] md:text-xs" style={{ color: 'var(--nm-text-muted)' }}>{label}</span>
    </div>
  );
}
