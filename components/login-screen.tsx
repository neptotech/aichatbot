'use client';

import { signIn } from 'next-auth/react';

export default function LoginScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-glow backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">ChatFlow AI</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in with Google to continue.</p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
          <div className="font-medium text-white">Supported model</div>
          <div className="mt-2 text-emerald-300">gemini-1.5-flash</div>
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-200"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.8 3.1 14.7 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 11.5S6.9 20.8 12 20.8c6.9 0 11.4-4.8 11.4-11.6 0-.8-.1-1.4-.2-2H12z" />
            <path fill="#4285F4" d="M3.8 7.2l3.5 2.6c.9-1.7 3-2.9 5.6-2.9 1.9 0 3.2.8 3.9 1.5l2.7-2.7C16.8 3.1 14.7 2.2 12 2.2c-3.8 0-7.1 2.2-8.2 5z" />
            <path fill="#FBBC05" d="M3.9 15.7c1.1 2.1 3.5 3.6 8.1 3.6 2.5 0 4.6-.9 6.1-2.5l-2.8-2.4c-.8.6-1.8 1-3.3 1-2.6 0-4.5-1.7-5.2-4l-3.1 2.3c.9 2.1 2.7 3.9 5.2 4.8z" />
            <path fill="#34A853" d="M12 20.8c2.5 0 4.6-.8 6.1-2.3l-2.7-2.1c-.9.7-2.2 1.1-3.4 1.1-2.8 0-5.1-1.8-5.9-4.3l-3.1 2.5c1.2 3.3 4.5 5.9 9.9 5.9z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </main>
  );
}
