// MAX 300 LINES
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Plus, CreditCard, Search } from 'lucide-react';
import SubscriptionTable from './SubscriptionTable';
import SubscriptionModals from './SubscriptionModals';

export default function DeveloperSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [superadmins, setSuperadmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Activate dialog
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateForm, setActivateForm] = useState({
    superadmin_id: '',
    billing_cycle: '',
    chapters_allowed: '',
    amount_paid: '',
    payment_method: '',
    payment_ref: '',
  });
  const [activateLoading, setActivateLoading] = useState(false);

  // Extend dialog
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendSub, setExtendSub] = useState(null);
  const [extendForm, setExtendForm] = useState({
    additional_months: '',
    amount_paid: '',
    payment_ref: '',
  });
  const [extendLoading, setExtendLoading] = useState(false);

  // Cancel confirm dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSub, setCancelSub] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subsRes, saRes] = await Promise.all([
        api.get('/developer/subscriptions'),
        api.get('/developer/superadmins'),
      ]);
      setSubscriptions(subsRes.data);
      setSuperadmins(saRes.data);
    } catch (error) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // -- Activate --
  const openActivateDialog = () => {
    setActivateForm({
      superadmin_id: '',
      billing_cycle: '',
      chapters_allowed: '',
      amount_paid: '',
      payment_method: '',
      payment_ref: '',
    });
    setActivateOpen(true);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!activateForm.superadmin_id || !activateForm.billing_cycle || !activateForm.payment_method) {
      toast.error('Please fill all required fields');
      return;
    }
    setActivateLoading(true);
    try {
      await api.post('/developer/subscriptions/activate', {
        superadmin_id: activateForm.superadmin_id,
        billing_cycle: activateForm.billing_cycle,
        chapters_allowed: Number(activateForm.chapters_allowed) || 1,
        amount_paid: Number(activateForm.amount_paid) || 0,
        payment_method: activateForm.payment_method,
        payment_ref: activateForm.payment_ref,
      });
      toast.success('Subscription activated successfully');
      setActivateOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate subscription');
    } finally {
      setActivateLoading(false);
    }
  };

  // -- Extend --
  const openExtendDialog = (sub) => {
    setExtendSub(sub);
    setExtendForm({ additional_months: '', amount_paid: '', payment_ref: '' });
    setExtendOpen(true);
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (!extendForm.additional_months) {
      toast.error('Please enter additional months');
      return;
    }
    setExtendLoading(true);
    try {
      await api.post('/developer/subscriptions/extend', {
        subscription_id: extendSub.subscription_id,
        additional_months: Number(extendForm.additional_months),
        amount_paid: Number(extendForm.amount_paid) || 0,
        payment_ref: extendForm.payment_ref,
      });
      toast.success('Subscription extended successfully');
      setExtendOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend subscription');
    } finally {
      setExtendLoading(false);
    }
  };

  // -- Cancel --
  const openCancelDialog = (sub) => {
    setCancelSub(sub);
    setCancelOpen(true);
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await api.post('/developer/subscriptions/cancel', {
        subscription_id: cancelSub.subscription_id,
      });
      toast.success('Subscription cancelled');
      setCancelOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  // -- Filter --
  const filtered = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.ed_name || '').toLowerCase().includes(q) ||
      (s.ed_mobile || '').toLowerCase().includes(q) ||
      (s.status || '').toLowerCase().includes(q) ||
      (s.plan_type || '').toLowerCase().includes(q)
    );
  });

  // -- Loading state --
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p style={{ color: 'var(--nm-text-secondary)' }}>Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Title and action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Subscriptions</h2>
          <p className="mt-1" style={{ color: 'var(--nm-text-secondary)' }}>Manage ED subscription plans, billing and renewals</p>
        </div>
        <Button onClick={openActivateDialog} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Activate Subscription
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
        <Input
          placeholder="Search by ED name, mobile, status, plan type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>No Subscriptions Found</h3>
          <p className="mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
            {searchQuery ? 'Try a different search term' : 'Activate a subscription for an Executive Director to get started'}
          </p>
        </Card>
      ) : (
        <SubscriptionTable
          subscriptions={filtered}
          onExtend={openExtendDialog}
          onCancel={openCancelDialog}
        />
      )}

      <SubscriptionModals
        activateOpen={activateOpen}
        setActivateOpen={setActivateOpen}
        activateForm={activateForm}
        setActivateForm={setActivateForm}
        activateLoading={activateLoading}
        onActivateSubmit={handleActivate}
        superadmins={superadmins}
        extendOpen={extendOpen}
        setExtendOpen={setExtendOpen}
        extendSub={extendSub}
        extendForm={extendForm}
        setExtendForm={setExtendForm}
        extendLoading={extendLoading}
        onExtendSubmit={handleExtend}
        cancelOpen={cancelOpen}
        setCancelOpen={setCancelOpen}
        cancelSub={cancelSub}
        cancelLoading={cancelLoading}
        onCancelConfirm={handleCancel}
      />
    </div>
  );
}
