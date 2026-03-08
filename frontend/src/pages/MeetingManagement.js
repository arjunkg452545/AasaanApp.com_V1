import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus, ArrowLeft, Archive, ArchiveRestore, Loader2, QrCode,
  FileDown, FileText, Trash2, Edit3, Eye, ChevronDown, ChevronUp,
  Users, UserPlus, Clock,
} from 'lucide-react';

// Format ISO time to "7:00 AM"
function fmtTime(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return isoStr; }
}

// Format date to "09 Mar 2026"
function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// Get meeting status
function getStatus(meeting) {
  if (meeting.status === 'archived') return 'archived';
  const now = new Date();
  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);
  if (now >= start && now <= end) return 'active';
  if (now < start) return 'upcoming';
  return 'completed';
}

export default function MeetingManagement() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [rememberTimes, setRememberTimes] = useState(false);
  const [formData, setFormData] = useState({ date: '', start_time: '', late_cutoff_time: '', end_time: '' });
  const navigate = useNavigate();

  const getUserId = () => localStorage.getItem('user_id') || localStorage.getItem('chapter_id') || 'default';

  // Load saved times when create modal opens
  useEffect(() => {
    if (createOpen) {
      const savedTimes = localStorage.getItem(`meeting_times_${getUserId()}`);
      if (savedTimes) {
        try {
          const p = JSON.parse(savedTimes);
          setFormData(prev => ({ ...prev, date: '', start_time: p.start_time || '', late_cutoff_time: p.late_cutoff_time || '', end_time: p.end_time || '' }));
          setRememberTimes(p.remember || false);
        } catch {}
      }
    }
  }, [createOpen]);

  useEffect(() => { loadMeetings(); }, []);

  const loadMeetings = async () => {
    try {
      const r = await api.get('/admin/meetings');
      setMeetings(r.data);
    } catch { toast.error('Failed to load meetings'); }
    finally { setLoading(false); }
  };

  const handleRememberChange = (checked) => {
    setRememberTimes(checked);
    if (!checked) localStorage.removeItem(`meeting_times_${getUserId()}`);
  };

  const saveTimes = () => {
    if (rememberTimes) {
      localStorage.setItem(`meeting_times_${getUserId()}`, JSON.stringify({
        start_time: formData.start_time, late_cutoff_time: formData.late_cutoff_time,
        end_time: formData.end_time, remember: true,
      }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/meetings', {
        date: new Date(formData.date).toISOString(),
        start_time: new Date(`${formData.date}T${formData.start_time}`).toISOString(),
        late_cutoff_time: new Date(`${formData.date}T${formData.late_cutoff_time}`).toISOString(),
        end_time: new Date(`${formData.date}T${formData.end_time}`).toISOString(),
      });
      saveTimes();
      toast.success('Meeting created');
      setCreateOpen(false);
      setFormData({ date: '', start_time: rememberTimes ? formData.start_time : '', late_cutoff_time: rememberTimes ? formData.late_cutoff_time : '', end_time: rememberTimes ? formData.end_time : '' });
      loadMeetings();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create meeting'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/meetings/${editMeeting.meeting_id}`, {
        date: new Date(formData.date).toISOString(),
        start_time: new Date(`${formData.date}T${formData.start_time}`).toISOString(),
        late_cutoff_time: new Date(`${formData.date}T${formData.late_cutoff_time}`).toISOString(),
        end_time: new Date(`${formData.date}T${formData.end_time}`).toISOString(),
      });
      toast.success('Meeting updated');
      setEditMeeting(null);
      loadMeetings();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update meeting'); }
  };

  const handleDelete = async (meetingId) => {
    try {
      await api.delete(`/admin/meetings/${meetingId}`);
      toast.success('Meeting deleted');
      setDeleteConfirm(null);
      loadMeetings();
    } catch { toast.error('Failed to delete meeting'); }
  };

  const archiveMeeting = async (meetingId, isArchived) => {
    try {
      await api.put(`/admin/meetings/${meetingId}/archive`);
      toast.success(isArchived ? 'Meeting restored' : 'Meeting archived');
      setArchiveConfirm(null);
      loadMeetings();
    } catch { toast.error('Failed to update meeting'); }
  };

  const downloadExcel = async (meetingId) => {
    try {
      const r = await api.get(`/admin/meetings/${meetingId}/report/excel`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      a.setAttribute('download', `attendance_${meetingId}.xlsx`);
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Excel downloaded');
    } catch { toast.error('Failed to download Excel'); }
  };

  const downloadPDF = async (meetingId) => {
    try {
      const r = await api.get(`/admin/meetings/${meetingId}/report/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      a.setAttribute('download', `attendance_${meetingId}.pdf`);
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to download PDF'); }
  };

  // Sort: newest created first, separate archived
  const { activeMeetings, archivedMeetings } = useMemo(() => {
    const active = [];
    const archived = [];
    const sorted = [...meetings].sort((a, b) => {
      const aTime = new Date(a.created_at || a.date).getTime();
      const bTime = new Date(b.created_at || b.date).getTime();
      return bTime - aTime;
    });
    sorted.forEach(m => {
      if (m.status === 'archived') archived.push(m);
      else active.push(m);
    });
    return { activeMeetings: active, archivedMeetings: archived };
  }, [meetings]);

  const openEdit = (m) => {
    const d = new Date(m.date);
    const dateStr = d.toISOString().split('T')[0];
    const startParts = new Date(m.start_time);
    const cutoffParts = new Date(m.late_cutoff_time);
    const endParts = new Date(m.end_time);
    setFormData({
      date: dateStr,
      start_time: `${String(startParts.getHours()).padStart(2,'0')}:${String(startParts.getMinutes()).padStart(2,'0')}`,
      late_cutoff_time: `${String(cutoffParts.getHours()).padStart(2,'0')}:${String(cutoffParts.getMinutes()).padStart(2,'0')}`,
      end_time: `${String(endParts.getHours()).padStart(2,'0')}:${String(endParts.getMinutes()).padStart(2,'0')}`,
    });
    setEditMeeting(m);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/meetings')} className="mb-2 min-h-[44px]">
          <ArrowLeft className="h-4 w-4 mr-1" /><span className="text-sm">Back</span>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Create & Manage</h1>
            <p className="text-xs md:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              {activeMeetings.length} meeting{activeMeetings.length !== 1 ? 's' : ''}
              {archivedMeetings.length > 0 && ` · ${archivedMeetings.length} archived`}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#CF2030] hover:bg-[#A61926] min-h-[44px]">
                <Plus className="h-4 w-4 mr-1" /> Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Meeting</DialogTitle></DialogHeader>
              <MeetingForm formData={formData} setFormData={setFormData} onSubmit={handleCreate}
                rememberTimes={rememberTimes} onRememberChange={handleRememberChange} submitLabel="Create Meeting" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
        ) : activeMeetings.length === 0 && archivedMeetings.length === 0 ? (
          <Card className="p-8 text-center">
            <p style={{ color: 'var(--nm-text-secondary)' }}>No meetings yet. Create your first meeting!</p>
          </Card>
        ) : (
          <>
            {/* Active meetings */}
            {activeMeetings.map((m) => {
              const status = getStatus(m);
              return (
                <MeetingCard key={m.meeting_id} meeting={m} status={status}
                  onShowQR={() => navigate(`/app/meetings/qr/${m.meeting_id}`)}
                  onEdit={() => openEdit(m)}
                  onDelete={() => setDeleteConfirm(m)}
                  onArchive={() => setArchiveConfirm(m)}
                  onViewAttendance={() => navigate(`/app/meetings/${m.meeting_id}/attendance`)}
                  onDownloadExcel={() => downloadExcel(m.meeting_id)}
                  onDownloadPDF={() => downloadPDF(m.meeting_id)}
                />
              );
            })}

            {/* Archived section — collapsible */}
            {archivedMeetings.length > 0 && (
              <div className="mt-6">
                <button onClick={() => setArchivedOpen(!archivedOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--nm-surface)', color: 'var(--nm-text-secondary)', border: '1px solid var(--nm-border)' }}>
                  <span>📦 Archived Meetings ({archivedMeetings.length})</span>
                  {archivedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {archivedOpen && (
                  <div className="mt-2 space-y-2">
                    {archivedMeetings.map((m) => (
                      <Card key={m.meeting_id} className="p-3 rounded-xl flex items-center justify-between" style={{ opacity: 0.7 }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>{fmtDate(m.date)}</p>
                          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                            {fmtTime(m.start_time)} – {fmtTime(m.end_time)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700 min-h-[36px]"
                          onClick={() => archiveMeeting(m.meeting_id, true)}>
                          <ArchiveRestore className="h-4 w-4 mr-1" /> Unarchive
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editMeeting} onOpenChange={(o) => { if (!o) setEditMeeting(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Meeting</DialogTitle></DialogHeader>
          <MeetingForm formData={formData} setFormData={setFormData} onSubmit={handleEdit} submitLabel="Update Meeting" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              This will permanently delete the meeting and all its attendance records. This action cannot be undone.
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>
              Meeting: {deleteConfirm && fmtDate(deleteConfirm.date)}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDelete(deleteConfirm.meeting_id)}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              This will archive the meeting. Attendance records are preserved. You can restore it later.
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>
              Meeting: {archiveConfirm && fmtDate(archiveConfirm.date)}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setArchiveConfirm(null)}>Cancel</Button>
              <Button className="bg-[#CF2030] hover:bg-[#A61926] text-white"
                onClick={() => archiveMeeting(archiveConfirm.meeting_id, false)}>Archive</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Meeting Card Component ───
function MeetingCard({ meeting, status, onShowQR, onEdit, onDelete, onArchive, onViewAttendance, onDownloadExcel, onDownloadPDF }) {
  const statusConfig = {
    upcoming: { label: 'Upcoming', emoji: '🔵', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: '#3B82F6' },
    active:   { label: 'Live',     emoji: '🟢', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: '#22C55E' },
    completed:{ label: 'Completed',emoji: '✅', color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: '#005596' },
  };
  const cfg = statusConfig[status] || statusConfig.completed;
  const attendance = meeting.attendance_summary || {};

  return (
    <Card className="p-3 md:p-4 rounded-xl border-l-4 transition-shadow hover:shadow-md" style={{ borderLeftColor: cfg.border }}>
      {/* Top row: date + status badge */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>
            {fmtDate(meeting.date)}
          </h3>
          <p className="text-xs md:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
            {fmtTime(meeting.start_time)} – {fmtTime(meeting.end_time)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.emoji} {cfg.label}
        </span>
      </div>

      {/* Meeting ID — desktop only */}
      <p className="hidden md:block text-[11px] mb-2" style={{ color: 'var(--nm-text-muted)' }}>
        ID: {meeting.meeting_id}
      </p>

      {/* Live stats for active meetings */}
      {status === 'active' && attendance && (
        <div className="flex gap-3 mb-3 flex-wrap">
          {attendance.present !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', color: '#16A34A' }}>
              <Users className="h-3 w-3" /> Present: {attendance.present}/{attendance.total || '?'}
            </span>
          )}
          {attendance.substitutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', color: '#2563EB' }}>
              <UserPlus className="h-3 w-3" /> Subs: {attendance.substitutes}
            </span>
          )}
          {attendance.visitors > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.08)', color: '#7C3AED' }}>
              <UserPlus className="h-3 w-3" /> Visitors: {attendance.visitors}
            </span>
          )}
        </div>
      )}

      {/* Completed stats */}
      {status === 'completed' && attendance && attendance.present !== undefined && (
        <div className="flex gap-3 mb-3">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', color: '#16A34A' }}>
            <Users className="h-3 w-3" /> Present: {attendance.present}/{attendance.total || '?'}
          </span>
        </div>
      )}

      {/* Action buttons — different per status */}
      <div className="flex flex-wrap gap-2 mt-1">
        {status === 'upcoming' && (
          <>
            <ActionBtn icon={QrCode} label="Show QR" onClick={onShowQR} color="#CF2030" />
            <ActionBtn icon={Edit3} label="Edit" onClick={onEdit} />
            <ActionBtn icon={Trash2} label="Delete" onClick={onDelete} color="#EF4444" />
          </>
        )}
        {status === 'active' && (
          <>
            <ActionBtn icon={QrCode} label="Show QR" onClick={onShowQR} color="#CF2030" />
            <ActionBtn icon={Eye} label="Live Attendance" onClick={onViewAttendance} color="#22C55E" />
            <ActionBtn icon={FileDown} label="Excel" onClick={onDownloadExcel} />
            <ActionBtn icon={FileText} label="PDF" onClick={onDownloadPDF} />
          </>
        )}
        {status === 'completed' && (
          <>
            <ActionBtn icon={Eye} label="View Attendance" onClick={onViewAttendance} />
            <ActionBtn icon={FileDown} label="Excel" onClick={onDownloadExcel} />
            <ActionBtn icon={FileText} label="PDF" onClick={onDownloadPDF} />
            <ActionBtn icon={Archive} label="Archive" onClick={onArchive} color="#D97706" />
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Small action button ───
function ActionBtn({ icon: Icon, label, onClick, color }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}
      className="min-h-[36px] text-xs gap-1.5 px-3"
      style={color ? { color, borderColor: `${color}30` } : {}}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

// ─── Reusable meeting form ───
function MeetingForm({ formData, setFormData, onSubmit, rememberTimes, onRememberChange, submitLabel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><Label>Meeting Date</Label>
        <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
      </div>
      <div><Label>Start Time</Label>
        <Input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} required />
      </div>
      <div><Label>Late Cutoff Time</Label>
        <Input type="time" value={formData.late_cutoff_time} onChange={(e) => setFormData({...formData, late_cutoff_time: e.target.value})} required />
      </div>
      <div><Label>End Time</Label>
        <Input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} required />
      </div>
      {onRememberChange && (
        <div className="flex items-center space-x-2 py-2 px-3 rounded-lg" style={{ background: 'var(--nm-surface)' }}>
          <Checkbox id="remember-times" checked={rememberTimes} onCheckedChange={onRememberChange} />
          <label htmlFor="remember-times" className="text-sm font-medium cursor-pointer select-none" style={{ color: 'var(--nm-text-primary)' }}>
            Remember times for next meeting
          </label>
        </div>
      )}
      <Button type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926] min-h-[44px]">{submitLabel}</Button>
    </form>
  );
}
