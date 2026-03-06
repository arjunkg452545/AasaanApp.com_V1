import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, QrCode, Loader2 } from 'lucide-react';

export default function QRManagement() {
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button
          data-testid="back-btn"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/meeting-hub')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
          <span className="text-sm">Back</span>
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>QR Display Management</h1>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-4 md:mb-8">
          <p className="text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>Show QR codes for attendance</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
        ) : meetings.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <p style={{ color: 'var(--nm-text-secondary)' }}>No meetings available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:gap-6">
            {meetings.map((meeting) => (
              <Card
                key={meeting.meeting_id}
                className="p-3 md:p-6 border-l-4 border-l-[#10B981]"
                data-testid={`meeting-qr-card-${meeting.meeting_id}`}
              >
                {/* Mobile Layout */}
                <div className="md:hidden">
                  <h3 className="font-bold text-base mb-2" style={{ color: 'var(--nm-text-primary)' }}>
                    QR - {new Date(meeting.date).toLocaleDateString()}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3" style={{ color: 'var(--nm-text-secondary)' }}>
                    <p><strong>Start:</strong> {new Date(meeting.start_time).toLocaleTimeString()}</p>
                    <p><strong>End:</strong> {new Date(meeting.end_time).toLocaleTimeString()}</p>
                  </div>
                  <Button
                    data-testid={`show-qr-btn-${meeting.meeting_id}`}
                    onClick={() => navigate(`/admin/qr/${meeting.meeting_id}`)}
                    className="bg-[#10B981] hover:bg-[#059669] w-full"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Show QR
                  </Button>
                </div>
                {/* Desktop Layout */}
                <div className="hidden md:flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--nm-text-primary)' }}>
                      QR Display - {new Date(meeting.date).toLocaleDateString()}
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
                  <div>
                    <Button
                      data-testid={`show-qr-btn-${meeting.meeting_id}`}
                      onClick={() => navigate(`/admin/qr/${meeting.meeting_id}`)}
                      className="bg-[#10B981] hover:bg-[#059669]"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR
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
