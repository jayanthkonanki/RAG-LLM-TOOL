'use client';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { cn } from '@/lib/utils';
import { Bot, Zap, CheckCircle2, XCircle, AlertTriangle, Tag, BookOpen, Target, Ban, ArrowRight } from 'lucide-react';

export function AIContextTab() {
  const activeEndpointId = useUIStore((s) => s.activeEndpointId);
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));

  if (!endpoint) return null;

  const ctx = endpoint.agentContext;
  const labels = endpoint.agentContextLabels;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/15 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/70 mb-1">Tool Name</p>
            <code className="text-base font-mono font-semibold text-blue-300">{ctx.toolName}</code>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Natural Language Description</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{ctx.naturalLanguageDescription}</p>
        </div>
      </div>

      {/* When to use / not */}
      <div className="grid grid-cols-2 gap-4">
        <WhenCard
          icon={CheckCircle2}
          label="When to Use"
          text={ctx.whenToUse}
          positive
        />
        <WhenCard
          icon={Ban}
          label="When NOT to Use"
          text={ctx.whenNotToUse}
          positive={false}
        />
      </div>

      {/* Usage guidance */}
      <Section icon={BookOpen} label="Usage Guidance" color="text-purple-400">
        <p className="text-sm text-zinc-400 leading-relaxed">{ctx.usageGuidance}</p>
      </Section>

      {/* Business purpose */}
      <Section icon={Target} label="Business Purpose" color="text-emerald-400">
        <p className="text-sm text-zinc-400 leading-relaxed">{labels.businessPurpose}</p>
      </Section>

      {/* Execution intent + outcome */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Execution Intent" value={labels.executionIntent} />
        <InfoCard label="Expected Outcome" value={labels.expectedOutcome} />
        <InfoCard label="Required Conditions" value={labels.requiredConditions} />
        <InfoCard label="Side Effects" value={labels.sideEffects || 'None'} />
      </div>

      {/* Execution examples */}
      <Section icon={Zap} label="Execution Examples" color="text-yellow-400">
        <div className="space-y-2">
          {ctx.executionExamples.map((ex, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 overflow-x-auto">
              <code className="text-xs font-mono text-emerald-300">{ex}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* Failure scenarios */}
      <Section icon={XCircle} label="Failure Scenarios" color="text-red-400">
        <ul className="space-y-1">
          {ctx.failureScenarios.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
              <XCircle className="w-3.5 h-3.5 text-red-400/60 mt-0.5 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      {/* Operational warnings */}
      {ctx.operationalWarnings.length > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Operational Warnings
          </p>
          {ctx.operationalWarnings.map((w, i) => (
            <p key={i} className="text-xs text-orange-300/80 leading-relaxed flex items-start gap-2">
              <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-orange-400/50" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Semantic tags */}
      <Section icon={Tag} label="Semantic Tags" color="text-zinc-400">
        <div className="flex flex-wrap gap-1.5">
          {ctx.semanticTags.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
              #{t}
            </span>
          ))}
        </div>
      </Section>

      {/* Dependencies */}
      <Section icon={ArrowRight} label="Existing Dependencies" color="text-zinc-400">
        <ul className="space-y-1">
          {ctx.existingDependencies.map((d, i) => (
            <li key={i} className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </Section>

      {/* Exec order */}
      {ctx.recommendedExecutionOrder !== null && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-900">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-zinc-400">Recommended execution order:</span>
          <span className="text-sm font-semibold text-purple-400">Step {ctx.recommendedExecutionOrder}</span>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, label, color, children }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className={cn('text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5', color)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      {children}
    </div>
  );
}

function WhenCard({ icon: Icon, label, text, positive }: { icon: React.ComponentType<{ className?: string }>; label: string; text: string; positive: boolean }) {
  return (
    <div className={cn('rounded-xl p-4 border space-y-1.5', positive ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15')}>
      <p className={cn('text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5', positive ? 'text-emerald-400' : 'text-red-400')}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xs text-zinc-300 leading-relaxed">{value}</p>
    </div>
  );
}
