'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/socket-context';
import type { MessageItem } from '@/hooks/use-messaging';

export function useMessagingSocket(
  accessToken: string | null,
  onMessage?: (message: MessageItem) => void,
) {
  const { socket, isConnected } = useSocket();
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!socket || !accessToken) return;

    const listener = (message: MessageItem) => {
      onMessageRef.current?.(message);
    };

    socket.on('message:new', listener);

    return () => {
      socket.off('message:new', listener);
    };
  }, [socket, accessToken]);

  function joinConversation(conversationId: string) {
    socket?.emit('conversation:join', { conversationId });
  }

  function sendMessage(conversationId: string, content: string) {
    return new Promise<MessageItem>((resolve, reject) => {
      socket?.emit(
        'message:send',
        { conversationId, content },
        (response: { message?: MessageItem; error?: string }) => {
          if (response?.error) reject(new Error(response.error));
          else if (response?.message) resolve(response.message);
          else reject(new Error('فشل إرسال الرسالة'));
        },
      );
    });
  }

  return { isConnected, joinConversation, sendMessage };
}
