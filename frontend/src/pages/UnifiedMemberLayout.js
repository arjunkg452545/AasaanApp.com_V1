// MAX 300 LINES — Unified layout for ALL members (regular + role holders)
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Home, Wallet, ClipboardList, User, LogOut, Menu, X, Shield,
  Users, Settings, MessageCircle, UserPlus, LayoutGrid, Bell,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { toTitleCase } from '../utils/formatDate';
import api from '../utils/api';

const ROLE_PERMISSIONS = {
  president:            { members: true, meetings: true, fundHub: true, visitors: true, reminders: true, settings: true, notifications: true },
  vice_president:       { members: true, meetings: true, fundHub: true, visitors: true, reminders: true, settings: true, notifications: true },
  secretary:            { members: false, meetings: true, fundHub: true, visitors: true, reminders: true, settings: false, notifications: true },
  treasurer:            { members: false, meetings: false, fundHub: true, visitors: false, reminders: true, settings: false, notifications: true },
  secretary_treasurer:  { members: false, meetings: true, fundHub: true, visitors: true, reminders: true, settings: false, notifications: true },
  lvh:                  { members: false, meetings: true, fundHub: true, visitors: true, reminders: true, settings: false, notifications: true },
  member:               {},
};

const personalNav = [
  { label: 'Home', mobileLabel: 'Home', path: '/app/home', icon: Home },
  { label: 'My Payments', mobileLabel: 'Pay', path: '/app/my-payments', icon: Wallet },
  { label: 'My Attendance', mobileLabel: 'Attend', path: '/app/my-attendance', icon: ClipboardList },
  { label: 'My Profile', mobileLabel: 'Profile', path: '/app/my-profile', icon: User },
];

const adminNavConfig = [
  { label: 'Members', path: '/app/members', icon: Users, perm: 'members' },
  { label: 'Meeting Hub', path: '/app/meetings', icon: ClipboardList, perm: 'meetings' },
  { label: 'Fund Hub', path: '/app/fund-hub', icon: Wallet, perm: 'fundHub' },
  { label: 'Visitors', path: '/app/visitors', icon: UserPlus, perm: 'visitors' },
  { label: 'Reminders', path: '/app/reminders', icon: MessageCircle, perm: 'reminders' },
  { label: 'Notifications', path: '/app/send-notification', icon: Bell, perm: 'notifications' },
  { label: 'Chapter Settings', path: '/app/settings', icon: Settings, perm: 'settings' },
];

