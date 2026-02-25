import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  Loader2, ShieldCheck, CheckCircle2, XCircle, Clock,
  ChevronRight, IndianRupee,
} from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function AccountantDashboard() {
  const [summary, setSummary] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const accountantName = localStorage.getItem('accountant_name') || 'Accountant';

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line

  const loadData = async () => {
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        api.get('/verification/payments/summary'),
        api.get('/verification/payments/confirmed?status=admin_confirmed'),
      ]);
      setSummary(summaryRes.data);
      setRecentPayments(paymentsRes.data.slice(0, 10));
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">
          Welcome, {accountantName}
        </h1>
        <p className="text-sm text-slate-500">Payment Verification Dashboard</p>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card
            className="p-4 border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/accountant/approvals')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-slate-500 font-medium">Awaiting</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-indigo-600">{summary.admin_confirmed_count}</p>
            <p className="text-xs text-slate-400">{formatCurrency(summary.admin_confirmed_total)}</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Verified</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-emerald-600">{summary.verified_count}</p>
            <p className="text-xs text-slate-400">{formatCurrency(summary.verified_total)}</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-red-500">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-slate-500 font-medium">Rejected</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-red-600">{summary.rejected_count}</p>
            <p className="text-xs text-slate-400">{formatCurrency(summary.rejected_total)}</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-slate-500 font-medium">Pending</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-amber-600">{summary.pending_count}</p>
            <p className="text-xs text-slate-400">{formatCurrency(summary.pending_total)}</p>
          </Card>
        </div>
      )}

      {/* Quick action */}
      {summary && summary.admin_confirmed_count > 0 && (
        <Card
          className="p-4 mb-6 bg-indigo-50 border-indigo-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/accountant/approvals')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  {summary.admin_confirmed_count} payment{summary.admin_confirmed_count > 1 ? 's' : ''} ready for approval
                </p>
                <p className="text-xs text-indigo-600">Total: {formatCurrency(summary.admin_confirmed_total)}</p>
              </div>
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              Review <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Recent confirmed payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Awaiting Approval</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/accountant/approvals')}
            className="text-indigo-600"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {recentPayments.length === 0 ? (
          <Card className="p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No payments awaiting approval</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentPayments.map(p => (
              <Card key={p.ledger_id} className="p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.member_name}</p>
                    <p className="text-xs text-slate-400">
                      {p.chapter_name} | {p.fee_type?.replace('_', ' ')} | UTR: {p.utr_number || 'N/A'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">{formatCurrency(p.amount)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
