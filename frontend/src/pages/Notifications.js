import React, { useState, useEffect, useCallback } from 'react';
import { Bell, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import api from '../utils/api';

const TYPE_META = {
  payment_reminder: { icon: '\u{1F4B0}', label: 'Payment' },
  meeting_schedule: { icon: '\u{1F4C5}', label: 'Meeting' },
  custom:           { icon: '\u{1F4E2}', label: 'Announcement' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/member/notifications');
      setNotifications(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await api.post(`/member/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const toggleExpand = (id) => {
    const n = notifications.find(x => x.notification_id === id);
    if (n && !n.read) markRead(id);
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="nm-raised rounded-xl p-2.5">
            <Bell className="h-5 w-5" style={{ color: 'var(--nm-accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="text-[10px] mt-0.5" style={{ background: '#CF2030', color: '#fff' }}>
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
        <button onClick={fetchNotifications} className="nm-raised rounded-xl p-2.5" style={{ color: 'var(--nm-text-secondary)' }}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List */}
      {loading && notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="nm-raised rounded-2xl p-6 inline-flex mb-3">
            <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--nm-accent)', borderTopColor: 'transparent' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="nm-raised rounded-2xl p-8 inline-flex mb-4">
            <Bell className="h-10 w-10" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--nm-text-secondary)' }}>No notifications yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--nm-text-muted)' }}>You'll see notifications from your chapter here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.custom;
            const expanded = expandedId === n.notification_id;
            return (
              <button
                key={n.notification_id}
                onClick={() => toggleExpand(n.notification_id)}
                className={`w-full text-left rounded-xl p-4 transition-all ${expanded ? 'nm-pressed' : 'nm-raised'}`}
                style={!n.read ? { borderLeft: '3px solid #CF2030' } : {}}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!n.read ? 'font-semibold' : 'font-medium'}`} style={{ color: 'var(--nm-text-primary)' }}>{n.title}</p>
                      {expanded ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />}
                    </div>
                    {!expanded && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>{n.message}</p>}
                    {expanded && <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: 'var(--nm-text-secondary)' }}>{n.message}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>{timeAgo(n.created_at)}</span>
                      {n.sent_by_name && <span className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>by {n.sent_by_name}</span>}
                      {!n.read && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: '#CF2030' }} />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
