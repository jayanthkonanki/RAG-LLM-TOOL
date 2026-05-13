import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { HttpMethod, RiskLevel, DataSensitivity } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string; border: string; badge: string }> = {
  GET:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400',  border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300' },
  POST:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',     border: 'border-blue-500/30',    badge: 'bg-blue-500/20 text-blue-300' },
  PUT:    { bg: 'bg-orange-500/10',  text: 'text-orange-400',   border: 'border-orange-500/30',  badge: 'bg-orange-500/20 text-orange-300' },
  PATCH:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',   border: 'border-purple-500/30',  badge: 'bg-purple-500/20 text-purple-300' },
  DELETE: { bg: 'bg-red-500/10',     text: 'text-red-400',      border: 'border-red-500/30',     badge: 'bg-red-500/20 text-red-300' },
};

export const RISK_COLORS: Record<RiskLevel, { text: string; bg: string; dot: string }> = {
  safe:     { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  low:      { text: 'text-green-400',   bg: 'bg-green-500/10',   dot: 'bg-green-400' },
  medium:   { text: 'text-yellow-400',  bg: 'bg-yellow-500/10',  dot: 'bg-yellow-400' },
  high:     { text: 'text-orange-400',  bg: 'bg-orange-500/10',  dot: 'bg-orange-400' },
  critical: { text: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-400' },
};

export const SENSITIVITY_COLORS: Record<DataSensitivity, { text: string; bg: string }> = {
  public:       { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  internal:     { text: 'text-blue-400',    bg: 'bg-blue-500/10' },
  confidential: { text: 'text-orange-400',  bg: 'bg-orange-500/10' },
  restricted:   { text: 'text-red-400',     bg: 'bg-red-500/10' },
};

export function getReadabilityColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function getReadabilityLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
