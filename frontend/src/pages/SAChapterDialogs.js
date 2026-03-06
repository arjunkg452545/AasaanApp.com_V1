// MAX 300 LINES
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Plus, Eye, EyeOff } from 'lucide-react';

export default function SAChapterDialogs({
  createOpen,
  setCreateOpen,
  editOpen,
  setEditOpen,
  createForm,
  setCreateForm,
  editForm,
  setEditForm,
  selectedChapter,
  showCreatePassword,
  setShowCreatePassword,
  showEditPassword,
  setShowEditPassword,
  onCreateSubmit,
  onEditSubmit,
}) {
  return (
    <>
      {/* ===== Create Chapter Dialog ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Chapter Name</Label>
              <Input
                id="create-name"
                data-testid="chapter-name-input"
                placeholder="e.g. BNI Achievers"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-mobile">Admin Login ID</Label>
              <Input
                id="create-mobile"
                data-testid="admin-mobile-input"
                placeholder="Enter Admin Login ID"
                value={createForm.admin_mobile}
                onChange={(e) => setCreateForm({ ...createForm, admin_mobile: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  data-testid="admin-password-input"
                  type={showCreatePassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={createForm.admin_password}
                  onChange={(e) => setCreateForm({ ...createForm, admin_password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--nm-text-muted)' }}
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  tabIndex={-1}
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-region">Region</Label>
                <Input
                  id="create-region"
                  placeholder="e.g. West"
                  value={createForm.region}
                  onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-state">State</Label>
                <Input
                  id="create-state"
                  placeholder="e.g. Maharashtra"
                  value={createForm.state}
                  onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-city">City</Label>
              <Input
                id="create-city"
                placeholder="e.g. Mumbai"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
              />
            </div>

            <Button
              data-testid="submit-chapter-btn"
              type="submit"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Chapter
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Credentials Dialog ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Update Credentials
              {selectedChapter && (
                <span className="block text-sm font-normal mt-1" style={{ color: 'var(--nm-text-secondary)' }}>
                  {selectedChapter.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-mobile">New Admin Login ID</Label>
              <Input
                id="edit-mobile"
                data-testid="update-mobile-input"
                placeholder="Enter New Admin Login ID"
                value={editForm.new_mobile}
                onChange={(e) => setEditForm({ ...editForm, new_mobile: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-password">New Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  data-testid="update-password-input"
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--nm-text-muted)' }}
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  tabIndex={-1}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              data-testid="update-credentials-btn"
              type="submit"
              className="w-full"
            >
              Update Credentials
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
