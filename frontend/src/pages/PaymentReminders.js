import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, MessageCircle, Send, Users,
  ChevronDown, ChevronUp, Phone, Edit3, CheckCircle2,
} from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function PaymentReminders() {
  const [members, setMembers] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters
  const [feeType, setFeeType] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Template
  const [templates, setTemplates] = useState([]);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [editTemplateText, setEditTemplateText] = useState('');

  // Generated links
  const [reminderLinks, setReminderLinks] = useState([]);
  const [showLinks, setShowLinks] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line

  useEffect(() => {
    loadPendingMembers();
  }, [feeType, month, year]); // eslint-disable-line

  const loadData = async () => {
    try {
      const tmplRes = await api.get('/admin/reminders/templates');
      setTemplates(tmplRes.data);
    } catch {
      // Templates may not exist yet
    }
  };

  const loadPendingMembers = async () => {
    setLoading(true);
    try {
      let params = '?status=pending';
      if (feeType) params += `&fee_type=${feeType}`;
      if (month) params += `&month=${month}`;
      if (year) params += `&year=${year}`;

      const res = await api.get(`/admin/fees${params}`);
      const fees = res.data;

      // Group by member
      const memberMap = {};
      for (const f of fees) {
        if (!memberMap[f.member_id]) {
          memberMap[f.member_id] = {
            member_id: f.member_id,
            member_name: f.member_name,
            fees: [],
            total: 0,
          };
        }
        memberMap[f.member_id].fees.push(f);
        memberMap[f.member_id].total += f.amount || 0;
      }

      const memberList = Object.values(memberMap).sort((a, b) => b.total - a.total);
      setMembers(memberList);
      setPendingFees(fees);
    } catch {
      toast.error('Failed to load pending fees');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (memberIds) => {
    setSending(true);
    try {
      const res = await api.post('/admin/reminders/send', {
        member_ids: memberIds,
        fee_type: feeType || undefined,
        month: month || undefined,
        year: year || undefined,
      });
      setReminderLinks(res.data.links);
      setShowLinks(true);
      toast.success(`Generated ${res.data.count} reminder links`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate reminders');
    } finally {
      setSending(false);
    }
  };

  const handleBulkRemind = () => {
    const allMemberIds = members.map(m => m.member_id);
    handleSendReminder(allMemberIds);
  };

  const handleSaveTemplate = async () => {
    if (!editTemplate) return;
    try {
      await api.post('/admin/reminders/templates', {
        template_id: editTemplate.template_id,
        name: editTemplate.name,
        fee_type: editTemplate.fee_type,
        message_template: editTemplateText,
      });
      toast.success('Template saved');
      setEditTemplateOpen(false);
      loadData();
    } catch {
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/fund-hub')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold truncate" style={{ color: 'var(--nm-text-primary)' }}>Payment Reminders</h1>
            <p className="text-xs md:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Send WhatsApp reminders for pending payments</p>
          </div>
          {members.length > 0 && (
            <Button
              onClick={handleBulkRemind}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700 shrink-0 self-start sm:self-auto"
              size="sm"
            >
              <Send className="h-4 w-4 mr-1" />
              Remind All ({members.length})
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Filters */}
        <Card className="p-3 md:p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Fee Type</Label>
              <select
                value={feeType}
                onChange={e => setFeeType(e.target.value)}
                className="nm-input mt-1 w-full rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="kitty">Kitty</option>
                <option value="meeting_fee">Meeting Fee</option>
                <option value="induction_fee">Induction Fee</option>
                <option value="renewal_fee">Renewal Fee</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Month</Label>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="nm-input mt-1 w-full rounded-md px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="nm-input mt-1 w-full rounded-md px-3 py-2 text-sm"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Templates */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Message Templates</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {templates.map(t => (
              <button
                key={t.template_id || t.fee_type}
                onClick={() => {
                  setEditTemplate(t);
                  setEditTemplateText(t.message_template);
                  setEditTemplateOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors"
                style={{ borderColor: 'var(--nm-border)' }}
              >
                <Edit3 className="h-3.5 w-3.5" style={{ color: 'var(--nm-text-muted)' }} />
                {t.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
          <div className="bg-red-50 rounded-lg px-3 py-2 min-w-0">
            <p className="text-[10px] md:text-xs text-red-600 truncate">Pending</p>
            <p className="text-base md:text-lg font-bold text-red-700">{members.length}</p>
          </div>
          <div className="bg-amber-50 rounded-lg px-3 py-2 min-w-0">
            <p className="text-[10px] md:text-xs text-amber-600 truncate">Total</p>
            <p className="text-sm md:text-lg font-bold text-amber-700 truncate">
              {formatCurrency(members.reduce((s, m) => s + m.total, 0))}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-3 py-2 min-w-0">
            <p className="text-[10px] md:text-xs text-blue-600 truncate">Fees</p>
            <p className="text-base md:text-lg font-bold text-blue-700">{pendingFees.length}</p>
          </div>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
        ) : members.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No pending payments for this period</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <Card key={m.member_id} className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>{m.member_name}</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                      {m.fees.length} fee{m.fees.length > 1 ? 's' : ''} pending
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-600">{formatCurrency(m.total)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-600 hover:bg-green-50"
                      onClick={() => handleSendReminder([m.member_id])}
                      disabled={sending}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      Remind
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Template Edit Dialog */}
      <Dialog open={editTemplateOpen} onOpenChange={setEditTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template: {editTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--nm-text-secondary)' }}>
                Available placeholders: {'{name}'}, {'{chapter}'}, {'{amount}'}, {'{month}'}, {'{year}'}, {'{upi_id}'}, {'{description}'}
              </p>
              <Textarea
                value={editTemplateText}
                onChange={e => setEditTemplateText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleSaveTemplate} className="w-full">
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Links Dialog */}
      <Dialog open={showLinks} onOpenChange={setShowLinks}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              WhatsApp Reminder Links
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {reminderLinks.map((link, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>{link.member_name}</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{link.mobile} | {formatCurrency(link.amount)}</p>
                  </div>
                  <a
                    href={link.wa_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </a>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer" style={{ color: 'var(--nm-text-muted)' }}>Preview message</summary>
                  <pre className="mt-1 p-2 rounded whitespace-pre-wrap text-[11px]" style={{ background: 'var(--nm-bg)', color: 'var(--nm-text-secondary)' }}>
                    {link.message}
                  </pre>
                </details>
              </div>
            ))}
            {reminderLinks.length === 0 && (
              <p className="text-center py-4" style={{ color: 'var(--nm-text-muted)' }}>No links generated</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
