'use client';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { MethodBadge } from '@/components/ui/MethodBadge';
import { AIScoreMeter } from '@/components/ui/AIScoreMeter';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { SENSITIVITY_COLORS } from '@/lib/utils';
import {
  X, Tag, Link2, Zap, AlertTriangle, CheckCircle2,
  XCircle, Clock, Globe, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function RightPanel() {
  const { activeEndpointId, rightPanelOpen } = useUIStore();
  const endpoints = useEndpointsStore((s) => s.endpoints);
  const endpoint = endpoints.find((e) => e.id === activeEndpointId);

  if (!rightPanelOpen || !endpoint) return null;

  const sensColors = SENSITIVITY_COLORS[endpoint.agentContextLabels.dataSensitivity];

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-zinc-950 border-l border-zinc-800/60 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Context</span>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col gap-5">
        {/* Method + Path */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MethodBadge method={endpoint.method} size="sm" />
          </div>
          <p className="text-[11px] font-mono text-zinc-400 break-all">{endpoint.path}</p>
          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{endpoint.shortDescription}</p>
        </div>

        {/* AI Score */}
        <AIScoreMeter score={endpoint.aiReadabilityScore} />

        {/* Risk */}
        <Section label="Risk Level">
          <RiskBadge level={endpoint.riskLevel} />
        </Section>

        {/* Data Sensitivity */}
        <Section label="Data Sensitivity">
          <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium capitalize', sensColors.bg, sensColors.text)}>
            {endpoint.agentContextLabels.dataSensitivity}
          </span>
        </Section>

        {/* Tags */}
        <Section label="Tags">
          <div className="flex flex-wrap gap-1">
            {endpoint.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                {t}
              </span>
            ))}
          </div>
        </Section>

        {/* Flags */}
        <Section label="Flags">
          <div className="flex flex-col gap-1.5">
            <Flag
              icon={endpoint.agentContextLabels.idempotent ? CheckCircle2 : XCircle}
              label="Idempotent"
              value={endpoint.agentContextLabels.idempotent}
            />
            <Flag
              icon={endpoint.agentContextLabels.retrySafe ? CheckCircle2 : XCircle}
              label="Retry Safe"
              value={endpoint.agentContextLabels.retrySafe}
            />
          </div>
        </Section>

        {/* Business Domain */}
        <Section label="Business Domain">
          <span className="text-[11px] text-blue-400 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {endpoint.agentContext.businessDomain}
          </span>
        </Section>

        {/* Category */}
        <Section label="Category">
          <span className="text-[11px] text-zinc-400 capitalize">
            {endpoint.category.replace(/-/g, ' ')}
          </span>
        </Section>

        {/* Rate Limit */}
        <Section label="Rate Limit">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {endpoint.agentContextLabels.rateLimitAwareness}
          </span>
        </Section>

        {/* Auth */}
        <Section label="Authentication">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-zinc-600" />
            {endpoint.agentContextLabels.requiredAuthentication}
          </span>
        </Section>

        {/* Dependencies */}
        {endpoint.agentContextLabels.dependencies.length > 0 && (
          <Section label="Dependencies">
            <div className="flex flex-col gap-1">
              {endpoint.agentContextLabels.dependencies.map((dep) => (
                <span key={dep} className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-zinc-700 shrink-0" />
                  {dep}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Execution Order */}
        {endpoint.agentContext.recommendedExecutionOrder !== null && (
          <Section label="Exec Order">
            <span className="text-[11px] text-purple-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Step {endpoint.agentContext.recommendedExecutionOrder}
            </span>
          </Section>
        )}

        {/* Unsafe Warning */}
        {endpoint.agentContextLabels.unsafeOperationsWarning && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-orange-300/80 leading-relaxed">
                {endpoint.agentContextLabels.unsafeOperationsWarning}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">{label}</span>
      {children}
    </div>
  );
}

function Flag({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('w-3.5 h-3.5', value ? 'text-emerald-400' : 'text-zinc-600')} />
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={cn('text-[10px] ml-auto font-medium', value ? 'text-emerald-400' : 'text-zinc-600')}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}
