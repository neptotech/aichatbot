'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

const PERMANENT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemma-4-26b-a4b-it',
  'gemma-4-31b-it'
];

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [models] = useState<ModelOption[]>(
    PERMANENT_MODELS.map((model) => ({
      id: model,
      name: model,
      displayName: model,
      description: 'Permanent model option'
    }))
  );
  const [selectedModel, setSelectedModel] = useState<string>(PERMANENT_MODELS[0]);

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function loadConversations() {
    const res = await fetch('/api/chat/history');
    const data = await res.json();
    if (data.success) {
      setConversations(data.conversations || []);
    }
  }

  async function loadMessages(conversationId: string) {
    setSelectedConversationId(conversationId);
    setError(null);
    const res = await fetch(`/api/chat/history?conversationId=${conversationId}`);
    const data = await res.json();
    if (data.success) {
      setMessages(data.messages || []);
    }
  }

  async function startNewConversation() {
    setSelectedConversationId(null);
    setMessages([]);
    setError(null);
    setSearchQuery('');
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setError(null);

    const userMessageId = `${Date.now()}-user`;
    setMessages((current) => [...current, { id: userMessageId, role: 'user', content: trimmed }]);

    const assistantId = `${Date.now()}-assistant`;
    setMessages((current) => [...current, { id: assistantId, role: 'assistant', content: '' }]);
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Something went wrong.' }));
        setError(errorData.error || 'Something went wrong.');
        setMessages((current) => current.filter((message) => message.id !== assistantId));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: data.message.content } : message
            )
          );
          setSelectedConversationId(data.conversationId ?? selectedConversationId);
          await loadConversations();
        } else {
          setError(data?.error || 'Something went wrong.');
          setMessages((current) => current.filter((message) => message.id !== assistantId));
        }
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let payload: any = null;
          try {
            payload = JSON.parse(trimmed);
          } catch {
            const raw = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
            if (!raw) continue;
            try {
              payload = JSON.parse(raw);
            } catch {
              continue;
            }
          }

          if (payload?.event === 'meta' && payload.data?.conversationId) {
            setSelectedConversationId(payload.data.conversationId);
            await loadConversations();
            continue;
          }

          if (payload?.event === 'text' && typeof payload.data === 'string') {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, content: (message.content || '') + payload.data } : message
              )
            );
            continue;
          }

          if (payload?.event === 'error') {
            setError(payload.data || 'Something went wrong.');
            setMessages((current) => current.filter((message) => message.id !== assistantId));
            done = true;
            continue;
          }

          const textFromApi = payload?.candidates?.[0]?.content?.parts
            ?.map((part: any) => part.text || '')
            .join('') || '';

          if (textFromApi) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, content: (message.content || '') + textFromApi } : message
              )
            );
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        try {
          const payload = JSON.parse(trimmed);
          if (payload?.event === 'meta' && payload.data?.conversationId) {
            setSelectedConversationId(payload.data.conversationId);
            await loadConversations();
          }
          if (payload?.event === 'text' && typeof payload.data === 'string') {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, content: (message.content || '') + payload.data } : message
              )
            );
          }
          const textFromApi = payload?.candidates?.[0]?.content?.parts
            ?.map((part: any) => part.text || '')
            .join('') || '';

          if (textFromApi) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, content: (message.content || '') + textFromApi } : message
              )
            );
          }
        } catch {
          // Ignore trailing fragments that are not valid JSON yet.
        }
      }

      if (!error) {
        setSelectedConversationId((current) => current ?? selectedConversationId);
      }
    } catch (err) {
      setError('We are facing short-term resource shortages. Please try again in a few moments.');
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f5f1ea] text-stone-800">
      <aside className="hidden w-72 border-r border-[#e8dfd6] bg-[#f1efe9] p-4 lg:flex lg:flex-col">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">ChatGPT</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((prev) => !prev);
                if (!searchOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-stone-600 shadow-sm ring-1 ring-stone-200"
              aria-label="Search chats"
            >
              ⌕
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-stone-600 shadow-sm ring-1 ring-stone-200"
              aria-label="New chat"
            >
              ＋
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="mb-4">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full rounded-xl border border-[#ddd1c5] bg-white px-3 py-2 text-sm text-stone-700 outline-none placeholder:text-stone-400"
            />
          </div>
        )}

        <div className="mt-2 flex-1 overflow-hidden">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Recents</div>
          <div className="space-y-2 overflow-y-auto pr-1">
            {filteredConversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white/40 px-3 py-3 text-sm text-stone-500">
                No chats found
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => loadMessages(conversation.id)}
                  className={`w-full rounded-xl px-2 py-2 text-left text-sm transition ${
                    selectedConversationId === conversation.id
                      ? 'bg-[#e5ddd3] text-stone-800'
                      : 'text-stone-600 hover:bg-white/60'
                  }`}
                >
                  <div className="truncate">{conversation.title}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto rounded-2xl border border-[#e7dfd6] bg-[#f5f1ea] p-3">
          <div className="flex items-center gap-3">
            <img
              src={user.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.email || 'User')}
              alt="avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-stone-800">{user.name || user.email}</div>
              <div className="text-[11px] text-stone-500">{session?.user?.email || 'Google account'}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-3 w-full rounded-xl bg-[#e7e0d8] px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#ddd3c8]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm text-stone-700 shadow-sm ring-1 ring-stone-200 lg:hidden">
              ☰
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">ChatGPT</div>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-4 pb-8 pt-2">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-4xl">
              {messages.length === 0 || selectedConversationId === null ? (
                <div className="flex min-h-[280px] items-center justify-center">
                  <div className="text-center text-[28px] font-medium tracking-[-0.04em] text-stone-700">
                    What’s on your mind today?
                  </div>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto px-4 py-6">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-[#2f2c2b] text-white' : 'bg-white text-stone-800 ring-1 ring-stone-200'}`}>
                        <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-600 ring-1 ring-stone-200">
                        Thinking...
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full pb-2">
            <div className="mx-auto w-full max-w-4xl rounded-[28px] border border-[#d9d1c7] bg-[#e8e1d8] p-3 shadow-[0_10px_30px_rgba(109,97,87,0.08)]">
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={startNewConversation}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-stone-700 shadow-sm ring-1 ring-stone-200"
                  aria-label="New chat"
                >
                  +
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={1}
                  placeholder="Ask anything"
                  className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-base text-stone-800 placeholder:text-stone-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />

                <div className="flex items-center gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="rounded-full border border-[#d3cabf] bg-[#f4efe9] px-2.5 py-2 text-xs font-medium text-stone-700 outline-none shadow-sm"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>{model.displayName}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isLoading || !input.trim()}
                    onClick={handleSend}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2d2a29] text-lg text-white transition hover:bg-[#1d1b1a] disabled:cursor-not-allowed disabled:bg-stone-300"
                    aria-label="Send prompt"
                  >
                    ➜
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
