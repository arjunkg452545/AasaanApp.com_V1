import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  LayoutDashboard, Wallet, History, User, LogOut, Menu, X
} from 'lucide-react';

const navItems = [
  { label: 'Home', path: '/member/dashboard', icon: LayoutDashboard },
  { label: 'Payments', path: '/member/payments', icon: Wallet },
  { label: 'History', path: '/member/history', icon: History },
  { label: 'Profile', path: '/member/profile', icon: User },
];

export default function MemberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const memberName = localStorage.getItem('member_name') || 'Member';
  const chapterName = localStorage.getItem('chapter_name') || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('member_id');
    localStorage.removeItem('member_name');
    localStorage.removeItem('chapter_id');
    localStorage.removeItem('chapter_name');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNavClick = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Desktop sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar - hidden on mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          hidden lg:flex
        `}
      >
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src="/icons/aasaan-logo.png"
              alt="Aasaan App"
              className="h-9 w-auto rounded-lg"
            />
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900">Member Portal</h1>
              {chapterName && (
                <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{chapterName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${active
                    ? 'bg-[#CF2030]/10 text-[#CF2030]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Member info + Logout */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{memberName}</p>
              <p className="text-xs text-slate-500">Member</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/icons/aasaan-logo.png"
            alt="Aasaan App"
            className="h-7 w-auto rounded"
          />
          <div>
            <span className="text-sm font-semibold text-slate-900">Member Portal</span>
            {chapterName && (
              <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{chapterName}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content */}
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg
                  transition-colors min-w-[60px]
                  ${active
                    ? 'text-[#CF2030]'
                    : 'text-slate-400 hover:text-slate-600'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
