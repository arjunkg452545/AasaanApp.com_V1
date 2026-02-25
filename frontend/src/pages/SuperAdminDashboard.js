import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  LogOut,
  Building2,
  Users,
  Edit,
  Trash2,
  CheckCircle,
  IndianRupee,
  Search,
  Eye,
  EyeOff,
  CalendarDays,
  MapPin,
  ShieldAlert,
  CreditCard,
  Clock,
  AlertTriangle,
  Settings,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatINR(amount) {
  if (amount == null) return '\u20B90';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'suspended') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200'; // inactive / default
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  // --- data state ---
  const [subscription, setSubscription] = useState(null);
  const [subMeta, setSubMeta] = useState({ days_remaining: null, chapters_used: 0, chapters_allowed: 0 });
  const [stats, setStats] = useState({
    total_chapters: 0,
    active_chapters: 0,
    inactive_chapters: 0,
    total_members: 0,
    pending_members: 0,
    this_month_collection: 0,
  });
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- dialog state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // --- form state ---
  const [createForm, setCreateForm] = useState({
    name: '',
    admin_mobile: '',
    admin_password: '',
    region: '',
    state: '',
    city: '',
  });
  const [editForm, setEditForm] = useState({
    new_mobile: '',
    new_password: '',
  });

  // --- search / filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- derived: filtered chapters ---
  const filteredChapters = useMemo(() => {
    let list = chapters;
    if (statusFilter !== 'all') {
      list = list.filter(
        (c) => (c.status || '').toLowerCase() === statusFilter,
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.region || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [chapters, statusFilter, searchQuery]);

  // --- ED identity from localStorage ---
  const edMobile = localStorage.getItem('mobile') || '';

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

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

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }

      if (chaptersRes.status === 'fulfilled') {
        setChapters(
          Array.isArray(chaptersRes.value.data)
            ? chaptersRes.value.data
            : [],
        );
      } else {
        toast.error('Failed to load chapters');
      }
    } catch {
      toast.error('Something went wrong loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/chapters', createForm);
      toast.success('Chapter created successfully');
      setCreateOpen(false);
      setCreateForm({ name: '', admin_mobile: '', admin_password: '', region: '', state: '', city: '' });
      setShowCreatePassword(false);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create chapter');
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    if (!selectedChapter) return;
    try {
      await api.put(
        `/superadmin/chapters/${selectedChapter.chapter_id}/credentials`,
        editForm,
      );
      toast.success('Credentials updated successfully');
      setEditOpen(false);
      setShowEditPassword(false);
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update credentials');
    }
  };

  const handleDeleteChapter = async (chapterId, chapterName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${chapterName}"?\n\nThis will permanently delete all associated members, meetings, and attendance records.\n\nThis action cannot be undone.`,
      )
    )
      return;

    try {
      await api.delete(`/superadmin/chapters/${chapterId}`);
      toast.success('Chapter deleted successfully');
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete chapter');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // ---------------------------------------------------------------------------
  // Subscription banner logic
  // ---------------------------------------------------------------------------

  const renderSubscriptionBanner = () => {
    if (!subscription) {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500">No active subscription.</p>
        </div>
      );
    }

    const isExpired = subscription.status === 'expired' || (subMeta.days_remaining != null && subMeta.days_remaining <= 0);
    const nearExpiry = !isExpired && subMeta.days_remaining != null && subMeta.days_remaining <= 7;

    if (isExpired) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700">
            Your subscription has expired. Contact support to recharge.
          </p>
        </div>
      );
    }

    if (nearExpiry) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-700">
            Your subscription expires in {subMeta.days_remaining} day{subMeta.days_remaining !== 1 ? 's' : ''}. Renew soon to avoid interruption.
          </p>
        </div>
      );
    }

    // Active
    const planLabel =
      (subscription.plan || subscription.plan_name || 'Plan').charAt(0).toUpperCase() +
      (subscription.plan || subscription.plan_name || 'Plan').slice(1);
    const expiresLabel = subscription.end_date
      ? formatDate(subscription.end_date)
      : subMeta.days_remaining != null
        ? `${subMeta.days_remaining} days remaining`
        : 'N/A';

    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium text-emerald-700">Active Subscription</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-emerald-700">
          <span>
            <span className="font-semibold">Plan:</span> {planLabel}
          </span>
          <span>
            <span className="font-semibold">Expires:</span> {expiresLabel}
          </span>
          <span>
            <span className="font-semibold">Chapters:</span> {subMeta.chapters_used}/{subMeta.chapters_allowed}
          </span>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Header ===== */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icons/aasaan-logo.png"
              alt="Aasaan App"
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Super Admin</h1>
              <p className="text-xs text-slate-300">Aasaan App - Chapter Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {edMobile && (
              <span className="hidden sm:inline text-sm text-slate-300">
                ED: <span className="font-medium text-white">{edMobile}</span>
              </span>
            )}
            <Button
              data-testid="logout-btn"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-200 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Main content ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* --- Subscription Banner --- */}
        {renderSubscriptionBanner()}

        {/* --- Stats Row --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Chapters */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Chapters</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_chapters}</p>
              </div>
            </div>
          </Card>

          {/* Total Members */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total Members</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_members}</p>
              </div>
            </div>
          </Card>

          {/* Active Chapters */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Chapters</p>
                <p className="text-2xl font-bold text-slate-900">{stats.active_chapters}</p>
              </div>
            </div>
          </Card>

          {/* This Month Collection */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <IndianRupee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">This Month</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatINR(stats.this_month_collection)}
                </p>
              </div>
            </div>
          </Card>
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
          <Button
            data-testid="create-chapter-btn"
            onClick={() => setCreateOpen(true)}
            className="bg-[#CF2030] hover:bg-[#A61926]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Chapter
          </Button>
          <Button variant="outline" className="text-slate-600" onClick={() => navigate('/superadmin/members/pending')}>
            <UserCheck className="h-4 w-4 mr-2" />
            Pending Approvals
            {stats.pending_members > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {stats.pending_members}
              </span>
            )}
          </Button>
          <Button variant="outline" className="text-slate-600" onClick={() => navigate('/superadmin/members')}>
            <Users className="h-4 w-4 mr-2" />
            All Members
          </Button>
          <Button variant="outline" className="text-slate-600" onClick={() => navigate('/superadmin/payment-config')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Config
          </Button>
          <Button variant="outline" className="text-slate-600">
            <Settings className="h-4 w-4 mr-2" />
            Manage Admins
          </Button>
        </div>

        {/* --- Search & Filter --- */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid="search-input"
              placeholder="Search by chapter name, city, or region..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* --- Chapter Cards Grid --- */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading dashboard...</div>
        ) : filteredChapters.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {chapters.length === 0
                ? 'No chapters yet. Create your first chapter to get started.'
                : 'No chapters match your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredChapters.map((chapter) => (
              <Card
                key={chapter.chapter_id}
                className="overflow-hidden border hover:shadow-lg transition-shadow"
                data-testid={`chapter-card-${chapter.chapter_id}`}
              >
                {/* Card top accent bar */}
                <div className="h-1 bg-gradient-to-r from-[#CF2030] to-[#E8475A]" />

                <div className="p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-[#CF2030]/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-[#CF2030]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{chapter.name}</h3>
                        <p className="text-xs text-slate-400">ID: {chapter.chapter_id}</p>
                      </div>
                    </div>
                    <Badge
                      className={`shrink-0 text-[11px] ${statusColor(chapter.status)}`}
                    >
                      {chapter.status || 'Inactive'}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{chapter.member_count ?? 0} Members</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">Admin: {chapter.admin_mobile || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        {chapter.last_meeting_date
                          ? `Last meeting: ${formatDate(chapter.last_meeting_date)}`
                          : 'No meetings yet'}
                      </span>
                    </div>

                    {(chapter.region || chapter.city || chapter.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {[chapter.city, chapter.state, chapter.region].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      data-testid={`edit-chapter-btn-${chapter.chapter_id}`}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedChapter(chapter);
                        setEditForm({
                          new_mobile: chapter.admin_mobile || '',
                          new_password: '',
                        });
                        setShowEditPassword(false);
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit Credentials
                    </Button>
                    <Button
                      data-testid={`delete-chapter-btn-${chapter.chapter_id}`}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDeleteChapter(chapter.chapter_id, chapter.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ===== Create Chapter Dialog ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Chapter Name</Label>
              <Input
                id="create-name"
                data-testid="chapter-name-input"
                placeholder="e.g. BNI Achievers"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-mobile">Admin Login ID</Label>
              <Input
                id="create-mobile"
                data-testid="admin-mobile-input"
                placeholder="Enter Admin Login ID"
                value={createForm.admin_mobile}
                onChange={(e) => setCreateForm({ ...createForm, admin_mobile: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  data-testid="admin-password-input"
                  type={showCreatePassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={createForm.admin_password}
                  onChange={(e) => setCreateForm({ ...createForm, admin_password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  tabIndex={-1}
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-region">Region</Label>
                <Input
                  id="create-region"
                  placeholder="e.g. West"
                  value={createForm.region}
                  onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-state">State</Label>
                <Input
                  id="create-state"
                  placeholder="e.g. Maharashtra"
                  value={createForm.state}
                  onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-city">City</Label>
              <Input
                id="create-city"
                placeholder="e.g. Mumbai"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              />
            </div>

            <Button
              data-testid="submit-chapter-btn"
              type="submit"
              className="w-full bg-[#CF2030] hover:bg-[#A61926]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Chapter
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Credentials Dialog ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Update Credentials
              {selectedChapter && (
                <span className="block text-sm font-normal text-slate-500 mt-1">
                  {selectedChapter.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-mobile">New Admin Login ID</Label>
              <Input
                id="edit-mobile"
                data-testid="update-mobile-input"
                placeholder="Enter New Admin Login ID"
                value={editForm.new_mobile}
                onChange={(e) => setEditForm({ ...editForm, new_mobile: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-password">New Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  data-testid="update-password-input"
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  tabIndex={-1}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              data-testid="update-credentials-btn"
              type="submit"
              className="w-full bg-[#CF2030] hover:bg-[#A61926]"
            >
              Update Credentials
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
