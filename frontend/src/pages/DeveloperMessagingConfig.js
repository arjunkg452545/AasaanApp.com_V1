import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, ToggleLeft, ToggleRight, TestTube, BarChart3, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../utils/api';

const WA_PROVIDERS = ['gupshup', 'wati', 'interakt', 'aisensy'];
const SMS_PROVIDERS = ['msg91', '2factor', 'twilio'];

export default function DeveloperMessagingConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testChannel, setTestChannel] = useState('whatsapp');
  const [testMobile, setTestMobile] = useState('');
  const [testMessage, setTestMessage] = useState('Hello, this is a test message from AasaanApp.');
  const [testing, setTesting] = useState(false);
  const [usage, setUsage] = useState(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/developer/messaging-config');
      setConfig(res.data);
    } catch { toast.error('Failed to load config'); }
    setLoading(false);
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await api.get('/developer/messaging-usage');
      setUsage(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchConfig(); fetchUsage(); }, [fetchConfig, fetchUsage]);

  const updateField = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateTemplate = (key, value) => {
    setConfig(prev => ({ ...prev, whatsapp_templates: { ...prev.whatsapp_templates, [key]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/developer/messaging-config', {
        whatsapp_enabled: config.whatsapp_enabled,
        whatsapp_provider: config.whatsapp_provider,
        whatsapp_api_key: config.whatsapp_api_key?.includes('****') ? undefined : config.whatsapp_api_key,
        whatsapp_phone_number_id: config.whatsapp_phone_number_id,
        whatsapp_business_id: config.whatsapp_business_id,
        whatsapp_templates: config.whatsapp_templates,
        sms_enabled: config.sms_enabled,
        sms_provider: config.sms_provider,
        sms_api_key: config.sms_api_key?.includes('****') ? undefined : config.sms_api_key,
        sms_sender_id: config.sms_sender_id,
      });
      toast.success('Configuration saved');
      fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testMobile.trim()) { toast.error('Enter a mobile number'); return; }
    setTesting(true);
    try {
      const res = await api.post('/developer/messaging-test', { channel: testChannel, mobile: testMobile.trim(), message: testMessage });
      toast.success(res.data?.message || 'Test sent');
      fetchUsage();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Test failed');
    }
    setTesting(false);
  };

  if (loading || !config) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto text-center py-16">
        <div className="nm-raised rounded-2xl p-6 inline-flex mb-3">
          <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--nm-accent)', borderTopColor: 'transparent' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Loading messaging config...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="nm-raised rounded-xl p-2.5">
            <MessageSquare className="h-5 w-5" style={{ color: 'var(--nm-accent)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>Messaging Gateway</h1>
            <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>WhatsApp & SMS Configuration</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="nm-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* WhatsApp Section */}
      <div className="nm-raised rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#128172;</span>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>WhatsApp Business</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]" style={{
              color: config.whatsapp_enabled ? '#16a34a' : 'var(--nm-text-muted)',
              borderColor: config.whatsapp_enabled ? '#16a34a' : 'var(--nm-border)',
            }}>
              {config.whatsapp_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <button onClick={() => updateField('whatsapp_enabled', !config.whatsapp_enabled)} style={{ color: config.whatsapp_enabled ? '#16a34a' : 'var(--nm-text-muted)' }}>
              {config.whatsapp_enabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--nm-text-muted)' }}>Provider</label>
            <div className="flex flex-wrap gap-2">
              {WA_PROVIDERS.map(p => (
                <button key={p} onClick={() => updateField('whatsapp_provider', p)} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${config.whatsapp_provider === p ? 'nm-pressed' : 'nm-raised'}`}
                  style={{ color: config.whatsapp_provider === p ? '#CF2030' : 'var(--nm-text-secondary)' }}>{p}</button>
              ))}
            </div>
          </div>
          <InputField label="API Key" value={config.whatsapp_api_key} onChange={v => updateField('whatsapp_api_key', v)} type="password" />
          <InputField label="Phone Number ID" value={config.whatsapp_phone_number_id} onChange={v => updateField('whatsapp_phone_number_id', v)} />
          <InputField label="Business Account ID" value={config.whatsapp_business_id} onChange={v => updateField('whatsapp_business_id', v)} />

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--nm-text-muted)' }}>Template IDs</label>
            <div className="space-y-2">
              {['payment_reminder', 'meeting_schedule', 'general'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <span className="text-xs w-28 shrink-0 capitalize" style={{ color: 'var(--nm-text-secondary)' }}>{t.replace(/_/g, ' ')}</span>
                  <input type="text" value={config.whatsapp_templates?.[t] || ''} onChange={e => updateTemplate(t, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs nm-pressed" style={{ color: 'var(--nm-text-primary)', background: 'var(--nm-surface)' }} placeholder="Template ID" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SMS Section */}
      <div className="nm-raised rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#128241;</span>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>SMS Gateway</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]" style={{
              color: config.sms_enabled ? '#16a34a' : 'var(--nm-text-muted)',
              borderColor: config.sms_enabled ? '#16a34a' : 'var(--nm-border)',
            }}>
              {config.sms_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <button onClick={() => updateField('sms_enabled', !config.sms_enabled)} style={{ color: config.sms_enabled ? '#16a34a' : 'var(--nm-text-muted)' }}>
              {config.sms_enabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--nm-text-muted)' }}>Provider</label>
            <div className="flex flex-wrap gap-2">
              {SMS_PROVIDERS.map(p => (
                <button key={p} onClick={() => updateField('sms_provider', p)} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize ${config.sms_provider === p ? 'nm-pressed' : 'nm-raised'}`}
                  style={{ color: config.sms_provider === p ? '#CF2030' : 'var(--nm-text-secondary)' }}>{p}</button>
              ))}
            </div>
          </div>
          <InputField label="API Key" value={config.sms_api_key} onChange={v => updateField('sms_api_key', v)} type="password" />
          <InputField label="Sender ID" value={config.sms_sender_id} onChange={v => updateField('sms_sender_id', v)} />
        </div>
      </div>

      {/* Test Section */}
      <div className="nm-raised rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <TestTube className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Send Test Message</h2>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            {['whatsapp', 'sms'].map(ch => (
              <button key={ch} onClick={() => setTestChannel(ch)} className={`px-4 py-2 rounded-lg text-xs font-medium capitalize ${testChannel === ch ? 'nm-pressed' : 'nm-raised'}`}
                style={{ color: testChannel === ch ? '#CF2030' : 'var(--nm-text-secondary)' }}>{ch}</button>
            ))}
          </div>
          <InputField label="Mobile Number" value={testMobile} onChange={setTestMobile} placeholder="919876543210" />
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--nm-text-muted)' }}>Message</label>
            <textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs nm-pressed resize-none" style={{ color: 'var(--nm-text-primary)', background: 'var(--nm-surface)' }} />
          </div>
          <button onClick={handleTest} disabled={testing} className="nm-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            <Send className="h-4 w-4" />{testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>

      {/* Usage Dashboard */}
      <div className="nm-raised rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Usage (Placeholder)</h2>
        </div>
        {usage ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="nm-pressed rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--nm-accent)' }}>{usage.whatsapp_count}</p>
              <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>WhatsApp Messages</p>
            </div>
            <div className="nm-pressed rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--nm-accent)' }}>{usage.sms_count}</p>
              <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>SMS Messages</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center py-4" style={{ color: 'var(--nm-text-muted)' }}>No usage data yet</p>
        )}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--nm-text-muted)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder || label}
        className="w-full px-3 py-2.5 rounded-lg text-xs nm-pressed" style={{ color: 'var(--nm-text-primary)', background: 'var(--nm-surface)' }} />
    </div>
  );
}
