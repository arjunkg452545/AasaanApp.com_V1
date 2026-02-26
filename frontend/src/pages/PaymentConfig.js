import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Save, Smartphone, Building2,
  IndianRupee, Shield, CreditCard, ToggleLeft, ToggleRight,
} from 'lucide-react';

const TABS = [
  { id: 'upi', label: 'UPI Settings', icon: Smartphone },
  { id: 'bank', label: 'Bank Details', icon: Building2 },
  { id: 'fees', label: 'Fee Defaults', icon: IndianRupee },
  { id: 'verification', label: 'Verification', icon: Shield },
];

export default function PaymentConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('upi');
  const navigate = useNavigate();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get('/superadmin/payment-config');
      setConfig(res.data);
    } catch {
      toast.error('Failed to load payment config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/superadmin/payment-config', config);
      toast.success('Payment config saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateFeeDefault = (field, value) => {
    setConfig(prev => ({
      ...prev,
      default_fees: {
        ...prev.default_fees,
        [field]: parseFloat(value) || 0,
      },
    }));
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
        <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/dashboard')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Payment Configuration</h1>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 rounded-lg p-1 mb-6 overflow-x-auto" style={{ background: 'var(--nm-surface)', borderColor: 'var(--nm-border)', borderWidth: '1px', borderStyle: 'solid' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#CF2030] text-white'
                    : ''
                }`}
                style={activeTab !== tab.id ? { color: 'var(--nm-text-secondary)' } : {}}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* UPI Tab */}
        {activeTab === 'upi' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
              <Smartphone className="h-5 w-5 text-[#CF2030]" /> UPI Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>UPI ID</Label>
                <Input
                  value={config?.upi_id || ''}
                  onChange={e => updateField('upi_id', e.target.value)}
                  placeholder="example@ybl"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>UPI Holder Name</Label>
                <Input
                  value={config?.upi_holder_name || ''}
                  onChange={e => updateField('upi_holder_name', e.target.value)}
                  placeholder="Name on UPI"
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
              Members will see this UPI ID for payments. QR code will be auto-generated.
            </p>
          </Card>
        )}

        {/* Bank Tab */}
        {activeTab === 'bank' && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
                <Building2 className="h-5 w-5 text-[#CF2030]" /> Bank Details
              </h2>
              <button
                onClick={() => updateField('bank_enabled', !config?.bank_enabled)}
                className="flex items-center gap-2 text-sm"
              >
                {config?.bank_enabled ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6" style={{ color: 'var(--nm-text-muted)' }} />
                )}
                {config?.bank_enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Account Holder Name</Label>
                <Input
                  value={config?.bank_account_name || ''}
                  onChange={e => updateField('bank_account_name', e.target.value)}
                  placeholder="Account name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={config?.bank_account_number || ''}
                  onChange={e => updateField('bank_account_number', e.target.value)}
                  placeholder="Account number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input
                  value={config?.bank_ifsc || ''}
                  onChange={e => updateField('bank_ifsc', e.target.value)}
                  placeholder="IFSC code"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={config?.bank_name || ''}
                  onChange={e => updateField('bank_name', e.target.value)}
                  placeholder="Bank name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Input
                  value={config?.bank_branch || ''}
                  onChange={e => updateField('bank_branch', e.target.value)}
                  placeholder="Branch name"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Fee Defaults Tab */}
        {activeTab === 'fees' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
              <IndianRupee className="h-5 w-5 text-[#CF2030]" /> Default Fee Amounts
            </h2>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              These are default amounts for all chapters. You can override per-chapter in Chapter Fee Config.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Kitty Amount (Monthly)</Label>
                <Input
                  type="number"
                  value={config?.default_fees?.kitty_amount || 0}
                  onChange={e => updateFeeDefault('kitty_amount', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Meeting Fee (Monthly)</Label>
                <Input
                  type="number"
                  value={config?.default_fees?.meeting_fee || 0}
                  onChange={e => updateFeeDefault('meeting_fee', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Induction Fee (One-time)</Label>
                <Input
                  type="number"
                  value={config?.default_fees?.induction_fee || 0}
                  onChange={e => updateFeeDefault('induction_fee', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Renewal Fee (Yearly)</Label>
                <Input
                  type="number"
                  value={config?.default_fees?.renewal_fee || 0}
                  onChange={e => updateFeeDefault('renewal_fee', e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
              <Shield className="h-5 w-5 text-[#CF2030]" /> Verification Settings
            </h2>
            <div className="space-y-4">
              <ToggleItem
                label="Require Payment Screenshot"
                description="Members must upload a screenshot of their payment"
                checked={config?.require_screenshot ?? true}
                onChange={v => updateField('require_screenshot', v)}
              />
              <ToggleItem
                label="Require UTR Number"
                description="Members must provide UTR/reference number"
                checked={config?.require_utr ?? true}
                onChange={v => updateField('require_utr', v)}
              />
              <ToggleItem
                label="Two-Level Verification"
                description="Admin confirms, then ED/Accountant approves"
                checked={config?.two_level_verification ?? true}
                onChange={v => updateField('two_level_verification', v)}
              />
              <ToggleItem
                label="Manual Payment Entry"
                description="Allow admins to record cash/cheque payments manually"
                checked={config?.manual_payment_enabled ?? true}
                onChange={v => updateField('manual_payment_enabled', v)}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ToggleItem({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 last:border-0" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--nm-border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{description}</p>
      </div>
      <button onClick={() => onChange(!checked)}>
        {checked ? (
          <ToggleRight className="h-7 w-7 text-green-600" />
        ) : (
          <ToggleLeft className="h-7 w-7" style={{ color: 'var(--nm-text-muted)' }} />
        )}
      </button>
    </div>
  );
}
