// MAX 300 LINES
import React from 'react';
import { CreditCard, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function SASubscriptionBanner({ subscription, subMeta }) {
  if (!subscription) {
    return (
      <div className="rounded-lg px-5 py-4 flex items-center gap-3" style={{ borderColor: 'var(--nm-border)', borderWidth: '1px', borderStyle: 'solid', background: 'var(--nm-surface)' }}>
        <CreditCard className="h-5 w-5 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No active subscription.</p>
      </div>
    );
  }

  const isExpired = subscription.status === 'expired' || (subMeta.days_remaining != null && subMeta.days_remaining <= 0);
  const nearExpiry = !isExpired && subMeta.days_remaining != null && subMeta.days_remaining <= 7;

  if (isExpired) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
        <p className="text-sm font-medium text-red-700">
          Your subscription has expired. Contact support to recharge.
        </p>
      </div>
    );
  }

  if (nearExpiry) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-sm font-medium text-amber-700">
          Your subscription expires in {subMeta.days_remaining} day{subMeta.days_remaining !== 1 ? 's' : ''}. Renew soon to avoid interruption.
        </p>
      </div>
    );
  }

  // Active
  const planLabel =
    (subscription.plan || subscription.plan_name || 'Plan').charAt(0).toUpperCase() +
    (subscription.plan || subscription.plan_name || 'Plan').slice(1);
  const expiresLabel = subscription.end_date
    ? formatDate(subscription.end_date)
    : subMeta.days_remaining != null
      ? `${subMeta.days_remaining} days remaining`
      : 'N/A';

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
        <span className="text-sm font-medium text-emerald-700">Active Subscription</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-emerald-700">
        <span>
          <span className="font-semibold">Plan:</span> {planLabel}
        </span>
        <span>
          <span className="font-semibold">Expires:</span> {expiresLabel}
        </span>
        <span>
          <span className="font-semibold">Chapters:</span> {subMeta.chapters_used}/{subMeta.chapters_allowed}
        </span>
      </div>
    </div>
  );
}
