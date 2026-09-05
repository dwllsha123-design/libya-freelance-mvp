import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationEventBus } from './notification-event-bus.js';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationEventListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly bus: NotificationEventBus,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.bus.events$.subscribe((event) => {
      void this.handle(event).catch((err) => {
        this.logger.warn(
          `Notification event handler failed (${event.name}): ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      });
    });
  }

  private async handle(
    event: Parameters<NotificationEventBus['emit']>[0],
  ) {
    switch (event.name) {
      case 'project.published':
        this.notifications.enqueueProjectMatch(event.projectId);
        break;
      case 'proposal.created': {
        const hasDetail = Boolean(event.freelancerName && event.amount);
        await this.notifications.notify({
          userId: event.clientId,
          type: NotificationType.NEW_PROPOSAL,
          title: hasDetail ? 'وصل عرض جديد على مشروعك' : undefined,
          message: hasDetail
            ? `${event.freelancerName} قدم عرضاً بقيمة ${event.amount} د.ل.`
            : undefined,
          params: {
            projectTitle: event.projectTitle,
            freelancerName: event.freelancerName,
            amount: event.amount,
          },
          targetUrl: `/dashboard/projects/${event.projectId}/proposals`,
          entityType: 'proposal',
          entityId: event.proposalId,
          dedupeKey: `proposal-received:${event.proposalId}`,
          data: {
            projectTitle: event.projectTitle,
            freelancerName: event.freelancerName,
            amount: event.amount,
          },
        });
        break;
      }
      case 'proposal.accepted':
        await this.notifications.notify({
          userId: event.freelancerId,
          type: NotificationType.PROPOSAL_ACCEPTED,
          params: { projectTitle: event.projectTitle },
          targetUrl: `/dashboard/proposals`,
          entityType: 'proposal',
          entityId: event.proposalId,
          dedupeKey: `proposal-accepted:${event.proposalId}`,
        });
        break;
      case 'proposal.rejected':
        await this.notifications.notify({
          userId: event.freelancerId,
          type: NotificationType.PROPOSAL_REJECTED,
          params: { projectTitle: event.projectTitle },
          targetUrl: `/dashboard/proposals`,
        });
        break;
      case 'payment.final':
        await this.notifications.notify({
          userId: event.userId,
          type:
            event.status === 'SUCCEEDED'
              ? NotificationType.PAYMENT_SUCCESS
              : NotificationType.PAYMENT_FAILED,
          params: { amount: event.amount },
          targetUrl: '/dashboard/escrow',
          entityType: 'payment',
          data: { purpose: event.purpose, amount: event.amount },
        });
        break;
      case 'points.changed':
        await this.notifications.notifyPointsEvent({
          userId: event.userId,
          type: event.type as
            | typeof NotificationType.POINTS_EARNED
            | typeof NotificationType.POINTS_SPENT
            | typeof NotificationType.LOW_POINTS
            | typeof NotificationType.INSUFFICIENT_POINTS,
          points: event.points,
          reason: event.reason,
          balanceAfter: event.balanceAfter,
        });
        break;
      default:
        break;
    }
  }
}
