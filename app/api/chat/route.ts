import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DAILY_MESSAGE_LIMIT, RESOURCE_SHORTAGE_MESSAGE } from '@/lib/constants';

function isResourceShortage(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('429') || message.includes('resource') || message.includes('quota') || message.includes('overloaded') || message.includes('temporarily unavailable');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { message, conversationId, modelName } = await req.json();
    const trimmed = String(message || '').trim();
    const selectedModel = String(modelName || 'gemini-3.5-flash-lite').replace(/^models\//, '');

    if (!trimmed) {
      return Response.json({ success: false, error: 'Message cannot be empty.' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentToday = await prisma.message.count({
      where: {
        userId: session.user.id,
        role: 'user',
        createdAt: {
          gte: today
        }
      }
    });

    if (sentToday >= DAILY_MESSAGE_LIMIT) {
      return Response.json({
        success: false,
        error: `Your daily message limit is reached. You have used all ${DAILY_MESSAGE_LIMIT} messages for today.`
      }, { status: 429 });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id }
      });
    }

    const previousMessages = conversation
      ? await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          take: 12
        })
      : [];

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...previousMessages.map((message) => ({
              role: message.role === 'user' ? 'user' : 'model',
              parts: [{ text: message.content }]
            })),
            {
              role: 'user',
              parts: [{ text: trimmed }]
            }
          ],
          generationConfig: { temperature: 0.7 }
        })
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      const errorPayload = JSON.parse(errorText || '{}');
      const reason = errorPayload?.error?.message || '';

      if (isResourceShortage(errorPayload) || isResourceShortage({ message: reason })) {
        return Response.json({ success: false, error: RESOURCE_SHORTAGE_MESSAGE }, { status: 503 });
      }

      if (reason.toLowerCase().includes('not found') || reason.toLowerCase().includes('not supported')) {
        return Response.json({
          success: false,
          error: 'This model is currently unavailable. Please choose another model from the list and try again.'
        }, { status: 400 });
      }

      return Response.json({ success: false, error: reason || 'The AI service is temporarily unavailable.' }, { status: 502 });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          title: trimmed.slice(0, 40) || 'New chat',
          userId: session.user.id
        }
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content: trimmed,
        conversationId: conversation.id,
        userId: session.user.id
      }
    });

    const aiData = await aiResponse.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join('') || 'I could not generate a reply right now.';

    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: text,
        conversationId: conversation.id,
        userId: session.user.id
      }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: conversation.title || 'New chat' }
    });

    return Response.json({
      success: true,
      message: { id: assistantMessage.id, content: assistantMessage.content },
      conversationId: conversation.id,
      userMessageId: userMessage.id
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes('429') || message.includes('resource') || message.includes('quota') || message.includes('unavailable')) {
      return Response.json({ success: false, error: RESOURCE_SHORTAGE_MESSAGE }, { status: 503 });
    }
    return Response.json({ success: false, error: 'Unexpected error. Please try again later.' }, { status: 500 });
  }
}
