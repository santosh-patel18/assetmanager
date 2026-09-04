'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LocationNode {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
  status: string;
  children?: LocationNode[];
  _count?: { assets: number };
}

interface LocationTreeSelectProps {
  locations: LocationNode[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

// Build tree from flat list
function buildTree(items: LocationNode[], parentId: string | null = null): LocationNode[] {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}

// Find location name by ID (walk flat list)
function findLocationById(items: LocationNode[], id: string): LocationNode | undefined {
  return items.find(item => item.id === id);
}

// Build breadcrumb path for a location
function buildPath(items: LocationNode[], id: string): string {
  const parts: string[] = [];
  let current: LocationNode | undefined = findLocationById(items, id);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? findLocationById(items, current.parentId) : undefined;
  }
  return parts.join(' → ');
}

// Type colors
const typeColors: Record<string, string> = {
  HQ: 'from-indigo-500 to-indigo-600',
  Region: 'from-blue-500 to-blue-600',
  City: 'from-cyan-500 to-cyan-600',
  Building: 'from-emerald-500 to-emerald-600',
  Floor: 'from-amber-500 to-amber-600',
  Room: 'from-purple-500 to-purple-600',
  Zone: 'from-rose-500 to-rose-600',
};

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpand,
}: {
  node: LocationNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'hover:bg-muted text-foreground',
          depth > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 hover:bg-accent rounded"
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4.5" />
        )}
        <div className={`h-5 w-5 rounded bg-gradient-to-br ${typeColors[node.type] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white flex-shrink-0`}>
          <MapPin className="h-3 w-3" />
        </div>
        <span className="truncate flex-1">{node.name}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{node.code}</span>
        {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LocationTreeSelect({
  locations,
  value,
  onChange,
  placeholder = 'Select location...',
  className,
  allowClear = true,
}: LocationTreeSelectProps) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => buildTree(locations), [locations]);

  // Auto-expand parents of selected value
  useEffect(() => {
    if (value) {
      const parents = new Set<string>();
      let current = findLocationById(locations, value);
      while (current?.parentId) {
        parents.add(current.parentId);
        current = findLocationById(locations, current.parentId);
      }
      setExpandedIds(prev => {
        const next = new Set(Array.from(prev));
        parents.forEach(p => next.add(p));
        return next;
      });
    }
  }, [value, locations]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onChange(id === value ? null : id);
    setOpen(false);
  };

  const selectedLocation = value ? findLocationById(locations, value) : null;
  const selectedPath = value ? buildPath(locations, value) : null;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !selectedLocation && 'text-muted-foreground'
        )}
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedLocation ? (
            <>
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{selectedPath}</span>
            </>
          ) : (
            placeholder
          )}
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
      </button>

      {/* Clear button */}
      {allowClear && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
        >
          ×
        </Button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-[300px] overflow-y-auto rounded-md border bg-popover shadow-lg animate-scale-in">
          {tree.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No locations found</p>
          ) : (
            <div className="py-1">
              {tree.map(node => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={value}
                  onSelect={handleSelect}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { typeColors as locationTypeColors, buildPath as buildLocationPath };
