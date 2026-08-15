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
  const [models] = useState<ModelOption[]>(
    PERMANENT_MODELS.map((model) => ({
      id: model,
      name: model,
      displayName: model,
      description: 'Permanent model option'
    }))
  );
  const [selectedModel, setSelectedModel] = useState<string>(PERMANENT_MODELS[0]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
    <main className="flex min-h-screen bg-[#f5f1ea] text-stone-800">
      <aside className="hidden w-72 border-r border-[#e8dfd6] bg-[#f1efe9] p-4 lg:flex lg:flex-col">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">OpenAI</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-stone-600 shadow-sm ring-1 ring-stone-200">⌕</button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-stone-600 shadow-sm ring-1 ring-stone-200">＋</button>
          </div>
        </div>

        <button
          onClick={startNewConversation}
          className="flex w-full items-center gap-2 rounded-2xl bg-[#e7e0d8] px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#ddd3c8]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-stone-400 text-xs">✎</span>
          New chat
        </button>

        <nav className="mt-5 space-y-2 text-sm text-stone-600">
          {[
            'Images',
            'Library',
            'Gains',
            'Pacts',
            'More'
          ].map((item) => (
            <button
              key={item}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/60"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-[10px] text-stone-500">
                {item[0]}
              </span>
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Recents</div>
          <div className="space-y-2 text-sm text-stone-600">
            {['Discord server member limit', 'Windows AI Components Update', 'Phi Silica Use Cases', 'AI Image Search Setup', 'Gmail Email Summary'].map((item) => (
              <div key={item} className="truncate px-2 py-1.5 text-stone-600">{item}</div>
            ))}
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

          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-200">
              ⎘
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-200">
              ◌
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-4 pb-8 pt-2">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-4xl">
              {messages.length === 0 ? (
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
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-stone-700 shadow-sm ring-1 ring-stone-200">
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
