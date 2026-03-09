import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Clock, CalendarDays } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'present' || s === 'on_time') return { cls: 'bg-emerald-100 text-emerald-700', label: 'Present' };
  if (s === 'late') return { cls: 'bg-amber-100 text-amber-700', label: 'Late' };
  if (s === 'absent') return { cls: 'bg-red-100 text-red-700', label: 'Absent' };
  if (s === 'substitute') return { cls: 'bg-blue-100 text-blue-700', label: 'Substitute' };
  return { cls: 'bg-gray-100 text-gray-700', label: status || 'Unknown' };
}

function MemberAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const res = await api.get('/member/attendance');
      setAttendance(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      // If endpoint doesn't exist yet, show empty state
      if (error.response?.status !== 404) {
        toast.error('Failed to load attendance');
      }
    } finally {
      setLoading(false);
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>
          My Attendance
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
          Your meeting attendance history
        </p>
      </div>

      {attendance.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--nm-text-primary)' }}>No Attendance Records</h3>
          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
            Your attendance records will appear here after meetings
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {attendance.map((record, idx) => {
            const badge = statusBadge(record.status || record.late_type);
            return (
              <Card key={record.attendance_id || idx} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--nm-surface)' }}>
                      {badge.label === 'Present' || badge.label === 'Late' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : badge.label === 'Absent' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Clock className="h-5 w-5" style={{ color: 'var(--nm-text-muted)' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                        {formatDate(record.meeting_date || record.date)}
                      </p>
                      {record.check_in_time && (
                        <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                          Checked in: {new Date(record.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={badge.cls}>{badge.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(MemberAttendance);
