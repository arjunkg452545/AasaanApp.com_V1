import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react';

export default function MeetingManagement() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [rememberTimes, setRememberTimes] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    late_cutoff_time: '',
    end_time: ''
  });
  const navigate = useNavigate();

  // Get userId for localStorage key
  const getUserId = () => {
    return localStorage.getItem('user_id') || localStorage.getItem('chapter_id') || 'default';
  };

  // Load saved times when modal opens
  useEffect(() => {
    if (createOpen) {
      const userId = getUserId();
      const savedTimes = localStorage.getItem(`meeting_times_${userId}`);
      if (savedTimes) {
        try {
          const parsed = JSON.parse(savedTimes);
          setFormData(prev => ({
            ...prev,
            date: '', // Date should always be empty
            start_time: parsed.start_time || '',
            late_cutoff_time: parsed.late_cutoff_time || '',
            end_time: parsed.end_time || ''
          }));
          setRememberTimes(parsed.remember || false);
        } catch (e) {
          console.error('Error parsing saved times:', e);
        }
      }
    }
  }, [createOpen]);

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

  // Handle remember times checkbox change
  const handleRememberChange = (checked) => {
    setRememberTimes(checked);
    const userId = getUserId();
    
    if (!checked) {
      // Clear saved times when unchecked
      localStorage.removeItem(`meeting_times_${userId}`);
    }
  };

  // Save times to localStorage
  const saveTimes = () => {
    if (rememberTimes) {
      const userId = getUserId();
      const timesData = {
        start_time: formData.start_time,
        late_cutoff_time: formData.late_cutoff_time,
        end_time: formData.end_time,
        remember: true
      };
      localStorage.setItem(`meeting_times_${userId}`, JSON.stringify(timesData));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Convert date and times to ISO format
      const meetingData = {
        date: new Date(formData.date).toISOString(),
        start_time: new Date(`${formData.date}T${formData.start_time}`).toISOString(),
        late_cutoff_time: new Date(`${formData.date}T${formData.late_cutoff_time}`).toISOString(),
        end_time: new Date(`${formData.date}T${formData.end_time}`).toISOString()
      };
      
      await api.post('/admin/meetings', meetingData);
      
      // Save times if checkbox is checked
      saveTimes();
      
      toast.success('Meeting created successfully');
      setCreateOpen(false);
      setFormData({
        date: '',
        start_time: rememberTimes ? formData.start_time : '',
        late_cutoff_time: rememberTimes ? formData.late_cutoff_time : '',
        end_time: rememberTimes ? formData.end_time : ''
      });
      loadMeetings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create meeting');
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

  const deleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting? All attendance records will also be deleted.')) {
      return;
    }

    try {
      await api.delete(`/admin/meetings/${meetingId}`);
      toast.success('Meeting deleted successfully');
      loadMeetings();
    } catch (error) {
      toast.error('Failed to delete meeting');
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
        <h1 className="text-lg md:text-2xl font-bold text-slate-900">Meeting Management</h1>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Meetings</h2>
            <p className="text-slate-600 mt-1">Create and manage your chapter meetings</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-meeting-btn" className="bg-[#CF2030] hover:bg-[#A61926]">
                <Plus className="h-4 w-4 mr-2" />
                Create Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Meeting</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Meeting Date</Label>
                  <Input
                    data-testid="meeting-date-input"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    data-testid="start-time-input"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Late Cutoff Time</Label>
                  <Input
                    data-testid="cutoff-time-input"
                    type="time"
                    value={formData.late_cutoff_time}
                    onChange={(e) => setFormData({...formData, late_cutoff_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    data-testid="end-time-input"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
                
                {/* Remember Times Checkbox */}
                <div className="flex items-center space-x-2 py-2 px-3 bg-slate-50 rounded-lg">
                  <Checkbox 
                    id="remember-times"
                    checked={rememberTimes}
                    onCheckedChange={handleRememberChange}
                  />
                  <label 
                    htmlFor="remember-times" 
                    className="text-sm font-medium text-slate-700 cursor-pointer select-none"
                  >
                    Remember times for next meeting
                  </label>
                </div>
                
                <Button data-testid="submit-meeting-btn" type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926]">
                  Create Meeting
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-600">No meetings yet. Create your first meeting!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {meetings.map((meeting) => (
              <Card
                key={meeting.meeting_id}
                className="p-6 border-l-4 border-l-[#005596]"
                data-testid={`meeting-card-${meeting.meeting_id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-slate-900 mb-2">
                      Meeting - {new Date(meeting.date).toLocaleDateString()}
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
                  <div className="flex flex-col gap-2">
                    <Button
                      data-testid={`delete-meeting-btn-${meeting.meeting_id}`}
                      variant="outline"
                      onClick={() => deleteMeeting(meeting.meeting_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
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
