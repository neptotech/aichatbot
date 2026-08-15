import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import ChatPage from '@/components/chat-page';

export default async function HomePage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login');
  }

  return <ChatPage user={session.user} />;
}
