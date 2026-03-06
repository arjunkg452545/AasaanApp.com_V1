import React, { useState, useEffect, useRef } from 'react';
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
  Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  CheckSquare, Upload, FileSpreadsheet, Eye,
} from 'lucide-react';

const STATUS_COLORS = {
  admin_confirmed: 'bg-indigo-100 text-indigo-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const TABS = [
  { id: 'admin_confirmed', label: 'Awaiting', color: 'text-indigo-600' },
  { id: 'verified', label: 'Approved', color: 'text-emerald-600' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-600' },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AccountantApprovals() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin_confirmed');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Bank statement
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementResults, setStatementResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const apiBase = process.env.REACT_APP_API_URL?.replace('/api', '') || '';

  useEffect(() => {
    loadPayments();
  }, [activeTab]); // eslint-disable-line

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/verification/payments/confirmed?status=${activeTab}`);
      setPayments(res.data);
      setSelectedIds([]);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ledgerId) => {
    try {
      await api.post(`/verification/payments/${ledgerId}/approve`, { note: '' });
      toast.success('Payment approved');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await api.post(`/verification/payments/${rejectTarget}/reject`, { reason: rejectReason });
      toast.success('Payment rejected');
      setRejectOpen(false);
      setRejectReason('');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select payments first');
      return;
    }
    try {
      const res = await api.post('/verification/payments/bulk-approve', {
        ledger_ids: selectedIds,
        note: 'Bulk approved',
      });
      toast.success(`Approved ${res.data.approved} payments`);
      loadPayments();
    } catch {
      toast.error('Bulk approve failed');
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

  // Bank statement upload
  const handleStatementUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setStatementResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/verification/bank-statement/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatementResults(res.data);
      toast.success(`Found ${res.data.matched} matches out of ${res.data.total_rows} rows`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to parse statement');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirmMatches = async () => {
    if (!statementResults || statementResults.matches.length === 0) return;

    try {
      const matches = statementResults.matches.map(m => ({
        ledger_id: m.ledger_id,
        utr_number: m.utr_number,
        amount: m.statement_amount,
        date: m.date,
      }));

      const res = await api.post('/verification/bank-statement/confirm-matches', {
        matches,
        note: 'Bank statement auto-match',
      });

      toast.success(`Verified ${res.data.confirmed} payments`);
      setStatementOpen(false);
      setStatementResults(null);
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to confirm matches');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Payment Approvals</h1>
          <div className="flex items-center gap-2">
            {activeTab === 'admin_confirmed' && selectedIds.length > 0 && (
              <Button onClick={handleBulkApprove} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckSquare className="h-4 w-4 mr-2" />
                Approve ({selectedIds.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatementOpen(true)}
              className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bank Statement
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 rounded-lg p-1 border mb-4" style={{ background: 'var(--nm-surface)', borderColor: 'var(--nm-border)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : ''
              }`}
              style={activeTab !== tab.id ? { color: 'var(--nm-text-secondary)' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Select All */}
        {activeTab === 'admin_confirmed' && payments.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}
            >
              <div className={`h-4 w-4 rounded border ${
                selectedIds.length === payments.length
                  ? 'bg-indigo-600 border-indigo-600'
                  : ''
              } flex items-center justify-center`} style={selectedIds.length !== payments.length ? { borderColor: 'var(--nm-border)' } : undefined}>
                {selectedIds.length === payments.length && (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                )}
              </div>
              Select All
            </button>
            <span className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{payments.length} payments</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
        ) : payments.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No {activeTab.replace('_', ' ')} payments</p>
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
                      {/* Checkbox */}
                      {activeTab === 'admin_confirmed' && (
                        <button
                          onClick={() => toggleSelect(p.ledger_id)}
                          className={`h-5 w-5 rounded border shrink-0 flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 border-indigo-600' : ''
                          }`}
                          style={!isSelected ? { borderColor: 'var(--nm-border)' } : undefined}
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
                          <h3 className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{p.member_name}</h3>
                          <Badge className={`text-[10px] ${STATUS_COLORS[p.status] || ''}`}>
                            {p.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                          {p.chapter_name} | {p.description} | UTR: {p.utr_number || 'N/A'}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold" style={{ color: 'var(--nm-text-primary)' }}>{formatCurrency(p.amount)}</span>
                        <button onClick={() => setExpandedId(isExpanded ? null : p.ledger_id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    {activeTab === 'admin_confirmed' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleApprove(p.ledger_id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
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

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t p-3 md:p-4 space-y-3" style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-surface)' }}>
                      {p.proof_file && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--nm-text-secondary)' }}>Payment Screenshot</p>
                          <img
                            src={`${apiBase}/uploads/${p.proof_file}`}
                            alt="Proof"
                            className="w-full max-h-64 object-contain rounded-lg border bg-white"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span style={{ color: 'var(--nm-text-muted)' }}>Fee Type:</span> <span className="font-medium">{p.fee_type}</span></div>
                        <div><span style={{ color: 'var(--nm-text-muted)' }}>Method:</span> <span className="font-medium">{p.payment_method}</span></div>
                        <div><span style={{ color: 'var(--nm-text-muted)' }}>UTR:</span> <span className="font-medium">{p.utr_number || 'N/A'}</span></div>
                        <div><span style={{ color: 'var(--nm-text-muted)' }}>Date:</span> <span className="font-medium">{p.payment_date || 'N/A'}</span></div>
                        <div><span style={{ color: 'var(--nm-text-muted)' }}>Chapter:</span> <span className="font-medium">{p.chapter_name}</span></div>
                      </div>
                      {/* Timeline */}
                      {p.timeline && p.timeline.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: 'var(--nm-text-secondary)' }}>Timeline</p>
                          {p.timeline.map((e, i) => (
                            <div key={i} className="text-[11px] py-0.5" style={{ color: 'var(--nm-text-muted)' }}>
                              <span className="font-medium capitalize" style={{ color: 'var(--nm-text-secondary)' }}>{e.action?.replace('_', ' ')}</span>
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
              <p className="text-sm mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Reason (required)</p>
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

      {/* Bank Statement Dialog */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Bank Statement Match
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--nm-text-secondary)' }}>
                Upload a CSV bank statement. We'll match UTR/reference numbers against pending payments.
              </p>
              <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: 'var(--nm-border)' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleStatementUpload}
                  className="hidden"
                  id="statement-upload"
                />
                <label
                  htmlFor="statement-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8" style={{ color: 'var(--nm-text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                    {uploading ? 'Processing...' : 'Click to upload CSV'}
                  </span>
                </label>
              </div>
            </div>

            {/* Results */}
            {statementResults && (
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg p-3 text-center" style={{ background: 'var(--nm-surface)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{statementResults.total_rows}</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Total Rows</p>
                  </div>
                  <div className="bg-emerald-100 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">{statementResults.matched}</p>
                    <p className="text-xs text-emerald-600">Matched</p>
                  </div>
                  <div className="bg-amber-100 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-700">{statementResults.unmatched}</p>
                    <p className="text-xs text-amber-600">Unmatched</p>
                  </div>
                </div>

                {statementResults.matches.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--nm-text-primary)' }}>Matched Payments:</p>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {statementResults.matches.map((m, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{m.member_name}</p>
                            <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>UTR: {m.utr_number} | {m.fee_type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(m.payment_amount)}</p>
                            {!m.amount_match && (
                              <p className="text-xs text-amber-600">Stmt: {formatCurrency(m.statement_amount)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={handleConfirmMatches}
                      className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve All {statementResults.matched} Matches
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
