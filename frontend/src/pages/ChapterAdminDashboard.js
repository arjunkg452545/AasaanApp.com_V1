import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { LogOut, Users, ClipboardList, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function ChapterAdminDashboard() {
  const [stats, setStats] = useState({ members: 0, meetings: 0, fundTotal: 0 });
  const [chapterName, setChapterName] = useState('');
  const navigate = useNavigate();

  const loadStats = async () => {
    try {
      const [membersRes, meetingsRes, fundRes] = await Promise.all([
        api.get('/admin/members'),
        api.get('/admin/meetings'),
        api.get('/admin/fund/reports/summary').catch(() => ({ data: { grand_total: 0 } }))
      ]);
      setStats({
        members: membersRes.data.length,
        meetings: meetingsRes.data.length,
        fundTotal: fundRes.data.grand_total || 0
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
    <div className="min-h-screen bg-slate-50">
      {/* Header - Mobile optimized */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-10 md:h-12 w-auto rounded-lg" />
          <div>
            <h1 className="text-xl md:text-2xl lg:text-[28px] font-bold text-slate-900 truncate max-w-[180px] md:max-w-none">{chapterName}</h1>
            <p className="text-xs md:text-[13px] lg:text-sm text-slate-600">Chapter Admin Dashboard</p>
          </div>
        </div>
        <Button data-testid="logout-btn" variant="outline" onClick={handleLogout} size="sm" className="min-w-[48px] min-h-[48px] md:min-w-0 md:min-h-0">
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Logout</span>
        </Button>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-7 lg:py-9 max-w-full md:max-w-[720px] lg:max-w-[1200px] mx-auto">
        <h2 className="text-xl md:text-2xl lg:text-[28px] font-bold text-slate-900 mb-5 md:mb-7 lg:mb-9">Welcome Back</h2>

        {/* Main Cards - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
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
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-slate-900">Members</h3>
                <p className="text-xs md:text-[13px] lg:text-sm text-slate-600 mb-1 md:mb-2">Manage members</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-[#CF2030]/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-[#CF2030]">{stats.members}</span>
                  <span className="text-xs md:text-[13px] text-slate-600">Total</span>
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
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-slate-900">Meeting Management</h3>
                <p className="text-xs md:text-[13px] lg:text-sm text-slate-600 mb-1 md:mb-2">Meetings, QR & Reports</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-[#005596]/10 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-[#005596]">{stats.meetings}</span>
                  <span className="text-xs md:text-[13px] text-slate-600">Meetings</span>
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
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-slate-900">Fund Management</h3>
                <p className="text-xs md:text-[13px] lg:text-sm text-slate-600 mb-1 md:mb-2">Payments & Collections</p>
                <div className="inline-flex items-center gap-1 md:gap-2 bg-green-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  <span className="text-sm md:text-base lg:text-lg font-bold text-green-600">{formatCurrency(stats.fundTotal)}</span>
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
