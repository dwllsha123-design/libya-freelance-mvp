import { ForbiddenException } from '@nestjs/common';
import {
  ProjectStatus,
  ProposalStatus,
  Role,
} from '@prisma/client';

export interface ConversationContext {
  proposal: { status: ProposalStatus; freelancerId: string };
  project: { status: ProjectStatus; clientId: string };
  conversationExists: boolean;
}

export function assertCanCreateConversation(
  userId: string,
  role: Role,
  ctx: ConversationContext,
): void {
  if (
    ctx.proposal.status === ProposalStatus.REJECTED ||
    ctx.proposal.status === ProposalStatus.WITHDRAWN
  ) {
    throw new ForbiddenException('لا يمكن بدء محادثة لهذا العرض');
  }

  if (
    ctx.project.status === ProjectStatus.CANCELLED ||
    ctx.project.status === ProjectStatus.CLOSED ||
    ctx.project.status === ProjectStatus.COMPLETED ||
    ctx.project.status === ProjectStatus.DRAFT
  ) {
    throw new ForbiddenException('المشروع لا يقبل محادثات جديدة');
  }

  if (role === Role.CLIENT) {
    if (ctx.project.clientId !== userId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا العرض');
    }

    if (
      ctx.proposal.status !== ProposalStatus.PENDING &&
      ctx.proposal.status !== ProposalStatus.ACCEPTED
    ) {
      throw new ForbiddenException('لا يمكن بدء محادثة لهذا العرض');
    }

    return;
  }

  if (role === Role.FREELANCER) {
    if (ctx.proposal.freelancerId !== userId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا العرض');
    }

    if (ctx.conversationExists) {
      return;
    }

    if (ctx.proposal.status === ProposalStatus.ACCEPTED) {
      return;
    }

    throw new ForbiddenException(
      'يمكنك الرد فقط بعد أن يبدأ العميل المحادثة أو يقبل عرضك',
    );
  }

  throw new ForbiddenException('غير مصرح');
}

export function assertCanAccessConversation(
  userId: string,
  clientId: string,
  freelancerId: string,
): void {
  if (userId !== clientId && userId !== freelancerId) {
    throw new ForbiddenException('ليس لديك صلاحية على هذه المحادثة');
  }
}

export function canSendMessages(ctx: ConversationContext): boolean {
  if (
    ctx.proposal.status === ProposalStatus.REJECTED ||
    ctx.proposal.status === ProposalStatus.WITHDRAWN
  ) {
    return false;
  }

  if (
    ctx.project.status === ProjectStatus.CANCELLED ||
    ctx.project.status === ProjectStatus.CLOSED
  ) {
    return false;
  }

  if (ctx.project.status === ProjectStatus.COMPLETED) {
    return ctx.proposal.status === ProposalStatus.ACCEPTED;
  }

  if (ctx.project.status === ProjectStatus.IN_PROGRESS) {
    return ctx.proposal.status === ProposalStatus.ACCEPTED;
  }

  if (ctx.project.status === ProjectStatus.OPEN) {
    return (
      ctx.proposal.status === ProposalStatus.PENDING ||
      ctx.proposal.status === ProposalStatus.ACCEPTED
    );
  }

  return false;
}

export function assertCanSendMessage(ctx: ConversationContext): void {
  if (!canSendMessages(ctx)) {
    throw new ForbiddenException('لا يمكن إرسال رسائل في هذه المحادثة حالياً');
  }
}

export function canJoinConversationRoom(
  userId: string,
  clientId: string,
  freelancerId: string,
): boolean {
  return userId === clientId || userId === freelancerId;
}
