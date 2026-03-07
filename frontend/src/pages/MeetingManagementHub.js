import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Calendar, QrCode, FileText, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function MeetingManagementHub() {
  const [stats, setStats] = useState({ meetings: 0 });
  const [chapterName, setChapterName] = useState('');
  const navigate = useNavigate();

  const loadStats = async () => {
    try {
      const meetingsRes = await api.get('/admin/meetings');
      setStats({
        meetings: meetingsRes.data.length
      });
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    loadStats();
    const name = localStorage.getItem('chapter_name') || 'Chapter Admin';
    setChapterName(name);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header - Mobile optimized */}
      <div className="nm-header px-4 md:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/home')}
            className="min-w-[48px] min-h-[48px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline ml-2">Back</span>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-[28px] font-bold" style={{ color: 'var(--nm-text-primary)' }}>Meeting Management</h1>
            <p className="text-xs md:text-[13px] lg:text-sm truncate max-w-[180px] md:max-w-none" style={{ color: 'var(--nm-text-secondary)' }}>{chapterName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-7 lg:py-9 max-w-full md:max-w-[720px] lg:max-w-[1200px] mx-auto">
        {/* Section Header - Responsive */}
        <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-7 lg:mb-9">
          <div className="h-10 w-10 md:h-11 md:w-11 lg:h-12 lg:w-12 rounded-xl bg-[#005596]/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-5 w-5 md:h-6 md:w-6 text-[#005596]" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl lg:text-2xl font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Meeting Hub</h2>
            <p className="text-xs md:text-[13px] lg:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Meetings, QR & Reports</p>
          </div>
        </div>

        {/* Cards Grid - Responsive: 2 cols mobile, 2 cols tablet, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
          {/* Total Meetings Stat Card */}
          <Card className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] border-l-4 border-l-[#005596] rounded-[10px]" data-testid="meetings-stat-card">
            <div className="flex flex-col items-start gap-2">
              <div className="h-10 w-10 md:h-11 md:w-11 lg:h-12 lg:w-12 rounded-xl bg-[#005596]/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-[#005596]" />
              </div>
              <div>
                <p className="text-xs md:text-[13px] lg:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Total Meetings</p>
                <p className="text-2xl md:text-[28px] lg:text-3xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{stats.meetings}</p>
              </div>
            </div>
          </Card>

          {/* Create Meetings Card */}
          <Card 
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] nm-interactive cursor-pointer border-l-4 border-l-[#005596] group active:scale-[0.98] rounded-[10px]"
            onClick={() => navigate('/app/meetings/list')}
            data-testid="nav-meetings"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="h-10 w-10 md:h-11 md:w-11 lg:h-12 lg:w-12 rounded-xl bg-[#005596]/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-[#005596]" />
              </div>
              <div>
                <h3 className="text-sm md:text-base lg:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Meetings</h3>
                <p className="text-xs md:text-[13px] lg:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Create & manage</p>
              </div>
            </div>
          </Card>

          {/* QR Display Card */}
          <Card 
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] nm-interactive cursor-pointer border-l-4 border-l-[#CF2030] group active:scale-[0.98] rounded-[10px]"
            onClick={() => navigate('/app/meetings/qr')}
            data-testid="nav-qr"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="h-10 w-10 md:h-11 md:w-11 lg:h-12 lg:w-12 rounded-xl bg-[#CF2030]/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <QrCode className="h-5 w-5 md:h-6 md:w-6 text-[#CF2030]" />
              </div>
              <div>
                <h3 className="text-sm md:text-base lg:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>QR Display</h3>
                <p className="text-xs md:text-[13px] lg:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Show QR codes</p>
              </div>
            </div>
          </Card>

          {/* Reports Card */}
          <Card 
            className="min-h-[90px] md:min-h-[100px] lg:min-h-[110px] p-[14px] md:p-4 lg:p-[18px] nm-interactive cursor-pointer border-l-4 border-l-[#005596] group active:scale-[0.98] rounded-[10px]"
            onClick={() => navigate('/app/reports')}
            data-testid="nav-reports"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="h-10 w-10 md:h-11 md:w-11 lg:h-12 lg:w-12 rounded-xl bg-[#005596]/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                <FileText className="h-5 w-5 md:h-6 md:w-6 text-[#005596]" />
              </div>
              <div>
                <h3 className="text-sm md:text-base lg:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Reports</h3>
                <p className="text-xs md:text-[13px] lg:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>View & download</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
