// MAX 300 LINES
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';

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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

export default function SubscriptionModals({
  activateOpen, setActivateOpen, activateForm, setActivateForm,
  activateLoading, onActivateSubmit, superadmins,
  extendOpen, setExtendOpen, extendSub, extendForm, setExtendForm,
  extendLoading, onExtendSubmit,
  cancelOpen, setCancelOpen, cancelSub, cancelLoading, onCancelConfirm,
}) {
  return (
    <>
      {/* ====== Activate Subscription Dialog ====== */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={onActivateSubmit} className="space-y-4 mt-2">
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
          <form onSubmit={onExtendSubmit} className="space-y-4">
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
              onClick={onCancelConfirm}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
