'use client';
import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useApplicationsStore } from '@/store/applicationsStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { MethodBadge } from '@/components/ui/MethodBadge';
import {
  ChevronRight, ChevronDown, Plus, Folder, FolderOpen,
  Layers, Search, File, FolderCode, LayoutGrid, MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const {
    expandedApps, expandedGroups, toggleApp, toggleGroup,
    selectedEndpointId, selectEndpoint, activePanelView, setActivePanelView,
    openSearch, openCreateAppModal, openCreateGroupModal, openCreateEndpointModal,
  } = useUIStore();

  const { applications, groups } = useApplicationsStore();
  const { getByGroup } = useEndpointsStore();

  const [filterQuery, setFilterQuery] = useState('');

  const filteredApps = filterQuery
    ? applications.filter((a) => a.name.toLowerCase().includes(filterQuery.toLowerCase()))
    : applications;

  return (
    <aside className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/60 select-none">
      {/* Top nav icons */}
      <div className="flex flex-col items-center py-3 gap-1 border-b border-zinc-800/60">
        <NavIcon icon={Layers} label="Endpoints" active={activePanelView === 'endpoints'} onClick={() => setActivePanelView('endpoints')} />
        <NavIcon icon={FolderCode} label="Files" active={activePanelView === 'files'} onClick={() => setActivePanelView('files')} />
        <NavIcon icon={LayoutGrid} label="Applications" active={activePanelView === 'applications'} onClick={() => setActivePanelView('applications')} />
      </div>

      {/* Panel header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          {activePanelView === 'endpoints' ? 'Explorer' : activePanelView === 'files' ? 'Files' : 'Applications'}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={openSearch} className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors">
            <Search className="w-3.5 h-3.5" />
          </button>
          <button onClick={openCreateAppModal} className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-400 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter input */}
      <div className="px-3 pb-2">
        <input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-[11px] text-zinc-400 placeholder-zinc-700 outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
        {filteredApps.map((app) => {
          const appGroups = groups.filter((g) => g.applicationId === app.id);
          const isExpanded = expandedApps.has(app.id);
          const totalEndpoints = appGroups.reduce((sum, g) => sum + g.endpointIds.length, 0);

          return (
            <div key={app.id} className="mb-1">
              {/* App row */}
              <button
                onClick={() => toggleApp(app.id)}
                className="w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded-md hover:bg-zinc-800/50 text-left group transition-colors"
              >
                <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
                <Layers className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
                <span className="flex-1 text-[12px] font-medium text-zinc-300 truncate">{app.name}</span>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                  {totalEndpoints}
                </span>
              </button>

              {/* Groups */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {appGroups.map((group) => {
                      const groupEndpoints = getByGroup(group.id);
                      const isGroupExpanded = expandedGroups.has(group.id);

                      return (
                        <div key={group.id} className="ml-4">
                          {/* Group row — split into toggle area + action button as siblings */}
                          <div className="flex items-center rounded-md hover:bg-zinc-800/50 group transition-colors pr-1">
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center gap-1.5 px-1.5 py-1.5 flex-1 min-w-0 text-left"
                            >
                              <span className="text-zinc-600 group-hover:text-zinc-400">
                                {isGroupExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </span>
                              {isGroupExpanded
                                ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500/70 shrink-0" />
                                : <Folder className="w-3.5 h-3.5 text-yellow-500/70 shrink-0" />}
                              <span className="flex-1 text-[11.5px] text-zinc-400 truncate">{group.name}</span>
                            </button>
                            <button
                              onClick={() => openCreateEndpointModal(group.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-400 transition-all shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Endpoints */}
                          <AnimatePresence>
                            {isGroupExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="overflow-hidden"
                              >
                                {groupEndpoints.map((ep) => (
                                  <button
                                    key={ep.id}
                                    onClick={() => selectEndpoint(ep.id)}
                                    className={cn(
                                      'w-full flex items-center gap-2 pl-7 pr-2 py-1.5 rounded-md text-left transition-colors',
                                      selectedEndpointId === ep.id
                                        ? 'bg-blue-500/10 text-zinc-100'
                                        : 'hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300'
                                    )}
                                  >
                                    <MethodBadge method={ep.method} size="xs" />
                                    <span className="text-[11px] truncate font-mono">{ep.path}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                    {/* Add group button */}
                    <button
                      onClick={() => openCreateGroupModal(app.id)}
                      className="ml-4 flex items-center gap-1.5 px-2 py-1 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New group</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredApps.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-zinc-700">
            No applications found
          </div>
        )}
      </div>

      {/* Bottom status */}
      <div className="px-3 py-2 border-t border-zinc-800/60 flex items-center justify-between">
        <span className="text-[10px] text-zinc-700">{applications.length} apps</span>
        <span className="text-[10px] text-zinc-700">
          {useEndpointsStore.getState().endpoints.length} endpoints
        </span>
      </div>
    </aside>
  );
}

function NavIcon({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'p-2 rounded-lg transition-colors',
        active ? 'bg-blue-500/15 text-blue-400' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
