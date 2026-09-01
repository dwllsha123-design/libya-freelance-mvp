import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ProjectStatus,
  ProposalStatus,
  Role,
} from '@prisma/client';

export interface CompletionProjectContext {
  status: ProjectStatus;
  clientId: string;
  acceptedProposalId: string | null;
  acceptedProposal: {
    id: string;
    status: ProposalStatus;
    freelancerId: string;
  } | null;
}

export function assertFreelancerCanRequestCompletion(
  freelancerId: string,
  ctx: CompletionProjectContext,
): void {
  if (!ctx.acceptedProposalId || !ctx.acceptedProposal) {
    throw new BadRequestException('لا يوجد عرض مقبول لهذا المشروع');
  }

  if (ctx.acceptedProposal.freelancerId !== freelancerId) {
    throw new BadRequestException('ليس لديك صلاحية على هذا المشروع');
  }

  if (ctx.acceptedProposal.status !== ProposalStatus.ACCEPTED) {
    throw new BadRequestException('العرض غير مقبول');
  }

  if (ctx.acceptedProposal.id !== ctx.acceptedProposalId) {
    throw new BadRequestException('بيانات العرض غير متسقة');
  }

  if (
    ctx.status === ProjectStatus.CANCELLED ||
    ctx.status === ProjectStatus.CLOSED ||
    ctx.status === ProjectStatus.COMPLETED
  ) {
    throw new BadRequestException('لا يمكن طلب الإتمام في هذه الحالة');
  }

  if (ctx.status !== ProjectStatus.IN_PROGRESS) {
    throw new BadRequestException('المشروع ليس قيد التنفيذ');
  }
}

export function assertClientCanComplete(
  clientId: string,
  ctx: CompletionProjectContext,
): void {
  if (ctx.clientId !== clientId) {
    throw new BadRequestException('ليس لديك صلاحية على هذا المشروع');
  }

  if (!ctx.acceptedProposalId || !ctx.acceptedProposal) {
    throw new BadRequestException('لا يوجد عرض مقبول لهذا المشروع');
  }

  if (ctx.acceptedProposal.status !== ProposalStatus.ACCEPTED) {
    throw new BadRequestException('العرض غير مقبول');
  }

  if (ctx.status !== ProjectStatus.IN_PROGRESS) {
    throw new BadRequestException('يمكن إتمام المشاريع قيد التنفيذ فقط');
  }
}

export interface ReviewProjectContext {
  status: ProjectStatus;
  clientId: string;
  acceptedProposalId: string | null;
  acceptedProposal: {
    id: string;
    status: ProposalStatus;
    freelancerId: string;
  } | null;
}

export function deriveReviewTarget(
  reviewerId: string,
  reviewerRole: Role,
  ctx: ReviewProjectContext,
): string {
  if (ctx.status !== ProjectStatus.COMPLETED) {
    throw new BadRequestException('يمكن التقييم بعد إتمام المشروع فقط');
  }

  if (!ctx.acceptedProposal) {
    throw new BadRequestException('لا يوجد عرض مقبول');
  }

  if (reviewerRole === Role.CLIENT && reviewerId === ctx.clientId) {
    return ctx.acceptedProposal.freelancerId;
  }

  if (
    reviewerRole === Role.FREELANCER &&
    reviewerId === ctx.acceptedProposal.freelancerId
  ) {
    return ctx.clientId;
  }

  throw new ForbiddenException('غير مصرح بإرسال تقييم لهذا المشروع');
}

export function validateRating(rating: number): number {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BadRequestException('التقييم يجب أن يكون بين 1 و 5');
  }

  return rating;
}

export function validateReviewComment(comment?: string | null): string | null {
  if (comment === undefined || comment === null || comment.trim() === '') {
    return null;
  }

  const trimmed = comment.trim();

  if (trimmed.length < 10 || trimmed.length > 2000) {
    throw new BadRequestException(
      'التعليق يجب أن يكون بين 10 و 2000 حرفاً إن وُجد',
    );
  }

  return trimmed;
}
