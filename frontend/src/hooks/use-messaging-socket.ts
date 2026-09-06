'use client';

import { useLocale } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/socket-context';
import type { MessageItem } from '@/hooks/use-messaging';
import { getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export function useMessagingSocket(
  accessToken: string | null,
  onMessage?: (message: MessageItem) => void,
  onMessageRead?: (payload: {
    conversationId: string;
    readBy?: string;
    markedCount: number;
    readAt: string;
  }) => void,
  onMessageDelivered?: (payload: {
    conversationId: string;
    deliveredBy?: string;
    markedCount: number;
    deliveredAt: string;
    messageIds?: string[];
  }) => void,
  onTyping?: (payload: {
    conversationId: string;
    userId: string;
    typing: boolean;
  }) => void,
) {
  const locale = useLocale() as AppLocale;
  const { socket, isConnected } = useSocket();
  const onMessageRef = useRef(onMessage);
  const onReadRef = useRef(onMessageRead);
  const onDeliveredRef = useRef(onMessageDelivered);
  const onTypingRef = useRef(onTyping);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onReadRef.current = onMessageRead;
  }, [onMessageRead]);
  useEffect(() => {
    onDeliveredRef.current = onMessageDelivered;
  }, [onMessageDelivered]);
  useEffect(() => {
    onTypingRef.current = onTyping;
  }, [onTyping]);

  useEffect(() => {
    if (!socket || !accessToken) return;

    const onNew = (message: MessageItem) => {
      onMessageRef.current?.(message);
    };
    const onRead = (payload: {
      conversationId: string;
      readBy?: string;
      markedCount: number;
      readAt: string;
    }) => onReadRef.current?.(payload);
    const onDelivered = (payload: {
      conversationId: string;
      deliveredBy?: string;
      markedCount: number;
      deliveredAt: string;
      messageIds?: string[];
    }) => onDeliveredRef.current?.(payload);
    const onTypingStart = (payload: {
      conversationId: string;
      userId: string;
    }) =>
      onTypingRef.current?.({
        ...payload,
        typing: true,
      });
    const onTypingStop = (payload: {
      conversationId: string;
      userId: string;
    }) =>
      onTypingRef.current?.({
        ...payload,
        typing: false,
      });

    socket.on('message:new', onNew);
    socket.on('message:read', onRead);
    socket.on('message:delivered', onDelivered);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('message:new', onNew);
      socket.off('message:read', onRead);
      socket.off('message:delivered', onDelivered);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
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
          else reject(new Error(getApiErrorMessage(locale, 'sendMessageFailed')));
        },
      );
    });
  }

  function emitTyping(conversationId: string, typing: boolean) {
    socket?.emit(typing ? 'typing:start' : 'typing:stop', { conversationId });
  }

  function emitDelivered(conversationId: string, messageIds?: string[]) {
    socket?.emit('message:delivered', { conversationId, messageIds });
  }

  return {
    isConnected,
    joinConversation,
    sendMessage,
    emitTyping,
    emitDelivered,
  };
}
