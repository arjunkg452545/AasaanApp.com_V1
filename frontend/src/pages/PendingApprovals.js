import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';

export default function PendingApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPending();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadPending = async () => {
    try {
      const response = await api.get('/admin/attendance/pending');
      setPending(response.data);
    } catch (error) {
      toast.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (attendanceId) => {
    try {
      await api.post(`/admin/attendance/${attendanceId}/approve`);
      toast.success('Attendance approved');
      loadPending();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (attendanceId) => {
    if (!window.confirm('Are you sure you want to reject this attendance?')) return;

    try {
      await api.post(`/admin/attendance/${attendanceId}/reject`);
      toast.success('Attendance rejected');
      loadPending();
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      <div className="nm-header px-8 py-4">
        <Button
          data-testid="back-btn"
          variant="ghost"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Pending Approvals</h1>
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Substitute & Visitor attendance requests</p>
          </div>
          <Button
            data-testid="refresh-btn"
            variant="outline"
            size="sm"
            onClick={loadPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
          </div>
        ) : pending.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--nm-text-muted)' }} />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No pending approval requests</p>
            <p className="text-sm mt-2" style={{ color: 'var(--nm-text-muted)' }}>Substitute and visitor attendance will appear here</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pending.map((att) => (
              <Card
                key={att.attendance_id}
                className="p-6 hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
                data-testid={`pending-card-${att.attendance_id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        Pending Approval
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {att.type}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {att.type === 'substitute' && (
                        <>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Substitute For:</p>
                            <p className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>
                              Member ID: {att.unique_member_id} ({att.member_name})
                            </p>
                          </div>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Substitute Details:</p>
                            <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{att.substitute_name}</p>
                            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{att.substitute_mobile}</p>
                          </div>
                        </>
                      )}

                      {att.type === 'visitor' && (
                        <>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Visitor Details:</p>
                            <p className="font-medium" style={{ color: 'var(--nm-text-primary)' }}>{att.visitor_name}</p>
                            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>{att.visitor_mobile}</p>
                            {att.visitor_company && (
                              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Company: {att.visitor_company}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm" style={{ color: 'var(--nm-text-muted)' }}>Invited By:</p>
                            <p className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>
                              {att.invited_by_member_name || `Member ID: ${att.invited_by_member_id}`}
                            </p>
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-4 text-sm mt-3" style={{ color: 'var(--nm-text-secondary)' }}>
                        <span>
                          <Clock className="h-4 w-4 inline mr-1" />
                          {new Date(att.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                        <span className="px-2 py-1 rounded" style={{ background: 'var(--nm-surface)' }}>
                          {att.late_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      data-testid={`approve-btn-${att.attendance_id}`}
                      onClick={() => handleApprove(att.attendance_id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      data-testid={`reject-btn-${att.attendance_id}`}
                      variant="outline"
                      onClick={() => handleReject(att.attendance_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
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
