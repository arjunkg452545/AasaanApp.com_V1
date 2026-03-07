import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, IndianRupee, Clock, CheckCircle2,
  AlertCircle, ChevronRight, Wallet,
} from 'lucide-react';
import { toTitleCase } from '../utils/formatDate';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  admin_confirmed: 'bg-indigo-100 text-indigo-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  waived: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS = {
  pending: 'Pending',
  submitted: 'Submitted',
  admin_confirmed: 'Confirmed',
  verified: 'Paid',
  rejected: 'Rejected',
  waived: 'Waived',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function MemberDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []); // eslint-disable-line

  const loadDashboard = async () => {
    try {
      const res = await api.get('/member/dashboard');
      setData(res.data);
    } catch {
      toast.error('Failed to load dashboard');
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

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>
          Welcome, {toTitleCase(data.member_name)}
        </h1>
        <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{data.chapter_name}</p>
        {data.chapter_role && data.chapter_role !== 'member' && (
          <Badge className={`mt-2 text-xs px-2 py-1 ${
            data.chapter_role === 'president' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
            data.chapter_role === 'vice_president' ? 'bg-slate-200 text-slate-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            Your Role: {data.chapter_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {/* Pending */}
        <Card
          className="p-4 border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/app/my-payments')}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>Pending</span>
          </div>
          <p className="text-lg md:text-xl font-bold text-red-600">{formatCurrency(data.pending_total)}</p>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{data.pending_count} fees due</p>
        </Card>

        {/* In Progress */}
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>In Progress</span>
          </div>
          <p className="text-lg md:text-xl font-bold text-blue-600">{formatCurrency(data.submitted_total)}</p>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{data.submitted_count} awaiting</p>
        </Card>

        {/* Paid This Year */}
        <Card className="p-4 border-l-4 border-l-green-500 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>Paid This Year</span>
          </div>
          <p className="text-lg md:text-xl font-bold text-green-600">{formatCurrency(data.paid_this_year)}</p>
          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{data.paid_count_this_year} payments</p>
        </Card>
      </div>

      {/* Next Due */}
      {data.next_due && (
        <Card
          className="p-4 mb-6 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(`/app/my-payments/${data.next_due.ledger_id}`)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Next Due: {data.next_due.description}</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(data.next_due.amount)}</p>
            </div>
            <Button size="sm">
              Pay Now <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Recent Payments</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/my-payments')}
            className="text-[#CF2030]"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {(!data.recent_payments || data.recent_payments.length === 0) ? (
          <Card className="p-6 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--nm-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No payment activity yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.recent_payments.map(fee => (
              <Card
                key={fee.ledger_id}
                className="p-3 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/app/my-payments/${fee.ledger_id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{fee.description}</p>
                    <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                      {fee.fee_type?.replace('_', ' ')} {fee.month && fee.year ? `- ${fee.month}/${fee.year}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${STATUS_COLORS[fee.status] || ''}`}>
                      {STATUS_LABELS[fee.status] || fee.status}
                    </Badge>
                    <span className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{formatCurrency(fee.amount)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
