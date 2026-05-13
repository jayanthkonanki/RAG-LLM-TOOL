'use client';
import { useUIStore } from '@/store/uiStore';
import { Search, PanelRight, PanelBottom, Plus, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TitleBar() {
  const { openSearch, toggleRightPanel, toggleBottomPanel, rightPanelOpen, bottomPanelOpen, openCreateEndpointModal } = useUIStore();

  return (
    <header className="h-10 flex items-center px-4 bg-zinc-950 border-b border-zinc-800/60 shrink-0 gap-4">
      {/* Logo / App name */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-black">A</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-300">APIContext</span>
        <span className="text-[10px] text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded">v1 MVP</span>
      </div>

      {/* Search trigger */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 flex-1 max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 h-7 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-colors text-[11px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search endpoints...</span>
        <kbd className="ml-auto text-[9px] border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-700 flex items-center gap-0.5">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => openCreateEndpointModal()}
          className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Endpoint
        </button>
        <div className="w-px h-5 bg-zinc-800 mx-1" />
        <ToolbarBtn icon={PanelRight} active={rightPanelOpen} onClick={toggleRightPanel} title="Toggle context panel" />
        <ToolbarBtn icon={PanelBottom} active={bottomPanelOpen} onClick={toggleBottomPanel} title="Toggle bottom panel" />
      </div>
    </header>
  );
}

function ToolbarBtn({ icon: Icon, active, onClick, title }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn('p-1.5 rounded transition-colors', active ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800')}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
