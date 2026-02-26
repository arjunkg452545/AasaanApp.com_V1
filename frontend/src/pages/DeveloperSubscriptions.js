import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, CalendarPlus, XCircle, CreditCard, RefreshCw, Search, Loader2
} from 'lucide-react';

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const PAYMENT_METHODS = [
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

function getStatusBadge(status, planType) {
  if (planType === 'trial') {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Trial</Badge>;
  }
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Active</Badge>;
    case 'expired':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Expired</Badge>;
    case 'cancelled':
      return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBillingCycle(cycle) {
  const map = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half-yearly',
    yearly: 'Yearly',
  };
  return map[cycle] || cycle || '-';
}

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
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow style={{ background: 'var(--nm-bg)' }}>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>ED Name</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Mobile</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Chapters</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Plan Type</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Billing Cycle</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Status</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Expiry Date</TableHead>
                    <TableHead className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Amount</TableHead>
                    <TableHead className="font-semibold text-right" style={{ color: 'var(--nm-text-primary)' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.subscription_id}>
                      <TableCell className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{sub.ed_name || '-'}</TableCell>
                      <TableCell style={{ color: 'var(--nm-text-secondary)' }}>{sub.ed_mobile || '-'}</TableCell>
                      <TableCell style={{ color: 'var(--nm-text-secondary)' }}>
                        <span className="font-semibold">{sub.chapters_used}</span>
                        <span style={{ color: 'var(--nm-text-muted)' }}> / {sub.chapters_allowed}</span>
                      </TableCell>
                      <TableCell className="capitalize" style={{ color: 'var(--nm-text-secondary)' }}>{sub.plan_type || '-'}</TableCell>
                      <TableCell style={{ color: 'var(--nm-text-secondary)' }}>{formatBillingCycle(sub.billing_cycle)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status, sub.plan_type)}</TableCell>
                      <TableCell style={{ color: 'var(--nm-text-secondary)' }}>{formatDate(sub.end_date)}</TableCell>
                      <TableCell style={{ color: 'var(--nm-text-secondary)' }}>{formatCurrency(sub.amount_paid)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === 'active' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openExtendDialog(sub)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              >
                                <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                                Extend
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCancelDialog(sub)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {sub.status === 'expired' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openExtendDialog(sub)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              Renew
                            </Button>
                          )}
                          {sub.status === 'cancelled' && (
                            <span className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>No actions</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((sub) => (
              <Card key={sub.subscription_id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{sub.ed_name || '-'}</h3>
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{sub.ed_mobile || '-'}</p>
                  </div>
                  {getStatusBadge(sub.status, sub.plan_type)}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                  <div>
                    <span style={{ color: 'var(--nm-text-muted)' }}>Chapters</span>
                    <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                      {sub.chapters_used} / {sub.chapters_allowed}
                    </p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--nm-text-muted)' }}>Plan</span>
                    <p className="font-medium text-slate-700 capitalize">{sub.plan_type || '-'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--nm-text-muted)' }}>Billing</span>
                    <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{formatBillingCycle(sub.billing_cycle)}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--nm-text-muted)' }}>Expiry</span>
                    <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{formatDate(sub.end_date)}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--nm-text-muted)' }}>Amount</span>
                    <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{formatCurrency(sub.amount_paid)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--nm-border)' }}>
                  {sub.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openExtendDialog(sub)}
                        className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                        Extend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCancelDialog(sub)}
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                  {sub.status === 'expired' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExtendDialog(sub)}
                      className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Renew
                    </Button>
                  )}
                  {sub.status === 'cancelled' && (
                    <p className="text-xs w-full text-center" style={{ color: 'var(--nm-text-muted)' }}>No actions available</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ====== Activate Subscription Dialog ====== */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleActivate} className="space-y-4 mt-2">
            {/* Select ED */}
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                Executive Director <span className="text-red-500">*</span>
              </Label>
              <Select
                value={activateForm.superadmin_id}
                onValueChange={(val) => setActivateForm({ ...activateForm, superadmin_id: val })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select an ED" />
                </SelectTrigger>
                <SelectContent>
                  {superadmins.map((sa) => (
                    <SelectItem key={sa.superadmin_id} value={sa.superadmin_id}>
                      {sa.name || sa.mobile} {sa.name && sa.mobile ? `(${sa.mobile})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing cycle */}
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                Billing Cycle <span className="text-red-500">*</span>
              </Label>
              <Select
                value={activateForm.billing_cycle}
                onValueChange={(val) => setActivateForm({ ...activateForm, billing_cycle: val })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((bc) => (
                    <SelectItem key={bc.value} value={bc.value}>
                      {bc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chapters allowed & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                  Chapters Allowed <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={activateForm.chapters_allowed}
                  onChange={(e) => setActivateForm({ ...activateForm, chapters_allowed: e.target.value })}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>Amount Received (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={activateForm.amount_paid}
                  onChange={(e) => setActivateForm({ ...activateForm, amount_paid: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Payment method */}
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select
                value={activateForm.payment_method}
                onValueChange={(val) => setActivateForm({ ...activateForm, payment_method: val })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment reference */}
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>Payment Reference</Label>
              <Input
                placeholder="Transaction ID, receipt no., etc."
                value={activateForm.payment_ref}
                onChange={(e) => setActivateForm({ ...activateForm, payment_ref: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={activateLoading}
                className="w-full"
              >
                {activateLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {activateLoading ? 'Activating...' : 'Activate Subscription'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ====== Extend Subscription Dialog ====== */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {extendSub?.status === 'expired' ? 'Renew' : 'Extend'} Subscription
            </DialogTitle>
          </DialogHeader>
          {extendSub && (
            <div className="mb-2 p-3 rounded-lg text-sm" style={{ background: 'var(--nm-bg)' }}>
              <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{extendSub.ed_name}</p>
              <p style={{ color: 'var(--nm-text-secondary)' }}>
                Current expiry: {formatDate(extendSub.end_date)} &middot; {formatBillingCycle(extendSub.billing_cycle)}
              </p>
            </div>
          )}
          <form onSubmit={handleExtend} className="space-y-4">
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                Additional Months <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 3"
                value={extendForm.additional_months}
                onChange={(e) => setExtendForm({ ...extendForm, additional_months: e.target.value })}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>Amount Paid (Rs.)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={extendForm.amount_paid}
                onChange={(e) => setExtendForm({ ...extendForm, amount_paid: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>Payment Reference</Label>
              <Input
                placeholder="Transaction ID, receipt no., etc."
                value={extendForm.payment_ref}
                onChange={(e) => setExtendForm({ ...extendForm, payment_ref: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                disabled={extendLoading}
                className="w-full"
              >
                {extendLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {extendLoading
                  ? 'Processing...'
                  : extendSub?.status === 'expired'
                    ? 'Renew Subscription'
                    : 'Extend Subscription'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ====== Cancel Confirmation AlertDialog ====== */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the subscription for{' '}
              <span className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{cancelSub?.ed_name}</span>?
              This action cannot be undone. The ED will lose access at the end of the current period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
