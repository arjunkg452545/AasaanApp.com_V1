// MAX 300 LINES
// Fund Reports - Main Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { ArrowLeft, FileText, FileSpreadsheet, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  DURATION_OPTIONS, CATEGORY_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS,
  getSelectedMonths, getPeriodLabel, calculateSummary, fetchReportData
} from './fundReportHelpers';
import FundReportPreview from './FundReportPreview';
import exportToPDF from './FundReportExportPDF';
import exportToExcel from './FundReportExportExcel';

export default function FundReports() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState('current_month');
  const [customFromMonth, setCustomFromMonth] = useState(new Date().getMonth() + 1);
  const [customFromYear, setCustomFromYear] = useState(new Date().getFullYear());
  const [customToMonth, setCustomToMonth] = useState(new Date().getMonth() + 1);
  const [customToYear, setCustomToYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('kitty');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [events, setEvents] = useState([]);
  const [chapterName, setChapterName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsRes, profileRes] = await Promise.all([
          api.get('/admin/fund/events'),
          api.get('/admin/profile')
        ]);
        setEvents(eventsRes.data || []);
        setChapterName(profileRes.data?.chapter_name || 'BNI Chapter');
      } catch (error) {
        console.error('Failed to load data');
      }
    };
    loadData();
  }, []);

  const buildExportParams = () => ({
    api, category,
    categoryLabel: CATEGORY_OPTIONS.find(c => c.value === category)?.label || category,
    chapterName,
    periodLabel: getPeriodLabel(duration, customFromMonth, customFromYear, customToMonth, customToYear),
    getSelectedMonths, calculateSummary, fetchReportData,
    duration, customFromMonth, customFromYear, customToMonth, customToYear, selectedEvent, events
  });

  const handlePreview = async () => {
    if (category === 'events' && !selectedEvent) {
      toast.error('Please select an event first');
      return;
    }
    setIsLoadingPreview(true);
    try {
      const { members, months } = await fetchReportData(
        api, category, duration, customFromMonth, customFromYear, customToMonth, customToYear, selectedEvent, events
      );
      const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
      const summaryData = months.map(m => {
        const firstMember = members[0];
        const amount = firstMember?.payments?.[m.key]?.amount || 0;
        return { ...calculateSummary(members, m.key, amount), month: m.label };
      });
      setPreviewData({ members, months, categoryLabel, summary: summaryData });
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error('Failed to load preview');
    }
    setIsLoadingPreview(false);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportToPDF(buildExportParams());
    setIsExporting(false);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    await exportToExcel(buildExportParams());
    setIsExporting(false);
  };

  const eventsNoSelection = category === 'events' && !selectedEvent;
  const selectCls = 'nm-input w-full px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer';
  const customSelectCls = 'nm-input px-3 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer';

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <header className="nm-header">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')} data-testid="back-btn">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Fund Reports</h1>
              <p className="text-xs md:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Download fund reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="rounded-2xl shadow-sm border p-4 md:p-6" style={{ background: 'var(--nm-surface)', borderColor: 'var(--nm-border)' }} data-testid="fund-reports-card">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Select Duration</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className={selectCls} data-testid="duration-select">
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Select Category</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setSelectedEvent(''); }} className={selectCls} data-testid="category-select">
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Event Dropdown - Only for Events category */}
          {category === 'events' && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nm-text-secondary)' }}>Select Event</label>
              <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="nm-input w-full px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer" data-testid="event-select">
                <option value="">-- Select Event --</option>
                {events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>{event.event_name} - Rs.{event.amount}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Month Range */}
          {duration === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nm-text-secondary)' }}>From Month</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={customFromMonth} onChange={(e) => setCustomFromMonth(parseInt(e.target.value))} className={customSelectCls} data-testid="custom-from-month">
                    {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={customFromYear} onChange={(e) => setCustomFromYear(parseInt(e.target.value))} className={customSelectCls} data-testid="custom-from-year">
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nm-text-secondary)' }}>To Month</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={customToMonth} onChange={(e) => setCustomToMonth(parseInt(e.target.value))} className={customSelectCls} data-testid="custom-to-month">
                    {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select value={customToYear} onChange={(e) => setCustomToYear(parseInt(e.target.value))} className={customSelectCls} data-testid="custom-to-year">
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t my-6" style={{ borderColor: 'var(--nm-border)' }}></div>

          {/* Preview Button */}
          <button onClick={handlePreview} disabled={isLoadingPreview || eventsNoSelection} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#CF2030] text-white rounded-xl font-semibold hover:bg-[#A61926] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md mb-4" data-testid="preview-btn">
            <Eye className="w-5 h-5" />
            {isLoadingPreview ? 'Loading Preview...' : 'Preview Report'}
          </button>

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleExportExcel} disabled={isExporting || eventsNoSelection} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#CF2030] text-white rounded-xl font-semibold hover:bg-[#A61926] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md" data-testid="export-excel-btn">
              <FileSpreadsheet className="w-5 h-5" />
              Download Excel
            </button>
            <button onClick={handleExportPDF} disabled={isExporting || eventsNoSelection} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#CF2030] text-white rounded-xl font-semibold hover:bg-[#A61926] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md" data-testid="export-pdf-btn">
              <FileText className="w-5 h-5" />
              Download PDF
            </button>
          </div>

          {/* Warning for Events */}
          {eventsNoSelection && (
            <p className="text-amber-600 text-sm mt-4 text-center" data-testid="event-warning">
              Please select an event to download report
            </p>
          )}

          {/* Loading indicator */}
          {isExporting && (
            <p className="text-indigo-600 text-sm mt-4 text-center animate-pulse" data-testid="exporting-indicator">
              Generating report...
            </p>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <FundReportPreview
          previewData={previewData}
          category={category}
          chapterName={chapterName}
          periodLabel={getPeriodLabel(duration, customFromMonth, customFromYear, customToMonth, customToYear)}
          onClose={() => setShowPreview(false)}
          onExportExcel={() => { setShowPreview(false); handleExportExcel(); }}
          onExportPDF={() => { setShowPreview(false); handleExportPDF(); }}
        />
      )}
    </div>
  );
}
