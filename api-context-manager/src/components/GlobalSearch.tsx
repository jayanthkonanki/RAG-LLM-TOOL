'use client';
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { useApplicationsStore } from '@/store/applicationsStore';
import { MethodBadge } from '@/components/ui/MethodBadge';
import { Search, X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function GlobalSearch() {
  const { searchOpen, searchQuery, closeSearch, setSearchQuery, selectEndpoint } = useUIStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const endpoints = useEndpointsStore((s) => s.endpoints);
  const applications = useApplicationsStore((s) => s.applications);

  const results = searchQuery.length > 1
    ? useEndpointsStore.getState().search(searchQuery).slice(0, 8)
    : [];

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeSearch]);

  const handleSelect = (id: string) => {
    selectEndpoint(id);
    closeSearch();
  };

  const appMap = Object.fromEntries(applications.map((a) => [a.id, a.name]));

  return (
    <AnimatePresence>
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeSearch}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search endpoints, tags, paths, domains..."
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-zinc-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] text-zinc-600 border border-zinc-700 rounded">
                <span>ESC</span>
              </kbd>
            </div>

            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto py-1">
                {results.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => handleSelect(ep.id)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors text-left group"
                  >
                    <MethodBadge method={ep.method} size="xs" className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-100 truncate">{ep.name}</span>
                        <span className="text-[11px] text-zinc-500 font-mono truncate">{ep.path}</span>
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-0.5">{appMap[ep.applicationId]} · {ep.agentContext.businessDomain}</div>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                      {ep.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length > 1 && results.length === 0 && (
              <div className="py-8 text-center text-sm text-zinc-600">No results for &ldquo;{searchQuery}&rdquo;</div>
            )}

            {!searchQuery && (
              <div className="px-4 py-3 text-[11px] text-zinc-600 flex items-center gap-4">
                <span>Search by endpoint name, path, tags, or AI labels</span>
                <span className="ml-auto flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 border border-zinc-700 rounded text-[10px]">Ctrl</kbd>
                  <kbd className="px-1.5 py-0.5 border border-zinc-700 rounded text-[10px]">K</kbd>
                  <span className="ml-1">to open</span>
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
