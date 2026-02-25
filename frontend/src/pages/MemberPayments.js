import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Wallet, ChevronRight } from 'lucide-react';

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

const TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default function MemberPayments() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadFees();
  }, [activeTab]); // eslint-disable-line

  const loadFees = async () => {
    setLoading(true);
    try {
      const params = activeTab ? `?status=${activeTab}` : '';
      const res = await api.get(`/member/fees${params}`);
      setFees(res.data);
    } catch {
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">My Payments</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-lg p-1 border mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#CF2030] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : fees.length === 0 ? (
        <Card className="p-8 text-center">
          <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No payments found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {fees.map(fee => (
            <Card
              key={fee.ledger_id}
              className="p-3 md:p-4 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/member/payments/${fee.ledger_id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{fee.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">
                      {fee.fee_type?.replace('_', ' ')}
                    </span>
                    {fee.due_date && (
                      <>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className="text-xs text-slate-400">Due: {fee.due_date}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(fee.amount)}</p>
                    <Badge className={`text-[10px] ${STATUS_COLORS[fee.status] || ''}`}>
                      {STATUS_LABELS[fee.status] || fee.status}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
