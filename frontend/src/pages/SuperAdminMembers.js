import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Search, Users, Building2,
  ArrowRightLeft, UserCheck, Shield, Crown, AlertTriangle,
} from 'lucide-react';
import { toTitleCase } from '../utils/formatDate';

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function SuperAdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [chapters, setChapters] = useState([]);
  const [chapterFilter, setChapterFilter] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [targetChapter, setTargetChapter] = useState('');
  const [transferReason, setTransferReason] = useState('');
  // Make President state
  const [presidentOpen, setPresidentOpen] = useState(false);
  const [selectedPresCandidate, setSelectedPresCandidate] = useState(null);
  const [presidentSaving, setPresidentSaving] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1); // 1 = select, 2 = confirm
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [membersRes, chaptersRes] = await Promise.all([
        api.get('/superadmin/members/all'),
        api.get('/superadmin/chapters/overview'),
      ]);
      setMembers(membersRes.data);
      setChapters(chaptersRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally { setLoading(false); }
  };

  const filteredMembers = useMemo(() => {
    let result = members;
    if (statusFilter) {
      result = result.filter(m => m.membership_status === statusFilter);
    }
    if (chapterFilter) {
      result = result.filter(m => m.chapter_id === chapterFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.primary_mobile || '').includes(q) ||
        (m.business_name || '').toLowerCase().includes(q) ||
        (m.unique_member_id || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [members, statusFilter, chapterFilter, searchQuery]);

  const handleTransfer = async () => {
    if (!targetChapter) { toast.error('Select target chapter'); return; }
    try {
      await api.post(`/superadmin/members/${selectedMember.member_id}/transfer`, {
        target_chapter_id: targetChapter,
        reason: transferReason || undefined,
      });
      toast.success('Member transferred');
      setTransferOpen(false);
      setTargetChapter('');
      setTransferReason('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Transfer failed');
    }
  };

  // Derive current president for selected chapter
  const currentPresident = useMemo(() => {
    if (!chapterFilter) return null;
    return members.find(m => m.chapter_id === chapterFilter && m.chapter_role === 'president');
  }, [members, chapterFilter]);

  const selectedChapterName = useMemo(() => {
    if (!chapterFilter) return '';
    const ch = chapters.find(c => c.chapter_id === chapterFilter);
    return ch ? ch.name : '';
  }, [chapters, chapterFilter]);

  // Active members in selected chapter (excluding current president)
  const eligibleCandidates = useMemo(() => {
    if (!chapterFilter) return [];
    return filteredMembers.filter(m =>
      m.membership_status === 'active' &&
      m.chapter_id === chapterFilter &&
      m.member_id !== currentPresident?.member_id
    );
  }, [filteredMembers, chapterFilter, currentPresident]);

  const handleMakePresident = async () => {
    if (!selectedPresCandidate || !chapterFilter) return;
    setPresidentSaving(true);
    try {
      const res = await api.post(`/superadmin/chapters/${chapterFilter}/change-leadership`, {
        member_id: selectedPresCandidate.member_id,
        role: 'president',
      });
      toast.success(res.data.message || 'President assigned');
      setPresidentOpen(false);
      setSelectedPresCandidate(null);
      setConfirmStep(1);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign President');
    } finally { setPresidentSaving(false); }
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
          <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>All Members</h1>
          <Badge variant="outline">{filteredMembers.length} of {members.length}</Badge>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
            <Input
              placeholder="Search name, mobile, business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={chapterFilter} onValueChange={(v) => setChapterFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Chapters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chapters</SelectItem>
              {chapters.map((ch) => (
                <SelectItem key={ch.chapter_id} value={ch.chapter_id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* President Banner — shown when a chapter is selected */}
        {chapterFilter && (
          <Card className="p-3 md:p-4 border-l-4 border-l-yellow-400">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Crown className="h-5 w-5 shrink-0 text-yellow-600" />
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--nm-text-secondary)' }}>
                    Current President — {selectedChapterName}
                  </p>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--nm-text-primary)' }}>
                    {currentPresident ? toTitleCase(currentPresident.full_name) : 'No president assigned'}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline"
                onClick={() => { setPresidentOpen(true); setConfirmStep(1); setSelectedPresCandidate(null); }}
                className="shrink-0 text-xs">
                <Crown className="h-3.5 w-3.5 mr-1" /> {currentPresident ? 'Change' : 'Assign'} President
              </Button>
            </div>
          </Card>
        )}

        {/* Member List */}
        {filteredMembers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No members found</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <Card key={member.member_id} className="p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--nm-surface)' }}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--nm-text-secondary)' }}>{member.unique_member_id}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(member.full_name)}</h3>
                        <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[member.membership_status] || STATUS_COLORS.active}`}>
                          {member.membership_status || 'active'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                        <span>{member.primary_mobile}</span>
                        <span>&middot;</span>
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{member.chapter_name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setTargetChapter('');
                        setTransferReason('');
                        setTransferOpen(true);
                      }}>
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transfer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
              Transferring: <strong>{toTitleCase(selectedMember?.full_name)}</strong>
              {selectedMember?.chapter_name && (
                <span style={{ color: 'var(--nm-text-muted)' }}> from {selectedMember.chapter_name}</span>
              )}
            </p>
            <div>
              <Label>Target Chapter</Label>
              <Select value={targetChapter} onValueChange={setTargetChapter}>
                <SelectTrigger><SelectValue placeholder="Select chapter..." /></SelectTrigger>
                <SelectContent>
                  {chapters
                    .filter(ch => ch.chapter_id !== selectedMember?.chapter_id)
                    .map((ch) => (
                      <SelectItem key={ch.chapter_id} value={ch.chapter_id}>
                        {ch.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Reason for transfer..." />
            </div>
            <Button onClick={handleTransfer} className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              Confirm Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change President Dialog — 2-step */}
      <Dialog open={presidentOpen} onOpenChange={(v) => { setPresidentOpen(v); if (!v) { setConfirmStep(1); setSelectedPresCandidate(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmStep === 1 ? 'Select New President' : 'Confirm President Change'}
            </DialogTitle>
          </DialogHeader>

          {confirmStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                Chapter: <strong>{selectedChapterName}</strong>
              </p>
              <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pr-1">
                {eligibleCandidates.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--nm-text-muted)' }}>No eligible active members</p>
                ) : (
                  eligibleCandidates.map((m) => (
                    <button key={m.member_id}
                      onClick={() => setSelectedPresCandidate(m)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedPresCandidate?.member_id === m.member_id
                          ? 'border-[#CF2030] shadow-sm' : 'border-transparent'
                      }`}
                      style={{ background: 'var(--nm-surface)' }}>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#CF2030]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-[#CF2030]">{m.unique_member_id}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(m.full_name)}</p>
                          <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                            {m.primary_mobile}
                            {m.chapter_role && m.chapter_role !== 'member' && ` · ${m.chapter_role.replace('_', ' ')}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <Button disabled={!selectedPresCandidate}
                onClick={() => setConfirmStep(2)}
                className="w-full nm-btn-primary">
                Continue
              </Button>
            </div>
          )}

          {confirmStep === 2 && selectedPresCandidate && (
            <div className="space-y-4">
              {/* Warnings */}
              <div className="space-y-2">
                {currentPresident && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ background: 'var(--nm-surface)', borderColor: 'var(--nm-border)' }}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                      <strong>{toTitleCase(currentPresident.full_name)}</strong> will be demoted from President to Member.
                    </p>
                  </div>
                )}
                {selectedPresCandidate.chapter_role && selectedPresCandidate.chapter_role !== 'member' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ background: 'var(--nm-surface)', borderColor: 'var(--nm-border)' }}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                      <strong>{toTitleCase(selectedPresCandidate.full_name)}</strong> is currently{' '}
                      {selectedPresCandidate.chapter_role.replace('_', ' ')}. They will become President.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl text-center" style={{ background: 'var(--nm-surface)' }}>
                <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>
                  {toTitleCase(selectedPresCandidate.full_name)}
                </p>
                <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                  will become President of {selectedChapterName}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleMakePresident} disabled={presidentSaving}
                  className="flex-1 bg-[#CF2030] hover:bg-[#A61926]">
                  {presidentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
