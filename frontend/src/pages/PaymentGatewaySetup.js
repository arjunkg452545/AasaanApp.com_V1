import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CreditCard, Lock, Zap,
  ExternalLink, CheckCircle2,
} from 'lucide-react';

const GATEWAY_ICONS = {
  razorpay: '💳',
  paytm: '📱',
  phonepe: '📲',
};

export default function PaymentGatewaySetup() {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadGateways();
  }, []); // eslint-disable-line

  const loadGateways = async () => {
    try {
      const res = await api.get('/gateway/supported');
      setGateways(res.data);
    } catch {
      toast.error('Failed to load gateways');
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Payment Gateways</h1>
        <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Online payment gateway integrations</p>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {/* Info Banner */}
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Online Payments Coming Soon</p>
              <p className="text-xs text-blue-700 mt-1">
                We're working on integrating payment gateways so members can pay directly online.
                For now, members can pay via UPI, NEFT, or cash and submit payment proofs.
              </p>
            </div>
          </div>
        </Card>

        {/* Gateway Cards */}
        <div className="space-y-4">
          {gateways.map(gw => (
            <Card
              key={gw.provider}
              className="p-5 md:p-6 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: 'var(--nm-surface)' }}>
                  {GATEWAY_ICONS[gw.provider] || '💳'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{gw.name}</h3>
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                      <Lock className="h-2.5 w-2.5 mr-1" />
                      Coming Soon
                    </Badge>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{gw.description}</p>
                </div>
                <Button
                  variant="outline"
                  disabled
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Setup
                </Button>
              </div>

              {/* Features preview */}
              <div className="mt-4 pt-4" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--nm-border)' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Cards', 'UPI', 'Net Banking', 'Wallets'].map(feature => (
                    <div key={feature} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                      <CheckCircle2 className="h-3 w-3" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Current Payment Methods */}
        <Card className="mt-6 p-5 md:p-6 border-l-4 border-l-emerald-500">
          <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--nm-text-primary)' }}>Currently Available Methods</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <span className="text-xl">📱</span>
              <div>
                <p className="text-sm font-medium text-emerald-900">UPI Pay</p>
                <p className="text-xs text-emerald-600">Direct UPI link + QR code</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <span className="text-xl">🏦</span>
              <div>
                <p className="text-sm font-medium text-emerald-900">Bank Transfer</p>
                <p className="text-xs text-emerald-600">NEFT / IMPS / RTGS</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <span className="text-xl">💵</span>
              <div>
                <p className="text-sm font-medium text-emerald-900">Cash / Cheque</p>
                <p className="text-xs text-emerald-600">Manual entry by admin</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
