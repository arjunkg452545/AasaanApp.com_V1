import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock,
  Eye, ImageIcon, User, ChevronDown, ChevronUp, CheckSquare,
} from 'lucide-react';

const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-700',
  admin_confirmed: 'bg-indigo-100 text-indigo-700',
  rejected: 'bg-red-100 text-red-700',
};

const TABS = [
  { id: 'submitted', label: 'Awaiting', color: 'text-blue-600' },
  { id: 'admin_confirmed', label: 'Confirmed', color: 'text-indigo-600' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-600' },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AdminVerifyPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submitted');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadPayments();
  }, [activeTab]); // eslint-disable-line

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/payments/submitted?status=${activeTab}`);
      setPayments(res.data);
      setSelectedIds([]);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (ledgerId) => {
    try {
      await api.post(`/admin/payments/${ledgerId}/confirm`, { note: '' });
      toast.success('Payment confirmed');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await api.post(`/admin/payments/${rejectTarget}/reject`, { reason: rejectReason });
      toast.success('Payment rejected');
      setRejectOpen(false);
      setRejectReason('');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select payments first');
      return;
    }
    try {
      const res = await api.post('/admin/payments/bulk-confirm', {
        ledger_ids: selectedIds,
        note: 'Bulk confirmed',
      });
      toast.success(`Confirmed ${res.data.confirmed} payments`);
      loadPayments();
    } catch {
      toast.error('Bulk confirm failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === payments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payments.map(p => p.ledger_id));
    }
  };

  const apiBase = process.env.REACT_APP_API_URL?.replace('/api', '') || '';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold text-slate-900">Verify Payments</h1>
          {activeTab === 'submitted' && selectedIds.length > 0 && (
            <Button onClick={handleBulkConfirm} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckSquare className="h-4 w-4 mr-2" />
              Confirm ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-lg p-1 border mb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#CF2030] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Select All (for submitted tab) */}
        {activeTab === 'submitted' && payments.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <div className={`h-4 w-4 rounded border ${
                selectedIds.length === payments.length
                  ? 'bg-[#CF2030] border-[#CF2030]'
                  : 'border-slate-300'
              } flex items-center justify-center`}>
                {selectedIds.length === payments.length && (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                )}
              </div>
              Select All
            </button>
            <span className="text-xs text-slate-400">{payments.length} payments</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : payments.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No {activeTab.replace('_', ' ')} payments</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map(p => {
              const isExpanded = expandedId === p.ledger_id;
              const isSelected = selectedIds.includes(p.ledger_id);

              return (
                <Card key={p.ledger_id} className="overflow-hidden">
                  <div className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      {/* Checkbox (for submitted) */}
                      {activeTab === 'submitted' && (
                        <button
                          onClick={() => toggleSelect(p.ledger_id)}
                          className={`h-5 w-5 rounded border shrink-0 flex items-center justify-center ${
                            isSelected ? 'bg-[#CF2030] border-[#CF2030]' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </button>
                      )}

                      {/* Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : p.ledger_id)}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-slate-900 truncate">{p.member_name}</h3>
                          <Badge className={`text-[10px] ${STATUS_COLORS[p.status] || ''}`}>
                            {p.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {p.description} | {p.payment_method?.toUpperCase()} | UTR: {p.utr_number || 'N/A'}
                        </p>
                      </div>

                      {/* Amount + Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                        <button onClick={() => setExpandedId(isExpanded ? null : p.ledger_id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Actions row */}
                    {activeTab === 'submitted' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleConfirm(p.ledger_id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => { setRejectTarget(p.ledger_id); setRejectOpen(true); }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-3 md:p-4 bg-slate-50 space-y-3">
                      {/* Proof Image */}
                      {p.proof_file && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Payment Screenshot</p>
                          <img
                            src={`${apiBase}/uploads/${p.proof_file}`}
                            alt="Proof"
                            className="w-full max-h-64 object-contain rounded-lg border bg-white"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-slate-400">Fee Type:</span> <span className="font-medium">{p.fee_type}</span></div>
                        <div><span className="text-slate-400">Method:</span> <span className="font-medium">{p.payment_method}</span></div>
                        <div><span className="text-slate-400">UTR:</span> <span className="font-medium">{p.utr_number || 'N/A'}</span></div>
                        <div><span className="text-slate-400">Date:</span> <span className="font-medium">{p.payment_date || 'N/A'}</span></div>
                      </div>
                      {/* Timeline */}
                      {p.timeline && p.timeline.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Timeline</p>
                          {p.timeline.map((e, i) => (
                            <div key={i} className="text-[11px] text-slate-400 py-0.5">
                              <span className="font-medium text-slate-600 capitalize">{e.action?.replace('_', ' ')}</span>
                              {' '}{e.note && `- ${e.note}`}
                              {' | '}{new Date(e.at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Reason (required)</p>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
            <Button onClick={handleReject} className="w-full bg-red-600 hover:bg-red-700">
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
