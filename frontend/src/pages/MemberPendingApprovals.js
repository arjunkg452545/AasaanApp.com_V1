import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, UserCheck, XCircle, Clock, Building2,
} from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export default function MemberPendingApprovals() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    try {
      const res = await api.get('/superadmin/members/pending');
      setMembers(res.data);
    } catch {
      toast.error('Failed to load pending members');
    } finally { setLoading(false); }
  };

  const handleApprove = async (memberId) => {
    try {
      await api.post(`/superadmin/members/${memberId}/approve`);
      toast.success('Member approved');
      loadPending();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Reason is required'); return; }
    try {
      await api.post(`/superadmin/members/${selectedMember.member_id}/reject`, {
        action: 'reject',
        reason: rejectReason,
      });
      toast.success('Member rejected');
      setRejectOpen(false);
      setRejectReason('');
      loadPending();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      {/* Header */}
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/dashboard')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Pending Approvals</h1>
          <Badge className="bg-amber-100 text-amber-700">{members.length}</Badge>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {members.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No pending member approvals</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <Card key={member.member_id} className="p-4 border-l-4 border-l-amber-400">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{member.full_name}</h3>
                      <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                        ID: {member.unique_member_id} &middot; {member.primary_mobile}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Building2 className="h-3 w-3" style={{ color: 'var(--nm-text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>{member.chapter_name || 'Unknown Chapter'}</span>
                      </div>
                      {member.business_name && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--nm-text-muted)' }}>{member.business_name}</p>
                      )}
                      <p className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>
                        Added: {formatDate(member.created_at)}
                        {member.status_history?.[0]?.changed_by && ` by ${member.status_history[0].changed_by}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(member.member_id)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setSelectedMember(member);
                        setRejectOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              Rejecting: <strong>{selectedMember?.full_name}</strong>
            </p>
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
            <Button onClick={handleReject} className="w-full bg-red-600 hover:bg-red-700">
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
