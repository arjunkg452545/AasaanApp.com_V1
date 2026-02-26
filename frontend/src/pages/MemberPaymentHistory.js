import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Loader2, History, CheckCircle2 } from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

function groupByMonth(payments) {
  const groups = {};
  payments.forEach(p => {
    const key = p.month && p.year ? `${p.year}-${String(p.month).padStart(2, '0')}` : 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MemberPaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line

  const loadHistory = async () => {
    try {
      const res = await api.get('/member/history');
      setPayments(res.data);
    } catch {
      toast.error('Failed to load history');
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

  const grouped = groupByMonth(payments);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto" style={{ background: 'var(--nm-bg)' }}>
      <h1 className="text-xl md:text-2xl font-bold mb-4" style={{ color: 'var(--nm-text-primary)' }}>Payment History</h1>

      {payments.length === 0 ? (
        <Card className="p-8 text-center">
          <History className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
          <p style={{ color: 'var(--nm-text-secondary)' }}>No completed payments yet</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, items]) => {
            const [year, month] = key === 'other' ? ['', ''] : key.split('-');
            const label = key === 'other'
              ? 'One-time Payments'
              : `${MONTH_NAMES[parseInt(month)] || month} ${year}`;

            return (
              <div key={key}>
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--nm-text-secondary)' }}>{label}</h2>
                <div className="space-y-2">
                  {items.map(p => (
                    <Card
                      key={p.ledger_id}
                      className="p-3 cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => navigate(`/member/payments/${p.ledger_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{p.description}</p>
                            <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                              {p.payment_method?.toUpperCase()} {p.payment_date ? `| ${p.payment_date}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
