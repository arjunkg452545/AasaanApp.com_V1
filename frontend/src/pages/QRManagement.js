import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, QrCode } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4">
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
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">QR Display Management</h1>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">QR Display Management</h2>
          <p className="text-slate-600 mt-1">Show QR codes for attendance</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600">No meetings available</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {meetings.map((meeting) => (
              <Card
                key={meeting.meeting_id}
                className="p-6 border-l-4 border-l-[#10B981]"
                data-testid={`meeting-qr-card-${meeting.meeting_id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-slate-900 mb-2">
                      QR Display - {new Date(meeting.date).toLocaleDateString()}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
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
