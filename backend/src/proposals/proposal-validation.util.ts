import { BadRequestException } from '@nestjs/common';
import { ProposalStatus } from '@prisma/client';
import {
  COVER_LETTER_MAX,
  COVER_LETTER_MIN,
  ESTIMATED_DURATION_MAX_DAYS,
  ESTIMATED_DURATION_MIN_DAYS,
} from './proposals.constants.js';

export interface ProposalInput {
  coverLetter: string;
  proposedPrice: number;
  estimatedDurationDays: number;
}

export function validateProposalInput(data: ProposalInput): void {
  const letter = data.coverLetter?.trim() ?? '';

  if (letter.length < COVER_LETTER_MIN) {
    throw new BadRequestException(
      `رسالة العرض يجب أن تكون ${COVER_LETTER_MIN} حرفاً على الأقل`,
    );
  }

  if (letter.length > COVER_LETTER_MAX) {
    throw new BadRequestException('رسالة العرض طويلة جداً');
  }

  if (data.proposedPrice <= 0) {
    throw new BadRequestException('السعر المقترح يجب أن يكون أكبر من صفر');
  }

  if (
    !Number.isInteger(data.estimatedDurationDays) ||
    data.estimatedDurationDays < ESTIMATED_DURATION_MIN_DAYS ||
    data.estimatedDurationDays > ESTIMATED_DURATION_MAX_DAYS
  ) {
    throw new BadRequestException(
      `مدة التنفيذ يجب أن تكون بين ${ESTIMATED_DURATION_MIN_DAYS} و ${ESTIMATED_DURATION_MAX_DAYS} يوماً`,
    );
  }
}

export class ProposalStateService {
  static assertCanWithdraw(status: ProposalStatus): void {
    if (status !== ProposalStatus.PENDING) {
      throw new BadRequestException('يمكن سحب العروض المعلقة فقط');
    }
  }

  static assertCanReject(status: ProposalStatus): void {
    if (status !== ProposalStatus.PENDING) {
      throw new BadRequestException('يمكن رفض العروض المعلقة فقط');
    }
  }

  static assertCanAccept(status: ProposalStatus): void {
    if (status !== ProposalStatus.PENDING) {
      throw new BadRequestException('يمكن قبول العروض المعلقة فقط');
    }
  }

  static transitionToAccepted(): { status: ProposalStatus } {
    return { status: ProposalStatus.ACCEPTED };
  }

  static transitionToRejected(): { status: ProposalStatus } {
    return { status: ProposalStatus.REJECTED };
  }

  static transitionToWithdrawn(): { status: ProposalStatus } {
    return { status: ProposalStatus.WITHDRAWN };
  }
}
