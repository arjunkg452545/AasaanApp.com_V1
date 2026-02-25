import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Save, IndianRupee, Calendar,
  PlayCircle, CheckCircle2, AlertCircle,
} from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function ChapterFeeConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
  const navigate = useNavigate();

  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  useEffect(() => {
    loadConfig();
  }, []); // eslint-disable-line

  const loadConfig = async () => {
    try {
      const endpoint = isAdmin ? '/admin/chapter/fee-config' : '/superadmin/chapter/fee-config';
      // For admin, no chapter_id needed; for superadmin, need to pass chapter_id via URL
      const res = await api.get(isAdmin ? endpoint : endpoint);
      setConfig(res.data);
    } catch {
      toast.error('Failed to load fee config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isAdmin) {
      toast.error('Admins cannot modify fee config');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/superadmin/chapter/${config.chapter_id}/fee-config`, {
        kitty_amount: config.kitty_amount,
        meeting_fee: config.meeting_fee,
        induction_fee: config.induction_fee,
        renewal_fee: config.renewal_fee,
      });
      toast.success('Fee config saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await api.post('/admin/fees/generate-monthly', {
        month: parseInt(genMonth),
        year: parseInt(genYear),
        fee_types: ['kitty', 'meeting_fee'],
      });
      setGenResult(res.data);
      toast.success(`Generated ${res.data.created} fee entries`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">Chapter Fee Configuration</h1>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        {/* Fee Amounts */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-[#CF2030]" /> Fee Amounts
            </h2>
            {config?.is_override && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">Custom Override</Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Kitty Amount (Monthly)</Label>
              <Input
                type="number"
                value={config?.kitty_amount || 0}
                onChange={e => setConfig(prev => ({ ...prev, kitty_amount: parseFloat(e.target.value) || 0 }))}
                disabled={isAdmin}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Meeting Fee (Monthly)</Label>
              <Input
                type="number"
                value={config?.meeting_fee || 0}
                onChange={e => setConfig(prev => ({ ...prev, meeting_fee: parseFloat(e.target.value) || 0 }))}
                disabled={isAdmin}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Induction Fee (One-time)</Label>
              <Input
                type="number"
                value={config?.induction_fee || 0}
                onChange={e => setConfig(prev => ({ ...prev, induction_fee: parseFloat(e.target.value) || 0 }))}
                disabled={isAdmin}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Renewal Fee (Yearly)</Label>
              <Input
                type="number"
                value={config?.renewal_fee || 0}
                onChange={e => setConfig(prev => ({ ...prev, renewal_fee: parseFloat(e.target.value) || 0 }))}
                disabled={isAdmin}
                className="mt-1"
              />
            </div>
          </div>
          {!isAdmin && (
            <Button onClick={handleSave} disabled={saving} className="bg-[#CF2030] hover:bg-[#A61926]">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Fee Config'}
            </Button>
          )}
        </Card>

        {/* Generate Monthly Fees */}
        {isAdmin && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#005596]" /> Generate Monthly Fees
            </h2>
            <p className="text-sm text-slate-500">
              Generate kitty and meeting fee entries for all active members.
              Existing entries will be skipped (idempotent).
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Month</Label>
                <Select value={genMonth} onValueChange={setGenMonth}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={genYear}
                  onChange={e => setGenYear(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-[#005596] hover:bg-[#003d6b]"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>

            {genResult && (
              <div className={`p-3 rounded-lg ${genResult.created > 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-center gap-2">
                  {genResult.created > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <p className="text-sm font-medium">
                    Created: {genResult.created} | Skipped: {genResult.skipped}
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
