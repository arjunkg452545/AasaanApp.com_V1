import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ArrowLeft, Plus, Check, PartyPopper, X, Users, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EventPayment() {
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(null);
  const [eventData, setEventData] = useState({ event: null, members: [] });
  const [newEvent, setNewEvent] = useState({ event_name: '', amount: '', event_date: '', event_type: 'compulsory', description: '', selected_members: [] });
  const [paymentMode, setPaymentMode] = useState('cash');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editEvent, setEditEvent] = useState(null);
  const [editForm, setEditForm] = useState({ event_name: '', amount: '', event_date: '' });
  const navigate = useNavigate();

  const loadEvents = async () => {
    try {
      const response = await api.get('/admin/fund/events');
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      const response = await api.get('/admin/members');
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members');
    }
  };

  useEffect(() => { loadEvents(); loadAllMembers(); }, []);

  const handleCreate = async () => {
    if (!newEvent.event_name || !newEvent.amount || !newEvent.event_date) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await api.post('/admin/fund/events', {
        event_name: newEvent.event_name,
        amount: parseFloat(newEvent.amount),
        event_date: newEvent.event_date,
        event_type: newEvent.event_type,
        description: newEvent.description,
        selected_members: newEvent.event_type === 'optional' ? newEvent.selected_members : null
      });
      toast.success('Event created');
      setShowCreate(false);
      setNewEvent({ event_name: '', amount: '', event_date: '', event_type: 'compulsory', description: '', selected_members: [] });
      loadEvents();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const handleUpdateEvent = async () => {
    if (!editForm.event_name || !editForm.amount) {
      toast.error('Name and amount required');
      return;
    }
    try {
      await api.put(`/admin/fund/events/${editEvent}`, editForm);
      toast.success('Event updated');
      setEditEvent(null);
      loadEvents();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this event? All payment records will be removed.')) return;
    try {
      await api.delete(`/admin/fund/events/${eventId}`);
      toast.success('Event deleted');
      loadEvents();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const loadEventMembers = async (eventId) => {
    try {
      const response = await api.get(`/admin/fund/events/${eventId}/members`);
      setEventData(response.data);
      setShowMembers(eventId);
      setSelectedMembers([]);
    } catch (error) {
      toast.error('Failed to load members');
    }
  };

  const handleMarkPaid = async (memberId) => {
    try {
      await api.post('/admin/fund/events/payment', { event_id: showMembers, member_id: memberId, payment_mode: paymentMode });
      toast.success('Payment recorded');
      loadEventMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleUnmarkPaid = async (memberId) => {
    try {
      await api.post('/admin/fund/events/unmark', { event_id: showMembers, member_id: memberId });
      toast.success('Payment unmarked');
      loadEventMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleBulkMark = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await api.post('/admin/fund/events/bulk-mark', { member_ids: selectedMembers, event_id: showMembers, payment_mode: paymentMode });
      toast.success('Bulk marked');
      loadEventMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleBulkUnmark = async () => {
    if (selectedMembers.length === 0) return;
    try {
      await api.post('/admin/fund/events/bulk-unmark', { member_ids: selectedMembers, event_id: showMembers });
      toast.success('Bulk unmarked');
      loadEventMembers(showMembers);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const toggleEventMemberSelection = (memberId) => {
    setNewEvent(prev => ({
      ...prev,
      selected_members: prev.selected_members.includes(memberId) ? prev.selected_members.filter(id => id !== memberId) : [...prev.selected_members, memberId]
    }));
  };

  // Event Members View
  if (showMembers) {
    const paidCount = eventData.members.filter(m => m.status === 'paid').length;
    const pendingCount = eventData.members.filter(m => m.status === 'pending').length;
    const collection = paidCount * (eventData.event?.amount || 0);

    return (
      <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
        <div className="nm-header px-3 md:px-8 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="sm" onClick={() => setShowMembers(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base md:text-2xl font-bold truncate max-w-[180px] md:max-w-none" style={{ color: 'var(--nm-text-primary)' }}>{eventData.event?.event_name}</h1>
              <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                {eventData.event?.event_type === 'compulsory' ? '🔴' : '🟢'} ₹{eventData.event?.amount}
              </p>
            </div>
          </div>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="nm-input rounded p-1.5 text-xs">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="p-3 md:p-8 max-w-6xl mx-auto">
          {/* Stats */}
          <div className="flex gap-2 mb-4">
            <div className="px-3 py-1.5 bg-green-100 rounded">
              <p className="text-xs text-green-700 font-bold">{paidCount} Paid</p>
            </div>
            <div className="px-3 py-1.5 bg-red-100 rounded">
              <p className="text-xs text-red-700 font-bold">{pendingCount} Pending</p>
            </div>
            <div className="px-3 py-1.5 bg-purple-100 rounded">
              <p className="text-xs text-purple-700 font-bold">₹{collection}</p>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMembers.length > 0 && (
            <Card className="p-2 mb-3 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-900">{selectedMembers.length} selected</span>
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleBulkMark} className="bg-green-600 text-xs px-2 h-6"><Check className="h-3 w-3" /></Button>
                  <Button size="sm" onClick={handleBulkUnmark} variant="destructive" className="text-xs px-2 h-6"><X className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedMembers([])} className="text-xs h-6">Clear</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Members - Mobile Card Layout */}
          <div className="space-y-2">
            {eventData.members.map((member) => (
              <Card key={member.member_id} className={`p-3 ${member.status === 'paid' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-400'}`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedMembers.includes(member.member_id)} onChange={() => toggleMemberSelection(member.member_id)} className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.member_name}</p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nm-text-secondary)' }}>
                      <span className={member.status === 'paid' ? 'text-green-600' : 'text-red-600'}>{member.status}</span>
                      {member.payment_mode && <span>• {member.payment_mode}</span>}
                    </div>
                  </div>
                  {member.status === 'pending' ? (
                    <Button size="sm" onClick={() => handleMarkPaid(member.member_id)} className="bg-green-600 text-xs px-2 h-7">
                      <Check className="h-3 w-3 mr-1" />Pay
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUnmarkPaid(member.member_id)} className="text-xs px-2 h-7 text-red-600">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main Events List
  return (
    <div className="min-h-screen" style={{ background: 'var(--nm-bg)' }}>
      <div className="nm-header px-3 md:px-8 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/fund-hub')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base md:text-2xl font-bold" style={{ color: 'var(--nm-text-primary)' }}>Event Payment</h1>
            <p className="text-xs" style={{ color: 'var(--nm-text-secondary)' }}>Events & collections</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700" size="sm">
          <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          <span className="text-xs md:text-sm">Add</span>
        </Button>
      </div>

      <div className="p-3 md:p-8 max-w-6xl mx-auto">
        {/* Create Form */}
        {showCreate && (
          <Card className="p-3 md:p-6 mb-4 border-purple-200 bg-purple-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-purple-900 text-sm">New Event</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={newEvent.event_name} onChange={(e) => setNewEvent({...newEvent, event_name: e.target.value})} placeholder="Annual Dinner" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input type="number" value={newEvent.amount} onChange={(e) => setNewEvent({...newEvent, amount: e.target.value})} placeholder="₹" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Type *</Label>
                <select value={newEvent.event_type} onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value})} className="nm-input w-full p-2 rounded text-sm">
                  <option value="compulsory">🔴 All Members</option>
                  <option value="optional">🟢 Select Members</option>
                </select>
              </div>
            </div>
            {newEvent.event_type === 'optional' && (
              <div className="mt-3 border-t pt-3">
                <Label className="text-xs mb-1 block">Select Members ({newEvent.selected_members.length})</Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 bg-white">
                  {members.map(member => (
                    <label key={member.member_id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-sm">
                      <input type="checkbox" checked={newEvent.selected_members.includes(member.member_id)} onChange={() => toggleEventMemberSelection(member.member_id)} />
                      <span className="truncate">{member.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleCreate} className="mt-3 bg-purple-600 hover:bg-purple-700" size="sm">Create</Button>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={editForm.event_name} onChange={(e) => setEditForm({...editForm, event_name: e.target.value})} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} className="text-sm" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={editForm.event_date} onChange={(e) => setEditForm({...editForm, event_date: e.target.value})} className="text-sm" />
              </div>
              <Button onClick={handleUpdateEvent} className="w-full">Update</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>Loading...</div>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center">
            <PartyPopper className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--nm-text-secondary)' }}>No events yet</p>
            <Button onClick={() => setShowCreate(true)} size="sm" className="mt-3">Create</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <Card key={event.event_id} className="p-3 hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadEventMembers(event.event_id)}>
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-sm truncate">{event.event_name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${event.event_type === 'compulsory' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {event.event_type === 'compulsory' ? 'All' : 'Opt'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--nm-text-secondary)' }}>
                      <span>{new Date(event.event_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</span>
                      <span>• {event.paid_count || 0}/{event.total_members || 0}</span>
                    </div>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-purple-600">₹{event.amount}</p>
                    <p className="text-xs text-green-600">₹{event.total_collected || 0}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setEditEvent(event.event_id); setEditForm({ event_name: event.event_name, amount: event.amount, event_date: event.event_date?.split('T')[0] || '' }); }}>
                      <Edit className="h-3 w-3 text-slate-500" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => handleDeleteEvent(event.event_id, e)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
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