function formatRole(role) {
  if (!role || role === 'member') return '';
  if (role === 'secretary_treasurer') return 'Secretary/Treasurer';
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function UnifiedMemberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminSheetOpen, setAdminSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const sheetRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Poll unread notifications every 60s
  useEffect(() => {
    const fetchUnread = () => {
      api.get('/member/notifications/unread-count').then(r => setUnreadCount(r.data?.count || 0)).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetClosing(true);
    setTimeout(() => { setAdminSheetOpen(false); setSheetClosing(false); }, 200);
  }, []);

  const onSheetTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const onSheetTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    touchDeltaY.current = delta;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const onSheetTouchEnd = useCallback(() => {
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (touchDeltaY.current > 100) closeSheet();
  }, [closeSheet]);

  const memberName = localStorage.getItem('member_name') || 'Member';
  const chapterName = localStorage.getItem('chapter_name') || '';
  const chapterRole = localStorage.getItem('chapter_role') || 'member';
  const perms = ROLE_PERMISSIONS[chapterRole] || {};
  const isRoleHolder = chapterRole !== 'member' && Object.keys(perms).length > 0;
  const roleLabel = formatRole(chapterRole);

  const adminNav = useMemo(() => {
    if (!isRoleHolder) return [];
    return adminNavConfig.filter(item => perms[item.perm]);
  }, [isRoleHolder, perms]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const handleNav = (path) => { navigate(path); setSidebarOpen(false); setAdminSheetOpen(false); };
  const handleLogout = () => { localStorage.clear(); toast.success('Logged out'); navigate('/'); };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--nm-bg)' }}>
      {/* Mobile overlay for sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'var(--nm-overlay)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== SIDEBAR (desktop always, mobile slide-in) ===== */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 nm-sidebar flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-9 w-auto rounded-lg" />
              <div>
                <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(memberName)}</h1>
                {chapterName && <p className="text-[10px] truncate max-w-[150px]" style={{ color: 'var(--nm-text-muted)' }}>{chapterName}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { navigate('/app/notifications'); setSidebarOpen(false); }} className="relative p-1 rounded-lg nm-btn" style={{ color: 'var(--nm-text-muted)' }}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: '#CF2030' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg nm-btn" style={{ color: 'var(--nm-text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          {/* My Account section */}
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--nm-text-muted)' }}>My Account</p>
          {personalNav.map(item => <NavButton key={item.path} item={item} active={isActive(item.path)} onClick={() => handleNav(item.path)} />)}

          {/* Chapter Admin section */}
          {isRoleHolder && adminNav.length > 0 && (
            <>
              <div className="my-2" style={{ borderTop: '1px solid var(--nm-border)' }} />
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--nm-text-muted)' }}>Chapter Admin</p>
              {adminNav.map(item => <NavButton key={item.path} item={item} active={isActive(item.path)} onClick={() => handleNav(item.path)} />)}
            </>
          )}
        </nav>

        {/* Bottom: role badge + theme + logout */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--nm-text-primary)' }}>{toTitleCase(memberName)}</p>
              {roleLabel ? (
                <Badge variant="outline" className="text-[10px] mt-0.5" style={{ color: 'var(--nm-text-secondary)', borderColor: 'var(--nm-border)' }}>
                  <Shield className="h-3 w-3 mr-1" />{roleLabel}
                </Badge>
              ) : (
                <p className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>Member</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0" style={{ color: 'var(--nm-text-muted)' }}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden nm-header px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg nm-btn" style={{ color: 'var(--nm-text-secondary)' }}><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2 flex-1">
            <img src="/icons/aasaan-logo.png" alt="Aasaan App" className="h-7 w-auto rounded" />
            <div className="min-w-0">
              <span className="text-sm font-semibold block truncate" style={{ color: 'var(--nm-text-primary)' }}>{chapterName || 'Aasaan App'}</span>
              {roleLabel && <span className="text-[10px]" style={{ color: 'var(--nm-text-muted)' }}>{roleLabel}</span>}
            </div>
          </div>
          <button onClick={() => navigate('/app/notifications')} className="relative p-2 rounded-lg nm-btn" style={{ color: 'var(--nm-text-secondary)' }}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: '#CF2030' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8" style={{ color: 'var(--nm-text-muted)' }}><LogOut className="h-4 w-4" /></Button>
        </div>

        <main className="flex-1 pb-20 lg:pb-0 overflow-x-hidden" style={{ maxWidth: '100vw' }}>
          <Outlet />
        </main>

        {/* ===== MOBILE BOTTOM NAV ===== */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 nm-header z-30 safe-area-bottom" style={{ borderTop: '1px solid var(--nm-border)' }}>
          <div className="flex items-center justify-around h-16">
            <BottomTab icon={Home} label="Home" active={isActive('/app/home')} onClick={() => handleNav('/app/home')} />
            <BottomTab icon={Wallet} label="Pay" active={isActive('/app/my-payments')} onClick={() => handleNav('/app/my-payments')} />
            {isRoleHolder && (
              <BottomTab icon={LayoutGrid} label="Admin" active={adminSheetOpen} onClick={() => setAdminSheetOpen(true)} accent />
            )}
            <BottomTab icon={ClipboardList} label="Attend" active={isActive('/app/my-attendance')} onClick={() => handleNav('/app/my-attendance')} />
            <BottomTab icon={User} label="Profile" active={isActive('/app/my-profile')} onClick={() => handleNav('/app/my-profile')} />
          </div>
        </nav>
      </div>

      {/* ===== ADMIN BOTTOM SHEET (mobile) ===== */}
      {adminSheetOpen && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'var(--nm-overlay)' }} onClick={closeSheet} />
          <div
            ref={sheetRef}
            className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-2xl safe-area-bottom ${sheetClosing ? 'animate-out-slide-bottom' : 'animate-in slide-in-from-bottom'} duration-200`}
            style={{ background: 'var(--nm-surface)', borderTop: '1px solid var(--nm-border)' }}
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--nm-text-muted)', opacity: 0.4 }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--nm-text-primary)' }}>Chapter Admin</p>
              <button onClick={closeSheet} className="p-1 rounded-lg" style={{ color: 'var(--nm-text-muted)' }}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-6">
              {adminNav.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => handleNav(item.path)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors" style={{ background: isActive(item.path) ? 'var(--nm-accent-bg, rgba(207,32,48,0.08))' : 'transparent' }}>
                    <Icon className="h-6 w-6" style={{ color: isActive(item.path) ? '#CF2030' : 'var(--nm-text-secondary)' }} />
                    <span className="text-[11px] font-medium" style={{ color: isActive(item.path) ? '#CF2030' : 'var(--nm-text-secondary)' }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'nm-sidebar-item-active' : 'nm-sidebar-item'}`}>
      <Icon className="h-5 w-5 shrink-0" />{item.label}
    </button>
  );
}

function BottomTab({ icon: Icon, label, active, onClick, accent }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[48px] ${active ? 'nm-pressed' : ''}`} style={{ color: active ? 'var(--nm-accent)' : accent ? '#CF2030' : 'var(--nm-text-muted)' }}>
      <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
      <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
    </button>
  );
}
