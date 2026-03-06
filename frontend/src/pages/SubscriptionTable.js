// MAX 300 LINES
import React from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import { CalendarPlus, XCircle, RefreshCw } from 'lucide-react';

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

export default function SubscriptionTable({ subscriptions, onExtend, onCancel }) {
  return (
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
              {subscriptions.map((sub) => (
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
                            onClick={() => onExtend(sub)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                            Extend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCancel(sub)}
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
                          onClick={() => onExtend(sub)}
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
        {subscriptions.map((sub) => (
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
                    onClick={() => onExtend(sub)}
                    className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                    Extend
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCancel(sub)}
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
                  onClick={() => onExtend(sub)}
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
  );
}
