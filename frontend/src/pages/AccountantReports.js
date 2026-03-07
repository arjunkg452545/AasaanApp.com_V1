import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Download, IndianRupee, Clock, CheckCircle2,
  XCircle, FileSpreadsheet, FileText,
} from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  admin_confirmed: 'bg-indigo-100 text-indigo-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
}

export default function AccountantReports() {
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadSummary(); }, [period]);
  useEffect(() => { loadLedger(); }, [statusFilter, page]);

  const loadSummary = async () => {
    try {
      const res = await api.get(`/accountant/reports/summary?period=${period}`);
      setSummary(res.data);
    } catch { toast.error('Failed to load summary'); }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/accountant/reports/ledger?${params}`);
      setLedger(res.data.entries || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load ledger'); }
    finally { setLoading(false); }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/accountant/reports/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payment_ledger.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Reports</h1>
          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Payment summary and ledger</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="mb-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_quarter">This Quarter</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Collected', value: formatCurrency(summary.total_collected), count: summary.total_collected_count, icon: CheckCircle2, color: 'text-emerald-600', border: 'border-l-emerald-500' },
            { label: 'Pending', value: formatCurrency(summary.pending), count: summary.pending_count, icon: Clock, color: 'text-amber-600', border: 'border-l-amber-500' },
            { label: 'Verified', value: formatCurrency(summary.verified), count: summary.verified_count, icon: IndianRupee, color: 'text-indigo-600', border: 'border-l-indigo-500' },
            { label: 'Rejected', value: formatCurrency(summary.rejected), count: summary.rejected_count, icon: XCircle, color: 'text-red-600', border: 'border-l-red-500' },
          ].map(s => (
            <Card key={s.label} className={`p-4 border-l-4 ${s.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{s.label}</span>
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>{s.count} entries</p>
            </Card>
          ))}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Payment Ledger</h2>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="admin_confirmed">Confirmed</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--nm-border)' }}>
                  {['Date', 'Member', 'Type', 'Amount', 'Status', 'Verified By'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.map(e => (
                  <tr key={e.ledger_id} style={{ borderBottom: '1px solid var(--nm-border)' }}>
                    <td className="py-2 px-3 text-xs" style={{ color: 'var(--nm-text-primary)' }}>{(e.payment_date || e.created_at || '').slice(0, 10)}</td>
                    <td className="py-2 px-3 text-xs font-medium" style={{ color: 'var(--nm-text-primary)' }}>{e.member_name}</td>
                    <td className="py-2 px-3 text-xs capitalize" style={{ color: 'var(--nm-text-muted)' }}>{e.fee_type?.replace('_', ' ')}</td>
                    <td className="py-2 px-3 text-xs font-medium" style={{ color: 'var(--nm-text-primary)' }}>{formatCurrency(e.amount)}</td>
                    <td className="py-2 px-3"><Badge className={`text-[10px] ${STATUS_COLORS[e.status] || ''}`}>{e.status}</Badge></td>
                    <td className="py-2 px-3 text-xs" style={{ color: 'var(--nm-text-muted)' }}>{e.verified_by || e.approved_by || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Page {page} of {Math.ceil(total / 50)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
