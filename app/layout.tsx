import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatFlow AI',
  description: 'Modern AI chatbot powered by Google Gemini'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
