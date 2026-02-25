import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, LogOut, Building2, Users, Edit, Trash2 } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    admin_mobile: '',
    admin_password: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const response = await api.get('/superadmin/chapters');
      setChapters(response.data);
    } catch (error) {
      toast.error('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/chapters', formData);
      toast.success('Chapter created successfully');
      setCreateOpen(false);
      setFormData({ name: '', admin_mobile: '', admin_password: '' });
      loadChapters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create chapter');
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/superadmin/chapters/${selectedChapter.chapter_id}/credentials`, {
        new_mobile: formData.admin_mobile,
        new_password: formData.admin_password
      });
      toast.success('Credentials updated successfully');
      setEditOpen(false);
      loadChapters();
    } catch (error) {
      toast.error('Failed to update credentials');
    }
  };

  const handleDeleteChapter = async (chapterId, chapterName) => {
    if (!window.confirm(`Are you sure you want to delete "${chapterName}"? This will permanently delete all associated members, meetings, and attendance records. This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/superadmin/chapters/${chapterId}`);
      toast.success('Chapter deleted successfully');
      loadChapters();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete chapter');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-12 w-auto rounded-lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
            <p className="text-sm text-slate-600">Aasaan App - Chapter Management</p>
          </div>
        </div>
        <Button data-testid="logout-btn" variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Chapters</h2>
            <p className="text-slate-600 mt-1">Manage all BNI chapters and their admins</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-chapter-btn" className="bg-[#CF2030] hover:bg-[#A61926]">
                <Plus className="h-4 w-4 mr-2" />
                Create Chapter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Chapter</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Chapter Name</Label>
                  <Input
                    data-testid="chapter-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Admin Login ID</Label>
                  <Input
                    data-testid="admin-mobile-input"
                    placeholder="Enter Admin Login ID"
                    value={formData.admin_mobile}
                    onChange={(e) => setFormData({...formData, admin_mobile: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Admin Password</Label>
                  <Input
                    data-testid="admin-password-input"
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                    required
                  />
                </div>
                <Button data-testid="submit-chapter-btn" type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926]">
                  Create Chapter
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading chapters...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((chapter) => (
              <Card
                key={chapter.chapter_id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-[#CF2030]"
                data-testid={`chapter-card-${chapter.chapter_id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-[#CF2030]/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-[#CF2030]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900">{chapter.name}</h3>
                      <p className="text-sm text-slate-500">ID: {chapter.chapter_id}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">Admin Login ID: {chapter.admin_mobile}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    data-testid={`edit-chapter-btn-${chapter.chapter_id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedChapter(chapter);
                      setFormData({
                        admin_mobile: chapter.admin_mobile,
                        admin_password: ''
                      });
                      setEditOpen(true);
                    }}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update Credentials
                  </Button>
                  <Button
                    data-testid={`delete-chapter-btn-${chapter.chapter_id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteChapter(chapter.chapter_id, chapter.name)}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Chapter
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Admin Credentials</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div>
              <Label>New Admin Login ID</Label>
              <Input
                data-testid="update-mobile-input"
                placeholder="Enter New Admin Login ID"
                value={formData.admin_mobile}
                onChange={(e) => setFormData({...formData, admin_mobile: e.target.value})}
                required
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                data-testid="update-password-input"
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                required
              />
            </div>
            <Button data-testid="update-credentials-btn" type="submit" className="w-full bg-[#CF2030] hover:bg-[#A61926]">
              Update Credentials
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}