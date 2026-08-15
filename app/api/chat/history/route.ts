import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (conversationId) {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        userId: session.user.id
      },
      orderBy: { createdAt: 'asc' }
    });

    return Response.json({ success: true, messages: messages.map((message) => ({ id: message.id, role: message.role, content: message.content })) });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' }
  });

  return Response.json({ success: true, conversations });
}
