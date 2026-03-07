import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, ScrollText, Shield, User, Settings,
  Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';

const ROLE_COLORS = {
  developer: 'bg-violet-100 text-violet-700',
  superadmin: 'bg-blue-100 text-blue-700',
  admin: 'bg-amber-100 text-amber-700',
  member: 'bg-emerald-100 text-emerald-700',
  accountant: 'bg-indigo-100 text-indigo-700',
};

const ACTION_COLORS = {
  login: 'bg-blue-100 text-blue-700',
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  verify: 'bg-indigo-100 text-indigo-700',
  approve: 'bg-emerald-100 text-emerald-700',
  reject: 'bg-red-100 text-red-700',
  deactivate: 'bg-slate-100 text-slate-700',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => { loadLogs(); }, [page, roleFilter, actionFilter, fromDate, toDate]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (roleFilter) params.append('role', roleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const res = await api.get(`/developer/audit-logs?${params}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--nm-text-primary)' }}>
          <ScrollText className="h-5 w-5 text-[#CF2030]" /> Audit Log
        </h1>
        <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Track all important system actions</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={roleFilter} onValueChange={v => { setRoleFilter(v === 'all_roles' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_roles">All Roles</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="superadmin">SuperAdmin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="accountant">Accountant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={v => { setActionFilter(v === 'all_actions' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_actions">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="verify">Verify</SelectItem>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="reject">Reject</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} placeholder="From Date" />
          <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} placeholder="To Date" />
        </div>
      </Card>

      {/* Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--nm-text-muted)' }} /></div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center">
          <ScrollText className="h-10 w-10 mx-auto mb-2" style={{ color: 'var(--nm-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No audit logs found</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--nm-border)' }}>
                {['Timestamp', 'User', 'Role', 'Action', 'Entity', 'Details'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.log_id} style={{ borderBottom: '1px solid var(--nm-border)' }} className="hover:bg-black/5 transition-colors">
                  <td className="py-2 px-3 text-xs whitespace-nowrap" style={{ color: 'var(--nm-text-muted)' }}>
                    {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-3 text-xs font-medium" style={{ color: 'var(--nm-text-primary)' }}>{log.user_id}</td>
                  <td className="py-2 px-3"><Badge className={`text-[10px] ${ROLE_COLORS[log.role] || ''}`}>{log.role}</Badge></td>
                  <td className="py-2 px-3"><Badge className={`text-[10px] ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'}`}>{log.action}</Badge></td>
                  <td className="py-2 px-3 text-xs capitalize" style={{ color: 'var(--nm-text-secondary)' }}>{log.entity_type}</td>
                  <td className="py-2 px-3 text-xs max-w-[200px] truncate" style={{ color: 'var(--nm-text-muted)' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Page {page} of {totalPages} ({total} total)</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
