import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Banknote, User, Search,
  CheckCircle2, ChevronDown,
} from 'lucide-react';

export default function AdminManualEntry() {
  const [members, setMembers] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showMemberList, setShowMemberList] = useState(false);

  // Form
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [note, setNote] = useState('');

  // New fee (if no pending fee selected)
  const [feeType, setFeeType] = useState('cash_payment');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const navigate = useNavigate();

  useEffect(() => {
    loadMembers();
  }, []); // eslint-disable-line

  const loadMembers = async () => {
    try {
      const res = await api.get('/admin/members');
      setMembers(res.data.filter(m => m.membership_status === 'active'));
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingFees = async (memberId) => {
    try {
      const res = await api.get(`/admin/fees?member_id=${memberId}&status=pending`);
      setPendingFees(res.data);
    } catch {
      setPendingFees([]);
    }
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setShowMemberList(false);
    setSearchQuery(member.full_name);
    setSelectedFee(null);
    setAmount('');
    loadPendingFees(member.member_id);
  };

  const handleSelectFee = (fee) => {
    setSelectedFee(fee);
    setAmount(String(fee.amount));
    setFeeType(fee.fee_type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        member_id: selectedMember.member_id,
        payment_method: paymentMethod,
        amount: Number(amount),
        note: note || undefined,
        cheque_number: paymentMethod === 'cheque' ? chequeNumber : undefined,
        fee_type: selectedFee ? selectedFee.fee_type : feeType,
        month: selectedFee ? selectedFee.month : month,
        year: selectedFee ? selectedFee.year : year,
      };

      if (selectedFee) {
        payload.ledger_id = selectedFee.ledger_id;
      }

      await api.post('/admin/payments/mark-cash', payload);
      toast.success('Payment recorded successfully');

      // Reset form
      setSelectedMember(null);
      setSelectedFee(null);
      setSearchQuery('');
      setAmount('');
      setChequeNumber('');
      setNote('');
      setPendingFees([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.primary_mobile?.includes(searchQuery)
  );

  function formatCurrency(amt) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(amt || 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">Record Cash/Cheque Payment</h1>
        <p className="text-sm text-slate-500">Manually record a payment received in cash or cheque</p>
      </div>

      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Member */}
          <Card className="p-4 md:p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-600" /> Select Member
            </h2>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or mobile..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowMemberList(true);
                    if (!e.target.value) {
                      setSelectedMember(null);
                      setPendingFees([]);
                    }
                  }}
                  onFocus={() => setShowMemberList(true)}
                  className="pl-10"
                />
              </div>

              {showMemberList && searchQuery && filteredMembers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredMembers.slice(0, 20).map(m => (
                    <button
                      key={m.member_id}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.full_name}</p>
                        <p className="text-xs text-slate-400">{m.primary_mobile}</p>
                      </div>
                      {m.business_category && (
                        <span className="text-xs text-slate-400">{m.business_category}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">{selectedMember.full_name}</p>
                  <p className="text-xs text-emerald-600">{selectedMember.primary_mobile}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Select Fee or Create New */}
          {selectedMember && (
            <Card className="p-4 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-slate-600" /> Select Fee
              </h2>

              {pendingFees.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-500">Pending fees for this member:</p>
                  {pendingFees.map(fee => (
                    <button
                      key={fee.ledger_id}
                      type="button"
                      onClick={() => handleSelectFee(fee)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedFee?.ledger_id === fee.ledger_id
                          ? 'border-[#CF2030] bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{fee.description}</p>
                          <p className="text-xs text-slate-400">
                            {fee.fee_type?.replace('_', ' ')} {fee.month && fee.year ? `- ${fee.month}/${fee.year}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(fee.amount)}</span>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setSelectedFee(null); setAmount(''); }}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedFee === null
                        ? 'border-[#CF2030] bg-red-50'
                        : 'border-dashed border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-700">+ Create new entry</p>
                    <p className="text-xs text-slate-400">Record a payment without a pending fee</p>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-4">No pending fees. A new entry will be created.</p>
              )}

              {/* New entry fields (when no fee selected) */}
              {!selectedFee && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-xs">Fee Type</Label>
                    <select
                      value={feeType}
                      onChange={e => setFeeType(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="cash_payment">Cash Payment</option>
                      <option value="kitty">Kitty</option>
                      <option value="meeting_fee">Meeting Fee</option>
                      <option value="induction_fee">Induction Fee</option>
                      <option value="renewal_fee">Renewal Fee</option>
                      <option value="event_fee">Event Fee</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Month</Label>
                      <select
                        value={month}
                        onChange={e => setMonth(Number(e.target.value))}
                        className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
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
                      <Input
                        type="number"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Payment Details */}
          {selectedMember && (
            <Card className="p-4 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Payment Details</h2>

              <div className="space-y-4">
                {/* Payment Method */}
                <div>
                  <Label className="text-xs">Payment Method</Label>
                  <div className="flex gap-2 mt-1">
                    {['cash', 'cheque'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                          paymentMethod === method
                            ? 'border-[#CF2030] bg-red-50 text-[#CF2030]'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    className="mt-1"
                  />
                </div>

                {/* Cheque Number (if cheque) */}
                {paymentMethod === 'cheque' && (
                  <div>
                    <Label className="text-xs">Cheque Number</Label>
                    <Input
                      value={chequeNumber}
                      onChange={e => setChequeNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Note */}
                <div>
                  <Label className="text-xs">Note (optional)</Label>
                  <Textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Submit Button */}
          {selectedMember && (
            <Button
              type="submit"
              disabled={submitting || !amount}
              className="w-full bg-[#CF2030] hover:bg-[#A61926] h-12 text-base"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recording...</>
              ) : (
                <><Banknote className="h-4 w-4 mr-2" /> Record Payment</>
              )}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
