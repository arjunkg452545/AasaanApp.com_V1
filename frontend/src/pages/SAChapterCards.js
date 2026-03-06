// MAX 300 LINES
import React from 'react';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import {
  Building2,
  Users,
  Edit,
  Trash2,
  Search,
  CalendarDays,
  MapPin,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

function statusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'suspended') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200'; // inactive / default
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function SAChapterCards({
  chapters,
  filteredChapters,
  loading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onEdit,
  onDelete,
}) {
  return (
    <>
      {/* --- Search & Filter --- */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--nm-text-muted)' }} />
          <Input
            data-testid="search-input"
            placeholder="Search by chapter name, city, or region..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- Chapter Cards Grid --- */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--nm-text-muted)' }} />
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--nm-text-muted)' }} />
          <p style={{ color: 'var(--nm-text-secondary)' }}>
            {chapters.length === 0
              ? 'No chapters yet. Create your first chapter to get started.'
              : 'No chapters match your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredChapters.map((chapter) => (
            <Card
              key={chapter.chapter_id}
              className="overflow-hidden border hover:shadow-lg transition-shadow"
              data-testid={`chapter-card-${chapter.chapter_id}`}
            >
              {/* Card top accent bar */}
              <div className="h-1 bg-gradient-to-r from-[#CF2030] to-[#E8475A]" />

              <div className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-[#CF2030]/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-[#CF2030]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--nm-text-primary)' }}>{chapter.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>ID: {chapter.chapter_id}</p>
                    </div>
                  </div>
                  <Badge
                    className={`shrink-0 text-[11px] ${statusColor(chapter.status)}`}
                  >
                    {chapter.status || 'Inactive'}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm" style={{ color: 'var(--nm-text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
                    <span>{chapter.member_count ?? 0} Members</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
                    <span className="truncate">Admin: {chapter.admin_mobile || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
                    <span>
                      {chapter.last_meeting_date
                        ? `Last meeting: ${formatDate(chapter.last_meeting_date)}`
                        : 'No meetings yet'}
                    </span>
                  </div>

                  {(chapter.region || chapter.city || chapter.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" style={{ color: 'var(--nm-text-muted)' }} />
                      <span className="truncate">
                        {[chapter.city, chapter.state, chapter.region].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    data-testid={`edit-chapter-btn-${chapter.chapter_id}`}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEdit(chapter)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit Credentials
                  </Button>
                  <Button
                    data-testid={`delete-chapter-btn-${chapter.chapter_id}`}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => onDelete(chapter.chapter_id, chapter.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
