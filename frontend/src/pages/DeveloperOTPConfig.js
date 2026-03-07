import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Save, Loader2, MessageSquare, Send, Eye, EyeOff,
  CheckCircle2, XCircle, BarChart3, Clock, Phone,
} from 'lucide-react';

const PROVIDERS = [
  { value: 'msg91', label: 'MSG91' },
  { value: '2factor', label: '2Factor' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'gupshup', label: 'Gupshup' },
  { value: 'custom', label: 'Custom' },
];

export default function DeveloperOTPConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMobile, setTestMobile] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState('');

  // Usage stats
  const [usage, setUsage] = useState(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get('/developer/otp-config');
      setConfig(res.data);
      setApiKeyValue(''); // Don't show actual key
    } catch {
      toast.error('Failed to load OTP config');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const res = await api.get('/developer/otp-usage');
      setUsage(res.data);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadUsage();
  }, [loadConfig, loadUsage]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: config.enabled,
        provider: config.provider,
        sender_id: config.sender_id,
        template_id: config.template_id,
        otp_length: config.otp_length,
        expiry_minutes: config.expiry_minutes,
        daily_limit_per_number: config.daily_limit_per_number,
        template_text: config.template_text,
      };
      if (apiKeyValue) payload.api_key = apiKeyValue;
      await api.put('/developer/otp-config', payload);
      toast.success('OTP configuration saved');
      await loadConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testMobile) { toast.error('Enter a mobile number'); return; }
    setTesting(true);
    try {
      await api.post('/developer/otp-test', { mobile: testMobile });
      toast.success('Test OTP sent to ' + testMobile);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 rounded-full mx-auto mb-4"
               style={{ borderColor: 'var(--nm-accent)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--nm-text-secondary)' }}>Loading OTP config...</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const maxBar = usage?.monthly_breakdown?.length
    ? Math.max(...usage.monthly_breakdown.map(m => m.count), 1)
    : 1;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>OTP Gateway Configuration</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
          Configure SMS OTP provider for member login authentication
        </p>
      </div>

      {/* Section 1: Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: 'var(--nm-accent)' }} />
                Gateway Settings
              </CardTitle>
              <CardDescription>Configure your SMS OTP provider</CardDescription>
            </div>
            <Badge variant={config.enabled ? 'default' : 'secondary'}
                   className={config.enabled ? 'bg-green-100 text-green-800' : ''}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border"
               style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-bg)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Enable OTP Login</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>
                Allow members to log in via OTP instead of password
              </p>
            </div>
            <Switch checked={config.enabled}
                    onCheckedChange={(v) => setConfig(prev => ({ ...prev, enabled: v }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Provider</Label>
              <Select value={config.provider}
                      onValueChange={(v) => setConfig(prev => ({ ...prev, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">API Key</Label>
              <div className="relative">
                <Input type={showApiKey ? 'text' : 'password'}
                       value={apiKeyValue}
                       onChange={(e) => setApiKeyValue(e.target.value)}
                       placeholder={config.api_key_masked || 'Enter API key'}
                       className="pr-10" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                        style={{ color: 'var(--nm-text-muted)' }}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {config.api_key_masked && (
                <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Current: {config.api_key_masked}</p>
              )}
            </div>

            {/* Sender ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sender ID</Label>
              <Input value={config.sender_id || ''}
                     onChange={(e) => setConfig(prev => ({ ...prev, sender_id: e.target.value }))}
                     placeholder="AASAAN" />
            </div>

            {/* Template ID */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Template ID</Label>
              <Input value={config.template_id || ''}
                     onChange={(e) => setConfig(prev => ({ ...prev, template_id: e.target.value }))}
                     placeholder="Enter template ID" />
            </div>

            {/* OTP Length */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">OTP Length</Label>
              <div className="flex gap-3">
                {[4, 6].map(len => (
                  <button key={len} type="button"
                    onClick={() => setConfig(prev => ({ ...prev, otp_length: len }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      config.otp_length === len
                        ? 'nm-pressed'
                        : 'nm-raised'
                    }`}
                    style={{
                      color: config.otp_length === len ? 'var(--nm-accent)' : 'var(--nm-text-secondary)',
                      borderColor: config.otp_length === len ? 'var(--nm-accent)' : 'var(--nm-border)',
                    }}>
                    {len} digits
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Expiry (minutes)</Label>
              <Select value={String(config.expiry_minutes || 5)}
                      onValueChange={(v) => setConfig(prev => ({ ...prev, expiry_minutes: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Daily limit */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Daily Limit per Number</Label>
              <Input type="number" min="1" max="50"
                     value={config.daily_limit_per_number || 5}
                     onChange={(e) => setConfig(prev => ({ ...prev, daily_limit_per_number: Number(e.target.value) || 5 }))}
                     className="max-w-[200px]" />
            </div>
          </div>

          {/* Test OTP */}
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-bg)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--nm-text-primary)' }}>Test OTP</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                       style={{ color: 'var(--nm-text-muted)' }} />
                <Input value={testMobile}
                       onChange={(e) => setTestMobile(e.target.value)}
                       placeholder="Enter mobile number"
                       className="pl-9" />
              </div>
              <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-1.5">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Test
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-[#CF2030] hover:bg-[#A61926] gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Usage Dashboard */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: 'var(--nm-accent)' }} />
              Usage Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Today', value: usage.today_count, icon: Clock },
                { label: 'This Month', value: usage.month_count, icon: BarChart3 },
                { label: 'Total', value: usage.total_count, icon: MessageSquare },
                { label: 'Est. Cost', value: `\u20B9${usage.total_cost}`, icon: CheckCircle2 },
              ].map((stat, i) => (
                <div key={i} className="nm-raised rounded-xl p-4 text-center">
                  <stat.icon className="h-5 w-5 mx-auto mb-1" style={{ color: 'var(--nm-accent)' }} />
                  <p className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Monthly bar chart */}
            {usage.monthly_breakdown?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--nm-text-primary)' }}>Monthly Breakdown</p>
                <div className="flex items-end gap-2 h-32">
                  {[...usage.monthly_breakdown].reverse().map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--nm-text-secondary)' }}>
                        {m.count}
                      </span>
                      <div className="w-full rounded-t-md"
                           style={{
                             height: `${Math.max((m.count / maxBar) * 100, 4)}%`,
                             background: 'var(--nm-accent)',
                             opacity: 0.8,
                           }} />
                      <span className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>
                        {m.month?.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent logs table */}
            {usage.recent_logs?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--nm-text-primary)' }}>Recent OTP Logs</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--nm-border)' }}>
                        <th className="text-left py-2 px-2 font-medium text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Mobile</th>
                        <th className="text-left py-2 px-2 font-medium text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Status</th>
                        <th className="text-left py-2 px-2 font-medium text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Provider</th>
                        <th className="text-left py-2 px-2 font-medium text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.recent_logs.map((log, i) => (
                        <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--nm-border)' }}>
                          <td className="py-2 px-2 font-mono text-xs" style={{ color: 'var(--nm-text-primary)' }}>{log.mobile}</td>
                          <td className="py-2 px-2">
                            <Badge variant="outline" className={`text-[10px] ${
                              log.status === 'used' ? 'bg-green-50 text-green-700 border-green-200' :
                              log.status === 'expired' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              log.status === 'sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {log.status === 'used' && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                              {log.status === 'expired' && <Clock className="h-3 w-3 mr-0.5" />}
                              {log.status === 'failed' && <XCircle className="h-3 w-3 mr-0.5" />}
                              {log.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{log.provider}</td>
                          <td className="py-2 px-2 text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                            {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
