import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotificationType, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_24H = 'DEADLINE_24H';
const REMINDER_6H = 'DEADLINE_6H';
const REMINDER_OVERDUE = 'DEADLINE_OVERDUE';

@Injectable()
export class NotificationDeadlineScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationDeadlineScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    setTimeout(() => void this.scan(), 15_000);
    this.timer = setInterval(() => void this.scan(), SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async scan() {
    try {
      const now = new Date();
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      const projects = await this.prisma.project.findMany({
        where: {
          status: ProjectStatus.IN_PROGRESS,
          deadline: { not: null, lte: in25h },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          deadline: true,
          clientId: true,
          acceptedProposal: { select: { freelancerId: true } },
        },
        take: 500,
      });

      for (const project of projects) {
        if (!project.deadline) continue;
        const msLeft = project.deadline.getTime() - now.getTime();

        if (msLeft <= 0) {
          await this.sendOnce(project.id, REMINDER_OVERDUE, async () => {
            await this.notifyParties(project, NotificationType.PROJECT_OVERDUE);
          });
        } else if (msLeft <= 6 * 60 * 60 * 1000) {
          await this.sendOnce(project.id, REMINDER_6H, async () => {
            await this.notifyParties(
              project,
              NotificationType.PROJECT_DEADLINE_6H,
            );
          });
        } else if (msLeft <= 24 * 60 * 60 * 1000) {
          await this.sendOnce(project.id, REMINDER_24H, async () => {
            await this.notifyParties(
              project,
              NotificationType.PROJECT_DEADLINE_APPROACHING,
            );
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `Deadline scan failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  private async sendOnce(
    projectId: string,
    reminderType: string,
    send: () => Promise<void>,
  ) {
    try {
      await this.prisma.notificationReminder.create({
        data: { id: randomUUID(), projectId, reminderType },
      });
    } catch {
      return;
    }
    await send();
  }

  private async notifyParties(
    project: {
      id: string;
      title: string;
      slug: string;
      clientId: string;
      acceptedProposal: { freelancerId: string } | null;
    },
    type: NotificationType,
  ) {
    const params = { projectTitle: project.title };

    await this.notifications.notify({
      userId: project.clientId,
      type,
      params,
      targetUrl: `/dashboard/projects/${project.id}/edit`,
      entityType: 'project',
      entityId: project.id,
      dedupeKey: `deadline:${type}:${project.id}:client`,
    });

    if (project.acceptedProposal?.freelancerId) {
      await this.notifications.notify({
        userId: project.acceptedProposal.freelancerId,
        type,
        params,
        targetUrl: `/dashboard/proposals`,
        entityType: 'project',
        entityId: project.id,
        dedupeKey: `deadline:${type}:${project.id}:freelancer`,
      });
    }
  }
}
