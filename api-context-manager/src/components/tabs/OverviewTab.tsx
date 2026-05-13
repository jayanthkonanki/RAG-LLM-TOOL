'use client';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { MethodBadge } from '@/components/ui/MethodBadge';
import { AIScoreMeter } from '@/components/ui/AIScoreMeter';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Calendar, Tag, CheckCircle2, XCircle, Globe, Zap, AlertTriangle } from 'lucide-react';

export function OverviewTab() {
  const activeEndpointId = useUIStore((s) => s.activeEndpointId);
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));

  if (!endpoint) return null;

  const labels = endpoint.agentContextLabels;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <MethodBadge method={endpoint.method} size="md" />
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{endpoint.name}</h1>
          <p className="text-sm font-mono text-zinc-500 mt-0.5">{endpoint.path}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <RiskBadge level={endpoint.riskLevel} />
        </div>
      </div>

      {/* AI Score prominent */}
      <AIScoreMeter score={endpoint.aiReadabilityScore} className="max-w-md" />

      {/* Description */}
      <div className="space-y-1">
        <Label>Short Description</Label>
        <p className="text-sm text-zinc-300">{endpoint.shortDescription}</p>
      </div>
      <div className="space-y-1">
        <Label>Operational Description</Label>
        <p className="text-sm text-zinc-400 leading-relaxed">{endpoint.longDescription}</p>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-4">
        <MetaCard label="Category" value={endpoint.category.replace(/-/g, ' ')} />
        <MetaCard label="Business Domain" value={endpoint.agentContext.businessDomain} icon={Globe} />
        <MetaCard label="Rate Limit" value={labels.rateLimitAwareness} />
        <MetaCard label="Authentication" value={labels.requiredAuthentication} />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {endpoint.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700/50 text-zinc-400">
              <Tag className="w-3 h-3 text-zinc-600" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Flags */}
      <div className="grid grid-cols-2 gap-3">
        <FlagCard label="Idempotent" value={labels.idempotent} />
        <FlagCard label="Retry Safe" value={labels.retrySafe} />
      </div>

      {/* Side effects */}
      {labels.sideEffects && (
        <div className="space-y-1">
          <Label>Side Effects</Label>
          <p className="text-sm text-zinc-400">{labels.sideEffects}</p>
        </div>
      )}

      {/* Unsafe warning */}
      {labels.unsafeOperationsWarning && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-orange-300 mb-1">Unsafe Operations Warning</p>
            <p className="text-xs text-orange-300/70 leading-relaxed">{labels.unsafeOperationsWarning}</p>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-4 text-[11px] text-zinc-700 pt-2 border-t border-zinc-800/60">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created {formatDate(endpoint.createdAt)}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Updated {formatDate(endpoint.updatedAt)}</span>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{children}</p>;
}

function MetaCard({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-zinc-300 capitalize flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-zinc-600" />}
        {value}
      </p>
    </div>
  );
}

function FlagCard({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border', value ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800')}>
      {value ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-zinc-600" />}
      <div>
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        <p className={cn('text-[10px]', value ? 'text-emerald-400' : 'text-zinc-600')}>{value ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
