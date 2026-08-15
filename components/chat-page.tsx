'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

type ModelOption = {
  id: string;
  name: string;
  displayName: string;
  description: string;
};

export default function ChatPage({ user }: { user: { id?: string; name?: string | null; email?: string | null; image?: string | null } }) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.0-flash');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadConversations();
    loadModels();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function loadModels() {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
        setSelectedModel(data.models[0].id);
      }
    } catch {
      setModels([]);
    }
  }

  async function loadConversations() {
    const res = await fetch('/api/chat/history');
    const data = await res.json();
    if (data.success) {
      setConversations(data.conversations || []);
      if (data.conversations?.[0]) {
        setSelectedConversationId(data.conversations[0].id);
        loadMessages(data.conversations[0].id);
      }
    }
  }

  async function loadMessages(conversationId: string) {
    setSelectedConversationId(conversationId);
    const res = await fetch(`/api/chat/history?conversationId=${conversationId}`);
    const data = await res.json();
    if (data.success) {
      setMessages(data.messages || []);
    }
  }

  async function startNewConversation() {
    setSelectedConversationId(null);
    setMessages([]);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { id: `${Date.now()}-user`, role: 'user', content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: selectedConversationId,
          modelName: selectedModel
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong.');
        setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      } else {
        setMessages((current) => [...current, { id: data.message.id, role: 'assistant', content: data.message.content }]);
        setSelectedConversationId(data.conversationId);
        loadConversations();
      }
    } catch (err) {
      setError('We are facing short-term resource shortages. Please try again in a few moments.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-80 border-r border-slate-800 bg-slate-900/80 p-4 lg:flex lg:flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">ChatFlow</p>
            <h2 className="mt-2 text-2xl font-semibold">Chats</h2>
          </div>
          <button
            onClick={startNewConversation}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            New
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => loadMessages(conversation.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                selectedConversationId === conversation.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <div className="truncate text-sm font-medium text-white">{conversation.title}</div>
              <div className="mt-1 text-xs text-slate-400">{new Date(conversation.createdAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center gap-3">
            <img src={user.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.email || 'User')} alt="avatar" className="h-10 w-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-white">{user.name || user.email}</div>
              <div className="text-xs text-slate-400">{session?.user?.email || 'Google account'}</div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="mt-4 w-full rounded-xl bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
            Sign out
          </button>
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-4 backdrop-blur lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">AI assistant</p>
            <h1 className="mt-2 text-xl font-semibold">Chat</h1>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            Google Gemini
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 lg:px-8">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-xl rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
                <h2 className="text-2xl font-semibold text-white">Start a new conversation</h2>
                <p className="mt-3 text-slate-400">Ask a question and the assistant will answer using your recent conversation context.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-emerald-500 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100'}`}>
                  <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-800 bg-slate-900/70 p-4 lg:px-8">
          <div className="mx-auto flex max-w-5xl items-end gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-3">
            <div className="flex items-center gap-2 self-end pb-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200 outline-none"
                disabled={models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                ) : (
                  models.map((model) => (
                    <option key={model.id} value={model.id}>{model.displayName}</option>
                  ))
                )}
              </select>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              placeholder="Message ChatFlow AI..."
              className="max-h-40 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-2 py-3 text-base text-white placeholder:text-slate-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              disabled={isLoading || !input.trim()}
              onClick={handleSend}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
