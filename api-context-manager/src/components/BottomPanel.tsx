'use client';
import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useEndpointsStore } from '@/store/endpointsStore';
import { useApplicationsStore } from '@/store/applicationsStore';
import { cn } from '@/lib/utils';
import { Bot, FileCode, Eye, StickyNote, Send, MessageSquare, Loader2, Layers } from 'lucide-react';
import type { BottomTabId } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const TABS: { id: BottomTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'agent-prompt', label: 'Chat', icon: Bot },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'context-preview', label: 'Context', icon: Eye },
  { id: 'json-preview', label: 'JSON', icon: FileCode },
];

export function BottomPanel() {
  const {
    bottomPanelOpen, activeBottomTab, setActiveBottomTab,
    activeEndpointId, toggleBottomPanel, selectedChatAppIds,
  } = useUIStore();
  const endpoint = useEndpointsStore((s) => s.endpoints.find((e) => e.id === activeEndpointId));
  const { applications } = useApplicationsStore();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedAppNames = applications
    .filter((a) => selectedChatAppIds.includes(a.id))
    .map((a) => a.name);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, app_ids: selectedChatAppIds }),
      });
      const data = await res.json();
      const answer = data.answer || data.detail || 'No response';
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', content: answer, timestamp: new Date() },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `err-${Date.now()}`, role: 'assistant', content: '⚠️ Failed to reach backend.', timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={cn('flex flex-col border-t border-zinc-800/60 bg-zinc-950 transition-all duration-200', bottomPanelOpen ? 'h-72' : 'h-9')}>
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
            {id === 'agent-prompt' && selectedChatAppIds.length > 0 && (
              <span className="ml-1 bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.5 rounded-full">
                {selectedChatAppIds.length}
              </span>
            )}
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
      {bottomPanelOpen && (
        <div className="flex-1 min-h-0 flex flex-col">

          {/* ── Chat Tab ── */}
          {activeBottomTab === 'agent-prompt' && (
            <>
                <>
                  {/* App context bar */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/40 bg-zinc-900/40 shrink-0">
                    <Layers className="w-3 h-3 text-blue-400/70 shrink-0" />
                    <span className="text-[10px] text-zinc-500">Chatting with:</span>
                    {selectedChatAppIds.length === 0 ? (
                      <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">All Applications</span>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {selectedAppNames.map((name) => (
                          <span key={name} className="text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
                    {messages.length === 0 && (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-zinc-700">Ask anything about your API endpoints...</p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-3 h-3 text-blue-400" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-3 py-1.5 text-xs leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-blue-600/20 text-zinc-200 border border-blue-500/20'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800/60'
                          )}
                        >
                          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-2 justify-start">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-3 py-2">
                          <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800/40 shrink-0">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your endpoints... (Enter to send)"
                      disabled={loading}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
            </>
          )}

          {/* ── Notes Tab ── */}
          {activeBottomTab === 'notes' && endpoint && (
            <div className="flex-1 px-4 py-3">
              <textarea
                value={endpoint.notes}
                onChange={(e) => useEndpointsStore.getState().updateEndpoint(endpoint.id, { notes: e.target.value })}
                placeholder="Notes..."
                className="w-full h-full bg-transparent text-xs text-zinc-400 placeholder-zinc-700 resize-none outline-none leading-relaxed"
              />
            </div>
          )}

          {/* ── Context Preview Tab ── */}
          {activeBottomTab === 'context-preview' && endpoint && (
            <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2 text-xs text-zinc-400">
              <p><span className="text-zinc-600">Tool:</span> <code className="text-blue-300">{endpoint.agentContext.toolName}</code></p>
              <p><span className="text-zinc-600">Purpose:</span> {endpoint.agentContextLabels.businessPurpose}</p>
              <p><span className="text-zinc-600">Intent:</span> {endpoint.agentContextLabels.executionIntent}</p>
              <p><span className="text-zinc-600">Outcome:</span> {endpoint.agentContextLabels.expectedOutcome}</p>
              <p><span className="text-zinc-600">Domain:</span> {endpoint.agentContext.businessDomain}</p>
              <p><span className="text-zinc-600">Risk:</span> <span className="capitalize">{endpoint.riskLevel}</span></p>
              <p><span className="text-zinc-600">Auth:</span> {endpoint.agentContextLabels.requiredAuthentication}</p>
            </div>
          )}

          {/* ── JSON Preview Tab ── */}
          {activeBottomTab === 'json-preview' && endpoint && (
            <div className="flex-1 overflow-auto px-4 py-3">
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
            </div>
          )}

          {/* Fallback: no endpoint selected for non-chat tabs */}
          {activeBottomTab !== 'agent-prompt' && !endpoint && (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-700">
              Select an endpoint to preview context
            </div>
          )}
        </div>
      )}
    </div>
  );
}
