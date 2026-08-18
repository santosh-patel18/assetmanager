'use client';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { ToastProvider } from '@/components/ui/toast-notification';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Listen for sidebar collapse state changes via DOM observation
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const sidebar = document.querySelector('aside.fixed');
      if (sidebar) {
        const width = sidebar.getBoundingClientRect().width;
        setSidebarCollapsed(width < 100);
      }
    });

    const timer = setTimeout(() => {
      const sidebar = document.querySelector('aside.fixed');
      if (sidebar) {
        observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 animate-pulse">
              AF
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium gradient-text">AssetFlow</p>
            <p className="text-muted-foreground text-xs">Loading your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={cn(
        'flex-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        // Desktop: margin matches sidebar width
        'md:ml-[260px]',
        sidebarCollapsed && 'md:ml-[68px]',
        // Mobile: no margin (sidebar is overlay)
        'ml-0'
      )}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ToastProvider>
          <DashboardContent>{children}</DashboardContent>
        </ToastProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
