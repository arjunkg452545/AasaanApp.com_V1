import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Calendar, CalendarPlus, QrCode, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

// Format "09:00:00" or ISO date string to "9:00 AM"
function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  } catch {}
  // Fallback: raw HH:MM:SS string
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
}

// Format date to "09 Mar 2026"
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// Get meeting status based on current time
function getMeetingStatus(meeting) {
  const now = new Date();
  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);

  if (meeting.status === 'archived') return { label: 'Archived', color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', emoji: '📦' };
  if (now >= start && now <= end) return { label: 'Live', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', emoji: '🟢' };
  if (now < start) return { label: 'Upcoming', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', emoji: '🔵' };
  return { label: 'Completed', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', emoji: '✅' };
}

export default function MeetingManagementHub() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const res = await api.get('/admin/meetings');
        setMeetings(res.data || []);
      } catch {
        toast.error('Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };
    loadMeetings();
  }, []);

  // Sort by created_at descending to get latest first
  const sortedMeetings = [...meetings].sort((a, b) => {
    const aTime = new Date(a.created_at || a.date).getTime();
    const bTime = new Date(b.created_at || b.date).getTime();
    return bTime - aTime;
  });

  const latestMeeting = sortedMeetings.length > 0 ? sortedMeetings[0] : null;
  const latestStatus = latestMeeting ? getMeetingStatus(latestMeeting) : null;
  const totalCount = meetings.filter(m => m.status !== 'archived').length;

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
      <div className="px-4 md:px-6 lg:px-8 pt-5 pb-3 md:pt-7 md:pb-4">
        <h1 className="text-xl md:text-2xl lg:text-[28px] font-bold" style={{ color: 'var(--nm-text-primary)' }}>Meeting Hub</h1>
        <p className="text-xs md:text-sm mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>
          {localStorage.getItem('chapter_name') || 'Chapter Admin'}
        </p>
      </div>

      <div className="px-4 md:px-6 lg:px-8 pb-8 max-w-full md:max-w-[720px] lg:max-w-[1000px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">

          {/* Card 1: Total Meetings (stat only) */}
          <Card className="p-4 md:p-5 rounded-xl border-l-4 border-l-[#005596]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-[#005596]/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-[#005596]" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Total Meetings</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{totalCount}</p>
              </div>
            </div>
          </Card>

          {/* Card 2: Meetings — Create & Manage */}
          <Card
            className="p-4 md:p-5 rounded-xl border-l-4 border-l-[#005596] nm-interactive cursor-pointer group active:scale-[0.98] transition-transform"
            onClick={() => navigate('/app/meetings/list')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-[#005596]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <CalendarPlus className="h-5 w-5 text-[#005596]" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Meetings</h3>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Create & manage</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
            </div>
          </Card>

          {/* Card 3: QR Display — Latest Meeting (dynamic) */}
          <Card
            className={`p-4 md:p-5 rounded-xl border-l-4 ${latestMeeting ? 'nm-interactive cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
            style={{ borderLeftColor: latestMeeting ? '#CF2030' : 'var(--nm-border)' }}
            onClick={() => {
              if (latestMeeting) navigate(`/app/meetings/qr/${latestMeeting.meeting_id}`);
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: latestMeeting ? 'rgba(207,32,48,0.1)' : 'var(--nm-surface)' }}>
                <QrCode className="h-5 w-5" style={{ color: latestMeeting ? '#CF2030' : 'var(--nm-text-muted)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base font-semibold" style={{ color: 'var(--nm-text-primary)' }}>QR Display</h3>
                {latestMeeting ? (
                  <p className="text-xs truncate" style={{ color: 'var(--nm-text-secondary)' }}>Latest meeting</p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>No meetings yet</p>
                )}
              </div>
              {latestMeeting && (
                <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
              )}
            </div>

            {latestMeeting ? (
              <div className="ml-14 space-y-1">
                <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                  {formatDate(latestMeeting.date)}
                </p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                  {formatTime(latestMeeting.start_time)} – {formatTime(latestMeeting.end_time)}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: latestStatus.bg, color: latestStatus.color }}>
                  {latestStatus.emoji} {latestStatus.label}
                </span>
              </div>
            ) : (
              <p className="ml-14 text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                Create one from Meetings!
              </p>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
