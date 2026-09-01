import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ProjectStatus, ProposalStatus, Role } from '@prisma/client';
import {
  assertCanCreateConversation,
  canJoinConversationRoom,
  canSendMessages,
} from '../src/messaging/conversation-eligibility.util.js';
import { validateMessageContent } from '../src/messaging/message-validation.util.js';

describe('message validation', () => {
  it('rejects empty content', () => {
    expect(() => validateMessageContent('   ')).toThrow();
  });

  it('trims valid content', () => {
    expect(validateMessageContent('  hello  ')).toBe('hello');
  });
});

describe('conversation eligibility', () => {
  const baseCtx = {
    proposal: {
      status: ProposalStatus.PENDING,
      freelancerId: 'freelancer-1',
    },
    project: {
      status: ProjectStatus.OPEN,
      clientId: 'client-1',
    },
    conversationExists: false,
  };

  it('allows client to create for pending proposal', () => {
    expect(() =>
      assertCanCreateConversation('client-1', Role.CLIENT, baseCtx),
    ).not.toThrow();
  });

  it('blocks freelancer from initiating pending chat', () => {
    expect(() =>
      assertCanCreateConversation('freelancer-1', Role.FREELANCER, baseCtx),
    ).toThrow(ForbiddenException);
  });

  it('allows freelancer when conversation exists', () => {
    expect(() =>
      assertCanCreateConversation('freelancer-1', Role.FREELANCER, {
        ...baseCtx,
        conversationExists: true,
      }),
    ).not.toThrow();
  });

  it('blocks send when proposal rejected', () => {
    expect(
      canSendMessages({
        ...baseCtx,
        proposal: {
          status: ProposalStatus.REJECTED,
          freelancerId: 'freelancer-1',
        },
      }),
    ).toBe(false);
  });

  it('allows send for in-progress accepted', () => {
    expect(
      canSendMessages({
        proposal: {
          status: ProposalStatus.ACCEPTED,
          freelancerId: 'freelancer-1',
        },
        project: {
          status: ProjectStatus.IN_PROGRESS,
          clientId: 'client-1',
        },
        conversationExists: true,
      }),
    ).toBe(true);
  });
});

describe('read status logic', () => {
  it('read-only when proposal rejected even if conversation exists', () => {
    expect(
      canSendMessages({
        proposal: {
          status: ProposalStatus.REJECTED,
          freelancerId: 'freelancer-1',
        },
        project: {
          status: ProjectStatus.OPEN,
          clientId: 'client-1',
        },
        conversationExists: true,
      }),
    ).toBe(false);
  });
});

describe('socket room authorization', () => {
  it('allows only client and freelancer', () => {
    expect(canJoinConversationRoom('client-1', 'client-1', 'freelancer-1')).toBe(
      true,
    );
    expect(canJoinConversationRoom('other', 'client-1', 'freelancer-1')).toBe(
      false,
    );
  });
});

describe('typing rate limit', () => {
  it('throttles excessive typing events', () => {
    const service = new (class {
      private readonly typingRate = new Map<
        string,
        { count: number; resetAt: number }
      >();

      assertTypingRateLimit(userId: string): boolean {
        const now = Date.now();
        const entry = this.typingRate.get(userId);
        const limit = 8;
        const windowMs = 1000;

        if (!entry || now > entry.resetAt) {
          this.typingRate.set(userId, { count: 1, resetAt: now + windowMs });
          return true;
        }

        if (entry.count >= limit) return false;
        entry.count += 1;
        return true;
      }
    })();

    for (let i = 0; i < 8; i++) {
      expect(service.assertTypingRateLimit('user-1')).toBe(true);
    }
    expect(service.assertTypingRateLimit('user-1')).toBe(false);
  });
});
