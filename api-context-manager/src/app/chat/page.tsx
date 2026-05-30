'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApplicationsStore } from '@/store/applicationsStore';
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function MarkdownText({ text }: { text: string }) {
  // Simple markdown: bold, inline code, code blocks, bullet lists
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(
        <div key={i} className="my-3 rounded-lg overflow-hidden border border-white/10">
          {lang && (
            <div className="px-4 py-1.5 bg-white/5 text-xs text-zinc-400 font-mono border-b border-white/10">
              {lang}
            </div>
          )}
          <pre className="p-4 bg-zinc-950 text-sm font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
    }
    // Heading
    else if (line.startsWith('### ')) {
      result.push(<h3 key={i} className="text-base font-semibold text-white mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      result.push(<h2 key={i} className="text-lg font-semibold text-white mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      result.push(<h1 key={i} className="text-xl font-bold text-white mt-5 mb-2">{line.slice(2)}</h1>);
    }
    // Bullet
    else if (line.match(/^[-*] /)) {
      result.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-zinc-500 mt-1 shrink-0">•</span>
          <span className="text-zinc-200 leading-relaxed">{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      result.push(<div key={i} className="h-2" />);
    }
    // Paragraph
    else {
      result.push(
        <p key={i} className="text-zinc-200 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{result}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  'List all available API endpoints',
  'How do I authenticate requests?',
  'Show me the user profile endpoint',
  'What endpoints does the billing service have?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { applications, fetchApplications } = useApplicationsStore();
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const toggleApp = (id: string) => {
    setSelectedAppIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const loadingMsg: Message = {
      id: Date.now().toString() + '-loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch(`${API_URL}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, app_ids: selectedAppIds }),
      });

      const data = await res.json();
      const answer = res.ok ? (data.answer || JSON.stringify(data)) : `Error: ${data.detail || 'Unknown error'}`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: answer, loading: false }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: `Connection error: ${err instanceof Error ? err.message : 'Failed to reach backend'}`, loading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-zinc-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-sm text-white">RAG API Assistant</h1>
            <p className="text-xs text-zinc-500">Powered by Ollama + Milvus</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {applications.length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-xs text-zinc-400">Context Apps:</span>
              <div className="flex gap-1 flex-wrap max-w-md">
                {applications.map(app => (
                  <button
                    key={app.id}
                    onClick={() => toggleApp(app.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      selectedAppIds.includes(app.id)
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-zinc-400">Live</span>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="ml-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-md hover:bg-white/5"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-8 px-4">
            <div className="text-center space-y-3 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400/20 to-rose-500/20 border border-orange-400/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white">How can I help you?</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Ask anything about your API endpoints. I'll search the vector database and answer using your registered documentation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm text-zinc-300 leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shrink-0 mt-1 shadow">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500/15 border border-orange-500/20 text-zinc-100 rounded-tr-sm'
                      : 'bg-white/5 border border-white/8 text-zinc-200 rounded-tl-sm'
                  }`}
                >
                  {msg.loading ? (
                    <ThinkingDots />
                  ) : msg.role === 'assistant' ? (
                    <MarkdownText text={msg.content} />
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {!msg.loading && (
                    <div className="mt-2 text-[11px] text-zinc-600">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-1">
                    <svg className="w-3.5 h-3.5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-6 pt-3 border-t border-white/8 bg-zinc-900">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-zinc-800 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
            <textarea
              ref={textareaRef}
              id="chat-input"
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your API endpoints…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none leading-relaxed min-h-[24px] max-h-[200px] disabled:opacity-50"
            />
            <button
              id="chat-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors shadow-sm"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-600 mt-2">
            Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-mono text-[10px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-mono text-[10px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
