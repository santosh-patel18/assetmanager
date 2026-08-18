'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  badge?: { text: string; variant: 'destructive' | 'warning' | 'success' };
  delay?: number;
  className?: string;
}

function useAnimatedCounter(target: number, duration: number = 800, delay: number = 0) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (target === 0) { setCount(0); return; }

    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, delay]);

  return count;
}

export function StatCard({ label, value, icon: Icon, gradient, badge, delay = 0, className }: StatCardProps) {
  const animatedValue = useAnimatedCounter(value, 800, delay);

  return (
    <Card
      className={cn('kpi-card overflow-hidden opacity-0 animate-count-up', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          {badge && (
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.text}
            </Badge>
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight tabular-nums">
          {animatedValue}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
