import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Eye, Search, Check, Clock, Users as UsersIcon } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../utils/api';

const SEND_PERMS = {
  president:           ['payment_reminder', 'meeting_schedule', 'custom'],
  vice_president:      ['payment_reminder', 'meeting_schedule', 'custom'],
  treasurer:           ['payment_reminder'],
  secretary:           ['meeting_schedule', 'custom'],
  secretary_treasurer: ['payment_reminder', 'meeting_schedule', 'custom'],
  lvh:                 ['custom'],
};

const TYPE_INFO = {
  payment_reminder: { label: 'Payment Reminder', icon: '\u{1F4B0}', defaultTitle: 'Payment Reminder' },
  meeting_schedule: { label: 'Meeting Schedule', icon: '\u{1F4C5}', defaultTitle: 'Meeting Reminder' },
  custom:           { label: 'Custom', icon: '\u{1F4E2}', defaultTitle: '' },
};

const TEMPLATES = {
  payment_reminder: 'Dear members, your payment is pending. Please pay at the earliest to avoid any issues.',
  meeting_schedule: 'BNI meeting is scheduled. Please be on time and bring your referrals.',
  custom: '',
};

export default function SendNotification() {
  const chapterRole = localStorage.getItem('chapter_role') || 'member';
  const chapterName = localStorage.getItem('chapter_name') || '';
  const allowedTypes = SEND_PERMS[chapterRole] || [];

  const [type, setType] = useState(allowedTypes[0] || 'custom');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientMode, setRecipientMode] = useState('all');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load template when type changes
  useEffect(() => {
    const info = TYPE_INFO[type];
    setTitle(info?.defaultTitle || '');
    setMessage(TEMPLATES[type] || '');
  }, [type]);

  // Fetch members for "Select Members" mode
  useEffect(() => {
    if (recipientMode === 'select') {
      api.get('/admin/members').then(r => setMembers(r.data || [])).catch(() => {});
    }
  }, [recipientMode]);

  // Fetch notification history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/admin/notifications/history');
      setHistory(res.data || []);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const recipients = recipientMode === 'select' ? selectedMembers : recipientMode;
      const res = await api.post('/admin/notifications/send', {
        type, title: title.trim(), message: message.trim(), recipients, channel: 'in_app',
      });
      toast.success(`Notification sent to ${res.data?.recipient_count || 0} members`);
      setTitle(TYPE_INFO[type]?.defaultTitle || '');
      setMessage(TEMPLATES[type] || '');
      setSelectedMembers([]);
      setPreview(false);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send notification');
    }
    setSending(false);
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.primary_mobile?.includes(memberSearch)
  );

  if (allowedTypes.length === 0) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto text-center py-16">
        <div className="nm-raised rounded-2xl p-8 inline-flex mb-4">
          <Bell className="h-10 w-10" style={{ color: 'var(--nm-text-muted)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--nm-text-secondary)' }}>You don't have permission to send notifications</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="nm-raised rounded-xl p-2.5">
          <Send className="h-5 w-5" style={{ color: 'var(--nm-accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Send Notification</h1>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{chapterName}</p>
        </div>
      </div>

      {/* Form */}
      <div className="nm-raised rounded-2xl p-5 space-y-5">
        {/* Type Selection */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--nm-text-muted)' }}>Notification Type</label>
          <div className="flex flex-wrap gap-2">
            {allowedTypes.map(t => {
              const info = TYPE_INFO[t];
              return (
                <button key={t} onClick={() => setType(t)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${type === t ? 'nm-pressed' : 'nm-raised'}`}
                  style={{ color: type === t ? '#CF2030' : 'var(--nm-text-secondary)' }}>
                  <span className="mr-1.5">{info.icon}</span>{info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recipients */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--nm-text-muted)' }}>Recipients</label>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'select'].map(mode => (
              <button key={mode} onClick={() => setRecipientMode(mode)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${recipientMode === mode ? 'nm-pressed' : 'nm-raised'}`}
                style={{ color: recipientMode === mode ? '#CF2030' : 'var(--nm-text-secondary)' }}>
                {mode === 'all' ? 'All Members' : mode === 'pending' ? 'Pending Payments' : 'Select Members'}
              </button>
            ))}
          </div>

          {/* Member selector */}
          {recipientMode === 'select' && (
            <div className="mt-3 nm-pressed rounded-xl p-3">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search members..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm nm-raised" style={{ color: 'var(--nm-text-primary)', background: 'var(--nm-surface)' }} />
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs mb-2" style={{ color: 'var(--nm-accent)' }}>{selectedMembers.length} selected</p>
              )}
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredMembers.map(m => (
                  <button key={m.member_id} onClick={() => toggleMember(m.member_id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${selectedMembers.includes(m.member_id) ? 'nm-pressed' : ''}`}
                    style={{ color: 'var(--nm-text-primary)' }}>
                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selectedMembers.includes(m.member_id) ? '' : ''}`}
                      style={{ borderColor: selectedMembers.includes(m.member_id) ? '#CF2030' : 'var(--nm-border)', background: selectedMembers.includes(m.member_id) ? '#CF2030' : 'transparent' }}>
                      {selectedMembers.includes(m.member_id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="truncate">{m.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--nm-text-muted)' }}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title"
            className="w-full px-4 py-3 rounded-xl text-sm nm-pressed" style={{ color: 'var(--nm-text-primary)', background: 'var(--nm-surface)' }} />
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--nm-text-muted)' }}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Write your message..."
            className="w-full px-4 py-3 rounded-xl text-sm nm-pressed resize-none" style={{ color: 'var(--nm-text-primary)', background: 'var(--nm-surface)' }} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setPreview(!preview)} className="flex-1 nm-raised rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
            style={{ color: 'var(--nm-text-secondary)' }}>
            <Eye className="h-4 w-4" />Preview
          </button>
          <button onClick={handleSend} disabled={sending || (recipientMode === 'select' && selectedMembers.length === 0)}
            className="flex-1 nm-btn-primary rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="h-4 w-4" />{sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Preview card */}
      {preview && (
        <div className="mt-4 nm-raised rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--nm-text-muted)' }}>Preview</p>
          <div className="nm-pressed rounded-xl p-4" style={{ borderLeft: '3px solid #CF2030' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{TYPE_INFO[type]?.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{title || 'Untitled'}</p>
                <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--nm-text-secondary)' }}>{message || 'No message'}</p>
                <p className="text-[10px] mt-2" style={{ color: 'var(--nm-text-muted)' }}>Just now</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sent History */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Sent History</h2>
        </div>

        {historyLoading ? (
          <div className="text-center py-8">
            <div className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--nm-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--nm-text-muted)' }}>No notifications sent yet</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.notification_id} className="nm-raised rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{TYPE_INFO[h.type]?.icon || '\u{1F4E2}'}</span>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{h.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]" style={{ color: 'var(--nm-text-secondary)', borderColor: 'var(--nm-border)' }}>
                      <UsersIcon className="h-3 w-3 mr-1" />{h.read_count}/{h.recipient_count}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--nm-text-muted)' }}>{h.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>{new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {h.sent_by_name && <span className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>by {h.sent_by_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
