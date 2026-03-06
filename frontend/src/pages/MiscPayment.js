import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Plus, Check, CreditCard, X, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MiscPayment() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(null);
  const [memberData, setMemberData] = useState({ payment: null, members: [] });
  const [newPayment, setNewPayment] = useState({ payment_name: '', amount: '', due_date: '', description: '' });
  const [paymentMode, setPaymentMode] = useState('cash');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editPayment, setEditPayment] = useState(null);
  const [editForm, setEditForm] = useState({ payment_name: '', amount: '', due_date: '' });
  const navigate = useNavigate();

  const loadPayments = async () => {
    try {
      const response = await api.get('/admin/fund/misc');
      setPayments(response.data);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  const handleCreate = async () => {
    if (!newPayment.payment_name || !newPayment.amount || !newPayment.due_date) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await api.post('/admin/fund/misc', {
        payment_name: newPayment.payment_name,
        amount: parseFloat(newPayment.amount),
        due_date: newPayment.due_date,
        description: newPayment.description
      });
      toast.success('Payment created');
      setShowCreate(false);
      setNewPayment({ payment_name: '', amount: '', due_date: '', description: '' });
      loadPayments();
    } catch (error) {
      toast.error('Failed to create payment');
    }
  };

  const handleUpdatePayment = async () => {
    if (!editForm.payment_name || !editForm.amount) {
      toast.error('Name and amount required');
      return;
    }
    try {
      await api.put(`/admin/fund/misc/${editPayment}`, editForm);
      toast.success('Payment updated');
      setEditPayment(null);
      loadPayments();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDeletePayment = async (paymentId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this payment? All records will be removed.')) return;
    try {
      await api.delete(`/admin/fund/misc/${paymentId}`);
      toast.success('Payment deleted');
      loadPayments();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const loadMembers = async (paymentId) => {
    try {
      const response = await api.get(`/admin/fund/misc/${paymentId}/members`);
      setMemberData(response.data);
      setShowMembers(paymentId);
      setSelectedMembers([]);
    } catch (error) {
      toast.error('Failed to load members');
    }
  };

  const handleMarkPaid = async (memberId) => {
    try {
      await api.post('/admin/fund/misc/record', { misc_payment_id: showMembers, member_id: memberId, payment_mode: paymentMode });
      toast.success('Payment recorded');
      loadMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleUnmarkPaid = async (memberId) => {
    try {
      await api.post('/admin/fund/misc/unmark', { misc_payment_id: showMembers, member_id: memberId });
      toast.success('Payment unmarked');
      loadMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleBulkMark = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await api.post('/admin/fund/misc/bulk-mark', { member_ids: selectedMembers, payment_id: showMembers, payment_mode: paymentMode });
      toast.success('Bulk marked');
      loadMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleBulkUnmark = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await api.post('/admin/fund/misc/bulk-unmark', { member_ids: selectedMembers, payment_id: showMembers });
      toast.success('Bulk unmarked');
      loadMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  // Member List View
  if (showMembers) {
    const paidCount = memberData.members.filter(m => m.status === 'paid').length;
    const pendingCount = memberData.members.filter(m => m.status === 'pending').length;

    return (
      <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
        <div className="nm-header px-3 md:px-8 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => setShowMembers(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base md:text-2xl font-bold truncate max-w-[180px] md:max-w-none" style={{ color: 'var(--nm-text-primary)' }}>{memberData.payment?.payment_name}</h1>
              <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>₹{memberData.payment?.amount}</p>
            </div>
          </div>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="nm-input rounded p-1.5 text-xs">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="p-3 md:p-8 max-w-6xl mx-auto">
          {/* Stats */}
          <div className="flex gap-2 mb-4">
            <div className="px-3 py-1.5 bg-green-100 rounded">
              <p className="text-xs text-green-700 font-bold">{paidCount} Paid</p>
            </div>
            <div className="px-3 py-1.5 bg-red-100 rounded">
              <p className="text-xs text-red-700 font-bold">{pendingCount} Pending</p>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMembers.length > 0 && (
            <Card className="p-2 mb-3 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-900">{selectedMembers.length} selected</span>
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleBulkMark} className="bg-green-600 text-xs px-2 h-6"><Check className="h-3 w-3" /></Button>
                  <Button size="sm" onClick={handleBulkUnmark} variant="destructive" className="text-xs px-2 h-6"><X className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMembers([])} className="text-xs h-6">Clear</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Select */}
          <div className="flex gap-1 mb-3">
            <Button size="sm" variant="outline" onClick={() => setSelectedMembers(memberData.members.filter(m => m.status === 'pending').map(m => m.member_id))} className="text-xs">All Pending</Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedMembers(memberData.members.filter(m => m.status === 'paid').map(m => m.member_id))} className="text-xs">All Paid</Button>
          </div>

          {/* Members - Mobile Card Layout */}
          <div className="space-y-2">
            {memberData.members.map((member) => (
              <Card key={member.member_id} className={`p-3 ${member.status === 'paid' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedMembers.includes(member.member_id)} onChange={() => toggleMemberSelection(member.member_id)} className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.member_name}</p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                      <span className={member.status === 'paid' ? 'text-green-600' : 'text-red-600'}>{member.status}</span>
                      {member.payment_mode && <span>• {member.payment_mode}</span>}
                    </div>
                  </div>
                  {member.status === 'pending' ? (
                    <Button size="sm" onClick={() => handleMarkPaid(member.member_id)} className="bg-green-600 text-xs px-3 h-9">
                      <Check className="h-3 w-3 mr-1" />Pay
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUnmarkPaid(member.member_id)} className="text-xs px-3 h-9 text-red-600">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Payments List
  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      <div className="nm-header px-3 md:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Misc Payment</h1>
            <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Cash, UPI, Cheque</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700" size="sm">
          <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          <span className="text-xs md:text-sm">Add</span>
        </Button>
      </div>

      <div className="p-3 md:p-8 max-w-6xl mx-auto">
        {/* Create Form */}
        {showCreate && (
          <Card className="p-3 md:p-6 mb-4 border-blue-200 bg-blue-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-blue-900 text-sm">New Payment</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={newPayment.payment_name} onChange={(e) => setNewPayment({...newPayment, payment_name: e.target.value})} placeholder="Annual Fees" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} placeholder="₹" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Due Date *</Label>
                <Input type="date" value={newPayment.due_date} onChange={(e) => setNewPayment({...newPayment, due_date: e.target.value})} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={newPayment.description} onChange={(e) => setNewPayment({...newPayment, description: e.target.value})} placeholder="Optional" className="text-sm" />
              </div>
            </div>
            <Button onClick={handleCreate} className="mt-3 bg-blue-600 hover:bg-blue-700" size="sm">Create</Button>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editPayment} onOpenChange={() => setEditPayment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={editForm.payment_name} onChange={(e) => setEditForm({...editForm, payment_name: e.target.value})} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({...editForm, due_date: e.target.value})} className="text-sm" />
              </div>
              <Button onClick={handleUpdatePayment} className="w-full">Update</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Loading...</div>
        ) : payments.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No payments yet</p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="mt-3">Create</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map(payment => (
              <Card key={payment.misc_payment_id} className="p-3 hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadMembers(payment.misc_payment_id)}>
                    <h3 className="font-semibold text-sm truncate">{payment.payment_name}</h3>
                    <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Due: {new Date(payment.due_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-blue-600">₹{payment.amount}</p>
                    <p className="text-xs text-green-600">₹{payment.total_collected || 0}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setEditPayment(payment.misc_payment_id); setEditForm({ payment_name: payment.payment_name, amount: payment.amount, due_date: payment.due_date?.split('T')[0] || '' }); }}>
                      <Edit className="h-3 w-3 text-slate-500" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => handleDeletePayment(payment.misc_payment_id, e)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
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