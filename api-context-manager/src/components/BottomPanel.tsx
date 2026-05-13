'use client';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { cn } from '@/lib/utils';
import { Bot, FileCode, Eye, StickyNote } from 'lucide-react';
import type { BottomTabId } from '@/types';

const TABS: { id: BottomTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'context-preview', label: 'Context Preview', icon: Eye },
  { id: 'json-preview', label: 'JSON Preview', icon: FileCode },
  { id: 'agent-prompt', label: 'Agent Prompt', icon: Bot },
];

export function BottomPanel() {
  const { bottomPanelOpen, activeBottomTab, setActiveBottomTab, activeEndpointId, toggleBottomPanel } = useUIStore();
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));

  return (
    <div className={cn('flex flex-col border-t border-zinc-800/60 bg-zinc-950 transition-all', bottomPanelOpen ? 'h-52' : 'h-9')}>
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-zinc-800/60 shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { if (!bottomPanelOpen) toggleBottomPanel(); setActiveBottomTab(id); }}
            className={cn(
              'flex items-center gap-1.5 px-4 h-9 text-[11px] font-medium border-b-2 transition-colors',
              activeBottomTab === id && bottomPanelOpen
                ? 'border-blue-500 text-zinc-200'
                : 'border-transparent text-zinc-600 hover:text-zinc-400'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
        <button
          onClick={toggleBottomPanel}
          className="ml-auto px-3 h-9 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          {bottomPanelOpen ? '▾ Collapse' : '▴ Expand'}
        </button>
      </div>

      {/* Content */}
      {bottomPanelOpen && endpoint && (
        <div className="flex-1 overflow-y-auto overflow-x-auto px-4 py-3">
          {activeBottomTab === 'notes' && (
            <textarea
              value={endpoint.notes}
              onChange={(e) => useEndpointsStore.getState().updateEndpoint(endpoint.id, { notes: e.target.value })}
              placeholder="Notes..."
              className="w-full h-full bg-transparent text-xs text-zinc-400 placeholder-zinc-700 resize-none outline-none leading-relaxed"
            />
          )}

          {activeBottomTab === 'context-preview' && (
            <div className="space-y-2 text-xs text-zinc-400">
              <p><span className="text-zinc-600">Tool:</span> <code className="text-blue-300">{endpoint.agentContext.toolName}</code></p>
              <p><span className="text-zinc-600">Purpose:</span> {endpoint.agentContextLabels.businessPurpose}</p>
              <p><span className="text-zinc-600">Intent:</span> {endpoint.agentContextLabels.executionIntent}</p>
              <p><span className="text-zinc-600">Outcome:</span> {endpoint.agentContextLabels.expectedOutcome}</p>
              <p><span className="text-zinc-600">Domain:</span> {endpoint.agentContext.businessDomain}</p>
              <p><span className="text-zinc-600">Risk:</span> <span className="capitalize">{endpoint.riskLevel}</span></p>
              <p><span className="text-zinc-600">Auth:</span> {endpoint.agentContextLabels.requiredAuthentication}</p>
            </div>
          )}

          {activeBottomTab === 'json-preview' && (
            <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap">
              {JSON.stringify({
                id: endpoint.id,
                name: endpoint.name,
                method: endpoint.method,
                path: endpoint.path,
                category: endpoint.category,
                tags: endpoint.tags,
                agentContextLabels: endpoint.agentContextLabels,
                agentContext: endpoint.agentContext,
              }, null, 2)}
            </pre>
          )}

          {activeBottomTab === 'agent-prompt' && (
            <div className="space-y-1.5 text-[11px] text-zinc-400 font-mono leading-relaxed">
              <p className="text-blue-300"># Agent Tool Definition</p>
              <p><span className="text-zinc-600">tool_name:</span> {endpoint.agentContext.toolName}</p>
              <p><span className="text-zinc-600">description:</span> &quot;{endpoint.agentContext.naturalLanguageDescription}&quot;</p>
              <p><span className="text-zinc-600">when_to_use:</span> &quot;{endpoint.agentContext.whenToUse}&quot;</p>
              <p><span className="text-zinc-600">when_not_to_use:</span> &quot;{endpoint.agentContext.whenNotToUse}&quot;</p>
              <p><span className="text-zinc-600">warnings:</span></p>
              {endpoint.agentContext.operationalWarnings.map((w, i) => (
                <p key={i} className="pl-4 text-orange-300">  - &quot;{w}&quot;</p>
              ))}
              <p><span className="text-zinc-600">semantic_tags:</span> [{endpoint.agentContext.semanticTags.map((t) => `"${t}"`).join(', ')}]</p>
              <p><span className="text-zinc-600">idempotent:</span> {String(endpoint.agentContextLabels.idempotent)}</p>
              <p><span className="text-zinc-600">retry_safe:</span> {String(endpoint.agentContextLabels.retrySafe)}</p>
            </div>
          )}
        </div>
      )}

      {bottomPanelOpen && !endpoint && (
        <div className="flex-1 flex items-center justify-center text-xs text-zinc-700">
          Select an endpoint to preview context
        </div>
      )}
    </div>
  );
}
