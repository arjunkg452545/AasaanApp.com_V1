import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Users, UserCheck, UserX, UserPlus } from 'lucide-react';

export default function QRDisplay() {
  const { meetingId } = useParams();
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [summary, setSummary] = useState(null);
  const [quickViewModal, setQuickViewModal] = useState(null);
  const navigate = useNavigate();

  const loadQR = async () => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/qr`, { responseType: 'blob' });
      const imageUrl = URL.createObjectURL(response.data);
      setQrImage(imageUrl);
      setRefreshing(false);
    } catch (error) { toast.error('Failed to load QR code'); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/summary`);
      setSummary(response.data);
    } catch (error) { console.error('Failed to load summary'); }
  };

  useEffect(() => {
    loadQR();
    loadSummary();
    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev <= 1 ? 10 : prev - 1);
    }, 1000);
    const refreshInterval = setInterval(() => {
      setRefreshing(true);
      setCountdown(10);
      loadQR();
    }, 10000);
    const summaryInterval = setInterval(loadSummary, 5000);
    return () => { clearInterval(countdownInterval); clearInterval(refreshInterval); clearInterval(summaryInterval); };
  }, [meetingId]);

  // Quick View helpers
  const getQuickViewMembers = () => {
    if (!summary) return [];
    switch (quickViewModal) {
      case 'total': return summary.all_members || [];
      case 'present': return summary.present_members || [];
      case 'substitute': return summary.substitute_members || [];
      case 'pending': return summary.pending_members || [];
      case 'visitor': return summary.visitors || [];
      default: return [];
    }
  };

  const getQuickViewTitle = () => {
    switch (quickViewModal) {
      case 'total': return 'Total Members';
      case 'present': return 'Present Members';
      case 'substitute': return 'Substitutes';
      case 'pending': return summary?.meeting_ended ? 'Absent Members' : 'Pending Members';
      case 'visitor': return 'Visitors';
      default: return '';
    }
  };

  const getQuickViewColor = () => {
    switch (quickViewModal) {
      case 'total': return 'text-indigo-600 bg-indigo-50';
      case 'present': return 'text-green-600 bg-green-50';
      case 'substitute': return 'text-amber-600 bg-amber-50';
      case 'pending': return 'text-red-600 bg-red-50';
      case 'visitor': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, var(--nm-sidebar-bg) 0%, var(--nm-bg) 50%, var(--nm-sidebar-bg) 100%)' }}>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#CF2030] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#005596] rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Compact Header */}
      <div className="relative z-10 px-3 py-2 flex justify-between items-center">
        <Button data-testid="back-btn" variant="outline" size="sm"
          onClick={() => navigate('/app/meetings')} className="text-xs px-2 py-1 min-h-[36px]">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full nm-flat">
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} style={{ color: 'var(--nm-accent)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--nm-text-primary)' }}>{countdown}s</span>
        </div>
      </div>

      {/* Main Content — Centered for projector display */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center gap-3 px-4 pb-4 overflow-hidden">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-1" style={{ color: 'var(--nm-text-primary)' }}>
            Scan QR Code
          </h1>
          <p className="text-xs md:text-sm" style={{ color: 'var(--nm-text-secondary)' }}>for Attendance</p>
        </div>

        {/* Summary Cards — All Clickable for Quick View */}
        {summary && (
          <div className="w-full max-w-xl">
            <div className="grid grid-cols-5 gap-1.5 md:gap-3">
              <SummaryCard icon={Users} label="Total" value={summary.total_members} color="indigo" onClick={() => setQuickViewModal('total')} />
              <SummaryCard icon={UserCheck} label="Present" value={summary.present_count} color="green" onClick={() => setQuickViewModal('present')} />
              <SummaryCard icon={UserPlus} label="Subs" value={summary.substitute_count} color="amber" onClick={() => setQuickViewModal('substitute')} />
              <SummaryCard icon={UserX} label={summary.meeting_ended ? 'Absent' : 'Pending'}
                value={summary.meeting_ended ? summary.absent_count : summary.pending_count}
                color="red" onClick={() => setQuickViewModal('pending')} />
              <SummaryCard icon={Users} label="Visitors" value={summary.visitor_count} color="blue" onClick={() => setQuickViewModal('visitor')} />
            </div>
          </div>
        )}

        {/* QR Code — Large, Bold, Centered */}
        {loading ? (
          <div className="nm-raised p-8 md:p-12 rounded-3xl w-full max-w-sm md:max-w-md aspect-square flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#CF2030]"></div>
          </div>
        ) : summary && summary.meeting_ended ? (
          <div className="nm-raised p-8 md:p-12 rounded-3xl max-w-sm md:max-w-md w-full text-center">
            <UserX className="h-16 w-16 md:h-24 md:w-24 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--nm-text-primary)' }}>
              Meeting Ended
            </h2>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>QR Code is no longer available</p>
          </div>
        ) : (
          <div className="w-full max-w-sm md:max-w-md flex justify-center">
            <div data-testid="qr-canvas"
              className="nm-raised-lg p-6 md:p-10 rounded-3xl w-full aspect-square flex items-center justify-center ring-4 md:ring-8 ring-[#CF2030]/70 relative overflow-hidden"
              style={{ background: '#ffffff' }}>
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-[#CF2030] rounded-tl-lg"></div>
              <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-[#CF2030] rounded-tr-lg"></div>
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-[#CF2030] rounded-bl-lg"></div>
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-[#CF2030] rounded-br-lg"></div>
              {qrImage && (
                <img src={qrImage} alt="QR Code"
                  className="w-full h-full object-contain p-2 md:p-4 relative z-10"
                  style={{ imageRendering: 'crisp-edges' }} />
              )}
            </div>
          </div>
        )}

        <p className="text-xs md:text-sm font-semibold mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
          BNI Management System
        </p>
      </div>

      {/* Quick View Modal */}
      <Dialog open={!!quickViewModal} onOpenChange={() => setQuickViewModal(null)}>
        <DialogContent className="max-w-md w-[95vw] max-h-[80vh] md:max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${getQuickViewColor().split(' ')[0]}`}>
              {quickViewModal === 'total' && <Users className="h-5 w-5" />}
              {quickViewModal === 'present' && <UserCheck className="h-5 w-5" />}
              {quickViewModal === 'substitute' && <UserPlus className="h-5 w-5" />}
              {quickViewModal === 'pending' && <UserX className="h-5 w-5" />}
              {quickViewModal === 'visitor' && <Users className="h-5 w-5" />}
              {getQuickViewTitle()}
              <span className="ml-auto text-lg font-bold">({getQuickViewMembers().length})</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto rounded-lg nm-inset">
            {getQuickViewMembers().length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'var(--nm-border)' }}>
                {getQuickViewMembers().map((item, idx) => (
                  <div key={idx} className="px-3 py-2.5 flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full ${getQuickViewColor().split(' ')[1]} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs md:text-sm font-semibold ${getQuickViewColor().split(' ')[0]}`}>
                        {item.unique_member_id || (idx + 1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>
                        {item.full_name || item.visitor_name || item.name}
                      </p>
                      {quickViewModal === 'visitor' && item.company && (
                        <p className="text-xs truncate" style={{ color: 'var(--nm-text-muted)' }}>{item.company}</p>
                      )}
                      {quickViewModal === 'substitute' && item.substitute_name && (
                        <p className="text-xs text-amber-600 truncate">Sub: {item.substitute_name}</p>
                      )}
                      {item.timestamp && (
                        <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                          {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getQuickViewColor()}`}>
                      {quickViewModal === 'present' && 'Present'}
                      {quickViewModal === 'pending' && (summary?.meeting_ended ? 'Absent' : 'Pending')}
                      {quickViewModal === 'substitute' && 'Substitute'}
                      {quickViewModal === 'visitor' && 'Visitor'}
                      {quickViewModal === 'total' && (item.status || 'Member')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm" style={{ color: 'var(--nm-text-muted)' }}>
                No {getQuickViewTitle().toLowerCase()} found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, onClick }) {
  const colorMap = {
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50' },
    green: { text: 'text-green-600', bg: 'bg-green-50' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50' },
    red: { text: 'text-red-600', bg: 'bg-red-50' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-50' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <Card className="p-1.5 md:p-2.5 backdrop-blur cursor-pointer hover:scale-105 transition-all active:scale-95"
      onClick={onClick}>
      <div className="flex flex-col items-center">
        <Icon className={`h-3 w-3 md:h-4 md:w-4 ${c.text} mb-0.5`} />
        <p className="text-[10px] md:text-xs truncate" style={{ color: 'var(--nm-text-secondary)' }}>{label}</p>
        <p className="text-sm md:text-xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{value}</p>
      </div>
    </Card>
  );
}
