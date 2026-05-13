'use client';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';
import { RISK_COLORS } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react';

const ICONS: Record<RiskLevel, React.ComponentType<{ className?: string }>> = {
  safe: ShieldCheck,
  low: Shield,
  medium: AlertTriangle,
  high: ShieldAlert,
  critical: ShieldX,
};

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
  className?: string;
}

export function RiskBadge({ level, showIcon = true, className }: RiskBadgeProps) {
  const colors = RISK_COLORS[level];
  const Icon = ICONS[level];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium capitalize', colors.bg, colors.text, className)}>
      {showIcon && <Icon className="w-3 h-3" />}
      {level}
    </span>
  );
}
