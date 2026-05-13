'use client';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { MethodBadge } from '@/components/ui/MethodBadge';
import { OverviewTab } from '@/components/tabs/OverviewTab';
import { AIContextTab } from '@/components/tabs/AIContextTab';
import { RequestSchemaTab, ResponseSchemaTab, NotesTab } from '@/components/tabs/SchemaTabs';
import { cn } from '@/lib/utils';
import { X, Bot, FileCode, FileJson, StickyNote, LayoutDashboard, Plus } from 'lucide-react';
import type { TabId } from '@/types';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'request', label: 'Request Schema', icon: FileCode },
  { id: 'response', label: 'Response Schema', icon: FileJson },
  { id: 'ai-context', label: 'AI Context', icon: Bot },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

export function MainWorkspace() {
  const {
    openEndpointIds, activeEndpointId, selectEndpoint,
    closeEndpointTab, activeTab, setActiveTab, openCreateEndpointModal,
  } = useUIStore();
  const endpoints = useEndpointsStore((s) => s.endpoints);

  const hasOpenTabs = openEndpointIds.length > 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Endpoint tab bar */}
      <div className="flex items-center border-b border-zinc-800/60 bg-zinc-950 overflow-x-auto shrink-0">
        {openEndpointIds.map((id) => {
          const ep = endpoints.find((e) => e.id === id);
          if (!ep) return null;
          const isActive = activeEndpointId === id;
          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-2 px-3 h-9 border-r border-zinc-800/60 min-w-0 max-w-48 cursor-pointer group shrink-0 transition-colors',
                isActive ? 'bg-zinc-900 border-b border-b-blue-500' : 'hover:bg-zinc-900/50 border-b border-b-transparent'
              )}
              onClick={() => selectEndpoint(id)}
            >
              <MethodBadge method={ep.method} size="xs" />
              <span className={cn('text-[11px] truncate flex-1', isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300')}>
                {ep.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeEndpointTab(id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-400 transition-all shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={() => openCreateEndpointModal()}
          className="flex items-center gap-1 px-3 h-9 text-zinc-700 hover:text-zinc-500 transition-colors shrink-0"
          title="New endpoint"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasOpenTabs && activeEndpointId ? (
        <>
          {/* Content tab bar */}
          <div className="flex items-center gap-0 px-4 border-b border-zinc-800/60 bg-zinc-950 shrink-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-9 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === id
                    ? 'border-blue-500 text-zinc-200'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {id === 'ai-context' && (
                  <span className="ml-1 px-1 py-0.5 text-[9px] rounded bg-blue-500/20 text-blue-400 font-semibold">AI</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'request' && <RequestSchemaTab />}
            {activeTab === 'response' && <ResponseSchemaTab />}
            {activeTab === 'ai-context' && <AIContextTab />}
            {activeTab === 'notes' && <NotesTab />}
          </div>
        </>
      ) : (
        <EmptyWorkspace />
      )}
    </div>
  );
}

function EmptyWorkspace() {
  const { openCreateEndpointModal, openSearch } = useUIStore();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <Bot className="w-6 h-6 text-blue-400" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-zinc-200 mb-1">No endpoint selected</h2>
        <p className="text-sm text-zinc-600 max-w-sm leading-relaxed">
          Select an endpoint from the sidebar or create a new one to start defining AI-readable context.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => openCreateEndpointModal()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          New Endpoint
        </button>
        <button
          onClick={openSearch}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors flex items-center gap-2"
        >
          Search
          <kbd className="text-[10px] px-1.5 py-0.5 border border-zinc-600 rounded">Ctrl+K</kbd>
        </button>
      </div>
    </div>
  );
}
