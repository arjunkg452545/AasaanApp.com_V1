import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Save, Loader2, IndianRupee, Layers, CalendarDays, Gift, Receipt,
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  setting_id: 'default',
  pricing_model: 'per_chapter',
  billing_cycles: [
    { cycle: 'monthly', months: 1, discount_percent: 0, enabled: true },
    { cycle: 'quarterly', months: 3, discount_percent: 0, enabled: true },
    { cycle: 'half_yearly', months: 6, discount_percent: 0, enabled: true },
    { cycle: 'yearly', months: 12, discount_percent: 0, enabled: true },
  ],
  per_chapter_rate: 0,
  slab_rates: [
    { min_chapters: 1, max_chapters: 3, rate: 0 },
    { min_chapters: 4, max_chapters: 10, rate: 0 },
    { min_chapters: 11, max_chapters: 25, rate: 0 },
    { min_chapters: 26, max_chapters: 9999, rate: 0 },
  ],
  per_member_rate: 0,
  free_trial: { enabled: true, duration_days: 30, max_chapters: 1 },
  gst_percent: 18,
};

const CYCLE_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

export default function DeveloperSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/developer/subscription-settings');
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
    } catch (error) {
      toast.error('Failed to load subscription settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (partialUpdate) => {
    setSaving(true);
    try {
      await api.put('/developer/subscription-settings', partialUpdate);
      toast.success('Settings saved successfully');
      await loadSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // --- Pricing tab helpers ---
  const handlePricingModelChange = (value) => {
    setSettings((prev) => ({ ...prev, pricing_model: value }));
  };

  const handlePerChapterRateChange = (value) => {
    setSettings((prev) => ({ ...prev, per_chapter_rate: Number(value) || 0 }));
  };

  const handlePerMemberRateChange = (value) => {
    setSettings((prev) => ({ ...prev, per_member_rate: Number(value) || 0 }));
  };

  const handleSlabRateChange = (index, value) => {
    setSettings((prev) => {
      const updated = [...prev.slab_rates];
      updated[index] = { ...updated[index], rate: Number(value) || 0 };
      return { ...prev, slab_rates: updated };
    });
  };

  const savePricing = () => {
    handleSave({
      pricing_model: settings.pricing_model,
      per_chapter_rate: settings.per_chapter_rate,
      slab_rates: settings.slab_rates,
      per_member_rate: settings.per_member_rate,
    });
  };

  // --- Billing cycles tab helpers ---
  const handleCycleToggle = (index, checked) => {
    setSettings((prev) => {
      const updated = [...prev.billing_cycles];
      updated[index] = { ...updated[index], enabled: checked };
      return { ...prev, billing_cycles: updated };
    });
  };

  const handleCycleDiscount = (index, value) => {
    setSettings((prev) => {
      const updated = [...prev.billing_cycles];
      updated[index] = { ...updated[index], discount_percent: Number(value) || 0 };
      return { ...prev, billing_cycles: updated };
    });
  };

  const saveBillingCycles = () => {
    handleSave({ billing_cycles: settings.billing_cycles });
  };

  // --- Free trial tab helpers ---
  const handleTrialToggle = (checked) => {
    setSettings((prev) => ({
      ...prev,
      free_trial: { ...prev.free_trial, enabled: checked },
    }));
  };

  const handleTrialField = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      free_trial: { ...prev.free_trial, [field]: Number(value) || 0 },
    }));
  };

  const saveFreeTrial = () => {
    handleSave({ free_trial: settings.free_trial });
  };

  // --- Tax tab helpers ---
  const handleGstChange = (value) => {
    setSettings((prev) => ({ ...prev, gst_percent: Number(value) || 0 }));
  };

  const saveTax = () => {
    handleSave({ gst_percent: settings.gst_percent });
  };

  // --- Slab range label ---
  const formatSlabRange = (slab) => {
    if (slab.max_chapters >= 9999) return `${slab.min_chapters}+`;
    return `${slab.min_chapters} - ${slab.max_chapters}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: 'var(--nm-text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="flex w-full overflow-x-auto mb-6 gap-1">
          <TabsTrigger value="pricing" className="gap-1.5 text-xs sm:text-sm">
            <IndianRupee className="h-4 w-4 hidden sm:inline-block" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm">
            <CalendarDays className="h-4 w-4 hidden sm:inline-block" />
            Billing Cycles
          </TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5 text-xs sm:text-sm">
            <Gift className="h-4 w-4 hidden sm:inline-block" />
            Free Trial
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-4 w-4 hidden sm:inline-block" />
            Tax
          </TabsTrigger>
        </TabsList>

        {/* ========== TAB 1: PRICING SETTINGS ========== */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing Settings</CardTitle>
              <CardDescription>
                Choose a pricing model and configure rates for chapter subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing model selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Pricing Model</Label>
                <RadioGroup
                  value={settings.pricing_model}
                  onValueChange={handlePricingModelChange}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {[
                    { value: 'per_chapter', label: 'Per Chapter', desc: 'Fixed rate per chapter' },
                    { value: 'slab', label: 'Slab-based', desc: 'Tiered chapter ranges' },
                    { value: 'per_member', label: 'Per Member', desc: 'Fixed rate per member' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`model-${option.value}`}
                      className={`relative flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                        settings.pricing_model === option.value
                          ? 'ring-1'
                          : ''
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={`model-${option.value}`} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>{option.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Per Chapter rate */}
              {settings.pricing_model === 'per_chapter' && (
                <Card className=""
              style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-bg)' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="h-4 w-4" style={{ color: 'var(--nm-text-secondary)' }} />
                      <Label className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Per Chapter Rate</Label>
                    </div>
                    <div className="max-w-xs">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>&#8377;</span>
                        <Input
                          type="number"
                          min="0"
                          value={settings.per_chapter_rate}
                          onChange={(e) => handlePerChapterRateChange(e.target.value)}
                          className="pl-7"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--nm-text-secondary)' }}>Rate charged per chapter per month</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Slab rates */}
              {settings.pricing_model === 'slab' && (
                <Card className=""
              style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-bg)' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="h-4 w-4" style={{ color: 'var(--nm-text-secondary)' }} />
                      <Label className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Slab-based Rates</Label>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2.5 px-3 font-medium">Chapter Range</th>
                            <th className="text-left py-2.5 px-3 font-medium">Rate (&#8377; / chapter / month)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settings.slab_rates.map((slab, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-3 px-3">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {formatSlabRange(slab)}
                                </Badge>
                              </td>
                              <td className="py-3 px-3">
                                <div className="relative max-w-[160px]">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>&#8377;</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={slab.rate}
                                    onChange={(e) => handleSlabRateChange(idx, e.target.value)}
                                    className="pl-7"
                                    placeholder="0"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Per Member rate */}
              {settings.pricing_model === 'per_member' && (
                <Card className=""
              style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-bg)' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Layers className="h-4 w-4" style={{ color: 'var(--nm-text-secondary)' }} />
                      <Label className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Per Member Rate</Label>
                    </div>
                    <div className="max-w-xs">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>&#8377;</span>
                        <Input
                          type="number"
                          min="0"
                          value={settings.per_member_rate}
                          onChange={(e) => handlePerMemberRateChange(e.target.value)}
                          className="pl-7"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--nm-text-secondary)' }}>Rate charged per member per month</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={savePricing} disabled={saving} className="bg-[#CF2030] hover:bg-[#A61926]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  <span className="hidden sm:inline">Save Pricing</span><span className="sm:hidden">Save</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB 2: BILLING CYCLES ========== */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing Cycles</CardTitle>
              <CardDescription>
                Enable or disable billing cycles and set discount percentages for longer commitments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2.5 px-3 font-medium">Cycle</th>
                      <th className="text-center py-2.5 px-3 font-medium">Months</th>
                      <th className="text-center py-2.5 px-3 font-medium">Enabled</th>
                      <th className="text-left py-2.5 px-3 font-medium">Discount %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.billing_cycles.map((cycle, idx) => (
                      <tr key={cycle.cycle} className="border-b last:border-0">
                        <td className="py-3.5 px-3">
                          <span className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                            {CYCLE_LABELS[cycle.cycle] || cycle.cycle}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {cycle.months}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Switch
                            checked={cycle.enabled}
                            onCheckedChange={(checked) => handleCycleToggle(idx, checked)}
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="relative max-w-[120px]">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={cycle.discount_percent}
                              onChange={(e) => handleCycleDiscount(idx, e.target.value)}
                              className="pr-7"
                              placeholder="0"
                              disabled={!cycle.enabled}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-6">
                <Button onClick={saveBillingCycles} disabled={saving} className="bg-[#CF2030] hover:bg-[#A61926]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  <span className="hidden sm:inline">Save Billing Cycles</span><span className="sm:hidden">Save</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB 3: FREE TRIAL ========== */}
        <TabsContent value="trial">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Free Trial</CardTitle>
              <CardDescription>
                Configure the free trial period offered to new chapters on signup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: 'var(--nm-border)', background: 'var(--nm-bg)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>Enable Free Trial</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>
                    Allow new chapters to use the platform free for a limited period
                  </p>
                </div>
                <Switch
                  checked={settings.free_trial.enabled}
                  onCheckedChange={handleTrialToggle}
                />
              </div>

              {settings.free_trial.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="trial-days" className="text-sm font-medium text-slate-700">
                      Duration (days)
                    </Label>
                    <Input
                      id="trial-days"
                      type="number"
                      min="1"
                      value={settings.free_trial.duration_days}
                      onChange={(e) => handleTrialField('duration_days', e.target.value)}
                      className=""
                      placeholder="30"
                    />
                    <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Number of days the trial lasts</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trial-chapters" className="text-sm font-medium text-slate-700">
                      Max Chapters During Trial
                    </Label>
                    <Input
                      id="trial-chapters"
                      type="number"
                      min="1"
                      value={settings.free_trial.max_chapters}
                      onChange={(e) => handleTrialField('max_chapters', e.target.value)}
                      className=""
                      placeholder="1"
                    />
                    <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Maximum chapters allowed during the trial period</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={saveFreeTrial} disabled={saving} className="bg-[#CF2030] hover:bg-[#A61926]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  <span className="hidden sm:inline">Save Free Trial</span><span className="sm:hidden">Save</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== TAB 4: TAX SETTINGS ========== */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tax Settings</CardTitle>
              <CardDescription>
                Set the GST percentage applied to all subscription invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-xs space-y-2">
                <Label htmlFor="gst-percent" className="text-sm font-medium text-slate-700">
                  GST Percentage
                </Label>
                <div className="relative">
                  <Input
                    id="gst-percent"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.gst_percent}
                    onChange={(e) => handleGstChange(e.target.value)}
                    className="pr-7"
                    placeholder="18"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>%</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                  GST applied on all subscription invoices
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveTax} disabled={saving} className="bg-[#CF2030] hover:bg-[#A61926]">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  <span className="hidden sm:inline">Save Tax Settings</span><span className="sm:hidden">Save</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
