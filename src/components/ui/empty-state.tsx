import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-2xl scale-150" />
        <div className="relative h-16 w-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center animate-float">
          <Icon className="h-8 w-8 text-muted-foreground/40" />
        </div>
      </div>
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-6 gap-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}
