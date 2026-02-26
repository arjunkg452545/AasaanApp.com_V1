import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  LayoutDashboard, ShieldCheck, Users, LogOut, Menu, X, Calculator,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const navItems = [
  { label: 'Dashboard', path: '/accountant/dashboard', icon: LayoutDashboard },
  { label: 'Approvals', path: '/accountant/approvals', icon: ShieldCheck },
];

export default function AccountantLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const accountantName = localStorage.getItem('accountant_name') || 'Accountant';

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out');
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
        <div className="p-4" style={{ borderBottom: '1px solid var(--nm-border)' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg nm-pressed flex items-center justify-center" style={{ color: 'var(--nm-accent)' }}>
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--nm-text-primary)' }}>Accountant Panel</h2>
              <p className="text-xs truncate" style={{ color: 'var(--nm-text-muted)' }}>{accountantName}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1.5">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive(item.path)
                  ? 'nm-sidebar-item-active'
                  : 'nm-sidebar-item'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: Theme + Logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm nm-sidebar-item transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <div className="lg:hidden nm-header px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="nm-btn p-2 rounded-lg">
            <Menu className="h-5 w-5" style={{ color: 'var(--nm-text-secondary)' }} />
          </button>
          <h1 className="text-sm font-bold" style={{ color: 'var(--nm-text-primary)' }}>Accountant Panel</h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={handleLogout} className="p-2">
              <LogOut className="h-5 w-5" style={{ color: 'var(--nm-text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
