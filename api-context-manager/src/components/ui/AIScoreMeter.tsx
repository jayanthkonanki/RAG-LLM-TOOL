'use client';
import { cn, getReadabilityColor, getReadabilityLabel } from '@/lib/utils';

interface AIScoreMeterProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

export function AIScoreMeter({ score, className, showLabel = true }: AIScoreMeterProps) {
  const colorClass = getReadabilityColor(score);
  const label = getReadabilityLabel(score);

  // segment fill
  const segments = 10;
  const filled = Math.round((score / 100) * segments);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">AI Readability</span>
          <span className={cn('text-[11px] font-semibold', colorClass)}>
            {score}/100 · {label}
          </span>
        </div>
      )}
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-sm transition-all',
              i < filled
                ? score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-yellow-400' : score >= 40 ? 'bg-orange-400' : 'bg-red-400'
                : 'bg-zinc-700'
            )}
          />
        ))}
      </div>
    </div>
  );
}
