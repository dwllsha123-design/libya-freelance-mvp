import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { assertUserCanAuthenticate } from '../common/utils/account-status.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser, JwtPayload } from '../auth/types/auth-user.type.js';
import {
  assertCanAccessConversation,
  assertCanCreateConversation,
  assertCanSendMessage,
  canJoinConversationRoom,
  canSendMessages,
  type ConversationContext,
} from './conversation-eligibility.util.js';
import { validateMessageContent } from './message-validation.util.js';
import {
  MESSAGE_RATE_LIMIT,
  MESSAGE_RATE_WINDOW_MS,
  TYPING_RATE_LIMIT,
  TYPING_RATE_WINDOW_MS,
} from './messaging.constants.js';
import type { ConversationsQueryDto, MessagesQueryDto } from './dto/messaging.dto.js';

const participantInclude = {
  profile: {
    select: {
      firstName: true,
      lastName: true,
      username: true,
      profilePhoto: true,
      freelancerProfile: {
        select: { professionalTitle: true },
      },
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class MessagingService {
  private readonly messageRate = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly typingRate = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async verifySocketToken(token: string): Promise<AuthUser> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      });
    } catch {
      throw new ForbiddenException('رمز غير صالح');
    }

    if (payload.type !== 'access') {
      throw new ForbiddenException('رمز غير صالح');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('المستخدم غير موجود');
    }

    assertUserCanAuthenticate(user.status);

    return user;
  }

  async assertActiveUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('المستخدم غير موجود');
    }

    assertUserCanAuthenticate(user.status);

    return user;
  }

  assertRateLimit(userId: string): void {
    const now = Date.now();
    const entry = this.messageRate.get(userId);

    if (!entry || now > entry.resetAt) {
      this.messageRate.set(userId, {
        count: 1,
        resetAt: now + MESSAGE_RATE_WINDOW_MS,
      });
      return;
    }

    if (entry.count >= MESSAGE_RATE_LIMIT) {
      throw new HttpException(
        'عدد الرسائل كبير جداً، حاول لاحقاً',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
  }

  assertTypingRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = this.typingRate.get(userId);

    if (!entry || now > entry.resetAt) {
      this.typingRate.set(userId, {
        count: 1,
        resetAt: now + TYPING_RATE_WINDOW_MS,
      });
      return true;
    }

    if (entry.count >= TYPING_RATE_LIMIT) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  async openConversationForProposal(userId: string, role: Role, proposalId: string) {
    const proposal = await this.getProposalContext(proposalId);
    const existing = await this.prisma.conversation.findUnique({
      where: { proposalId },
      include: this.conversationInclude(),
    });

    if (existing) {
      assertCanAccessConversation(
        userId,
        proposal.project.clientId,
        proposal.freelancerId,
      );
      return this.formatConversationSummary(existing, userId);
    }

    const ctx: ConversationContext = {
      proposal: {
        status: proposal.status,
        freelancerId: proposal.freelancerId,
      },
      project: {
        status: proposal.project.status,
        clientId: proposal.project.clientId,
      },
      conversationExists: false,
    };

    assertCanCreateConversation(userId, role, ctx);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.create({
          data: {
            projectId: proposal.projectId,
            proposalId: proposal.id,
            members: {
              create: [
                { userId: proposal.project.clientId },
                { userId: proposal.freelancerId },
              ],
            },
          },
          include: this.conversationInclude(),
        });

        return conversation;
      });

      return this.formatConversationSummary(created, userId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.conversation.findUnique({
          where: { proposalId },
          include: this.conversationInclude(),
        });

        if (!raced) throw error;

        assertCanAccessConversation(
          userId,
          proposal.project.clientId,
          proposal.freelancerId,
        );

        return this.formatConversationSummary(raced, userId);
      }

      throw error;
    }
  }

  async listConversations(userId: string, query: ConversationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {
      members: { some: { userId } },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: this.conversationInclude(),
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const items = await Promise.all(
      conversations.map((c) => this.formatConversationSummary(c, userId)),
    );

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.findMemberConversation(userId, conversationId);
    const summary = await this.formatConversationSummary(conversation, userId);

    return {
      ...summary,
      project: conversation.project,
      proposal: conversation.proposal
        ? {
            ...conversation.proposal,
            proposedPrice: Number(conversation.proposal.proposedPrice),
          }
        : null,
    };
  }

  async listMessages(
    userId: string,
    conversationId: string,
    query: MessagesQueryDto,
  ) {
    await this.findMemberConversation(userId, conversationId);

    const limit = query.limit ?? 30;

    const cursorMessage = query.cursor
      ? await this.prisma.message.findUnique({
          where: { id: query.cursor },
        })
      : null;

    if (query.cursor && (!cursorMessage || cursorMessage.conversationId !== conversationId)) {
      throw new NotFoundException('رسالة غير موجودة');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursorMessage
        ? { cursor: { id: cursorMessage.id }, skip: 1 }
        : {}),
    });

    const hasMore = messages.length > limit;
    const pageItems = hasMore ? messages.slice(0, limit) : messages;

    return {
      items: pageItems.reverse().map((m) => this.formatMessage(m)),
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    this.assertRateLimit(userId);

    const conversation = await this.findMemberConversation(userId, conversationId);
    const proposal = conversation.proposal!;
    const project = conversation.project!;

    const ctx: ConversationContext = {
      proposal: {
        status: proposal.status,
        freelancerId: proposal.freelancerId,
      },
      project: {
        status: project.status,
        clientId: project.clientId,
      },
      conversationExists: true,
    };

    assertCanSendMessage(ctx);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('الحساب غير نشط');
    }

    const trimmed = validateMessageContent(content);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: trimmed,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });

      return created;
    });

    const recipientId =
      userId === project.clientId ? proposal.freelancerId : project.clientId;

    const senderProfile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { firstName: true, lastName: true },
    });
    const senderName = senderProfile
      ? `${senderProfile.firstName} ${senderProfile.lastName}`
      : 'مستخدم';

    await this.notifications.createOrAggregateMessageNotification(
      recipientId,
      conversationId,
      senderName,
      trimmed.slice(0, 120),
    );

    return this.formatMessage(message);
  }

  async markRead(userId: string, conversationId: string) {
    await this.findMemberConversation(userId, conversationId);

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    await this.notifications.markReadByTargetUrl(
      userId,
      `/messages/${conversationId}`,
    );

    return {
      conversationId,
      markedCount: result.count,
      readAt: new Date(),
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: {
          members: { some: { userId } },
        },
      },
    });

    return { unreadCount: count };
  }

  async authorizeRoomJoin(userId: string, conversationId: string): Promise<boolean> {
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!membership) {
      return false;
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        proposal: true,
        project: true,
      },
    });

    if (!conversation?.proposal || !conversation.project) {
      return false;
    }

    return canJoinConversationRoom(
      userId,
      conversation.project.clientId,
      conversation.proposal.freelancerId,
    );
  }

  private async getProposalContext(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { project: true },
    });

    if (!proposal) {
      throw new NotFoundException('العرض غير موجود');
    }

    return proposal;
  }

  private async findMemberConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationInclude(),
    });

    if (!conversation?.proposal || !conversation.project) {
      throw new NotFoundException('المحادثة غير موجودة');
    }

    const isMember = conversation.members.some((m) => m.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('ليس لديك صلاحية على هذه المحادثة');
    }

    return conversation;
  }

  private conversationInclude() {
    return {
      project: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          clientId: true,
        },
      },
      proposal: {
        select: {
          id: true,
          status: true,
          proposedPrice: true,
          freelancerId: true,
          projectId: true,
        },
      },
      members: {
        include: {
          user: { include: participantInclude },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    } satisfies Prisma.ConversationInclude;
  }

  private async formatConversationSummary(
    conversation: Prisma.ConversationGetPayload<{
      include: ReturnType<MessagingService['conversationInclude']>;
    }>,
    viewerId: string,
  ) {
    const otherMember = conversation.members.find((m) => m.userId !== viewerId);
    const otherUser = otherMember?.user;
    const lastMessage = conversation.messages[0];

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: viewerId },
        readAt: null,
      },
    });

    return {
      conversationId: conversation.id,
      project: conversation.project
        ? {
            title: conversation.project.title,
            slug: conversation.project.slug,
          }
        : null,
      proposal: conversation.proposal
        ? {
            status: conversation.proposal.status,
            proposedPrice: Number(conversation.proposal.proposedPrice),
          }
        : null,
      otherParticipant: otherUser
        ? this.formatParticipant(otherUser)
        : null,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content.slice(0, 120),
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
          }
        : null,
      lastMessageAt: conversation.lastMessageAt ?? conversation.createdAt,
      unreadCount,
      canSend: canSendMessages({
        proposal: {
          status: conversation.proposal!.status,
          freelancerId: conversation.proposal!.freelancerId,
        },
        project: {
          status: conversation.project!.status,
          clientId: conversation.project!.clientId,
        },
        conversationExists: true,
      }),
    };
  }

  private formatParticipant(
    user: Prisma.UserGetPayload<{ include: typeof participantInclude }>,
  ) {
    const profile = user.profile;

    return {
      name: profile
        ? `${profile.firstName} ${profile.lastName}`
        : 'مستخدم',
      username: profile?.username ?? '',
      profilePhoto: profile?.profilePhoto ?? null,
      professionalTitle: profile?.freelancerProfile?.professionalTitle ?? null,
    };
  }

  formatMessage(message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
