import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Users, Clock, UserCheck, UserX, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

export default function LiveAttendance() {
  const { meetingId } = useParams();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);
  const [showAbsent, setShowAbsent] = useState(false);
  const navigate = useNavigate();

  const loadAttendance = async () => {
    try {
      const response = await api.get(`/admin/meetings/${meetingId}/attendance`);
      setAttendance(response.data);
    } catch (error) {
      toast.error('Failed to load attendance');
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
    loadAttendance();
    loadSummary();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadAttendance();
      loadSummary();
    }, 30000);
    return () => clearInterval(interval);
  }, [meetingId]);

  const getStatusBadge = (status, lateType) => {
    if (status === 'Present' && lateType === 'On time') {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">On Time</Badge>;
    }
    if (status === 'Present' && lateType === 'Late') {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Late</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700 border-red-200">Absent</Badge>;
  };

  // Separate members/substitutes and visitors
  const memberAttendance = attendance.filter(att => att.type === 'member' || att.type === 'substitute');
  const visitorAttendance = attendance.filter(att => att.type === 'visitor');

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      <div className="nm-header px-8 py-4">
        <Button
          data-testid="back-btn"
          variant="ghost"
          onClick={() => navigate('/app/reports')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>View Attendance</h1>
          <Button
            data-testid="refresh-btn"
            variant="outline"
            size="sm"
            onClick={() => {
              loadAttendance();
              loadSummary();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Attendance Summary */}
        {summary && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--nm-text-primary)' }}>Attendance Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Total Members</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summary.total_members}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-green-500">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Present</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summary.present_count}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Substitutes</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summary.substitute_count}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-purple-500">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Visitors</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summary.visitor_count}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Pending/Absent Members */}
            {!summary.meeting_ended && summary.pending_members && summary.pending_members.length > 0 && (
              <Card className="p-4 border-l-4 border-l-red-500 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <UserX className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Pending Attendance</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summary.pending_count}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPending(!showPending)}
                  >
                    {showPending ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showPending ? 'Hide' : 'Show'} List
                  </Button>
                </div>
                {showPending && (
                  <div className="mt-4 space-y-2">
                    {summary.pending_members.map((member) => (
                      <div key={member.unique_member_id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--nm-surface)' }}>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{member.full_name}</p>
                          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>ID: {member.unique_member_id} | {member.primary_mobile}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700 border-red-200">Pending</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {summary.meeting_ended && summary.pending_members && summary.pending_members.length > 0 && (
              <Card className="p-4 border-l-4 border-l-red-500 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <UserX className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Absent</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>{summary.absent_count}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAbsent(!showAbsent)}
                  >
                    {showAbsent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showAbsent ? 'Hide' : 'Show'} List
                  </Button>
                </div>
                {showAbsent && (
                  <div className="mt-4 space-y-2">
                    {summary.pending_members.map((member) => (
                      <div key={member.unique_member_id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--nm-surface)' }}>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--nm-text-primary)' }}>{member.full_name}</p>
                          <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>ID: {member.unique_member_id} | {member.primary_mobile}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700 border-red-200">Absent</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <div className="flex items-center gap-2 text-sm mt-4" style={{ color: 'var(--nm-text-secondary)' }}>
              <Clock className="h-4 w-4" />
              <span>Auto-refreshing every 30 seconds</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading attendance...</div>
        ) : (
          <>
            {/* Members & Substitutes Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--nm-text-primary)' }}>Members & Substitutes</h2>
              {memberAttendance.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--nm-text-muted)' }} />
                  <p style={{ color: 'var(--nm-text-secondary)' }}>No member attendance marked yet</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {memberAttendance.map((att) => (
                    <Card
                      key={att.attendance_id}
                      className="p-6 hover:shadow-md transition-shadow"
                      data-testid={`attendance-card-${att.attendance_id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-[#CF2030]/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-[#CF2030]">
                                {att.unique_member_id || '?'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg" style={{ color: 'var(--nm-text-primary)' }}>
                                {att.type === 'member' && att.member_name}
                                {att.type === 'substitute' && `${att.substitute_name} (Substitute for ${att.unique_member_id})`}
                              </h3>
                              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                                {att.type === 'member' && att.primary_mobile}
                                {att.type === 'substitute' && att.substitute_mobile}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                            <span>
                              <Clock className="h-4 w-4 inline mr-1" />
                              {new Date(att.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="capitalize px-2 py-1 rounded" style={{ background: 'var(--nm-surface)' }}>
                              {att.type}
                            </span>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(att.status, att.late_type)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Visitors Section */}
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--nm-text-primary)' }}>Visitors</h2>
              {visitorAttendance.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--nm-text-muted)' }} />
                  <p style={{ color: 'var(--nm-text-secondary)' }}>No visitor attendance marked yet</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {visitorAttendance.map((att) => (
                    <Card
                      key={att.attendance_id}
                      className="p-6 hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
                      data-testid={`visitor-card-${att.attendance_id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg" style={{ color: 'var(--nm-text-primary)' }}>
                                {att.visitor_name}
                              </h3>
                              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                                {att.visitor_mobile} | {att.visitor_company}
                              </p>
                              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                                Invited by: {att.invited_by_member_name || att.invited_by_member_id}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                            <span>
                              <Clock className="h-4 w-4 inline mr-1" />
                              {new Date(att.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="capitalize px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              Visitor
                            </span>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(att.status, att.late_type)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
