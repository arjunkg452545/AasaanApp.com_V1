import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Check, Settings, Wallet, X, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function KittyPayment() {
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showSettings, setShowSettings] = useState(false);
  const [kittyAmount, setKittyAmount] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editPayment, setEditPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const navigate = useNavigate();

  const loadPayments = async () => {
    try {
      const response = await api.get(`/admin/fund/kitty/payments?month=${selectedMonth}&year=${selectedYear}`);
      setPayments(response.data);
      setSelectedMembers([]);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/fund/kitty/settings');
      setSettings(response.data);
      const current = response.data.find(s => s.month === selectedMonth && s.year === selectedYear);
      if (current) setKittyAmount(current.amount.toString());
    } catch (error) {
      console.error('Failed to load settings');
    }
  };

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => {
    loadPayments();
    const current = settings.find(s => s.month === selectedMonth && s.year === selectedYear);
    setKittyAmount(current ? current.amount.toString() : '');
  }, [selectedMonth, selectedYear, settings]);

  const handleSaveSettings = async () => {
    if (!kittyAmount || parseFloat(kittyAmount) <= 0) {
      toast.error('Please enter valid amount');
      return;
    }
    try {
      await api.post('/admin/fund/kitty/settings', { month: selectedMonth, year: selectedYear, amount: parseFloat(kittyAmount) });
      toast.success('Kitty amount saved');
      setShowSettings(false);
      loadSettings();
      loadPayments();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleMarkPaid = async (memberId) => {
    try {
      await api.post('/admin/fund/kitty/payments/mark', { member_id: memberId, month: selectedMonth, year: selectedYear });
      toast.success('Payment marked');
      loadPayments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed');
    }
  };

  const handleUnmarkPaid = async (memberId) => {
    try {
      await api.post('/admin/fund/kitty/payments/unmark', { member_id: memberId, month: selectedMonth, year: selectedYear });
      toast.success('Payment unmarked');
      loadPayments();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleBulkMark = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await api.post('/admin/fund/kitty/payments/bulk-mark', { member_ids: selectedMembers, month: selectedMonth, year: selectedYear });
      toast.success('Bulk marked');
      loadPayments();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleBulkUnmark = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await api.post('/admin/fund/kitty/payments/bulk-unmark', { member_ids: selectedMembers, month: selectedMonth, year: selectedYear });
      toast.success('Bulk unmarked');
      loadPayments();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleUpdateAmount = async () => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    try {
      // Use member-amount API which works for both pending and paid
      await api.put('/admin/fund/kitty/member-amount', {
        member_id: editPayment.member_id,
        month: selectedMonth,
        year: selectedYear,
        amount: parseFloat(editAmount)
      });
      toast.success('Amount updated');
      setEditPayment(null);
      loadPayments();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const totalCollection = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Mobile optimized */}
      <div className="bg-white border-b border-slate-200 px-3 md:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base md:text-2xl font-bold text-slate-900">Kitty Payment</h1>
            <p className="text-xs text-slate-600">Monthly collection</p>
          </div>
        </div>
        <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm" className="text-xs md:text-sm">
          <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          <span className="hidden md:inline">Set </span>Amt
        </Button>
      </div>

      <div className="p-3 md:p-8 max-w-6xl mx-auto">
        {showSettings && (
          <Card className="p-3 md:p-6 mb-4 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-3 text-sm">{MONTHS[selectedMonth - 1]} {selectedYear} Amount</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input type="number" value={kittyAmount} onChange={(e) => setKittyAmount(e.target.value)} placeholder="₹" className="text-sm" />
              </div>
              <Button onClick={handleSaveSettings} size="sm" className="bg-amber-600 hover:bg-amber-700">Save</Button>
            </div>
          </Card>
        )}

        {/* Filters & Stats - Mobile optimized */}
        <Card className="p-3 md:p-4 mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
              className="rounded border-slate-300 p-1.5 border text-sm w-20">
              {MONTHS.map((month, idx) => (<option key={idx} value={idx + 1}>{month}</option>))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
              className="rounded border-slate-300 p-1.5 border text-sm w-20">
              {[2024, 2025, 2026].map(year => (<option key={year} value={year}>{year}</option>))}
            </select>
            <div className="flex gap-2 ml-auto">
              <div className="text-center px-2 py-1 bg-green-100 rounded">
                <p className="text-xs text-green-700 font-bold">{paidCount} Paid</p>
              </div>
              <div className="text-center px-2 py-1 bg-red-100 rounded">
                <p className="text-xs text-red-700 font-bold">{pendingCount} Pend</p>
              </div>
              <div className="text-center px-2 py-1 bg-amber-100 rounded">
                <p className="text-xs text-amber-700 font-bold">₹{totalCollection}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Bulk Actions - Mobile */}
        {selectedMembers.length > 0 && (
          <Card className="p-2 md:p-4 mb-3 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium text-blue-900 text-xs md:text-sm">{selectedMembers.length} selected</span>
              <div className="flex gap-1 md:gap-2">
                <Button size="sm" onClick={handleBulkMark} className="bg-green-600 hover:bg-green-700 text-xs px-2">
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={handleBulkUnmark} variant="destructive" className="text-xs px-2">
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedMembers([])} className="text-xs">Clear</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Members List */}
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <Card className="p-8 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No members found</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map((payment, idx) => (
              <Card key={payment.member_id} className={`p-3 ${payment.status === 'paid' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedMembers.includes(payment.member_id)}
                    onChange={() => toggleMemberSelection(payment.member_id)} className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{payment.member_name}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      {/* Amount with Edit button RIGHT NEXT TO IT */}
                      <span className="font-semibold text-slate-700">₹{payment.amount || 0}</span>
                      <button 
                        onClick={() => { setEditPayment(payment); setEditAmount(payment.amount?.toString() || ''); }}
                        className="p-0.5 hover:bg-slate-100 rounded"
                        title="Edit Amount"
                      >
                        <Edit className="h-3 w-3 text-amber-600" />
                      </button>
                      {payment.status === 'paid' && payment.paid_date && (
                        <span className="text-green-600 ml-1">{new Date(payment.paid_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {payment.status === 'paid' ? (
                      <Button size="sm" variant="outline" onClick={() => handleUnmarkPaid(payment.member_id)} className="text-xs px-2 h-7 text-red-600">
                        <X className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleMarkPaid(payment.member_id)} className="bg-green-600 hover:bg-green-700 text-xs px-2 h-7">
                        <Check className="h-3 w-3 mr-1" />Pay
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Amount Dialog */}
      <Dialog open={!!editPayment} onOpenChange={() => setEditPayment(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Amount - {editPayment?.member_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="₹" className="text-sm" />
            <Button onClick={handleUpdateAmount} className="w-full bg-amber-600 hover:bg-amber-700">Update Amount</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}