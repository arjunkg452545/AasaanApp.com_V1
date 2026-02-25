import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Loader2, Plus, UserPlus, Phone, Mail, Trash2, Calculator,
} from 'lucide-react';

export default function AccountantManagement() {
  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadAccountants();
  }, []); // eslint-disable-line

  const loadAccountants = async () => {
    try {
      const res = await api.get('/superadmin/accountants');
      setAccountants(res.data);
    } catch {
      toast.error('Failed to load accountants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !mobile || !password) {
      toast.error('Name, mobile, and password are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/superadmin/accountants', { name, mobile, email, password });
      toast.success('Accountant created');
      setCreateOpen(false);
      setName(''); setMobile(''); setEmail(''); setPassword('');
      loadAccountants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (accountantId) => {
    if (!window.confirm('Deactivate this accountant?')) return;
    try {
      await api.delete(`/superadmin/accountants/${accountantId}`);
      toast.success('Accountant deactivated');
      loadAccountants();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Accountants</h1>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" /> Add Accountant
        </Button>
      </div>

      {accountants.length === 0 ? (
        <Card className="p-8 text-center">
          <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No accountants yet</p>
          <p className="text-xs text-slate-400 mt-1">Create an accountant to help with payment verification</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {accountants.map(acc => (
            <Card key={acc.accountant_id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">
                      {acc.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{acc.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {acc.mobile}
                      </span>
                      {acc.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {acc.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    acc.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {acc.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {acc.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(acc.accountant_id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Add Accountant
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-sm">Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Mobile</Label>
              <Input
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Mobile number"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Email (optional)</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Login password"
                required
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? 'Creating...' : 'Create Accountant'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
