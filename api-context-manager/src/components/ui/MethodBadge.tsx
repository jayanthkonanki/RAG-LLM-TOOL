'use client';
import { cn } from '@/lib/utils';
import type { HttpMethod } from '@/types';
import { METHOD_COLORS } from '@/lib/utils';

interface MethodBadgeProps {
  method: HttpMethod;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function MethodBadge({ method, size = 'sm', className }: MethodBadgeProps) {
  const colors = METHOD_COLORS[method];
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0 font-bold tracking-wider',
    sm: 'text-[11px] px-2 py-0.5 font-bold tracking-wider',
    md: 'text-xs px-2.5 py-1 font-bold tracking-wider',
  };
  return (
    <span className={cn('rounded font-mono uppercase', colors.badge, sizeClasses[size], className)}>
      {method}
    </span>
  );
}
