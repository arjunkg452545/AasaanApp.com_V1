import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Wallet, Calendar, PartyPopper, FileText, Users, Check, X, Eye, ChevronLeft, ChevronRight, Settings, IndianRupee, ShieldCheck, Banknote, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function FundManagementHub() {
  const [stats, setStats] = useState({ kitty: 0, meetingfee: 0, events: 0, total: 0, month: '', year: '' });
  const [chapterName, setChapterName] = useState('');
  const [showSummary, setShowSummary] = useState(null); // 'kitty', 'meetingfee', 'events'
  const [summaryData, setSummaryData] = useState({ paid: [], pending: [], paidCount: 0, pendingCount: 0, total: 0 });
  const [summaryView, setSummaryView] = useState('all'); // 'all', 'paid', 'pending'
  
  // Quick View States
  const [showQuickView, setShowQuickView] = useState(null); // 'kitty', 'meetingfee', 'events'
  const [quickViewDate, setQuickViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickViewData, setQuickViewData] = useState({ payments: [], count: 0, total_amount: 0, month_breakdown: [] });
  const [quickViewLoading, setQuickViewLoading] = useState(false);
  
  const navigate = useNavigate();

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/fund/reports/summary');
      setStats({
        kitty: response.data.kitty_total || 0,
        meetingfee: response.data.meetingfee_total || 0,
        events: response.data.event_total || 0,
        total: response.data.grand_total || 0,
        month: response.data.month,
        year: response.data.year
      });
    } catch (error) {
      console.error('Failed to load fund stats');
    }
  };

  const loadSummaryData = async (type) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      let payments = [];
      if (type === 'kitty') {
        const response = await api.get(`/admin/fund/kitty/payments?month=${month}&year=${year}`);
        payments = response.data;
      } else if (type === 'meetingfee') {
        const response = await api.get(`/admin/fund/meetingfee/payments?month=${month}&year=${year}`);
        payments = response.data;
      } else if (type === 'events') {
        // Get all events and their paid/pending counts
        const response = await api.get('/admin/fund/events');
        const events = response.data;
        let allPaid = [];
        let allPending = [];
        
        for (const event of events) {
          const membersRes = await api.get(`/admin/fund/events/${event.event_id}/members`);
          const members = membersRes.data.members || [];
          const paid = members.filter(m => m.status === 'paid').map(m => ({ ...m, eventName: event.event_name }));
          const pending = members.filter(m => m.status === 'pending').map(m => ({ ...m, eventName: event.event_name }));
          allPaid.push(...paid);
          allPending.push(...pending);
        }
        
        setSummaryData({
          paid: allPaid,
          pending: allPending,
          paidCount: allPaid.length,
          pendingCount: allPending.length,
          total: (allPaid.length * (events[0]?.amount || 0))
        });
        setShowSummary(type);
        setSummaryView('all');
        return;
      }

      const paid = payments.filter(p => p.status === 'paid');
      const pending = payments.filter(p => p.status === 'pending');
      
      setSummaryData({
        paid: paid,
        pending: pending,
        paidCount: paid.length,
        pendingCount: pending.length,
        total: paid.reduce((sum, p) => sum + (p.amount || 0), 0)
      });
      setShowSummary(type);
      setSummaryView('all');
    } catch (error) {
      toast.error('Failed to load summary');
    }
  };

  useEffect(() => {
    loadStats();
    const name = localStorage.getItem('chapter_name') || 'Chapter';
    setChapterName(name);
  }, []);

  // Load Quick View data when date or category changes
  const loadQuickView = async (category, date = quickViewDate) => {
    setQuickViewLoading(true);
    try {
      const response = await api.get(`/admin/fund/quick-view?date=${date}&category=${category}`);
      setQuickViewData(response.data);
    } catch (error) {
      toast.error('Failed to load quick view data');
      setQuickViewData({ payments: [], count: 0, total_amount: 0 });
    }
    setQuickViewLoading(false);
  };

  const openQuickView = (category) => {
    const today = new Date().toISOString().split('T')[0];
    setQuickViewDate(today);
    setShowQuickView(category);
    loadQuickView(category, today);
  };

  const handleQuickViewDateChange = (newDate) => {
    setQuickViewDate(newDate);
    loadQuickView(showQuickView, newDate);
  };

  const changeDate = (days) => {
    const current = new Date(quickViewDate);
    current.setDate(current.getDate() + days);
    const newDate = current.toISOString().split('T')[0];
    handleQuickViewDateChange(newDate);
  };

  const getQuickViewTitle = () => {
    if (showQuickView === 'kitty') return 'Kitty';
    if (showQuickView === 'meetingfee') return 'Meeting Fees';
    if (showQuickView === 'events') return 'Events';
    return '';
  };

  const formatDateDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  };

  const getSummaryTitle = () => {
    if (showSummary === 'kitty') return 'Kitty';
    if (showSummary === 'meetingfee') return 'Meeting Fees';
    if (showSummary === 'events') return 'Events';
    return '';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Fund Management</h1>
            <p className="text-xs md:text-sm truncate max-w-[180px] md:max-w-none" style={{ color: 'var(--nm-text-secondary)' }}>{chapterName}</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Total Collection Card with Quick View */}
        <Card className="p-4 md:p-6 mb-4 md:mb-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-green-100 text-xs md:text-sm">
              {stats.month && stats.year ? `${getMonthName(stats.month)} ${stats.year}` : 'Current Month'} Collection
            </p>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>
          
          {/* Three columns with Quick View buttons */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {/* Kitty Section */}
            <div className="bg-white/10 rounded-lg p-3 md:p-4">
              <p className="text-green-100 text-xs">Kitty</p>
              <p className="text-lg md:text-2xl font-bold">{formatCurrency(stats.kitty)}</p>
              <button 
                onClick={() => openQuickView('kitty')}
                className="mt-2 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
              >
                <Eye className="h-3 w-3" /> Quick View
              </button>
            </div>
            
            {/* Meeting Fees Section */}
            <div className="bg-white/10 rounded-lg p-3 md:p-4">
              <p className="text-green-100 text-xs">Meeting Fees</p>
              <p className="text-lg md:text-2xl font-bold">{formatCurrency(stats.meetingfee)}</p>
              <button 
                onClick={() => openQuickView('meetingfee')}
                className="mt-2 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
              >
                <Eye className="h-3 w-3" /> Quick View
              </button>
            </div>
            
            {/* Events Section */}
            <div className="bg-white/10 rounded-lg p-3 md:p-4">
              <p className="text-green-100 text-xs">Events</p>
              <p className="text-lg md:text-2xl font-bold">{formatCurrency(stats.events)}</p>
              <button 
                onClick={() => openQuickView('events')}
                className="mt-2 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
              >
                <Eye className="h-3 w-3" /> Quick View
              </button>
            </div>
          </div>
        </Card>

        {/* Management Cards - 3 cards in grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {/* Kitty Payment Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all border-l-4 border-l-amber-500">
            <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/admin/fund/kitty')}>
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Kitty</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Monthly contribution</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => loadSummaryData('kitty')}>
                <Users className="h-3 w-3 mr-1" />Summary
              </Button>
              <Button size="sm" className="flex-1 bg-[#CF2030] hover:bg-[#A61926] text-xs" onClick={() => navigate('/admin/fund/kitty')}>
                Manage →
              </Button>
            </div>
          </Card>

          {/* Meeting Fees Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/admin/fund/meetingfee')}>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Meeting Fees</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Monthly meeting fee</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => loadSummaryData('meetingfee')}>
                <Users className="h-3 w-3 mr-1" />Summary
              </Button>
              <Button size="sm" className="flex-1 bg-[#CF2030] hover:bg-[#A61926] text-xs" onClick={() => navigate('/admin/fund/meetingfee')}>
                Manage →
              </Button>
            </div>
          </Card>

          {/* Events Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all border-l-4 border-l-purple-500">
            <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/admin/fund/events')}>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <PartyPopper className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Events</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Event payments</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => loadSummaryData('events')}>
                <Users className="h-3 w-3 mr-1" />Summary
              </Button>
              <Button size="sm" className="flex-1 bg-[#CF2030] hover:bg-[#A61926] text-xs" onClick={() => navigate('/admin/fund/events')}>
                Manage →
              </Button>
            </div>
          </Card>
        </div>

        {/* Verify Payments + Manual Entry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-4 md:mt-6">
          {/* Verify Payments Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-indigo-500"
                onClick={() => navigate('/admin/verify-payments')}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Verify Payments</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Review & confirm member submissions</p>
              </div>
              <span className="text-indigo-600 text-sm">Review &rarr;</span>
            </div>
          </Card>

          {/* Manual Entry Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-teal-500"
                onClick={() => navigate('/admin/manual-entry')}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Banknote className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Cash/Cheque Entry</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Record manual payments</p>
              </div>
              <span className="text-teal-600 text-sm">Record &rarr;</span>
            </div>
          </Card>
        </div>

        {/* Fee Config Card */}
        <Card className="mt-4 md:mt-6 p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-orange-500"
              onClick={() => navigate('/admin/fee-config')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <IndianRupee className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Fee Config & Generate</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>View fee amounts, generate monthly fees</p>
              </div>
            </div>
            <span className="text-orange-600 text-sm">Setup &rarr;</span>
          </div>
        </Card>

        {/* Reports + Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-4 md:mt-6">
          {/* Reports Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500"
                onClick={() => navigate('/admin/fund/reports')}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Reports</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Export & view reports</p>
              </div>
              <span className="text-green-600 text-sm">View &rarr;</span>
            </div>
          </Card>

          {/* Reminders Card */}
          <Card className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-emerald-500"
                onClick={() => navigate('/admin/reminders')}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Reminders</h3>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>WhatsApp payment reminders</p>
              </div>
              <span className="text-emerald-600 text-sm">Send &rarr;</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={!!showSummary} onOpenChange={() => setShowSummary(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getSummaryTitle()} - {getMonthName(stats.month)} {stats.year}
            </DialogTitle>
          </DialogHeader>
          
          {/* Summary Stats */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSummaryView('all')}
              className={`flex-1 p-3 rounded-lg text-center transition-colors`}
              style={{ background: summaryView === 'all' ? 'var(--nm-bg)' : 'var(--nm-surface)' }}
            >
              <p className="text-lg font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summaryData.paidCount + summaryData.pendingCount}</p>
              <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Total</p>
            </button>
            <button 
              onClick={() => setSummaryView('paid')}
              className={`flex-1 p-3 rounded-lg text-center transition-colors ${summaryView === 'paid' ? 'bg-green-200' : 'bg-green-100'}`}
            >
              <p className="text-lg font-bold text-green-700">{summaryData.paidCount}</p>
              <p className="text-xs text-green-600">Paid</p>
            </button>
            <button 
              onClick={() => setSummaryView('pending')}
              className={`flex-1 p-3 rounded-lg text-center transition-colors ${summaryView === 'pending' ? 'bg-red-200' : 'bg-red-100'}`}
            >
              <p className="text-lg font-bold text-red-700">{summaryData.pendingCount}</p>
              <p className="text-xs text-red-600">Pending</p>
            </button>
          </div>

          {/* Collection */}
          <div className="p-3 bg-green-50 rounded-lg mb-3">
            <p className="text-xs text-green-600">Collection</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(summaryData.total)}</p>
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div className="divide-y">
              {(summaryView === 'all' ? [...summaryData.paid, ...summaryData.pending] :
                summaryView === 'paid' ? summaryData.paid : summaryData.pending
              ).map((member, idx) => (
                <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-black/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.member_name}</p>
                    {member.eventName && <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{member.eventName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {member.amount && <span className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>₹{member.amount}</span>}
                    {member.status === 'paid' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
              {(summaryView === 'all' ? (summaryData.paidCount + summaryData.pendingCount) :
                summaryView === 'paid' ? summaryData.paidCount : summaryData.pendingCount
              ) === 0 && (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--nm-text-muted)' }}>No members found</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick View Dialog */}
      <Dialog open={!!showQuickView} onOpenChange={() => setShowQuickView(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {getQuickViewTitle()} - Quick View
            </DialogTitle>
          </DialogHeader>
          
          {/* Date Picker */}
          <div className="flex items-center justify-between rounded-lg p-2 mb-4" style={{ background: 'var(--nm-surface)' }}>
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-full transition-colors hover:bg-black/5"
            >
              <ChevronLeft className="h-5 w-5" style={{ color: 'var(--nm-text-secondary)' }} />
            </button>
            <div className="flex-1 text-center">
              <input
                type="date"
                value={quickViewDate}
                onChange={(e) => handleQuickViewDateChange(e.target.value)}
                className="bg-transparent text-center font-medium border-none focus:outline-none cursor-pointer"
                style={{ color: 'var(--nm-text-primary)' }}
              />
              <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{formatDateDisplay(quickViewDate)}</p>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 rounded-full transition-colors hover:bg-black/5"
            >
              <ChevronRight className="h-5 w-5" style={{ color: 'var(--nm-text-secondary)' }} />
            </button>
          </div>

          {/* Total Collection for the day */}
          <div className="p-3 bg-green-50 rounded-lg mb-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-green-600">Collection on this day</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(quickViewData.total_amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">Payments</p>
                <p className="text-xl font-bold text-green-700">{quickViewData.count}</p>
              </div>
            </div>
          </div>

          {/* Month-wise Breakdown */}
          {quickViewData.month_breakdown && quickViewData.month_breakdown.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Month-wise Breakdown:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickViewData.month_breakdown.map((item, idx) => (
                  <div key={idx} className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs font-medium text-blue-700">
                      {item.month_name ? `${item.month_name} ${item.year}` : item.event_name}
                    </p>
                    <p className="text-sm font-bold text-blue-800">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-blue-600">{item.count} payment{item.count > 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {quickViewLoading ? (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--nm-text-muted)' }}>Loading...</div>
            ) : quickViewData.payments.length > 0 ? (
              <div className="divide-y">
                {quickViewData.payments.map((payment, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-black/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{payment.member_name}</p>
                      {payment.event_name && <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>{payment.event_name}</p>}
                      {payment.for_month && payment.for_year && (
                        <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>For: {getMonthName(payment.for_month)} {payment.for_year}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600">₹{payment.amount}</span>
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--nm-text-muted)' }}>
                No payments on this date
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
