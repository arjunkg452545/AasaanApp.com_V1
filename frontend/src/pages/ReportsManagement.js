import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Users, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

export default function ReportsManagement() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      const response = await api.get('/admin/meetings');
      setMeetings(response.data);
    } catch (error) {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async (meetingId) => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/report/excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${meetingId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel report downloaded');
    } catch (error) {
      toast.error('Failed to download Excel report');
    }
  };

  const downloadPDF = async (meetingId) => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/report/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${meetingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF report downloaded');
    } catch (error) {
      toast.error('Failed to download PDF report');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header - Mobile optimized */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button
          data-testid="back-btn"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/meetings')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
          <span className="text-sm">Back</span>
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Reports Management</h1>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-4 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Attendance Reports</h2>
          <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>Download meeting attendance reports</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
        ) : meetings.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <p className="text-sm md:text-base" style={{ color: 'var(--nm-text-secondary)' }}>No meetings available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:gap-6">
            {meetings.map((meeting) => (
              <Card
                key={meeting.meeting_id}
                className="p-3 md:p-6 border-l-4 border-l-[#F59E0B]"
                data-testid={`meeting-report-card-${meeting.meeting_id}`}
              >
                {/* Mobile Layout */}
                <div className="md:hidden">
                  <h3 className="font-bold text-base mb-2" style={{ color: 'var(--nm-text-primary)' }}>
                    {new Date(meeting.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </h3>
                  <div className="text-xs mb-3 space-y-1" style={{ color: 'var(--nm-text-secondary)' }}>
                    <p>Start: {new Date(meeting.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p>Late: {new Date(meeting.late_cutoff_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-testid={`view-attendance-btn-${meeting.meeting_id}`}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => navigate(`/app/meetings/attendance/${meeting.meeting_id}`)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      data-testid={`excel-btn-${meeting.meeting_id}`}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                      onClick={() => downloadExcel(meeting.meeting_id)}
                    >
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      Excel
                    </Button>
                    <Button
                      data-testid={`pdf-btn-${meeting.meeting_id}`}
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => downloadPDF(meeting.meeting_id)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                
                {/* Desktop Layout */}
                <div className="hidden md:flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--nm-text-primary)' }}>
                      Meeting - {new Date(meeting.date).toLocaleDateString()}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                      <div>
                        <p><strong>Start:</strong> {new Date(meeting.start_time).toLocaleTimeString()}</p>
                        <p><strong>Late Cutoff:</strong> {new Date(meeting.late_cutoff_time).toLocaleTimeString()}</p>
                      </div>
                      <div>
                        <p><strong>End:</strong> {new Date(meeting.end_time).toLocaleTimeString()}</p>
                        <p><strong>ID:</strong> {meeting.meeting_id}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      data-testid={`view-attendance-btn-${meeting.meeting_id}`}
                      variant="outline"
                      onClick={() => navigate(`/app/meetings/attendance/${meeting.meeting_id}`)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Attendance
                    </Button>
                    <Button
                      data-testid={`excel-btn-${meeting.meeting_id}`}
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => downloadExcel(meeting.meeting_id)}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Download Excel
                    </Button>
                    <Button
                      data-testid={`pdf-btn-${meeting.meeting_id}`}
                      variant="destructive"
                      onClick={() => downloadPDF(meeting.meeting_id)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
