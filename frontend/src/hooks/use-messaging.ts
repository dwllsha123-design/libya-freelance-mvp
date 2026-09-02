'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export interface ConversationSummary {
  conversationId: string;
  project: { title: string; slug: string } | null;
  proposal: { status: string; proposedPrice: number } | null;
  otherParticipant: {
    name: string;
    username: string;
    profilePhoto?: string | null;
    professionalTitle?: string | null;
  } | null;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  lastMessageAt: string;
  unreadCount: number;
  canSend: boolean;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export function useMessagingApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      openForProposal: (proposalId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ConversationSummary>(
          `/proposals/${proposalId}/conversation`,
          accessToken,
          { method: 'POST' },
        );
      },

      listConversations: (page = 1) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{
          items: ConversationSummary[];
          page: number;
          totalPages: number;
        }>(`/conversations?page=${page}`, accessToken);
      },

      getConversation: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<ConversationSummary>(
          `/conversations/${id}`,
          accessToken,
        );
      },

      listMessages: (id: string, cursor?: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        const qs = cursor ? `?cursor=${cursor}&limit=30` : '?limit=30';
        return authenticatedRequest<{
          items: MessageItem[];
          nextCursor: string | null;
          hasMore: boolean;
        }>(`/conversations/${id}/messages${qs}`, accessToken);
      },

      sendMessage: (id: string, content: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<MessageItem>(
          `/conversations/${id}/messages`,
          accessToken,
          { method: 'POST', body: JSON.stringify({ content }) },
        );
      },

      markRead: (id: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ markedCount: number }>(
          `/conversations/${id}/read`,
          accessToken,
          { method: 'POST' },
        );
      },

      unreadCount: () => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<{ unreadCount: number }>(
          '/messages/unread-count',
          accessToken,
        );
      },
    }),
    [accessToken, locale],
  );
}
