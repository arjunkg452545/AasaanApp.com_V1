// MAX 300 LINES
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';

export default function SAChapterDialogs({
  createOpen,
  setCreateOpen,
  createForm,
  setCreateForm,
  onCreateSubmit,
}) {
  return (
    <>
      {/* ===== Create Chapter Dialog ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle>
            <DialogDescription>
              Create a chapter, then assign a President from the Leadership page.
            </DialogDescription>
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
    </>
  );
}
