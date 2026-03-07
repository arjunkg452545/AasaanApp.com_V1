import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, Shield, Crown, Users, ChevronDown, UserCheck,
} from 'lucide-react';

function formatRole(role) {
  if (!role) return 'Member';
  if (role === 'secretary_treasurer') return 'Secretary/Treasurer';
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ManageAdmins() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changeOpen, setChangeOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [roleToChange, setRoleToChange] = useState('president');
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadChapters(); }, []);

  const loadChapters = async () => {
    try {
      const res = await api.get('/superadmin/chapters/overview');
      setChapters(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeLeadership = async (chapter, role) => {
    setSelectedChapter(chapter);
    setRoleToChange(role);
    setSelectedMemberId('');
    setChangeOpen(true);
    setMembersLoading(true);
    try {
      const res = await api.get(`/superadmin/chapters/${chapter.chapter_id}/leadership`);
      setMembers(res.data.members || []);
    } catch {
      toast.error('Failed to load members');
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error('Please select a member');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/superadmin/chapters/${selectedChapter.chapter_id}/change-leadership`, {
        member_id: selectedMemberId,
        role: roleToChange,
      });
      toast.success(res.data.message || 'Leadership updated');
      setChangeOpen(false);
      loadChapters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
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
      <div className="nm-header px-4 md:px-8 py-3 md:py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/dashboard')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <h1 className="text-lg md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Chapter Leadership</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nm-text-secondary)' }}>Assign or change President and Vice President for your chapters</p>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        {chapters.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p style={{ color: 'var(--nm-text-secondary)' }}>No chapters found</p>
          </Card>
        ) : (
          chapters.map((ch) => {
            const president = ch.president;
            const presidentName = president ? president.full_name : 'Not Assigned';

            return (
              <Card key={ch.chapter_id} className="p-4 md:p-5">
                <div className="flex flex-col gap-3">
                  {/* Chapter header */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#CF2030]/10 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-[#CF2030]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--nm-text-primary)' }}>{ch.name}</h3>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                        <Users className="h-3 w-3" />
                        <span>{ch.member_count || 0} members</span>
                        {ch.city && <span>• {ch.city}</span>}
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            color: (ch.status || '').toLowerCase() === 'active' ? '#16a34a' : '#dc2626',
                            borderColor: (ch.status || '').toLowerCase() === 'active' ? '#bbf7d0' : '#fecaca',
                          }}
                        >
                          {(ch.status || 'Active').charAt(0).toUpperCase() + (ch.status || 'active').slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Leadership roles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {/* President */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--nm-surface)', border: '1px solid var(--nm-border)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium" style={{ color: 'var(--nm-text-muted)' }}>President</p>
                          <p className="text-sm font-medium truncate" style={{ color: presidentName === 'Not Assigned' ? 'var(--nm-text-muted)' : 'var(--nm-text-primary)' }}>
                            {presidentName}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeLeadership(ch, 'president')}
                        className="shrink-0 text-xs h-7"
                      >
                        {presidentName === 'Not Assigned' ? 'Assign' : 'Change'}
                      </Button>
                    </div>

                    {/* Vice President — assigned by Chapter President */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--nm-surface)', border: '1px solid var(--nm-border)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium" style={{ color: 'var(--nm-text-muted)' }}>Vice President</p>
                          <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>
                            Assigned by Chapter President
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Change Leadership Dialog */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent aria-describedby="change-leadership-desc">
          <DialogHeader>
            <DialogTitle>
              {roleToChange === 'president' ? 'Assign President' : 'Assign Vice President'}
            </DialogTitle>
            <DialogDescription id="change-leadership-desc">
              Select a member from {selectedChapter?.name} to assign as {formatRole(roleToChange)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--nm-text-primary)' }}>
                  Select Member
                </label>
                <div className="relative">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2.5 text-sm appearance-none pr-8"
                    style={{
                      background: 'var(--nm-surface)',
                      border: '1px solid var(--nm-border)',
                      color: 'var(--nm-text-primary)',
                    }}
                  >
                    <option value="">-- Select a member --</option>
                    {members.map((m) => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.full_name} {m.chapter_role && m.chapter_role !== 'member' ? `(${formatRole(m.chapter_role)})` : ''} — {m.primary_mobile}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: 'var(--nm-text-muted)' }} />
                </div>
                {members.length === 0 && !membersLoading && (
                  <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>No active members found in this chapter</p>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={saving || membersLoading || !selectedMemberId}
              className="w-full bg-[#CF2030] hover:bg-[#A61926]"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
              {saving ? 'Saving...' : `Assign as ${formatRole(roleToChange)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
