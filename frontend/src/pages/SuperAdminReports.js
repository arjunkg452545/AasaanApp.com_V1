import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, IndianRupee, TrendingUp, Building2, Users,
  Activity, BarChart3,
} from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);
}

const HEALTH_COLORS = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
};

export default function SuperAdminReports() {
  const [revenue, setRevenue] = useState(null);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [revRes, healthRes] = await Promise.all([
        api.get('/superadmin/reports/revenue'),
        api.get('/superadmin/reports/chapter-health'),
      ]);
      setRevenue(revRes.data);
      setHealth(healthRes.data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Reports & Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Revenue overview and chapter health</p>
      </div>

      {/* Revenue Section */}
      {revenue && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(revenue.total)}</p>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{revenue.total_count} payments collected</p>
            </Card>
            <Card className="p-5 border-l-4 border-l-blue-500 col-span-1 md:col-span-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
                <BarChart3 className="h-4 w-4 text-blue-600" /> Revenue by Chapter
              </h3>
              <div className="space-y-2">
                {revenue.by_chapter?.length > 0 ? revenue.by_chapter.map(ch => {
                  const maxVal = Math.max(...revenue.by_chapter.map(c => c.total), 1);
                  const pct = Math.round((ch.total / maxVal) * 100);
                  return (
                    <div key={ch.chapter_id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: 'var(--nm-text-primary)' }}>{ch.chapter_name || ch.chapter_id}</span>
                        <span className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{formatCurrency(ch.total)}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--nm-border)' }}>
                        <div className="h-2 rounded-full bg-[#CF2030]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }) : <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>No revenue data yet</p>}
              </div>
            </Card>
          </div>

          {/* Monthly Trend */}
          {revenue.by_month?.length > 0 && (
            <Card className="p-5 mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
                <TrendingUp className="h-4 w-4 text-purple-600" /> Monthly Trend
              </h3>
              <div className="flex items-end gap-2 h-32 overflow-x-auto pb-2">
                {[...revenue.by_month].reverse().map((m, i) => {
                  const maxVal = Math.max(...revenue.by_month.map(x => x.total), 1);
                  const pct = Math.max((m.total / maxVal) * 100, 5);
                  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-[40px]">
                      <span className="text-[9px] font-medium" style={{ color: 'var(--nm-text-muted)' }}>{formatCurrency(m.total).replace(/\.00$/, '')}</span>
                      <div className="w-8 rounded-t-sm bg-[#CF2030]/80" style={{ height: `${pct}%`, minHeight: '4px' }} />
                      <span className="text-[9px]" style={{ color: 'var(--nm-text-muted)' }}>{months[m.month] || ''}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Chapter Health */}
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
        <Activity className="h-4 w-4 text-[#CF2030]" /> Chapter Health
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--nm-border)' }}>
              {['Chapter', 'Members', 'Attendance %', 'Collection %', 'Health'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {health.map(ch => (
              <tr key={ch.chapter_id} style={{ borderBottom: '1px solid var(--nm-border)' }}>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--nm-text-primary)' }}>{ch.chapter_name}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-xs" style={{ color: 'var(--nm-text-primary)' }}>
                  <div className="flex items-center gap-1"><Users className="h-3 w-3" style={{ color: 'var(--nm-text-muted)' }} /> {ch.members}</div>
                </td>
                <td className="py-3 px-3 text-xs font-medium" style={{ color: ch.attendance_pct >= 75 ? '#059669' : ch.attendance_pct >= 50 ? '#D97706' : '#DC2626' }}>
                  {ch.attendance_pct}%
                </td>
                <td className="py-3 px-3 text-xs font-medium" style={{ color: ch.collection_pct >= 75 ? '#059669' : ch.collection_pct >= 50 ? '#D97706' : '#DC2626' }}>
                  {ch.collection_pct}%
                </td>
                <td className="py-3 px-3">
                  <Badge className={`text-[10px] ${HEALTH_COLORS[ch.health] || ''}`}>
                    {ch.health === 'green' ? 'Healthy' : ch.health === 'yellow' ? 'Warning' : 'Critical'}
                  </Badge>
                </td>
              </tr>
            ))}
            {health.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-xs" style={{ color: 'var(--nm-text-muted)' }}>No chapter data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
