import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  LayoutDashboard, Wallet, CheckCircle, User, LogOut, Menu, X, ClipboardList
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { toTitleCase } from '../utils/formatDate';

const navItems = [
  { label: 'Home', mobileLabel: 'Home', path: '/member/dashboard', icon: LayoutDashboard },
  { label: 'Payments', mobileLabel: 'Pay', path: '/member/payments', icon: Wallet },
  { label: 'Completed', mobileLabel: 'Done', path: '/member/history', icon: CheckCircle },
  { label: 'Attendance', mobileLabel: 'Attend', path: '/member/attendance', icon: ClipboardList },
  { label: 'Profile', mobileLabel: 'Me', path: '/member/profile', icon: User },
];

export default function MemberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const memberName = localStorage.getItem('member_name') || 'Member';
  const chapterName = localStorage.getItem('chapter_name') || '';

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNavClick = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nm-bg)' }}>
      {/* Desktop sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--nm-overlay)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 nm-sidebar flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          hidden lg:flex
        `}
      >
        {/* Logo area */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--nm-border)' }}>
          <div className="flex items-center gap-3">
            <img
              src="/icons/aasaan-logo.png"
              alt="Aasaan App"
              className="h-9 w-auto rounded-lg"
            />
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--nm-text-primary)' }}>Member Portal</h1>
              {chapterName && (
                <p className="text-[11px] truncate max-w-[160px]" style={{ color: 'var(--nm-text-muted)' }}>{chapterName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? 'nm-sidebar-item-active'
                    : 'nm-sidebar-item'
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Member info + Theme + Logout */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(memberName)}</p>
              <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Member</p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="shrink-0"
                style={{ color: 'var(--nm-text-muted)' }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden nm-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/icons/aasaan-logo.png"
            alt="Aasaan App"
            className="h-7 w-auto rounded"
          />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Member Portal</span>
            {chapterName && (
              <p className="text-[10px] truncate max-w-[160px]" style={{ color: 'var(--nm-text-muted)' }}>{chapterName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8"
            style={{ color: 'var(--nm-text-muted)' }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 nm-header z-30 safe-area-bottom" style={{ borderTop: '1px solid var(--nm-border)' }}>
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl
                  transition-all min-w-[48px]
                  ${active
                    ? 'nm-pressed'
                    : ''
                  }
                `}
                style={{ color: active ? 'var(--nm-accent)' : 'var(--nm-text-muted)' }}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
                  {item.mobileLabel || item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
