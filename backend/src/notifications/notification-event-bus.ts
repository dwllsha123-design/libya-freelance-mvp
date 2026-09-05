import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { NotificationType } from '@prisma/client';

export type DomainNotificationEvent =
  | { name: 'project.published'; projectId: string }
  | {
      name: 'proposal.created';
      projectId: string;
      proposalId: string;
      clientId: string;
      freelancerName?: string;
      amount?: string;
      projectTitle: string;
    }
  | {
      name: 'proposal.accepted';
      proposalId: string;
      freelancerId: string;
      projectTitle: string;
      projectId: string;
    }
  | {
      name: 'proposal.rejected';
      freelancerId: string;
      projectTitle: string;
    }
  | {
      name: 'payment.final';
      userId: string;
      status: 'SUCCEEDED' | 'FAILED';
      amount: string;
      purpose: string;
    }
  | {
      name: 'points.changed';
      userId: string;
      type: NotificationType;
      points: number;
      reason?: string;
      balanceAfter?: number;
    };

/**
 * Lightweight domain event bus so business services stay decoupled from
 * notification channel logic. Backed by RxJS (already a Nest dependency).
 */
@Injectable()
export class NotificationEventBus {
  private readonly subject = new Subject<DomainNotificationEvent>();

  readonly events$ = this.subject.asObservable();

  emit(event: DomainNotificationEvent) {
    this.subject.next(event);
  }
}
