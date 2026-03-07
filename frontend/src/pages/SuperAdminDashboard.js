// MAX 300 LINES
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Plus, Building2, Users, CheckCircle, IndianRupee,
  CreditCard, Clock, ChevronRight, UserCheck, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import SASubscriptionBanner from './SASubscriptionBanner';
import SAChapterCards from './SAChapterCards';
import SAChapterDialogs from './SAChapterDialogs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

function formatINR(amount) {
  if (amount == null) return '\u20B90';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <Card className="p-5 min-h-[90px]">
      <div className="flex items-center gap-3 h-full">
        <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs tracking-wide font-medium" style={{ color: 'var(--nm-text-secondary)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [subMeta, setSubMeta] = useState({ days_remaining: null, chapters_used: 0, chapters_allowed: 0 });
  const [stats, setStats] = useState({
    total_chapters: 0, active_chapters: 0, inactive_chapters: 0,
    total_members: 0, pending_members: 0, this_month_collection: 0,
  });
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', region: '', state: '', city: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredChapters = useMemo(() => {
    let list = chapters;
    if (statusFilter !== 'all') {
      list = list.filter((c) => (c.status || '').toLowerCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.region || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [chapters, statusFilter, searchQuery]);

  const edMobile = localStorage.getItem('mobile') || '';

  const loadAll = async () => {
    setLoading(true);
    try {
      const [subRes, statsRes, chaptersRes] = await Promise.allSettled([
        api.get('/superadmin/my-subscription'),
        api.get('/superadmin/dashboard/stats'),
        api.get('/superadmin/chapters/overview'),
      ]);
      if (subRes.status === 'fulfilled') {
        const d = subRes.value.data;
        setSubscription(d.subscription || null);
        setSubMeta({
          days_remaining: d.days_remaining,
          chapters_used: d.chapters_used ?? 0,
          chapters_allowed: d.chapters_allowed ?? 0,
        });
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (chaptersRes.status === 'fulfilled') {
        setChapters(Array.isArray(chaptersRes.value.data) ? chaptersRes.value.data : []);
      } else {
        toast.error('Failed to load chapters');
      }
    } catch {
      toast.error('Something went wrong loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/chapters', createForm);
      toast.success('Chapter created successfully');
      setCreateOpen(false);
      setCreateForm({ name: '', region: '', state: '', city: '' });
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create chapter');
    }
  };

  const [deactivateConfirm, setDeactivateConfirm] = useState(null);

  const handleDeactivateChapter = (chapterId, chapterName, status) => {
    setDeactivateConfirm({ chapterId, chapterName, status });
  };

  const confirmDeactivateChapter = async () => {
    if (!deactivateConfirm) return;
    try {
      await api.put(`/superadmin/chapters/${deactivateConfirm.chapterId}/deactivate`);
      const isInactive = (deactivateConfirm.status || '').toLowerCase() === 'inactive';
      toast.success(`Chapter ${isInactive ? 'reactivated' : 'deactivated'} successfully`);
      setDeactivateConfirm(null);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update chapter');
    }
  };

  return (
    <div style={{ background: 'var(--nm-bg)' }}>
      {/* ===== Main content ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SASubscriptionBanner subscription={subscription} subMeta={subMeta} />

        {/* --- Stats Row --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Total Chapters" value={stats.total_chapters} />
          <StatCard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" label="Total Members" value={stats.total_members} />
          <StatCard icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600" label="Active Chapters" value={stats.active_chapters} />
          <StatCard icon={IndianRupee} iconBg="bg-amber-100" iconColor="text-amber-600" label="This Month" value={formatINR(stats.this_month_collection)} />
        </div>

        {/* --- Pending Approvals Alert --- */}
        {stats.pending_members > 0 && (
          <div
            className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => navigate('/superadmin/members/pending')}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-sm text-amber-700">
                <strong>{stats.pending_members}</strong> member{stats.pending_members > 1 ? 's' : ''} pending approval
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400" />
          </div>
        )}

        {/* --- Quick Actions --- */}
        <div className="flex flex-wrap gap-3">
          <Button data-testid="create-chapter-btn" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Chapter
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/members/pending')}>
            <UserCheck className="h-4 w-4 mr-2" />
            Pending Approvals
            {stats.pending_members > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {stats.pending_members}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/members')}>
            <Users className="h-4 w-4 mr-2" />
            All Members
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/payment-config')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Config
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/accountants')}>
            <UserCheck className="h-4 w-4 mr-2" />
            Accountants
          </Button>
          <Button variant="outline" onClick={() => navigate('/superadmin/manage-admins')}>
            <Settings className="h-4 w-4 mr-2" />
            Leadership
          </Button>
        </div>

        {/* --- Chapter Cards (search + filter + grid) --- */}
        <SAChapterCards
          chapters={chapters} filteredChapters={filteredChapters} loading={loading}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          onDeactivate={handleDeactivateChapter}
        />
      </main>

      {/* ===== Dialogs ===== */}
      <SAChapterDialogs
        createOpen={createOpen} setCreateOpen={setCreateOpen}
        createForm={createForm} setCreateForm={setCreateForm}
        onCreateSubmit={handleCreate}
      />

      {/* Deactivate Chapter Confirmation */}
      <Dialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(deactivateConfirm?.status || '').toLowerCase() === 'inactive' ? 'Reactivate Chapter' : 'Deactivate Chapter'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              {(deactivateConfirm?.status || '').toLowerCase() === 'inactive'
                ? `This will reactivate "${deactivateConfirm?.chapterName}".`
                : `This will deactivate "${deactivateConfirm?.chapterName}". All members, meetings, and financial records will be preserved.`}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeactivateConfirm(null)}>Cancel</Button>
              <Button
                onClick={confirmDeactivateChapter}
                className={(deactivateConfirm?.status || '').toLowerCase() === 'inactive'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'}
              >
                {(deactivateConfirm?.status || '').toLowerCase() === 'inactive' ? 'Reactivate' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
