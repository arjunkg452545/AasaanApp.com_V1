import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { LogOut, Users, ClipboardList, Wallet, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '../components/ThemeToggle';

export default function ChapterAdminDashboard() {
  const [stats, setStats] = useState({ members: 0, meetings: 0, fundTotal: 0, expiringSoon: 0, pendingVerifications: 0 });
  const [chapterName, setChapterName] = useState('');
  const navigate = useNavigate();

  const loadStats = async () => {
    try {
      const [membersRes, meetingsRes, fundRes, memberStatsRes, verifyRes] = await Promise.all([
        api.get('/admin/members'),
        api.get('/admin/meetings'),
        api.get('/admin/fund/reports/summary').catch(() => ({ data: { grand_total: 0 } })),
        api.get('/admin/members/stats').catch(() => ({ data: { expiring_soon: 0 } })),
        api.get('/admin/payments/summary').catch(() => ({ data: { submitted_count: 0 } })),
      ]);
      setStats({
        members: membersRes.data.length,
        meetings: meetingsRes.data.length,
        fundTotal: fundRes.data.grand_total || 0,
        expiringSoon: memberStatsRes.data.expiring_soon || 0,
        pendingVerifications: verifyRes.data.submitted_count || 0,
      });
    } catch (error) {
      toast.error('Failed to load dashboard');
    }
  };

  useEffect(() => {
    loadStats();
    const name = localStorage.getItem('chapter_name') || 'Chapter Admin';
    setChapterName(name);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header - Mobile optimized */}
      <div className="nm-header px-4 md:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-10 md:h-12 w-auto rounded-lg" />
          <div>
            <h1 className="text-xl md:text-2xl lg:text-[28px] font-bold truncate max-w-[180px] md:max-w-none" style={{ color: 'var(--nm-text-primary)' }}>{chapterName}</h1>
            <p className="text-xs md:text-[13px] lg:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Chapter Admin Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button data-testid="logout-btn" variant="outline" onClick={handleLogout} size="sm" className="min-w-[48px] min-h-[48px] md:min-w-0 md:min-h-0">
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-7 lg:py-9 max-w-full md:max-w-[720px] lg:max-w-[1200px] mx-auto">
        <h2 className="text-xl md:text-2xl lg:text-[28px] font-bold mb-5 md:mb-7 lg:mb-9" style={{ color: 'var(--nm-text-primary)' }}>Welcome Back</h2>

        {/* Main Cards - Responsive Grid */}
        {/* Verification Banner */}
        {stats.pendingVerifications > 0 && (
          <Card
            className="mb-4 md:mb-5 p-3 md:p-4 bg-indigo-50 border-indigo-200 cursor-pointer hover:shadow-md transition-all"
            onClick={() => navigate('/admin/verify-payments')}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900">
                  {stats.pendingVerifications} payment{stats.pendingVerifications > 1 ? 's' : ''} awaiting verification
                </p>
                <p className="text-xs text-indigo-600">Tap to review and confirm</p>
              </div>
              <span className="text-indigo-600 text-sm font-medium">Review &rarr;</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          {/* Members Card */}
          <Card 
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-[#CF2030] group active:scale-[0.98] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            onClick={() => navigate('/admin/members')}
            data-testid="nav-members"
          >
            <div className="flex items-center md:flex-col md:text-center gap-3 md:gap-4">
              <div className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl bg-[#CF2030]/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Users className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-[#CF2030]" />
              </div>
              <div className="flex-1 md:flex-none">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Members</h3>
                <p className="text-xs md:text-[13px] lg:text-sm mb-1 md:mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Manage members</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-[#CF2030]/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-[#CF2030]">{stats.members}</span>
                  <span className="text-xs md:text-[13px]" style={{ color: 'var(--nm-text-secondary)' }}>Total</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Meeting Management Card */}
          <Card 
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-[#005596] group active:scale-[0.98] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            onClick={() => navigate('/admin/meeting-hub')}
            data-testid="nav-meeting-management"
          >
            <div className="flex items-center md:flex-col md:text-center gap-3 md:gap-4">
              <div className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl bg-[#005596]/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <ClipboardList className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-[#005596]" />
              </div>
              <div className="flex-1 md:flex-none">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Meeting Management</h3>
                <p className="text-xs md:text-[13px] lg:text-sm mb-1 md:mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Meetings, QR & Reports</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-[#005596]/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-[#005596]">{stats.meetings}</span>
                  <span className="text-xs md:text-[13px]" style={{ color: 'var(--nm-text-secondary)' }}>Meetings</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Fund Management Card */}
          <Card 
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-green-500 group active:scale-[0.98] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            onClick={() => navigate('/admin/fund-hub')}
            data-testid="nav-fund-management"
          >
            <div className="flex items-center md:flex-col md:text-center gap-3 md:gap-4">
              <div className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Wallet className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-green-600" />
              </div>
              <div className="flex-1 md:flex-none">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Fund Management</h3>
                <p className="text-xs md:text-[13px] lg:text-sm mb-1 md:mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Payments & Collections</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-green-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-green-600">{formatCurrency(stats.fundTotal)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Expiring Soon Card */}
          <Card
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-amber-500 group active:scale-[0.98] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            onClick={() => navigate('/admin/members')}
            data-testid="nav-expiring"
          >
            <div className="flex items-center md:flex-col md:text-center gap-3 md:gap-4">
              <div className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <AlertTriangle className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 text-amber-600" />
              </div>
              <div className="flex-1 md:flex-none">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Renewals</h3>
                <p className="text-xs md:text-[13px] lg:text-sm mb-1 md:mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Expiring soon</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-amber-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-amber-600">{stats.expiringSoon}</span>
                  <span className="text-xs md:text-[13px]" style={{ color: 'var(--nm-text-secondary)' }}>Members</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Click on any card to access its features.
          </p>
        </div>
      </div>
    </div>
  );
}
