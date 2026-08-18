'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Package, ArrowLeftRight, CalendarDays,
  Wrench, ClipboardCheck, BarChart3, Activity, Bell, LogOut, ChevronLeft,
  ChevronRight, Menu, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const navSections = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
      { label: 'Organization', href: '/org', icon: Building2, roles: ['admin', 'department_head'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Assets', href: '/assets', icon: Package, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
      { label: 'Allocations', href: '/allocations', icon: ArrowLeftRight, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
      { label: 'Bookings', href: '/bookings', icon: CalendarDays, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
      { label: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Audits', href: '/audits', icon: ClipboardCheck, roles: ['admin', 'asset_manager'] },
      { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'asset_manager'] },
      { label: 'Activity', href: '/activity', icon: Activity, roles: ['admin', 'asset_manager', 'department_head'] },
      { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close mobile on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarContent = (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card flex flex-col',
        'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        // Desktop
        'hidden md:flex',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-indigo-500/25">
            AF
          </div>
          {!collapsed && (
            <span className="font-bold text-lg gradient-text">AssetFlow</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <TooltipProvider delayDuration={0}>
          {navSections.map((section) => {
            const filteredItems = section.items.filter(item =>
              item.roles.includes(user?.role || 'employee')
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.label} className="mb-4">
                {!collapsed && (
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2">
                    {section.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                    const linkContent = (
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary nav-active-indicator'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );

                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {linkContent}
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          linkContent
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* User & collapse */}
      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-9 w-9"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          {!collapsed && (
            <Button variant="ghost" size="sm" onClick={logout} className="flex-1 justify-start gap-2 text-muted-foreground hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </aside>
  );

  // Mobile sidebar
  const mobileSidebar = (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-[280px] border-r border-border bg-card flex flex-col md:hidden animate-slide-in">
            {/* Logo + close */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  AF
                </div>
                <span className="font-bold text-lg gradient-text">AssetFlow</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {navSections.map((section) => {
                const filteredItems = section.items.filter(item =>
                  item.roles.includes(user?.role || 'employee')
                );
                if (filteredItems.length === 0) return null;

                return (
                  <div key={section.label} className="mb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2">
                      {section.label}
                    </p>
                    <ul className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                isActive
                                  ? 'bg-primary/10 text-primary nav-active-indicator'
                                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                              )}
                            >
                              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>

            {/* User + Logout */}
            <div className="border-t border-border p-3">
              {user && (
                <div className="mb-3 px-2">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2 text-muted-foreground hover:text-red-400">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </aside>
        </>
      )}
    </>
  );

  return (
    <>
      {sidebarContent}
      {mobileSidebar}
    </>
  );
}

/** Export collapsed state for layout margin calculation */
export { useState as useSidebarState };
