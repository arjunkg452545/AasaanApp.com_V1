import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Users, UserCheck, UserX, UserPlus, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function QRDisplay() {
  const { meetingId } = useParams();
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [summary, setSummary] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [showAbsent, setShowAbsent] = useState(false);
  // Quick View Modal States
  const [quickViewModal, setQuickViewModal] = useState(null); // 'total', 'present', 'substitute', 'pending', 'visitor'
  const navigate = useNavigate();

  const loadQR = async () => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/qr`, {
        responseType: 'blob'
      });
      const imageUrl = URL.createObjectURL(response.data);
      setQrImage(imageUrl);
      setRefreshing(false);
    } catch (error) {
      toast.error('Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary');
    }
  };

  useEffect(() => {
    loadQR();
    loadSummary();
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    
    const refreshInterval = setInterval(() => {
      setRefreshing(true);
      setCountdown(10);
      loadQR();
    }, 10000);

    const summaryInterval = setInterval(loadSummary, 5000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
      clearInterval(summaryInterval);
    };
  }, [meetingId]);

  // Get members list for Quick View modal
  const getQuickViewMembers = () => {
    if (!summary) return [];
    
    switch (quickViewModal) {
      case 'total':
        return summary.all_members || [];
      case 'present':
        return summary.present_members || [];
      case 'substitute':
        return summary.substitute_members || [];
      case 'pending':
        return summary.pending_members || [];
      case 'visitor':
        return summary.visitors || [];
      default:
        return [];
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#CF2030] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#005596] rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Compact Header */}
      <div className="relative z-10 px-3 py-2 flex justify-between items-center">
        <Button
          data-testid="back-btn"
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/meeting-hub')}
          className="bg-white text-xs px-2 py-1 h-auto"
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''} text-[#CF2030]`} />
          <span className="text-xs text-white font-bold">{countdown}s</span>
        </div>
      </div>

      {/* Main Content - Optimized for Mobile */}
      <div className="flex-1 relative z-10 flex flex-col lg:flex-row gap-2 px-2 pb-2 overflow-hidden">
        {/* Mobile Pending/Absent List - Shown on mobile only */}
        {summary && (summary.pending_members?.length > 0) && (
          <div className="lg:hidden w-full px-1">
            {!summary.meeting_ended && summary.pending_members && summary.pending_members.length > 0 && (
              <Card className="p-2 bg-white/95 backdrop-blur border-l-4 border-l-red-500 mb-2">
                <div className="flex items-center justify-between" onClick={() => setShowPending(!showPending)}>
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-slate-900">Pending</span>
                    <span className="text-sm font-bold text-red-600">({summary.pending_count})</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {showPending ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                {showPending && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {summary.pending_members.map((member) => (
                      <div key={member.unique_member_id} className="p-1.5 bg-slate-50 rounded text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-900 truncate flex-1">{member.full_name}</span>
                        <span className="text-slate-500 text-xs ml-2">{member.unique_member_id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {summary.meeting_ended && summary.pending_members && summary.pending_members.length > 0 && (
              <Card className="p-2 bg-white/95 backdrop-blur border-l-4 border-l-red-500 mb-2">
                <div className="flex items-center justify-between" onClick={() => setShowAbsent(!showAbsent)}>
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-semibold text-slate-900">Absent</span>
                    <span className="text-sm font-bold text-red-600">({summary.absent_count})</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {showAbsent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                {showAbsent && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {summary.pending_members.map((member) => (
                      <div key={member.unique_member_id} className="p-1.5 bg-slate-50 rounded text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-900 truncate flex-1">{member.full_name}</span>
                        <span className="text-slate-500 text-xs ml-2">{member.unique_member_id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Left Sidebar - Hidden on mobile, shown on desktop */}
        {summary && (summary.pending_members?.length > 0) && (
          <div className="hidden lg:block w-56 flex-shrink-0 overflow-y-auto">
            {/* Pending/Absent List */}
            {!summary.meeting_ended && summary.pending_members && summary.pending_members.length > 0 && (
              <Card className="p-2 bg-white/95 backdrop-blur border-l-4 border-l-red-500">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <UserX className="h-3 w-3 text-red-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Pending</p>
                      <p className="text-base font-bold text-red-600">{summary.pending_count}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPending(!showPending)}
                    className="h-5 w-5 p-0"
                  >
                    {showPending ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>
                {showPending && (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {summary.pending_members.map((member) => (
                      <div key={member.unique_member_id} className="p-1 bg-slate-50 rounded text-xs">
                        <p className="font-semibold text-slate-900 truncate">{member.full_name}</p>
                        <p className="text-slate-600 truncate text-xs">ID: {member.unique_member_id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {summary.meeting_ended && summary.pending_members && summary.pending_members.length > 0 && (
              <Card className="p-2 bg-white/95 backdrop-blur border-l-4 border-l-red-500">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <UserX className="h-3 w-3 text-red-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Absent</p>
                      <p className="text-base font-bold text-red-600">{summary.absent_count}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAbsent(!showAbsent)}
                    className="h-5 w-5 p-0"
                  >
                    {showAbsent ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>
                {showAbsent && (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {summary.pending_members.map((member) => (
                      <div key={member.unique_member_id} className="p-1 bg-slate-50 rounded text-xs">
                        <p className="font-semibold text-slate-900 truncate">{member.full_name}</p>
                        <p className="text-slate-600 truncate text-xs">ID: {member.unique_member_id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 overflow-y-auto">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Scan QR Code</h1>
            <p className="text-xs md:text-sm text-slate-300">for Attendance</p>
          </div>

          {/* Compact Summary Cards - All Clickable */}
          {summary && (
            <div className="w-full max-w-2xl px-2">
              <div className="grid grid-cols-5 gap-1 md:gap-2">
                {/* Total Card */}
                <Card 
                  className="p-1.5 md:p-2 bg-white/95 backdrop-blur cursor-pointer hover:bg-indigo-50 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-indigo-300"
                  onClick={() => setQuickViewModal('total')}
                >
                  <div className="flex flex-col items-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 text-indigo-600 mb-0.5" />
                    <p className="text-xs text-slate-600 truncate">Total</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">{summary.total_members}</p>
                  </div>
                </Card>

                {/* Present Card */}
                <Card 
                  className="p-1.5 md:p-2 bg-white/95 backdrop-blur cursor-pointer hover:bg-green-50 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-green-300"
                  onClick={() => setQuickViewModal('present')}
                >
                  <div className="flex flex-col items-center">
                    <UserCheck className="h-3 w-3 md:h-4 md:w-4 text-green-600 mb-0.5" />
                    <p className="text-xs text-slate-600 truncate">Present</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">{summary.present_count}</p>
                  </div>
                </Card>

                {/* Substitute Card */}
                <Card 
                  className="p-1.5 md:p-2 bg-white/95 backdrop-blur cursor-pointer hover:bg-amber-50 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-amber-300"
                  onClick={() => setQuickViewModal('substitute')}
                >
                  <div className="flex flex-col items-center">
                    <UserPlus className="h-3 w-3 md:h-4 md:w-4 text-amber-600 mb-0.5" />
                    <p className="text-xs text-slate-600 truncate">Subs</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">{summary.substitute_count}</p>
                  </div>
                </Card>

                {/* Pending/Absent Card */}
                <Card 
                  className="p-1.5 md:p-2 bg-white/95 backdrop-blur cursor-pointer hover:bg-red-50 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-red-300"
                  onClick={() => setQuickViewModal('pending')}
                >
                  <div className="flex flex-col items-center">
                    <UserX className="h-3 w-3 md:h-4 md:w-4 text-red-600 mb-0.5" />
                    <p className="text-xs text-slate-600 truncate">{summary.meeting_ended ? 'Absent' : 'Pending'}</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">{summary.meeting_ended ? summary.absent_count : summary.pending_count}</p>
                  </div>
                </Card>

                {/* Visitor Card */}
                <Card 
                  className="p-1.5 md:p-2 bg-white/95 backdrop-blur cursor-pointer hover:bg-blue-50 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-blue-300"
                  onClick={() => setQuickViewModal('visitor')}
                >
                  <div className="flex flex-col items-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600 mb-0.5" />
                    <p className="text-xs text-slate-600 truncate">Visitors</p>
                    <p className="text-sm md:text-lg font-bold text-slate-900">{summary.visitor_count}</p>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Large, Bold, Centered QR Code */}
          {loading ? (
            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md aspect-square flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#CF2030]"></div>
            </div>
          ) : summary && summary.meeting_ended ? (
            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl max-w-md w-full mx-auto text-center">
              <UserX className="h-16 w-16 md:h-24 md:w-24 text-slate-300 mx-auto mb-3" />
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Meeting Ended</h2>
              <p className="text-sm text-slate-600">QR Code is no longer available</p>
            </div>
          ) : (
            <div className="w-full max-w-md px-2 flex justify-center">
              <div 
                data-testid="qr-canvas"
                className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl w-full aspect-square flex items-center justify-center ring-4 md:ring-8 ring-[#CF2030]/70 relative overflow-hidden"
              >
                {/* Decorative corners */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-[#CF2030] rounded-tl-lg"></div>
                <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-[#CF2030] rounded-tr-lg"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-[#CF2030] rounded-bl-lg"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-[#CF2030] rounded-br-lg"></div>
                
                {qrImage && (
                  <img 
                    src={qrImage} 
                    alt="QR Code" 
                    className="w-full h-full object-contain p-2 md:p-4 relative z-10"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                )}
              </div>
            </div>
          )}

          <p className="text-white text-xs md:text-sm font-semibold mt-1">BNI Management System</p>
        </div>
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
              <span className="ml-auto text-lg font-bold">
                ({getQuickViewMembers().length})
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {/* Member/Visitor List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {getQuickViewMembers().length > 0 ? (
              <div className="divide-y">
                {getQuickViewMembers().map((item, idx) => (
                  <div key={idx} className="px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                    {/* Member ID Circle */}
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full ${getQuickViewColor().split(' ')[1]} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs md:text-sm font-semibold ${getQuickViewColor().split(' ')[0]}`}>
                        {item.unique_member_id || (idx + 1)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-medium text-slate-900 truncate">
                        {item.full_name || item.visitor_name || item.name}
                      </p>
                      {/* Show additional info based on type */}
                      {quickViewModal === 'visitor' && item.company && (
                        <p className="text-xs text-slate-500 truncate">{item.company}</p>
                      )}
                      {quickViewModal === 'substitute' && item.substitute_name && (
                        <p className="text-xs text-amber-600 truncate">Sub: {item.substitute_name}</p>
                      )}
                      {item.timestamp && (
                        <p className="text-xs text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {/* Status Badge */}
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
              <div className="p-8 text-center text-slate-400 text-sm">
                No {getQuickViewTitle().toLowerCase()} found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
