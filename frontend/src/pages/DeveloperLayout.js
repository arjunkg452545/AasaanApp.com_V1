import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, CreditCard, Settings,
  LogOut, Menu, X, Code2
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const navItems = [
  { label: 'Dashboard', path: '/developer/dashboard', icon: LayoutDashboard },
  { label: 'Executive Directors', path: '/developer/eds', icon: Users },
  { label: 'Subscriptions', path: '/developer/subscriptions', icon: CreditCard },
  { label: 'Settings', path: '/developer/settings', icon: Settings },
];

export default function DeveloperLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const devName = localStorage.getItem('dev_name') || 'Developer';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('dev_email');
    localStorage.removeItem('dev_name');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNavClick = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--nm-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'var(--nm-overlay)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 nm-sidebar flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo area */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/icons/aasaan-logo.png"
                alt="Aasaan App"
                className="h-9 w-auto rounded-lg"
              />
              <div>
                <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--nm-text-primary)' }}>Developer Console</h1>
                <Badge
                  variant="outline"
                  className="text-[10px] mt-1"
                  style={{ color: 'var(--nm-text-secondary)', borderColor: 'var(--nm-border)' }}
                >
                  <Code2 className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg nm-btn"
              style={{ color: 'var(--nm-text-muted)' }}
            >
              <X className="h-5 w-5" />
            </button>
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

        {/* Bottom: Dev info + Theme + Logout */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{devName}</p>
              <p className="text-xs" style={{ color: 'var(--nm-text-muted)' }}>Developer</p>
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden nm-header px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg nm-btn"
            style={{ color: 'var(--nm-text-secondary)' }}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img
              src="/icons/aasaan-logo.png"
              alt="Aasaan App"
              className="h-7 w-auto rounded"
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Developer Console</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
